export function cleanInvestigationAnalysisMarkdown(value: string): string {
  const withoutClosedThinkBlocks = value
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/think>/gi, "");
  const lines = withoutClosedThinkBlocks.split(/\r?\n/);
  const keptLines: string[] = [];
  let skippingThink = false;

  for (const line of lines) {
    if (/<think>/i.test(line)) {
      skippingThink = true;
      continue;
    }
    if (skippingThink && /^#{1,6}\s+/.test(line.trim())) {
      skippingThink = false;
      keptLines.push(line);
      continue;
    }
    if (!skippingThink) keptLines.push(line);
  }

  return keptLines.join("\n")
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function summarizeInvestigationAnalysisMarkdown(markdown: string): string {
  const cleanMarkdown = cleanInvestigationAnalysisMarkdown(markdown);
  const firstContentLine = cleanMarkdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
  return firstContentLine ?? cleanMarkdown.slice(0, 180);
}
