// ============================================================
// Newton Stream Manager — server-side Machine State Lens
// Buffers OBD2 PID data, periodically queries Archetype AI
// ============================================================

const API_KEY = () => process.env.ATAI_API_KEY ?? '';
const API_BASE = () => process.env.ATAI_API_ENDPOINT ?? 'https://api.u1.archetypeai.app/v0.5';
const MACHINE_STATE_LENS = 'lns-1d519091822706e2-bc108andqxf8b4os';
const QUERY_INTERVAL_MS = 15000;
const MIN_DATA_POINTS = 10;
const MAX_BUFFER_SIZE = 200;

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

class NewtonStreamManager {
  private dataBuffer: PIDSnapshot[] = [];
  private sessionId: string | null = null;
  private normalFileId: string | null = null;
  private attentionFileId: string | null = null;
  private queryInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: ResultListener[] = [];
  private _latestResult: StreamResult | null = null;
  private _isRunning = false;

  get isRunning() { return this._isRunning; }
  get latestResult() { return this._latestResult; }

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

    // Upload n-shot examples on first start
    if (!this.normalFileId || !this.attentionFileId) {
      await this.uploadExamples();
    }

    // Periodic query
    this.queryInterval = setInterval(() => this.query(), QUERY_INTERVAL_MS);
  }

  stop() {
    this._isRunning = false;
    if (this.queryInterval) {
      clearInterval(this.queryInterval);
      this.queryInterval = null;
    }
    // Clean up session
    if (this.sessionId) {
      this.deleteSession(this.sessionId).catch(() => {});
      this.sessionId = null;
    }
  }

  private async query() {
    if (this.dataBuffer.length < MIN_DATA_POINTS) return;

    try {
      const csv = this.buildCSV();
      const fileId = await this.uploadFile('obd2-live.csv', csv, 'text/csv');
      if (!fileId) return;

      // Create session if needed
      if (!this.sessionId) {
        await this.createSession();
      }
      if (!this.sessionId) return;

      // Set input stream
      await this.apiCall(`/lens/sessions/events/process`, {
        session_id: this.sessionId,
        event: {
          type: 'input_stream.set',
          event_data: {
            stream_type: 'csv_file_reader',
            stream_config: { file_id: fileId },
          },
        },
      });

      // Read results via SSE
      const results = await this.readSSEResults(this.sessionId);
      if (results) {
        this.emit(results);
      }

      // Clean up data file
      this.deleteFile(fileId).catch(() => {});
    } catch (err) {
      console.error('[Newton Stream] Query failed:', err);
    }
  }

  private buildCSV(): string {
    const columns = ['timestamp', 'rpm', 'speed', 'coolant_temp', 'iat', 'engine_load', 'throttle', 'map', 'fuel_level', 'stft_b1', 'ltft_b1', 'maf'];
    const pidMap: Record<string, string> = {
      '0C': 'rpm', '0D': 'speed', '05': 'coolant_temp', '0F': 'iat',
      '04': 'engine_load', '11': 'throttle', '0B': 'map', '2F': 'fuel_level',
      '06': 'stft_b1', '07': 'ltft_b1', '10': 'maf',
    };

    const rows = [columns.join(',')];
    const baseTime = this.dataBuffer[0]?.timestamp ?? 0;

    for (const snapshot of this.dataBuffer) {
      const row: Record<string, string> = { timestamp: ((snapshot.timestamp - baseTime) / 1000).toFixed(3) };
      for (const [pid, col] of Object.entries(pidMap)) {
        row[col] = snapshot.values[pid]?.toFixed(1) ?? '0';
      }
      rows.push(columns.map((c) => row[c] ?? '0').join(','));
    }

    return rows.join('\n');
  }

  private async createSession() {
    try {
      const res = await this.apiCall('/lens/sessions/create', {
        lens_id: MACHINE_STATE_LENS,
      });
      this.sessionId = res.session_id;

      // Configure n-shot classification
      await this.apiCall('/lens/sessions/events/process', {
        session_id: this.sessionId,
        event: {
          type: 'session.modify',
          event_data: {
            focus: 'Classify vehicle health from OBD2 sensor data. Normal means all readings within expected ranges. Attention means one or more sensors show concerning values (high coolant temp, erratic RPM, extreme fuel trims, overheating).',
            input_n_shot: {
              normal: this.normalFileId,
              attention: this.attentionFileId,
            },
            csv_configs: {
              header_row: 0,
              timestamp_column: 'timestamp',
              window_size: 10,
              step_size: 5,
            },
          },
        },
      });

      // Enable SSE output
      await this.apiCall('/lens/sessions/events/process', {
        session_id: this.sessionId,
        event: {
          type: 'output_stream.set',
          event_data: { stream_type: 'sse' },
        },
      });
    } catch (err) {
      console.error('[Newton Stream] Session creation failed:', err);
      this.sessionId = null;
    }
  }

  private async readSSEResults(sessionId: string): Promise<StreamResult | null> {
    const url = `${API_BASE()}/lens/sessions/consumer/${sessionId}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${API_KEY()}` },
        signal: controller.signal,
      });

      const text = await res.text();
      clearTimeout(timeout);

      // Parse SSE events
      let lastResult: StreamResult | null = null;
      for (const line of text.split('\n')) {
        if (line.startsWith('data:')) {
          try {
            const data = JSON.parse(line.substring(5).trim());
            if (data.type === 'inference.result' && data.data) {
              const d = data.data;
              lastResult = {
                label: d.label ?? 'unknown',
                confidence: Math.round((d.confidence ?? 0) * 100),
                scores: {
                  normal: Math.round((d.scores?.normal ?? 0) * 100),
                  attention: Math.round((d.scores?.attention ?? 0) * 100),
                },
                windows: d.windows ?? 0,
                timestamp: Date.now(),
              };
            }
          } catch { /* skip malformed events */ }
        }
      }
      return lastResult;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  private async uploadExamples() {
    const normalCSV = generateNormalCSV();
    const attentionCSV = generateAttentionCSV();

    this.normalFileId = await this.uploadFile('focus-normal.csv', normalCSV, 'text/csv');
    this.attentionFileId = await this.uploadFile('focus-attention.csv', attentionCSV, 'text/csv');
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
    } catch {
      return null;
    }
  }

  private async deleteFile(fileId: string) {
    await fetch(`${API_BASE()}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${API_KEY()}` },
    });
  }

  private async deleteSession(sessionId: string) {
    await fetch(`${API_BASE()}/lens/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${API_KEY()}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private async apiCall(path: string, body: any): Promise<any> {
    const res = await fetch(`${API_BASE()}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }
}

