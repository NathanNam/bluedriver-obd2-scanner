// ============================================================
// Newton Stream Manager — Machine State Lens for OBD2
// Adapted from corsense-hrv reference implementation
// ============================================================

const API_KEY = () => process.env.ATAI_API_KEY ?? '';
const API_BASE = () => process.env.ATAI_API_ENDPOINT ?? 'https://api.u1.archetypeai.app/v0.5';
const MACHINE_STATE_LENS = 'lns-1d519091822706e2-bc108andqxf8b4os';
const QUERY_INTERVAL_MS = 15000;
const MIN_DATA_POINTS = 32;
const MAX_BUFFER_SIZE = 300;
const WINDOW_SIZE = 16;
const STEP_SIZE = 8;
const SSE_TIMEOUT_MS = 120000;

interface PIDSnapshot {
  timestamp: number;
  values: Record<string, number>;
}

interface StreamResult {
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

    // Upload n-shot focus CSVs (cached across restarts)
    if (!this.normalFileId || !this.attentionFileId) {
      await this.uploadExamples();
    }

    // Start periodic queries after a short delay
    setTimeout(() => {
      if (this._isRunning) {
        this.queryInterval = setInterval(() => this.runQuery(), QUERY_INTERVAL_MS);
      }
    }, 3000);
  }

  stop() {
    this._isRunning = false;
    if (this.queryInterval) {
      clearInterval(this.queryInterval);
      this.queryInterval = null;
    }
    if (this.sessionId) {
      this.deleteSession(this.sessionId).catch(() => {});
      this.sessionId = null;
    }
    if (this.lastCsvFileId) {
      this.deleteFile(this.lastCsvFileId).catch(() => {});
      this.lastCsvFileId = null;
    }
    this.dataBuffer = [];
  }

  private async runQuery() {
    if (this.dataBuffer.length < MIN_DATA_POINTS) {
      console.log(`[Newton] Waiting for data... (${this.dataBuffer.length}/${MIN_DATA_POINTS})`);
      return;
    }

    try {
      // Build and upload CSV
      const csv = this.buildCSV();
      const fileId = await this.uploadFile('obd2-live.csv', csv, 'text/csv');
      if (!fileId) {
        console.error('[Newton] Failed to upload CSV');
        return;
      }

      // Clean up previous CSV
      if (this.lastCsvFileId) {
        this.deleteFile(this.lastCsvFileId).catch(() => {});
      }
      this.lastCsvFileId = fileId;

      // Create session on first query
      if (!this.sessionId) {
        const created = await this.createSession();
        if (!created) return;
      }

      // Set input stream to new CSV
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

      // Calculate expected windows for early termination
      const dataPoints = this.dataBuffer.length;
      const expectedWindows = Math.max(1, Math.floor((dataPoints - WINDOW_SIZE) / STEP_SIZE) + 1);

      // Read SSE results
      const result = await this.readSSEResults(this.sessionId!, expectedWindows);
      if (result) {
        this.emit(result);
        console.log(`[Newton] Classification: ${result.label} (${result.confidence}%) — ${result.windows} windows`);
      }
    } catch (err) {
      console.error('[Newton] Query failed:', err);
      // Invalidate session on failure — will be recreated next query
      this.sessionId = null;
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
      console.log('[Newton] Creating Machine State Lens session...');

      const res = await this.apiCall('/lens/sessions/create', {
        lens_id: MACHINE_STATE_LENS,
      });
      this.sessionId = res.session_id;
      if (!this.sessionId) throw new Error('No session_id returned');

      // Configure n-shot classification with focus CSVs
      await this.apiCall('/lens/sessions/events/process', {
        session_id: this.sessionId,
        event: {
          type: 'session.modify',
          event_data: {
            focus: 'Classify vehicle health from OBD2 sensor data. "normal" means all readings within expected ranges for a running vehicle. "attention" means one or more sensors show concerning values such as high coolant temperature, erratic RPM, extreme fuel trims, overheating oil, or unusual engine load patterns.',
            input_n_shot: {
              normal: this.normalFileId,
              attention: this.attentionFileId,
            },
            csv_configs: {
              timestamp_column: 'timestamp',
              data_columns: DATA_COLUMNS,
              window_size: WINDOW_SIZE,
              step_size: STEP_SIZE,
            },
          },
        },
      });

      // Set output stream to SSE
      await this.apiCall('/lens/sessions/events/process', {
        session_id: this.sessionId,
        event: {
          type: 'output_stream.set',
          event_data: {
            stream_type: 'server_side_events_writer',
            stream_config: {},
          },
        },
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
    const url = `${API_BASE()}/lens/sessions/consumer/${sessionId}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SSE_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${API_KEY()}`,
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
      });

      const text = await res.text();
      clearTimeout(timeout);

      // Parse SSE events — response format: [label, {label1: score1, label2: score2}]
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

              // Response format: [label, {scores}]
              if (Array.isArray(response) && response.length >= 2) {
                const label = response[0] as string;
                const scores = response[1] as Record<string, number>;

                const normalizedScores: Record<string, number> = {};
                let maxScore = 0;
                let maxLabel = label;

                for (const [k, v] of Object.entries(scores)) {
                  const pct = Math.round(v * (v > 1 ? 1 : 100));
                  normalizedScores[k] = pct;
                  if (pct > maxScore) { maxScore = pct; maxLabel = k; }
                }

                lastResult = {
                  label: maxLabel,
                  confidence: maxScore,
                  scores: normalizedScores,
                  windows: windowCount,
                  timestamp: Date.now(),
                };
              }
            }

            // Early exit if we've received all expected windows
            if (windowCount >= expectedWindows) break;
          } catch { /* skip malformed */ }
        }
        if (windowCount >= expectedWindows) break;
      }

      return lastResult;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  // --- File Management ---

  private async uploadExamples() {
    console.log('[Newton] Uploading n-shot example CSVs...');
    const normalCSV = generateNormalCSV();
    const attentionCSV = generateAttentionCSV();
    this.normalFileId = await this.uploadFile('focus-normal.csv', normalCSV, 'text/csv');
    this.attentionFileId = await this.uploadFile('focus-attention.csv', attentionCSV, 'text/csv');
    console.log(`[Newton] Focus files: normal=${this.normalFileId}, attention=${this.attentionFileId}`);
  }

  private async uploadFile(name: string, content: string, contentType: string): Promise<string | null> {
    try {
      const blob = new Blob([content], { type: contentType });
      const formData = new FormData();
      formData.append('file', blob, name);

      const res = await fetch(`${API_BASE()}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY()}` },
        body: formData,
      });
      const data = await res.json();
      return data.file_id ?? null;
    } catch (err) {
      console.error('[Newton] File upload failed:', err);
      return null;
    }
  }

  private async deleteFile(fileId: string) {
    fetch(`${API_BASE()}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${API_KEY()}` },
    }).catch(() => {});
  }

  private async deleteSession(sessionId: string) {
    fetch(`${API_BASE()}/lens/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${API_KEY()}`, 'Content-Type': 'application/json' },
    }).catch(() => {});
  }

  private async apiCall(path: string, body: any): Promise<any> {
    const res = await fetch(`${API_BASE()}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${path} failed (${res.status}): ${text}`);
    }
    return res.json();
  }
}

