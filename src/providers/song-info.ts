import { BrowserWindow, ipcMain, nativeImage, net, powerSaveBlocker } from 'electron';

import { Mutex } from 'async-mutex';

import config from '@/config';

import type { GetPlayerResponse } from '@/types/get-player-response';

let powerSaveBlockerId: number | null = null;
const updatePowerSaveState = (isPaused?: boolean) => {
  try {
    if (isPaused === false) {
      if (powerSaveBlockerId === null || !powerSaveBlocker.isStarted(powerSaveBlockerId)) {
        powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
      }
    } else if (isPaused === true && powerSaveBlockerId !== null) {
      if (powerSaveBlocker.isStarted(powerSaveBlockerId)) {
        powerSaveBlocker.stop(powerSaveBlockerId);
      }
      powerSaveBlockerId = null;
    }
  } catch (e) {
    console.error('[AuraMusic SongInfo] powerSaveBlocker error:', e);
  }
};

const imageCache = new Map<string, Electron.NativeImage>();
const MAX_IMAGE_CACHE_SIZE = 50;

export enum MediaType {
  /**
   * Audio uploaded by the original artist
   */
  Audio = 'AUDIO',
  /**
   * Official music video uploaded by the original artist
   */
  OriginalMusicVideo = 'ORIGINAL_MUSIC_VIDEO',
  /**
   * Normal YouTube video uploaded by a user
   */
  UserGeneratedContent = 'USER_GENERATED_CONTENT',
  /**
   * Podcast episode
   */
  PodcastEpisode = 'PODCAST_EPISODE',
  OtherVideo = 'OTHER_VIDEO',
}

export interface SongInfo {
  title: string;
  alternativeTitle?: string;
  artist: string;
  views: number;
  uploadDate?: string;
  imageSrc?: string | null;
  image?: Electron.NativeImage | null;
  isPaused?: boolean;
  songDuration: number;
  elapsedSeconds?: number;
  url?: string;
  album?: string | null;
  videoId: string;
  playlistId?: string;
  mediaType: MediaType;
  tags?: string[];
}

// Grab the native image using the src with LRU in-memory caching
export const getImage = async (src: string): Promise<Electron.NativeImage> => {
  if (imageCache.has(src)) {
    const cached = imageCache.get(src)!;
    // Refresh LRU order
    imageCache.delete(src);
    imageCache.set(src, cached);
    return cached;
  }

  try {
    const result = await net.fetch(src, { signal: AbortSignal.timeout(5000) });
    let output = nativeImage.createFromBuffer(
      Buffer.from(await result.arrayBuffer()),
    );
    if (output.isEmpty() && !src.endsWith('.jpg') && src.includes('.jpg')) {
      // Fix hidden webp files (https://github.com/th-ch/youtube-music/issues/315)
      output = await getImage(src.slice(0, src.lastIndexOf('.jpg') + 4));
    }

    if (!output.isEmpty()) {
      if (imageCache.size >= MAX_IMAGE_CACHE_SIZE) {
        const oldestKey = imageCache.keys().next().value;
        if (oldestKey) imageCache.delete(oldestKey);
      }
      imageCache.set(src, output);
    }

    return output;
  } catch {
    return nativeImage.createEmpty();
  }
};

const handleData = async (
  data: GetPlayerResponse,
  win: Electron.BrowserWindow,
): Promise<SongInfo | null> => {
  if (!data) {
    return null;
  }

  // Fill songInfo with empty values
  const songInfo: SongInfo = {
    title: '',
    alternativeTitle: '',
    artist: '',
    views: 0,
    uploadDate: '',
    imageSrc: '',
    image: null,
    isPaused: undefined,
    songDuration: 0,
    elapsedSeconds: 0,
    url: '',
    album: undefined,
    videoId: '',
    playlistId: '',
    mediaType: MediaType.Audio,
    tags: [],
  } satisfies SongInfo;

  const microformat = data.microformat?.microformatDataRenderer;
  if (microformat) {
    songInfo.uploadDate = microformat.uploadDate;
    songInfo.url = microformat.urlCanonical?.split('&')[0];
    songInfo.playlistId =
      new URL(microformat.urlCanonical).searchParams.get('list') ?? '';
    // Used for options.resumeOnStart
    config.set('url', microformat.urlCanonical);
    songInfo.alternativeTitle = microformat.linkAlternates.find(
      (link) => link.title,
    )?.title;
    songInfo.tags = Array.isArray(microformat.tags) ? microformat.tags : [];
  }

  const { videoDetails } = data;
  if (videoDetails) {
    songInfo.title = cleanupName(videoDetails.title);
    songInfo.artist = cleanupName(videoDetails.author);
    songInfo.views = Number(videoDetails.viewCount);
    songInfo.songDuration = Number(videoDetails.lengthSeconds);
    songInfo.elapsedSeconds = videoDetails.elapsedSeconds;
    songInfo.isPaused = videoDetails.isPaused;
    songInfo.videoId = videoDetails.videoId;
    songInfo.album = data?.videoDetails?.album; // Will be undefined if video exist

    switch (videoDetails?.musicVideoType) {
      case 'MUSIC_VIDEO_TYPE_ATV':
        songInfo.mediaType = MediaType.Audio;
        break;
      case 'MUSIC_VIDEO_TYPE_OMV':
        songInfo.mediaType = MediaType.OriginalMusicVideo;
        break;
      case 'MUSIC_VIDEO_TYPE_UGC':
        songInfo.mediaType = MediaType.UserGeneratedContent;
        break;
      case 'MUSIC_VIDEO_TYPE_PODCAST_EPISODE':
        songInfo.mediaType = MediaType.PodcastEpisode;
        // HACK: Podcast's participant is not the artist
        if (!config.get('options.usePodcastParticipantAsArtist')) {
          songInfo.artist = cleanupName(
            data.microformat.microformatDataRenderer.pageOwnerDetails.name,
          );
        }
        break;
      default:
        songInfo.mediaType = MediaType.OtherVideo;
        // HACK: This is a workaround for "podcast" types where "musicVideoType" doesn't exist. Google :facepalm:
        if (
          !config.get('options.usePodcastParticipantAsArtist') &&
          (data.responseContext.serviceTrackingParams
            ?.at(0)
            ?.params?.find((it) => it.key === 'ipcc')?.value ?? '1') != '0'
        ) {
          songInfo.artist = cleanupName(
            data.microformat.microformatDataRenderer.pageOwnerDetails.name,
          );
        }
        break;
    }

    const thumbnails = videoDetails.thumbnail?.thumbnails;
    songInfo.imageSrc = thumbnails?.at(-1)?.url?.split('?')?.at(0);

    if (songInfo.imageSrc) {
      try {
        const headRes = await net.fetch(songInfo.imageSrc, {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000),
        });
        if (!headRes.ok) {
          songInfo.imageSrc = thumbnails?.at(-1)?.url;
        }
      } catch {
        // Keep current imageSrc if HEAD request times out
      }
    }

    if (songInfo.imageSrc) songInfo.image = await getImage(songInfo.imageSrc);

    win.webContents.send('ytmd:update-song-info', songInfo);
  }

  return songInfo;
};

