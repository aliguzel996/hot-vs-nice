import { pantonePalette } from "./lib/pantone-data.js";
import {
  findNearestColor,
  sortByLuminance,
  transformHex,
  hexToHsl,
  hslToHex,
  normalizeHex,
  snapHexToPrintableCmyk,
} from "./lib/color-utils.js";
import { validateAppMetadata } from "./lib/app-metadata.js";
import { analyzeSvgColors, applyColorMap } from "./lib/svg-analyzer.js";

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function createSamplePalette() {
  const paper = hslToHex(randomInt(24, 56), randomInt(22, 44), randomInt(91, 96));
  const ink = hslToHex(randomInt(0, 359), randomInt(4, 14), randomInt(8, 14));
  const accentBase = randomInt(0, 359);

  return {
    paper,
    ink,
    accents: Array.from({ length: randomInt(6, 9) }, (_, index) =>
      hslToHex(
        accentBase + index * randomInt(28, 72) + randomInt(-18, 18),
        randomInt(46, 86),
        randomInt(36, 68),
      ),
    ),
  };
}

function createBlobPath(startX, startY, width, height, bend) {
  const endX = startX + width;
  const endY = startY + height;
  const curveA = startX + width * bend;
  const curveB = startX + width * (1 - bend);
  return [
    `M${startX} ${startY}`,
    `C${curveA} ${startY - height * 0.55} ${curveB} ${startY - height * 0.2} ${endX} ${startY - height * 0.45}`,
    `C${endX - width * 0.16} ${startY + height * 0.2} ${startX + width * 0.76} ${endY} ${startX + width * 0.42} ${endY}`,
    `C${startX + width * 0.1} ${endY} ${startX - width * 0.06} ${startY + height * 0.36} ${startX} ${startY}`,
    "Z",
  ].join(" ");
}

function createArchPath(cx, cy, radius, innerRadius, startAngle, endAngle) {
  const startX = cx + Math.cos(startAngle) * radius;
  const startY = cy + Math.sin(startAngle) * radius;
  const endX = cx + Math.cos(endAngle) * radius;
  const endY = cy + Math.sin(endAngle) * radius;
  const innerEndX = cx + Math.cos(endAngle) * innerRadius;
  const innerEndY = cy + Math.sin(endAngle) * innerRadius;
  const innerStartX = cx + Math.cos(startAngle) * innerRadius;
  const innerStartY = cy + Math.sin(startAngle) * innerRadius;
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M${startX} ${startY}`,
    `A${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
    `L${innerEndX} ${innerEndY}`,
    `A${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}`,
    "Z",
  ].join(" ");
}

function createTrianglePath(x, y, width, height) {
  const x2 = x + width;
  const x3 = x + width * randomFloat(0.18, 0.82);
  const y2 = y + height * randomFloat(0.04, 0.22);
  const y3 = y + height;
  return `M${x} ${y} L${x2} ${y2} L${x3} ${y3} Z`;
}

function createRibbonPath(x, y, width, height) {
  const bumpA = x + width * randomFloat(0.2, 0.35);
  const bumpB = x + width * randomFloat(0.55, 0.82);
  return [
    `M${x} ${y}`,
    `C${x + width * 0.16} ${y - height * 0.32} ${bumpA} ${y - height * 0.2} ${x + width * 0.4} ${y + height * 0.08}`,
    `C${x + width * 0.56} ${y + height * 0.34} ${bumpB} ${y + height * 0.34} ${x + width} ${y + height * 0.02}`,
    `L${x + width * 0.86} ${y + height}`,
    `C${x + width * 0.62} ${y + height * 0.84} ${x + width * 0.34} ${y + height * 0.9} ${x + width * 0.08} ${y + height}`,
    "Z",
  ].join(" ");
}

function createRandomShape(width, height, palette) {
  const color = pickRandom(palette.accents);
  const ink = palette.ink;
  const kind = pickRandom([
    "blob",
    "blob",
    "circle",
    "arch",
    "triangle",
    "ribbon",
    "stroke-rect",
    "stroke-line",
    "soft-rect",
  ]);

  switch (kind) {
    case "circle": {
      const radius = randomInt(24, 148);
      const cx = randomInt(radius + 18, width - radius - 18);
      const cy = randomInt(radius + 18, height - radius - 18);
      return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" opacity="${randomFloat(0.72, 0.96).toFixed(2)}"/>`;
    }
    case "arch": {
      const radius = randomInt(58, 172);
      const inner = Math.max(16, radius - randomInt(20, 62));
      const cx = randomInt(radius + 20, width - radius - 20);
      const cy = randomInt(radius + 20, height - radius - 20);
      const start = randomFloat(Math.PI * 0.1, Math.PI * 1.4);
      const end = start + randomFloat(Math.PI * 0.65, Math.PI * 1.35);
      return `<path d="${createArchPath(cx, cy, radius, inner, start, end)}" fill="${pickRandom([color, ink])}" opacity="${randomFloat(0.8, 1).toFixed(2)}"/>`;
    }
    case "triangle": {
      const shapeWidth = randomInt(90, 280);
      const shapeHeight = randomInt(80, 250);
      const x = randomInt(18, width - shapeWidth - 18);
      const y = randomInt(18, height - shapeHeight - 18);
      return `<path d="${createTrianglePath(x, y, shapeWidth, shapeHeight)}" fill="${color}" opacity="${randomFloat(0.74, 0.94).toFixed(2)}"/>`;
    }
    case "ribbon": {
      const shapeWidth = randomInt(180, 420);
      const shapeHeight = randomInt(80, 180);
      const x = randomInt(18, width - shapeWidth - 18);
      const y = randomInt(18, height - shapeHeight - 18);
      return `<path d="${createRibbonPath(x, y, shapeWidth, shapeHeight)}" fill="${color}" opacity="${randomFloat(0.78, 0.96).toFixed(2)}"/>`;
    }
    case "stroke-rect": {
      const rectWidth = randomInt(80, 220);
      const rectHeight = randomInt(60, 170);
      const x = randomInt(18, width - rectWidth - 18);
      const y = randomInt(18, height - rectHeight - 18);
      return `<rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" fill="none" stroke="${ink}" stroke-width="${randomInt(8, 18)}"/>`;
    }
    case "stroke-line": {
      const x1 = randomInt(36, width - 180);
      const y1 = randomInt(36, height - 36);
      const x2 = clamp(x1 + randomInt(120, 420), 24, width - 24);
      const y2 = clamp(y1 + randomInt(-120, 120), 24, height - 24);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-width="${randomInt(6, 16)}" stroke-linecap="square"/>`;
    }
    case "soft-rect": {
      const rectWidth = randomInt(54, 160);
      const rectHeight = randomInt(54, 160);
      const x = randomInt(18, width - rectWidth - 18);
      const y = randomInt(18, height - rectHeight - 18);
      const rx = randomInt(10, 42);
      return `<rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" rx="${rx}" fill="${color}" opacity="${randomFloat(0.52, 0.84).toFixed(2)}"/>`;
    }
    default: {
      const blobWidth = randomInt(120, 360);
      const blobHeight = randomInt(90, 280);
      const x = randomInt(18, width - blobWidth - 18);
      const y = randomInt(18, height - blobHeight - 18);
      return `<path d="${createBlobPath(x, y, blobWidth, blobHeight, randomFloat(0.2, 0.48))}" fill="${color}" opacity="${randomFloat(0.78, 0.98).toFixed(2)}"/>`;
    }
  }
}

