import { NextResponse } from 'next/server';
import { newtonStreamManager } from '@/lib/newton-stream';

export async function POST() {
  await newtonStreamManager.start();
  return NextResponse.json({ ok: true });
}
