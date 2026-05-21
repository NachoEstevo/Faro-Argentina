export type InvestigationAnalysisBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

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

export function parseInvestigationAnalysisBlocks(markdown: string): InvestigationAnalysisBlock[] {
  const blocks: InvestigationAnalysisBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let tableRows: string[][] = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  }

  function flushList() {
    if (listItems.length === 0) return;
    blocks.push({ type: "list", items: listItems });
    listItems = [];
  }

  function flushTable() {
    const rows = tableRows.filter((row) => !isMarkdownTableSeparator(row));
    tableRows = [];
    if (rows.length === 0) return;
    if (rows.length === 1) {
      blocks.push({ type: "paragraph", text: rows[0]?.join(" ") ?? "" });
      return;
    }
    const headers = rows[0] ?? [];
    blocks.push({
      type: "table",
      headers,
      rows: rows.slice(1).map((row) => normalizeTableRow(row, headers.length)),
    });
  }

  for (const rawLine of cleanInvestigationAnalysisMarkdown(markdown).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      flushTable();
      continue;
    }
    const tableRow = parseMarkdownTableRow(line);
    if (tableRow) {
      flushParagraph();
      flushList();
      tableRows.push(tableRow);
      continue;
    }
    flushTable();
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading?.[1]) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: stripMarkdownSyntax(heading[1]) });
      continue;
    }
    const listItem = line.match(/^[-*]\s+(.+)$/);
    if (listItem?.[1]) {
      flushParagraph();
      listItems.push(stripMarkdownSyntax(listItem[1]));
      continue;
    }
    flushList();
    paragraph.push(stripMarkdownSyntax(line));
  }

  flushParagraph();
  flushList();
  flushTable();
  return blocks;
}

function parseMarkdownTableRow(line: string): string[] | null {
  const pipeCount = line.split("|").length - 1;
  if (!line.startsWith("|") && pipeCount < 2) return null;
  const trimmed = line.replace(/^\|/, "").replace(/\|$/, "");
  const cells = trimmed.split("|").map((cell) => stripMarkdownSyntax(cell.trim()));
  return cells.length >= 2 ? cells : null;
}

function isMarkdownTableSeparator(row: string[]): boolean {
  return row.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
}

function normalizeTableRow(row: string[], expectedLength: number): string[] {
  if (row.length === expectedLength) return row;
  if (row.length > expectedLength) return row.slice(0, expectedLength);
  return [...row, ...Array.from({ length: expectedLength - row.length }, () => "")];
}

function stripMarkdownSyntax(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}
