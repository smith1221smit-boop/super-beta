import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { decode } from '@msgpack/msgpack';
import api from '../login/api.tsx';
import SocketManager from '../dashboard/socketManager.tsx';

/* ============================================================================
   THEME COMPONENT REGISTRY
   ============================================================================
   This used to be ~150 individual `import X from '../Themes/ThemeN/.../Y.tsx'`
   lines plus a hand-written `themes` object repeating every key per theme.
   That listing silently going stale (an object claiming a key the folder
   doesn't have) is exactly what caused the "Element type is invalid" crash —
   Theme3/Theme1 etc. had no Achive/LiveData component but the switch
   statement rendered them unconditionally.

   Instead: require.context walks every file under Themes/ once at build
   time and the registry is built from whatever actually exists on disk.
   Add a new theme folder or a new view file and it's live automatically —
   no import line, no object entry to remember to add.

   NOTE: require.context is a webpack build-time macro (this project builds
   with CRA/webpack — see the bundle.js path in your dev server errors). If
   this project ever moves to Vite, this block needs to be replaced with
   Vite's equivalent eager import.meta.glob call instead.
   ============================================================================ */

// @ts-ignore -- require.context is injected by webpack, not a real Node API
const themeFiles = (require as any).context(
  '../Themes',
  true,
  /\/(on-screen|off-screen)\/.+\.tsx$/
);

// File names on disk don't always match the canonical view key used
// elsewhere in the app (query params, DisplayHud tile keys, etc). This is
// the one place that mapping lives — everything else works off lowercase
// comparisons so casing differences (OverAllData.tsx vs "OverallData")
// never matter on their own.
const KEY_ALIASES: Record<string, string> = {
  '1strunnerup': 'firstrunnerup',   // 1stRunnerUp.tsx
  '2ndrunnerup': 'secondrunnerup',  // 2ndRunnerUp.tsx
  achieve: 'achive',                // Achieve.tsx -> view=Achive (URL back-compat)
};

const canonicalize = (fileBase: string): string => {
  const lower = fileBase.toLowerCase();
  return KEY_ALIASES[lower] || lower;
};

type ComponentRegistry = Record<string, Record<string, React.ComponentType<any>>>;

function buildRegistry(): ComponentRegistry {
  const registry: ComponentRegistry = {};
  themeFiles.keys().forEach((path: string) => {
    // path shape: "./Theme1/on-screen/Lower.tsx"
    const match = path.match(/^\.\/(Theme\d+)\/(?:on-screen|off-screen)\/(.+)\.tsx$/);
    if (!match) return;
    const [, themeName, fileBase] = match;
    const mod = themeFiles(path);
    const Component = mod?.default;
    if (!Component) return; // no default export — skip rather than register `undefined`
    registry[themeName] ||= {};
    registry[themeName][canonicalize(fileBase)] = Component;
  });
  return registry;
}

const THEME_REGISTRY = buildRegistry();
const AVAILABLE_THEMES = Object.keys(THEME_REGISTRY);

// A few views were never given their own file per theme and instead
// deliberately reused another component (Theme1's "Mvp" view just showed
// MatchFragrs) or another theme's file entirely (Theme1/Theme3's
// RosterShowCase view always rendered Theme4's component, because no
// Theme1/off-screen/RosterShowCase.tsx or Theme3 equivalent exists on
// disk). Preserved explicitly here since a folder scan alone can't infer
// "reuse this other thing" — everything else is fully automatic.
const FALLBACKS: Record<string, { sameTheme?: string; theme?: string; key?: string }> = {
  mvp: { sameTheme: 'matchfragrs' },
  highlightpoints: { sameTheme: 'overalldata' },
  highlightschedule: { sameTheme: 'schedule' },
  rostershowcase: { theme: 'Theme4', key: 'rostershowcase' },
};