// --- N-shot Example CSV Generators ---

function generateNormalCSV(): string {
  const cols = ['timestamp', ...DATA_COLUMNS].join(',');
  const rows = [cols];
  for (let i = 0; i < 100; i++) {
    const t = (i * 0.5).toFixed(3);
    const rpm = (800 + Math.sin(i / 10) * 200 + Math.random() * 100).toFixed(1);
    const speed = (60 + Math.sin(i / 15) * 20 + Math.random() * 5).toFixed(1);
    const coolant = (88 + Math.sin(i / 30) * 3 + Math.random() * 1).toFixed(1);
    const iat = (35 + Math.random() * 3).toFixed(1);
    const load = (25 + Math.sin(i / 10) * 10 + Math.random() * 5).toFixed(1);
    const throttle = (20 + Math.sin(i / 10) * 8 + Math.random() * 3).toFixed(1);
    const map = (95 + Math.sin(i / 20) * 5 + Math.random() * 2).toFixed(1);
    const fuel = (65 - i * 0.01).toFixed(1);
    const stft = (Math.random() * 4 - 2).toFixed(1);
    const ltft = (1 + Math.random() * 2 - 1).toFixed(1);
    const maf = (8 + Math.sin(i / 10) * 3 + Math.random() * 1).toFixed(1);
    rows.push(`${t},${rpm},${speed},${coolant},${iat},${load},${throttle},${map},${fuel},${stft},${ltft},${maf}`);
  }
  return rows.join('\n');
}

function generateAttentionCSV(): string {
  const cols = ['timestamp', ...DATA_COLUMNS].join(',');
  const rows = [cols];
  for (let i = 0; i < 100; i++) {
    const t = (i * 0.5).toFixed(3);
    const rpm = (600 + Math.random() * 800 + (Math.random() > 0.8 ? 1500 : 0)).toFixed(1);
    const speed = (40 + Math.random() * 30).toFixed(1);
    const coolant = (105 + i * 0.15 + Math.random() * 3).toFixed(1);
    const iat = (45 + Math.random() * 10).toFixed(1);
    const load = (50 + Math.random() * 40).toFixed(1);
    const throttle = (30 + Math.random() * 30).toFixed(1);
    const map = (80 + Math.random() * 30).toFixed(1);
    const fuel = (15 - i * 0.1).toFixed(1);
    const stft = (15 + Math.random() * 10).toFixed(1);
    const ltft = (12 + Math.random() * 8).toFixed(1);
    const maf = (3 + Math.random() * 5).toFixed(1);
    rows.push(`${t},${rpm},${speed},${coolant},${iat},${load},${throttle},${map},${fuel},${stft},${ltft},${maf}`);
  }
  return rows.join('\n');
}

// Singleton — use globalThis to survive Next.js hot reloads in dev
const globalForNewton = globalThis as unknown as { newtonStreamManager?: NewtonStreamManager };
export const newtonStreamManager = globalForNewton.newtonStreamManager ?? (globalForNewton.newtonStreamManager = new NewtonStreamManager());
