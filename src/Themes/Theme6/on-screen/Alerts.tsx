import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SocketManager from '../../../dashboard/socketManager.tsx';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  liveState: number;
  rank?: number;
}

interface Team {
  _id: string;
  teamTag: string;
  teamName: string;
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

// ─── Component ────────────────────────────────────────────────────────────────

const Alerts: React.FC<AlertsProps> = ({ tournament, round, match, matchData }) => {
  const [localMatchData,   setLocalMatchData]   = useState<MatchData | null>(matchData || null);
  const [matchDataId,      setMatchDataId]      = useState<string | null>(matchData?._id?.toString() || null);
  const [lastUpdateTime,   setLastUpdateTime]   = useState<number>(Date.now());
  const [showAlert,        setShowAlert]        = useState<boolean>(false);
  const [currentAlertTeam, setCurrentAlertTeam] = useState<Team | null>(null);

  const shownTeamsRef  = useRef<Set<string>>(new Set());
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertIdRef     = useRef<number>(0);

  // ── Sync matchData prop ────────────────────────────────────────────────────
  useEffect(() => {
    if (matchData) {
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
      setLastUpdateTime(Date.now());
    }
  }, [matchData]);

  // ── Reset when match changes ───────────────────────────────────────────────
  useEffect(() => {
    if (matchData && matchData._id?.toString() !== matchDataId) {
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
      shownTeamsRef.current.clear();
      setShowAlert(false);
      setCurrentAlertTeam(null);
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    }
  }, [matchData, matchDataId]);

  // ── Helper: trigger alert for a fully eliminated team ─────────────────────
  const triggerEliminationAlert = (team: Team) => {
    if (shownTeamsRef.current.has(team._id)) return;
    shownTeamsRef.current.add(team._id);
    alertIdRef.current += 1;
    setCurrentAlertTeam(team);
    setShowAlert(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowAlert(false);
      setCurrentAlertTeam(null);
      timeoutRef.current = null;
    }, 6000);
  };

  // ── Helper: is a team fully wiped ─────────────────────────────────────────
  const isEliminated = (team: Team) =>
    team.players.every(p => p.health === 0 || p.bHasDied || p.liveState === 5);

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!matchDataId) return;

    const socketManager = SocketManager.getInstance();
    const freshSocket   = socketManager.connect();

    const alertsHandlers = {
      handleLiveUpdate: (data: any) => {
        if (data._id?.toString() !== matchDataId) return;
        if (data._id) {
          setLocalMatchData((prev: MatchData | null) => {
            const newData = data;
            if (newData.teams) {
              for (const team of newData.teams) {
                if (isEliminated(team)) { triggerEliminationAlert(team); break; }
              }
            }
            return newData;
          });
          setLastUpdateTime(Date.now());
        }
      },

      handleMatchDataUpdate: (data: any) => {
        if (data.matchDataId !== matchDataId) return;
        setLocalMatchData((prev: MatchData | null) => {
          if (!prev) return prev;
          const updatedTeams = prev.teams.map((team: any) => {
            if (team._id === data.teamId || team.teamId === data.teamId) {
              const changes  = data.changes || {};
              const nextTeam = { ...team, ...changes };
              if (Array.isArray(changes.players)) {
                const byId = new Map(changes.players.map((p: any) => [p._id?.toString?.() || p._id, p]));
                nextTeam.players = team.players.map((p: Player) => {
                  const upd = byId.get(p._id?.toString?.() || p._id);
                  return upd ? { ...p, ...upd } : p;
                });
              }
              return nextTeam;
            }
            return team;
          });
          const updatedTeam = updatedTeams.find((t: any) => t._id === data.teamId || t.teamId === data.teamId);
          if (updatedTeam && isEliminated(updatedTeam)) triggerEliminationAlert(updatedTeam);
          return { ...prev, teams: updatedTeams };
        });
        setLastUpdateTime(Date.now());
      },

      handlePlayerUpdate: (data: any) => {
        if (data.matchDataId !== matchDataId) return;
        setLocalMatchData((prev: MatchData | null) => {
          if (!prev) return prev;
          const newTeams = prev.teams.map((team: any) => {
            if (team._id === data.teamId || team.teamId === data.teamId) {
              return {
                ...team,
                players: team.players.map((player: Player) =>
                  player._id === data.playerId ? { ...player, ...data.updates } : player
                ),
              };
            }
            return team;
          });
          const updatedTeam = newTeams.find((t: any) => t._id === data.teamId || t.teamId === data.teamId);
          if (updatedTeam && isEliminated(updatedTeam)) triggerEliminationAlert(updatedTeam);
          return { ...prev, teams: newTeams };
        });
        setLastUpdateTime(Date.now());
      },

      handleTeamPointsUpdate: (data: any) => {
        if (data.matchDataId !== matchDataId) return;
        setLocalMatchData((prev: MatchData | null) => {
          if (!prev) return prev;
          return {
            ...prev,
            teams: prev.teams.map((team: any) =>
              team._id === data.teamId || team.teamId === data.teamId
                ? { ...team, placePoints: data.changes?.placePoints ?? team.placePoints }
                : team
            ),
          };
        });
        setLastUpdateTime(Date.now());
      },

      handleTeamStatsUpdate: (data: any) => {
        if (data.matchDataId !== matchDataId) return;
        setLocalMatchData((prev: MatchData | null) => {
          if (!prev) return prev;
          return {
            ...prev,
            teams: prev.teams.map((team: any) => {
              if (team._id === data.teamId || team.teamId === data.teamId) {
                const updatedPlayers = data.players
                  ? team.players.map((player: any) => {
                      const upd = data.players.find((p: any) => p._id === player._id);
                      return upd ? { ...player, killNum: upd.killNum } : player;
                    })
                  : team.players;
                return { ...team, players: updatedPlayers };
              }
              return team;
            }),
          };
        });
        setLastUpdateTime(Date.now());
      },

      handleBulkTeamUpdate: (data: any) => {
        if (data.matchDataId !== matchDataId) return;
        setLocalMatchData((prev: MatchData | null) => {
          if (!prev) return prev;
          return {
            ...prev,
            teams: prev.teams.map((team: any) => {
              if ((team._id === data.teamId || team.teamId === data.teamId) && data.changes?.players) {
                const byId = new Map(data.changes.players.map((p: any) => [p._id?.toString?.() || p._id, p]));
                return {
                  ...team,
                  players: team.players.map((player: Player) => {
                    const upd = byId.get(player._id?.toString?.() || player._id);
                    return upd ? { ...player, ...upd } : player;
                  }),
                };
              }
              return team;
            }),
          };
        });
        setLastUpdateTime(Date.now());
      },
    };

    freshSocket.on('liveMatchUpdate',   alertsHandlers.handleLiveUpdate);
    freshSocket.on('matchDataUpdated',  alertsHandlers.handleMatchDataUpdate);
    freshSocket.on('playerStatsUpdated',alertsHandlers.handlePlayerUpdate);
    freshSocket.on('teamPointsUpdated', alertsHandlers.handleTeamPointsUpdate);
    freshSocket.on('teamStatsUpdated',  alertsHandlers.handleTeamStatsUpdate);
    freshSocket.on('bulkTeamUpdate',    alertsHandlers.handleBulkTeamUpdate);

    return () => {
      freshSocket.off('liveMatchUpdate',   alertsHandlers.handleLiveUpdate);
      freshSocket.off('matchDataUpdated',  alertsHandlers.handleMatchDataUpdate);
      freshSocket.off('playerStatsUpdated',alertsHandlers.handlePlayerUpdate);
      freshSocket.off('teamPointsUpdated', alertsHandlers.handleTeamPointsUpdate);
      freshSocket.off('teamStatsUpdated',  alertsHandlers.handleTeamStatsUpdate);
      freshSocket.off('bulkTeamUpdate',    alertsHandlers.handleBulkTeamUpdate);
    };
  }, [matchDataId]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  // ── Derived data ───────────────────────────────────────────────────────────
  const sortedTeams = useMemo(() => {
    if (!localMatchData) return [];
    return localMatchData.teams
      .map(team => ({
        ...team,
        totalKills: team.players.reduce((s, p) => s + (p.killNum || 0), 0),
        alive:      team.players.filter(p => p.liveState !== 5).length,
        teamRank:   team.players[0]?.rank || 0,
      }))
      .sort((a, b) =>
        b.placePoints !== a.placePoints
          ? b.placePoints - a.placePoints
          : b.totalKills - a.totalKills
      );
  }, [localMatchData, lastUpdateTime]);

  const alertTeam = useMemo(
    () => currentAlertTeam ? sortedTeams.find(t => t._id === currentAlertTeam._id) ?? null : null,
    [currentAlertTeam, sortedTeams]
  );

  if (!localMatchData) return null;

  const primary   = tournament.primaryColor  || '#6b21a8';
  const secondary = tournament.secondaryColor || '#c084fc';

  // ── Render ─────────────────────────────────────────────────────────────────