function resolveComponent(theme: string, rawKey: string): React.ComponentType<any> | null {
  const key = rawKey.toLowerCase();
  const themeSet = THEME_REGISTRY[theme] || THEME_REGISTRY['Theme1'];

  if (themeSet?.[key]) return themeSet[key];

  const fb = FALLBACKS[key];
  if (fb?.sameTheme && themeSet?.[fb.sameTheme]) return themeSet[fb.sameTheme];
  if (fb?.theme && fb?.key) return THEME_REGISTRY[fb.theme]?.[fb.key] || null;

  return null;
}

// ============================================================================
// Types
// ============================================================================
interface Tournament {
  _id: string;
  tournamentName: string;
  torLogo?: string;
  day?: string;
  primaryColor?: string;
  secondaryColor?: string;
  overlayBg?: string;
}

interface Round {
  _id: string;
  roundName: string;
  apiEnable?: boolean;
  day: string;
}

interface Match {
  _id: string;
  matchName?: string;
  matchNo?: number;
  _matchNo?: number;
  groups?: string[];
}

interface MatchData {
  _id: string;
  matchId: string;
  userId: string;
  teams: any[];
  deadTeamList?: DeadTeamListEntry[];
}

interface OverallData {
  tournamentId: string;
  roundId: string;
  userId: string;
  teams: any[];
  createdAt: string;
}

interface BackpackInfo {
  userId: string;
  tournamentId: string;
  roundId: string;
  matchId: string;
  matchDataId: string;
  teambackpackinfo: {
    TeamBackPackList: any[];
  };
}

// Shape of each entry in the client-side-computed elimination list — see
// isTeamAllDead/computeDeadTeamList below. No longer sourced from the
// backend's matchData.deadTeamList field.
interface DeadTeamListEntry {
  teamId: string;
  teamTag: string;
  teamName: string;
  teamLogo: string;
  placePoints: number;
  rank: number | null;
  totalKills: number;
  deadAt: string;
}

const VIEWS_NEEDING_BACKPACK = new Set(['Upper']);

const PLACEHOLDER_STYLE: React.CSSProperties = {
  width: '100%',
  height: '100%',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
};

// Consumers (Alerts, in particular) build their elimination-alert queue by
// walking this array in order, so it must always be in actual death order —
// oldest elimination first — no matter what order the backend happened to
// return entries in, or what order a burst of socket updates lands in.
//
// Ordering rules, in priority order:
//   1. deadAt ascending — the team eliminated earlier (e.g. 3:45) sorts
//      before the team eliminated later (e.g. 3:55).
//   2. rank descending, used only when deadAt is missing on one/both sides
//      or two entries land on the exact same timestamp — a HIGHER rank
//      number is a WORSE placement, and in a battle royale a worse
//      placement always means that team went out earlier. So rank 10
//      sorts before rank 9.
const sortDeadTeamList = (list?: DeadTeamListEntry[] | null): DeadTeamListEntry[] => {
  if (!list || list.length === 0) return [];
  return [...list].sort((a, b) => {
    const aTime = a.deadAt ? new Date(a.deadAt).getTime() : NaN;
    const bTime = b.deadAt ? new Date(b.deadAt).getTime() : NaN;
    const aValid = !Number.isNaN(aTime);
    const bValid = !Number.isNaN(bTime);

    // Both have real timestamps and they differ: earlier time wins outright.
    if (aValid && bValid && aTime !== bTime) return aTime - bTime;
    // Only one side has a usable timestamp: prefer the one that does.
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;

    // Same timestamp (or neither has one): fall back to rank, worst-first.
    return (b.rank ?? 0) - (a.rank ?? 0);
  });
};

