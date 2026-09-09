import { createPlugin } from '@/utils';
import style from './style.css?inline';

export type VocalMode = 'off' | 'karaoke' | 'acapella';

export interface VocalIsolatorConfig {
  enabled: boolean;
  mode: VocalMode;
}

let destinationNode: AudioDestinationNode | null = null;

// DSP Nodes
let splitter: ChannelSplitterNode | null = null;
let merger: ChannelMergerNode | null = null;
let centerSum: GainNode | null = null;
let bandpassFilter: BiquadFilterNode | null = null;
let karaokeInverter: GainNode | null = null;
let bypassGain: GainNode | null = null;
let processedGain: GainNode | null = null;

let currentMode: VocalMode = 'off';
let buttonEl: HTMLButtonElement | null = null;

function applyMode(mode: VocalMode) {
  currentMode = mode;
  if (!bypassGain || !processedGain || !centerSum || !karaokeInverter) return;

  if (mode === 'off') {
    bypassGain.gain.value = 1.0;
    processedGain.gain.value = 0.0;
  } else if (mode === 'karaoke') {
    // Vocal cut: bypass is off, inverted center vocal mixed with original stereo channels
    bypassGain.gain.value = 0.0;
    processedGain.gain.value = 1.0;
    karaokeInverter.gain.value = -1.0;
    centerSum.gain.value = 0.5;
  } else if (mode === 'acapella') {
    // Vocal solo: isolate centered vocal formant band
    bypassGain.gain.value = 0.0;
    processedGain.gain.value = 1.0;
    karaokeInverter.gain.value = 1.0;
    centerSum.gain.value = 1.0;
  }

  updateButtonUI();
}

function updateButtonUI() {
  if (!buttonEl) return;
  buttonEl.className = `aura-vocal-btn ${currentMode}`;

  let badgeText = '';
  let tooltip = 'Vocal Mode: Standard';

  if (currentMode === 'karaoke') {
    badgeText = 'K';
    tooltip = 'Vocal Mode: Karaoke (Lead Vocals Muted)';
  } else if (currentMode === 'acapella') {
    badgeText = 'A';
    tooltip = 'Vocal Mode: Acapella (Lead Vocals Isolated)';
  }

  buttonEl.setAttribute('title', tooltip);
  buttonEl.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
    ${badgeText ? `<span class="aura-vocal-badge">${badgeText}</span>` : ''}
  `;
}

function setupAudioDSP(audioSource: AudioNode, audioContext: AudioContext) {
  destinationNode = audioContext.destination;

  // 1. Bypass path
  bypassGain = audioContext.createGain();
  bypassGain.gain.value = currentMode === 'off' ? 1.0 : 0.0;
  audioSource.connect(bypassGain);
  bypassGain.connect(destinationNode);

  // 2. Processed Vocal Filter path
  processedGain = audioContext.createGain();
  processedGain.gain.value = currentMode === 'off' ? 0.0 : 1.0;

  splitter = audioContext.createChannelSplitter(2);
  merger = audioContext.createChannelMerger(2);

  // Calculate center channel (L + R) * 0.5
  centerSum = audioContext.createGain();
  centerSum.gain.value = 0.5;

  // Vocal formant bandpass: human vocal core range ~300Hz - 3400Hz
  bandpassFilter = audioContext.createBiquadFilter();
  bandpassFilter.type = 'bandpass';
  bandpassFilter.frequency.value = 1200;
  bandpassFilter.Q.value = 0.8;

  karaokeInverter = audioContext.createGain();
  karaokeInverter.gain.value = -1.0;

  audioSource.connect(splitter);

  // Splitter L and R into centerSum
  splitter.connect(centerSum, 0);
  splitter.connect(centerSum, 1);

  // Filter vocal band
  centerSum.connect(bandpassFilter);
  bandpassFilter.connect(karaokeInverter);

  // Invert into L and R channels
  karaokeInverter.connect(merger, 0, 0);
  karaokeInverter.connect(merger, 0, 1);

  // Also feed original L and R into merger
  splitter.connect(merger, 0, 0);
  splitter.connect(merger, 1, 1);

  merger.connect(processedGain);
  processedGain.connect(destinationNode);

  applyMode(currentMode);
}

function injectButton() {
  if (document.querySelector('.aura-vocal-btn')) return;

  const controls = document.querySelector('.right-controls-buttons');
  if (!controls) return;

  buttonEl = document.createElement('button');
  buttonEl.setAttribute('type', 'button');
  updateButtonUI();

  buttonEl.addEventListener('click', () => {
    if (currentMode === 'off') {
      applyMode('karaoke');
    } else if (currentMode === 'karaoke') {
      applyMode('acapella');
    } else {
      applyMode('off');
    }
  });

  controls.prepend(buttonEl);
}

export default createPlugin<
  unknown,
  unknown,
  { start: () => void; stop: () => void },
  VocalIsolatorConfig
>({
  name: () => 'Vocal Isolator & Karaoke',
  description: () => 'Real-time zero-latency lead vocal remover (Karaoke mode) and vocal isolator (Acapella mode).',
  restartNeeded: false,
  config: {
    enabled: true,
    mode: 'off',
  },
  stylesheets: [style],
  renderer: {
    start() {
      document.addEventListener(
        'ytmd:audio-can-play',
        ({ detail: { audioSource, audioContext } }) => {
          setupAudioDSP(audioSource, audioContext);
        },
        { once: true, passive: true },
      );

      // Attempt immediate button injection or retry
      const tryInject = () => {
        injectButton();
        if (!document.querySelector('.aura-vocal-btn')) {
          setTimeout(tryInject, 500);
        }
      };
      tryInject();
    },
    stop() {
      if (buttonEl) {
        buttonEl.remove();
        buttonEl = null;
      }
      applyMode('off');
    },
  },
});
