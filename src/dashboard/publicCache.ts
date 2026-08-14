// Global localStorage-backed cache for the public OBS overlay data path
// (PublicThemeRenderer.tsx). Wraps the existing getCache/setCache
// primitives (cache.tsx) rather than reinventing localStorage mechanics —
// this file only owns the key scheme and TTL policy for the bulk payload.
//
// Two tiers, split along the same boundary buildBulkPayload already uses
// server-side (Bulkpublic.controller.js): a "static" slice that barely
// changes and is shared across every view/match of the same round (so the
// several concurrent OBS browser sources for one round — Upper, Lower,
// LiveStats, Alerts, etc. — can share it), and a "live" slice scoped to the
// exact match/view/followSelected combo, short-TTL, only ever used to paint
// the very first frame after a reload before the real fetch lands.
import { getCache, setCache } from './cache.tsx';

const STATIC_TTL_MS = 10 * 60 * 1000; // tournament/round/matches list rarely change
const LIVE_TTL_MS = 45 * 1000; // just long enough to paint a refresh moments after the last update

const staticKey = (tournamentId: string, roundId: string) =>
  `pubCache:v1:static:${tournamentId}:${roundId}`;

const liveKey = (
  tournamentId: string,
  roundId: string,
  matchId: string | undefined,
  view: string,
  followSelected: boolean
) => `pubCache:v1:live:${tournamentId}:${roundId}:${matchId || ''}:${view}:${followSelected}`;

interface StaticSlice {
  tournamentData: any;
  roundData: any;
  matchesList: any[];
}

interface LiveSlice {
  matchesCurrent: any;
  effectiveMatchId: any;
  matchDatasData: any[];
  currentMatchData: any;
  overallData: any;
}

export interface CachedBulk {
  tournamentData: any;
  roundData: any;
  matchesData: { list: any[]; current: any; effectiveMatchId: any };
  matchDatasData: any[];
  currentMatchData: any;
  overallData: any;
}

// Reassembles a bulk-shaped object from whichever tier(s) are still fresh —
// the same shape applyBulkPayload() already expects from a live fetch, so
// PublicThemeRenderer can seed its state from this with no special-casing.
// Returns null only when NEITHER tier has anything usable.
export function readCachedBulk(
  tournamentId: string,
  roundId: string,
  matchId: string | undefined,
  view: string,
  followSelected: boolean
): CachedBulk | null {
  const staticSlice = getCache(staticKey(tournamentId, roundId), STATIC_TTL_MS) as StaticSlice | null;
  const liveSlice = getCache(
    liveKey(tournamentId, roundId, matchId, view, followSelected),
    LIVE_TTL_MS
  ) as LiveSlice | null;

  if (!staticSlice && !liveSlice) return null;

  return {
    tournamentData: staticSlice?.tournamentData ?? null,
    roundData: staticSlice?.roundData ?? null,
    matchesData: {
      list: staticSlice?.matchesList ?? [],
      current: liveSlice?.matchesCurrent ?? null,
      effectiveMatchId: liveSlice?.effectiveMatchId ?? null,
    },
    matchDatasData: liveSlice?.matchDatasData ?? [],
    currentMatchData: liveSlice?.currentMatchData ?? null,
    overallData: liveSlice?.overallData ?? null,
  };
}

// Write-through after a real fetch succeeds. Deliberately never called from
// the socket tick handlers (liveMatchUpdate/overallDataUpdate can arrive
// every ~150ms) — this cache only needs to be fresh enough for one
// first-paint frame after a reload, not live-accurate on every tick.
export function writeCachedBulk(
  tournamentId: string,
  roundId: string,
  matchId: string | undefined,
  view: string,
  followSelected: boolean,
  bulk: CachedBulk
): void {
  setCache(staticKey(tournamentId, roundId), {
    tournamentData: bulk.tournamentData ?? null,
    roundData: bulk.roundData ?? null,
    matchesList: bulk.matchesData?.list ?? [],
  });

  setCache(liveKey(tournamentId, roundId, matchId, view, followSelected), {
    matchesCurrent: bulk.matchesData?.current ?? null,
    effectiveMatchId: bulk.matchesData?.effectiveMatchId ?? null,
    matchDatasData: bulk.matchDatasData ?? [],
    currentMatchData: bulk.currentMatchData ?? null,
    overallData: bulk.overallData ?? null,
  });
}