// ============================================================================
// Client-side team-elimination detection
// ============================================================================
// A team only counts as eliminated once its FULL 4-player roster is present
// AND every player who actually appeared in the live feed has either
// liveState === 5 or bHasDied === true — a short/partial player list (a
// player's data not having arrived yet this tick) must never be mistaken
// for a wipe.
//
// didNotPlay players (backend: pubgApiMatchData.controller.js pads a
// team's roster with registered-but-never-observed players at 0 stats so
// the team never displays short a player) are excluded from the "every"
// check — they sit at liveState 0 forever since they never actually
// played, so counting them would mean a team with even one bench player
// could never be flagged eliminated. `played.length > 0` guards the
// pathological case of an all-bench "team" (nobody ever actually played)
// — there's no evidence anyone died, so it's never eliminated.
const isTeamAllDead = (team: any): boolean => {
  if (!Array.isArray(team.players) || team.players.length !== 4) return false;

  const played = team.players.filter((p: any) => !p.didNotPlay);

  return (
    played.length > 0 &&
    played.every(
      (p: any) => p.liveState === 5 || p.bHasDied === true
    )
  );
};

interface DeadTeamSnapshot {
  teamId: any;
  teamTag: string;
  teamName: string;
  teamLogo: string;
  placePoints: number;
  rank: number | null;
  totalKills: number;
  deadAt: number; // epoch ms
}

// Persists across ticks (held in a ref) so a team's elimination
// timestamp/locked stats are stamped ONCE, the first tick it's confirmed
// dead — not recomputed (and drifting) on every subsequent tick, matching
// what unsortteams.ts expects ("locked" points that stop changing after
// death). Scoped per-match: `matchId` mismatch wipes the tracker so a
// match switch (followSelected) never carries over a previous match's
// dead teams.
interface DeathTracker {
  matchId: string | null;
  dead: Map<string, DeadTeamSnapshot>;
}

const computeDeadTeamList = (
  matchId: string | null | undefined,
  teams: any[] | undefined,
  trackerRef: React.MutableRefObject<DeathTracker>
): DeadTeamListEntry[] => {
  if (trackerRef.current.matchId !== (matchId ?? null)) {
    trackerRef.current = { matchId: matchId ?? null, dead: new Map() };
  }
  const { dead } = trackerRef.current;

  if (Array.isArray(teams)) {
    for (const team of teams) {
      const teamKey = String(team.teamId ?? team._id ?? '');
      if (!teamKey || dead.has(teamKey)) continue;
      if (isTeamAllDead(team)) {
        const totalKills = (team.players || []).reduce((sum: number, p: any) => sum + (p.killNum || 0), 0);
        dead.set(teamKey, {
          teamId: team.teamId ?? team._id,
          teamTag: team.teamTag,
          teamName: team.teamName,
          teamLogo: team.teamLogo,
          placePoints: team.placePoints,
          rank: team.rank ?? null,
          totalKills,
          deadAt: Date.now(),
        });
      }
    }
  }

  return Array.from(dead.values()).map((snap) => ({
    ...snap,
    deadAt: new Date(snap.deadAt).toISOString(),
  }));
};