function createSampleSvg() {
  const width = 780;
  const height = 1080;
  const palette = createSamplePalette();
  const shapeCount = randomInt(7, 12);
  const shapes = Array.from({ length: shapeCount }, () =>
    createRandomShape(width, height, palette),
  ).join("\n  ");
  const overlayCount = randomInt(1, 3);
  const overlays = Array.from({ length: overlayCount }, () =>
    `<circle cx="${randomInt(40, width - 40)}" cy="${randomInt(40, height - 40)}" r="${randomInt(18, 56)}" fill="${pickRandom([palette.ink, ...palette.accents])}" opacity="${randomFloat(0.2, 0.45).toFixed(2)}"/>`,
  ).join("\n  ");

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 780 1080" role="img" aria-labelledby="title desc">
  <title id="title">Random sample poster</title>
  <desc id="desc">Randomized abstract poster for palette testing.</desc>
  <rect width="${width}" height="${height}" fill="${palette.paper}"/>
  ${shapes}
  ${overlays}
</svg>
  `.trim();
}

const state = {
  fileName: "sample-poster.svg",
  baseElementSerial: 0,
  baseSvg: "",
  originalSvg: "",
  activeSvg: "",
  activeMode: "Original",
  colorModel: "RGB",
  paletteRows: [],
  history: [],
  historySerial: 0,
  selectedHistoryId: null,
  pinnedSvg: "",
  pinnedMode: "",
  leftShowsOriginal: true,
  variantUrls: [],
  hoveredHexes: [],
  previewIndexes: {
    original: new Map(),
    active: new Map(),
  },
  textOverlays: [],
  activeTextOverlayId: null,
  textOverlaySerial: 0,
  selectedElementId: null,
  selectedElementKind: null,
  dragState: null,
};

const elements = {
  fileInput: document.querySelector("#fileInput"),
  importButton: document.querySelector("#importButton"),
  loadSampleButton: document.querySelector("#loadSampleButton"),
  snapPantoneButton: document.querySelector("#snapPantoneButton"),
  toggleColorModelButton: document.querySelector("#toggleColorModelButton"),
  resetButton: document.querySelector("#resetButton"),
  copyPaletteButton: document.querySelector("#copyPaletteButton"),
  exportButton: document.querySelector("#exportButton"),
  addTextButton: document.querySelector("#addTextButton"),
  removeTextButton: document.querySelector("#removeTextButton"),
  textContentInput: document.querySelector("#textContentInput"),
  textFontSelect: document.querySelector("#textFontSelect"),
  textColorInput: document.querySelector("#textColorInput"),
  textSizeInput: document.querySelector("#textSizeInput"),
  textXInput: document.querySelector("#textXInput"),
  textYInput: document.querySelector("#textYInput"),
  textOverlayList: document.querySelector("#textOverlayList"),
  pinPreviewButton: document.querySelector("#pinPreviewButton"),
  toggleOriginalButton: document.querySelector("#toggleOriginalButton"),
  statusText: document.querySelector("#statusText"),
  fileNameValue: document.querySelector("#fileNameValue"),
  colorCountValue: document.querySelector("#colorCountValue"),
  deltaValue: document.querySelector("#deltaValue"),
  modeValue: document.querySelector("#modeValue"),
  colorModelValue: document.querySelector("#colorModelValue"),
  openHistoryModalButton: document.querySelector("#openHistoryModalButton"),
  historyCountTag: document.querySelector("#historyCountTag"),
  historyStrip: document.querySelector("#historyStrip"),
  historyModal: document.querySelector("#historyModal"),
  historyModalBackdrop: document.querySelector("#historyModalBackdrop"),
  historyModalGrid: document.querySelector("#historyModalGrid"),
  historyModalCountTag: document.querySelector("#historyModalCountTag"),
  downloadAllHistoryButton: document.querySelector("#downloadAllHistoryButton"),
  closeHistoryModalButton: document.querySelector("#closeHistoryModalButton"),
  leftPreviewTitle: document.querySelector("#leftPreviewTitle"),
  leftPreviewTag: document.querySelector("#leftPreviewTag"),
  originalPreview: document.querySelector("#originalPreview"),
  activePreview: document.querySelector("#activePreview"),
  activePreviewTag: document.querySelector("#activePreviewTag"),
  paletteTableBody: document.querySelector("#paletteTableBody"),
  variantGrid: document.querySelector("#variantGrid"),
  variantCardTemplate: document.querySelector("#variantCardTemplate"),
};

const desktopBridge = window.desktopBridge || null;

function revokeUrl(value) {
  if (value) {
    URL.revokeObjectURL(value);
  }
}

function svgToObjectUrl(svgMarkup) {
  return URL.createObjectURL(
    new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }),
  );
}

function setImagePreview(container, url, emptyText) {
  container.innerHTML = "";
  if (!url) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  const image = document.createElement("img");
  image.src = url;
  image.alt = emptyText;
  container.append(image);
}

function setHoveredHexes(hexes) {
  state.hoveredHexes = [...new Set(hexes.filter(Boolean))];
  syncHighlights();
}

function clearHoveredHexes() {
  if (!state.hoveredHexes.length) {
    return;
  }

  state.hoveredHexes = [];
  syncHighlights();
}

function clearSelectedElement() {
  state.selectedElementId = null;
  state.selectedElementKind = null;
}

function setSelectedElement(elementId, kind) {
  state.selectedElementId = elementId;
  state.selectedElementKind = kind;
  syncHighlights();
}

function stopDrag() {
  state.dragState = null;
}

function createDefaultTextOverlay() {
  state.textOverlaySerial += 1;
  return {
    id: `text-overlay-${state.textOverlaySerial}`,
    content: "",
    x: 110,
    y: 180,
    size: 56,
    color: "#111111",
    fontFamily: "monospace",
  };
}

function getActiveTextOverlay() {
  return state.textOverlays.find((overlay) => overlay.id === state.activeTextOverlayId) || null;
}

function getTextOverlayById(overlayId) {
  return state.textOverlays.find((overlay) => overlay.id === overlayId) || null;
}

function getOverlayLabel(overlay) {
  const firstLine = (overlay.content || "").split("\n")[0].trim();
  return firstLine || "Empty Text";
}

function renderTextOverlayList() {
  elements.textOverlayList.innerHTML = "";

  for (const overlay of state.textOverlays) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `text-overlay-item${overlay.id === state.activeTextOverlayId ? " is-active" : ""}`;
    button.innerHTML = `
      <span class="text-overlay-item-title">${escapeXml(getOverlayLabel(overlay))}</span>
      <span class="text-overlay-item-meta">${escapeXml(overlay.fontFamily)} / ${overlay.size}px</span>
    `;
    button.addEventListener("click", () => {
      state.activeTextOverlayId = overlay.id;
      syncTextOverlayInputs();
      renderTextOverlayList();
      setSelectedElement(overlay.id, "text-overlay");
    });
    elements.textOverlayList.append(button);
  }
}

function toSvgPoint(svgElement, clientX, clientY) {
  const matrix = svgElement.getScreenCTM();
  if (!matrix) {
    return null;
  }

  const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  return { x: point.x, y: point.y };
}

function startTextDrag(event, svgElement) {
  const point = toSvgPoint(svgElement, event.clientX, event.clientY);
  const overlay = getActiveTextOverlay();
  if (!point || !overlay) {
    return;
  }

  state.dragState = {
    previewKey: svgElement.closest("#originalPreview") ? "original" : "active",
    overlayId: overlay.id,
    offsetX: point.x - overlay.x,
    offsetY: point.y - overlay.y,
  };
}

function handleTextDrag(event) {
  if (!state.dragState) {
    return;
  }

  const overlay = getTextOverlayById(state.dragState.overlayId);
  if (!overlay) {
    stopDrag();
    return;
  }

  const previewContainer =
    state.dragState.previewKey === "original"
      ? elements.originalPreview
      : elements.activePreview;
  const svgElement = previewContainer.querySelector("svg");
  if (!svgElement) {
    return;
  }

  const point = toSvgPoint(svgElement, event.clientX, event.clientY);
  if (!point) {
    return;
  }

  overlay.x = clamp(Math.round(point.x - state.dragState.offsetX), 0, 780);
  overlay.y = clamp(Math.round(point.y - state.dragState.offsetY), 0, 1080);
  syncTextOverlayInputs();
  applySourceState({ preserveDrag: true });
  elements.statusText.textContent = "Text overlay was moved.";
}

function prepareBaseSvg(svgMarkup) {
  const documentFragment = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const svgElement = documentFragment.documentElement;
  const selectableSelector =
    "path, rect, circle, ellipse, line, polygon, polyline, text";

  svgElement.querySelectorAll(selectableSelector).forEach((element) => {
    if (!element.hasAttribute("data-base-id")) {
      state.baseElementSerial += 1;
      element.setAttribute("data-base-id", `base-${state.baseElementSerial}`);
    }
  });

  return svgElement.outerHTML;
}

function removeSelectedBaseElement() {
  if (!state.selectedElementId || state.selectedElementKind !== "base") {
    return false;
  }

  const documentFragment = new DOMParser().parseFromString(state.baseSvg, "image/svg+xml");
  const target = documentFragment.querySelector(
    `[data-base-id="${state.selectedElementId}"]`,
  );
  if (!target) {
    return false;
  }

  target.remove();
  state.baseSvg = documentFragment.documentElement.outerHTML;
  clearSelectedElement();
  applySourceState();
  elements.statusText.textContent = "The selected element was removed.";
  return true;
}

function removeSelectedOverlay() {
  if (state.selectedElementKind !== "text-overlay") {
    return false;
  }

  removeActiveTextOverlay();
  clearSelectedElement();
  return true;
}

function buildPreviewIndex(svgElement) {
  const index = new Map();
  const targets = svgElement.querySelectorAll("[data-source-colors]");

  for (const element of targets) {
    const sourceColors = (element.getAttribute("data-source-colors") || "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!sourceColors.length) {
      continue;
    }

    element.addEventListener("mouseenter", () => {
      setHoveredHexes(sourceColors);
    });
    element.addEventListener("mouseleave", clearHoveredHexes);

    for (const color of sourceColors) {
      if (!index.has(color)) {
        index.set(color, new Set());
      }
      index.get(color).add(element);
    }
  }

  return index;
}

function setInteractivePreview(container, svgMarkup, emptyText, previewKey) {
  container.innerHTML = "";
  state.previewIndexes[previewKey] = new Map();

  if (!svgMarkup) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  const documentFragment = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const svgElement = documentFragment.documentElement;
  svgElement.classList.add("interactive-svg");
  svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");

  svgElement.querySelectorAll("[data-base-id]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      setSelectedElement(element.getAttribute("data-base-id"), "base");
    });
  });

  const overlayTexts = svgElement.querySelectorAll('[data-overlay-kind="text-overlay"]');
  overlayTexts.forEach((overlayText) => {
    overlayText.addEventListener("click", (event) => {
      event.stopPropagation();
      const overlayId = overlayText.getAttribute("data-overlay-id");
      state.activeTextOverlayId = overlayId;
      syncTextOverlayInputs();
      renderTextOverlayList();
      setSelectedElement(overlayId, "text-overlay");
    });
    overlayText.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const overlayId = overlayText.getAttribute("data-overlay-id");
      state.activeTextOverlayId = overlayId;
      syncTextOverlayInputs();
      renderTextOverlayList();
      setSelectedElement(overlayId, "text-overlay");
      startTextDrag(event, svgElement);
    });
  });

  svgElement.addEventListener("click", () => {
    clearSelectedElement();
    syncHighlights();
  });

  container.append(svgElement);
  state.previewIndexes[previewKey] = buildPreviewIndex(svgElement);
  syncHighlights();
}

function clonePaletteRows(rows) {
  return rows.map((row) => ({
    ...row,
    pantone: row.pantone ? { ...row.pantone } : null,
    originals: row.originals ? [...row.originals] : [],
  }));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function readTextOverlayInputs() {
  const overlay = getActiveTextOverlay();
  if (!overlay) {
    return null;
  }

  overlay.content = elements.textContentInput.value;
  overlay.fontFamily = elements.textFontSelect.value;
  overlay.color = normalizeHex(elements.textColorInput.value) || "#111111";
  overlay.size = clamp(Number(elements.textSizeInput.value) || 56, 12, 240);
  overlay.x = clamp(Number(elements.textXInput.value) || 110, 0, 780);
  overlay.y = clamp(Number(elements.textYInput.value) || 180, 0, 1080);
  return overlay;
}

function syncTextOverlayInputs() {
  const overlay = getActiveTextOverlay();
  if (!overlay) {
    elements.textContentInput.value = "";
    elements.textFontSelect.value = "monospace";
    elements.textColorInput.value = "#111111";
    elements.textSizeInput.value = "56";
    elements.textXInput.value = "110";
    elements.textYInput.value = "180";
    return;
  }

  elements.textContentInput.value = overlay.content;
  elements.textFontSelect.value = overlay.fontFamily;
  elements.textColorInput.value = overlay.color;
  elements.textSizeInput.value = String(overlay.size);
  elements.textXInput.value = String(overlay.x);
  elements.textYInput.value = String(overlay.y);
}

function buildTextOverlayMarkup() {
  return state.textOverlays
    .map((overlay) => {
      const lines = overlay.content
        .split("\n")
        .map((line) => line.trimEnd())
        .filter(Boolean);

      if (!lines.length) {
        return "";
      }

      const lineHeight = Math.round(overlay.size * 1.06);
      const tspans = lines
        .map((line, index) => {
          const x = overlay.x;
          const y = overlay.y + index * lineHeight;
          return `<tspan x="${x}" y="${y}">${escapeXml(line)}</tspan>`;
        })
        .join("");

      return `<text data-overlay-kind="text-overlay" data-overlay-id="${overlay.id}" fill="${overlay.color}" font-family="${escapeXml(overlay.fontFamily)}" font-size="${overlay.size}" font-weight="500" letter-spacing="1">${tspans}</text>`;
    })
    .filter(Boolean)
    .join("");
}

function composeSourceSvg() {
  if (!state.baseSvg) {
    return "";
  }

  const overlayMarkup = buildTextOverlayMarkup();
  if (!overlayMarkup) {
    return state.baseSvg;
  }

  return state.baseSvg.replace("</svg>", `${overlayMarkup}</svg>`);
}

function getRenderedHex(baseHex, pantoneSelected) {
  if (state.colorModel === "CMYK Print" && !pantoneSelected) {
    return snapHexToPrintableCmyk(baseHex);
  }

  return baseHex;
}

function enrichRow(row, next) {
  const baseHex = normalizeHex(next.baseHex || row.baseHex || row.currentHex || row.hex) || row.hex;
  const pantoneSelected = Boolean(next.pantoneSelected);
  const currentHex = getRenderedHex(baseHex, pantoneSelected);
  return {
    ...row,
    ...next,
    baseHex,
    currentHex,
    pantoneSelected,
    pantone: findNearestColor(currentHex, pantonePalette),
  };
}

function randomRange(range) {
  return (Math.random() * 2 - 1) * range;
}

function randomizeHexByTwentyPercent(hex) {
  const hsl = hexToHsl(hex);
  if (!hsl) {
    return hex;
  }

  return hslToHex(
    hsl.h + randomRange(18),
    hsl.s + randomRange(20),
    hsl.l + randomRange(12),
  );
}

function buildPaletteRows(colors) {
  return colors.map((item) => {
    const currentHex = item.hex;
    return {
      ...item,
      baseHex: item.hex,
      currentHex,
      pantone: findNearestColor(currentHex, pantonePalette),
      selectionMode: "source",
      pantoneSelected: false,
    };
  });
}

function getAverageDelta(rows) {
  if (!rows.length) {
    return 0;
  }

  const total = rows.reduce((sum, row) => sum + (row.pantone?.delta ?? 0), 0);
  return total / rows.length;
}

function updateStats() {
  elements.fileNameValue.textContent = state.fileName;
  elements.colorCountValue.textContent = String(state.paletteRows.length);
  elements.deltaValue.textContent = getAverageDelta(state.paletteRows).toFixed(2);
  elements.modeValue.textContent = state.activeMode;
  elements.colorModelValue.textContent = state.colorModel;
  elements.activePreviewTag.textContent = state.activeMode.toLowerCase();
  elements.historyCountTag.textContent = `${state.history.length} saved`;
  elements.historyModalCountTag.textContent = `${state.history.length} saved`;
  elements.toggleColorModelButton.textContent =
    state.colorModel === "CMYK Print" ? "Disable CMYK Mode" : "Enable CMYK Mode";
  elements.toggleColorModelButton.classList.toggle(
    "is-active",
    state.colorModel === "CMYK Print",
  );
}

function syncHighlights() {
  const hovered = new Set(state.hoveredHexes);
  elements.paletteTableBody.querySelectorAll("tr[data-source-hex]").forEach((row) => {
    row.classList.toggle("is-linked", hovered.has(row.dataset.sourceHex));
  });

  for (const previewIndex of Object.values(state.previewIndexes)) {
    const allElements = new Set();
    previewIndex.forEach((nodes) => {
      nodes.forEach((node) => allElements.add(node));
    });

    allElements.forEach((node) => node.classList.remove("is-linked-shape"));
    allElements.forEach((node) => node.classList.remove("is-selected-shape"));
    hovered.forEach((hex) => {
      const matches = previewIndex.get(hex);
      if (!matches) {
        return;
      }
      matches.forEach((node) => node.classList.add("is-linked-shape"));
    });
  }

  document.querySelectorAll(".interactive-svg [data-base-id]").forEach((node) => {
    node.classList.toggle(
      "is-selected-shape",
      state.selectedElementKind === "base" &&
        node.getAttribute("data-base-id") === state.selectedElementId,
    );
  });

  document
    .querySelectorAll('.interactive-svg [data-overlay-kind="text-overlay"]')
    .forEach((node) => {
      node.classList.toggle(
        "is-selected-shape",
        state.selectedElementKind === "text-overlay" &&
          node.getAttribute("data-overlay-id") === state.selectedElementId,
      );
    });
}

function renderPaletteTable() {
  elements.paletteTableBody.innerHTML = "";

  for (const row of state.paletteRows) {
    const tr = document.createElement("tr");
    tr.dataset.sourceHex = row.hex;
    tr.addEventListener("mouseenter", () => setHoveredHexes([row.hex]));
    tr.addEventListener("mouseleave", clearHoveredHexes);

    const swatchCell = document.createElement("td");
    swatchCell.innerHTML = `<div class="swatch" style="background:${row.currentHex}"></div>`;

    const hexCell = document.createElement("td");
    hexCell.textContent = row.currentHex;

    const countCell = document.createElement("td");
    countCell.textContent = String(row.count);

    const pantoneCell = document.createElement("td");
    if (row.pantone) {
      const pantoneButton = document.createElement("button");
      pantoneButton.type = "button";
      pantoneButton.className = "button button-chip";
      pantoneButton.innerHTML = `<strong>${row.pantone.name}</strong><span>${row.pantone.hex}</span>`;
      pantoneButton.addEventListener("click", () => {
        applyPantoneMatch(row.hex);
      });
      pantoneCell.append(pantoneButton);
    } else {
      pantoneCell.textContent = "-";
    }

    const deltaCell = document.createElement("td");
    deltaCell.textContent = row.pantone ? row.pantone.delta.toFixed(2) : "-";

    const overrideCell = document.createElement("td");
    const wrapper = document.createElement("div");
    wrapper.className = "override-field";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = row.baseHex;

    const applyButton = document.createElement("button");
    applyButton.className = "button";
    applyButton.textContent = "Apply";
    applyButton.addEventListener("click", () => {
      applyCustomOverride(row.hex, colorInput.value.toUpperCase());
    });

    const info = document.createElement("span");
    info.className = "mode-chip";
    info.textContent = row.selectionMode;

    wrapper.append(colorInput, applyButton, info);
    overrideCell.append(wrapper);

    tr.append(
      swatchCell,
      hexCell,
      countCell,
      pantoneCell,
      deltaCell,
      overrideCell,
    );
    elements.paletteTableBody.append(tr);
  }

  syncHighlights();
}

function getReplacementMapFromRows(rows, selector) {
  return rows.reduce((map, row) => {
    map[row.hex] = selector(row);
    return map;
  }, {});
}

function getRenderedMap(rows) {
  return getReplacementMapFromRows(rows, (row) => row.currentHex);
}

function refreshActivePreview(svgMarkup) {
  state.activeSvg = svgMarkup;
  setInteractivePreview(
    elements.activePreview,
    state.activeSvg,
    "The active preview will appear here.",
    "active",
  );
}

function setPinnedFromHistoryItem(item) {
  state.selectedHistoryId = item.id;
  state.pinnedSvg = item.svg;
  state.pinnedMode = item.mode;
}

function refreshLeftPreview() {
  const hasPinned = Boolean(state.pinnedSvg);
  const showingPinned = hasPinned && !state.leftShowsOriginal;

  elements.leftPreviewTitle.textContent = hasPinned ? "Pinned Comparison" : "Original";
  elements.leftPreviewTag.textContent = showingPinned
    ? state.pinnedMode.toLowerCase()
    : hasPinned
      ? "original"
      : "source";
  elements.toggleOriginalButton.hidden = !hasPinned;
  elements.toggleOriginalButton.textContent = state.leftShowsOriginal
    ? "Hide Original"
    : "Show Original";

  setInteractivePreview(
    elements.originalPreview,
    showingPinned ? state.pinnedSvg : state.originalSvg,
    showingPinned
      ? "The pinned comparison will appear here."
      : "The original SVG preview will appear here.",
    "original",
  );
}

function closeHistoryModal() {
  elements.historyModal.hidden = true;
}

function parseSvgGeometry(svgMarkup) {
  const documentFragment = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const svgElement = documentFragment.documentElement;
  const viewBox = svgElement.getAttribute("viewBox");
  if (viewBox) {
    const [minX, minY, width, height] = viewBox
      .trim()
      .split(/\s+/)
      .map(Number);
    if ([minX, minY, width, height].every(Number.isFinite) && width > 0 && height > 0) {
      return {
        minX,
        minY,
        width,
        height,
        innerMarkup: svgElement.innerHTML,
      };
    }
  }

  const width = Number(svgElement.getAttribute("width")) || 780;
  const height = Number(svgElement.getAttribute("height")) || 1080;
  return {
    minX: 0,
    minY: 0,
    width,
    height,
    innerMarkup: svgElement.innerHTML,
  };
}

function buildHistorySheetSvg() {
  if (!state.history.length) {
    return "";
  }

  const itemCount = state.history.length;
  const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(itemCount))));
  const rows = Math.ceil(itemCount / columns);
  const cellWidth = 220;
  const cellHeight = 306;
  const outerPadding = 24;
  const gap = 12;
  const contentWidth = cellWidth - 20;
  const contentHeight = cellHeight - 20;
  const sheetWidth = outerPadding * 2 + columns * cellWidth + (columns - 1) * gap;
  const sheetHeight = outerPadding * 2 + rows * cellHeight + (rows - 1) * gap;

  const tiles = state.history
    .map((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = outerPadding + column * (cellWidth + gap);
      const y = outerPadding + row * (cellHeight + gap);
      const geometry = parseSvgGeometry(item.svg);
      const scale = Math.min(contentWidth / geometry.width, contentHeight / geometry.height);
      const offsetX = x + (cellWidth - geometry.width * scale) / 2;
      const offsetY = y + (cellHeight - geometry.height * scale) / 2;

      return `
  <g transform="translate(${offsetX.toFixed(2)} ${offsetY.toFixed(2)}) scale(${scale.toFixed(5)}) translate(${-geometry.minX} ${-geometry.minY})">
    ${geometry.innerMarkup}
  </g>`.trim();
    })
    .join("\n");

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheetWidth} ${sheetHeight}" width="${sheetWidth}" height="${sheetHeight}">
  <rect width="${sheetWidth}" height="${sheetHeight}" fill="#ffffff"/>
  ${tiles}
</svg>`.trim();
}

