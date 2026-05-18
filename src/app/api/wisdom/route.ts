import { NextResponse } from "next/server";
import { getWisdomEntries, searchWisdomEntries } from "@/lib/wisdom";
import type { Mode } from "@/lib/wisdom-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const mode = (searchParams.get("mode") ?? "Money") as Mode;
  const entries = await getWisdomEntries();

  return NextResponse.json({
    entries: query.trim() ? searchWisdomEntries(entries, query, mode, entries.length) : entries,
  });
}
