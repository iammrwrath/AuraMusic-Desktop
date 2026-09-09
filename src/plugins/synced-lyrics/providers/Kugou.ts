import { LRC } from '../parsers/lrc';
import type { LyricProvider, LyricResult, SearchSongInfo } from '../types';

interface KugouCandidate {
  id: string;
  accesskey: string;
  song: string;
  singer: string;
  duration: number;
}

interface KugouSearchResponse {
  status: number;
  errcode: number;
  candidates: KugouCandidate[];
}

interface KugouDownloadResponse {
  status: number;
  errcode: number;
  content: string; // Base64 encoded LRC
  fmt: string;
}

export class Kugou implements LyricProvider {
  name = 'Kugou';
  baseUrl = 'https://lyrics.kugou.com';

  private cleanTitle(title: string): string {
    return title
      .replace(/\s*\(.*?\)/g, '')
      .replace(/\s*\[.*?\]/g, '')
      .replace(/\s*\{.*?\}/g, '')
      .replace(/ft\..*$/i, '')
      .replace(/feat\..*$/i, '')
      .trim();
  }

  async search(songInfo: SearchSongInfo): Promise<LyricResult | null> {
    const title = this.cleanTitle(songInfo.title);
    const artist = songInfo.artist || '';
    const keyword = encodeURIComponent(`${title} - ${artist}`.trim());
    const durationMs = (songInfo.songDuration || 0) * 1000;

    try {
      const searchUrl = `${this.baseUrl}/search?ver=1&man=yes&client=pc&keyword=${keyword}${
        durationMs > 0 ? `&duration=${durationMs}` : ''
      }`;

      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!res.ok) return null;

      const data = (await res.json()) as KugouSearchResponse;
      if (!data.candidates || data.candidates.length === 0) {
        return null;
      }

      // Pick top candidate
      const candidate = data.candidates[0];
      const downloadUrl = `${this.baseUrl}/download?ver=1&client=pc&fmt=lrc&charset=utf8&id=${candidate.id}&accesskey=${candidate.accesskey}`;

      const dlRes = await fetch(downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!dlRes.ok) return null;

      const dlData = (await dlRes.json()) as KugouDownloadResponse;
      if (!dlData.content) return null;

      // Decode base64 to string
      const decodedLrc = atob(dlData.content);
      const parsed = LRC.parse(decodedLrc);

      return {
        title: candidate.song || songInfo.title,
        artists: [candidate.singer || songInfo.artist],
        lyrics: decodedLrc,
        lines: parsed.lines.map((l) => ({
          time: l.time,
          timeInMs: l.timeInMs,
          duration: l.duration,
          text: l.text,
          status: 'upcoming',
        })),
      };
    } catch (e) {
      console.warn('[AuraMusic Kugou Lyrics] Fetch error:', e);
      return null;
    }
  }
}
