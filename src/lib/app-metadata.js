const REQUIRED_METADATA_FIELDS = [
  "id",
  "name",
  "version",
  "shortDescription",
  "aiDescription",
  "github",
  "releaseApiUrl",
];

function isDevEnvironment() {
  return Boolean(
    globalThis.location?.hostname === "localhost" ||
      globalThis.location?.hostname === "127.0.0.1" ||
      globalThis.location?.protocol === "file:",
  );
}

function findMissingFields(manifest) {
  return REQUIRED_METADATA_FIELDS.filter((field) => {
    const value = manifest?.[field];
    return typeof value !== "string" || !value.trim();
  });
}

async function readManifestThroughBridge() {
  if (!globalThis.window?.desktopBridge?.getAppManifest) {
    return null;
  }

  return globalThis.window.desktopBridge.getAppManifest();
}

async function readManifestThroughFetch() {
  const manifestUrl = new URL("../../app.manifest.json", import.meta.url);
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

export async function validateAppMetadata() {
  if (!isDevEnvironment()) {
    return null;
  }

  try {
    const manifest = (await readManifestThroughBridge()) || (await readManifestThroughFetch());
    const missingFields = findMissingFields(manifest);
    if (missingFields.length) {
      console.warn(
        `[hot-vs-nice metadata] Missing required fields: ${missingFields.join(", ")}`,
      );
    }
    return { manifest, missingFields };
  } catch (error) {
    console.warn("[hot-vs-nice metadata] Validation skipped:", error);
    return null;
  }
}
