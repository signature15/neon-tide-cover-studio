import { CANVAS_HEIGHT, CANVAS_WIDTH, GRADES, PANEL_LAYOUT, createCoverRenderer } from './cover.js';

const DEFAULT_PHOTO = 'samples/pier.jpg';
const canvas = document.querySelector('#coverCanvas');
const renderer = createCoverRenderer(canvas);
const photoInput = document.querySelector('#photoInput');
const photoName = document.querySelector('#photoName');
const captionInput = document.querySelector('#captionInput');
const selectedFrameLabel = document.querySelector('#selectedFrameLabel');
const canvasHint = document.querySelector('#canvasHint');
const exportSize = document.querySelector('#exportSize');
const exportButton = document.querySelector('#exportButton');
const exportStatus = document.querySelector('#exportStatus');
const panelButtons = [...document.querySelectorAll('[data-panel]')];
const gradeButtons = [...document.querySelectorAll('[data-grade]')];
const previewCanvases = panelButtons.map((button) => button.querySelector('canvas'));

const state = {
  caption: captionInput.value,
  grade: 'tide',
  selectedPanel: 0,
  panels: PANEL_LAYOUT.map((_, index) => ({
    zoom: index === 0 ? 1.05 : 1,
    panX: [0.02, -0.16, 0.18, -0.12, 0.08, 0.22][index] ?? 0,
    panY: [0, -0.08, 0.1, 0.16, -0.06, 0.08][index] ?? 0,
  })),
};

let activeImage = null;
let objectUrl = null;
let drag = null;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function updatePreview() {
  renderer.render(state);
  previewCanvases.forEach((preview, index) => renderer.renderSlotPreview(preview, index, state));

  const panel = PANEL_LAYOUT[state.selectedPanel];
  selectedFrameLabel.textContent = `Frame ${String(panel.id + 1).padStart(2, '0')} / ${panel.name}`;
  canvasHint.textContent = `Zoom ${state.panels[state.selectedPanel].zoom.toFixed(1)}×. Drag or scroll to adjust.`;

  panelButtons.forEach((button, index) => {
    const selected = index === state.selectedPanel;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  gradeButtons.forEach((button) => {
    const selected = button.dataset.grade === state.grade;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function loadImage(source, label) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      activeImage = image;
      renderer.setImage(image);
      photoName.textContent = label;
      updatePreview();
      resolve(image);
    };
    image.onerror = () => reject(new Error('The selected photo could not be opened.'));
    image.src = source;
  });
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
    y: (event.clientY - rect.top) * (CANVAS_HEIGHT / rect.height),
  };
}

function panelAt(point) {
  return PANEL_LAYOUT.find((panel) => (
    point.x >= panel.x && point.x <= panel.x + panel.w &&
    point.y >= panel.y && point.y <= panel.y + panel.h
  ));
}

function selectPanel(index) {
  if (!PANEL_LAYOUT[index]) return;
  state.selectedPanel = index;
  updatePreview();
}

photoInput.addEventListener('change', async () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  try {
    await loadImage(objectUrl, `${file.name} / local photo`);
  } catch (error) {
    photoName.textContent = error.message;
  }
});

panelButtons.forEach((button) => {
  button.addEventListener('click', () => selectPanel(Number(button.dataset.panel)));
});

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  updatePreview();
});

gradeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (!GRADES[button.dataset.grade]) return;
    state.grade = button.dataset.grade;
    updatePreview();
  });
});

canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const panel = panelAt(point);
  if (!panel) return;
  selectPanel(panel.id);
  const crop = state.panels[panel.id];
  drag = { panelId: panel.id, startX: point.x, startY: point.y, panX: crop.panX, panY: crop.panY };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('is-dragging');
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const panel = PANEL_LAYOUT[drag.panelId];
  const point = canvasPoint(event);
  const crop = state.panels[drag.panelId];
  crop.panX = clamp(drag.panX + (point.x - drag.startX) / panel.w, -1, 1);
  crop.panY = clamp(drag.panY + (point.y - drag.startY) / panel.h, -1, 1);
  updatePreview();
});

function stopDrag(event) {
  if (!drag) return;
  if (event.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  drag = null;
  canvas.classList.remove('is-dragging');
}

canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const crop = state.panels[state.selectedPanel];
  crop.zoom = clamp(crop.zoom - event.deltaY * 0.0015, 1, 2.8);
  updatePreview();
}, { passive: false });

exportButton.addEventListener('click', async () => {
  if (!activeImage) {
    exportStatus.textContent = 'Load a photo before exporting.';
    return;
  }
  const width = Number(exportSize.value);
  exportButton.disabled = true;
  exportStatus.textContent = `Rendering ${width}px PNG…`;
  try {
    const blob = await renderer.exportPng(state, width);
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `neon-tide-${width}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    exportStatus.textContent = `Saved neon-tide-${width}.png`;
  } catch (error) {
    exportStatus.textContent = error.message;
  } finally {
    exportButton.disabled = false;
  }
});

loadImage(DEFAULT_PHOTO, 'Sample pier photo loaded').catch(() => {
  photoName.textContent = 'Load a local photo to begin';
  updatePreview();
});

window.addEventListener('beforeunload', () => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
});
