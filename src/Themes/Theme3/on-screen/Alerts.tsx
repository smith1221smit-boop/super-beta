import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SocketManager from '../../../dashboard/socketManager.tsx';

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
}

interface Match {
  _id: string;
  matchName?: string;
  matchNo?: number;
  _matchNo?: number;
}

interface Player {
  _id: string;
  playerName: string;
  killNum: number;
  bHasDied: boolean;
  picUrl?: string;
  health: number;
  healthMax: number;
  liveState: number; // 0 = knocked, 5 = dead, etc.
  rank?: number;
}

interface Team {
  _id: string;
  teamId?: string;
  teamTag: string;
  slot?: number;
  placePoints: number;
  players: Player[];
  teamLogo: string;
}

interface MatchData {
  _id: string;
  teams: Team[];
}

interface AlertsProps {
  tournament: Tournament;
  round?: Round | null;
  match?: Match | null;
  matchData?: MatchData | null;
}

const isTeamAllDead = (team: Team) =>
  team.players.length > 0 &&
  team.players.every((p) => p.liveState === 5 || p.bHasDied);

const Alerts: React.FC<AlertsProps> = ({ tournament, round, match, matchData }) => {
  const [localMatchData, setLocalMatchData] = useState<MatchData | null>(matchData || null);
  const [matchDataId, setMatchDataId] = useState<string | null>(matchData?._id?.toString() || null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [currentAlertTeam, setCurrentAlertTeam] = useState<Team | null>(null);

  // Team ids that have already triggered (or been suppressed from triggering,
  // e.g. because they were already dead when data first loaded) an alert.
  const shownTeamsRef = useRef<Set<string>>(new Set());
  // Pending teams waiting to have their alert shown (handles multiple
  // simultaneous eliminations from one bulk update).
  const queueRef = useRef<Team[]>([]);
  const isShowingRef = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertIdRef = useRef<number>(0);

  // ── Show the next queued elimination, if any, once the current one clears ──
  const processQueue = useCallback(() => {
    if (isShowingRef.current || queueRef.current.length === 0) return;
    const nextTeam = queueRef.current.shift();
    if (!nextTeam) return;

    isShowingRef.current = true;
    alertIdRef.current += 1;
    setCurrentAlertTeam(nextTeam);
    setShowAlert(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowAlert(false);
      setCurrentAlertTeam(null);
      timeoutRef.current = null;
      isShowingRef.current = false;
      // small gap before the next one so exit/enter animations don't collide
      setTimeout(processQueue, 300);
    }, 5000);
  }, []);

  // ── Prop-driven sync — THE primary real-time path ───────────────────────
  // PublicThemeRenderer calls setMatchData(freshMatchData) on every
  // 'bulkUpdate' push, which changes this `matchData` prop reference on
  // every live tick — same match, updated contents. This effect must fire
  // on every one of those, exactly like LiveStats's does (dep: [matchData]
  // only — no _id-equality guard, since _id never changes mid-match and
  // gating on it silently drops every live update after the first).
  useEffect(() => {
    if (!matchData) return;

    const incomingId = matchData._id?.toString();
    const isNewMatch = incomingId !== matchDataId;

    setLocalMatchData(matchData);
    setLastUpdateTime(Date.now());

    if (isNewMatch) {
      setMatchDataId(incomingId);

      // Reset tracking for the new match...
      shownTeamsRef.current.clear();
      queueRef.current = [];
      isShowingRef.current = false;
      setShowAlert(false);
      setCurrentAlertTeam(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // ...but suppress alerts for teams that are ALREADY eliminated at load
      // time — only newly-occurring eliminations after this point should pop.
      matchData.teams.forEach((team) => {
        if (isTeamAllDead(team)) {
          shownTeamsRef.current.add(team._id);
        }
      });
    }
  }, [matchData]);

  // ── Socket wiring: purely merges incoming data, no elimination logic here ──
  useEffect(() => {
    if (!matchDataId) return;

    const socketManager = SocketManager.getInstance();
    const freshSocket = socketManager.connect();

    const mergePlayers = (team: any, changesPlayers: any[]) => {
      const updatesById = new Map(
        changesPlayers.map((p: any) => [p._id?.toString?.() || p._id, p])
      );
      return team.players.map((p: Player) => {
        const key = p._id?.toString?.() || p._id;
        const upd = updatesById.get(key);
        return upd ? { ...p, ...upd } : p;
      });
    };

    const handlers = {
      handleLiveUpdate: (data: any) => {
        if (data._id?.toString() !== matchDataId) return;
        setLocalMatchData(data);
        setLastUpdateTime(Date.now());
      },

      handleMatchDataUpdate: (data: any) => {
        if (data.matchDataId !== matchDataId) return;
        setLocalMatchData((prev) => {
          if (!prev) return prev;
          const teams = prev.teams.map((team: any) => {
            if (team._id !== data.teamId && team.teamId !== data.teamId) return team;
            const changes = data.changes || {};
            const nextTeam: any = { ...team, ...changes };
            if (Array.isArray(changes.players)) {
              nextTeam.players = mergePlayers(team, changes.players);
            }
            return nextTeam;
          });
          return { ...prev, teams };
        });
        setLastUpdateTime(Date.now());
      },

      handlePlayerUpdate: (data: any) => {
        if (data.matchDataId !== matchDataId) return;
        setLocalMatchData((prev) => {
          if (!prev) return prev;
          const teams = prev.teams.map((team: any) => {
            if (team._id !== data.teamId && team.teamId !== data.teamId) return team;
            return {
              ...team,
              players: team.players.map((player: Player) =>
                player._id === data.playerId ? { ...player, ...data.updates } : player
              ),
            };
          });
          return { ...prev, teams };
        });
        setLastUpdateTime(Date.now());
      },

      handleTeamPointsUpdate: (data: any) => {
        if (data.matchDataId !== matchDataId) return;
        setLocalMatchData((prev) => {
          if (!prev) return prev;
          const teams = prev.teams.map((team: any) =>
            team._id === data.teamId || team.teamId === data.teamId
              ? { ...team, placePoints: data.changes?.placePoints ?? team.placePoints }
              : team
          );
          return { ...prev, teams };
        });
        setLastUpdateTime(Date.now());
      },

      handleTeamStatsUpdate: (data: any) => {
        if (data.matchDataId !== matchDataId) return;
        setLocalMatchData((prev) => {
          if (!prev) return prev;
          const teams = prev.teams.map((team: any) => {
            if (team._id !== data.teamId && team.teamId !== data.teamId) return team;
            const updatedPlayers = data.players
              ? team.players.map((player: any) => {
                  const upd = data.players.find((p: any) => p._id === player._id);
                  return upd ? { ...player, killNum: upd.killNum } : player;
                })
              : team.players;
            return { ...team, players: updatedPlayers };
          });
          return { ...prev, teams };
        });
        setLastUpdateTime(Date.now());
      },

      handleBulkTeamUpdate: (data: any) => {
        if (data.matchDataId !== matchDataId) return;
        setLocalMatchData((prev) => {
          if (!prev) return prev;
          const teams = prev.teams.map((team: any) => {
            const matches = team._id === data.teamId || team.teamId === data.teamId;
            if (!matches || !data.changes?.players) return team;
            return { ...team, players: mergePlayers(team, data.changes.players) };
          });
          return { ...prev, teams };
        });
        setLastUpdateTime(Date.now());
      },
    };

    freshSocket.on('liveMatchUpdate', handlers.handleLiveUpdate);
    freshSocket.on('matchDataUpdated', handlers.handleMatchDataUpdate);
    freshSocket.on('playerStatsUpdated', handlers.handlePlayerUpdate);
    freshSocket.on('teamPointsUpdated', handlers.handleTeamPointsUpdate);
    freshSocket.on('teamStatsUpdated', handlers.handleTeamStatsUpdate);
    freshSocket.on('bulkTeamUpdate', handlers.handleBulkTeamUpdate);

    return () => {
      freshSocket.off('liveMatchUpdate', handlers.handleLiveUpdate);
      freshSocket.off('matchDataUpdated', handlers.handleMatchDataUpdate);
      freshSocket.off('playerStatsUpdated', handlers.handlePlayerUpdate);
      freshSocket.off('teamPointsUpdated', handlers.handleTeamPointsUpdate);
      freshSocket.off('teamStatsUpdated', handlers.handleTeamStatsUpdate);
      freshSocket.off('bulkTeamUpdate', handlers.handleBulkTeamUpdate);
      // Keep the shared socket alive for other consumers on this page.
    };
  }, [matchDataId]);

  // ── Derived state, recomputed from whatever localMatchData currently is ──
  // (same shape as LiveStats's sortedTeams memo — this is the reliable bit)
  const sortedTeams = useMemo(() => {
    if (!localMatchData) return [];
    return localMatchData.teams
      .map((team) => ({
        ...team,
        totalKills: team.players.reduce((sum, p) => sum + (p.killNum || 0), 0),
        alive: team.players.filter((p) => p.liveState !== 5).length,
        teamRank: team.players.length > 0 ? team.players[0].rank || 0 : 0,
        isAllDead: isTeamAllDead(team),
      }))
      .sort((a, b) => {
        if (b.placePoints !== a.placePoints) return b.placePoints - a.placePoints;
        return b.totalKills - a.totalKills;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localMatchData, lastUpdateTime]);

  // ── The ONLY place that decides "this team just got eliminated" ──
  // Runs off derived data, so it's correct no matter which socket event
  // caused the change — exactly why LiveStats never misses an update.
  useEffect(() => {
    let queued = false;
    sortedTeams.forEach((team) => {
      if (team.isAllDead && !shownTeamsRef.current.has(team._id)) {
        shownTeamsRef.current.add(team._id);
        queueRef.current.push(team as unknown as Team);
        queued = true;
      }
    });
    if (queued) processQueue();
  }, [sortedTeams, processQueue]);

  if (!localMatchData) return null;

  const alertTeam = currentAlertTeam
    ? sortedTeams.find((t) => t._id === currentAlertTeam._id)
    : null;

  return (
    <AnimatePresence mode="wait">
      {showAlert && alertTeam && (
        <motion.div
          key={`alert-${alertIdRef.current}`}
          className="w-[1920px] h-[1080px] flex justify-center items-center relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg
            width="1920"
            height="1080"
            viewBox="0 0 3840 2160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
          >
            <defs>
              <linearGradient id="paint1_linear_2006_2" x1="1646" y1="570" x2="2395" y2="588">
                <stop stopColor={tournament.primaryColor || '#E01515'} />
                <stop offset="1" stopColor={tournament.secondaryColor || '#620505'} />
              </linearGradient>
            </defs>

            {/* STEP 1 — BLACK BOX */}
            <motion.rect
              x="1304"
              y="461"
              width="1187"
              height="275"
              fill="#000"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ originX: 0.5 }}
            />

            {/* TEAM LOGO */}
            <image x="1016" y="460" width="896" height="275" xlinkHref={alertTeam.teamLogo} />

            {/* STEP 2 — PURPLE BOX */}
            <motion.g
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
            >
              <path
                d="M1593 461L2491 461L2482 702.5L2452.5 736H1593V461Z"
                fill="url(#paint1_linear_2006_2)"
              />
              <text x="2015" y="668" fill="white" fontFamily="Bebas" fontSize="200" fontWeight="500">
                {alertTeam.teamTag}
              </text>
            </motion.g>

            {/* STEP 3 — GOLD BOX */}
            <motion.g
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.9 }}
            >
              <path
                d="M2491 461V367L1632.5 371L1595 406L1595 461H2491Z"
                fill="#FFD000"
              />
              <text x="1725" y="443" fill="black" fontFamily="payBack" fontSize="84">
                {alertTeam.totalKills} ELIMINATIONS
              </text>
            </motion.g>

            {/* RANK TEXT */}
            <text x="1675" y="668" fill="white" fontFamily="Bebas" fontSize="200" fontWeight="500">
              #{alertTeam.teamRank}
            </text>
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Alerts;