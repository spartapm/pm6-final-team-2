import { NextResponse } from "next/server";
import { buildWorksCatalogFromSheets } from "@/lib/buildWorksCatalog";
import type { Work } from "@/lib/types";

/** 서버 메모리 캐시 — 앱을 열 때마다 API는 호출하되, 시트는 TTL 동안 재사용 */
const CACHE_TTL_MS = 60_000;

type CacheBox = {
  works: Work[];
  fetchedAt: number;
  inflight: Promise<Work[]> | null;
};

const globalForWorks = globalThis as typeof globalThis & {
  __allbluWorksCache?: CacheBox;
};

function getCache(): CacheBox {
  if (!globalForWorks.__allbluWorksCache) {
    globalForWorks.__allbluWorksCache = {
      works: [],
      fetchedAt: 0,
      inflight: null,
    };
  }
  return globalForWorks.__allbluWorksCache;
}

async function loadWorks(): Promise<{ works: Work[]; cached: boolean }> {
  const cache = getCache();
  const now = Date.now();
  if (cache.works.length && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { works: cache.works, cached: true };
  }

  if (!cache.inflight) {
    cache.inflight = buildWorksCatalogFromSheets()
      .then((works) => {
        cache.works = works;
        cache.fetchedAt = Date.now();
        cache.inflight = null;
        return works;
      })
      .catch((error) => {
        cache.inflight = null;
        throw error;
      });
  }

  const works = await cache.inflight;
  return { works, cached: false };
}

export async function GET() {
  try {
    const { works, cached } = await loadWorks();
    return NextResponse.json(
      {
        works,
        count: works.length,
        source: cached ? "cache" : "google-sheet",
        fetchedAt: getCache().fetchedAt,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[api/works]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load works",
      },
      { status: 502 }
    );
  }
}
