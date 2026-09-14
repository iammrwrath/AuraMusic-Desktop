import type { RendererContext } from '@/types/contexts';
import type { SkipSilencesPluginConfig } from './index';

let config: SkipSilencesPluginConfig;

let isSilent = false;
let hasAudioStarted = false;

const smoothing = 0.1;
const threshold = -100; // DB (-100 = absolute silence, 0 = loudest)
const interval = 25; // Ms (40Hz - optimal audio responsiveness with zero CPU lag)
const history = 10;
const speakingHistory = Array.from({ length: history }).fill(0) as number[];

let playOrSeekHandler: (() => void) | undefined;
let pauseHandler: (() => void) | undefined;
let timerId: NodeJS.Timeout | null = null;
let isUnloaded = false;

const getMaxVolume = (analyser: AnalyserNode, fftBins: Float32Array) => {
  let maxVolume = Number.NEGATIVE_INFINITY;
  analyser.getFloatFrequencyData(fftBins);

  for (let i = 4, ii = fftBins.length; i < ii; i++) {
    if (fftBins[i] > maxVolume && fftBins[i] < 0) {
      maxVolume = fftBins[i];
    }
  }

  return maxVolume;
};

const audioCanPlayListener = (e: CustomEvent<Compressor>) => {
  const video = document.querySelector('video');
  const { audioContext } = e.detail;
  const sourceNode = e.detail.audioSource;

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = smoothing;
  const fftBins = new Float32Array(analyser.frequencyBinCount);

  sourceNode.connect(analyser);

  const looper = () => {
    if (isUnloaded) return;
    if (timerId) clearTimeout(timerId);

    timerId = setTimeout(() => {
      if (isUnloaded) return;

      if (!video || video.paused || video.seeking || video.ended) {
        return;
      }

      const currentVolume = getMaxVolume(analyser, fftBins);

      let histSum = 0;
      if (currentVolume > threshold && isSilent) {
        for (
          let i = speakingHistory.length - 3;
          i < speakingHistory.length;
          i++
        ) {
          histSum += speakingHistory[i];
        }

        if (histSum >= 2) {
          isSilent = false;
          hasAudioStarted = true;
        }
      } else if (currentVolume < threshold && !isSilent) {
        for (const element of speakingHistory) {
          histSum += element;
        }

        if (
          histSum === 0 &&
          !(video.muted || video.volume === 0)
        ) {
          isSilent = true;
          skipSilence();
        }
      }

      speakingHistory.shift();
      speakingHistory.push(Number(currentVolume > threshold));

      looper();
    }, interval);
  };

  const skipSilence = () => {
    if (config?.onlySkipBeginning && hasAudioStarted) {
      return;
    }

    if (isSilent && video && !video.paused) {
      video.currentTime += 0.2; // In s
    }
  };

  playOrSeekHandler = () => {
    hasAudioStarted = false;
    skipSilence();
    looper();
  };

  pauseHandler = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  video?.addEventListener('play', playOrSeekHandler);
  video?.addEventListener('seeked', playOrSeekHandler);
  video?.addEventListener('pause', pauseHandler);

  if (video && !video.paused) {
    looper();
  }
};

export const onRendererLoad = async ({
  getConfig,
}: RendererContext<SkipSilencesPluginConfig>) => {
  isUnloaded = false;
  config = await getConfig();

  document.addEventListener('ytmd:audio-can-play', audioCanPlayListener, {
    once: true,
    passive: true,
  });
};

export const onRendererUnload = () => {
  isUnloaded = true;
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  document.removeEventListener('ytmd:audio-can-play', audioCanPlayListener);

  const video = document.querySelector('video');
  if (playOrSeekHandler && video) {
    video.removeEventListener('play', playOrSeekHandler);
    video.removeEventListener('seeked', playOrSeekHandler);
  }
  if (pauseHandler && video) {
    video.removeEventListener('pause', pauseHandler);
  }
};