async function saveSvgMarkup(svgMarkup, suggestedName, successMessage) {
  if (!svgMarkup) {
    return;
  }

  if (desktopBridge) {
    const result = await desktopBridge.saveSvg({
      suggestedName,
      content: svgMarkup,
    });

    if (result?.filePath) {
      elements.statusText.textContent = successMessage || `Saved: ${result.filePath}`;
    }
    return;
  }

  const blob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
  if (successMessage) {
    elements.statusText.textContent = successMessage;
  }
}

function createHistoryCard(item, { large = false } = {}) {
  const button = document.createElement("article");
  button.className = `history-card${item.id === state.selectedHistoryId ? " is-selected" : ""}${large ? " is-large" : ""}`;
  button.tabIndex = 0;
  button.setAttribute("role", "button");
  button.addEventListener("click", () => {
    recallHistoryItem(item.id);
    if (large) {
      closeHistoryModal();
    }
  });
  button.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    recallHistoryItem(item.id);
    if (large) {
      closeHistoryModal();
    }
  });

  button.innerHTML = `
    <div class="history-card-controls">
      <button class="history-card-download" type="button">SVG</button>
      <button class="history-card-close" type="button" aria-label="Remove pinned item">x</button>
    </div>
    <div class="history-card-preview"></div>
    <h3 class="history-card-title">${item.title}</h3>
    <p class="history-card-meta">${item.mode}</p>
  `;

  const downloadButton = button.querySelector(".history-card-download");
  downloadButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    saveSvgMarkup(
      item.svg,
      `${state.fileName.replace(/\.svg$/i, "")}-${item.title.toLowerCase().replace(/\s+/g, "-")}.svg`,
      `${item.title} was exported as SVG.`,
    ).catch((error) => {
      elements.statusText.textContent = error.message;
    });
  });

  const closeButton = button.querySelector(".history-card-close");
  closeButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    removeHistoryItem(item.id);
  });

  const preview = button.querySelector(".history-card-preview");
  setImagePreview(preview, item.previewUrl, item.title);
  return button;
}

