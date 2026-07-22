import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../login/api.tsx';
import SocketManager from '../dashboard/socketManager.tsx';

// Import theme components
import Lower from '../Themes/Theme1/on-screen/Lower.tsx';
import Upper from '../Themes/Theme1/on-screen/Upper.tsx';
import Dom from '../Themes/Theme1/on-screen/Dom.tsx';
import Alerts from '../Themes/Theme1/on-screen/Alerts.tsx';
import LiveStats from '../Themes/Theme1/on-screen/LiveStats.tsx';
import LiveFrags from '../Themes/Theme1/on-screen/LiveFrags.tsx';
import MatchData from '../Themes/Theme1/off-screen/MatchData.tsx';
import MatchFragrs from '../Themes/Theme1/off-screen/MatchFragrs.tsx';
import WwcdSummary from '../Themes/Theme1/off-screen/WwcdSummary.tsx';
import WwcdStats from '../Themes/Theme1/off-screen/WwcdStats.tsx'
import OverallData from   '../Themes/Theme1/off-screen/OverAllData.tsx'
import OverallFrags from '../Themes/Theme1/off-screen/OverallFrags.tsx'
import Schedule from '../Themes/Theme1/off-screen/Schedule.tsx'
import CommingUpNext from '../Themes/Theme1/off-screen/CommingUpNext.tsx'
import Champions from '../Themes/Theme1/off-screen/Champions.tsx'
import FirstRunnerUp from '../Themes/Theme1/off-screen/1stRunnerUp.tsx'
import SecondRunnerUp from '../Themes/Theme1/off-screen/2ndRunnerUp.tsx'
import EventMvp from '../Themes/Theme1/off-screen/EventMvp.tsx'
import MatchSummary from '../Themes/Theme1/off-screen/MatchSummary.tsx'
import PlayerH2H from '../Themes/Theme1/off-screen/playerh2h.tsx'
import TeamH2H from '../Themes/Theme1/off-screen/teamh2h.tsx'
import ZoneClose from '../Themes/Theme1/on-screen/zoneClose.tsx'
import Intro from '../Themes/Theme1/on-screen/intro.tsx'
import MapPreview from '../Themes/Theme1/off-screen/mapPreview.tsx'
import Slots from '../Themes/Theme1/off-screen/slots.tsx'
import RosterShowCase from '../Themes/Theme4/off-screen/RosterShowCase.tsx'
import PlayerSwitch from '../Themes/Theme4/off-screen/PlayerSwitch.tsx'

// Theme3 imports
import Lower3 from '../Themes/Theme3/on-screen/Lower.tsx';
import Upper3 from '../Themes/Theme3/on-screen/Upper.tsx';
import Dom3 from '../Themes/Theme3/on-screen/Dom.tsx';
import Alerts3 from '../Themes/Theme3/on-screen/Alerts.tsx';
import LiveStats3 from '../Themes/Theme3/on-screen/LiveStats.tsx';
import LiveFrags3 from '../Themes/Theme3/on-screen/LiveFrags.tsx';
import MatchData3 from '../Themes/Theme3/off-screen/MatchData.tsx';
import MatchFragrs3 from '../Themes/Theme3/off-screen/MatchFragrs.tsx';
import WwcdSummary3 from '../Themes/Theme3/off-screen/WwcdSummary.tsx';
import WwcdStats3 from '../Themes/Theme3/off-screen/WwcdStats.tsx'
import OverallData3 from   '../Themes/Theme3/off-screen/OverAllData.tsx'
import OverallFrags3 from '../Themes/Theme3/off-screen/OverallFrags.tsx'
import Schedule3 from '../Themes/Theme3/off-screen/Schedule.tsx'
import CommingUpNext3 from '../Themes/Theme3/off-screen/CommingUpNext.tsx'
import Champions3 from '../Themes/Theme3/off-screen/Champions.tsx'
import FirstRunnerUp3 from '../Themes/Theme3/off-screen/1stRunnerUp.tsx'
import SecondRunnerUp3 from '../Themes/Theme3/off-screen/2ndRunnerUp.tsx'
import EventMvp3 from '../Themes/Theme3/off-screen/EventMvp.tsx'
import MatchSummary3 from '../Themes/Theme3/off-screen/MatchSummary.tsx'
import PlayerH2H3 from '../Themes/Theme3/off-screen/playerh2h.tsx'
import TeamH2H3 from '../Themes/Theme3/off-screen/teamh2h.tsx'
import ZoneClose3 from '../Themes/Theme3/on-screen/zoneClose.tsx'
import Intro3 from '../Themes/Theme3/on-screen/intro.tsx'
import MapPreview3 from '../Themes/Theme3/off-screen/mapPreview.tsx'
import Slots3 from '../Themes/Theme3/off-screen/slots.tsx'

