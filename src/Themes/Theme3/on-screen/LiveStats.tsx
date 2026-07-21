import React, { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
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

  // New real-time flags ported over from the HTML version
  isFiring?: boolean;
  isOutsideBlueCircle?: boolean;
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

interface LiveStatsProps {
  tournament: Tournament;
  round?: Round | null;
  match?: Match | null;
  matchData?: MatchData | null;
  overallData?: any;
}

// ─────────────────────────────────────────────
// EliminatedOverlay (SVG version)
// Expands a colored bar across the row and fades
// in "ELIMINATED" text, then collapses again.
// ─────────────────────────────────────────────
interface EliminatedOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onDone: () => void;
}

const EliminatedOverlay = memo(({ x, y, width, height, onDone }: EliminatedOverlayProps) => {
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => setExpanded(true));
    const outTimer = setTimeout(() => setPhase('out'), 2500);
    const doneTimer = setTimeout(() => onDone(), 3300);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(outTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  const isExpanded = phase === 'in' && expanded;
  const currentWidth = isExpanded ? width - 5 : 0;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={x}
        y={y}
        height={height}
        width={currentWidth}
        fill="url(#eliminatedGradient)"
        style={{
          transition:
            phase === 'in'
              ? 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)'
              : 'width 0.6s cubic-bezier(0.55, 0, 1, 0.45)',
        }}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 + 14}
        textAnchor="middle"
        fontFamily="AGENCYB, Arial"
        fontSize="34"
        fontWeight="bold"
        fill="white"
        letterSpacing="6"
        style={{
          opacity: isExpanded ? 1 : 0,
          transition: phase === 'in' ? 'opacity 0.4s ease 0.8s' : 'opacity 0.3s ease',
        }}
      >
        ELIMINATED
      </text>
    </g>
  );
});
EliminatedOverlay.displayName = 'EliminatedOverlay';

// ─────────────────────────────────────────────
// FiringIcon (SVG bullet icon, pulsing red glow)
// ─────────────────────────────────────────────
const FiringIcon = ({ cx, cy, size }: { cx: number; cy: number; size: number }) => (
  <g
    className="fire-icon"
    transform={`translate(${cx - size / 2}, ${cy - size / 2}) scale(${size / 500})`}
  >
    <g fill="white" stroke="red" strokeWidth="6" transform="rotate(90 250 250)">
      <polygon points="285.374,191.068 285.374,151.082 218.227,151.082 218.227,191.068 204.646,218.23 298.955,218.23" />
      <rect x="201.441" y="235.015" width="100.721" height="184.656" />
      <path
        d="M270.558,41.682L259.84,5.985C258.774,2.434,255.509,0,251.799,0c-3.702,0-6.975,2.434-8.041,5.984l-10.71,35.697
        c-9.031,30.107-13.765,61.23-14.512,92.613h66.535C284.323,102.912,279.589,71.789,270.558,41.682z"
      />
    </g>
    <path
      d="M294.703,458.164c0.26-0.688,0.537-1.368,0.713-2.09l4.902-19.615h-97.037l4.893,19.615
      c0.185,0.722,0.453,1.402,0.722,2.09c-4.516,3.794-7.453,9.417-7.453,15.763v8.998c0,11.407,9.275,20.681,20.681,20.681h59.358
      c11.398,0,20.681-9.275,20.681-20.681v-8.998C302.165,467.581,299.228,461.957,294.703,458.164z"
      fill="white"
      stroke="red"
      strokeWidth="6"
    />
  </g>
);

// ─────────────────────────────────────────────
// TeamRow (SVG) — carries the per-row effects:
//  - dim the whole row once the team is all dead
//  - pulsing blue overlay while outside the circle
//  - "ELIMINATED" sweep the moment the team dies
//  - firing bullet icon replacing the rank number
// ─────────────────────────────────────────────
interface TeamRowProps {
  team: any;
  index: number;
  round?: Round | null;
  rowHeight: number;
}

