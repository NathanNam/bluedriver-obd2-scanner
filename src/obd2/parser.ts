// ============================================================
// OBD2 Response Parser
// ============================================================

import {
  ParsedPID,
  DTC,
  DTCType,
  DTCSeverity,
  DTCSystem,
  FreezeFrame,
} from '../types';
import { PID_REGISTRY, getPIDDataBytes } from './pids';
import { lookupDTC } from '../utils/dtc/lookup';

// --- Error Detection ---

export function isNoData(raw: string): boolean {
  const cleaned = raw.trim().toUpperCase();
  return cleaned === 'NO DATA' || cleaned === 'UNABLE TO CONNECT';
}

export function isError(raw: string): boolean {
  const cleaned = raw.trim().toUpperCase();
  return (
    cleaned === '?' ||
    cleaned.includes('BUS BUSY') ||
    cleaned.includes('BUS ERROR') ||
    cleaned.includes('CAN ERROR') ||
    cleaned.includes('FB ERROR') ||
    cleaned.includes('DATA ERROR') ||
    cleaned.includes('BUFFER FULL') ||
    cleaned.includes('ACT ALERT')
  );
}

export function isBusBusy(raw: string): boolean {
  return raw.trim().toUpperCase().includes('BUS BUSY');
}

// --- Utility ---

function hexToBytes(hex: string): number[] {
  const cleaned = hex.replace(/\s+/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes.push(parseInt(cleaned.substring(i, i + 2), 16));
  }
  return bytes;
}

function cleanResponse(raw: string): string {
  // Remove ELM327 prompt, whitespace, carriage returns
  return raw
    .replace(/>/g, '')
    .replace(/\r/g, '')
    .replace(/\n/g, ' ')
    .trim();
}

// --- PID Parser ---