// Theme4 imports
import Lower4 from '../Themes/Theme4/on-screen/Lower.tsx';
import Upper4 from '../Themes/Theme4/on-screen/Upper.tsx';
import Dom4 from '../Themes/Theme4/on-screen/Dom.tsx';
import Alerts4 from '../Themes/Theme4/on-screen/Alerts.tsx';
import LiveStats4 from '../Themes/Theme4/on-screen/LiveStats.tsx';
import LiveFrags4 from '../Themes/Theme4/on-screen/LiveFrags.tsx';
import MatchData4 from '../Themes/Theme4/off-screen/MatchData.tsx';
import MatchFragrs4 from '../Themes/Theme4/off-screen/MatchFragrs.tsx';
import WwcdSummary4 from '../Themes/Theme4/off-screen/WwcdSummary.tsx';
import WwcdStats4 from '../Themes/Theme4/off-screen/WwcdStats.tsx'
import OverallData4 from   '../Themes/Theme4/off-screen/OverAllData.tsx'
import OverallFrags4 from '../Themes/Theme4/off-screen/OverallFrags.tsx'
import Schedule4 from '../Themes/Theme4/off-screen/Schedule.tsx'
import CommingUpNext4 from '../Themes/Theme4/off-screen/CommingUpNext.tsx'
import Champions4 from '../Themes/Theme4/off-screen/Champions.tsx'
import FirstRunnerUp4 from '../Themes/Theme4/off-screen/1stRunnerUp.tsx'
import SecondRunnerUp4 from '../Themes/Theme4/off-screen/2ndRunnerUp.tsx'
import EventMvp4 from '../Themes/Theme4/off-screen/EventMvp.tsx'
import MatchSummary4 from '../Themes/Theme4/off-screen/MatchSummary.tsx'
import PlayerH2H4 from '../Themes/Theme4/off-screen/playerh2h.tsx'
import TeamH2H4 from '../Themes/Theme4/off-screen/teamh2h.tsx'
import ZoneClose4 from '../Themes/Theme4/on-screen/zoneClose.tsx'
import Intro4 from '../Themes/Theme4/on-screen/intro.tsx'
import MapPreview4 from '../Themes/Theme4/off-screen/mapPreview.tsx'
import Slots4 from '../Themes/Theme4/off-screen/slots.tsx'
import Mvp from '../Themes/Theme4/off-screen/mvp.tsx'
import HighlightPoints from '../Themes/Theme4/off-screen/HighlightPoints.tsx'
import HighlightSchedule from '../Themes/Theme4/off-screen/HighlightSchedule.tsx'