const TeamRow = ({ team, index, round, rowHeight }: TeamRowProps) => {
  const wasEliminatedRef = useRef(team.isAllDead);
  const overlayKeyRef = useRef(0);
  const [overlayKey, setOverlayKey] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);

  const handleOverlayDone = useCallback(() => setShowOverlay(false), []);

  useEffect(() => {
    if (team.isAllDead && !wasEliminatedRef.current) {
      overlayKeyRef.current += 1;
      setOverlayKey(overlayKeyRef.current);
      setShowOverlay(true);
    }
    if (!team.isAllDead && wasEliminatedRef.current) {
      setShowOverlay(false);
    }
    wasEliminatedRef.current = team.isAllDead;
  }, [team.isAllDead]);

  const y = index * rowHeight;
  const isFiring = team.players.some((p: Player) => p.isFiring);

  return (
    <g style={{ opacity: team.isAllDead ? 0.80 : 1, transition: 'opacity 0.6s ease' }}>
      <rect x="2953" y={y} width="887" height={rowHeight} fill="url(#blackGradient)" />
      <rect x="3059" y={y} width="380" height={rowHeight} fill="url(#paint2_linear_2001_9)" />
      <rect
        x="3059"
        y={y}
        width="393"
        height={rowHeight}
        fill="url(#paint3_linear_2001_9)"
        fillOpacity="0.76"
      />
      <rect x="2949" y={y} width="10" height={rowHeight} fill="url(#paint4_linear_2001_9)" />
      <line x1="2949" y1={y + rowHeight} x2="3840" y2={y + rowHeight} stroke="white" strokeWidth="2" />

      {/* Outside-blue-circle pulse, only while the team is still alive */}
      {team.hasOutsideBlueCircle && !team.isAllDead && (
        <rect
          x="2953"
          y={y}
          width="887"
          height={rowHeight}
          fill="#3b82f6"
          className="pulse-blue-row"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {isFiring ? (
        <FiringIcon cx={3010} cy={y + rowHeight / 2} size={48} />
      ) : (
        <text x="2990" y={y + 65} fontFamily="supermolot" fontSize="48" fill="white" fontWeight="700">
          {index + 1}
        </text>
      )}

      <image
        href={team.teamLogo}
        x="3070"
        y={y + 6}
        width="80"
        height="80"
        preserveAspectRatio="xMidYMid meet"
      />
      <text x="3170" y={y + 65} fontFamily="supermolot" fontSize="48" fill="white" fontWeight="700">
        {team.teamTag}
      </text>

      {/* Health Bars */}
      <g transform={`translate(3470, ${y + 14})`}>
        {team.players.length === 0 ? (
          <text x="0" y="35" fontFamily="supermolot" fontSize="30" fill="white" fontWeight="bold">
            MISS
          </text>
        ) : (
          team.players.map((player: Player, pIndex: number) => {
            const isDead = player.liveState === 5 || player.bHasDied;
            const isAlive = [0, 1, 2, 3].includes(player.liveState);
            const isKnocked = player.liveState === 4;
            const useApiHealth = round?.apiEnable === true;

            const BASE_BAR_H = 70;
            const BAR_W = 15;
            const GAP = 5;

            let barHeight = 0;
            let barColor = '';

            if (useApiHealth) {
              if (isDead) {
                barHeight = 0;
                barColor = 'transparent';
              } else if (isKnocked) {
                const healthRatio = Math.max(0, Math.min(1, player.health / (player.healthMax || 100)));
                barHeight = healthRatio * BASE_BAR_H;
                barColor = '#ef4444';
              } else if (isAlive) {
                const healthRatio = Math.max(0, Math.min(1, player.health / (player.healthMax || 100)));
                barHeight = healthRatio * BASE_BAR_H;
                barColor = '#ffffff';
              }
            } else {
              if (isDead) {
                barHeight = 0;
                barColor = 'transparent';
              } else if (isKnocked) {
                barHeight = BASE_BAR_H;
                barColor = '#ef4444';
              } else if (isAlive) {
                barHeight = BASE_BAR_H;
                barColor = '#ffffff';
              }
            }

            return (
              <g key={player._id} transform={`translate(${pIndex * (BAR_W + GAP)}, 0)`}>
                <rect width={BAR_W} height={BASE_BAR_H} fill="#4b5563" />
                <rect y={BASE_BAR_H - barHeight} width={BAR_W} height={barHeight} fill={barColor} />
              </g>
            );
          })
        )}
      </g>

      <text x="3620" y={y + 65} fontFamily="supermolot" fontSize="48" fill="white" fontWeight="700">
        {team.totalKills}
      </text>
      <text x="3720" y={y + 65} fontFamily="supermolot" fontSize="48" fill="white" fontWeight="700">
        {team.totalPoints}
      </text>

      {showOverlay && (
        <EliminatedOverlay
          key={overlayKey}
          x={2953}
          y={y}
          width={887}
          height={rowHeight}
          onDone={handleOverlayDone}
        />
      )}
    </g>
  );
};

const LiveStats: React.FC<LiveStatsProps> = ({ tournament, round, match, matchData, overallData }) => {
  const [localMatchData, setLocalMatchData] = useState<MatchData | null>(matchData || null);

  const [matchDataId, setMatchDataId] = useState<string | null>(matchData?._id?.toString() || null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [socketStatus, setSocketStatus] = useState<string>('disconnected');
  const [updateCount, setUpdateCount] = useState<number>(0);
  const [overallMap, setOverallMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (matchData) {
      console.log('LiveStats: Received new matchData prop, updating local state');
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
      setLastUpdateTime(Date.now());
    }
  }, [matchData]);

  useEffect(() => {
    if (!match?._id || !matchDataId) return;

    console.log('Setting up real-time listeners for LiveStats - match:', match._id, 'matchData:', matchDataId);

    // Get a fresh socket connection from the manager
    const socketManager = SocketManager.getInstance();
    const freshSocket = socketManager.connect();

    console.log('Socket connected:', freshSocket?.connected);
    console.log('Socket ID:', freshSocket?.id);

    // Update initial status
    setSocketStatus(freshSocket?.connected ? 'connected' : 'disconnected');

    // Test socket connection
    freshSocket.emit('test', 'LiveStats component connected');

    // Log all incoming events for debugging
    const debugHandler = (eventName: string, data: any) => {
      console.log(`LiveStats: Received ${eventName}:`, data);
    };

    freshSocket.onAny(debugHandler);

    // Create unique event handler names to avoid conflicts with dashboard
    const liveStatsHandlers = {
      handleLiveUpdate: (data: any) => {
        console.log('LiveStats: Received liveMatchUpdate for match:', data._id);

        // Check if this update is for the current matchData
        if (data._id?.toString() !== matchDataId) {
          console.log('LiveStats: liveMatchUpdate not for current matchData, ignoring');
          return;
        }

        console.log('LiveStats: Updating localMatchData with live API data');
        setLocalMatchData(data);
        setLastUpdateTime(Date.now());
        setUpdateCount(prev => prev + 1);
      },

      handleMatchDataUpdate: (data: any) => {
        console.log('LiveStats: Received matchDataUpdated:', data);
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
        console.log('LiveStats: Received playerStatsUpdated:', data);
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
        console.log('LiveStats: Received team points update:', data);
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
        console.log('LiveStats: Received teamStatsUpdated:', data);
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
        console.log('LiveStats: Received bulk team update:', data);
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
        console.log('LiveStats: Socket connected');
        setSocketStatus('connected');
      },

      handleDisconnect: () => {
        console.log('LiveStats: Socket disconnected');
        setSocketStatus('disconnected');
      }
    };

    // Listen to all relevant socket events with unique handlers
    freshSocket.on('liveMatchUpdate', liveStatsHandlers.handleLiveUpdate);
    freshSocket.on('matchDataUpdated', liveStatsHandlers.handleMatchDataUpdate);
    freshSocket.on('playerStatsUpdated', liveStatsHandlers.handlePlayerUpdate);
    freshSocket.on('teamPointsUpdated', liveStatsHandlers.handleTeamPointsUpdate);
    freshSocket.on('teamStatsUpdated', liveStatsHandlers.handleTeamStatsUpdate);
    freshSocket.on('bulkTeamUpdate', liveStatsHandlers.handleBulkTeamUpdate);
    freshSocket.on('connect', liveStatsHandlers.handleConnect);
    freshSocket.on('disconnect', liveStatsHandlers.handleDisconnect);

    return () => {
      console.log('LiveStats: Cleaning up socket listeners');
      // Clean up debug handler
      freshSocket.offAny();

      // Clean up with the exact same handler references
      freshSocket.off('liveMatchUpdate', liveStatsHandlers.handleLiveUpdate);
      freshSocket.off('matchDataUpdated', liveStatsHandlers.handleMatchDataUpdate);
      freshSocket.off('playerStatsUpdated', liveStatsHandlers.handlePlayerUpdate);
      freshSocket.off('teamPointsUpdated', liveStatsHandlers.handleTeamPointsUpdate);
      freshSocket.off('teamStatsUpdated', liveStatsHandlers.handleTeamStatsUpdate);
      freshSocket.off('bulkTeamUpdate', liveStatsHandlers.handleBulkTeamUpdate);
      freshSocket.off('connect', liveStatsHandlers.handleConnect);
      freshSocket.off('disconnect', liveStatsHandlers.handleDisconnect);
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

  useEffect(() => {
    if (overallData && Array.isArray(overallData.teams) && match?.matchNo !== 1) {
      const map = new Map<string, any>();
      for (const t of overallData.teams) {
        const key = t.teamId?.toString?.() || t.teamId;
        if (!key) continue;
        map.set(key, {
          placePoints: t.placePoints || 0,
          players: Array.isArray(t.players) ? t.players : [],
        });
      }
      setOverallMap(map);
    } else {
      setOverallMap(new Map());
    }
  }, [overallData, match?.matchNo]);

  const sortedTeams = useMemo(() => {
    if (!localMatchData) return [];

    return localMatchData.teams
      .map(team => {
        const teamKey = (team as any).teamId?.toString?.() || (team as any).teamId || team._id;
        const overall = overallMap.get(teamKey);
        const liveKills = team.players.reduce((sum, p) => sum + (p.killNum || 0), 0);
        const overallKills = overall && Array.isArray(overall.players)
          ? overall.players.reduce((s: number, p: any) => s + (p.killNum || 0), 0)
          : 0;
        const totalPoints = (match?.matchNo === 1 ? 0 : (overall?.placePoints || 0)) + (team.placePoints || 0) + liveKills + (match?.matchNo === 1 ? 0 : overallKills);
        const isAllDead = team.players.every(player => player.liveState === 5 || player.bHasDied);
        const hasOutsideBlueCircle = team.players.some(player => player.isOutsideBlueCircle === true);

        return {
          ...team,
          totalKills: liveKills,
          alive: team.players.filter(p => p.liveState !== 5).length,
          totalPoints,
          isAllDead,
          hasOutsideBlueCircle,
        } as any;
      })
      .sort((a: any, b: any) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return b.totalKills - a.totalKills;
      });
  }, [localMatchData, overallMap, match?.matchNo, lastUpdateTime]);

  const ROW_HEIGHT = 100;
  const START_Y = 50;
  const TOTAL_HEIGHT = 2160;
  const AVAILABLE_HEIGHT = TOTAL_HEIGHT - START_Y;
  const contentHeight = sortedTeams.length * ROW_HEIGHT;
  const scale = contentHeight > AVAILABLE_HEIGHT ? AVAILABLE_HEIGHT / contentHeight : 1;

  if (!localMatchData) {
    return (
      <svg width="1920" height="1200" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="1600" y="350" fontFamily="Arial" fontSize="24" fill="white">No match data</text>
      </svg>
    );
  }

  return (
    <svg
      width="1920"
      height="1200"
      viewBox="0 0 3840 2160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Keyframes for the ported-over effects */}
      <style>{`
        @keyframes pulseBlueRow {
          0%   { fill-opacity: 0.12; }
          50%  { fill-opacity: 0.45; }
          100% { fill-opacity: 0.12; }
        }
        .pulse-blue-row {
          animation: pulseBlueRow 1.2s ease-in-out infinite;
        }
        @keyframes firePulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.35; }
        }
        .fire-icon {
          animation: firePulse 0.6s ease-in-out infinite;
          filter: drop-shadow(0 0 10px red) drop-shadow(0 0 18px red);
        }
      `}</style>

      {/* Dynamic team data */}
      <g transform={`translate(0, ${START_Y}) scale(1, ${scale})`}>
        {/* Header attached to scale group */}
        <g transform="translate(0, -567)">
          <path
            d="M3059 534.5L3081.14 512L3840 504V567H3059L3059 534.5Z"
            fill="url(#paint0_linear_2001_9)"
          />

          <text
            x="3165"
            y="558"
            fontFamily="Bebas"
            fontSize="44"
            fontWeight="300"
            fill="white"

          >
            TEAM
          </text>
          <text
            x="3470"
            y="558"
            fontFamily="Bebas"
            fontSize="44"
            fill="white"

          >
            ALIVE
          </text>
          <text
            x="3608"
            y="558"
            fontFamily="Bebas"
            fontSize="44"
            fill="white"

          >
            KILLS
          </text>
          <text
            x="3710"
            y="558"
            fontFamily="Bebas"
            fontSize="44"
            fill="white"

          >
            TOTAL
          </text>
        </g>

        {sortedTeams.map((team, index) => (
          <TeamRow key={team._id} team={team} index={index} round={round} rowHeight={ROW_HEIGHT} />
        ))}
        {/* Footer attached to scale group - Inverted Header */}
      {/* Footer attached to scale group */}
<g transform={`translate(3059, ${sortedTeams.length * ROW_HEIGHT})`}>
  <rect
    x="0"
    y="0"
    width="900"
    height="53"
    fill="url(#paint0_linear_2001_9)"
  />
   <rect
    x="60"
    y="10"
    width="35"
    height="35"
    fill="white"
  />
  <text
    x="106"
    y="44"
    fontFamily="Bebas"
    fontSize="44"
    fontWeight="300"
    fill="white"
  >
    ALIVE
  </text>
    <rect
    x="265"
    y="10"
    width="35"
    height="35"
    fill="red"
  />
  <text
    x="306"
    y="44"
    fontFamily="Bebas"
    fontSize="44"
    fontWeight="300"
    fill="white"
  >
    KNOCK
  </text>  <rect
    x="490"
    y="10"
    width="35"
    height="35"
    fill="grey"
  />
  <text
    x="536"
    y="44"
    fontFamily="Bebas"
    fontSize="44"
    fontWeight="300"
    fill="white"
  >
    DEAD
  </text>
</g>



      </g>

      <defs>
     <linearGradient
  id="blackGradient"
  x1="0"
  y1="0"
  x2="0"
  y2="1"
>
  <stop stopColor="#0c0c0c" stopOpacity="0.9" />
  <stop offset="0.826923" stopColor="0.8" />
</linearGradient>

        <linearGradient
          id="lightGradient"
          x1="3320"
          y1="567"
          x2="3320"
          y2="691"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#bd1717" />
          <stop offset="0.826923" stopColor="#292929" />
        </linearGradient>

        <linearGradient
          id="paint0_linear_2001_9"
          x1="3105.73"
          y1="529.109"
          x2="3751.74"
          y2="586.34"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={tournament.primaryColor || "#E01515"} />
          <stop offset="1" stopColor={tournament.secondaryColor || "#620505"} />
        </linearGradient>

        <linearGradient
          id="paint1_linear_2001_9"
          x1="3429"
          y1="567"
          x2="3427.5"
          y2="723"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="transparent" />
          <stop offset="0.826923" stopColor="#888" />
        </linearGradient>

        <linearGradient
          id="paint2_linear_2001_9"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop stopColor={tournament.primaryColor || "#E01515"} />
          <stop offset="1" stopColor={tournament.secondaryColor || "#620505"} />
        </linearGradient>



        <linearGradient
          id="paint4_linear_2001_9"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop stopColor={tournament.primaryColor || "#DA1414"} />
          <stop offset="1" stopColor={tournament.secondaryColor || "#4F0707"} />
        </linearGradient>

        {/* Gradient used by the ELIMINATED sweep overlay */}
        <linearGradient
          id="eliminatedGradient"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
        >
          <stop stopColor={tournament.primaryColor || "#E01515"} />
          <stop offset="1" stopColor={tournament.secondaryColor || "#620505"} />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default LiveStats;