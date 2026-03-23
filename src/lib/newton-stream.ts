// ============================================================
// Newton Stream Manager — Machine State Lens for OBD2
// ============================================================

const API_KEY = () => process.env.ATAI_API_KEY ?? '';
const API_BASE = () => process.env.ATAI_API_ENDPOINT ?? 'https://api.u1.archetypeai.app/v0.5';
const MACHINE_STATE_LENS = 'lns-1d519091822706e2-bc108andqxf8b4os';
const QUERY_INTERVAL_MS = 15000;
const MIN_DATA_POINTS = 20;
const MAX_BUFFER_SIZE = 300;
const WINDOW_SIZE = 16;
const STEP_SIZE = 8;
const SSE_TIMEOUT_MS = 180000; // 3 min for first query (session setup is slow)

interface PIDSnapshot {
  timestamp: number;
  values: Record<string, number>;
}

export interface StreamResult {
  label: string;
  confidence: number;
  scores: Record<string, number>;
  windows: number;
  timestamp: number;
}

type ResultListener = (result: StreamResult) => void;

const DATA_COLUMNS = ['rpm', 'speed', 'coolant_temp', 'iat', 'engine_load', 'throttle', 'map', 'fuel_level', 'stft_b1', 'ltft_b1', 'maf'];
const PID_TO_COL: Record<string, string> = {
  '0C': 'rpm', '0D': 'speed', '05': 'coolant_temp', '0F': 'iat',
  '04': 'engine_load', '11': 'throttle', '0B': 'map', '2F': 'fuel_level',
  '06': 'stft_b1', '07': 'ltft_b1', '10': 'maf',
};

class NewtonStreamManager {
  private dataBuffer: PIDSnapshot[] = [];
  private sessionId: string | null = null;
  private normalFileId: string | null = null;
  private attentionFileId: string | null = null;
  private lastCsvFileId: string | null = null;
  private queryInterval: ReturnType<typeof setInterval> | null = null;
  private queryInProgress = false;
  private listeners: ResultListener[] = [];
  private _latestResult: StreamResult | null = null;
  private _isRunning = false;

  get isRunning() { return this._isRunning; }
  get latestResult() { return this._latestResult; }
  get bufferSize() { return this.dataBuffer.length; }

