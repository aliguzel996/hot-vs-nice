const canvas = document.createElement("canvas");
canvas.width = 1;
canvas.height = 1;
const context = canvas.getContext("2d");

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function componentToHex(value) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

export function rgbToHex({ r, g, b }) {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`.toUpperCase();
}

export function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return null;
  }

  const clean = normalized.slice(1);
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

export function normalizeHex(value) {
  if (typeof value !== "string") {
    return null;
  }

  const input = value.trim();
  if (!input.startsWith("#")) {
    return null;
  }

  const hex = input.slice(1);
  if (![3, 4, 6, 8].includes(hex.length) || /[^a-f0-9]/i.test(hex)) {
    return null;
  }

  if (hex.length === 3 || hex.length === 4) {
    return `#${hex
      .slice(0, 3)
      .split("")
      .map((chunk) => chunk + chunk)
      .join("")}`.toUpperCase();
  }

  return `#${hex.slice(0, 6)}`.toUpperCase();
}

export function parseColorToHex(value) {
  if (typeof value !== "string") {
    return null;
  }

  const input = value.trim();
  if (
    !input ||
    input === "none" ||
    input === "transparent" ||
    input === "currentColor" ||
    input.startsWith("url(")
  ) {
    return null;
  }

  const hex = normalizeHex(input);
  if (hex) {
    return hex;
  }

  const sentinel = "#010203";
  context.fillStyle = sentinel;
  context.fillStyle = input;
  const resolved = context.fillStyle;

  if (!resolved || resolved === sentinel) {
    return null;
  }

  const rgbMatch = resolved.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgbMatch) {
    return normalizeHex(resolved);
  }

  const parts = rgbMatch[1]
    .split(",")
    .slice(0, 3)
    .map((part) => Number.parseFloat(part.trim()));

  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  return rgbToHex({ r: parts[0], g: parts[1], b: parts[2] });
}

function srgbToLinear(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function xyzToLabHelper(value) {
  return value > 0.008856 ? value ** (1 / 3) : 7.787 * value + 16 / 116;
}

export function rgbToLab(rgb) {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);

  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  const fx = xyzToLabHelper(x);
  const fy = xyzToLabHelper(y);
  const fz = xyzToLabHelper(z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

export function deltaE(labA, labB) {
  return Math.sqrt(
    (labA.l - labB.l) ** 2 + (labA.a - labB.a) ** 2 + (labA.b - labB.b) ** 2,
  );
}

export function hexToLab(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToLab(rgb) : null;
}

export function findNearestColor(hex, palette) {
  const sourceLab = hexToLab(hex);
  if (!sourceLab) {
    return null;
  }

  let best = null;
  for (const item of palette) {
    const itemLab = hexToLab(item.hex);
    if (!itemLab) {
      continue;
    }

    const score = deltaE(sourceLab, itemLab);
    if (!best || score < best.delta) {
      best = { ...item, delta: score };
    }
  }

  return best;
}

export function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return null;
  }

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (!delta) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue = 0;
  switch (max) {
    case r:
      hue = (g - b) / delta + (g < b ? 6 : 0);
      break;
    case g:
      hue = (b - r) / delta + 2;
      break;
    default:
      hue = (r - g) / delta + 4;
      break;
  }

  return {
    h: hue * 60,
    s: saturation * 100,
    l: lightness * 100,
  };
}

function hueToRgb(p, q, t) {
  let value = t;
  if (value < 0) {
    value += 1;
  }
  if (value > 1) {
    value -= 1;
  }
  if (value < 1 / 6) {
    return p + (q - p) * 6 * value;
  }
  if (value < 1 / 2) {
    return q;
  }
  if (value < 2 / 3) {
    return p + (q - p) * (2 / 3 - value) * 6;
  }
  return p;
}

export function hslToHex(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;

  if (saturation === 0) {
    const gray = lightness * 255;
    return rgbToHex({ r: gray, g: gray, b: gray });
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  const r = hueToRgb(p, q, hue / 360 + 1 / 3) * 255;
  const g = hueToRgb(p, q, hue / 360) * 255;
  const b = hueToRgb(p, q, hue / 360 - 1 / 3) * 255;

  return rgbToHex({ r, g, b });
}

export function transformHex(hex, transform) {
  const hsl = hexToHsl(hex);
  if (!hsl) {
    return hex;
  }

  return hslToHex(
    hsl.h + (transform.hueShift ?? 0),
    hsl.s + (transform.saturationShift ?? 0),
    hsl.l + (transform.lightnessShift ?? 0),
  );
}

export function rgbToCmyk(rgb) {
  const red = clamp(rgb.r, 0, 255) / 255;
  const green = clamp(rgb.g, 0, 255) / 255;
  const blue = clamp(rgb.b, 0, 255) / 255;
  const black = 1 - Math.max(red, green, blue);

  if (black >= 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  return {
    c: ((1 - red - black) / (1 - black)) * 100,
    m: ((1 - green - black) / (1 - black)) * 100,
    y: ((1 - blue - black) / (1 - black)) * 100,
    k: black * 100,
  };
}

export function cmykToRgb(cmyk) {
  const cyan = clamp(cmyk.c, 0, 100) / 100;
  const magenta = clamp(cmyk.m, 0, 100) / 100;
  const yellow = clamp(cmyk.y, 0, 100) / 100;
  const black = clamp(cmyk.k, 0, 100) / 100;

  return {
    r: 255 * (1 - cyan) * (1 - black),
    g: 255 * (1 - magenta) * (1 - black),
    b: 255 * (1 - yellow) * (1 - black),
  };
}

function quantizePercent(value, step) {
  return clamp(Math.round(value / step) * step, 0, 100);
}

export function snapHexToPrintableCmyk(hex, step = 5) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return hex;
  }

  const cmyk = rgbToCmyk(rgb);
  return rgbToHex(
    cmykToRgb({
      c: quantizePercent(cmyk.c, step),
      m: quantizePercent(cmyk.m, step),
      y: quantizePercent(cmyk.y, step),
      k: quantizePercent(cmyk.k, step),
    }),
  );
}

export function sortByLuminance(colors) {
  return [...colors].sort((left, right) => {
    const leftRgb = hexToRgb(left);
    const rightRgb = hexToRgb(right);
    if (!leftRgb || !rightRgb) {
      return 0;
    }

    const leftY = leftRgb.r * 0.2126 + leftRgb.g * 0.7152 + leftRgb.b * 0.0722;
    const rightY =
      rightRgb.r * 0.2126 + rightRgb.g * 0.7152 + rightRgb.b * 0.0722;
    return leftY - rightY;
  });
}
