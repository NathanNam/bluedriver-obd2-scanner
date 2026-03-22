import { NextRequest, NextResponse } from 'next/server';

const API_KEY = () => process.env.ATAI_API_KEY ?? '';
const API_BASE = () => process.env.ATAI_API_ENDPOINT ?? 'https://api.u1.archetypeai.app/v0.5';
const ACTIVITY_MONITOR_LENS = 'lns-fd669361822b07e2-bc608aa3fdf8b4f9';

const FOCUS_TEXT = `This is a real-time OBD2 vehicle diagnostics dashboard from a Bluetooth OBD2 scanner web app.
It shows time-series charts of live vehicle sensor data streamed from the car's ECU via an ELM327 adapter.
Parameters include: Engine RPM, Vehicle Speed, Coolant Temperature, Intake Air Temperature, Engine Load,
Throttle Position, Manifold Absolute Pressure (MAP), Fuel Tank Level, Short/Long Term Fuel Trims, MAF Air Flow Rate.
Each chart shows a 60-second rolling window with colored data lines. Dashed lines indicate caution (yellow) and
critical (red) thresholds. Below the charts is a numerical data table showing current, min, max, and average
values for all parameters during the session. Red highlighted rows indicate values that have crossed critical thresholds.`;

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

  try {
    // Upload the screenshot as an image file
    const imageBuffer = Buffer.from(chartImage, 'base64');
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', blob, 'dashboard.png');

    const uploadRes = await fetch(`${API_BASE()}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY()}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    fileId = uploadData.file_id;
    if (!fileId) throw new Error('Failed to upload screenshot');

    // Create Activity Monitor session
    const sessionRes = await fetch(`${API_BASE()}/lens/sessions/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lens_id: ACTIVITY_MONITOR_LENS }),
    });
    const sessionData = await sessionRes.json();
    sessionId = sessionData.session_id;
    if (!sessionId) throw new Error('Failed to create lens session');

    // Configure session with focus and instruction
    await fetch(`${API_BASE()}/lens/sessions/events/process`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        event: {
          type: 'session.modify',
          event_data: {
            focus: FOCUS_TEXT,
            instruction: question,
          },
        },
      }),
    });

    // Enable SSE output
    await fetch(`${API_BASE()}/lens/sessions/events/process`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        event: {
          type: 'output_stream.set',
          event_data: { stream_type: 'sse' },
        },
      }),
    });

    // Set input stream (image file)
    await fetch(`${API_BASE()}/lens/sessions/events/process`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        event: {
          type: 'input_stream.set',
          event_data: {
            stream_type: 'image_file_reader',
            stream_config: { file_id: fileId },
          },
        },
      }),
    });

    // Read SSE results
    const sseRes = await fetch(`${API_BASE()}/lens/sessions/consumer/${sessionId}`, {
      headers: { Authorization: `Bearer ${API_KEY()}` },
      signal: AbortSignal.timeout(120000),
    });

    const sseText = await sseRes.text();
    let response = '';

    for (const line of sseText.split('\n')) {
      if (line.startsWith('data:')) {
        try {
          const data = JSON.parse(line.substring(5).trim());
          if (data.type === 'inference.result' && data.data?.response) {
            response = data.data.response;
          }
        } catch { /* skip */ }
      }
    }

    if (!response) {
      response = 'Newton was unable to analyze the dashboard at this time. Please try again.';
    }

    return NextResponse.json({ response });
  } catch (err: any) {
    console.error('[Newton Query]', err);
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
  }
}
