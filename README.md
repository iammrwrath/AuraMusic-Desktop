<div align="center">

# 🎵 AuraMusic Desktop

### The ultimate YouTube Music desktop client for Windows, macOS, and Linux — featuring native Windows 11 Fluent Acrylic/Mica aesthetics, real-time karaoke vocal isolation, live lyrics translation, OBS Studio streaming broadcast suite, and audiophile DSP.

<br/>

[![Latest Release](https://img.shields.io/github/v/release/iammrwrath/AuraMusic-Desktop?style=for-the-badge&labelColor=0d1117&color=00f0ff)](https://github.com/iammrwrath/AuraMusic-Desktop/releases)
[![Platforms](https://img.shields.io/badge/Platforms-Windows%20%7C%20macOS%20%7C%20Linux-a855f7?style=for-the-badge&labelColor=0d1117)](https://github.com/iammrwrath/AuraMusic-Desktop/releases)
[![License](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge&labelColor=0d1117)](./license)
[![Maintained by iammrwrath](https://img.shields.io/badge/Maintainer-iammrwrath-ec4899?style=for-the-badge&labelColor=0d1117)](https://github.com/iammrwrath)
[![AuraMusic Mobile](https://img.shields.io/badge/Mobile%20App-AuraMusic%20Android-6366f1?style=for-the-badge&labelColor=0d1117)](https://github.com/iammrwrath/AuraMusic)

<br/>

[**Download**](#-download) · [**Highlights**](#-key-features) · [**Vocal Isolator & Karaoke**](#-real-time-vocal-isolator--karaoke-mode) · [**OBS Streaming Suite**](#-obs-studio-streaming-broadcast-suite) · [**Build Instructions**](#️-build-from-source) · [**Credits**](#-framework-credits--acknowledgments)

</div>

---

> [!NOTE]
> ### 🚀 Version 1.0.0 Released!
> **AuraMusic Desktop** is the official desktop companion to the [AuraMusic Mobile](https://github.com/iammrwrath/AuraMusic) ecosystem. Engineered on top of YouTube Music, it bridges high-performance hardware-accelerated playback with live lyrics translation, zero-latency karaoke vocal suppression, and dedicated transparent broadcast overlays for streamers and DJs.

---

## 🎧 Key Features

### 🪟 Windows 11 Fluent Acrylic & Cosmic Glass Mode
* **Signature Aura Glass Theme**: Translucent Windows 11 Acrylic and Mica glass styling paired with deep OLED black (`#08090f`) and cosmic neon cyan/purple glowing accents.
* **Frameless Seamless Integration**: Custom-styled window controls (Minimize, Maximize, Close) and glowing brand identity embedded directly into the navigation header.
* **Dynamic Liquid Mesh Canvas**: GPU-accelerated backdrop that extracts dominant color palettes from the active album art and renders soft floating ambient gradients.
* **Custom Sleek Scrollbars**: Ultra-thin, glowing glass scrollbars that auto-hide when not in use.

### 🎤 Real-Time Vocal Isolator & Karaoke Mode
* **Zero-Latency Web Audio DSP**: Real-time center-channel phase decomposition coupled with human vocal formant bandpass filtering (300Hz – 3.4kHz).
* **Karaoke Mode (Vocal Cut)**: Instantly suppress lead vocals for sing-alongs while preserving punchy drums, sub-bass, and stereo backing instrumentation.
* **Acapella Mode (Vocal Solo)**: Isolate the centered vocal track for vocal focus, study, or live DJ sampling.
* **1-Click Player Bar Control**: Dedicated microphone button on the bottom control bar with glowing cyan (`K`) and purple (`A`) badges.

### 🌐 Advanced Synced Lyrics & Live Translation
* **Dual-Line Live Translation**: Foreign-language lyrics (Japanese, Korean, Spanish, French, German, etc.) are translated on the fly and rendered smoothly beneath each original line.
* **Multi-Provider Fallback Engine**: Integrates **Kugou** (ported from AuraMusic Android) alongside **LRCLIB** and **Genius**, unlocking millions of syllable-accurate timestamped lyrics worldwide.
* **Romanization & Furigana**: Built-in Japanese Romaji, Korean Hangul, and Chinese Pinyin transliteration.
* **Interactive Kinetic Typography**: Apple Music style bouncy typography for active lines, soft blur for inactive lines, and click-to-seek timestamp jumping.

### 📡 OBS Studio Streaming Broadcast Suite
* **Zero-Configuration Overlays**: Built-in transparent HTTP endpoints designed specifically for OBS Studio and Streamlabs Browser Sources:
  * **Now Playing Card** (`http://localhost:26538/overlay/now-playing`): Displays high-res cover art, track title, artist name, progress bar, and real-time animated audio visualizer spectrum bars.
  * **Live Synced Lyrics** (`http://localhost:26538/overlay/lyrics`): Transparent, auto-scrolling lyrics overlay with bold active highlights and live translations.
* **Tuna Protocol & WebSocket Sync**: Broadcasts live track position, duration, and metadata for custom stream widgets and Twitch bot integrations.

### 🎚️ Audiophile DSP Equalizer
* **Aura-Tuned Studio Curves**: Pre-configured high-precision biquad filter presets:
  * *Deep Sub-Bass Punch (Aura Tuned)*: Controlled sub-60Hz low-end reinforcement.
  * *Vocal Clarity & Presence*: Lifts vocal presence while eliminating mud.
  * *Electronic / Club EDM*: Smile curve with deep low-end and sparkling highs.
  * *Crisp High-End Treble*: Crystal clear top-end air.
* **Radio Mutual Exclusion**: Presets toggle cleanly without layering conflicting filter nodes.

### ⚡ 120fps Hardware-Accelerated Performance
* **Zero UI Lag**: Enabled with Chromium GPU rasterization, zero-copy buffers, and out-of-process canvas rasterization (`--enable-gpu-rasterization`, `--enable-zero-copy`, `--ignore-gpu-blocklist`).
* **High Refresh Rate Smoothness**: Fluid 120Hz/144Hz scrolling across massive playlists, albums, and artist discographies.
* **Memory Optimizer**: Automatically cleans web frame caches when minimized to the Windows system tray.

### 🛡️ Out-of-the-Box AdBlocker & Downloader
* **Built-in Ad Blocker**: Blocks all audio, video, and banner advertisements out of the box with zero interruption prompts.
* **SponsorBlock Integration**: Automatically skips non-music intros, sponsored segments, and music video outros.
* **Audio Downloader**: Save audio tracks directly with embedded ID3 metadata tags, high-resolution album artwork, and companion `.lrc` lyrics files.

---

## 📲 Download

<div align="center">

### Windows
| Package | Format | Architecture | Download |
| :--- | :--- | :--- | :--- |
| **AuraMusic Setup** | `.exe` (NSIS Installer) | Windows 10 / 11 (64-bit) | [⬇️ Download AuraMusic-Setup-1.0.0.exe](https://github.com/iammrwrath/AuraMusic-Desktop/releases/latest) |
| **AuraMusic Portable** | `.exe` (Standalone) | Windows 10 / 11 (64-bit) | [⬇️ Download AuraMusic-1.0.0-Portable.exe](https://github.com/iammrwrath/AuraMusic-Desktop/releases/latest) |

<br/>

### Mobile (Android)
Looking for the mobile client? Check out **[AuraMusic for Android](https://github.com/iammrwrath/AuraMusic)** with Nothing OS Dot Matrix theme and Android Auto support!

</div>

---

## 📺 OBS Studio Streaming Setup Guide

To display live track information or scrolling lyrics on your livestream:

1. Launch **AuraMusic Desktop**.
2. Open **OBS Studio** (or Streamlabs).
3. Under **Sources**, click **+** and choose **Browser**.
4. Configure your desired overlay:
   * **Now Playing Overlay**:
     * URL: `http://localhost:26538/overlay/now-playing`
     * Width: `600`, Height: `180`
   * **Live Synced Lyrics Overlay**:
     * URL: `http://localhost:26538/overlay/lyrics`
     * Width: `1280`, Height: `300`
5. Check **Shutdown source when not visible** and click **OK**. The widget will automatically stay transparent and update in real time as tracks play!

---

## 🛠️ Build from Source

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher; v24 recommended)
* [pnpm](https://pnpm.io/) (v10 or higher): `npm install -g pnpm@10`
* Git

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/iammrwrath/AuraMusic-Desktop.git
cd AuraMusic-Desktop

# 2. Install dependencies
pnpm install

# 3. Launch in development mode
pnpm dev
# (or double-click run_app.bat on Windows)

# 4. Compile TypeScript & bundle production assets
pnpm build

# 5. Build Windows installer and portable binary
pnpm release:win
# (or double-click build_installer.bat on Windows)
```

Generated installer packages will be available in the `dist/` directory.

---

## 🙏 Framework Credits & Acknowledgments

AuraMusic Desktop proudly builds upon the extraordinary achievements of the open-source community. We express our deepest gratitude to the developers, maintainers, and foundational projects that made this application possible:

* **[CodeMathis/youtube-music](https://github.com/CodeMathis/youtube-music)** (by Mathis and contributors) & **[th-ch/youtube-music](https://github.com/th-ch/youtube-music)** (by th-ch and community):  
  The brilliant Electron desktop wrapper, modular plugin system, and built-in ad blocker framework that serves as the core technical foundation for this desktop client.
* **[Metrolist](https://github.com/MetrolistGroup/Metrolist)** (by Mo Agamy and contributors):  
  The pioneering open-source Android architecture, YouTube Music streaming concepts, and Kugou & LRCLib lyrics synchronization engine that inspired the AuraMusic ecosystem.
* **[BitChord](https://github.com/kushagrasinghx/BitChord)** (by Kushagra Singh):  
  Inspiration for Automix DJ transition paradigms and audiophile audio interface enhancements.
* **[AuraMusic Mobile](https://github.com/iammrwrath/AuraMusic)**:  
  Our dedicated companion application for Android with Nothing OS Dot Matrix aesthetics and Android Auto live lyrics.

---

## 💬 Support & Bug Reports

* **Maintainer**: [@iammrwrath](https://github.com/iammrwrath)
* **Bug Reports & Feature Requests**: [Open a GitHub Issue](https://github.com/iammrwrath/AuraMusic-Desktop/issues)
* **Direct Email Contact**: [`iammrwrath@gmail.com`](mailto:iammrwrath@gmail.com?subject=AuraMusic%20Desktop%20Inquiry)

---

## 📄 License

AuraMusic Desktop is licensed under the **MIT License**. See the [LICENSE](license) file for full terms.
