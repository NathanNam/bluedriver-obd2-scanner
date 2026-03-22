# OBD2 Scanner

A web app that connects to your vehicle's OBD2 port via an ELM327 Bluetooth adapter — directly from your browser using the Web Bluetooth API. Read diagnostic trouble codes in plain English, monitor real-time engine data with time-series charts, and export scan reports.

<p align="center">
  <img src="docs/screenshot-scan.png" alt="One-Time Scan — DTCs with descriptions, manufacturer hints, and raw data log" width="700" />
</p>

<p align="center">
  <img src="docs/screenshot-live.png" alt="Live Scan — real-time time-series charts with session stats and data table" width="700" />
</p>

## Features

**One-Time Scan**
- Read VIN, ECU calibration ID, and OBD standard
- Check Engine Light (MIL) status detection
- Stored, pending, and permanent DTCs with plain-English descriptions, severity badges, and potential causes
- Manufacturer-specific code hints (e.g., Toyota/Lexus hybrid-repurposed codes)
- Freeze frame data captured at time of fault
- Collapsible raw scan data log showing every OBD2 command and response
- Clear fault codes (with confirmation and re-scan)
- Export scan reports via share or clipboard

**Live Scan**
- Real-time streaming of 13 PIDs: RPM, speed, coolant temp, throttle, engine load, IAT, MAP, timing advance, fuel level, oil temp, STFT, LTFT, MAF
- Stacked time-series charts — one per parameter with 60-second rolling window
- Caution and critical threshold lines on each chart
- Session stats: min, max, and average tracked per PID
- Alert banner when values cross critical thresholds
- Refresh rate indicator (Hz) in the header
- Numerical data table with all parameters and min/max/avg
- Session recording with playback and CSV export
- Gauge PIDs polled at full rate, secondary PIDs every 3rd cycle

**General**
- Full dark mode support (follows system preference or manual toggle)
- Imperial / metric unit switching
- Responsive layout: sidebar navigation on desktop, bottom tabs on mobile
- Scan and recording history
- Works completely offline after initial load
- Built-in demo mode with simulated OBD2 data for testing without hardware

## Supported Adapters

| Adapter | Protocol | Status |
|---|---|---|
| Veepeak OBDCheck BLE+ | ELM327 v2.2 over BLE | Tested, works |
| Veepeak OBDCheck BLE | ELM327 v1.4 over BLE | Should work |
| Generic ELM327 BLE adapters | ELM327 over BLE | Should work |
| BlueDriver Pro | Proprietary | Not compatible (proprietary protocol) |
| OBDLink MX+ | Bluetooth Classic (SPP) | Not compatible (Web Bluetooth requires BLE) |

## Getting Started

### Prerequisites

- **Chrome or Edge** browser (Web Bluetooth is not supported in Safari or Firefox)
- ELM327 BLE adapter (e.g., Veepeak OBDCheck BLE+)
- Node.js 18+ (for development)

### Install & Run

```bash
git clone https://github.com/NathanNam/bluedriver-obd2-scanner.git
cd bluedriver-obd2-scanner
npm install
npm run dev
```

Open http://localhost:5173 in Chrome. The app starts in **demo mode** with simulated OBD2 data — no adapter needed.

### Connecting to a Real Vehicle

1. Plug your ELM327 BLE adapter into the car's OBD2 port (under the dashboard, driver side)
2. Turn ignition ON (engine running or accessory mode)
3. Open the app in Chrome at http://localhost:5173
4. Click **"Use Real BT"** to switch from demo mode
5. Click **"Scan for Devices"** — Chrome shows its native Bluetooth device picker
6. Select your adapter and click Pair
7. Click the device in the Discovered Devices list to connect
8. Choose **One-Time Scan** or **Live Scan**

> Web Bluetooth requires HTTPS or localhost. Chrome or Edge only.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Bluetooth | Web Bluetooth API |
| OBD2 Protocol | ELM327 AT commands over BLE |
| State | Zustand |
| Charts | Inline SVG time-series |
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
    └── hooks.ts        # useThemeColors, useWindowWidth hooks
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

PIDs are polled sequentially — the ELM327 is single-threaded and cannot handle concurrent requests. Gauge PIDs are polled every cycle; secondary PIDs every 3rd cycle for performance. Unsupported PIDs are auto-excluded after a `NO DATA` response. `BUS BUSY` errors retry up to 3 times with 200ms delay.

## Browser Compatibility

| Browser | Web Bluetooth | Status |
|---|---|---|
| Chrome (desktop & Android) | Yes | Fully supported |
| Edge | Yes | Fully supported |
| Safari | No | Demo mode only |
| Firefox | No | Demo mode only |

## License

Copyright 2026 Nathan Nam. Licensed under the Apache License, Version 2.0 — see [LICENSE](LICENSE) for details.