function renderHistory() {
  elements.historyStrip.innerHTML = "";

  if (!state.history.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent =
      "Pinned versions will appear here from left to right.";
    elements.historyStrip.append(empty);
    return;
  }

  for (const item of state.history) {
    elements.historyStrip.append(createHistoryCard(item));
  }
}

function renderHistoryModal() {
  elements.historyModalGrid.innerHTML = "";
  elements.historyModalCountTag.textContent = `${state.history.length} saved`;

  if (!state.history.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "No pinned history items yet.";
    elements.historyModalGrid.append(empty);
    return;
  }

  for (const item of state.history) {
    elements.historyModalGrid.append(createHistoryCard(item, { large: true }));
  }
}

function openHistoryModal() {
  renderHistoryModal();
  elements.historyModal.hidden = false;
}

function removeHistoryItem(historyId) {
  const itemIndex = state.history.findIndex((entry) => entry.id === historyId);
  if (itemIndex === -1) {
    return;
  }

  const [removed] = state.history.splice(itemIndex, 1);
  revokeUrl(removed.previewUrl);

  if (state.selectedHistoryId === historyId) {
    const nextSelected = state.history[0] || null;
    if (nextSelected) {
      setPinnedFromHistoryItem(nextSelected);
    } else {
      state.selectedHistoryId = null;
      state.pinnedSvg = "";
      state.pinnedMode = "";
      state.leftShowsOriginal = true;
    }
  }

  renderHistory();
  renderHistoryModal();
  refreshLeftPreview();
  updateStats();
  elements.statusText.textContent = `${removed.title} was removed from history.`;
}

