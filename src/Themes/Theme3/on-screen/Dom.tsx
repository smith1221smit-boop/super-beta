import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
  liveState: number;
  // New stat fields used for additional milestones
  killNumByGrenade?: number;
  killNumInVehicle?: number;
  damage?: number;
  gotAirDropNum?: number;
}

interface Team {
  _id: string;
  teamTag: string;
  teamId?: string;
  slot?: number;
  placePoints: number;
  players: Player[];
  teamLogo: string;
}

interface MatchData {
  _id: string;
  teams: Team[];
}

interface DomProps {
  tournament: Tournament;
  round?: Round | null;
  match?: Match | null;
  matchData?: MatchData | null;
}

const Dom: React.FC<DomProps> = React.memo(({ tournament, round, match, matchData }) => {
  const [localMatchData, setLocalMatchData] = useState<MatchData | null>(matchData || null);
  const [matchDataId, setMatchDataId] = useState<string | null>(matchData?._id?.toString() || null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [displayedPlayer, setDisplayedPlayer] = useState<(Player & { teamTag: string; teamLogo: string; milestone: string }) | null>(null);

  // Refs to prevent loops
  const prevDataRef = useRef<any[]>([]);
  const prevKillsMap = useRef<{ [key: string]: number }>({});
  const displayTimerRef = useRef<number | null>(null);
  const firstBloodTriggered = useRef(false);
  const previousDeadPlayersRef = useRef<Player[]>([]);

  // Refs for new milestone tracking (grenade kills, vehicle kills, damage, airdrops)
  const prevGrenadeKillsMap = useRef<{ [key: string]: number }>({});
  const prevVehicleKillsMap = useRef<{ [key: string]: number }>({});
  const prevDamageMap = useRef<{ [key: string]: number }>({});
  const prevAirDropMap = useRef<{ [key: string]: number }>({});
  const damageMilestoneTriggered = useRef<{ [key: string]: boolean }>({});


  // Handle socket updates with loop prevention
  // ✅ Ref to always hold the latest match data (no re-renders)
const matchDataRef = useRef<MatchData | null>(matchData || null);
useEffect(() => {
  matchDataRef.current = localMatchData;
}, [localMatchData]);

// ✅ Socket update handler (no loop)
const handleSocketUpdate = useCallback((data: any) => {
  const currentData = matchDataRef.current;
  let updatedMatchData: MatchData | null = currentData;

  if (data._id?.toString() === matchDataId && data.teams) {
    updatedMatchData = data;
  } else if (data.matchDataId === matchDataId && data.teamId && data.players) {
    if (currentData) {
      updatedMatchData = {
        ...currentData,
        teams: currentData.teams.map(team =>
          team._id === data.teamId || team.teamId === data.teamId
            ? {
                ...team,
                players: team.players.map(player =>
                  data.players.find((p: any) => p._id === player._id)
                    ? { ...player, ...data.players.find((p: any) => p._id === player._id) }
                    : player
                )
              }
            : team
        )
      };
    }
  } else if (data.matchDataId === matchDataId && data.teamId && data.changes?.players) {
    if (currentData) {
      updatedMatchData = {
        ...currentData,
        teams: currentData.teams.map(team =>
          team._id === data.teamId || team.teamId === data.teamId
            ? {
                ...team,
                players: team.players.map(player => {
                  const update = data.changes.players.find((p: any) => p._id?.toString() === player._id?.toString());
                  return update ? { ...player, ...update } : player;
                })
              }
            : team
        )
      };
    }
  }

  if (updatedMatchData) {
    const combinedData = updatedMatchData.teams
      .flatMap(team => team.players.map(player => ({ _id: player._id, killNum: player.killNum || 0 })))
      .sort((a, b) => a._id.localeCompare(b._id));

    const prevDataSorted = prevDataRef.current.sort((a: any, b: any) => a._id.localeCompare(b._id));

    if (JSON.stringify(combinedData) !== JSON.stringify(prevDataSorted)) {
      console.log("Dom: Kill data changed, updating localMatchData");
      prevDataRef.current = combinedData;
      setLocalMatchData(updatedMatchData);
      matchDataRef.current = updatedMatchData; // ✅ keep ref updated

      // Process alerts only when data changes
      let alertData = null;
      let triggered = false;
      let alertReason = '';

      // Log all players with changed data
      const allPlayers = updatedMatchData.teams.flatMap(team => team.players);
    const changedPlayers = allPlayers.filter(player => {
  const prevKills = prevKillsMap.current[player.playerName] ?? 0;
  return player.killNum > prevKills; // ✅ only count kill increases
});


      console.log("Dom: Latest player changes:");
      changedPlayers.forEach(player => {
        const prevKills = prevKillsMap.current[player.playerName] || 0;
        const prevDied = previousDeadPlayersRef.current.some(p => p.playerName === player.playerName);
        console.log(`  ${player.playerName}: kills ${prevKills} -> ${player.killNum}`);
      });

      // Check for first blood - only the first player to get their first kill gets this milestone
      if (!firstBloodTriggered.current) {
        for (const team of updatedMatchData.teams) {
          for (const player of team.players) {
            const playerName = player.playerName;
            const currentKills = player.killNum || 0;
            const previousKills = prevKillsMap.current[playerName] || 0;

            if (currentKills === 1 && previousKills === 0) {
              alertData = {
                ...player,
                teamTag: team.teamTag,
                teamLogo: team.teamLogo,
                milestone: 'FIRST BLOOD'
              };
              alertReason = 'FIRST BLOOD';
              triggered = true;
              firstBloodTriggered.current = true;
              break;
            }
          }
          if (triggered) break;
        }
      }


      // Check for kill streaks - show the latest achievement reached (reverse order to get most recent)
      if (!triggered) {
        // Process teams in reverse order
        for (let teamIndex = updatedMatchData.teams.length - 1; teamIndex >= 0; teamIndex--) {
          const team = updatedMatchData.teams[teamIndex];
          // Process players in reverse order
          for (let playerIndex = team.players.length - 1; playerIndex >= 0; playerIndex--) {
            const player = team.players[playerIndex];
            const playerName = player.playerName;
            const currentKills = player.killNum || 0;
            const previousKills = prevKillsMap.current[playerName] || 0;

            if (currentKills > previousKills) {
              if (currentKills >= 8 && previousKills < 8) {
                alertData = {
                  ...player,
                  teamTag: team.teamTag,
                  teamLogo: team.teamLogo,
                  milestone: 'UNSTOPPABLE'
                };
                alertReason = 'UNSTOPPABLE';
                triggered = true;
                break;
              } else if (currentKills >= 5 && previousKills < 5) {
                alertData = {
                  ...player,
                  teamTag: team.teamTag,
                  teamLogo: team.teamLogo,
                  milestone: 'RAMPAGE'
                };
                alertReason = 'RAMPAGE';
                triggered = true;
                break;
              } else if (currentKills >= 3 && previousKills < 3) {
                alertData = {
                  ...player,
                  teamTag: team.teamTag,
                  teamLogo: team.teamLogo,
                  milestone: 'DOMINATION'
                };
                alertReason = 'DOMINATION';
                triggered = true;
                break;
              }
            }
          }
          if (triggered) break;
        }
      }

      // Check for grenade kills - fires whenever a player's grenade kill count increases
      if (!triggered) {
        for (let teamIndex = updatedMatchData.teams.length - 1; teamIndex >= 0; teamIndex--) {
          const team = updatedMatchData.teams[teamIndex];
          for (let playerIndex = team.players.length - 1; playerIndex >= 0; playerIndex--) {
            const player = team.players[playerIndex];
            const playerName = player.playerName;
            const currentGrenadeKills = player.killNumByGrenade || 0;
            const previousGrenadeKills = prevGrenadeKillsMap.current[playerName] || 0;

            if (currentGrenadeKills > previousGrenadeKills) {
              alertData = {
                ...player,
                teamTag: team.teamTag,
                teamLogo: team.teamLogo,
                milestone: 'GRENADE KILL'
              };
              alertReason = 'GRENADE KILL';
              triggered = true;
              break;
            }
          }
          if (triggered) break;
        }
      }

      // Check for vehicle kills - fires whenever a player's vehicle kill count increases
      if (!triggered) {
        for (let teamIndex = updatedMatchData.teams.length - 1; teamIndex >= 0; teamIndex--) {
          const team = updatedMatchData.teams[teamIndex];
          for (let playerIndex = team.players.length - 1; playerIndex >= 0; playerIndex--) {
            const player = team.players[playerIndex];
            const playerName = player.playerName;
            const currentVehicleKills = player.killNumInVehicle || 0;
            const previousVehicleKills = prevVehicleKillsMap.current[playerName] || 0;

            if (currentVehicleKills > previousVehicleKills) {
              alertData = {
                ...player,
                teamTag: team.teamTag,
                teamLogo: team.teamLogo,
                milestone: 'VEHICLE KILL'
              };
              alertReason = 'VEHICLE KILL';
              triggered = true;
              break;
            }
          }
          if (triggered) break;
        }
      }

      // Check for 500+ damage - fires once per player when damage crosses the 500 threshold
      if (!triggered) {
        for (let teamIndex = updatedMatchData.teams.length - 1; teamIndex >= 0; teamIndex--) {
          const team = updatedMatchData.teams[teamIndex];
          for (let playerIndex = team.players.length - 1; playerIndex >= 0; playerIndex--) {
            const player = team.players[playerIndex];
            const playerName = player.playerName;
            const currentDamage = player.damage || 0;
            const previousDamage = prevDamageMap.current[playerName] || 0;

            if (
              currentDamage >= 500 &&
              previousDamage < 500 &&
              !damageMilestoneTriggered.current[playerName]
            ) {
              alertData = {
                ...player,
                teamTag: team.teamTag,
                teamLogo: team.teamLogo,
                milestone: '500+ DAMAGE'
              };
              alertReason = '500+ DAMAGE';
              triggered = true;
              damageMilestoneTriggered.current[playerName] = true;
              break;
            }
          }
          if (triggered) break;
        }
      }

      // Check for airdrop loot - fires whenever a player's airdrop count increases
      if (!triggered) {
        for (let teamIndex = updatedMatchData.teams.length - 1; teamIndex >= 0; teamIndex--) {
          const team = updatedMatchData.teams[teamIndex];
          for (let playerIndex = team.players.length - 1; playerIndex >= 0; playerIndex--) {
            const player = team.players[playerIndex];
            const playerName = player.playerName;
            const currentAirDrops = player.gotAirDropNum || 0;
            const previousAirDrops = prevAirDropMap.current[playerName] || 0;

            if (currentAirDrops > previousAirDrops) {
              alertData = {
                ...player,
                teamTag: team.teamTag,
                teamLogo: team.teamLogo,
                milestone: 'AIRDROP LOOTED'
              };
              alertReason = 'AIRDROP LOOTED';
              triggered = true;
              break;
            }
          }
          if (triggered) break;
        }
      }

      // Update kills map
      updatedMatchData.teams.forEach(team => {
        team.players.forEach(player => {
          prevKillsMap.current[player.playerName] = player.killNum || 0;
        });
      });

      // Update new stat maps (grenade kills, vehicle kills, damage, airdrops)
      updatedMatchData.teams.forEach(team => {
        team.players.forEach(player => {
          prevGrenadeKillsMap.current[player.playerName] = player.killNumByGrenade || 0;
          prevVehicleKillsMap.current[player.playerName] = player.killNumInVehicle || 0;
          prevDamageMap.current[player.playerName] = player.damage || 0;
          prevAirDropMap.current[player.playerName] = player.gotAirDropNum || 0;
        });
      });

      if (triggered && alertData) {
        setDisplayedPlayer(alertData);
        setIsVisible(true);
        if (displayTimerRef.current) {
          clearTimeout(displayTimerRef.current);
        }
        displayTimerRef.current = window.setTimeout(() => {
          setIsVisible(false);
          setDisplayedPlayer(null);
          displayTimerRef.current = null;
        }, 6000);
        console.log(`Dom: Triggering alert for ${alertData.playerName} - ${alertReason}`);
      }
    } else {
      console.log("Dom: Kill data unchanged, skipping update");
    }
  }
}, [matchDataId]); // ✅ removed localMatchData dependency

// ✅ Socket setup — only runs once per matchDataId
useEffect(() => {
  if (!matchDataId) return;

  const socketManager = SocketManager.getInstance();
  const socket = socketManager.connect();

  const events = [
    "liveMatchUpdate",
    "matchDataUpdated",
    "playerStatsUpdated",
    "teamStatsUpdated",
    "bulkTeamUpdate",
  ];

  events.forEach(evt => socket.off(evt)); // clear before attach
  events.forEach(evt => socket.on(evt, handleSocketUpdate));

  return () => {
    events.forEach(evt => socket.off(evt));
    socketManager.disconnect();
  };
}, [matchDataId, handleSocketUpdate]);


  if (!localMatchData) {
    return null;
  }

  if (!isVisible || !displayedPlayer) {
    return null;
  }

return (
  <div className="w-[1920px] h-[1080px] relative overflow-hidden pointer-events-none">
    <AnimatePresence>
      {isVisible && displayedPlayer && (
        <motion.div
          key={displayedPlayer._id}
          initial={{ x: -500, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 500, opacity: 0, transition: { duration: 6, ease: "easeOut" } }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="absolute left-0 top-0 w-full h-full"
          style={{
            willChange: "transform, opacity",
            transform: "translateZ(0)",
          }}
        >
          {/* PLAYER CARD */}
          <div
            className="absolute left-0 top-[372px] w-[449px]"
            style={{
              willChange: "transform",
              transform: "translateZ(0)",
            }}
          >
            {/* NAME BAR */}
            <div
              className="h-[56px] flex items-center px-6 w-full"
              style={{
                background: `linear-gradient(135deg, ${tournament.primaryColor || "#E01515"}, ${tournament.secondaryColor || "#620505"})`,
              }}
            >
              <span
                 style={{
                background: `linear-gradient(135deg, ${tournament.primaryColor || "#E01515"}, ${tournament.secondaryColor || "#620505"})`,
              }}
              className="text-white text-[40px] font-bold font-[Supermolot] text-center w-full ">
                {displayedPlayer.playerName}
              </span>
            </div>

            {/* BODY */}
            <div className="flex">
              {/* PLAYER IMAGE */}
              <div className="w-[216px] h-[206px] bg-gradient-to-b from-[#2B2B2B] to-black overflow-hidden">
                <img
                  src={displayedPlayer.picUrl || "/def_char.png"}
                  className="w-full h-full object-cover"
                  draggable={false}
                  loading="eager"
                  decoding="async"
                />
              </div>

              {/* MILESTONE */}
              <div className="relative w-[233px] h-[206px] bg-gradient-to-b from-[#FFD700] to-[#FFA500] flex flex-col items-center justify-center overflow-hidden">
                <img
                  src={displayedPlayer.teamLogo || "/def_logo.png"}
                  className="absolute inset-0 w-full h-full object-cover opacity-10"
                  draggable={false}
                  loading="eager"
                />

                <img
                  src={displayedPlayer.teamLogo || "/def_logo.png"}
                  className="w-[100px] h-[100px] object-contain mb-2"
                  draggable={false}
                />

                <span className="font-bebas text-black text-[50px] leading-none">
                  {displayedPlayer.milestone}
                </span>
              </div>
            </div>

            {/* KILLS BAR */}
            <div
              className="h-[52px] flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${tournament.primaryColor || "#E01515"}, ${tournament.secondaryColor || "#620505"})`,
              }}
            >
              <span className="text-white text-[40px] font-black font-[Supermolot]">
                {displayedPlayer.killNum} KILLS
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);




});

export default Dom;