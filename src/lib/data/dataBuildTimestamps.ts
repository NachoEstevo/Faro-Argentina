export function resolveDataBuildTimestamp({
  envTimestamp,
  manifestTimestamp,
}: {
  envTimestamp: string | undefined;
  manifestTimestamp: string | undefined;
}): string {
  const explicit = clean(envTimestamp);
  if (explicit) return assertIsoTimestamp(explicit, "Invalid FARO_DATA_BUILD_TIMESTAMP");

  const manifest = clean(manifestTimestamp);
  if (manifest) return assertIsoTimestamp(manifest, "Invalid snapshot manifest generatedAt");

  throw new Error("missing snapshot manifest timestamp");
}

function assertIsoTimestamp(value: string, message: string): string {
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) throw new Error(message);
  return new Date(millis).toISOString();
}

function clean(value: string | undefined): string {
  return String(value ?? "").trim();
}
