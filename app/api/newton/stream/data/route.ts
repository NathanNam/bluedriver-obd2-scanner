import { NextRequest, NextResponse } from 'next/server';
import { newtonStreamManager } from '@/lib/newton-stream';

export async function POST(req: NextRequest) {
  const { timestamp, values } = await req.json();
  if (!timestamp || !values) return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  newtonStreamManager.addData({ timestamp, values });
  return NextResponse.json({ ok: true });
}
