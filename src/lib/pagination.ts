import { PAGE_DEFAULT, PAGE_MAX, type PageQuery } from "./store";

/** Parses ?limit, ?cursor and ?status; returns null when any of them is invalid. */
export function parsePageQuery(url: string, statuses: readonly string[]): PageQuery | null {
  const params = new URL(url).searchParams;
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? PAGE_DEFAULT : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > PAGE_MAX) return null;
  const status = params.get("status");
  if (status !== null && !statuses.includes(status)) return null;
  return { limit, cursor: params.get("cursor"), status };
}