return (
  <div className="w-[1920px] h-[1080px] text-white p-8 relative">
    <AnimatePresence>
      {showAlert && alertTeam && (
        <motion.div
          key={`alert-${alertIdRef.current}`}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
          className="w-[600px] h-[180px] bg-black absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]"
        >
          <div className="w-full h-full relative">

            {/* LEFT PANEL */}
            <div
              style={{
                backgroundImage: `linear-gradient(to left top, ${primary}, ${secondary})`,
              }}
              className="w-[30%] h-full"
            />

           

            {/* Logo + Background Logo */}
            <div className="absolute top-[5px] w-[180px] h-[180px]">

              {/* Background logo */}
              <img
                src={alertTeam.teamLogo}
                alt=""
                className="absolute inset-0 w-full h-full object-contain grayscale opacity-10"
              />

              {/* Main logo */}
              <img
                src={alertTeam.teamLogo}
                alt=""
                className="w-full h-full object-contain relative z-10"
              />
            </div>

            {/* RIGHT PANEL */}
            <div
              className="w-[70%] h-full absolute top-0 left-[180px] text-center"
              style={{
                backgroundImage: `linear-gradient(to bottom right, ${primary}, ${secondary})`,
              }}
            >

              {/* TOP BAR (Team Name) */}
              <div
                style={{
                  backgroundImage: `url('/theme3assets/lines.avif')`,
                  backgroundSize: '300px',
                  backgroundRepeat: 'repeat',
                }}
                className="w-full h-[25%] bg-black relative overflow-hidden font-[AGENCYB] text-[30px]"
              >
                RANK {alertTeam.teamRank} - {alertTeam.totalKills} KILLS
              </div>

              {/* TEAM TAG */}
              <div className="font-[TUNGSTEN] text-[70px]">
               {alertTeam.teamName.toUpperCase()}
              </div>

              {/* BOTTOM BAR */}
              <div
                style={{
                  backgroundImage: `url('/theme3assets/lines.avif')`,
                  backgroundSize: '300px',
                  backgroundRepeat: 'repeat',
                }}
                className="w-full h-[25%] bg-black absolute top-[133px] font-[AGENCYB] text-[38px]"
              >
                <div className="relative top-[-7px]">TEAM ELIMINATED</div>
              </div>

              {/* EXTRA INFO */}
             

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
};

export default Alerts;
