export function parsePagination(query, defaultLimit = 20, maxLimit = 50) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  const cursor = query.cursor ? String(query.cursor) : null;
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;

  return { limit, cursor, page, offset };
}

export function buildPaginationMeta(items, limit, getNextCursor = (item) => item?.id || item?.created_at) {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore && data.length > 0 ? getNextCursor(data[data.length - 1]) : null;

  return {
    data,
    meta: {
      hasMore,
      nextCursor,
    },
  };
}

