# BlueDriver OBD2 Scanner

A web app that connects to your vehicle's OBD2 port via a BlueDriver Pro or ELM327 Bluetooth adapter — directly from your browser using the Web Bluetooth API. Read diagnostic trouble codes in plain English, monitor real-time engine data on configurable gauges, and export scan reports.

<p align="center">
  <img src="docs/screenshot-home.png" alt="Scan results — DTCs, VIN, freeze frame data with desktop sidebar layout" width="700" />
</p>

## Features

**One-Time Scan**
- Read VIN, ECU calibration ID, and OBD standard
- Check Engine Light (MIL) status detection
- Stored, pending, and permanent DTCs with plain-English descriptions and severity badges
- Freeze frame data captured at time of fault
- Clear fault codes (with confirmation and re-scan)
- Export scan reports via share or clipboard

**Live Scan**
- Real-time streaming of 13 PIDs: RPM, speed, coolant temp, throttle, engine load, IAT, MAP, timing advance, fuel level, oil temp, STFT, LTFT, MAF
- 4 configurable gauge slots in a 2x2 grid with SVG arc gauges
- Color-coded zones (green / yellow / red) per parameter
- 60-second rolling time-series chart
- Session recording with playback and CSV export

**General**
- Full dark mode support (follows system preference or manual toggle)
- Imperial / metric unit switching
- Scan and recording history
- Works completely offline after initial load
- Built-in demo mode for testing without hardware

## Getting Started

### Prerequisites

- **Chrome or Edge** browser (Web Bluetooth is not supported in Safari or Firefox)
- BlueDriver Pro or compatible ELM327 BLE adapter (for real Bluetooth)
- Node.js 18+ (for development)

### Install & Run

```bash
git clone https://github.com/NathanNam/bluedriver-obd2-scanner.git
cd bluedriver-obd2-scanner
npm install
npm run dev
```

Open http://localhost:5173 in Chrome. The app starts in **demo mode** with simulated OBD2 data — no adapter needed.

### Demo Mode vs Real Bluetooth

The app defaults to **demo mode**, which simulates device discovery, connection, DTC responses, and live PID data with realistic oscillating values.

To connect to a real adapter:

1. Open the app in Chrome (Web Bluetooth requires HTTPS or localhost)
2. The app auto-detects Web Bluetooth support and offers a "Use Real Bluetooth" toggle
3. Click "Scan for Devices" — Chrome shows its native Bluetooth device picker
4. Select your BlueDriver or ELM327 adapter
5. The app initializes the ELM327 and you're ready to scan

> Web Bluetooth requires Chrome or Edge. Safari and Firefox do not support it.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Bluetooth | Web Bluetooth API |
| OBD2 Protocol | ELM327 AT commands over BLE |
| State | Zustand |
| Gauges / Charts | Inline SVG |
| Styling | Inline styles with theme system |

## Project Structure

```
src/
├── bluetooth/          # Web Bluetooth manager + demo simulator
├── obd2/               # ELM327 commands, PID registry, response parser
├── screens/            # Home, Scan, Live, History, ScanDetail, RecordingDetail, Settings
├── components/         # Gauge, DTCCard, StatusBadge, PIDRow, ConnectionStatusBar
├── store/              # Zustand stores: bluetooth, scan, live, settings
├── types/              # TypeScript type definitions
└── utils/
    ├── dtc/            # DTC lookup table (~200 codes)
    ├── theme.ts        # Light/dark color tokens
    └── hooks.ts        # useThemeColors hook
```

## Architecture

### Bluetooth Connection FSM

```
IDLE → SCANNING → CONNECTING → INITIALIZING → READY → SCANNING_OBD
  ↑                                              |
  └──────────── DISCONNECTED ←── ERROR ←─────────┘
```

### ELM327 Initialization

On connect: `ATZ` (reset) → `ATE0` (echo off) → `ATL0` (linefeeds off) → `ATH0` (headers off) → `ATSP0` (auto protocol) → `0100` (verify ECU).

### Live PID Polling

PIDs are polled sequentially — the ELM327 is single-threaded and cannot handle concurrent requests. Unsupported PIDs are auto-excluded after a `NO DATA` response. `BUS BUSY` errors retry up to 3 times with 200ms delay.

## Browser Compatibility

| Browser | Web Bluetooth | Status |
|---|---|---|
| Chrome (desktop & Android) | Yes | Fully supported |
| Edge | Yes | Fully supported |
| Safari | No | Demo mode only |
| Firefox | No | Demo mode only |

## License

Copyright 2026 Nathan Nam. Licensed under the Apache License, Version 2.0 — see [LICENSE](LICENSE) for details.
