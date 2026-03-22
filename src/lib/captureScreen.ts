import html2canvas from 'html2canvas-pro';

export async function captureLiveCharts(): Promise<string | null> {
  const el = document.getElementById('live-charts');
  if (!el) return null;

  try {
    const canvas = await html2canvas(el, {
      backgroundColor: '#F2F2F7',
      scale: 1,
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL('image/png').split(',')[1];
  } catch (err) {
    console.error('[Capture] Failed:', err);
    return null;
  }
}
