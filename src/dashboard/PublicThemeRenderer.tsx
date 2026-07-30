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
  // Set by the backend's live-tick path (applyLiveTeamDiff in
  // Bulkpublic.controller.js) when `teams` contains only the team(s) that
  // changed since the last push, not the full roster — see
  // mergeMatchDataTeams below.
  isPartialTeams?: boolean;
}

interface OverallData {
  tournamentId: string;
  roundId: string;
  userId: string;
  teams: any[];
  createdAt: string;
  // Set by the backend's live-tick path (applyLiveOverallDiff in
  // Bulkpublic.controller.js) when `teams` contains only the team(s) whose
  // cumulative stats changed since the last push, not the full round
  // standings — see mergeOverallTeams below.
  isPartialTeams?: boolean;
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

// Shape of each entry the backend's updateDeadTeamList() computes and
// attaches at matchData.deadTeamList — see Bulkpublic.controller.js.
interface DeadTeamListEntry {
  teamId: string;
  teamTag: string;
  teamName: string;
  teamLogo: string;
  placePoints: number;
  rank: number;
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

const PublicThemeRenderer: React.FC = () => {
  // Module-level cache shared across all mounts of this component in the
  // current tab session — survives view switches and re-mounts, cleared
  // only on a hard page reload.
  const cacheRef = useRef<Map<string, any>>((PublicThemeRenderer as any)._cache ||= new Map());

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

  // Mirrors `matchData` state so the socket listener below (registered once
  // per [tournamentId, roundId], not re-registered on every matchData
  // change) can merge against the LATEST value instead of a stale closure.
  const matchDataRef = useRef<MatchData | null>(null);
  useEffect(() => {
    matchDataRef.current = matchData;
  }, [matchData]);

  // Same mirroring for overallData (round-wide standings) and matches (the
  // round's match list), so the socket listener below can merge/preserve
  // against the latest value rather than a stale closure.
  const overallDataRef = useRef<OverallData | null>(null);
  useEffect(() => {
    overallDataRef.current = overallData;
  }, [overallData]);

  const matchesRef = useRef<Match[]>([]);
  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  // The live-tick socket path now sends only the team(s) that actually
  // changed since the last push for this match (backend: applyLiveTeamDiff
  // in Bulkpublic.controller.js), flagged via `isPartialTeams`. Merge those
  // into the previously-known full matchData instead of replacing it
  // outright — everything downstream (this component's own state, and the
  // props it hands to LiveStats/Alerts/Dom) keeps seeing a complete object
  // either way. A payload without the flag (initial load, manual refresh,
  // or a backend that predates this change) is always a full snapshot and
  // is used as-is — this is the safe default for every non-live-tick path.
  const mergeMatchDataTeams = (prev: MatchData | null, incoming: any): MatchData | null => {
    if (!incoming) return null;
    if (!incoming.isPartialTeams || !prev || String((prev as any)._id) !== String(incoming._id)) {
      return incoming;
    }
    const teamMap = new Map(
      (prev.teams || []).map((t: any) => [String(t.teamId ?? t._id), t])
    );
    (incoming.teams || []).forEach((t: any) => {
      teamMap.set(String(t.teamId ?? t._id), t);
    });
    return { ...incoming, teams: Array.from(teamMap.values()) };
  };

  // Same idea as mergeMatchDataTeams, but for the round-wide cumulative
  // standings (backend: applyLiveOverallDiff). A partial push only carries
  // the team(s) whose totals actually changed since the last push for this
  // round; merge those into the previously-known full standings instead of
  // replacing them outright.
  const mergeOverallTeams = (prev: OverallData | null, incoming: any): OverallData | null => {
    if (!incoming) return null;
    if (
      !incoming.isPartialTeams ||
      !prev ||
      String(prev.roundId) !== String(incoming.roundId)
    ) {
      return incoming;
    }
    const teamMap = new Map(
      (prev.teams || []).map((t: any) => [String(t.teamId ?? t._id), t])
    );
    (incoming.teams || []).forEach((t: any) => {
      teamMap.set(String(t.teamId ?? t._id), t);
    });
    return { ...incoming, teams: Array.from(teamMap.values()) };
  };

  const applyBulkPayload = (bulk: any) => {
    setTournament(bulk.tournamentData);
    setRound(bulk.roundData);
    setMatch(bulk.matchesData?.current ?? null);
    setMatches(bulk.matchesData?.list ?? []);
    setMatchData(bulk.currentMatchData?.matchData ?? null);
    setDeadTeamList(sortDeadTeamList(bulk.currentMatchData?.matchData?.deadTeamList));
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

    socket.emit('joinBulkRoom', { tournamentId, roundId });

    // The server now emits 'bulkUpdate' as a MessagePack-encoded binary
    // payload (backend: encodeMsgpack in comsock.js) rather than a plain
    // object — socket.io-client hands it back as an ArrayBuffer/Uint8Array
    // in the browser, so decode it before touching any field on it.
    const handleBulkUpdate = (raw: ArrayBuffer | Uint8Array) => {
      const bulk = decode(new Uint8Array(raw as ArrayBuffer)) as any;
      setTournament(bulk.tournamentData);
      setRound(bulk.roundData);

      // matchesData.listUnchanged (backend: Bulkpublic.controller.js) means
      // the match list is identical to what was last sent for this round —
      // list comes back empty in that case, so keep what we already have
      // instead of replacing it with nothing.
      if (!bulk.matchesData?.listUnchanged) {
        matchesRef.current = bulk.matchesData?.list ?? [];
        setMatches(matchesRef.current);
      }

      const mergedOverallData = mergeOverallTeams(overallDataRef.current, bulk.overallData ?? null);
      overallDataRef.current = mergedOverallData;
      setOverallData(mergedOverallData);

      // Live ticks only ever carry a full matchDatasData list on rare
      // includeAll-style pushes; the common case is a single-entry
      // incremental update for just the match that changed (backend:
      // Bulkpublic.controller.js). Merge by matchId instead of replacing
      // the array outright — an empty/partial push means "no new
      // information for the rest," not "clear everything" (that used to
      // wipe Schedule/HighlightSchedule/OverAllData's WWCD data on every
      // unrelated live tick).
      const incomingMatchDatas = (bulk.matchDatasData ?? []).filter((e: any) => e?.matchData);
      if (incomingMatchDatas.length > 0) {
        setMatchDatas(prev => {
          const map = new Map(prev.map((m: any) => [String(m.matchId ?? m._id), m]));
          incomingMatchDatas.forEach((e: any) => map.set(String(e.matchId), e.matchData));
          return Array.from(map.values());
        });
      }

      const pushedMatchId = bulk.matchesData?.effectiveMatchId || bulk.matchesData?.current?._id;
      const isOurMatch = followSelected || !pushedMatchId || pushedMatchId === matchId;

      if (isOurMatch) {
        setMatch(bulk.matchesData?.current ?? null);
        const incomingMatchData = bulk.currentMatchData?.matchData ?? null;
        const mergedMatchData = mergeMatchDataTeams(matchDataRef.current, incomingMatchData);
        matchDataRef.current = mergedMatchData;
        setMatchData(mergedMatchData);
        // deadTeamList is always computed server-side from the FULL team
        // list before the live-tick trim happens, so it's complete on
        // every push regardless of isPartialTeams — no merge needed here.
        setDeadTeamList(sortDeadTeamList(incomingMatchData?.deadTeamList));
        refreshBackpackInfo(bulk);

        // Children still listen for the legacy 'liveMatchUpdate' socket
        // event to detect eliminations. The backend now only emits
        // 'bulkUpdate', so replay it locally to whatever listeners are
        // already registered on this socket instance — replay the MERGED
        // (complete) object, not the raw partial push, so a listener doing
        // a full replace of its own (e.g. Dom.tsx's data.teams branch)
        // never sees a truncated team list.
        if (mergedMatchData) {
          socket.listeners('liveMatchUpdate').forEach((listener: any) => {
            try {
              listener(mergedMatchData);
            } catch (e) {
              console.error('Error replaying liveMatchUpdate to listener', e);
            }
          });
        }
      }
    };

    socket.on('bulkUpdate', handleBulkUpdate);

    return () => {
      socket.off('bulkUpdate', handleBulkUpdate);
      socket.emit('leaveBulkRoom', { tournamentId, roundId });
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