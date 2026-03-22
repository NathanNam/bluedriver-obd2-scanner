import { NextResponse } from 'next/server';
import { newtonStreamManager } from '@/lib/newton-stream';

export async function POST() {
  newtonStreamManager.stop();
  return NextResponse.json({ ok: true });
}
