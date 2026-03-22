import html2canvas from 'html2canvas-pro';

// Chart element IDs to capture (matching the PID chart div ids in LiveScreen)
// We capture the most important charts for Newton to analyze
const CHART_IDS = [
  'chart-0C', // RPM
  'chart-0D', // Speed
  'chart-05', // Coolant Temp
  'chart-04', // Engine Load
  'chart-0F', // IAT
  'chart-11', // Throttle
  'chart-0B', // MAP
  'chart-2F', // Fuel Level
  'chart-06', // STFT
  'chart-07', // LTFT
  'chart-10', // MAF
];

const PADDING = 16;
const BG_COLOR = '#F2F2F7';

/**
 * Capture individual PID charts and compose them into a 2-column grid image.
 * Matches the approach used in corsense-hrv: capture each chart separately,
 * combine into a clean grid PNG, then the server converts to MP4 for Newton.
 */
export async function captureLiveCharts(): Promise<string | null> {
  try {
    // Find all chart elements that exist in the DOM
    const elements: HTMLElement[] = [];
    for (const id of CHART_IDS) {
      const el = document.getElementById(id);
      if (el) elements.push(el);
    }

    if (elements.length === 0) {
      // Fallback: capture entire live-charts container
      const container = document.getElementById('live-charts');
      if (!container) return null;
      const canvas = await html2canvas(container, {
        backgroundColor: BG_COLOR, scale: 1, logging: false, useCORS: true,
      });
      return canvas.toDataURL('image/png').split(',')[1];
    }

    // Capture each chart individually
    const canvases: HTMLCanvasElement[] = [];
    for (const el of elements) {
      const canvas = await html2canvas(el, {
        backgroundColor: '#FFFFFF',
        scale: 1,
        logging: false,
        useCORS: true,
      });
      canvases.push(canvas);
    }

    if (canvases.length === 0) return null;

    // Find max dimensions for uniform grid cells
    let maxW = 0;
    let maxH = 0;
    for (const c of canvases) {
      maxW = Math.max(maxW, c.width);
      maxH = Math.max(maxH, c.height);
    }

    // Compose into 2-column grid
    const cols = 2;
    const rows = Math.ceil(canvases.length / cols);
    const gridW = cols * maxW + (cols + 1) * PADDING;
    const gridH = rows * maxH + (rows + 1) * PADDING;

    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = gridW;
    gridCanvas.height = gridH;
    const ctx = gridCanvas.getContext('2d');
    if (!ctx) return null;

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, gridW, gridH);

    // Draw each chart into grid position
    for (let i = 0; i < canvases.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = PADDING + col * (maxW + PADDING);
      const y = PADDING + row * (maxH + PADDING);
      ctx.drawImage(canvases[i], x, y);
    }

    return gridCanvas.toDataURL('image/png').split(',')[1];
  } catch (err) {
    console.error('[Capture] Failed:', err);
    return null;
  }
}
