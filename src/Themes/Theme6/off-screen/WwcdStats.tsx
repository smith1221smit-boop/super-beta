import React, { useEffect, useMemo, useState } from 'react';
import SocketManager from '../../../dashboard/socketManager.tsx';
import { FaSkull, FaHeartbeat, FaBomb, FaBullseye  } from 'react-icons/fa';
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
  day?: string;
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
  heal?: number;
  damage?: string | number;
  survivalTime?: number;
  assists?: number;
  // Live stats fields
  health?: number;
  healthMax?: number;
  liveState?: number; // 0,1,2,3 = alive, 4 = knocked, 5 = dead
  useSmokeGrenadeNum?: number;
  useFragGrenadeNum?: number;
  useBurnGrenadeNum?: number;
  useFlashGrenadeNum?: number;
}

interface Team {
  _id: string;
  teamId?: string;
  teamName?: string;
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

interface WwcdSummaryProps {
  tournament: Tournament;
  round?: Round | null;
  match?: Match | null;
  matchData?: MatchData | null;
}

// Basic WWCD Summary component
const WwcdStats: React.FC<WwcdSummaryProps> = ({ tournament, round, match, matchData }) => {
  // Local copy of match data + metadata for live updates
  const [localMatchData, setLocalMatchData] = useState<MatchData | null>(matchData || null);
  const [matchDataId, setMatchDataId] = useState<string | null>(matchData?._id?.toString() || null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected'>('disconnected');

  // Sync when matchData prop changes
  useEffect(() => {
    if (matchData) {
      console.log('WwcdSummary: Received new matchData prop, updating local state');
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
      setLastUpdateTime(Date.now());
    }
  }, [matchData]);

  // Setup socket listeners similar to MatchFragrs
  useEffect(() => {
    if (!match?._id || !matchDataId) return;

    console.log('WwcdSummary: Setting up real-time listeners', { matchId: match._id, matchDataId });

    const socketManager = SocketManager.getInstance();
    const socket = socketManager.connect();

    setSocketStatus(socket?.connected ? 'connected' : 'disconnected');

    // Debug
    const debugHandler = (eventName: string, data: any) => {
      console.log(`WwcdSummary: Received ${eventName}:`, data);
    };
    socket.onAny(debugHandler);

    const handlers = {
      handleLiveUpdate: (data: any) => {
        if (data._id?.toString() === matchDataId) {
          console.log('WwcdSummary: Applying live API match update');
          setLocalMatchData(data);
          setLastUpdateTime(Date.now());
        }
      },
      handleMatchDataUpdate: (data: any) => {
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            const updatedTeams = prev.teams.map((team: any) => {
              if (team._id === data.teamId || team.teamId === data.teamId) {
                const changes = data.changes || {};
                const nextTeam: any = { ...team, ...changes };
                if (Array.isArray(changes.players)) {
                  const updatesById = new Map(
                    changes.players.map((p: any) => [p._id?.toString?.() || p._id, p])
                  );
                  nextTeam.players = (team.players || []).map((p: Player) => {
                    const key = (p as any)._id?.toString?.() || (p as any)._id;
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
        }
      },
      handlePlayerUpdate: (data: any) => {
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                if (team._id === data.teamId || team.teamId === data.teamId) {
                  return {
                    ...team,
                    players: (team.players || []).map((player: Player) =>
                      (player as any)._id === data.playerId
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
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                if (team._id === data.teamId || team.teamId === data.teamId) {
                  return { ...team, placePoints: data.changes?.placePoints ?? team.placePoints };
                }
                return team;
              }),
            };
          });
          setLastUpdateTime(Date.now());
        }
      },
      handleTeamStatsUpdate: (data: any) => {
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                if (team._id === data.teamId || team.teamId === data.teamId) {
                  const updatedPlayers = data.players
                    ? (team.players || []).map((p: any) => {
                        const u = data.players.find((x: any) => x._id === p._id);
                        return u ? { ...p, killNum: u.killNum } : p;
                      })
                    : team.players;
                  return { ...team, players: updatedPlayers };
                }
                return team;
              }),
            };
          });
          setLastUpdateTime(Date.now());
        }
      },
      handleBulkTeamUpdate: (data: any) => {
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                if ((team._id === data.teamId || team.teamId === data.teamId) && data.changes?.players) {
                  const updates = new Map(
                    data.changes.players.map((p: any) => [p._id?.toString?.() || p._id, p])
                  );
                  return {
                    ...team,
                    players: (team.players || []).map((player: Player) => {
                      const key = (player as any)._id?.toString?.() || (player as any)._id;
                      const upd = updates.get(key);
                      return upd ? { ...player, ...upd } : player;
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
      handleConnect: () => setSocketStatus('connected'),
      handleDisconnect: () => setSocketStatus('disconnected'),
    };

    socket.on('liveMatchUpdate', handlers.handleLiveUpdate);
    socket.on('matchDataUpdated', handlers.handleMatchDataUpdate);
    socket.on('playerStatsUpdated', handlers.handlePlayerUpdate);
    socket.on('teamPointsUpdated', handlers.handleTeamPointsUpdate);
    socket.on('teamStatsUpdated', handlers.handleTeamStatsUpdate);
    socket.on('bulkTeamUpdate', handlers.handleBulkTeamUpdate);
    socket.on('connect', handlers.handleConnect);
    socket.on('disconnect', handlers.handleDisconnect);

    return () => {
      console.log('WwcdSummary: Cleaning up socket listeners');
      socket.offAny();
      socket.off('liveMatchUpdate', handlers.handleLiveUpdate);
      socket.off('matchDataUpdated', handlers.handleMatchDataUpdate);
      socket.off('playerStatsUpdated', handlers.handlePlayerUpdate);
      socket.off('teamPointsUpdated', handlers.handleTeamPointsUpdate);
      socket.off('teamStatsUpdated', handlers.handleTeamStatsUpdate);
      socket.off('bulkTeamUpdate', handlers.handleBulkTeamUpdate);
      socket.off('connect', handlers.handleConnect);
      socket.off('disconnect', handlers.handleDisconnect);
      socketManager.disconnect();
    };
  }, [match?._id, matchDataId]);

  // Handle matchData id changes explicitly
  useEffect(() => {
    if (matchData && matchData._id?.toString() !== matchDataId) {
      console.log('WwcdSummary: matchData id changed, syncing');
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
    }
  }, [matchData, matchDataId]);

  // Derived values
  const teamsWithTotals = useMemo(() => {
    if (!localMatchData) return [] as Array<Team & { totalKills: number; total: number }>;
    return localMatchData.teams
      .map((team) => {
        const totalKills = (team.players || []).reduce((sum, p) => sum + (Number(p.killNum) || 0), 0);
        return {
          ...team,
          totalKills,
          total: totalKills + (Number(team.placePoints) || 0),
        };
      })
      .filter((team) => Number(team.placePoints) === 10)
      .sort((a, b) => {
        // Sort primarily by placePoints desc (WWCD more likely on top), then total desc
        if (b.placePoints !== a.placePoints) return (b.placePoints || 0) - (a.placePoints || 0);
        return (b.total || 0) - (a.total || 0);
      });
  }, [localMatchData, lastUpdateTime]);

  const winner = teamsWithTotals[0];
  const others = teamsWithTotals.slice(1);

  if (!localMatchData) {
    return (
      <div className="w-[1920px] h-[1080px]  flex items-center justify-center">
        <div className="text-white text-2xl font-[Righteous]">No match data available</div>
      </div>
    );
  }

  return (
    <div className='w-[1920px] h-[1080px] '>
<div
  style={{
   backgroundImage: `linear-gradient(135deg, ${
  tournament.primaryColor || '#000'
}, #000)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  }}
  className="w-[1800px] h-[250px] text-[142px] font-[agencyb] absolute left-[140px]"
>
  WWCD TEAM STATS

  
</div>
<div
 style={{
   backgroundImage: `linear-gradient(135deg, ${
  tournament.primaryColor || '#000'
}, #000)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  }}
className="text-[78px] font-[agencyb] absolute left-[1340px] top-[0px]">
    {round?.roundName}
  </div>
<div className='text-black w-[458px] h-[200px] text-[78px] font-[agencyb] absolute left-[1300px] top-[70px]'>
DAY {round?.day} MATCH {match?.matchNo}

</div>

<div className='absolute left-[140px] top-[200px]  w-[500px] h-[750px]'>
<div className='w-[300px] h-[300px] absolute left-[80px]'>
  <img src={winner?.teamLogo} alt="" className='w-[100%] h-[100%] bg-[#0000009b]'/>
</div>
<div 

  style={{
   backgroundImage: `linear-gradient(135deg, ${
  tournament.primaryColor || '#000'
}, #000)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  }}
className='text-white font-[AGENCYB] text-[273px] absolute left-[140px] top-[230px]'>

  {winner?.totalKills}
</div>
<div
 style={{
   backgroundImage: `linear-gradient(135deg, ${
  tournament.secondaryColor || '#000'
}, #000)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  }}
className='text-white font-[AGENCYB] text-[100px] absolute left-[136px] top-[520px]'>
  ELIMS
</div>
</div>
<div className='w-[1400px] h-[800px]  absolute left-[520px] top-[180px] flex'>
{winner?.players?.map((player, index) => (
  <div key={player._id} className='w-[353px] h-[106%] bg-[#000000c8] ml-[20px]'>
  <div
  style={{
    backgroundImage: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, #000)`,
  }}
  className="w-full h-[400px] relative overflow-hidden "
>
  <img
    src={player?.picUrl || "/def_char.png"}
    alt={player.playerName}
    className="absolute top-0 left-0 w-full h-full object-cover"
  />
</div>

    <div 
    style={{
   backgroundImage: `linear-gradient(135deg, ${
  tournament.secondaryColor || '#000'
}, #000)`

  }}
   className='w-[99%] h-[100px] m-[2px] font-[agencyb] flex items-center justify-center'>
    <div className='text-white text-[58px] '>{player?.playerName}</div>
    
   </div>
  <div className="flex flex-col w-[99%] mx-[2px] gap-4">
  {/* DAMAGE */}
  <div
    style={{
      backgroundImage: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, #000)`,
    }}
    className="w-full h-[70px] flex items-center px-4"
  >
    <div className="flex items-center gap-4 w-[300px] h-[83%]">
      <FaSkull className="text-white text-[2.5rem]" />
      <div className="flex justify-between w-full text-white font-[AGENCYB] text-[3rem]">
        <span>DAMAGE</span>
        <span>{player?.damage}</span>
      </div>
    </div>
  </div>

  {/* ELIMS */}
  <div
    style={{
      backgroundImage: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, #000)`,
    }}
    className="w-full h-[70px] flex items-center px-4"
  >
    <div className="flex items-center gap-4 w-[300px] h-[83%]">
      <FaBullseye  className="text-white text-[2.5rem]" />
      <div className="flex justify-between w-full text-white font-[AGENCYB] text-[3rem]">
        <span>ELIMS</span>
        <span>{player?.killNum}</span>
      </div>
    </div>
  </div>

  {/* THROWABLE */}
  <div
    style={{
      backgroundImage: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, #000)`,
    }}
    className="w-full h-[70px] flex items-center px-4"
  >
    <div className="flex items-center gap-4 w-[300px] h-[83%]">
      <FaBomb className="text-white text-[2.5rem]" />
      <div className="flex justify-between w-full text-white font-[AGENCYB] text-[3rem]">
        <span>THROWABLE</span>
        <span>
          {(player?.useSmokeGrenadeNum || 0) +
            (player?.useFragGrenadeNum || 0) +
            (player?.useBurnGrenadeNum || 0) +
            (player?.useFlashGrenadeNum || 0)}
        </span>
      </div>
    </div>
  </div>

  {/* HEAL */}
  <div
    style={{
      backgroundImage: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, #000)`,
    }}
    className="w-full h-[70px] flex items-center px-4"
  >
    <div className="flex items-center gap-4 w-[300px] h-[83%]">
      <FaHeartbeat className="text-white text-[2.5rem]" />
      <div className="flex justify-between w-full text-white font-[AGENCYB] text-[3rem]">
        <span>HEAL</span>
        <span>{player?.heal}</span>
      </div>
    </div>
  </div>
</div>
  </div>
  
  
))}

</div>
</div>


   
  );
};

export default WwcdStats;