function commitPaletteRows(nextRows, modeLabel) {
  state.paletteRows = nextRows;
  state.activeMode = modeLabel;
  refreshActivePreview(applyColorMap(state.originalSvg, getRenderedMap(state.paletteRows)));
  renderPaletteTable();
  renderVariants();
  updateStats();
}

function applyRowTargets(targetResolver, modeLabel, metaResolver) {
  const nextRows = state.paletteRows.map((row) => {
    const meta = metaResolver ? metaResolver(row) : {};
    return enrichRow(row, {
      ...meta,
      baseHex: targetResolver(row),
    });
  });

  commitPaletteRows(nextRows, modeLabel);
}

function rerenderForCurrentColorModel(statusText) {
  const nextRows = state.paletteRows.map((row) =>
    enrichRow(row, {
      baseHex: row.baseHex,
      selectionMode:
        state.colorModel === "CMYK Print" && !row.pantoneSelected
          ? "cmyk"
          : row.selectionMode === "cmyk"
            ? "manual"
            : row.selectionMode,
      pantoneSelected: row.pantoneSelected,
    }),
  );

  commitPaletteRows(nextRows, state.activeMode);
  if (statusText) {
    elements.statusText.textContent = statusText;
  }
}

function applyCustomOverride(sourceHex, targetHex) {
  const normalized = normalizeHex(targetHex);
  if (!normalized) {
    return;
  }

  applyRowTargets(
    (row) => (row.hex === sourceHex ? normalized : row.baseHex),
    "Manual Override",
    (row) => ({
      selectionMode: row.hex === sourceHex
        ? state.colorModel === "CMYK Print"
          ? "cmyk"
          : "manual"
        : row.selectionMode,
      pantoneSelected: row.hex === sourceHex ? false : row.pantoneSelected,
    }),
  );
  elements.statusText.textContent = `${sourceHex} was updated to ${normalized}.`;
}

