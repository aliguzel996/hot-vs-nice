import { parseColorToHex } from "./color-utils.js";

const COLOR_ATTRIBUTES = [
  "fill",
  "stroke",
  "stop-color",
  "flood-color",
  "lighting-color",
  "color",
];

function parseStyleDeclarations(styleText) {
  return styleText
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [property, ...rest] = item.split(":");
      return [property?.trim(), rest.join(":").trim()];
    })
    .filter(([property, value]) => property && value);
}

function iterateColorDeclarations(element, visitor) {
  for (const attribute of COLOR_ATTRIBUTES) {
    if (element.hasAttribute(attribute)) {
      visitor({
        kind: "attribute",
        element,
        property: attribute,
        value: element.getAttribute(attribute),
      });
    }
  }

  if (element.hasAttribute("style")) {
    for (const [property, value] of parseStyleDeclarations(
      element.getAttribute("style") || "",
    )) {
      if (COLOR_ATTRIBUTES.includes(property)) {
        visitor({
          kind: "style",
          element,
          property,
          value,
        });
      }
    }
  }
}

function getSvgDocument(svgText) {
  const parser = new DOMParser();
  const document = parser.parseFromString(svgText, "image/svg+xml");
  const parserError = document.querySelector("parsererror");
  if (parserError) {
    throw new Error("SVG could not be parsed. Please load a valid SVG file.");
  }
  return document;
}

function sanitizeDocument(document) {
  document.querySelectorAll("script, foreignObject").forEach((node) => node.remove());

  document.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name)) {
        element.removeAttribute(attribute.name);
      }
    }
  });
}

function annotateSourceColors(document) {
  document.querySelectorAll("*").forEach((element) => {
    const sourceColors = new Set();
    iterateColorDeclarations(element, ({ value }) => {
      const hex = parseColorToHex(value);
      if (hex) {
        sourceColors.add(hex);
      }
    });

    if (sourceColors.size) {
      element.setAttribute("data-source-colors", [...sourceColors].join("|"));
    } else {
      element.removeAttribute("data-source-colors");
    }
  });
}

export function analyzeSvgColors(svgText) {
  const document = getSvgDocument(svgText);
  sanitizeDocument(document);
  annotateSourceColors(document);

  const colorMap = new Map();
  document.querySelectorAll("*").forEach((element) => {
    iterateColorDeclarations(element, ({ value }) => {
      const hex = parseColorToHex(value);
      if (!hex) {
        return;
      }

      const current = colorMap.get(hex) || { hex, count: 0, originals: new Set() };
      current.count += 1;
      current.originals.add(value.trim());
      colorMap.set(hex, current);
    });
  });

  return {
    sanitizedSvg: document.documentElement.outerHTML,
    colors: [...colorMap.values()]
      .map((item) => ({ ...item, originals: [...item.originals] }))
      .sort((left, right) => right.count - left.count),
  };
}

export function applyColorMap(svgText, replacementMap) {
  const document = getSvgDocument(svgText);
  sanitizeDocument(document);
  annotateSourceColors(document);

  document.querySelectorAll("*").forEach((element) => {
    iterateColorDeclarations(element, ({ kind, property, value }) => {
      const currentHex = parseColorToHex(value);
      const replacement = currentHex ? replacementMap[currentHex] : null;
      if (!replacement) {
        return;
      }

      if (kind === "attribute") {
        element.setAttribute(property, replacement);
        return;
      }

      const declarations = parseStyleDeclarations(element.getAttribute("style") || "");
      const rebuilt = declarations.map(([name, rawValue]) =>
        name === property && parseColorToHex(rawValue) === currentHex
          ? `${name}: ${replacement}`
          : `${name}: ${rawValue}`,
      );
      element.setAttribute("style", rebuilt.join("; "));
    });
  });

  return document.documentElement.outerHTML;
}