const PublicThemeRenderer: React.FC = () => {
  // Module-level cache shared across all mounts of this component in the
  // current tab session — survives view switches and re-mounts, cleared
  // only on a hard page reload.
  const cacheRef = useRef<Map<string, any>>((PublicThemeRenderer as any)._cache ||= new Map());

  // Backs computeDeadTeamList — see its comment above.
  const deathTrackerRef = useRef<DeathTracker>({ matchId: null, dead: new Map() });

  // computeDeadTeamList's backing Map only ever grows (an entry, once
  // recorded, is never re-mutated — see its comment above), so the dead
  // team list only actually CHANGES when its length changes. Tracking that
  // lets the socket handler below skip sortDeadTeamList's copy+sort and the
  // setDeadTeamList render on the vast majority of ticks where no team
  // newly died.
  const lastDeadTeamListLengthRef = useRef<number>(0);

  // Mirrors the latest matchData outside of React's state so a burst of
  // several chunk-carrying liveMatchUpdate pushes (see below) can merge each
  // one against the truly-latest teams array, not a stale snapshot from
  // before an earlier chunk in the same burst was applied — setState's
  // result isn't readable synchronously, but this ref is.
  const matchDataRef = useRef<MatchData | null>(null);


  const cachedGet = async (url: string, signal: AbortSignal, ttlMs = 5000) => {
    const cache = cacheRef.current;
    const hit = cache.get(url);
    if (hit && Date.now() - hit.time < ttlMs) {
      return hit.response;
    }
    const response = await api.get(url, { signal });
    cache.set(url, { response, time: Date.now() });
    return response;
  };

  // The bulk endpoint now responds with a MessagePack-encoded body
  // (backend: msgpackCacheMiddleware in middleware/cache.js), so it needs
  // its own fetch that asks axios for a raw arraybuffer and decodes it,
  // rather than letting axios auto-parse as JSON. Caches the decoded plain
  // object, same as cachedGet does for its response, so repeated calls
  // within ttlMs don't re-decode.
  const cachedGetMsgpack = async (url: string, signal: AbortSignal, ttlMs = 5000) => {
    const cache = cacheRef.current;
    const hit = cache.get(url);
    if (hit && Date.now() - hit.time < ttlMs) {
      return hit.data;
    }
    const response = await api.get(url, { signal, responseType: 'arraybuffer' });
    const data = decode(new Uint8Array(response.data)) as any;
    cache.set(url, { data, time: Date.now() });
    return data;
  };

  const { tournamentId, roundId, matchId } = useParams<{
    tournamentId: string;
    roundId: string;
    matchId: string;
  }>();
  const [searchParams] = useSearchParams();
  const requestedTheme = searchParams.get('theme') || 'Theme1';
  const view = searchParams.get('view') || 'Lower';
  const followSelected = (searchParams.get('followSelected') || 'false').toLowerCase() === 'true';
  const selectedScheduleMatchIds = searchParams.get('scheduleMatches')?.split(',') || [];

  // Silently fall back to Theme1 for an unknown/unbuilt theme (e.g. a stale
  // ?theme=Theme2 link) rather than rendering nothing.
  const theme = AVAILABLE_THEMES.includes(requestedTheme) ? requestedTheme : 'Theme1';
  const getComp = (key: string) => resolveComponent(theme, key);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [deadTeamList, setDeadTeamList] = useState<DeadTeamListEntry[]>([]);
  const [overallData, setOverallData] = useState<OverallData | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchDatas, setMatchDatas] = useState<MatchData[]>([]);
  const [backpackInfo, setBackpackInfo] = useState<BackpackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyBulkPayload = (bulk: any) => {
    setTournament(bulk.tournamentData);
    setRound(bulk.roundData);
    setMatch(bulk.matchesData?.current ?? null);
    setMatches(bulk.matchesData?.list ?? []);

    const initialMatchData = bulk.currentMatchData?.matchData ?? null;
    // Computed client-side, not read off bulk.currentMatchData.matchData's
    // own deadTeamList field — see isTeamAllDead/computeDeadTeamList above.
    const computedDeadTeamList = computeDeadTeamList(
      initialMatchData?.matchId,
      initialMatchData?.teams,
      deathTrackerRef
    );
    const fullMatchData = initialMatchData ? { ...initialMatchData, deadTeamList: computedDeadTeamList } : null;
    matchDataRef.current = fullMatchData;
    setMatchData(fullMatchData);
    lastDeadTeamListLengthRef.current = computedDeadTeamList.length;
    setDeadTeamList(sortDeadTeamList(computedDeadTeamList));

    setOverallData(bulk.overallData ?? null);
    setMatchDatas(
      (bulk.matchDatasData ?? [])
        .map((entry: any) => entry.matchData)
        .filter(Boolean)
    );
  };

  const refreshBackpackInfo = async (bulk: any, signal?: AbortSignal) => {
    if (!VIEWS_NEEDING_BACKPACK.has(view)) return;
    const effectiveMatchId = bulk.matchesData?.effectiveMatchId || matchId;
    const matchDataId = bulk.currentMatchData?.matchData?._id;
    if (!matchDataId) return;
    try {
      const backpackRes = await cachedGet(
        `public/bagPack/tournament/${tournamentId}/round/${roundId}/match/${effectiveMatchId}/matchdata/${matchDataId}`,
        signal as AbortSignal,
        3000
      );
      setBackpackInfo(backpackRes.data);
    } catch (err) {
      console.error('Failed to fetch backpack info:', err);
      setBackpackInfo(null);
    }
  };

  useEffect(() => {
    if (!tournamentId || !roundId) return;

    const controller = new AbortController();
    let cancelled = false;
    const LIVE_TTL = 3000;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set('view', view);
        if (followSelected) params.set('followSelected', 'true');
        const query = `?${params.toString()}`;

        const bulk = await cachedGetMsgpack(
          `public/bulk/${tournamentId}/${roundId}/${matchId}${query}`,
          controller.signal,
          LIVE_TTL
        );

        if (cancelled) return;
        applyBulkPayload(bulk);

        await refreshBackpackInfo(bulk, controller.signal);
        if (cancelled) return;
      } catch (err: any) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch data:', err);
        if (!cancelled) setError('Failed to load tournament data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [tournamentId, roundId, matchId, followSelected, view]);

  useEffect(() => {
    if (!tournamentId || !roundId) return;

    const socketManager = SocketManager.getInstance();
    const socket = socketManager.connect();

    // Room is scoped per ROUND (not per match) — backend:
    // pubgApiMatchData.controller.js pushes whichever match is currently
    // selected for this round into `round:${tournamentId}:${roundId}`, so a
    // followSelected overlay keeps receiving updates across a match switch
    // without needing to rejoin anything.
    socket.emit('joinRoundRoom', { tournamentId, roundId });

    // The server emits 'liveMatchUpdate'/'overallDataUpdate' into THIS room
    // as MessagePack-encoded binary payloads (backend: encodeMsgpack in
    // pubgApiMatchData.controller.js/overall.controller.js) — socket.io-
    // client hands them back as an ArrayBuffer/Uint8Array, so decode before
    // touching any field. Both are always FULL objects, never a diff — a
    // missed tick is simply caught up by the next one.
    //
    // BUT: this same socket can ALSO be a member of a `user:${userId}`
    // room at the same time — the backend auto-joins any socket carrying a
    // valid session cookie into that room regardless of whether it's the
    // dashboard or this public overlay (e.g. viewing the overlay in the
    // same logged-in browser). Several PLAIN-JSON emits reuse these exact
    // event names for that room (matchData.controller.js's
    // emitOverallUpdateAsync, pubgApiMatchData.controller.js's dashboard
    // liveMatchUpdate emit), so a plain object can legitimately arrive
    // here too. Decode defensively instead of assuming binary — mirrors
    // decodeTotalPlayerListPayload's same pass-through-if-not-binary
    // pattern on the backend.
    const decodeIncoming = (raw: unknown): any => {
      if (raw instanceof ArrayBuffer || raw instanceof Uint8Array) {
        return decode(new Uint8Array(raw as ArrayBuffer));
      }
      return raw;
    };

    // incoming.teams is only a SLICE of this match's teams now (backend:
    // TEAMS_PER_LIVE_CHUNK) — merge by teamId into the latest known state
    // instead of replacing it wholesale, so:
    //   - a team not in THIS chunk keeps showing its last-known (still
    //     correct, just not-yet-refreshed-this-tick) values rather than
    //     being blanked out or reverted to something older/stale, and
    //   - a team IS updated the instant its own chunk lands, instead of the
    //     whole board waiting on the slowest chunk of the tick.
    // Applied immediately, with no client-side throttling: the backend's
    // own EVENT_DEBOUNCE_MS already guarantees at least ~150ms between
    // actual ticks, so chunks arriving faster than that are always genuine,
    // non-redundant pieces of the SAME tick — queuing/delaying them would
    // only add latency for no coalescing benefit.
    const processLiveMatchUpdate = (raw: ArrayBuffer | Uint8Array) => {
      const incoming = decodeIncoming(raw);
      if (!incoming) return;

      // A followSelected overlay wants every push for this round (whichever
      // match is currently selected); a fixed-match overlay only wants
      // pushes for its own matchId.
      const isOurMatch = followSelected || String(incoming.matchId) === String(matchId);
      if (!isOurMatch) return;

      const incomingTeams: any[] = Array.isArray(incoming.teams) ? incoming.teams : [];
      const prevMatchData = matchDataRef.current;
      const prevTeams: any[] =
        prevMatchData && String(prevMatchData.matchId) === String(incoming.matchId)
          ? prevMatchData.teams || []
          : [];

      const incomingById = new Map(incomingTeams.map((t) => [String(t.teamId ?? t._id), t]));
      const mergedTeams = prevTeams.map((t) => {
        const key = String(t.teamId ?? t._id);
        return incomingById.has(key) ? incomingById.get(key) : t;
      });
      const knownIds = new Set(prevTeams.map((t) => String(t.teamId ?? t._id)));
      for (const t of incomingTeams) {
        const key = String(t.teamId ?? t._id);
        if (!knownIds.has(key)) mergedTeams.push(t);
      }

      // Computed client-side, not read off incoming.deadTeamList — see
      // isTeamAllDead/computeDeadTeamList above. Safe to call with just
      // this chunk's teams: the backing Map only ever grows, and this
      // always returns the full cumulative dead-list regardless of which
      // teams were present in this particular call.
      const computedDeadTeamList = computeDeadTeamList(incoming.matchId, incomingTeams, deathTrackerRef);

      const nextMatchData = {
        ...(prevMatchData || {}),
        ...incoming,
        teams: mergedTeams,
        deadTeamList: computedDeadTeamList,
      };
      matchDataRef.current = nextMatchData;
      setMatchData(nextMatchData);

      // Skip the copy+sort and the extra render when no team newly died
      // this tick (see lastDeadTeamListLengthRef above).
      if (computedDeadTeamList.length !== lastDeadTeamListLengthRef.current) {
        lastDeadTeamListLengthRef.current = computedDeadTeamList.length;
        setDeadTeamList(sortDeadTeamList(computedDeadTeamList));
      }

      refreshBackpackInfo({
        matchesData: { effectiveMatchId: incoming.matchId },
        currentMatchData: { matchData: nextMatchData },
      });
    };

    const handleLiveMatchUpdate = (raw: ArrayBuffer | Uint8Array) => {
      processLiveMatchUpdate(raw);
    };

    const handleOverallDataUpdate = (raw: ArrayBuffer | Uint8Array) => {
      const incoming = decodeIncoming(raw);
      if (!incoming) return;
      setOverallData(incoming);
    };

    socket.on('liveMatchUpdate', handleLiveMatchUpdate);
    socket.on('overallDataUpdate', handleOverallDataUpdate);

    return () => {
      socket.off('liveMatchUpdate', handleLiveMatchUpdate);
      socket.off('overallDataUpdate', handleOverallDataUpdate);
      socket.emit('leaveRoundRoom', { tournamentId, roundId });
      socketManager.disconnect();
    };
  }, [tournamentId, roundId]);

  const renderView = () => {
    if (loading) return <div style={PLACEHOLDER_STYLE} />;

    if (error) {
      return <div style={{ ...PLACEHOLDER_STYLE, color: '#ff0000' }}>{error}</div>;
    }

    if (!tournament) {
      return <div style={PLACEHOLDER_STYLE}>No tournament data found</div>;
    }

    // Renders the resolved component for `key`, or a clear in-place message
    // instead of crashing when a theme has no matching component.
    const renderComp = (key: string, props: Record<string, any>) => {
      const Comp = getComp(key);
      if (!Comp) {
        return <div style={PLACEHOLDER_STYLE}>"{view}" isn't available on {theme}.</div>;
      }
      return <Comp {...props} />;
    };

    switch (view) {
      case 'Lower':
        return renderComp('Lower', { tournament, round, match, totalMatches: matches.length, matches });
      case 'Upper':
        return renderComp('Upper', { tournament, round, match, matchData, backpackInfo });
      case 'Dom':
        return renderComp('Dom', { tournament, round, match, matchData });
      case 'Achive':
        return renderComp('Achive', { tournament, round, match, matchData });
      case 'Alerts':
        return renderComp('Alerts', { tournament, round, match, matchData, deadTeamList });
      case 'LiveStats':
        return renderComp('LiveStats', { tournament, round, match, matchData, overallData });
      case 'LiveFrags':
        return renderComp('LiveFrags', { tournament, round, match, matchData });
      case 'MatchData':
        return renderComp('MatchData', { tournament, round, match, matchData });
      case 'MatchFragrs':
        return renderComp('MatchFragrs', { tournament, round, match, matchData });
      case 'WwcdSummary':
        return renderComp('WwcdSummary', { tournament, round, match, matchData });
      case 'WwcdStats':
        return renderComp('WwcdStats', { tournament, round, match, matchData });
      case 'OverAllData':
        return renderComp('OverallData', { tournament, round, match, matchData, overallData, matches, matchDatas });
      case 'OverallFrags':
        return renderComp('OverallFrags', { tournament, round, match, matchData, overallData, matches, matchDatas });
      case 'Schedule':
        return renderComp('Schedule', { tournament, round, matches, matchDatas, selectedScheduleMatches: selectedScheduleMatchIds });
      case 'CommingUpNext':
        return renderComp('CommingUpNext', { tournament, round, match, matches });
      case 'Champions':
        return renderComp('Champions', { tournament, round, matchData, overallData });
      case '1stRunnerUp':
        return renderComp('FirstRunnerUp', { tournament, round, overallData });
      case '2ndRunnerUp':
        return renderComp('SecondRunnerUp', { tournament, round, overallData });
      case 'EventMvp':
        return renderComp('EventMvp', { tournament, round, overallData, matches, matchDatas });
      case 'MatchSummary':
        return renderComp('MatchSummary', { tournament, round, match, matchData });
      case 'playerH2H':
        return renderComp('PlayerH2H', { tournament, round, match, matchData });
      case 'TeamH2H':
        return renderComp('TeamH2H', { tournament, round, match, matchData });
      case 'intro':
        return renderComp('Intro', { tournament, round, match, matchData });
      case 'mapPreview':
        return renderComp('MapPreview', { tournament, round, match, matchData });
      case 'slots':
        return renderComp('Slots', { tournament, round, match, matchData });
      case 'mvp':
        return renderComp('Mvp', { tournament, round, match, matchData, backpackInfo });
      case 'highlightPoints':
        return renderComp('HighlightPoints', { tournament, round, match, matchData, overallData, matches, matchDatas });
      case 'HighlightSchedule':
        return renderComp('HighlightSchedule', { tournament, round, matches, matchDatas, selectedScheduleMatches: selectedScheduleMatchIds });
      case 'RosterShowCase':
        return renderComp('RosterShowCase', { tournament, round, match, matchData });
      case 'PlayerSwitch':
        return renderComp('PlayerSwitch', { match, matchData, loading, error });
      case 'LiveData':
        return renderComp('LiveData', { tournament, round, match, matchData, overallData });
      default:
        return <div style={PLACEHOLDER_STYLE}>View "{view}" not implemented yet.</div>;
    }
  };

  return (
    <div style={{ width: '1920px', height: '1400px', top: 0, left: 0, margin: 0, padding: 0, overflow: 'hidden' }}>
      {renderView()}
    </div>
  );
};

export default PublicThemeRenderer;