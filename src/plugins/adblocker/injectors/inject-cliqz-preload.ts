export default async () => {
  // @ts-ignore: dynamic import resolved at runtime
  await import('@ghostery/adblocker-electron-preload');
};
