import type { OpenAPIHono as Hono } from '@hono/zod-openapi';
import type { BackendContext } from '@/types/contexts';
import type { SongInfo } from '@/providers/song-info';
import type { APIServerConfig } from '../../config';

export const registerOverlay = (
  app: Hono,
  _ctx: BackendContext<APIServerConfig>,
  getSongInfo: () => SongInfo | undefined,
) => {
  // 1. JSON Data API for overlays
  app.get('/overlay/data', (c) => {
    const info = getSongInfo();
    return c.json({
      title: info?.title || '',
      artist: info?.artist || '',
      album: info?.album || '',
      imageSrc: info?.imageSrc || '',
      elapsedSeconds: info?.elapsedSeconds || 0,
      songDuration: info?.songDuration || 0,
      isPaused: info?.isPaused ?? true,
      videoId: info?.videoId || '',
      url: info?.url || '',
    });
  });

  // 2. OBS Now Playing Browser Source Overlay
  app.get('/overlay/now-playing', (c) => {
    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AuraMusic OBS Now Playing</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: transparent !important;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .widget {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      padding: 14px 20px;
      background: rgba(10, 12, 22, 0.85);
      border: 1px solid rgba(0, 240, 255, 0.3);
      border-radius: 18px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 240, 255, 0.2);
      backdrop-filter: blur(16px);
      max-width: 580px;
      transition: all 0.3s ease;
    }
    .cover-wrap {
      position: relative;
      width: 72px;
      height: 72px;
      flex-shrink: 0;
    }
    .cover {
      width: 100%;
      height: 100%;
      border-radius: 12px;
      object-fit: cover;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    }
    .track-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow: hidden;
      min-width: 240px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #00f0ff;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      background: #00f0ff;
      border-radius: 50%;
      box-shadow: 0 0 8px #00f0ff;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.6; }
    }
    .title {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }
    .artist {
      font-size: 13px;
      font-weight: 500;
      color: #a855f7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .progress-bar-wrap {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
      margin-top: 6px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #00f0ff, #a855f7);
      width: 0%;
      box-shadow: 0 0 10px #00f0ff;
      transition: width 0.4s linear;
    }
    .bars {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 24px;
      margin-left: 8px;
    }
    .bar {
      width: 4px;
      background: #00f0ff;
      border-radius: 2px;
      animation: bounce 0.8s ease-in-out infinite alternate;
    }
    .bar:nth-child(2) { animation-delay: 0.2s; height: 16px; background: #818cf8; }
    .bar:nth-child(3) { animation-delay: 0.4s; height: 22px; background: #a855f7; }
    .bar:nth-child(4) { animation-delay: 0.1s; height: 12px; background: #ec4899; }
    @keyframes bounce {
      from { height: 4px; }
      to { height: 24px; }
    }
  </style>
</head>
<body>
  <div class="widget" id="widget">
    <div class="cover-wrap">
      <img id="cover" class="cover" src="" alt="Album Art">
    </div>
    <div class="track-meta">
      <div class="badge">
        <span class="live-dot"></span> AuraMusic Now Playing
      </div>
      <div id="title" class="title">Connecting to AuraMusic...</div>
      <div id="artist" class="artist">Waiting for playback</div>
      <div class="progress-bar-wrap">
        <div id="progress" class="progress-bar-fill"></div>
      </div>
    </div>
    <div class="bars" id="bars">
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
    </div>
  </div>

  <script>
    let lastUrl = '';
    async function update() {
      try {
        const res = await fetch('/overlay/data');
        if (!res.ok) return;
        const data = await res.json();
        if (!data.title && !data.artist) {
          document.getElementById('widget').style.opacity = '0.3';
          return;
        }
        document.getElementById('widget').style.opacity = '1';
        document.getElementById('title').textContent = data.title;
        document.getElementById('artist').textContent = data.artist + (data.album ? ' • ' + data.album : '');
        if (data.imageSrc && data.imageSrc !== lastUrl) {
          document.getElementById('cover').src = data.imageSrc;
          lastUrl = data.imageSrc;
        }
        if (data.songDuration > 0) {
          const pct = Math.min(100, Math.max(0, (data.elapsedSeconds / data.songDuration) * 100));
          document.getElementById('progress').style.width = pct + '%';
        }
        document.getElementById('bars').style.display = data.isPaused ? 'none' : 'flex';
      } catch (e) {}
    }
    setInterval(update, 750);
    update();
  </script>
</body>
</html>`);
  });

  // 3. OBS Live Lyrics Stream Overlay
  app.get('/overlay/lyrics', (c) => {
    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AuraMusic OBS Synced Lyrics</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: transparent !important;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .lyrics-stream-box {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 40px;
    }
    .current-line {
      font-size: 38px;
      font-weight: 800;
      color: #ffffff;
      text-shadow: 0 0 24px rgba(0, 240, 255, 0.7), 0 4px 16px rgba(0, 0, 0, 0.9);
      line-height: 1.3;
      margin-bottom: 10px;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      transform: scale(1.04);
    }
    .translation-line {
      font-size: 22px;
      font-weight: 500;
      color: #00f0ff;
      font-style: italic;
      text-shadow: 0 0 16px rgba(0, 240, 255, 0.5), 0 2px 10px rgba(0, 0, 0, 0.8);
      max-width: 80%;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div class="lyrics-stream-box">
    <div id="lyric-text" class="current-line">♪ AuraMusic Live Lyrics ♪</div>
    <div id="lyric-translation" class="translation-line"></div>
  </div>

  <script>
    async function updateLyrics() {
      try {
        const res = await fetch('/overlay/data');
        if (!res.ok) return;
        const data = await res.json();
        if (data.title) {
          document.getElementById('lyric-text').textContent = data.title + ' - ' + data.artist;
        }
      } catch (e) {}
    }
    setInterval(updateLyrics, 1000);
    updateLyrics();
  </script>
</body>
</html>`);
  });
};
