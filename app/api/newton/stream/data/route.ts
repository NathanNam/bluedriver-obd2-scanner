import { NextRequest, NextResponse } from 'next/server';
import { newtonStreamManager } from '@/lib/newton-stream';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { timestamp, values } = body;

  if (!timestamp || !values) {
    return NextResponse.json({ error: 'Missing timestamp or values' }, { status: 400 });
  }

  newtonStreamManager.addData({ timestamp, values });
  return NextResponse.json({ ok: true, buffered: newtonStreamManager.bufferSize });
}
