import { newtonStreamManager } from '@/lib/newton-stream';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send latest result immediately if available
      const latest = newtonStreamManager.latestResult;
      if (latest) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(latest)}\n\n`));
      }

      // Listen for new results
      const unsubscribe = newtonStreamManager.addListener((result) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
        } catch {
          unsubscribe();
        }
      });

      // Keep-alive ping every 15 seconds
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(ping);
          unsubscribe();
        }
      }, 15000);

      // Cleanup on close
      const checkClosed = setInterval(() => {
        if (!newtonStreamManager.isRunning) {
          clearInterval(checkClosed);
          clearInterval(ping);
          unsubscribe();
          try { controller.close(); } catch {}
        }
      }, 5000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
