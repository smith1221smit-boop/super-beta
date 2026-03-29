import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../login/api.tsx';

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

// Theme2 imports removed

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

interface MatchData {
    _id: string;
    matchId: string;
    userId: string;
    teams: any[];
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

interface Match {
  _id: string;
  matchName?: string;
  matchNo?: number;
  _matchNo?: number;
}

const PublicThemeRenderer: React.FC = () => {
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
      Lower: Lower,
      Upper: Upper,
      Dom: Dom,
      Alerts: Alerts,
      LiveStats: LiveStats,
      LiveFrags: LiveFrags,
      MatchData: MatchData,
      MatchFragrs: MatchFragrs,
      WwcdSummary: WwcdSummary,
      WwcdStats: WwcdStats,
      OverallData: OverallData,
      OverallFrags: OverallFrags,
      Schedule: Schedule,
      CommingUpNext: CommingUpNext,
      Champions: Champions,
      FirstRunnerUp: FirstRunnerUp,
      SecondRunnerUp: SecondRunnerUp,
      EventMvp: EventMvp,
      MatchSummary: MatchSummary,
      PlayerH2H: PlayerH2H,
      TeamH2H: TeamH2H,
      ZoneClose: ZoneClose,
      Intro: Intro,
      MapPreview: MapPreview,
      Slots: Slots,
      Mvp: MatchFragrs,
      HighlightPoints: OverallData,
      HighlightSchedule: Schedule,
      RosterShowCase: RosterShowCase,
    },
    
    Theme3: {
      Lower: Lower3,
      Upper: Upper3,
      Dom: Dom3,
      Alerts: Alerts3,
      LiveStats: LiveStats3,
      LiveFrags: LiveFrags3,
      MatchData: MatchData3,
      MatchFragrs: MatchFragrs3,
      WwcdSummary: WwcdSummary3,
      WwcdStats: WwcdStats3,
      OverallData: OverallData3,
      OverallFrags: OverallFrags3,
      Schedule: Schedule3,
      CommingUpNext: CommingUpNext3,
      Champions: Champions3,
      FirstRunnerUp: FirstRunnerUp3,
      SecondRunnerUp: SecondRunnerUp3,
      EventMvp: EventMvp3,
      MatchSummary: MatchSummary3,
      PlayerH2H: PlayerH2H3,
      TeamH2H: TeamH2H3,
      ZoneClose: ZoneClose3,
      Intro: Intro3,
      MapPreview: MapPreview3,
      Slots: Slots3,
      Mvp: MatchFragrs3,
      HighlightPoints: OverallData3,
      HighlightSchedule: Schedule3,
      RosterShowCase: RosterShowCase,
      PlayerSwitch: null,
    },
    Theme4: {
      Lower: Lower4,
      Upper: Upper4,
      Dom: Dom4,
      Alerts: Alerts4,
      LiveStats: LiveStats4,
      LiveFrags: LiveFrags4,
      MatchData: MatchData4,
      MatchFragrs: MatchFragrs4,
      WwcdSummary: WwcdSummary4,
      WwcdStats: WwcdStats4,
      OverallData: OverallData4,
      OverallFrags: OverallFrags4,
      Schedule: Schedule4,
      CommingUpNext: CommingUpNext4,
      Champions: Champions4,
      FirstRunnerUp: FirstRunnerUp4,
      SecondRunnerUp: SecondRunnerUp4,
      EventMvp: EventMvp4,
      MatchSummary: MatchSummary4,
      PlayerH2H: PlayerH2H4,
      TeamH2H: TeamH2H4,
      ZoneClose: ZoneClose4,
      Intro: Intro4,
      MapPreview: MapPreview4,
      Slots: Slots4,
      Mvp: Mvp,
      HighlightPoints: HighlightPoints,
      HighlightSchedule: HighlightSchedule,
      RosterShowCase: RosterShowCase,
      PlayerSwitch: PlayerSwitch,
    },
    Theme5: {
      Lower: Lower5,
      Upper: Upper5,
      Dom: Dom5,
      Alerts: Alerts5,
      LiveStats: LiveStats5,
      LiveFrags: LiveFrags5,
      MatchData: MatchData5,
      MatchFragrs: MatchFragrs5,
      WwcdSummary: WwcdSummary5,
      WwcdStats: WwcdStats5,
      OverallData: OverallData5,
      OverallFrags: OverallFrags5,
      Schedule: Schedule5,
      CommingUpNext: CommingUpNext5,
      Champions: Champions5,
      FirstRunnerUp: FirstRunnerUp5,
      SecondRunnerUp: SecondRunnerUp5,
      EventMvp: EventMvp5,
      MatchSummary: MatchSummary5,
      PlayerH2H: PlayerH2H5,
      TeamH2H: TeamH2H5,
      ZoneClose: ZoneClose5,
      Intro: Intro5,
      MapPreview: MapPreview5,
      Slots: Slots5,
      Mvp: Mvp5,
      HighlightPoints: HighlightPoints5,
      HighlightSchedule: HighlightSchedule5,
      RosterShowCase: RosterShowCase5,
      PlayerSwitch: PlayerSwitch5,
      TopFragger: TopFragger5,
    },
    Theme6: {
      Lower: Lower6,
      Upper: Upper6,
      Dom: Dom6,
      Alerts: Alerts6,
      LiveStats: LiveStats6,
      LiveFrags: LiveFrags6,
      MatchData: MatchData6,
      MatchFragrs: MatchFragrs6,
      WwcdSummary: WwcdSummary6,
      WwcdStats: WwcdStats6,
      OverallData: OverallData6,
      OverallFrags: OverallFrags6,
      Schedule: Schedule6,
      CommingUpNext: CommingUpNext6,
      Champions: Champions6,
      FirstRunnerUp: FirstRunnerUp6,
      SecondRunnerUp: SecondRunnerUp6,
      EventMvp: EventMvp6,
      MatchSummary: MatchSummary6,
      PlayerH2H: PlayerH2H6,
      TeamH2H: TeamH2H6,
      ZoneClose: ZoneClose6,
      Intro: Intro6,
      MapPreview: MapPreview6,
      Slots: Slots6,
      Achive: Achieve6,
      Mvp: Mvp6,
      HighlightPoints: HighlightPoints6,
      HighlightSchedule: HighlightSchedule6,
      RosterShowCase: RosterShowCase6,
      PlayerSwitch: PlayerSwitch6,
      TopFragger: TopFragger6,
    },
  };
