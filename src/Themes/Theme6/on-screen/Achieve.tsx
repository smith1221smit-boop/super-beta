import React, { useEffect, useState, useMemo } from 'react';
import SocketManager from '../../../dashboard/socketManager.tsx';
import Teams from 'dashboard/MainTeams.tsx';

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
  day?:string
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
  damage?: string | number;
  survivalTime?: number;
  assists?: number;
  maxKillDistance?: number;
  driveDistance?: number;
  marchDistance?: number;
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
  teamTag: string;
  slot?: number;
  placePoints: number;
  players: Player[];
  teamLogo: string;
  teamName: string;
}

interface MatchData {
  _id: string;
  teams: Team[];
}

interface MatchFragrsProps {
  tournament: Tournament;
  round?: Round | null;
  match?: Match | null;
  matchData?: MatchData | null;
}


const MatchFragrs: React.FC<MatchFragrsProps> = ({ tournament, round, match, matchData }) => {
   const [localMatchData, setLocalMatchData] = useState<MatchData | null>(matchData || null);
   const [matchDataId, setMatchDataId] = useState<string | null>(matchData?._id?.toString() || null);
   const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
   const [dataReceived, setDataReceived] = useState<boolean>(false);
   const [hasFetched, setHasFetched] = useState<boolean>(false);
   const [selectedView, setSelectedView] = useState<'fragers' | 'teams'>('fragers');

  useEffect(() => {
    if (matchData && !dataReceived && !hasFetched) {
      console.log('MatchFragrs: Received new matchData prop, updating local state');
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
      setLastUpdateTime(Date.now());
      // Disconnect socket immediately after receiving prop data
      const socketManager = SocketManager.getInstance();
      socketManager.disconnect();
    }
  }, [matchData, dataReceived, hasFetched]);

  useEffect(() => {
    if (!match?._id || !matchDataId || hasFetched) return;

    console.log('Setting up socket for initial data fetch - match:', match._id, 'matchData:', matchDataId);

    // Get a fresh socket connection from the manager
    const socketManager = SocketManager.getInstance();
    const freshSocket = socketManager.connect();

    console.log('Socket connected:', freshSocket?.connected);

    // Test socket connection
    freshSocket.emit('test', 'MatchFragrs component connected');

    // Handler for live updates - only accept first data
    const handleLiveUpdate = (data: any) => {
      if (data._id?.toString() === matchDataId && !dataReceived) {
        console.log('MatchFragrs: Received first live data, updating and disconnecting');
        setLocalMatchData(data);
        setLastUpdateTime(Date.now());
        setDataReceived(true);
        setHasFetched(true);
        freshSocket.off('liveMatchUpdate', handleLiveUpdate);
        freshSocket.disconnect();
      }
    };

    freshSocket.on('liveMatchUpdate', handleLiveUpdate);

    return () => {
      console.log('MatchFragrs: Cleaning up socket listener');
      freshSocket.off('liveMatchUpdate', handleLiveUpdate);
      // Don't disconnect here to avoid triggering UI changes
    };
  }, [match?._id, matchDataId, hasFetched]);

  // Add effect to handle prop changes and force re-render
  useEffect(() => {
    if (matchData && matchData._id?.toString() !== matchDataId && !dataReceived && !hasFetched) {
      console.log('MatchData prop changed, updating local state');
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
    }
  }, [matchData, matchDataId, dataReceived, hasFetched]);

type StatKey =
  | "killNum"
  | "damage"
  | "grenadeKills"
  | "killDistance"
  | "travelDistance";


// Get top 5 players by kills, damage, assists (same as working off-screen)
 const topCategories = useMemo(() => {
  if (!localMatchData) return [];

  const allPlayers = localMatchData.teams.flatMap(team =>
    team.players.map(player => ({
      ...player,
      killNum: Number(player.killNum || 0),
      damage: Number(player.damage || 0),
      grenadeKills: Number((player as any).killNumByGrenade || 0),
      killDistance: Number(player.maxKillDistance || 0) / 100,
      travelDistance:
        Number(player.driveDistance || 0) +
        Number(player.marchDistance || 0),
      teamLogo: team.teamLogo,
      teamName: team.teamName
    }))
  );

  const getTop = (key: StatKey) =>
    [...allPlayers].sort((a, b) => b[key] - a[key])[0];

  return [
    { label: "En Fazla Skor", player: getTop("killNum"), valueKey: "killNum" as StatKey },
    { label: "En Fazla Hasar", player: getTop("damage"), valueKey: "damage" as StatKey },
    { label: "En Fazla Bomba Skoru", player: getTop("grenadeKills"), valueKey: "grenadeKills" as StatKey },
    { label: "En Uzak Mesafe Skoru", player: getTop("killDistance"), valueKey: "killDistance" as StatKey },
    { label: "Toplam Hayatta Kalma", player: getTop("travelDistance"), valueKey: "travelDistance" as StatKey }
  ];
}, [localMatchData]);

  if (!localMatchData) {
    return (
     <div></div>
    );
  }

  return (
    <div className='w-[1920px] h-[1080px] '>
      <div
        style={{
          backgroundImage: `linear-gradient(135deg, ${
            tournament.primaryColor || '#000'
          }, #000)`,
       
        }}
        className="w-[500px] h-[110px] text-[77px] font-[tungsten] absolute left-[690px] text-center text-white pt-[0px] top-[10px]"
      >
     MAÇ İSTATİSTİKLERİ
      </div>
     

     
      <div className='w-[1900px] h-[800px] absolute left-[70px] top-[180px] flex gap-5'>
        {topCategories.map((item, index) => {
  const player = item.player;
  if (!player) return null;

  return (
    <div
        style={{
                      backgroundImage: `linear-gradient(to left top, ${tournament.primaryColor || '#6b21a8'}, ${tournament.secondaryColor || '#c084fc'}), url('https://res.cloudinary.com/dqckienxj/image/upload/v1748293303/purple-waves-light-abstract-zg_qfebgm.jpg')`,

    }}
    key={index} className='w-[340px] h-[100%] bg-white overflow-hidden flex flex-col'>

      {/* Player Image */}
     {/* Player Image */}
<div className="w-full h-[780px] relative overflow-hidden">
  {/* Background Logo */}
  <img
    src={player.teamLogo || '/def_char.png'} // fallback if teamLogo is missing
    alt="logo-bg"
    className="absolute inset-0 w-full h-full -rotate-45 opacity-40 object-contain filter grayscale blur-[1px] scale-[3.5] z-0"
    style={{ mixBlendMode: 'overlay' }}
  />

  {/* Centered Green Stat Box */}
  <div className='w-full h-[150px] absolute bottom-0 flex flex-col items-center justify-center text-center z-50'>
    {/* Category Label */}
    <div className="text-white text-[28px] font-[agencyb] mb-[-30px]">
      {item.label.toUpperCase()}
    </div>

    {/* Stat Value */}
    <div 
      style={{
                      color: `${tournament.primaryColor || '#6b21a8'}`,

    }}
    className="text-white text-[90px] font-[tungsten] ">
      {Math.round(player[item.valueKey])}
      {item.valueKey === "killDistance" ? " m" : ""}
    </div>
  </div>

  {/* Player Image */}
  <img
    src={player.picUrl || "/def_char.png"}
    alt={player.playerName}
    className="w-full h-full object-cover relative z-10"
  />

  {/* Bottom Gradient */}
  <div className="absolute bottom-0 left-0 w-full h-[45%] bg-gradient-to-t from-black/100 to-transparent z-20" />
</div>
      {/* Player Name */}
      <div 
          style={{
                      backgroundImage: `linear-gradient(to left top, ${tournament.primaryColor || '#6b21a8'}, ${tournament.secondaryColor || '#c084fc'}), url('https://res.cloudinary.com/dqckienxj/image/upload/v1748293303/purple-waves-light-abstract-zg_qfebgm.jpg')`,

    }}
      className='bg-gradient-to-r from-slate-800 to-gray-900 text-white text-[40px] font-[agencyb] flex justify-between px-4 py-2'>
        <span>{player.playerName.toUpperCase()}</span>
        <img src={player.teamLogo} className='w-[60px] ' />
      </div>

    </div>
  );
})}
        {topCategories.length === 0 && (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl">
            No player data available
          </div>
        )}
      </div>
    </div>
  );
};


export default MatchFragrs;

