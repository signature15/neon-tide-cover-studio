export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350;

export const PANEL_LAYOUT = [
  { id: 0, name: 'Hero', x: 48, y: 48, w: 642, h: 622 },
  { id: 1, name: 'North', x: 708, y: 48, w: 324, h: 300 },
  { id: 2, name: 'East', x: 708, y: 366, w: 324, h: 304 },
  { id: 3, name: 'South west', x: 48, y: 688, w: 312, h: 382 },
  { id: 4, name: 'South', x: 378, y: 688, w: 312, h: 382 },
  { id: 5, name: 'South east', x: 708, y: 688, w: 324, h: 382 },
];

export const GRADES = {
  tide: {
    label: 'Tide blue',
    filter: 'saturate(1.18) contrast(1.08) brightness(0.94)',
    tint: '#36cdd4',
    tintAlpha: 0.16,
    wash: '#dd4b9c',
    washAlpha: 0.12,
    type: '#f3eee5',
    accent: '#55e9e3',
  },
  night: {
    label: 'Night flash',
    filter: 'saturate(0.62) contrast(1.16) brightness(0.88)',
    tint: '#90a8c1',
    tintAlpha: 0.14,
    wash: '#42536e',
    washAlpha: 0.1,
    type: '#f2f4f0',
    accent: '#a9c8d9',
  },
  salt: {
    label: 'Salt print',
    filter: 'grayscale(0.86) contrast(1.12) brightness(1.03)',
    tint: '#e6dfcd',
    tintAlpha: 0.16,
    wash: '#9d917a',
    washAlpha: 0.08,
    type: '#fff6dd',
    accent: '#e7c999',
  },
  heat: {
    label: 'Heatwave',
    filter: 'saturate(1.3) contrast(1.03) brightness(1.02)',
    tint: '#f15d9a',
    tintAlpha: 0.14,
    wash: '#f2a548',
    washAlpha: 0.14,
    type: '#fff1e8',
    accent: '#ff9c78',
  },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function fillPlaceholder(ctx, panel, scale = 1) {
  const x = panel.x * scale;
  const y = panel.y * scale;
  const w = panel.w * scale;
  const h = panel.h * scale;
  ctx.fillStyle = '#1a2025';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(85, 233, 227, 0.4)';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.17, y + h * 0.78);
  ctx.lineTo(x + w * 0.44, y + h * 0.48);
  ctx.lineTo(x + w * 0.58, y + h * 0.63);
  ctx.lineTo(x + w * 0.78, y + h * 0.31);
  ctx.stroke();
}

function imageCrop(image, panel, crop, targetScale) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const panelRatio = panel.w / panel.h;
  const sourceRatio = sourceWidth / sourceHeight;
  let cropWidth;
  let cropHeight;

  if (sourceRatio > panelRatio) {
    cropHeight = sourceHeight;
    cropWidth = sourceHeight * panelRatio;
  } else {
    cropWidth = sourceWidth;
    cropHeight = sourceWidth / panelRatio;
  }

  const zoom = clamp(crop?.zoom ?? 1, 1, 2.8);
  cropWidth /= zoom;
  cropHeight /= zoom;
  const freeX = sourceWidth - cropWidth;
  const freeY = sourceHeight - cropHeight;
  const sourceX = clamp((freeX / 2) + (crop?.panX ?? 0) * freeX, 0, freeX);
  const sourceY = clamp((freeY / 2) + (crop?.panY ?? 0) * freeY, 0, freeY);

  return {
    sourceX,
    sourceY,
    sourceWidth: cropWidth,
    sourceHeight: cropHeight,
    targetX: panel.x * targetScale,
    targetY: panel.y * targetScale,
    targetWidth: panel.w * targetScale,
    targetHeight: panel.h * targetScale,
  };
}

function drawPhoto(ctx, image, panel, crop, grade, scale = 1) {
  if (!image) {
    fillPlaceholder(ctx, panel, scale);
    return;
  }

  const area = imageCrop(image, panel, crop, scale);
  ctx.save();
  ctx.filter = grade.filter;
  ctx.drawImage(
    image,
    area.sourceX,
    area.sourceY,
    area.sourceWidth,
    area.sourceHeight,
    area.targetX,
    area.targetY,
    area.targetWidth,
    area.targetHeight,
  );
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = grade.tintAlpha;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(area.targetX, area.targetY, area.targetWidth, area.targetHeight);
  ctx.globalAlpha = grade.washAlpha;
  ctx.fillStyle = grade.wash;
  ctx.fillRect(area.targetX, area.targetY, area.targetWidth, area.targetHeight);
  ctx.restore();
}