// --- N-shot Example CSV Generators ---

function generateNormalCSV(): string {
  const cols = 'timestamp,rpm,speed,coolant_temp,iat,engine_load,throttle,map,fuel_level,stft_b1,ltft_b1,maf';
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
  const cols = 'timestamp,rpm,speed,coolant_temp,iat,engine_load,throttle,map,fuel_level,stft_b1,ltft_b1,maf';
  const rows = [cols];
  for (let i = 0; i < 100; i++) {
    const t = (i * 0.5).toFixed(3);
    const rpm = (600 + Math.random() * 800 + (Math.random() > 0.8 ? 1500 : 0)).toFixed(1); // erratic
    const speed = (40 + Math.random() * 30).toFixed(1);
    const coolant = (105 + i * 0.15 + Math.random() * 3).toFixed(1); // creeping up
    const iat = (45 + Math.random() * 10).toFixed(1); // warm
    const load = (50 + Math.random() * 40).toFixed(1); // high/erratic
    const throttle = (30 + Math.random() * 30).toFixed(1);
    const map = (80 + Math.random() * 30).toFixed(1);
    const fuel = (15 - i * 0.1).toFixed(1); // low and dropping
    const stft = (15 + Math.random() * 10).toFixed(1); // running very lean
    const ltft = (12 + Math.random() * 8).toFixed(1); // high long-term trim
    const maf = (3 + Math.random() * 5).toFixed(1); // low airflow
    rows.push(`${t},${rpm},${speed},${coolant},${iat},${load},${throttle},${map},${fuel},${stft},${ltft},${maf}`);
  }
  return rows.join('\n');
}

// Singleton
export const newtonStreamManager = new NewtonStreamManager();
