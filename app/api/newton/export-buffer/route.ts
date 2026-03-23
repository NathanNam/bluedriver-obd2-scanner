import { NextResponse } from 'next/server';
import { newtonStreamManager } from '@/lib/newton-stream';

export async function GET() {
  const csv = newtonStreamManager.exportBufferAsCSV();
  if (!csv) {
    return NextResponse.json({ error: 'No data in buffer' }, { status: 404 });
  }
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="obd2-live-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv"`,
    },
  });
}
