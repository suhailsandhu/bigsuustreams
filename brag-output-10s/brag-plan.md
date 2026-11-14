# Courtside Stream: 10-Second Complete App Walkthrough Video Ad

## Overview
A high-energy, authentic product walkthrough designed for mobile-first sports streaming, captured directly from the live application running on an iPhone 15 Pro viewport.

## Features Showcased
1. **Fluid Schedule Navigation & Scrolling**:
   - 29-day interactive calendar navigation.
   - Real-time matchup cards featuring away/home teams, win-loss records, and local tipoff times.
   - Smooth animated scrolling through the game slate.
2. **Dual-League Switching (NBA to NFL)**:
   - One-tap toggle button directly below the league logo.
   - Immediate responsive transition from the official NBA hub to the official NFL shield and schedule (Commanders vs Giants).
3. **Card Interaction & Live Player Access**:
   - Interactive touch cursor lands on a matchup card and taps down with realistic button physics.
   - Screen expands into the dedicated `CourtsidePlayer` live theater view.
4. **Active Video Streaming & Real-Time Box Scores**:
   - 16:9 adaptive HLS live video player with pulsing green `● LIVE 1080P` indicator.
   - Real-time quarter-by-quarter breakdown (Q1, Q2, Q3, Q4, Total), active spectator counters, and box scores.
5. **App Customization & Stream Settings**:
   - Tapping the VIP Member badge in the header opens the full `ProfileModal` settings.
   - Stream quality modes (1080p, 720p, Auto), latency modes (Smooth Buffer vs Low Latency), dark/light theme switching, and spoiler shields.
6. **High-Impact Brand Outro**:
   - Glowing NBA + NFL dual-logo lockup.
   - "COURTSIDE STREAM — ZERO ADS. PURE SPORTS."
   - Action badges for mobile PWA install and local launch (`npm run dev`).

## Technical Specifications
- Resolution: 1920×1080 (Landscape 16:9)
- Target Duration: 10.0 seconds (300 frames @ 30 fps)
- Animation Engine: GSAP 3.15 with hardware GPU acceleration via Hyperframes
- Audio: 120 BPM electronic sports beat with synced tactile UI sound effects (impact, scroll, toggle, card tap, settings slide, outro)
