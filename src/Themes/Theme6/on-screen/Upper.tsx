import React, { useEffect, useState, useMemo } from 'react';
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

  // Live stats fields
  health: number;
  healthMax: number;
  liveState: number; // 0 = knocked, 5 = dead, etc.
}

interface Team {
  _id: string;
  teamTag: string;
  slot?: number;
  placePoints: number;
  players: Player[];
  teamLogo:string;
}

interface MatchData {
  _id: string;
  teams: Team[];
}

interface UpperProps {
  tournament: Tournament;
  round?: Round | null;
  match?: Match | null;
  matchData?: MatchData | null;
}

const Upper: React.FC<UpperProps> = ({ tournament, round, match, matchData }) => {
  const [localMatchData, setLocalMatchData] = useState<MatchData | null>(matchData || null);
  const [matchDataId, setMatchDataId] = useState<string | null>(matchData?._id?.toString() || null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [socketStatus, setSocketStatus] = useState<string>('disconnected');
  const [updateCount, setUpdateCount] = useState<number>(0);

  useEffect(() => {
    if (matchData) {
      console.log('Upper: Received new matchData prop, updating local state');
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
      setLastUpdateTime(Date.now());
    }
  }, [matchData]);

  useEffect(() => {
    if (!match?._id || !matchDataId) return;

    console.log('Setting up real-time listeners for Upper - match:', match._id, 'matchData:', matchDataId);

    // Get a fresh socket connection from the manager
    const socketManager = SocketManager.getInstance();
    const freshSocket = socketManager.connect();

    console.log('Socket connected:', freshSocket?.connected);
    console.log('Socket ID:', freshSocket?.id);

    // Update initial status
    setSocketStatus(freshSocket?.connected ? 'connected' : 'disconnected');

    // Test socket connection
    freshSocket.emit('test', 'Upper component connected');

    // Log all incoming events for debugging
    const debugHandler = (eventName: string, data: any) => {
      console.log(`Upper: Received ${eventName}:`, data);
    };

    freshSocket.onAny(debugHandler);

    // Create unique event handler names to avoid conflicts with dashboard
    const upperHandlers = {
      handleLiveUpdate: (data: any) => {
        console.log('Upper: Received liveMatchUpdate for match:', data._id);

        // Check if this update is for the current matchData
        if (data._id?.toString() !== matchDataId) {
          console.log('Upper: liveMatchUpdate not for current matchData, ignoring');
          return;
        }

        console.log('Upper: Updating localMatchData with live API data');
        setLocalMatchData(data);
        setLastUpdateTime(Date.now());
        setUpdateCount(prev => prev + 1);
      },

      handleMatchDataUpdate: (data: any) => {
        console.log('Upper: Received matchDataUpdated:', data);
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            const updatedTeams = prev.teams.map((team: any) => {
              // Check both _id and teamId for team matching
              if (team._id === data.teamId || team.teamId === data.teamId) {
                const changes = data.changes || {};
                const nextTeam: any = { ...team, ...changes };
                if (Array.isArray(changes.players)) {
                  const updatesById = new Map(
                    changes.players.map((p: any) => [p._id?.toString?.() || p._id, p])
                  );
                  nextTeam.players = team.players.map((p: Player) => {
                    const key = p._id?.toString?.() || p._id;
                    const upd = updatesById.get(key);
                    return upd ? { ...p, ...upd } : p;
                  });
                }
                return nextTeam;
              }
              return team;
            });
            return { ...prev, teams: updatedTeams };
          });
          setLastUpdateTime(Date.now());
          setUpdateCount(prev => prev + 1);
        }
      },

      handlePlayerUpdate: (data: any) => {
        console.log('Upper: Received playerStatsUpdated:', data);
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                // Check both _id and teamId for team matching
                if (team._id === data.teamId || team.teamId === data.teamId) {
                  return {
                    ...team,
                    players: team.players.map((player: Player) =>
                      player._id === data.playerId
                        ? { ...player, ...data.updates }
                        : player
                    ),
                  };
                }
                return team;
              }),
            };
          });
          setLastUpdateTime(Date.now());
        }
      },

      handleTeamPointsUpdate: (data: any) => {
        console.log('Upper: Received team points update:', data);
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                // Check both _id and teamId for team matching
                if (team._id === data.teamId || team.teamId === data.teamId) {
                  return {
                    ...team,
                    placePoints: data.changes?.placePoints ?? team.placePoints,
                  };
                }
                return team;
              }),
            };
          });
          setLastUpdateTime(Date.now());
        }
      },

      handleTeamStatsUpdate: (data: any) => {
        console.log('Upper: Received teamStatsUpdated:', data);
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                // Check both _id and teamId for team matching
                if (team._id === data.teamId || team.teamId === data.teamId) {
                  // Update player kill numbers if provided
                  const updatedPlayers = data.players ?
                    team.players.map((player: any) => {
                      const playerUpdate = data.players.find((p: any) => p._id === player._id);
                      return playerUpdate ? { ...player, killNum: playerUpdate.killNum } : player;
                    }) : team.players;

                  return {
                    ...team,
                    players: updatedPlayers,
                  };
                }
                return team;
              }),
            };
          });
          setLastUpdateTime(Date.now());
        }
      },

      handleBulkTeamUpdate: (data: any) => {
        console.log('Upper: Received bulk team update:', data);
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                // Check both _id and teamId for team matching
                if ((team._id === data.teamId || team.teamId === data.teamId) && data.changes?.players) {
                  const playerUpdates = new Map(
                    data.changes.players.map((p: any) => [p._id?.toString?.() || p._id, p])
                  );
                  return {
                    ...team,
                    players: team.players.map((player: Player) => {
                      const key = player._id?.toString?.() || player._id;
                      const update = playerUpdates.get(key);
                      return update ? { ...player, ...update } : player;
                    }),
                  };
                }
                return team;
              }),
            };
          });
          setLastUpdateTime(Date.now());
        }
      },

      handleConnect: () => {
        console.log('Upper: Socket connected');
        setSocketStatus('connected');
      },

      handleDisconnect: () => {
        console.log('Upper: Socket disconnected');
        setSocketStatus('disconnected');
      }
    };

    // Listen to all relevant socket events with unique handlers
    freshSocket.on('liveMatchUpdate', upperHandlers.handleLiveUpdate);
    freshSocket.on('matchDataUpdated', upperHandlers.handleMatchDataUpdate);
    freshSocket.on('playerStatsUpdated', upperHandlers.handlePlayerUpdate);
    freshSocket.on('teamPointsUpdated', upperHandlers.handleTeamPointsUpdate);
    freshSocket.on('teamStatsUpdated', upperHandlers.handleTeamStatsUpdate);
    freshSocket.on('bulkTeamUpdate', upperHandlers.handleBulkTeamUpdate);
    freshSocket.on('connect', upperHandlers.handleConnect);
    freshSocket.on('disconnect', upperHandlers.handleDisconnect);

    return () => {
      console.log('Upper: Cleaning up socket listeners');
      // Clean up debug handler
      freshSocket.offAny();

      // Clean up with the exact same handler references
      freshSocket.off('liveMatchUpdate', upperHandlers.handleLiveUpdate);
      freshSocket.off('matchDataUpdated', upperHandlers.handleMatchDataUpdate);
      freshSocket.off('playerStatsUpdated', upperHandlers.handlePlayerUpdate);
      freshSocket.off('teamPointsUpdated', upperHandlers.handleTeamPointsUpdate);
      freshSocket.off('teamStatsUpdated', upperHandlers.handleTeamStatsUpdate);
      freshSocket.off('bulkTeamUpdate', upperHandlers.handleBulkTeamUpdate);
      freshSocket.off('connect', upperHandlers.handleConnect);
      freshSocket.off('disconnect', upperHandlers.handleDisconnect);
      // Notify socket manager that this component is done with the socket
      socketManager.disconnect();
    };
  }, [match?._id, matchDataId]);

  // Add effect to handle prop changes and force re-render
  useEffect(() => {
    if (matchData && matchData._id?.toString() !== matchDataId) {
      console.log('MatchData prop changed, updating local state');
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
    }
  }, [matchData, matchDataId]);

  // Get top 5 teams by alive players - recalculated on every localMatchData change
  const topTeams = useMemo(() => {
    if (!localMatchData) return [];

    console.log('Upper: Recalculating topTeams at', new Date(lastUpdateTime).toLocaleTimeString());

    const useApiHealth = round?.apiEnable === true;

    return localMatchData.teams
      .map(team => {
        const aliveCount = team.players.filter(p => !p.bHasDied).length;
        let wwcd: number;
        if (useApiHealth) {
          // API enabled - use health sum / 4
          wwcd = Math.round(team.players.reduce((sum, p) => sum + (p.health || 0), 0) / 4);
        } else {
          // API disabled - count alive players (not bHasDied) * 25
          wwcd = Math.round(aliveCount * 25);
        }
        return {
          ...team,
          totalKills: team.players.reduce((sum, p) => sum + (p.killNum || 0), 0),
          aliveCount,
          wwcd,
        };
      })
      .filter(team => team.aliveCount > 0) // Only teams with alive players
      .sort((a, b) => b.aliveCount - a.aliveCount)
      .slice(0, 5);
  }, [localMatchData, lastUpdateTime, round?.apiEnable]);

  if (!localMatchData) {
    return (
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="1600" y="350" fontFamily="Arial" fontSize="24" fill="white">No match data</text>
      </svg>
    );
  }

  // Upper component UI
