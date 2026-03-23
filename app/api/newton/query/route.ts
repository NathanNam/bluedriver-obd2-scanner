import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { execSync } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const API_KEY = () => process.env.ATAI_API_KEY ?? '';
const API_BASE = () => process.env.ATAI_API_ENDPOINT ?? 'https://api.u1.archetypeai.app/v0.5';
const ACTIVITY_MONITOR_LENS = 'lns-fd669361822b07e2-bc608aa3fdf8b4f9';

const FOCUS_TEXT = `This is a real-time OBD2 vehicle diagnostics dashboard from a Bluetooth OBD2 scanner web app.
It shows time-series charts of live vehicle sensor data streamed from the car's ECU via an ELM327 BLE adapter.
Parameters include: Engine RPM, Vehicle Speed, Coolant Temperature, Intake Air Temperature, Engine Load,
Throttle Position, Manifold Absolute Pressure (MAP), Fuel Tank Level, Short/Long Term Fuel Trims, MAF Air Flow Rate.
Each chart shows a 60-second rolling window with colored data lines and current values.
Dashed yellow lines indicate caution thresholds, dashed red lines indicate critical thresholds.
Below the charts is a numerical data table showing current, min, max, and average values.
Red highlighted rows indicate values that have crossed critical thresholds.
Important context for hybrid vehicles (Toyota/Lexus hybrids like the RX450h):
- RPM = 0 with Speed = 0 is NORMAL when the gas engine is off and the car is using its electric motor or is parked.
- MAP = 100 kPa at RPM 0 is NORMAL — it reads atmospheric pressure when the gas engine is not generating intake vacuum.
- The gas engine cycles on and off during normal hybrid operation, so RPM alternating between 0 and 800-1200 is expected behavior, not a fault.
- Coolant temperature of 70-90°C with RPM 0 simply means the engine recently ran and is cooling — this is normal.
Do not flag these hybrid-normal conditions as problems.`;

async function pngToVideo(pngBase64: string): Promise<string> {
  const id = randomUUID();
  const dir = join(tmpdir(), 'newton-obd2');
  await mkdir(dir, { recursive: true });
  const pngPath = join(dir, `${id}.png`);
  const mp4Path = join(dir, `${id}.mp4`);

  await writeFile(pngPath, Buffer.from(pngBase64, 'base64'));

  execSync(
    `ffmpeg -y -loop 1 -i "${pngPath}" -c:v libx264 -t 10 -pix_fmt yuv420p ` +
    `-vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -r 2 "${mp4Path}"`,
    { stdio: 'pipe', timeout: 30000 }
  );

  return mp4Path;
}

async function uploadFile(filePath: string, name: string): Promise<string> {
  const { readFile } = await import('fs/promises');
  const buffer = await readFile(filePath);
  const blob = new Blob([buffer], { type: 'video/mp4' });
  const formData = new FormData();
  formData.append('file', blob, name);

  const res = await fetch(`${API_BASE()}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY()}` },
    body: formData,
  });
  const data = await res.json();
  if (!data.file_id) throw new Error('Failed to upload file');
  return data.file_id;
}

async function apiCall(path: string, body: any): Promise<any> {
  const res = await fetch(`${API_BASE()}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  if (!API_KEY()) {
    return NextResponse.json({ error: 'Newton AI not configured' }, { status: 503 });
  }

  const { question, chartImage } = await req.json();
  if (!question || !chartImage) {
    return NextResponse.json({ error: 'Missing question or chartImage' }, { status: 400 });
  }

  let sessionId: string | null = null;
  let fileId: string | null = null;
  let mp4Path: string | null = null;

  try {
    // 1. Convert PNG screenshot to MP4 video
    console.log('[Newton Query] Converting screenshot to video...');
    mp4Path = await pngToVideo(chartImage);

    // 2. Upload video to Archetype AI
    fileId = await uploadFile(mp4Path, 'dashboard.mp4');
    console.log(`[Newton Query] Video uploaded: ${fileId}`);

    // 3. Create Activity Monitor session
    const sessionRes = await apiCall('/lens/sessions/create', {
      lens_id: ACTIVITY_MONITOR_LENS,
    });
    sessionId = sessionRes.session_id;
    if (!sessionId) throw new Error('Failed to create session');

    // 4. Configure session with focus + instruction
    await apiCall('/lens/sessions/events/process', {
      session_id: sessionId,
      event: {
        type: 'session.modify',
        event_data: {
          focus: FOCUS_TEXT,
          instruction: question,
        },
      },
    });

    // 5. Set output stream to SSE
    await apiCall('/lens/sessions/events/process', {
      session_id: sessionId,
      event: {
        type: 'output_stream.set',
        event_data: {
          stream_type: 'server_side_events_writer',
          stream_config: {},
        },
      },
    });

    // 6. Set input stream to video
    await apiCall('/lens/sessions/events/process', {
      session_id: sessionId,
      event: {
        type: 'input_stream.set',
        event_data: {
          stream_type: 'video_file_reader',
          stream_config: { file_id: fileId },
        },
      },
    });

    // 7. Read SSE results
    console.log('[Newton Query] Waiting for analysis...');
    const sseRes = await fetch(`${API_BASE()}/lens/sessions/consumer/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${API_KEY()}`,
        Accept: 'text/event-stream',
      },
      signal: AbortSignal.timeout(120000),
    });

    const sseText = await sseRes.text();
    let response = '';

    for (const block of sseText.split('\n\n')) {
      for (const line of block.split('\n')) {
        if (!line.startsWith('data:')) continue;
        try {
          const event = JSON.parse(line.substring(5).trim());
          if (event.type === 'inference.result' && event.event_data?.response) {
            const r = event.event_data.response;
            // Response can be a string or array with string
            if (typeof r === 'string') {
              response = r;
            } else if (Array.isArray(r) && r.length > 0) {
              response = typeof r[0] === 'string' ? r[0] : JSON.stringify(r[0]);
            }
          }
        } catch { /* skip */ }
      }
    }

    if (!response) {
      response = 'Newton was unable to analyze the dashboard at this time. Please try again.';
    }

    console.log(`[Newton Query] Response received (${response.length} chars)`);
    return NextResponse.json({ response });
  } catch (err: any) {
    console.error('[Newton Query] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Query failed' }, { status: 500 });
  } finally {
    // Cleanup
    if (sessionId) {
      fetch(`${API_BASE()}/lens/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${API_KEY()}`, 'Content-Type': 'application/json' },
      }).catch(() => {});
    }
    if (fileId) {
      fetch(`${API_BASE()}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${API_KEY()}` },
      }).catch(() => {});
    }
    if (mp4Path) {
      const pngPath = mp4Path.replace('.mp4', '.png');
      unlink(mp4Path).catch(() => {});
      unlink(pngPath).catch(() => {});
    }
  }
}
