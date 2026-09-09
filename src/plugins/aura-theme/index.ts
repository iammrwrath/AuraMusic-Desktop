import style from './style.css?inline';
import { createPlugin } from '@/utils';

export default createPlugin({
  name: () => 'Aura Signature Theme',
  description: () => 'Windows 11 Fluent Mica & Cosmic Glass aesthetic with glowing aura accents and smooth animations.',
  restartNeeded: false,
  config: {
    enabled: true,
  },
  stylesheets: [style],
});
