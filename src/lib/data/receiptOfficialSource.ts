import sourceCatalogPayload from "../../../data/sources/source-catalog.json" with { type: "json" };
import type { EvidenceReceipt } from "./evidenceReceipts.ts";
import type { SourceCatalogEntry } from "./sourceCatalog.ts";

type ReceiptSource = Pick<EvidenceReceipt, "sourceId" | "sourceUrl" | "locatorType">;

const sourcePageById = new Map(
  (sourceCatalogPayload as SourceCatalogEntry[]).map((source) => [
    source.sourceId,
    source.sourceUrl,
  ]),
);

export function getPublicOfficialSourceHref(receipt: ReceiptSource): string {
  const catalogSourceUrl = sourcePageById.get(receipt.sourceId);
  if (catalogSourceUrl && shouldPreferCatalogSourcePage(receipt)) {
    return catalogSourceUrl;
  }
  return receipt.sourceUrl;
}

function shouldPreferCatalogSourcePage(receipt: ReceiptSource): boolean {
  return receipt.locatorType === "official_dataset" || isDirectDatasetDownloadUrl(receipt.sourceUrl);
}

function isDirectDatasetDownloadUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const path = url.pathname.toLowerCase();
    return (
      path.includes("/download/") ||
      path.includes("/datastorefiles/") ||
      /\.(csv|json|xlsx|xls|zip|gz)$/.test(path)
    );
  } catch {
    return false;
  }
}
