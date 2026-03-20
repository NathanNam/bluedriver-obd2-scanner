# OBD2 Scanner App

A React Native mobile application that connects to a vehicle's OBD2 port via the BlueDriver Pro Bluetooth adapter. Provides one-time diagnostic scanning (DTCs, VIN, freeze frame) and real-time live sensor data with configurable gauges.

## Features

### One-Time Scan
- Read VIN, ECU calibration ID, and OBD standard
- Check Engine Light (MIL) status
- Read stored, pending, and permanent DTCs with plain-English descriptions
- Freeze frame data at time of fault
- Clear fault codes with confirmation safeguard
- Export scan report via share sheet

### Live Scan
- Real-time PID streaming with 4 configurable gauge slots (2x2 grid)
- 13 supported parameters: RPM, speed, coolant temp, throttle position, engine load, intake air temp, MAP, timing advance, fuel level, oil temp, fuel trims (STFT/LTFT), MAF
- SVG circular arc gauges with color-coded zones (green/yellow/red)
- 60-second rolling time-series chart
- Session recording with playback and CSV export

### Additional
- Full dark mode support
- Imperial / metric unit switching
- Scan and recording history
- Offline — no network required

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native (Expo) |
| Language | TypeScript |
| BLE | `react-native-ble-plx` |
| OBD2 Protocol | ELM327 AT commands over BLE |
| State | Zustand |
| Charts / Gauges | `react-native-svg` |
| Navigation | React Navigation v7 (stack + bottom tabs) |
| Storage | AsyncStorage |

## Project Structure

```
src/
├── bluetooth/          # BLE connection manager, device discovery
├── obd2/               # ELM327 commands, PID registry, response parser
├── screens/            # HomeScreen, ScanScreen, LiveScreen, HistoryScreen, Settings
├── components/         # Gauge, DTCCard, StatusBadge, PIDRow, ConnectionStatusBar
├── store/              # Zustand stores: bluetooth, scan, live, settings
├── navigation/         # Tab + stack navigator setup
├── types/              # TypeScript type definitions
└── utils/
    ├── dtc/            # DTC lookup table (~200 codes)
    ├── theme.ts        # Light/dark color tokens, spacing, typography
    └── hooks.ts        # useThemeColors hook
```

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS 16+ or Android 10+ device (BLE required — simulators won't work for Bluetooth)
- BlueDriver Pro or compatible ELM327 BLE adapter

### Install & Run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` / `a` to open on a connected device.

### Before First Use

Verify your adapter's BLE service UUID using a BLE scanner app (e.g., LightBlue or nRF Connect). The default UUIDs in `src/bluetooth/manager.ts` cover BlueDriver and common ELM327 adapters, but your device may differ.

## Architecture

### Bluetooth Connection FSM

```
IDLE → SCANNING → CONNECTING → INITIALIZING → READY → SCANNING_OBD
  ↑                                              |
  └──────────── DISCONNECTED ←── ERROR ←─────────┘
```

### ELM327 Initialization

On connect, the adapter runs: `ATZ` → `ATE0` → `ATL0` → `ATH0` → `ATSP0` → `0100` (verify ECU).

### Live PID Polling

PIDs are polled sequentially (ELM327 is single-threaded). Unsupported PIDs are auto-excluded after a `NO DATA` response. BUS BUSY errors retry up to 3 times with 200ms delay.

## Platform Permissions

### iOS (`Info.plist`)
- `NSBluetoothAlwaysUsageDescription`
- `NSBluetoothPeripheralUsageDescription`

### Android (`AndroidManifest.xml`)
- `BLUETOOTH`, `BLUETOOTH_ADMIN`
- `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` (API 31+)
- `ACCESS_FINE_LOCATION` (required for BLE scan on Android < 12)

## License

MIT
