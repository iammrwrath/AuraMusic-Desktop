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
let bassShieldHighpass: BiquadFilterNode | null = null;
let bandpassFilter: BiquadFilterNode | null = null;
let karaokeInverter: GainNode | null = null;
let bypassGain: GainNode | null = null;
let processedGain: GainNode | null = null;
let stereoPassGain: GainNode | null = null;
let rawAudioSource: AudioNode | null = null;

let currentMode: VocalMode = 'off';
let buttonEl: HTMLButtonElement | null = null;

function setGainSmooth(gainNode: GainNode | null, target: number) {
  if (!gainNode) return;
  const now = gainNode.context.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.setTargetAtTime(target, now, 0.025); // 25ms click-free crossfade
}

function applyMode(mode: VocalMode) {
  currentMode = mode;
  if (!bypassGain || !processedGain || !centerSum || !karaokeInverter) return;

  if (mode === 'off') {
    setGainSmooth(bypassGain, 1.0);
    setGainSmooth(processedGain, 0.0);
  } else if (mode === 'karaoke') {
    // Vocal cut: bypass off, inverted center vocal subtracted from original stereo
    setGainSmooth(bypassGain, 0.0);
    setGainSmooth(processedGain, 1.0);
    if (stereoPassGain) setGainSmooth(stereoPassGain, 1.0);
    setGainSmooth(karaokeInverter, -1.0);
    setGainSmooth(centerSum, 0.5);
  } else if (mode === 'acapella') {
    // Vocal solo: isolate centered vocal formant band, mute original stereo pass
    setGainSmooth(bypassGain, 0.0);
    setGainSmooth(processedGain, 1.0);
    if (stereoPassGain) setGainSmooth(stereoPassGain, 0.0);
    setGainSmooth(karaokeInverter, 1.0);
    setGainSmooth(centerSum, 1.0);
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
  rawAudioSource = audioSource;
  destinationNode = audioContext.destination;

  // Disconnect direct audio source connection from renderer.ts line 285
  // to eliminate raw audio bleeding through into the speakers
  try {
    audioSource.disconnect(destinationNode);
  } catch {}

  // 1. Bypass path (active when mode === 'off')
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

  // Bass Shield: 130Hz high-pass filter so sub-bass (<130Hz), 808s, and kick drums remain 100% untouched
  bassShieldHighpass = audioContext.createBiquadFilter();
  bassShieldHighpass.type = 'highpass';
  bassShieldHighpass.frequency.value = 130;
  bassShieldHighpass.Q.value = 0.7;

  // Vocal formant bandpass: human vocal core range ~300Hz - 3400Hz
  bandpassFilter = audioContext.createBiquadFilter();
  bandpassFilter.type = 'bandpass';
  bandpassFilter.frequency.value = 1250;
  bandpassFilter.Q.value = 0.85;

  karaokeInverter = audioContext.createGain();
  karaokeInverter.gain.value = -1.0;

  // Stereo pass-through gain (muted in Acapella mode so original mix doesn't play)
  stereoPassGain = audioContext.createGain();
  stereoPassGain.gain.value = currentMode === 'acapella' ? 0.0 : 1.0;

  audioSource.connect(splitter);

  // Splitter L and R into centerSum
  splitter.connect(centerSum, 0);
  splitter.connect(centerSum, 1);

  // Route centerSum -> bassShieldHighpass -> bandpassFilter -> karaokeInverter
  centerSum.connect(bassShieldHighpass);
  bassShieldHighpass.connect(bandpassFilter);
  bandpassFilter.connect(karaokeInverter);

  // Route inverted center vocal into L and R channels
  karaokeInverter.connect(merger, 0, 0);
  karaokeInverter.connect(merger, 0, 1);

  // Route stereo pass-through through stereoPassGain into merger
  splitter.connect(stereoPassGain, 0);
  splitter.connect(stereoPassGain, 1);
  stereoPassGain.connect(merger, 0, 0);
  stereoPassGain.connect(merger, 0, 1);

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
      if (rawAudioSource && destinationNode) {
        try {
          rawAudioSource.connect(destinationNode);
        } catch {}
      }
    },
  },
});
