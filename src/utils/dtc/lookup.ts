// ============================================================
// DTC Code Lookup Table
// Covers all P0xxx generic codes + common P1/P2/B/C/U codes
// ============================================================

const DTC_DATABASE: Record<string, string> = {
  // === FUEL AND AIR METERING ===
  P0001: 'Fuel volume regulator control circuit/open',
  P0002: 'Fuel volume regulator control circuit range/performance',
  P0003: 'Fuel volume regulator control circuit low',
  P0004: 'Fuel volume regulator control circuit high',
  P0010: 'Camshaft position actuator circuit (Bank 1)',
  P0011: 'Camshaft position - timing over-advanced (Bank 1)',
  P0012: 'Camshaft position - timing over-retarded (Bank 1)',
  P0013: 'Camshaft position actuator circuit (Bank 1 Exhaust)',
  P0014: 'Camshaft position - timing over-advanced (Bank 1 Exhaust)',
  P0015: 'Camshaft position - timing over-retarded (Bank 1 Exhaust)',
  P0016: 'Crankshaft/camshaft position correlation (Bank 1 Sensor A)',
  P0017: 'Crankshaft/camshaft position correlation (Bank 1 Sensor B)',
  P0020: 'Camshaft position actuator circuit (Bank 2)',
  P0021: 'Camshaft position - timing over-advanced (Bank 2)',
  P0022: 'Camshaft position - timing over-retarded (Bank 2)',

  // === FUEL AND AIR METERING (INJECTOR CIRCUIT) ===
  P0030: 'Heated oxygen sensor heater circuit (Bank 1 Sensor 1)',
  P0031: 'HO2S heater circuit low (Bank 1 Sensor 1)',
  P0032: 'HO2S heater circuit high (Bank 1 Sensor 1)',
  P0036: 'Heated oxygen sensor heater circuit (Bank 1 Sensor 2)',
  P0037: 'HO2S heater circuit low (Bank 1 Sensor 2)',
  P0038: 'HO2S heater circuit high (Bank 1 Sensor 2)',

  // === IGNITION SYSTEM / MISFIRE ===
  P0100: 'Mass air flow (MAF) sensor circuit',
  P0101: 'MAF sensor circuit range/performance',
  P0102: 'MAF sensor circuit low input',
  P0103: 'MAF sensor circuit high input',
  P0104: 'MAF sensor circuit intermittent',
  P0105: 'Manifold absolute pressure (MAP) sensor circuit',
  P0106: 'MAP sensor circuit range/performance',
  P0107: 'MAP sensor circuit low input',
  P0108: 'MAP sensor circuit high input',
  P0110: 'Intake air temperature (IAT) sensor circuit',
  P0111: 'IAT sensor circuit range/performance',
  P0112: 'IAT sensor circuit low input',
  P0113: 'IAT sensor circuit high input',
  P0115: 'Engine coolant temperature (ECT) sensor circuit',
  P0116: 'ECT sensor circuit range/performance',
  P0117: 'ECT sensor circuit low input',
  P0118: 'ECT sensor circuit high input',
  P0120: 'Throttle position sensor (TPS) circuit',
  P0121: 'TPS circuit range/performance',
  P0122: 'TPS circuit low input',
  P0123: 'TPS circuit high input',
  P0125: 'Insufficient coolant temperature for closed loop fuel control',
  P0128: 'Coolant thermostat below thermostat regulating temperature',
  P0130: 'O2 sensor circuit (Bank 1 Sensor 1)',
  P0131: 'O2 sensor circuit low voltage (Bank 1 Sensor 1)',
  P0132: 'O2 sensor circuit high voltage (Bank 1 Sensor 1)',
  P0133: 'O2 sensor circuit slow response (Bank 1 Sensor 1)',
  P0134: 'O2 sensor circuit no activity (Bank 1 Sensor 1)',
  P0135: 'O2 sensor heater circuit (Bank 1 Sensor 1)',
  P0136: 'O2 sensor circuit (Bank 1 Sensor 2)',
  P0137: 'O2 sensor circuit low voltage (Bank 1 Sensor 2)',
  P0138: 'O2 sensor circuit high voltage (Bank 1 Sensor 2)',
  P0139: 'O2 sensor circuit slow response (Bank 1 Sensor 2)',
  P0140: 'O2 sensor circuit no activity (Bank 1 Sensor 2)',
  P0141: 'O2 sensor heater circuit (Bank 1 Sensor 2)',

  P0150: 'O2 sensor circuit (Bank 2 Sensor 1)',
  P0151: 'O2 sensor circuit low voltage (Bank 2 Sensor 1)',
  P0152: 'O2 sensor circuit high voltage (Bank 2 Sensor 1)',
  P0153: 'O2 sensor circuit slow response (Bank 2 Sensor 1)',
  P0154: 'O2 sensor circuit no activity (Bank 2 Sensor 1)',
  P0155: 'O2 sensor heater circuit (Bank 2 Sensor 1)',
  P0156: 'O2 sensor circuit (Bank 2 Sensor 2)',
  P0157: 'O2 sensor circuit low voltage (Bank 2 Sensor 2)',
  P0158: 'O2 sensor circuit high voltage (Bank 2 Sensor 2)',
  P0159: 'O2 sensor circuit slow response (Bank 2 Sensor 2)',
  P0160: 'O2 sensor circuit no activity (Bank 2 Sensor 2)',
  P0161: 'O2 sensor heater circuit (Bank 2 Sensor 2)',

  // === FUEL SYSTEM ===
  P0170: 'Fuel trim (Bank 1)',
  P0171: 'System too lean (Bank 1)',
  P0172: 'System too rich (Bank 1)',
  P0173: 'Fuel trim (Bank 2)',
  P0174: 'System too lean (Bank 2)',
  P0175: 'System too rich (Bank 2)',

  // === IGNITION SYSTEM ===
  P0200: 'Injector circuit',
  P0201: 'Injector circuit - cylinder 1',
  P0202: 'Injector circuit - cylinder 2',
  P0203: 'Injector circuit - cylinder 3',
  P0204: 'Injector circuit - cylinder 4',
  P0205: 'Injector circuit - cylinder 5',
  P0206: 'Injector circuit - cylinder 6',
  P0207: 'Injector circuit - cylinder 7',
  P0208: 'Injector circuit - cylinder 8',
  P0217: 'Engine overtemperature condition',
  P0218: 'Transmission over temperature condition',
  P0219: 'Engine overspeed condition',
  P0220: 'Throttle/pedal position sensor B circuit',
  P0221: 'Throttle/pedal position sensor B circuit range/performance',
  P0222: 'Throttle/pedal position sensor B circuit low',
  P0223: 'Throttle/pedal position sensor B circuit high',

  // === EMISSION CONTROLS ===
  P0300: 'Random/multiple cylinder misfire detected',
  P0301: 'Cylinder 1 misfire detected',
  P0302: 'Cylinder 2 misfire detected',
  P0303: 'Cylinder 3 misfire detected',
  P0304: 'Cylinder 4 misfire detected',
  P0305: 'Cylinder 5 misfire detected',
  P0306: 'Cylinder 6 misfire detected',
  P0307: 'Cylinder 7 misfire detected',
  P0308: 'Cylinder 8 misfire detected',
  P0325: 'Knock sensor 1 circuit (Bank 1)',
  P0326: 'Knock sensor 1 circuit range/performance (Bank 1)',
  P0327: 'Knock sensor 1 circuit low (Bank 1)',
  P0328: 'Knock sensor 1 circuit high (Bank 1)',
  P0330: 'Knock sensor 2 circuit (Bank 2)',
  P0335: 'Crankshaft position sensor A circuit',
  P0336: 'Crankshaft position sensor A circuit range/performance',
  P0340: 'Camshaft position sensor A circuit (Bank 1)',
  P0341: 'Camshaft position sensor A circuit range/performance (Bank 1)',
  P0345: 'Camshaft position sensor A circuit (Bank 2)',

  // === AUXILIARY EMISSION CONTROLS ===
  P0400: 'Exhaust gas recirculation (EGR) flow',
  P0401: 'EGR flow insufficient',
  P0402: 'EGR flow excessive',
  P0410: 'Secondary air injection system',
  P0411: 'Secondary air injection system incorrect flow',
  P0420: 'Catalyst system efficiency below threshold (Bank 1)',
  P0421: 'Warm up catalyst efficiency below threshold (Bank 1)',
  P0430: 'Catalyst system efficiency below threshold (Bank 2)',
  P0440: 'Evaporative emission system',
  P0441: 'EVAP system incorrect purge flow',
  P0442: 'EVAP system leak detected (small leak)',
  P0443: 'EVAP system purge control valve circuit',
  P0446: 'EVAP system vent control circuit',
  P0449: 'EVAP system vent valve/solenoid circuit',
  P0450: 'EVAP system pressure sensor',
  P0451: 'EVAP system pressure sensor range/performance',
  P0452: 'EVAP system pressure sensor low',
  P0453: 'EVAP system pressure sensor high',
  P0455: 'EVAP system leak detected (large leak)',
  P0456: 'EVAP system leak detected (very small leak)',

  // === VEHICLE SPEED / IDLE CONTROL ===
  P0500: 'Vehicle speed sensor',
  P0501: 'Vehicle speed sensor range/performance',
  P0505: 'Idle control system',
  P0506: 'Idle control system RPM lower than expected',
  P0507: 'Idle control system RPM higher than expected',
  P0510: 'Closed throttle position switch',
  P0520: 'Engine oil pressure sensor circuit',
  P0521: 'Engine oil pressure sensor range/performance',
  P0522: 'Engine oil pressure sensor low',
  P0523: 'Engine oil pressure sensor high',

  // === COMPUTER OUTPUT CIRCUITS ===
  P0600: 'Serial communication link',
  P0601: 'Internal control module memory check sum error',
  P0602: 'Control module programming error',
  P0603: 'Internal control module KAM error',
  P0604: 'Internal control module RAM error',
  P0605: 'Internal control module ROM error',
  P0606: 'ECM/PCM processor fault',

  // === TRANSMISSION ===
  P0700: 'Transmission control system (MIL request)',
  P0705: 'Transmission range sensor circuit',
  P0710: 'Transmission fluid temperature sensor circuit',
  P0715: 'Input/turbine speed sensor circuit',
  P0720: 'Output speed sensor circuit',
  P0725: 'Engine speed input circuit',
  P0730: 'Incorrect gear ratio',
  P0731: 'Gear 1 incorrect ratio',
  P0732: 'Gear 2 incorrect ratio',
  P0733: 'Gear 3 incorrect ratio',
  P0734: 'Gear 4 incorrect ratio',
  P0735: 'Gear 5 incorrect ratio',
  P0740: 'Torque converter clutch circuit',
  P0741: 'Torque converter clutch circuit - performance or stuck off',
  P0750: 'Shift solenoid A',
  P0755: 'Shift solenoid B',
  P0760: 'Shift solenoid C',
  P0765: 'Shift solenoid D',

  // === COMMON P1xxx MANUFACTURER-SPECIFIC ===
  P1000: 'OBD systems readiness test not complete',
  P1101: 'MAF sensor out of self-test range',
  P1131: 'Lack of HO2S switch - sensor indicates lean (Bank 1)',
  P1132: 'Lack of HO2S switch - sensor indicates rich (Bank 1)',
  P1151: 'Lack of HO2S switch - sensor indicates lean (Bank 2)',
  P1152: 'Lack of HO2S switch - sensor indicates rich (Bank 2)',
  P1233: 'Fuel pump driver module offline',
  P1260: 'Theft detected - vehicle immobilized',
  P1299: 'Engine over-temperature protection active',
  P1450: 'Unable to bleed up fuel tank vacuum',
  P1451: 'EVAP system leak (EVAP canister system)',

  // === COMMON P2xxx ===
  P2000: 'NOx trap efficiency below threshold (Bank 1)',
  P2002: 'Diesel particulate filter efficiency below threshold (Bank 1)',
  P2006: 'Intake manifold runner control stuck closed (Bank 1)',
  P2008: 'Intake manifold runner control circuit/open (Bank 1)',
  P2015: 'Intake manifold runner position sensor range/performance (Bank 1)',
  P2096: 'Post catalyst fuel trim system too lean (Bank 1)',
  P2097: 'Post catalyst fuel trim system too rich (Bank 1)',
  P2101: 'Throttle actuator control motor circuit range/performance',
  P2106: 'Throttle actuator control system - forced limited power',
  P2110: 'Throttle actuator control system - forced limited RPM',
  P2111: 'Throttle actuator control system - stuck open',
  P2112: 'Throttle actuator control system - stuck closed',
  P2118: 'Throttle actuator control motor current range/performance',
  P2119: 'Throttle actuator control throttle body range/performance',
  P2122: 'Throttle/pedal position sensor D circuit low',
  P2127: 'Throttle/pedal position sensor E circuit low',
  P2135: 'Throttle/pedal position sensor voltage correlation',
  P2138: 'Throttle/pedal position sensor D/E voltage correlation',
  P2187: 'System too lean at idle (Bank 1)',
  P2188: 'System too rich at idle (Bank 1)',
  P2195: 'O2 sensor signal biased/stuck lean (Bank 1 Sensor 1)',
  P2196: 'O2 sensor signal biased/stuck rich (Bank 1 Sensor 1)',
  P2197: 'O2 sensor signal biased/stuck lean (Bank 2 Sensor 1)',
  P2198: 'O2 sensor signal biased/stuck rich (Bank 2 Sensor 1)',
  P2270: 'O2 sensor signal biased/stuck lean (Bank 1 Sensor 2)',
  P2271: 'O2 sensor signal biased/stuck rich (Bank 1 Sensor 2)',

  // === BODY CODES (B0xxx) ===
  B0001: 'Driver frontal stage 1 deployment control',
  B0002: 'Driver frontal stage 2 deployment control',
  B0003: 'Passenger frontal stage 1 deployment control',
  B0010: 'Driver side airbag deployment control',
  B0020: 'Passenger side airbag deployment control',
  B0051: 'Driver seatbelt pretensioner deployment loop',
  B0100: 'Electronic frontal sensor 1',

  // === CHASSIS CODES (C0xxx) ===
  C0035: 'Left front wheel speed sensor circuit',
  C0040: 'Right front wheel speed sensor circuit',
  C0045: 'Left rear wheel speed sensor circuit',
  C0050: 'Right rear wheel speed sensor circuit',
  C0060: 'Left front ABS solenoid circuit',
  C0065: 'Right front ABS solenoid circuit',
  C0070: 'Left rear ABS solenoid circuit',
  C0075: 'Right rear ABS solenoid circuit',
  C0110: 'Pump motor circuit',
  C0242: 'PCM indicated TCS malfunction',
  C0265: 'EBCM motor relay circuit',
  C0267: 'Pump motor circuit open or shorted',
  C0550: 'ECU performance',

  // === NETWORK CODES (U0xxx) ===
  U0001: 'High speed CAN communication bus',
  U0002: 'High speed CAN communication bus - performance',
  U0100: 'Lost communication with ECM/PCM A',
  U0101: 'Lost communication with TCM',
  U0102: 'Lost communication with transfer case control module',
  U0103: 'Lost communication with gear shift module',
  U0104: 'Lost communication with cruise control module',
  U0105: 'Lost communication with fuel injector control module',
  U0106: 'Lost communication with glow plug control module',
  U0107: 'Lost communication with throttle actuator control module',
  U0109: 'Lost communication with fuel pump control module',
  U0110: 'Lost communication with drive motor control module',
  U0121: 'Lost communication with ABS control module',
  U0122: 'Lost communication with vehicle dynamics control module',
  U0126: 'Lost communication with steering effort control module',
  U0131: 'Lost communication with power steering control module',
  U0140: 'Lost communication with body control module',
  U0141: 'Lost communication with body control module A',
  U0151: 'Lost communication with restraints control module',
  U0155: 'Lost communication with instrument panel cluster',
  U0164: 'Lost communication with HVAC control module',
  U0184: 'Lost communication with radio',
  U0199: 'Lost communication with door control module A',
  U0300: 'Internal control module software incompatibility',
  U0401: 'Invalid data received from ECM/PCM A',
};

/**
 * Look up the human-readable description for a DTC code.
 * Returns a generic description if the code is not in the database.
 */
export function lookupDTC(code: string): string {
  const upper = code.toUpperCase();

  // Direct lookup
  if (DTC_DATABASE[upper]) {
    return DTC_DATABASE[upper];
  }

  // Generate a generic description based on code format
  const system = upper.charAt(0);
  const systemNames: Record<string, string> = {
    P: 'Powertrain',
    B: 'Body',
    C: 'Chassis',
    U: 'Network',
  };

  const systemName = systemNames[system] ?? 'Unknown';
  const isManufacturer = upper.charAt(1) !== '0';

  return isManufacturer
    ? `${systemName} - Manufacturer specific code ${upper}`
    : `${systemName} code ${upper} (description not available)`;
}