// Theme5 imports
import Lower5 from '../Themes/Theme5/on-screen/Lower.tsx';
import Upper5 from '../Themes/Theme5/on-screen/Upper.tsx';
import Dom5 from '../Themes/Theme5/on-screen/Dom.tsx';
import Alerts5 from '../Themes/Theme5/on-screen/Alerts.tsx';
import LiveStats5 from '../Themes/Theme5/on-screen/LiveStats.tsx';
import LiveFrags5 from '../Themes/Theme5/on-screen/LiveFrags.tsx';
import MatchData5 from '../Themes/Theme5/off-screen/MatchData.tsx';
import MatchFragrs5 from '../Themes/Theme5/off-screen/MatchFragrs.tsx';
import WwcdSummary5 from '../Themes/Theme5/off-screen/WwcdSummary.tsx';
import WwcdStats5 from '../Themes/Theme5/off-screen/WwcdStats.tsx'
import OverallData5 from   '../Themes/Theme5/off-screen/OverAllData.tsx'
import OverallFrags5 from '../Themes/Theme5/off-screen/OverallFrags.tsx'
import Schedule5 from '../Themes/Theme5/off-screen/Schedule.tsx'
import CommingUpNext5 from '../Themes/Theme5/off-screen/CommingUpNext.tsx'
import Champions5 from '../Themes/Theme5/off-screen/Champions.tsx'
import FirstRunnerUp5 from '../Themes/Theme5/off-screen/1stRunnerUp.tsx'
import SecondRunnerUp5 from '../Themes/Theme5/off-screen/2ndRunnerUp.tsx'
import EventMvp5 from '../Themes/Theme5/off-screen/EventMvp.tsx'
import MatchSummary5 from '../Themes/Theme5/off-screen/MatchSummary.tsx'
import PlayerH2H5 from '../Themes/Theme5/off-screen/playerh2h.tsx'
import TeamH2H5 from '../Themes/Theme5/off-screen/teamh2h.tsx'
import ZoneClose5 from '../Themes/Theme5/on-screen/zoneClose.tsx'
import Intro5 from '../Themes/Theme5/on-screen/intro.tsx'
import MapPreview5 from '../Themes/Theme5/off-screen/mapPreview.tsx'
import Slots5 from '../Themes/Theme5/off-screen/slots.tsx'
import Mvp5 from '../Themes/Theme5/off-screen/mvp.tsx'
import HighlightPoints5 from '../Themes/Theme5/off-screen/HighlightPoints.tsx'
import HighlightSchedule5 from '../Themes/Theme5/off-screen/HighlightSchedule.tsx'
import RosterShowCase5 from '../Themes/Theme5/off-screen/RosterShowCase.tsx'
import PlayerSwitch5 from '../Themes/Theme5/off-screen/PlayerSwitch.tsx'
import TopFragger5 from '../Themes/Theme5/off-screen/TopFragger.tsx'

// Theme6 imports
import Lower6 from '../Themes/Theme6/on-screen/Lower.tsx';
import Upper6 from '../Themes/Theme6/on-screen/Upper.tsx';
import Dom6 from '../Themes/Theme6/on-screen/Dom.tsx';
import Alerts6 from '../Themes/Theme6/on-screen/Alerts.tsx';
import LiveStats6 from '../Themes/Theme6/on-screen/LiveStats.tsx';
import LiveFrags6 from '../Themes/Theme6/on-screen/LiveFrags.tsx';
import MatchData6 from '../Themes/Theme6/off-screen/MatchData.tsx';
import MatchFragrs6 from '../Themes/Theme6/off-screen/MatchFragrs.tsx';
import WwcdSummary6 from '../Themes/Theme6/off-screen/WwcdSummary.tsx';
import WwcdStats6 from '../Themes/Theme6/off-screen/WwcdStats.tsx'
import OverallData6 from   '../Themes/Theme6/off-screen/OverAllData.tsx'
import OverallFrags6 from '../Themes/Theme6/off-screen/OverallFrags.tsx'
import Schedule6 from '../Themes/Theme6/off-screen/Schedule.tsx'
import CommingUpNext6 from '../Themes/Theme6/off-screen/CommingUpNext.tsx'
import Champions6 from '../Themes/Theme6/off-screen/Champions.tsx'
import FirstRunnerUp6 from '../Themes/Theme6/off-screen/1stRunnerUp.tsx'
import SecondRunnerUp6 from '../Themes/Theme6/off-screen/2ndRunnerUp.tsx'
import EventMvp6 from '../Themes/Theme6/off-screen/EventMvp.tsx'
import MatchSummary6 from '../Themes/Theme6/off-screen/MatchSummary.tsx'
import PlayerH2H6 from '../Themes/Theme6/off-screen/playerh2h.tsx'
import TeamH2H6 from '../Themes/Theme6/off-screen/teamh2h.tsx'
import ZoneClose6 from '../Themes/Theme6/on-screen/zoneClose.tsx'
import Intro6 from '../Themes/Theme6/on-screen/intro.tsx'
import MapPreview6 from '../Themes/Theme6/off-screen/mapPreview.tsx'
import Slots6 from '../Themes/Theme6/off-screen/slots.tsx'
import Achieve6 from '../Themes/Theme6/on-screen/Achieve.tsx'
import Mvp6 from '../Themes/Theme6/off-screen/mvp.tsx'
import HighlightPoints6 from '../Themes/Theme6/off-screen/HighlightPoints.tsx'
import HighlightSchedule6 from '../Themes/Theme6/off-screen/HighlightSchedule.tsx'
import RosterShowCase6 from '../Themes/Theme6/off-screen/RosterShowCase.tsx'
import PlayerSwitch6 from '../Themes/Theme6/off-screen/PlayerSwitch.tsx'
import TopFragger6 from '../Themes/Theme6/off-screen/TopFragger.tsx'
import Battlebar from "../Themes/Theme6/on-screen/battlebar.tsx"


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

