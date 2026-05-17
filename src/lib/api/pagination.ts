export interface PaginationOptions {
  defaultLimit: number;
  maxLimit: number;
}

export interface PaginationResult {
  total: number;
  offset: number;
  limit: number;
  returned: number;
  hasMore: boolean;
  nextOffset: number | null;
}

export function parsePagination(
  searchParams: URLSearchParams,
  options: PaginationOptions,
): { offset: number; limit: number } {
  const offset = clampNonNegativeInteger(searchParams.get("offset"), 0);
  const requestedLimit = clampNonNegativeInteger(searchParams.get("limit"), options.defaultLimit);
  return {
    offset,
    limit: Math.min(requestedLimit, options.maxLimit),
  };
}

export function paginateItems<TItem>(
  items: TItem[],
  page: { offset: number; limit: number },
): { items: TItem[]; pagination: PaginationResult } {
  const pagedItems = items.slice(page.offset, page.offset + page.limit);
  const nextOffset = page.offset + pagedItems.length;
  const hasMore = nextOffset < items.length;
  return {
    items: pagedItems,
    pagination: {
      total: items.length,
      offset: page.offset,
      limit: page.limit,
      returned: pagedItems.length,
      hasMore,
      nextOffset: hasMore ? nextOffset : null,
    },
  };
}

function clampNonNegativeInteger(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}