  addListener(fn: ResultListener) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
  }

  private emit(result: StreamResult) {
    this._latestResult = result;
    this.listeners.forEach((fn) => fn(result));
  }

  addData(snapshot: PIDSnapshot) {
    this.dataBuffer.push(snapshot);
    if (this.dataBuffer.length > MAX_BUFFER_SIZE) {
      this.dataBuffer = this.dataBuffer.slice(-MAX_BUFFER_SIZE);
    }
  }

  async start() {
    if (this._isRunning) return;
    this._isRunning = true;
    this.dataBuffer = [];
    this._latestResult = null;
    this.queryInProgress = false;

    if (!this.normalFileId || !this.attentionFileId) {
      await this.uploadExamples();
    }

    setTimeout(() => {
      if (this._isRunning) {
        this.queryInterval = setInterval(() => this.runQuery(), QUERY_INTERVAL_MS);
      }
    }, 3000);
  }

  stop() {
    this._isRunning = false;
    if (this.queryInterval) { clearInterval(this.queryInterval); this.queryInterval = null; }
    if (this.sessionId) { this.deleteSession(this.sessionId).catch(() => {}); this.sessionId = null; }
    if (this.lastCsvFileId) { this.deleteFile(this.lastCsvFileId).catch(() => {}); this.lastCsvFileId = null; }
    this.dataBuffer = [];
    this.queryInProgress = false;
  }

  private async runQuery() {
    if (this.dataBuffer.length < MIN_DATA_POINTS) {
      console.log(`[Newton] Waiting for data... (${this.dataBuffer.length}/${MIN_DATA_POINTS})`);
      return;
    }

    // Skip if previous query is still in progress
    if (this.queryInProgress) {
      console.log('[Newton] Skipping — previous query still in progress');
      return;
    }

    this.queryInProgress = true;

    try {
      const csv = this.buildCSV();
      const fileId = await this.uploadFile('obd2-live.csv', csv, 'text/csv');
      if (!fileId) { this.queryInProgress = false; return; }

      if (this.lastCsvFileId) this.deleteFile(this.lastCsvFileId).catch(() => {});
      this.lastCsvFileId = fileId;

      if (!this.sessionId) {
        const created = await this.createSession();
        if (!created) { this.queryInProgress = false; return; }
      }

      await this.apiCall('/lens/sessions/events/process', {
        session_id: this.sessionId,
        event: {
          type: 'input_stream.set',
          event_data: {
            stream_type: 'csv_file_reader',
            stream_config: {
              file_id: fileId,
              window_size: WINDOW_SIZE,
              step_size: STEP_SIZE,
              loop_recording: false,
              output_format: '',
            },
          },
        },
      });

      const dataPoints = this.dataBuffer.length;
      const expectedWindows = Math.max(1, Math.floor((dataPoints - WINDOW_SIZE) / STEP_SIZE) + 1);
      console.log(`[Newton] Querying (${dataPoints} points, expecting ${expectedWindows} windows)...`);

      const result = await this.readSSEResults(this.sessionId!, expectedWindows);
      if (result) {
        this.emit(result);
        console.log(`[Newton] Result: ${result.label} (${result.confidence}%) — ${result.windows} windows`);
      } else {
        console.warn('[Newton] No classification result from SSE');
      }
    } catch (err) {
      console.error('[Newton] Query failed:', err);
      this.sessionId = null;
    } finally {
      this.queryInProgress = false;
    }
  }

  private buildCSV(): string {
    const columns = ['timestamp', ...DATA_COLUMNS];
    const rows = [columns.join(',')];
    const baseTime = this.dataBuffer[0]?.timestamp ?? 0;

    for (const snapshot of this.dataBuffer) {
      const row: Record<string, string> = {
        timestamp: ((snapshot.timestamp - baseTime) / 1000).toFixed(3),
      };
      for (const [pid, col] of Object.entries(PID_TO_COL)) {
        row[col] = snapshot.values[pid]?.toFixed(1) ?? '0';
      }
      rows.push(columns.map((c) => row[c] ?? '0').join(','));
    }
    return rows.join('\n');
  }

  private async createSession(): Promise<boolean> {
    try {
      console.log('[Newton] Creating session...');
      const res = await this.apiCall('/lens/sessions/create', { lens_id: MACHINE_STATE_LENS });
      this.sessionId = res.session_id;
      if (!this.sessionId) throw new Error('No session_id');

      await this.apiCall('/lens/sessions/events/process', {
        session_id: this.sessionId,
        event: {
          type: 'session.modify',
          event_data: {
            focus: 'Classify vehicle health from OBD2 sensor data. "normal" means all readings within expected ranges. "attention" means concerning values.',
            input_n_shot: { normal: this.normalFileId, attention: this.attentionFileId },
            csv_configs: {
              timestamp_column: 'timestamp',
              data_columns: DATA_COLUMNS,
              window_size: WINDOW_SIZE,
              step_size: STEP_SIZE,
            },
          },
        },
      });

      await this.apiCall('/lens/sessions/events/process', {
        session_id: this.sessionId,
        event: { type: 'output_stream.set', event_data: { stream_type: 'server_side_events_writer', stream_config: {} } },
      });

      console.log(`[Newton] Session created: ${this.sessionId}`);
      return true;
    } catch (err) {
      console.error('[Newton] Session creation failed:', err);
      this.sessionId = null;
      return false;
    }
  }

  private async readSSEResults(sessionId: string, expectedWindows: number): Promise<StreamResult | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SSE_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE()}/lens/sessions/consumer/${sessionId}`, {
        headers: { Authorization: `Bearer ${API_KEY()}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      });

      const text = await res.text();
      clearTimeout(timeout);

      let lastResult: StreamResult | null = null;
      let windowCount = 0;

      for (const block of text.split('\n\n')) {
        for (const line of block.split('\n')) {
          if (!line.startsWith('data:')) continue;
          try {
            const event = JSON.parse(line.substring(5).trim());

            if (event.type === 'inference.result' && event.event_data?.response) {
              windowCount++;
              const response = event.event_data.response;

              if (Array.isArray(response) && response.length >= 2) {
                const rawLabel = response[0] as string;
                const rawScores = response[1] as Record<string, number>;
                console.log(`[Newton] Window ${windowCount}: label="${rawLabel}" scores=${JSON.stringify(rawScores)}`);

                // Normalize scores to percentages
                // Scores are vote counts (e.g., {attention:5, normal:0}) — normalize by sum
                const normalizedScores: Record<string, number> = {};
                const values = Object.values(rawScores);
                const sum = values.reduce((a, b) => a + b, 0);

                let maxPct = 0;
                let maxLabel = rawLabel;

                for (const [k, v] of Object.entries(rawScores)) {
                  const pct = sum > 0 ? Math.round((v / sum) * 100) : 0;
                  normalizedScores[k] = pct;
                  if (pct > maxPct) { maxPct = pct; maxLabel = k; }
                }

                // Use the label with the highest score
                lastResult = {
                  label: maxLabel,
                  confidence: maxPct,
                  scores: normalizedScores,
                  windows: windowCount,
                  timestamp: Date.now(),
                };
              }
            }

            if (windowCount >= expectedWindows) break;
          } catch { /* skip */ }
        }
        if (windowCount >= expectedWindows) break;
      }

      return lastResult;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  private async uploadExamples() {
    console.log('[Newton] Uploading n-shot CSVs (KIT Automotive Dataset)...');
    this.normalFileId = await this.uploadFile('focus-normal.csv', loadFocusCSV('focus-normal.csv'), 'text/csv');
    this.attentionFileId = await this.uploadFile('focus-attention.csv', loadFocusCSV('focus-attention.csv'), 'text/csv');
    console.log(`[Newton] Focus files: normal=${this.normalFileId}, attention=${this.attentionFileId}`);
  }

  private async uploadFile(name: string, content: string, contentType: string): Promise<string | null> {
    try {
      const blob = new Blob([content], { type: contentType });
      const formData = new FormData();
      formData.append('file', blob, name);
      const res = await fetch(`${API_BASE()}/files`, {
        method: 'POST', headers: { Authorization: `Bearer ${API_KEY()}` }, body: formData,
      });
      const data = await res.json();
      return data.file_id ?? null;
    } catch { return null; }
  }

  private async deleteFile(fileId: string) {
    fetch(`${API_BASE()}/files/${fileId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${API_KEY()}` } }).catch(() => {});
  }

  private async deleteSession(sessionId: string) {
    fetch(`${API_BASE()}/lens/sessions/${sessionId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${API_KEY()}`, 'Content-Type': 'application/json' },
    }).catch(() => {});
  }

  private async apiCall(path: string, body: any): Promise<any> {
    const res = await fetch(`${API_BASE()}${path}`, {
      method: 'POST', headers: { Authorization: `Bearer ${API_KEY()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API ${path} failed (${res.status}): ${await res.text()}`);
    return res.json();
  }
}

// Load real OBD2 data from KIT Automotive Dataset (CC BY 4.0)
// Source: https://radar.kit.edu/radar/en/dataset/bCtGxdTklQlfQcAq
function loadFocusCSV(filename: string): string {
  try {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'data', filename);
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.warn(`[Newton] Could not load ${filename}, using fallback`);
    return generateFallbackCSV();
  }
}

function generateFallbackCSV(): string {
  const cols = ['timestamp', ...DATA_COLUMNS].join(',');
  const rows = [cols];
  for (let i = 0; i < 100; i++) {
    rows.push(`${(i*0.5).toFixed(3)},${(800+Math.random()*200).toFixed(1)},${(50+Math.random()*30).toFixed(1)},${(85+Math.random()*5).toFixed(1)},${(35+Math.random()*3).toFixed(1)},${(25+Math.random()*10).toFixed(1)},${(20+Math.random()*10).toFixed(1)},${(95+Math.random()*5).toFixed(1)},50.0,0.0,0.0,${(8+Math.random()*3).toFixed(1)}`);
  }
  return rows.join('\n');
}

const globalForNewton = globalThis as unknown as { newtonStreamManager?: NewtonStreamManager };
export const newtonStreamManager = globalForNewton.newtonStreamManager ?? (globalForNewton.newtonStreamManager = new NewtonStreamManager());