/* --------------------------------------------------------------------
   The bulk endpoint (public/bulk/:tournamentId/:roundId/:matchId) always
   returns tournament, round, matches, matchDatas, currentMatchData and
   overallData in one shot — so the view no longer needs to tell the
   fetch layer what to ask for. The only thing bulk doesn't return today
   is backpack info, so that's the one call still gated by view.
-------------------------------------------------------------------- */
const VIEWS_NEEDING_BACKPACK = new Set(['Upper']);

const PublicThemeRenderer: React.FC = () => {
  // Module-level cache shared across all mounts of this component in the
  // current tab session — survives view switches and re-mounts, cleared
  // only on a hard page reload. Doesn't touch the backend at all; just
  // stops re-requesting data we already have.
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

  const { tournamentId, roundId, matchId } = useParams<{
    tournamentId: string;
    roundId: string;
    matchId: string;
  }>();
  const [searchParams] = useSearchParams();
  const theme = searchParams.get('theme') || 'Theme1';
  const view = searchParams.get('view') || 'Lower';
  const followSelected = (searchParams.get('followSelected') || 'false').toLowerCase() === 'true';
  const selectedScheduleMatchIds = searchParams.get('scheduleMatches')?.split(',') || [];

  const themes = {
    Theme1: {
      Lower: Lower, Upper: Upper, Dom: Dom, Alerts: Alerts, LiveStats: LiveStats,
      LiveFrags: LiveFrags, MatchData: MatchData, MatchFragrs: MatchFragrs,
      WwcdSummary: WwcdSummary, WwcdStats: WwcdStats, OverallData: OverallData,
      OverallFrags: OverallFrags, Schedule: Schedule, CommingUpNext: CommingUpNext,
      Champions: Champions, FirstRunnerUp: FirstRunnerUp, SecondRunnerUp: SecondRunnerUp,
      EventMvp: EventMvp, MatchSummary: MatchSummary, PlayerH2H: PlayerH2H, TeamH2H: TeamH2H,
      ZoneClose: ZoneClose, Intro: Intro, MapPreview: MapPreview, Slots: Slots,
      Mvp: MatchFragrs, HighlightPoints: OverallData, HighlightSchedule: Schedule,
      RosterShowCase: RosterShowCase,
    },
    Theme3: {
      Lower: Lower3, Upper: Upper3, Dom: Dom3, Alerts: Alerts3, LiveStats: LiveStats3,
      LiveFrags: LiveFrags3, MatchData: MatchData3, MatchFragrs: MatchFragrs3,
      WwcdSummary: WwcdSummary3, WwcdStats: WwcdStats3, OverallData: OverallData3,
      OverallFrags: OverallFrags3, Schedule: Schedule3, CommingUpNext: CommingUpNext3,
      Champions: Champions3, FirstRunnerUp: FirstRunnerUp3, SecondRunnerUp: SecondRunnerUp3,
      EventMvp: EventMvp3, MatchSummary: MatchSummary3, PlayerH2H: PlayerH2H3, TeamH2H: TeamH2H3,
      ZoneClose: ZoneClose3, Intro: Intro3, MapPreview: MapPreview3, Slots: Slots3,
      Mvp: MatchFragrs3, HighlightPoints: OverallData3, HighlightSchedule: Schedule3,
      RosterShowCase: RosterShowCase, PlayerSwitch: null,
    },
    Theme4: {
      Lower: Lower4, Upper: Upper4, Dom: Dom4, Alerts: Alerts4, LiveStats: LiveStats4,
      LiveFrags: LiveFrags4, MatchData: MatchData4, MatchFragrs: MatchFragrs4,
      WwcdSummary: WwcdSummary4, WwcdStats: WwcdStats4, OverallData: OverallData4,
      OverallFrags: OverallFrags4, Schedule: Schedule4, CommingUpNext: CommingUpNext4,
      Champions: Champions4, FirstRunnerUp: FirstRunnerUp4, SecondRunnerUp: SecondRunnerUp4,
      EventMvp: EventMvp4, MatchSummary: MatchSummary4, PlayerH2H: PlayerH2H4, TeamH2H: TeamH2H4,
      ZoneClose: ZoneClose4, Intro: Intro4, MapPreview: MapPreview4, Slots: Slots4,
      Mvp: Mvp, HighlightPoints: HighlightPoints, HighlightSchedule: HighlightSchedule,
      RosterShowCase: RosterShowCase, PlayerSwitch: PlayerSwitch,
    },
    Theme5: {
      Lower: Lower5, Upper: Upper5, Dom: Dom5, Alerts: Alerts5, LiveStats: LiveStats5,
      LiveFrags: LiveFrags5, MatchData: MatchData5, MatchFragrs: MatchFragrs5,
      WwcdSummary: WwcdSummary5, WwcdStats: WwcdStats5, OverallData: OverallData5,
      OverallFrags: OverallFrags5, Schedule: Schedule5, CommingUpNext: CommingUpNext5,
      Champions: Champions5, FirstRunnerUp: FirstRunnerUp5, SecondRunnerUp: SecondRunnerUp5,
      EventMvp: EventMvp5, MatchSummary: MatchSummary5, PlayerH2H: PlayerH2H5, TeamH2H: TeamH2H5,
      ZoneClose: ZoneClose5, Intro: Intro5, MapPreview: MapPreview5, Slots: Slots5,
      Mvp: Mvp5, HighlightPoints: HighlightPoints5, HighlightSchedule: HighlightSchedule5,
      RosterShowCase: RosterShowCase5, PlayerSwitch: PlayerSwitch5, TopFragger: TopFragger5,
    },
    Theme6: {
      Lower: Lower6, Upper: Upper6, Dom: Dom6, Alerts: Alerts6, LiveStats: LiveStats6,
      LiveFrags: LiveFrags6, MatchData: MatchData6, MatchFragrs: MatchFragrs6,
      WwcdSummary: WwcdSummary6, WwcdStats: WwcdStats6, OverallData: OverallData6,
      OverallFrags: OverallFrags6, Schedule: Schedule6, CommingUpNext: CommingUpNext6,
      Champions: Champions6, FirstRunnerUp: FirstRunnerUp6, SecondRunnerUp: SecondRunnerUp6,
      EventMvp: EventMvp6, MatchSummary: MatchSummary6, PlayerH2H: PlayerH2H6, TeamH2H: TeamH2H6,
      ZoneClose: ZoneClose6, Intro: Intro6, MapPreview: MapPreview6, Slots: Slots6,
      Achive: Achieve6, Mvp: Mvp6, HighlightPoints: HighlightPoints6, HighlightSchedule: HighlightSchedule6,
      RosterShowCase: RosterShowCase6, PlayerSwitch: PlayerSwitch6, TopFragger: TopFragger6,
      Battlebar: Battlebar,
    },
  };

  const activeTheme = themes[theme as 'Theme1' | 'Theme3' | 'Theme4' | 'Theme5' | 'Theme6'] || themes['Theme1'];

  const {
    Lower: LowerComp, Upper: UpperComp, Dom: DomComp, Alerts: AlertsComp, LiveStats: LiveStatsComp,
    LiveFrags: LiveFragsComp, MatchData: MatchDataComp, MatchFragrs: MatchFragrsComp,
    WwcdSummary: WwcdSummaryComp, WwcdStats: WwcdStatsComp, OverallData: OverallDataComp,
    OverallFrags: OverallFragsComp, Schedule: ScheduleComp, CommingUpNext: CommingUpNextComp,
    Champions: ChampionsComp, FirstRunnerUp: FirstRunnerUpComp, SecondRunnerUp: SecondRunnerUpComp,
    EventMvp: EventMvpComp, MatchSummary: MatchSummaryComp, PlayerH2H: PlayerH2HComp,
    TeamH2H: TeamH2HComp, ZoneClose: ZoneCloseComp, Intro: IntroComp, MapPreview: MapPreviewComp,
    Slots: SlotsComp, Mvp: MvpComp, Battlebar: BattlebarComp, Achive: AchiveComp,
    HighlightPoints: HighlightPointsComp, HighlightSchedule: HighlightScheduleComp,
    RosterShowCase: RosterShowCaseComp, PlayerSwitch: PlayerSwitchComp,
  } = activeTheme as any;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [overallData, setOverallData] = useState<OverallData | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchDatas, setMatchDatas] = useState<MatchData[]>([]);
  const [backpackInfo, setBackpackInfo] = useState<BackpackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shared by the initial fetch and every live 'bulkUpdate' push, so the
  // two paths can never drift out of sync with each other.
  const applyBulkPayload = (bulk: any) => {
    setTournament(bulk.tournamentData);
    setRound(bulk.roundData);
    setMatch(bulk.matchesData?.current ?? null);
    setMatches(bulk.matchesData?.list ?? []);
    setMatchData(bulk.currentMatchData?.matchData ?? null);
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

    // Cancel any in-flight request set from a previous render (e.g. rapid
    // view/param changes) so a slow stale response can't overwrite fresh state.
    const controller = new AbortController();
    let cancelled = false;

    const LIVE_TTL = 3000;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // ------------------------------------------------------------
        // Single call instead of the old tournament / round / groups /
        // matches / match / matchdata / overall fan-out. The backend
        // resolves followSelected -> effectiveMatchId itself and
        // returns everything any view could need in one payload:
        //   tournamentData, roundData, matchesData: { list, current,
        //   effectiveMatchId }, matchDatasData, currentMatchData,
        //   overallData
        // Views keep reading the exact same state vars/props as
        // before — only where those vars get filled from changes.
        // ------------------------------------------------------------
        const query = followSelected ? '?followSelected=true' : '';
        const bulkRes = await cachedGet(
          `public/bulk/${tournamentId}/${roundId}/${matchId}${query}`,
          controller.signal,
          LIVE_TTL
        );
        const bulk = bulkRes.data;

        if (cancelled) return;

        applyBulkPayload(bulk);

        // Backpack info isn't part of the bulk payload yet (server-side
        // TODO to fold in), so it stays its own call — only fired for
        // the one view that actually needs it.
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

  // ----------------------------------------------------------------
  // Live updates. bulkSocket.js emits a fresh full payload to room
  // `bulk:{tournamentId}:{roundId}` on every relevant DB change. We
  // join that room once per tournament/round; round-wide fields
  // (tournament/round/matches/matchDatas/overallData) get re-applied
  // on every push, while match-scoped fields (match/matchData/
  // backpack) only get re-applied when the push is actually about
  // the match this client is showing — see the guard below. Every
  // child component just sees new props either way, same as a
  // re-fetch, just pushed instead of pulled.
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!tournamentId || !roundId) return;

    const socketManager = SocketManager.getInstance();
    const socket = socketManager.connect();

    socket.emit('joinBulkRoom', { tournamentId, roundId });

    const handleBulkUpdate = (bulk: any) => {
      // Room is scoped to tournamentId:roundId, not to a single match, so
      // a push triggered by some other match in the round still lands
      // here. Round-wide fields are always safe to refresh; match-scoped
      // fields (match/matchData/backpack) only get applied if the pushed
      // payload is actually about the match this client is showing —
      // otherwise a Match 1 view would flash Match 3's data whenever
      // Match 3 updates elsewhere in the round.
      setTournament(bulk.tournamentData);
      setRound(bulk.roundData);
      setMatches(bulk.matchesData?.list ?? []);
      setOverallData(bulk.overallData ?? null);
      setMatchDatas(
        (bulk.matchDatasData ?? [])
          .map((entry: any) => entry.matchData)
          .filter(Boolean)
      );

      const pushedMatchId = bulk.matchesData?.effectiveMatchId || bulk.matchesData?.current?._id;
      const isOurMatch = followSelected || !pushedMatchId || pushedMatchId === matchId;
      if (isOurMatch) {
        setMatch(bulk.matchesData?.current ?? null);
        setMatchData(bulk.currentMatchData?.matchData ?? null);
        refreshBackpackInfo(bulk);
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
    if (loading) {
      return (
        <div style={{ width: '100%', height: '100%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }} />
      );
    }

    if (error) {
      return (
        <div style={{ width: '100%', height: '100%', color: '#ff0000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
          {error}
        </div>
      );
    }

    if (!tournament) {
      return (
        <div style={{ width: '100%', height: '100%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
          No tournament data found
        </div>
      );
    }

    switch (view) {
      case 'Lower':
        return <LowerComp tournament={tournament} round={round} match={match} totalMatches={matches.length} matches={matches} />;
      case 'Upper':
        return <UpperComp tournament={tournament} round={round} match={match} matchData={matchData} backpackInfo={backpackInfo} />;
      case 'Dom':
        return <DomComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'Achive':
        return <AchiveComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'Alerts':
        return <AlertsComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'LiveStats':
        return <LiveStatsComp tournament={tournament} round={round} match={match} matchData={matchData} overallData={overallData} />;
      case 'LiveFrags':
        return <LiveFragsComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'MatchData':
        return <MatchDataComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'MatchFragrs':
        return <MatchFragrsComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'WwcdSummary':
        return <WwcdSummaryComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'WwcdStats':
        return <WwcdStatsComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'OverAllData':
        return <OverallDataComp tournament={tournament} round={round} match={match} matchData={matchData} overallData={overallData} matches={matches} matchDatas={matchDatas} />;
      case 'OverallFrags':
        return <OverallFragsComp tournament={tournament} round={round} match={match} matchData={matchData} overallData={overallData} matches={matches} matchDatas={matchDatas} />;
      case 'Schedule':
        return <ScheduleComp tournament={tournament} round={round} matches={matches} matchDatas={matchDatas} selectedScheduleMatches={selectedScheduleMatchIds} />;
      case 'CommingUpNext':
        return <CommingUpNextComp tournament={tournament} round={round} match={match} />;
      case 'Champions':
        return <ChampionsComp tournament={tournament} round={round} matchData={matchData} />;
      case '1stRunnerUp':
        return <FirstRunnerUpComp tournament={tournament} round={round} overallData={overallData} />;
      case '2ndRunnerUp':
        return <SecondRunnerUpComp tournament={tournament} round={round} overallData={overallData} />;
      case 'EventMvp':
        return <EventMvpComp tournament={tournament} round={round} overallData={overallData} />;
      case 'MatchSummary':
        return <MatchSummaryComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'playerH2H':
        return <PlayerH2HComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'TeamH2H':
        return <TeamH2HComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'ZoneClose':
        return <ZoneCloseComp tournament={tournament} round={round} match={match} />;
      case 'intro':
        return <IntroComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'mapPreview':
        return <MapPreviewComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'slots':
        return <SlotsComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'mvp':
        return <MvpComp tournament={tournament} round={round} match={match} matchData={matchData} backpackInfo={backpackInfo} />;
      case 'highlightPoints':
        return <HighlightPointsComp tournament={tournament} round={round} match={match} matchData={matchData} overallData={overallData} matches={matches} matchDatas={matchDatas} />;
      case 'HighlightSchedule':
        return <HighlightScheduleComp tournament={tournament} round={round} matches={matches} matchDatas={matchDatas} selectedScheduleMatches={selectedScheduleMatchIds} />;
      case 'RosterShowCase':
        return <RosterShowCaseComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'PlayerSwitch':
        return PlayerSwitchComp ? <PlayerSwitchComp match={match} matchData={matchData} loading={loading} error={error} /> : null;
      case 'Battlebar':
        return <BattlebarComp tournament={tournament} round={round} match={match} matchData={matchData} loading={loading} error={error} />;
      default:
        return (
          <div style={{ width: '100%', height: '100%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            View "{view}" not implemented yet.
          </div>
        );
    }
  };

  return (
    <div style={{ width: '1920px', height: '1400px', top: 0, left: 0, margin: 0, padding: 0, overflow: 'hidden' }}>
      {renderView()}
    </div>
  );
};

export default PublicThemeRenderer;