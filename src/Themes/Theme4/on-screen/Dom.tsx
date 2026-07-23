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
          <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M400 341.5C404.142 341.5 407.5 344.858 407.5 349V480.5H175.5V341.5H400Z" fill="url(#paint0_linear_2087_24)" stroke="url(#paint1_linear_2087_24)"/>
            <path d="M178 333.544L0 317V505L178 488.456V333.544Z" fill="url(#paint2_linear_2087_24)"/>
            <path d="M18 404C14.8 400.8 4.66667 397.333 0 396V317L29.5 320C3.1 351.6 10.8333 389.167 18 404Z" fill="url(#paint3_linear_2087_24)"/>
            <path d="M103.585 477.472L81.8658 497.328L177.307 488.463L177.687 431.465L164.193 422.375L169.123 435.908C158.256 439.435 153.152 446.968 151.959 450.294L139.462 442.21C141.005 451.821 148.048 459.601 151.377 462.29L151.35 466.29C129.55 483.345 110.423 480.851 103.585 477.472Z" fill="url(#paint4_linear_2087_24)"/>
            <path d="M190 425H178V480.5H407V398C395.4 393.2 392.833 378.333 393 371.5C378.5 392 377 405.5 376 415.5C375.2 423.5 385.333 434.167 390.5 438.5C392.5 440.5 393 449.667 393 454C395.8 456 395.5 457.833 395 458.5C382.6 462.9 350.833 455.667 336.5 451.5C324.5 466.7 298.167 468.167 286.5 467C282.9 466.6 282 463.833 282 462.5C285.6 448.9 283.5 439.833 282 437C280 439.8 276.167 447.833 274.5 451.5C267.7 444.3 254.333 445.167 248.5 446.5L246 430.5C240 437.5 238 450 238 453C238 455.4 235.333 457.333 234 458C197.6 452.8 189.5 433.833 190 425Z" fill="url(#paint5_linear_2087_24)" fill-opacity="0.22"/>
            <rect x="194" y="422" width="76" height="3" fill="black"/>
            <rect x="315" y="422" width="76" height="3" fill="black"/>

            {/* Dynamic content */}
            <image 
             clipPath="url(#playerClip)"
            x="-10" y="323" width="190" height="190" href={displayedPlayer.picUrl || "/def_char.png"} />
=            <image x="267" y="391" width="50" height="50" href={displayedPlayer.teamLogo || "/def_logo.png"} />

            <text x="297" y="469" textAnchor="middle" fill="black" fontSize="30" fontFamily="AGENCYB" fontWeight="bold">{displayedPlayer.playerName}</text>
            <text x="300" y="400" textAnchor="middle" fill="black" fontSize="40" fontFamily="AGENCYB">{displayedPlayer.milestone}</text>

            <defs>
                <clipPath id="playerClip">
    <path d="M178 333.544L0 317V505L178 488.456V333.544Z" />
  </clipPath>

              <linearGradient id="paint0_linear_2087_24" x1="306.443" y1="397.471" x2="423.5" y2="648.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="white"/>
                <stop offset="1" stopColor="#737373"/>
              </linearGradient>
              <linearGradient id="paint1_linear_2087_24" x1="291.5" y1="342" x2="344.5" y2="519" gradientUnits="userSpaceOnUse">
                <stop stopColor={tournament.primaryColor || '#E7A801'}/>
                <stop offset="1"/>
              </linearGradient>
              <linearGradient id="paint2_linear_2087_24" x1="185.521" y1="302.461" x2="-29.0338" y2="669.465" gradientUnits="userSpaceOnUse">
                <stop stopColor="white"/>
                <stop offset="1" stopColor="#999999"/>
              </linearGradient>
              <linearGradient id="paint3_linear_2087_24" x1="14.75" y1="317" x2="-28.5" y2="501" gradientUnits="userSpaceOnUse">
                <stop stopColor={tournament.primaryColor || '#F6B300'}/>
                <stop offset="1"/>
              </linearGradient>
              <linearGradient id="paint4_linear_2087_24" x1="130.057" y1="422.147" x2="129.79" y2="537.148" gradientUnits="userSpaceOnUse">
                <stop stopColor={tournament.primaryColor || '#F2B001'}/>
                <stop offset="1"/>
              </linearGradient>
              <linearGradient id="paint5_linear_2087_24" x1="303" y1="405" x2="250.5" y2="648" gradientUnits="userSpaceOnUse">
                <stop stopColor={tournament.primaryColor || '#E9A901'}/>
                <stop offset="1" stopColor="#737373"/>
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);




});

export default Dom;


