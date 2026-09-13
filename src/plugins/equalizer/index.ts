import { createPlugin } from '@/utils';
import { t } from '@/i18n';
import { MenuContext } from '@/types/contexts';
import { MenuTemplate } from '@/menu';
import { defaultPresets, presetConfigs, Preset, FilterConfig } from './presets';

export type EqualizerPluginConfig = {
  enabled: boolean;
  filters: FilterConfig[];
  presets: { [preset in Preset]: boolean };
};

let appliedNodes: AudioNode[] = [];
let cachedAudioSource: AudioNode | null = null;
let cachedAudioContext: AudioContext | null = null;
let currentConfig: EqualizerPluginConfig | null = null;

function applyEqualizerChain(config: EqualizerPluginConfig) {
  currentConfig = config;

  // Disconnect existing filter nodes
  appliedNodes.forEach((node) => {
    try {
      node.disconnect();
    } catch {}
  });
  appliedNodes = [];

  if (!cachedAudioSource || !cachedAudioContext) return;

  const filtersToApply = config.filters.concat(
    defaultPresets
      .filter((preset) => config.presets[preset])
      .map((preset) => presetConfigs[preset]),
  );

  if (filtersToApply.length === 0) return;

  // Studio-grade anti-clipping pre-amp attenuation to preserve headroom when boosting high gains
  const maxGain = Math.max(0, ...filtersToApply.map((f) => f.gain));
  const preampGainDb = maxGain > 0 ? -Math.min(maxGain * 0.35, 3.5) : 0;

  const preampNode = cachedAudioContext.createGain();
  preampNode.gain.value = Math.pow(10, preampGainDb / 20);
  appliedNodes.push(preampNode);

  cachedAudioSource.connect(preampNode);
  let previousNode: AudioNode = preampNode;

  // Cascade filters in series
  for (const filter of filtersToApply) {
    const biquad = cachedAudioContext.createBiquadFilter();
    biquad.type = filter.type;
    biquad.frequency.value = filter.frequency;
    biquad.Q.value = filter.Q;
    biquad.gain.value = filter.gain;

    previousNode.connect(biquad);
    previousNode = biquad;
    appliedNodes.push(biquad);
  }

  previousNode.connect(cachedAudioContext.destination);
}

export default createPlugin<
  unknown,
  unknown,
  {
    start: ({ getConfig }: { getConfig: () => Promise<EqualizerPluginConfig> }) => Promise<void>;
    onConfigChange: (newConfig: EqualizerPluginConfig) => void;
    stop: () => void;
  },
  EqualizerPluginConfig
>({
  name: () => t('plugins.equalizer.name'),
  description: () => t('plugins.equalizer.description'),
  restartNeeded: false,
  addedVersion: '3.7.X',
  config: {
    enabled: false,
    filters: [],
    presets: {
      'bass-booster': false,
      'deep-sub-bass': false,
      'vocal-clarity': false,
      'electronic-club': false,
      'treble-boost': false,
    },
  } as EqualizerPluginConfig,
  menu: async ({
    getConfig,
    setConfig,
  }: MenuContext<EqualizerPluginConfig>): Promise<MenuTemplate> => {
    const config = await getConfig();

    const presetNames: Record<Preset, string> = {
      'bass-booster': 'Bass Booster',
      'deep-sub-bass': 'Deep Sub-Bass Punch (Aura Tuned)',
      'vocal-clarity': 'Vocal Clarity & Presence',
      'electronic-club': 'Electronic / Club EDM',
      'treble-boost': 'Crisp High-End Treble',
    };

    return [
      {
        label: t('plugins.equalizer.menu.presets.label'),
        type: 'submenu',
        submenu: defaultPresets.map((preset) => ({
          label: presetNames[preset] || preset,
          type: 'radio',
          checked: !!config.presets[preset],
          click() {
            const isCurrentlyChecked = !!config.presets[preset];
            const updated = Object.fromEntries(
              defaultPresets.map((p) => [p, p === preset ? !isCurrentlyChecked : false]),
            ) as Record<Preset, boolean>;
            setConfig({
              presets: updated,
            });
          },
        })),
      },
    ];
  },
  renderer: {
    async start({ getConfig }) {
      const config = await getConfig();
      currentConfig = config;

      document.addEventListener(
        'ytmd:audio-can-play',
        ({ detail: { audioSource, audioContext } }) => {
          cachedAudioSource = audioSource;
          cachedAudioContext = audioContext;
          if (currentConfig) {
            applyEqualizerChain(currentConfig);
          }
        },
        { once: true, passive: true },
      );
    },
    onConfigChange(newConfig) {
      applyEqualizerChain(newConfig);
    },
    stop() {
      appliedNodes.forEach((node) => {
        try {
          node.disconnect();
        } catch {}
      });
      appliedNodes = [];
    },
  },
});