function applyPantoneMatch(sourceHex) {
  const row = state.paletteRows.find((item) => item.hex === sourceHex);
  if (!row?.pantone) {
    return;
  }

  applyRowTargets(
    (item) => (item.hex === sourceHex ? row.pantone.hex : item.baseHex),
    "Pantone Match",
    (item) => ({
      selectionMode: item.hex === sourceHex ? "pantone" : item.selectionMode,
      pantoneSelected: item.hex === sourceHex ? true : item.pantoneSelected,
    }),
  );
  elements.statusText.textContent =
    `${sourceHex} was snapped to ${row.pantone.name} (${row.pantone.hex}).`;
}

function createHistoryItem() {
  state.historySerial += 1;
  return {
    id: `history-${state.historySerial}`,
    title: `Saved ${String(state.historySerial).padStart(2, "0")}`,
    mode: state.activeMode,
    svg: state.activeSvg,
    previewUrl: svgToObjectUrl(state.activeSvg),
    paletteRows: clonePaletteRows(state.paletteRows),
  };
}

function applySnapshotToActive(item) {
  const nextRows = clonePaletteRows(item.paletteRows).map((row) =>
    enrichRow(row, {
      baseHex: row.baseHex || row.currentHex || row.hex,
      selectionMode: row.selectionMode,
      pantoneSelected: row.pantoneSelected,
    }),
  );

  commitPaletteRows(nextRows, item.mode);
}

function randomizeWorkingCopy() {
  applyRowTargets(
    (row) => randomizeHexByTwentyPercent(row.baseHex),
    "Preview",
    () => ({
      selectionMode: state.colorModel === "CMYK Print" ? "cmyk" : "automatic",
      pantoneSelected: false,
    }),
  );
}

function pinCurrentPreview() {
  if (!state.activeSvg) {
    return;
  }

  const item = createHistoryItem();
  state.history.unshift(item);
  setPinnedFromHistoryItem(item);
  state.leftShowsOriginal = false;
  renderHistory();
  renderHistoryModal();
  refreshLeftPreview();
  updateStats();
  randomizeWorkingCopy();
  elements.statusText.textContent =
    "The current version was pinned. A fresh randomized preview was generated on the right.";
}