export function parseRawResponse(raw: string, pid: string): ParsedPID | null {
  try {
    const cleaned = cleanResponse(raw);
    if (isNoData(cleaned) || isError(cleaned)) return null;

    const pidUpper = pid.toUpperCase();
    const definition = PID_REGISTRY[pidUpper];
    if (!definition) return null;

    // Expected response prefix: "41 XX" where XX is the PID
    const expectedPrefix = `41 ${pidUpper}`;
    // Find the response line containing our expected prefix
    const parts = cleaned.split(/\s+/);
    const prefixIdx = parts.findIndex(
      (p, i) =>
        p.toUpperCase() === '41' &&
        i + 1 < parts.length &&
        parts[i + 1].toUpperCase() === pidUpper
    );

    if (prefixIdx === -1) return null;

    const dataBytes = getPIDDataBytes(pidUpper);
    const a = parseInt(parts[prefixIdx + 2], 16);
    const b = dataBytes > 1 ? parseInt(parts[prefixIdx + 3], 16) : undefined;

    if (isNaN(a)) return null;

    const value = definition.formula(a, b);

    return {
      pid: pidUpper,
      name: definition.name,
      value: Math.round(value * 100) / 100,
      unit: definition.unit,
      raw: cleaned,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

// --- DTC Parser ---

function decodeDTCCode(byte1: number, byte2: number): string {
  const systems = ['P', 'C', 'B', 'U'];
  const systemIdx = (byte1 >> 6) & 0x03;
  const system = systems[systemIdx];
  const secondDigit = (byte1 >> 4) & 0x03;
  const thirdDigit = byte1 & 0x0f;
  const fourthDigit = (byte2 >> 4) & 0x0f;
  const fifthDigit = byte2 & 0x0f;

  return `${system}${secondDigit}${thirdDigit.toString(16).toUpperCase()}${fourthDigit.toString(16).toUpperCase()}${fifthDigit.toString(16).toUpperCase()}`;
}

function getDTCSystem(code: string): DTCSystem {
  const prefix = code.charAt(0);
  switch (prefix) {
    case 'P': return 'Powertrain';
    case 'B': return 'Body';
    case 'C': return 'Chassis';
    case 'U': return 'Network';
    default: return 'Powertrain';
  }
}

function getDTCSeverity(code: string): DTCSeverity {
  // Critical: engine/transmission misfire, overheating, etc.
  const criticalPatterns = [
    /^P030[0-9]/, // Misfires
    /^P010[5-8]/, // Manifold/MAP sensor
    /^P011[5-6]/, // Coolant temp
    /^P0217/,     // Engine overtemp
    /^P0218/,     // Trans overtemp
    /^P06[0-9]{2}/, // ECU faults
  ];
  for (const pattern of criticalPatterns) {
    if (pattern.test(code)) return 'critical';
  }

  // Warning: most powertrain codes
  if (code.startsWith('P0') || code.startsWith('P1') || code.startsWith('P2')) {
    return 'warning';
  }

  return 'info';
}

export function parseDTCs(raw: string, mode: 'stored' | 'pending' | 'permanent'): DTC[] {
  try {
    const cleaned = cleanResponse(raw);
    if (isNoData(cleaned) || isError(cleaned)) return [];

    // Response format: "43 XX XX YY YY ..." for mode 03
    // Mode 03 -> response prefix 43, Mode 07 -> 47, Mode 0A -> 4A
    const modeResponseMap: Record<string, string> = {
      stored: '43',
      pending: '47',
      permanent: '4A',
    };
    const responsePrefix = modeResponseMap[mode];

    const parts = cleaned.split(/\s+/).filter((p) => p.length > 0);
    const dtcs: DTC[] = [];

    // Find response prefix and parse byte pairs
    let i = 0;
    while (i < parts.length) {
      if (parts[i].toUpperCase() === responsePrefix) {
        i++; // skip prefix
        // Parse DTC byte pairs (2 bytes = 1 DTC)
        while (i + 1 < parts.length) {
          const b1 = parseInt(parts[i], 16);
          const b2 = parseInt(parts[i + 1], 16);
          if (isNaN(b1) || isNaN(b2)) break;
          // Skip 00 00 padding
          if (b1 === 0 && b2 === 0) {
            i += 2;
            continue;
          }
          const code = decodeDTCCode(b1, b2);
          const description = lookupDTC(code);
          dtcs.push({
            code,
            description,
            type: mode,
            severity: getDTCSeverity(code),
            system: getDTCSystem(code),
          });
          i += 2;
        }
      } else {
        i++;
      }
    }

    return dtcs;
  } catch {
    return [];
  }
}

// --- VIN Parser ---

export function parseVIN(raw: string): string | null {
  try {
    const cleaned = cleanResponse(raw);
    if (isNoData(cleaned) || isError(cleaned)) return null;

    // VIN response: "49 02 01 XX XX XX XX ..." spanning multiple lines
    const parts = cleaned.split(/\s+/).filter((p) => p.length > 0);

    // Find "49 02" prefix and extract data bytes
    const vinBytes: number[] = [];
    let i = 0;
    while (i < parts.length) {
      if (
        parts[i].toUpperCase() === '49' &&
        i + 1 < parts.length &&
        parts[i + 1].toUpperCase() === '02'
      ) {
        i += 3; // skip 49 02 XX (sequence number)
        // Collect remaining bytes until next prefix or end
        while (i < parts.length && parts[i].toUpperCase() !== '49') {
          const byte = parseInt(parts[i], 16);
          if (!isNaN(byte) && byte > 0) {
            vinBytes.push(byte);
          }
          i++;
        }
      } else {
        i++;
      }
    }

    if (vinBytes.length === 0) return null;

    const vin = vinBytes.map((b) => String.fromCharCode(b)).join('');
    // VIN should be 17 characters
    return vin.length >= 17 ? vin.substring(0, 17) : vin;
  } catch {
    return null;
  }
}

// --- Freeze Frame Parser ---

export function parseFreezeFrame(rawResponses: string[]): FreezeFrame {
  const frame: FreezeFrame = {
    rpm: null,
    speed: null,
    coolantTemp: null,
    engineLoad: null,
    shortTermFuelTrim: null,
    longTermFuelTrim: null,
    intakeManifoldPressure: null,
    timingAdvance: null,
  };

  const pidToField: Record<string, keyof FreezeFrame> = {
    '0C': 'rpm',
    '0D': 'speed',
    '05': 'coolantTemp',
    '04': 'engineLoad',
    '06': 'shortTermFuelTrim',
    '07': 'longTermFuelTrim',
    '0B': 'intakeManifoldPressure',
    '0E': 'timingAdvance',
  };

  for (const raw of rawResponses) {
    try {
      const cleaned = cleanResponse(raw);
      if (isNoData(cleaned) || isError(cleaned)) continue;

      // Freeze frame response prefix: 42 XX ...
      const parts = cleaned.split(/\s+/);
      const idx = parts.findIndex((p) => p.toUpperCase() === '42');
      if (idx === -1 || idx + 1 >= parts.length) continue;

      const pid = parts[idx + 1].toUpperCase();
      const field = pidToField[pid];
      if (!field) continue;

      const definition = PID_REGISTRY[pid];
      if (!definition) continue;

      const a = parseInt(parts[idx + 2], 16);
      const dataBytes = getPIDDataBytes(pid);
      const b = dataBytes > 1 ? parseInt(parts[idx + 3], 16) : undefined;

      if (!isNaN(a)) {
        (frame as any)[field] = Math.round(definition.formula(a, b) * 100) / 100;
      }
    } catch {
      continue;
    }
  }

  return frame;
}

// --- Monitor Status / MIL Parser ---

export function parseMILStatus(raw: string): boolean | null {
  try {
    const cleaned = cleanResponse(raw);
    if (isNoData(cleaned) || isError(cleaned)) return null;

    // Response: 41 01 XX ...
    const parts = cleaned.split(/\s+/);
    const idx = parts.findIndex(
      (p, i) =>
        p.toUpperCase() === '41' &&
        i + 1 < parts.length &&
        parts[i + 1].toUpperCase() === '01'
    );

    if (idx === -1 || idx + 2 >= parts.length) return null;

    const a = parseInt(parts[idx + 2], 16);
    if (isNaN(a)) return null;

    // Bit 7 of byte A is MIL status (1 = on)
    return (a & 0x80) !== 0;
  } catch {
    return null;
  }
}

// --- OBD Standard Parser ---

export function parseOBDStandard(raw: string): string | null {
  try {
    const cleaned = cleanResponse(raw);
    if (isNoData(cleaned) || isError(cleaned)) return null;

    const parts = cleaned.split(/\s+/);
    const idx = parts.findIndex(
      (p, i) =>
        p.toUpperCase() === '41' &&
        i + 1 < parts.length &&
        parts[i + 1].toUpperCase() === '1C'
    );

    if (idx === -1 || idx + 2 >= parts.length) return null;

    const value = parseInt(parts[idx + 2], 16);
    const standards: Record<number, string> = {
      1: 'OBD-II (CARB)',
      2: 'OBD (EPA)',
      3: 'OBD + OBD-II',
      6: 'EOBD',
      7: 'EOBD + OBD-II',
      13: 'JOBD + OBD-II',
      17: 'Engine Manufacturer Diagnostics (EMD)',
      18: 'EMD Enhanced (EMD+)',
    };

    return standards[value] ?? `Standard ${value}`;
  } catch {
    return null;
  }
}

// --- Calibration ID Parser ---

export function parseCalibrationId(raw: string): string | null {
  try {
    const cleaned = cleanResponse(raw);
    if (isNoData(cleaned) || isError(cleaned)) return null;

    // Response: 49 04 XX ... (ASCII encoded)
    const parts = cleaned.split(/\s+/).filter((p) => p.length > 0);
    const calBytes: number[] = [];

    let i = 0;
    while (i < parts.length) {
      if (
        parts[i].toUpperCase() === '49' &&
        i + 1 < parts.length &&
        parts[i + 1].toUpperCase() === '04'
      ) {
        i += 3; // skip 49 04 XX
        while (i < parts.length && parts[i].toUpperCase() !== '49') {
          const byte = parseInt(parts[i], 16);
          if (!isNaN(byte) && byte > 0) {
            calBytes.push(byte);
          }
          i++;
        }
      } else {
        i++;
      }
    }

    if (calBytes.length === 0) return null;
    return calBytes.map((b) => String.fromCharCode(b)).join('').trim();
  } catch {
    return null;
  }
}

// --- Supported PIDs Parser ---

export function parseSupportedPIDs(raw: string): string[] {
  try {
    const cleaned = cleanResponse(raw);
    if (isNoData(cleaned) || isError(cleaned)) return [];

    const parts = cleaned.split(/\s+/);
    const idx = parts.findIndex((p) => p.toUpperCase() === '41');
    if (idx === -1 || idx + 1 >= parts.length) return [];

    const basePid = parseInt(parts[idx + 1], 16);
    const dataBytes = parts.slice(idx + 2, idx + 6).map((p) => parseInt(p, 16));

    const supported: string[] = [];
    for (let byteIdx = 0; byteIdx < dataBytes.length; byteIdx++) {
      const byte = dataBytes[byteIdx];
      if (isNaN(byte)) continue;
      for (let bit = 7; bit >= 0; bit--) {
        if ((byte >> bit) & 1) {
          const pidNum = basePid + byteIdx * 8 + (7 - bit) + 1;
          supported.push(pidNum.toString(16).toUpperCase().padStart(2, '0'));
        }
      }
    }

    return supported;
  } catch {
    return [];
  }
}