function drawPanelNumber(ctx, panel, index, scale = 1) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  ctx.fillRect(panel.x * scale, panel.y * scale, 43 * scale, 32 * scale);
  ctx.fillStyle = '#f3eee5';
  ctx.font = `700 ${14 * scale}px "Courier New", monospace`;
  ctx.textBaseline = 'middle';
  ctx.fillText(String(index + 1).padStart(2, '0'), (panel.x + 12) * scale, (panel.y + 16) * scale);
  ctx.restore();
}

function fitCaption(ctx, text, maxWidth, startingSize, scale) {
  let size = startingSize;
  while (size > 42 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size * scale}px "Arial Narrow", "Trebuchet MS", sans-serif`;
  }
  return size;
}

function drawBillboard(ctx, caption, grade, scale = 1) {
  const x = 48 * scale;
  const y = 1094 * scale;
  const width = 984 * scale;
  const height = 208 * scale;
  const cleanCaption = String(caption ?? '').trim() || 'Midnight on Ocean Drive';
  const title = cleanCaption.slice(0, 42).toUpperCase();

  ctx.save();
  ctx.fillStyle = 'rgba(4, 5, 7, 0.92)';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(66 * scale, 1120 * scale, 104 * scale, 7 * scale);
  ctx.fillStyle = 'rgba(243, 238, 229, 0.76)';
  ctx.font = `700 ${15 * scale}px "Courier New", monospace`;
  ctx.letterSpacing = `${1.8 * scale}px`;
  ctx.fillText('NEON TIDE / COVER LAB', 66 * scale, 1160 * scale);

  ctx.fillStyle = grade.type;
  ctx.font = `900 ${112 * scale}px "Arial Narrow", "Trebuchet MS", sans-serif`;
  const finalSize = fitCaption(ctx, title, 912 * scale, 112, scale);
  ctx.font = `900 ${finalSize * scale}px "Arial Narrow", "Trebuchet MS", sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.46)';
  ctx.shadowBlur = 12 * scale;
  ctx.shadowOffsetY = 4 * scale;
  ctx.fillText(title, 66 * scale, 1260 * scale);
  ctx.restore();
}

function paint(target, image, state, includeType = true) {
  const ctx = target.getContext('2d');
  const scale = target.width / CANVAS_WIDTH;
  const grade = GRADES[state.grade] ?? GRADES.tide;

  ctx.clearRect(0, 0, target.width, target.height);
  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, target.width, target.height);

  PANEL_LAYOUT.forEach((panel, index) => {
    drawPhoto(ctx, image, panel, state.panels[index], grade, scale);
    if (includeType) drawPanelNumber(ctx, panel, index, scale);
  });

  if (includeType) drawBillboard(ctx, state.caption, grade, scale);
  return target;
}

export function createCoverRenderer(canvas) {
  let image = null;

  return {
    setImage(nextImage) {
      image = nextImage;
    },
    render(state) {
      return paint(canvas, image, state);
    },
    renderSlotPreview(preview, slotId, state) {
      if (!PANEL_LAYOUT[slotId]) return;
      const ctx = preview.getContext('2d');
      const grade = GRADES[state.grade] ?? GRADES.tide;
      ctx.clearRect(0, 0, preview.width, preview.height);
      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 0, preview.width, preview.height);
      const previewPanel = { x: 0, y: 0, w: preview.width, h: preview.height };
      drawPhoto(ctx, image, previewPanel, state.panels[slotId], grade, 1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, preview.width, preview.height);
    },
    exportPng(state, width) {
      const output = document.createElement('canvas');
      output.width = width;
      output.height = Math.round(width * CANVAS_HEIGHT / CANVAS_WIDTH);
      paint(output, image, state);
      return new Promise((resolve, reject) => {
        output.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('The browser could not create a PNG.'));
        }, 'image/png');
      });
    },
  };
}