function recallHistoryItem(historyId) {
  const item = state.history.find((entry) => entry.id === historyId);
  if (!item) {
    return;
  }

  setPinnedFromHistoryItem(item);
  state.leftShowsOriginal = false;
  applySnapshotToActive(item);
  renderHistory();
  renderHistoryModal();
  refreshLeftPreview();
  elements.statusText.textContent = `${item.title} was restored to the active preview.`;
}

function toggleOriginalPreview() {
  if (!state.pinnedSvg) {
    return;
  }

  state.leftShowsOriginal = !state.leftShowsOriginal;
  refreshLeftPreview();
  elements.statusText.textContent = state.leftShowsOriginal
    ? "The pinned panel is showing the original."
    : "The pinned panel is showing the saved version.";
}

function buildVariants(rows) {
  const darkestToLightest = sortByLuminance(rows.map((row) => row.currentHex));
  const contrastPalette = [
    "#111111",
    "#EDE7D9",
    "#D9481F",
    "#008C72",
    "#2957C8",
    "#D4A72C",
  ];

  return [
    {
      label: "Pantone Snap",
      description: "Pull every working color to its nearest embedded Pantone match.",
      map: getReplacementMapFromRows(rows, (row) => row.pantone?.hex || row.baseHex),
      metaResolver: () => ({ selectionMode: "pantone", pantoneSelected: true }),
    },
    {
      label: "Warm Editorial",
      description: "Push the poster toward a warmer, print-focused palette.",
      map: getReplacementMapFromRows(rows, (row) =>
        transformHex(row.baseHex, {
          hueShift: 16,
          saturationShift: 4,
          lightnessShift: -1,
        }),
      ),
      metaResolver: () => ({
        selectionMode: state.colorModel === "CMYK Print" ? "cmyk" : "automatic",
        pantoneSelected: false,
      }),
    },
    {
      label: "Cool Blueprint",
      description: "Shift the palette toward a cooler technical blue-green feel.",
      map: getReplacementMapFromRows(rows, (row) =>
        transformHex(row.baseHex, {
          hueShift: -28,
          saturationShift: 8,
          lightnessShift: -2,
        }),
      ),
      metaResolver: () => ({
        selectionMode: state.colorModel === "CMYK Print" ? "cmyk" : "automatic",
        pantoneSelected: false,
      }),
    },
    {
      label: "High Contrast",
      description: "Reduce the palette to a tighter set of stronger presentation tones.",
      map: rows.reduce((map, row, index) => {
        const rank = darkestToLightest.indexOf(row.currentHex);
        map[row.hex] =
          contrastPalette[Math.min(rank, contrastPalette.length - 1)] ||
          contrastPalette[index % contrastPalette.length];
        return map;
      }, {}),
      metaResolver: () => ({
        selectionMode: state.colorModel === "CMYK Print" ? "cmyk" : "automatic",
        pantoneSelected: false,
      }),
    },
  ];
}

function renderVariants() {
  elements.variantGrid.innerHTML = "";
  state.variantUrls.forEach(revokeUrl);
  state.variantUrls = [];

  const variants = buildVariants(state.paletteRows);
  for (const variant of variants) {
    const fragment = elements.variantCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".variant-card");
    const preview = fragment.querySelector(".variant-preview");
    const title = fragment.querySelector("h3");
    const description = fragment.querySelector("p");
    const button = fragment.querySelector("button");

    title.textContent = variant.label;
    description.textContent = variant.description;
    button.addEventListener("click", () => {
      applyRowTargets(
        (row) => variant.map[row.hex] || row.baseHex,
        variant.label,
        variant.metaResolver,
      );
      elements.statusText.textContent = `${variant.label} was applied.`;
    });

    const previewRows = state.paletteRows.map((row) =>
      enrichRow(row, {
        baseHex: variant.map[row.hex] || row.baseHex,
        ...variant.metaResolver(row),
      }),
    );
    const variantSvg = applyColorMap(state.originalSvg, getRenderedMap(previewRows));
    const url = svgToObjectUrl(variantSvg);
    state.variantUrls.push(url);
    setImagePreview(preview, url, variant.label);
    elements.variantGrid.append(card);
  }
}

function clearHistory() {
  state.history.forEach((item) => revokeUrl(item.previewUrl));
  state.history = [];
  state.selectedHistoryId = null;
  state.pinnedSvg = "";
  state.pinnedMode = "";
  state.leftShowsOriginal = true;
}

function applySourceState(options = {}) {
  const { preserveDrag = false } = options;
  const mergedSvg = composeSourceSvg();
  const analysis = analyzeSvgColors(mergedSvg);
  clearHistory();
  if (!preserveDrag) {
    stopDrag();
  }

  state.originalSvg = analysis.sanitizedSvg;
  state.paletteRows = buildPaletteRows(analysis.colors);
  state.activeMode = "Original";

  refreshLeftPreview();
  refreshActivePreview(applyColorMap(state.originalSvg, getRenderedMap(state.paletteRows)));
  renderPaletteTable();
  renderVariants();
  renderHistory();
  renderHistoryModal();
  renderTextOverlayList();
  updateStats();

  elements.statusText.textContent =
    `${state.fileName} was analyzed. ${analysis.colors.length} unique colors were found.`;
}

function resetTextOverlay() {
  state.textOverlays = [];
  state.activeTextOverlayId = null;
  syncTextOverlayInputs();
  renderTextOverlayList();
}

function setSource(svgMarkup, fileName) {
  state.fileName = fileName;
  state.baseElementSerial = 0;
  state.baseSvg = prepareBaseSvg(svgMarkup);
  clearSelectedElement();
  resetTextOverlay();
  applySourceState();
}

function resetToOriginal() {
  const nextRows = state.paletteRows.map((row) =>
    enrichRow(row, {
      baseHex: row.hex,
      selectionMode: "source",
      pantoneSelected: false,
    }),
  );

  commitPaletteRows(nextRows, "Original");
  elements.statusText.textContent = "The active preview was reset to the original palette.";
}

function toggleColorModel() {
  state.colorModel = state.colorModel === "RGB" ? "CMYK Print" : "RGB";
  rerenderForCurrentColorModel(
    state.colorModel === "CMYK Print"
      ? "CMYK mode is enabled. Colors without a Pantone selection were moved toward the nearest printable value."
      : "CMYK mode is disabled. The preview returned to RGB.",
  );
}

