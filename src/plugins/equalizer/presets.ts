export const defaultPresets = [
  'bass-booster',
  'deep-sub-bass',
  'vocal-clarity',
  'electronic-club',
  'treble-boost',
] as const;

export type Preset = (typeof defaultPresets)[number];

export type FilterConfig = {
  type: BiquadFilterType;
  frequency: number;
  Q: number;
  gain: number;
};

export const presetConfigs: Record<Preset, FilterConfig> = {
  'bass-booster': {
    type: 'lowshelf',
    frequency: 80,
    Q: 1.0,
    gain: 10.0,
  },
  'deep-sub-bass': {
    type: 'lowshelf',
    frequency: 55,
    Q: 0.8,
    gain: 8.5,
  },
  'vocal-clarity': {
    type: 'peaking',
    frequency: 2800,
    Q: 1.2,
    gain: 6.0,
  },
  'electronic-club': {
    type: 'lowshelf',
    frequency: 100,
    Q: 0.7,
    gain: 7.0,
  },
  'treble-boost': {
    type: 'highshelf',
    frequency: 8000,
    Q: 0.8,
    gain: 6.5,
  },
};