export enum SongInfoEvent {
  VideoSrcChanged = 'ytmd:video-src-changed',
  PlayOrPaused = 'ytmd:play-or-paused',
  TimeChanged = 'ytmd:time-changed',
}

// This variable will be filled with the callbacks once they register
export type SongInfoCallback = (
  songInfo: SongInfo,
  event: SongInfoEvent,
) => void;
const callbacks: Set<SongInfoCallback> = new Set();

// This function will allow plugins to register callback that will be triggered when data changes
const registerCallback = (callback: SongInfoCallback) => {
  callbacks.add(callback);
};

const registerProvider = (win: BrowserWindow) => {
  const dataMutex = new Mutex();
  let songInfo: SongInfo | null = null;

  // This will be called when the song-info-front finds a new request with song data
  ipcMain.on('ytmd:video-src-changed', async (_, data: GetPlayerResponse) => {
    const tempSongInfo = await dataMutex.runExclusive<SongInfo | null>(
      async () => {
        songInfo = await handleData(data, win);
        return songInfo;
      },
    );

    if (tempSongInfo) {
      updatePowerSaveState(tempSongInfo.isPaused);
      for (const c of callbacks) {
        try {
          c(tempSongInfo, SongInfoEvent.VideoSrcChanged);
        } catch (e) {
          console.error('[AuraMusic SongInfo] Callback failed for VideoSrcChanged:', e);
        }
      }
    }
  });
  ipcMain.on(
    'ytmd:play-or-paused',
    async (
      _,
      {
        isPaused,
        elapsedSeconds,
      }: { isPaused: boolean; elapsedSeconds: number },
    ) => {
      const tempSongInfo = await dataMutex.runExclusive<SongInfo | null>(() => {
        if (!songInfo) {
          return null;
        }

        songInfo.isPaused = isPaused;
        songInfo.elapsedSeconds = elapsedSeconds;

        return songInfo;
      });

      if (tempSongInfo) {
        updatePowerSaveState(tempSongInfo.isPaused);
        for (const c of callbacks) {
          try {
            c(tempSongInfo, SongInfoEvent.PlayOrPaused);
          } catch (e) {
            console.error('[AuraMusic SongInfo] Callback failed for PlayOrPaused:', e);
          }
        }
      }
    },
  );

  ipcMain.on('ytmd:time-changed', async (_, seconds: number) => {
    const tempSongInfo = await dataMutex.runExclusive<SongInfo | null>(() => {
      if (!songInfo) {
        return null;
      }

      songInfo.elapsedSeconds = seconds;

      return songInfo;
    });

    if (tempSongInfo) {
      for (const c of callbacks) {
        try {
          c(tempSongInfo, SongInfoEvent.TimeChanged);
        } catch (e) {
          console.error('[AuraMusic SongInfo] Callback failed for TimeChanged:', e);
        }
      }
    }
  });
};

const suffixesToRemove = [
  // Artist names
  /\s*(- topic)$/i,
  /\s*vevo$/i,

  // Video titles
  /\s*[(|[]official(.*?)[)|\]]/i, // (Official Music Video), [Official Visualizer], etc...
  /\s*[(|[]((lyrics?|visualizer|audio)\s*(video)?)[)|\]]/i,
  /\s*[(|[](performance video)[)|\]]/i,
  /\s*[(|[](clip official)[)|\]]/i,
  /\s*[(|[](video version)[)|\]]/i,
  /\s*[(|[](HD|HQ)\s*?(?:audio)?[)|\]]$/i,
  /\s*[(|[](live)[)|\]]$/i,
  /\s*[(|[]4K\s*?(?:upgrade)?[)|\]]$/i,
];

export function cleanupName(name: string): string {
  if (!name) {
    return name;
  }

  for (const suffix of suffixesToRemove) {
    name = name.replace(suffix, '');
  }

  return name;
}

export default registerCallback;
export const setupSongInfo = registerProvider;