async function readSvgFile(file) {
  const text = await file.text();
  setSource(text, file.name);
}

function updateTextOverlay(live = false) {
  const overlay = readTextOverlayInputs();
  if (!overlay) {
    return;
  }

  applySourceState();
  renderTextOverlayList();
  if (live) {
    elements.statusText.textContent = "Text overlay was updated.";
  }
}

function enableTextOverlay() {
  const overlay = createDefaultTextOverlay();
  overlay.content = elements.textContentInput.value || `Text ${state.textOverlaySerial}`;
  overlay.fontFamily = elements.textFontSelect.value;
  overlay.color = normalizeHex(elements.textColorInput.value) || "#111111";
  overlay.size = clamp(Number(elements.textSizeInput.value) || 56, 12, 240);
  overlay.x = clamp(Number(elements.textXInput.value) || 110, 0, 780);
  overlay.y = clamp(Number(elements.textYInput.value) || 180, 0, 1080);
  state.textOverlays.push(overlay);
  state.activeTextOverlayId = overlay.id;
  applySourceState();
  syncTextOverlayInputs();
  renderTextOverlayList();
  setSelectedElement(overlay.id, "text-overlay");
  elements.statusText.textContent = "A new text overlay was added.";
}

function removeActiveTextOverlay() {
  const overlay = getActiveTextOverlay();
  if (!overlay) {
    return;
  }

  state.textOverlays = state.textOverlays.filter((item) => item.id !== overlay.id);
  state.activeTextOverlayId = state.textOverlays.at(-1)?.id || null;
  stopDrag();
  applySourceState();
  syncTextOverlayInputs();
  renderTextOverlayList();
  elements.statusText.textContent = "Text overlay was removed.";
}

async function importSvg() {
  if (desktopBridge) {
    const file = await desktopBridge.openSvg();
    if (file?.content) {
      setSource(file.content, file.fileName);
    }
    return;
  }

  elements.fileInput.click();
}

function copyPaletteList() {
  const lines = state.paletteRows.map((row) => {
    const pantoneName = row.pantone?.name || "No match";
    const pantoneHex = row.pantone?.hex || "-";
    return `${row.hex}\tbase:${row.baseHex}\tactive:${row.currentHex}\t${pantoneName}\t${pantoneHex}\tuses:${row.count}`;
  });

  navigator.clipboard
    .writeText(lines.join("\n"))
    .then(() => {
      elements.statusText.textContent = "The HEX and Pantone list was copied to the clipboard.";
    })
    .catch(() => {
      elements.statusText.textContent =
        "Clipboard copy failed. Browser permission may be required.";
    });
}

async function exportActiveSvg() {
  const suffix = state.activeMode.toLowerCase().replace(/\s+/g, "-");
  await saveSvgMarkup(
    state.activeSvg,
    state.fileName.replace(/\.svg$/i, `-${suffix}.svg`),
    "The active preview was exported as SVG.",
  );
}

async function exportAllPinnedAsSheet() {
  if (!state.history.length) {
    elements.statusText.textContent = "There are no pinned versions to export.";
    return;
  }

  const svgMarkup = buildHistorySheetSvg();
  await saveSvgMarkup(
    svgMarkup,
    state.fileName.replace(/\.svg$/i, "-pinned-sheet.svg"),
    "Pinned history was exported as a single SVG sheet.",
  );
}

elements.importButton.addEventListener("click", () => {
  importSvg().catch((error) => {
    elements.statusText.textContent = error.message;
  });
});

elements.fileInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  readSvgFile(file).catch((error) => {
    elements.statusText.textContent = error.message;
  });
});

elements.loadSampleButton.addEventListener("click", () => {
  setSource(createSampleSvg(), "sample-poster.svg");
});

elements.snapPantoneButton.addEventListener("click", () => {
  applyRowTargets(
    (row) => row.pantone?.hex || row.baseHex,
    "Pantone Snap",
    () => ({ selectionMode: "pantone", pantoneSelected: true }),
  );
  elements.statusText.textContent =
    "Source colors were snapped to their nearest Pantone matches.";
});

elements.toggleColorModelButton.addEventListener("click", toggleColorModel);
elements.resetButton.addEventListener("click", resetToOriginal);
elements.copyPaletteButton.addEventListener("click", copyPaletteList);
elements.addTextButton.addEventListener("click", enableTextOverlay);
elements.removeTextButton.addEventListener("click", removeActiveTextOverlay);
elements.textContentInput.addEventListener("input", () => updateTextOverlay(true));
elements.textFontSelect.addEventListener("change", () => updateTextOverlay(true));
elements.textColorInput.addEventListener("input", () => updateTextOverlay(true));
elements.textSizeInput.addEventListener("input", () => updateTextOverlay(true));
elements.pinPreviewButton.addEventListener("click", pinCurrentPreview);
elements.toggleOriginalButton.addEventListener("click", toggleOriginalPreview);
elements.openHistoryModalButton.addEventListener("click", openHistoryModal);
elements.downloadAllHistoryButton.addEventListener("click", () => {
  exportAllPinnedAsSheet().catch((error) => {
    elements.statusText.textContent = error.message;
  });
});
elements.closeHistoryModalButton.addEventListener("click", closeHistoryModal);
elements.historyModalBackdrop.addEventListener("click", closeHistoryModal);
elements.exportButton.addEventListener("click", () => {
  exportActiveSvg().catch((error) => {
    elements.statusText.textContent = error.message;
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.historyModal.hidden) {
    closeHistoryModal();
  }

  if (event.key === "Escape") {
    stopDrag();
  }

  const targetTag = event.target?.tagName;
  const isTypingTarget =
    targetTag === "INPUT" || targetTag === "TEXTAREA" || targetTag === "SELECT";
  if (!isTypingTarget && event.key === "Delete") {
    if (removeSelectedOverlay()) {
      return;
    }
    removeSelectedBaseElement();
  }
});

window.addEventListener("pointermove", handleTextDrag);
window.addEventListener("pointerup", stopDrag);

if (desktopBridge) {
  desktopBridge.onFileOpened((file) => {
    if (file?.content) {
      setSource(file.content, file.fileName);
    }
  });

  desktopBridge.onExportRequested(() => {
    exportActiveSvg().catch((error) => {
      elements.statusText.textContent = error.message;
    });
  });

  desktopBridge.getMeta().then((meta) => {
    elements.statusText.textContent = `Desktop mode ready. ${meta.platform} / v${meta.version}`;
  });
}

validateAppMetadata();
setSource(createSampleSvg(), "sample-poster.svg");