return (
  <div className="w-[1920px] h-[1080px] relative ">
    {/* Horizontal Team Cards */}
    {topTeams.map((team, index) => {
      const CARD_W = 330;
      const CARD_H = 90;
      const GAP = 30;
      const TOTAL_W = topTeams.length * CARD_W + (topTeams.length - 1) * GAP;
      const startX = (1920 - TOTAL_W) / 2;
      const baseX = startX + index * (CARD_W + GAP);
      const baseY = 40;

      const BAR_W = 14;
      const BAR_MAX = 60;

      const WWCD_BOX_WIDTH = 320;
      const WWCD_BOX_HEIGHT = 35;
      const wwcdWidth = Math.max(0, (team.wwcd / 100) * WWCD_BOX_WIDTH);

      let wwcdColor = "#22c55e"; // default green
      if (team.wwcd >= 75) wwcdColor = "#22c55e";
      else if (team.wwcd >= 50) wwcdColor = "#facc15";
      else if (team.wwcd >= 25) wwcdColor = "#f97316";
      else wwcdColor = "#ef4444";

      return (
        <div
          key={team._id}
          className="absolute"
          style={{
            left: baseX,
            top: baseY,
            width: CARD_W,
            height: CARD_H + WWCD_BOX_HEIGHT + 20, // extra space for WWCD
          }}
        >
          {/* Main Card */}
          <div
            style={{
              width: CARD_W,
              height: CARD_H,
              background: `linear-gradient(135deg, ${tournament.primaryColor || "#000"}, ${
                tournament.secondaryColor || "#333"
              })`,
              position: "relative",
            }}
          >
            {/* Left white strip */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 7,
                height: CARD_H,
                backgroundColor: "#fff",
              }}
            />
            {/* Right fade */}
            <div
              style={{
                position: "absolute",
                left: CARD_W * 0.55 + 16,
                top: 0,
                width: CARD_W * 0.4,
                height: CARD_H,
                background: "linear-gradient(to right, #383838, #000)",
              }}
            />
            {/* Team Logo */}
            <img
              src={team.teamLogo}
              alt={team.teamTag}
              style={{
                position: "absolute",
                left: 12,
                top: 15,
                width: 60,
                height: 60,
                objectFit: "cover",
              }}
            />
            {/* Team Tag */}
            <span
              style={{
                position: "absolute",
                left: 85,
                top: 58 - 32, // adjust text vertical
                fontSize: 32,
                fontWeight: 900,
                fontFamily: "Supermolot, sans-serif",
                color: "white",
              }}
            >
              {team.teamTag}
            </span>

            {/* Player health bars */}
            {team.players.slice(0, 4).map((player, i) => {
              const barX = 230 + i * (BAR_W + 6);
              const barY = 15;

              const isDead = player.liveState === 5 || player.bHasDied;
              const isKnocked = player.liveState === 4;
              const useApi = round?.apiEnable;

              let height = BAR_MAX;
              let color = "#fff";

              if (useApi) {
                const ratio = Math.max(0, Math.min(1, player.health / (player.healthMax || 100)));
                height = ratio * BAR_MAX;
                color = isDead ? "#6b7280" : isKnocked ? "bg-red-500" : "#0DD10D";
              } else {
                color = isDead ? "#6b7280" : isKnocked ? "bg-red-500" : "#0DD10D";
              }

              return (
                <div key={player._id}>
                  {/* Background bar */}
                  <div
                    style={{
                      position: "absolute",
                      left: barX,
                      top: barY,
                      width: BAR_W,
                      height: BAR_MAX,
                      backgroundColor: "#4b5563",
                    }}
                  />
                  {/* Foreground health bar */}
                  <div
                    style={{
                      position: "absolute",
                      left: barX,
                      top: barY + (BAR_MAX - height),
                      width: BAR_W,
                      height: height,
                      backgroundColor: color,
                    }}
                  />
                  
                </div>
              );
            })}
            {/* WWCD bar */}
   <div
  style={{
    position: "absolute",
    top: CARD_H + 10,
    left: 8,
    width: WWCD_BOX_WIDTH,
    height: WWCD_BOX_HEIGHT,
    backgroundColor: "#111", // container background
    overflow: "hidden",
  }}
>
  {/* Diagonal animated bar */}
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      height: "100%",
      width: `${team.wwcd}%`,
      background: `linear-gradient(135deg, ${wwcdColor}, #fff2)`, // adds depth
      transform: "skewX(-20deg)", // slanted diagonal
      transformOrigin: "left",
      transition: "width 1s cubic-bezier(0.25, 1, 0.5, 1)", // smooth throttle
    }}
  />

  {/* Overlay text */}
  <span
    style={{
      position: "absolute",
      width: "100%",
      textAlign: "center",
      top: "50%",
      transform: "translateY(-50%)",
      color: "white",
      fontSize: 20,
      fontFamily: "payBack, sans-serif",
      textShadow: "0 0 4px black",
      pointerEvents: "none",
    }}
  >
    WWCD - {team.wwcd}%
  </span>
</div>
          </div>
        </div>
      );
    })}
  </div>
);




};

export default Upper;