const activeTheme = themes[theme as 'Theme1'  | 'Theme3' | 'Theme4' | 'Theme5' | 'Theme6'] || themes['Theme1'];


  const {
    Lower: LowerComp,
    Upper: UpperComp,
    Dom: DomComp,
    Alerts: AlertsComp,
    LiveStats: LiveStatsComp,
    LiveFrags: LiveFragsComp,
    MatchData: MatchDataComp,
    MatchFragrs: MatchFragrsComp,
    WwcdSummary: WwcdSummaryComp,
    WwcdStats: WwcdStatsComp,
    OverallData: OverallDataComp,
    OverallFrags: OverallFragsComp,
    Schedule: ScheduleComp,
    CommingUpNext: CommingUpNextComp,
    Champions: ChampionsComp,
    FirstRunnerUp: FirstRunnerUpComp,
    SecondRunnerUp: SecondRunnerUpComp,
    EventMvp: EventMvpComp,
    MatchSummary: MatchSummaryComp,
    PlayerH2H: PlayerH2HComp,
    TeamH2H: TeamH2HComp,
    ZoneClose: ZoneCloseComp,
    Intro: IntroComp,
    MapPreview: MapPreviewComp,
    Slots: SlotsComp,
    Mvp: MvpComp,
    
      Achive: AchiveComp,
    HighlightPoints: HighlightPointsComp,
    HighlightSchedule: HighlightScheduleComp,
    RosterShowCase: RosterShowCaseComp,
    PlayerSwitch: PlayerSwitchComp,
  } = activeTheme as any;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [overallData, setOverallData] = useState<OverallData | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchDatas, setMatchDatas] = useState<MatchData[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedScheduleMatches, setSelectedScheduleMatches] = useState<string[]>([]);
  const [backpackInfo, setBackpackInfo] = useState<BackpackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!tournamentId || !roundId) return;

      try {
        setLoading(true);

        // Determine what data is needed based on the view
        const needsOverallData = ['OverAllData', 'OverallFrags', 'LiveStats', '1stRunnerUp', '2ndRunnerUp', 'EventMvp', 'highlightPoints'].includes(view);
        const needsMatches = true;
        const needsMatchDatas = [ 'Schedule', 'highlightPoints', 'HighlightSchedule'].includes(view);
        const needsOverallWithMatch = false; // OverallFrags uses round-level overall data, not match-specific
        const needsMatchData = ['Upper', 'Dom', 'Alerts', 'LiveStats', 'LiveFrags', 'MatchData', 'Achive','MatchFragrs', 'WwcdSummary', 'WwcdStats', 'playerH2H', 'mapPreview', 'slots', 'TeamH2H', 'mvp', 'RosterShowCase', 'MatchSummary', 'Champions','1stRunnerUp', '2ndRunnerUp', 'EventMvp', 'PlayerSwitch'].includes(view);
        const needsBackpackInfo = [ 'Upper',].includes(view);

        // Always fetch basic data
        const basePromises: Promise<any>[] = [
          api.get(`public/tournaments/${tournamentId}?t=${Date.now()}`),
          api.get(`public/tournaments/${tournamentId}/rounds/${roundId}?t=${Date.now()}`),
        ];

        if (followSelected) {
          basePromises.push(api.get(`public/tournaments/${tournamentId}/rounds/${roundId}/selected-match`).catch(() => null));
        }

        const groupsPromise = api.get(`public/tournaments/${tournamentId}/groups`);
        const matchesPromise = api.get(`public/rounds/${roundId}/matches`);
        basePromises.push(groupsPromise, matchesPromise);

        const baseResults = await Promise.all(basePromises);
        const tournamentData = baseResults[0].data;
        setTournament(tournamentData);

        const roundData = baseResults[1].data;
        setRound(roundData);

        let selectedMatchResponse = null;
        let groupsResponse = null;
        let matchesResponse = null;

        if (followSelected) {
          selectedMatchResponse = baseResults[2];
        }

        groupsResponse = baseResults[followSelected ? 3 : 2];
        matchesResponse = baseResults[followSelected ? 4 : 3];
        const rawMatches = matchesResponse.data;
        // Create map from group ID to groupName
        const groupMap = new Map();
        groupsResponse.data.forEach((group: any) => {
          groupMap.set(group._id, group.groupName);
        });
        // Attach full groupNames array to each match for multi-group support
        const enrichedMatches = rawMatches.map((match: any) => {
          if (match.groups && match.groups.length > 0) {
            match.groupName = groupMap.get(match.groups[0]) || 'Unknown'; // Legacy single
            match.groupNames = match.groups.slice(0,2).map((id: string) => groupMap.get(id) || 'Unknown').filter(Boolean); // Dynamic array
          } else {
            match.groupName = 'Unknown';
            match.groupNames = [];
          }
          return match;
        });
        setMatches(enrichedMatches);

        // Resolve effective matchId
        let effectiveMatchId = matchId;
        if (followSelected && selectedMatchResponse?.data?.matchId) {
          effectiveMatchId = selectedMatchResponse.data.matchId;
        }

        // Fetch match-specific data
        const matchPromises: Promise<any>[] = [api.get(`public/matches/${effectiveMatchId}`)];
        if (needsMatchData) {
          matchPromises.push(api.get(`public/matches/${effectiveMatchId}/matchdata`).catch(() => null));
        }

        const matchResults = await Promise.all(matchPromises);
        const matchDataFetched = matchResults[0].data;
        setMatch(matchDataFetched);

        if (needsMatchData && matchResults[1]) {
          const fetchedMatchData = matchResults[1].data;
          setMatchData(fetchedMatchData);

          // Fetch backpack info if needed
          if (needsBackpackInfo && fetchedMatchData._id) {
            try {
              const backpackRes = await api.get(`public/bagPack/tournament/${tournamentId}/round/${roundId}/match/${effectiveMatchId}/matchdata/${fetchedMatchData._id}`);
              setBackpackInfo(backpackRes.data);
            } catch (backpackErr) {
              console.error('Failed to fetch backpack info:', backpackErr);
              setBackpackInfo(null);
            }
          }
        }

        // Fetch additional data in parallel
        const additionalPromises: Promise<any>[] = [];

        if (needsOverallWithMatch && effectiveMatchId) {
          additionalPromises.push(api.get(`public/tournaments/${tournamentId}/rounds/${roundId}/matches/${effectiveMatchId}/overall`).catch(() => null));
        } else if (needsOverallData) {
          additionalPromises.push(api.get(`public/tournaments/${tournamentId}/rounds/${roundId}/overall`).catch(() => null));
        }

        if (needsMatchDatas && matchesResponse) {
          const matchesData = matchesResponse.data;
          additionalPromises.push(
            ...matchesData.map((match: Match) =>
              api.get(`public/matches/${match._id}/matchdata`).catch(() => null)
            )
          );
        }

        if (additionalPromises.length > 0) {
          const additionalResults = await Promise.all(additionalPromises);

          if (needsOverallWithMatch || needsOverallData) {
            const overallResponse = additionalResults.shift();
            if (overallResponse) {
              setOverallData(overallResponse.data);
            }
          }

          if (needsMatchDatas) {
            const validMatchDatas = additionalResults.filter(result => result !== null).map(result => result.data);
            setMatchDatas(validMatchDatas);
          }
        }

        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tournamentId, roundId, matchId, followSelected, view]);

  const renderView = () => {
    if (loading) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
       
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
         
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
         
          color: '#ff0000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          {error}
        </div>
      );
    }

    if (!tournament) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
  
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          No tournament data found
        </div>
      );
    }

    // Pass tournament data to the appropriate component
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
          return <WwcdStatsComp tournament={tournament} round={round} match={match} matchData={matchData} />
        case 'OverAllData':
          return <OverallDataComp tournament={tournament} round={round} match={match} matchData={matchData} overallData={overallData} matches={matches} matchDatas={matchDatas} />
        case 'OverallFrags':
        return <OverallFragsComp tournament={tournament} round={round} match={match} matchData={matchData} overallData={overallData} matches={matches} matchDatas={matchDatas} />
        case 'Schedule':
        return <ScheduleComp tournament={tournament} round={round} matches={matches} matchDatas={matchDatas} selectedScheduleMatches={selectedScheduleMatchIds} />
        case 'CommingUpNext':
        return <CommingUpNextComp tournament={tournament} round={round} match={match} />
        case 'Champions':
          return <ChampionsComp tournament={tournament} round={round} matchData={matchData} />
        case '1stRunnerUp':
          return <FirstRunnerUpComp tournament={tournament} round={round} overallData={overallData} />
        case '2ndRunnerUp':
          return <SecondRunnerUpComp tournament={tournament} round={round} overallData={overallData} />
        case 'EventMvp':
          return <EventMvpComp tournament={tournament} round={round} overallData={overallData} />
        case 'MatchSummary':
          return <MatchSummaryComp tournament={tournament} round={round} match={match}   matchData={matchData} />
        case 'playerH2H':
          return <PlayerH2HComp tournament={tournament} round={round} match={match} matchData={matchData} />
        case 'TeamH2H':
          return <TeamH2HComp tournament={tournament} round={round} match={match} matchData={matchData} />
        case 'ZoneClose':
          return <ZoneCloseComp tournament={tournament} round={round} match={match} />
        case 'intro':
          return <IntroComp tournament={tournament} round={round} match={match} matchData={matchData} />
        case 'mapPreview':
          return <MapPreviewComp tournament={tournament} round={round} match={match} matchData={matchData} />
        case 'slots':
          return <SlotsComp tournament={tournament} round={round} match={match} matchData={matchData} />
        case 'mvp':
          return <MvpComp tournament={tournament} round={round} match={match} matchData={matchData} backpackInfo={backpackInfo} />
        case 'highlightPoints':
          return <HighlightPointsComp tournament={tournament} round={round} match={match} matchData={matchData} overallData={overallData} matches={matches} matchDatas={matchDatas} />
        case 'HighlightSchedule':
          return <HighlightScheduleComp tournament={tournament} round={round} matches={matches} matchDatas={matchDatas} selectedScheduleMatches={selectedScheduleMatchIds}  />
        case 'RosterShowCase':
          return <RosterShowCaseComp tournament={tournament} round={round} match={match} matchData={matchData} />
        case 'PlayerSwitch':
          return PlayerSwitchComp ? <PlayerSwitchComp match={match} matchData={matchData} loading={loading} error={error} /> : null;
      default:
        return (
          <div style={{
            width: '100%',
            height: '100%',

            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            View "{view}" not implemented yet.
          </div>
        );
    }
  };

  return (
    <div style={{
      width: '1920px',
      height: '1400px',
 
      top: 0,
      left: 0,
      margin: 0,
      padding: 0,
      overflow: 'hidden',
  
    }}>
      {renderView()}
    </div>
  );
};

export default PublicThemeRenderer;

