import { NextRequest, NextResponse } from 'next/server';
import { newtonStreamManager } from '@/lib/newton-stream';

export async function POST(req: NextRequest) {
  const { context } = await req.json();
  newtonStreamManager.setVehicleContext(context || '');
  return NextResponse.json({ ok: true });
}
