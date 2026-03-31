// src/components/Mvp.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { getCache, setCache } from '../../../dashboard/cache.tsx';
import Round from 'dashboard/Round.tsx';

/* -------------------- Interfaces -------------------- */
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

interface Player {
  _id: string;
  playerName: string;
  killNum?: number;
  damage?: number;
  heal?: number;
  maxKillDistance?: number;
  headShotNum?: number;
  killNumByGrenade?: number;
  knockouts?: number;
  teamLogo?: string;
  teamTag?: string;
  teamName?: string;
  picUrl?: string;
}

interface Team {
  _id: string;
  teamTag: string;
  teamLogo: string;
  teamName: string;
  slot?: number;
  placePoints: number;
  players: Player[];
}

interface MatchData {
  _id: string;
  teams: Team[];
}

interface MatchFragrsProps {
  tournament: Tournament;
  round?: Round | null;
  matchData?: MatchData | null;
}

/* -------------------- Stat Box -------------------- */
const StatBox: React.FC<{
  img: string;
  primaryValue: string | number;
  secondaryValue: string | number;
  tournament: Tournament;
}> = React.memo(({ img, primaryValue, secondaryValue, tournament }) => {
  return (
    <div className="flex items-center ml-[20px] font-[AGENCYB]">
      <div className="w-[150px] h-[120px]">
        <img src={img} alt="" className="w-full h-full object-contain" />
      </div>
      <div className="w-full h-full pl-[20px] flex flex-col justify-center items-center">
        <div
          style={{
            backgroundColor: "white",
            boxShadow: `0 0 0 5px ${tournament.primaryColor || "#000"}`,
          }}
          className="w-full h-[45%] flex items-center justify-center text-center"
        >
          <span
            style={{
              backgroundImage: `linear-gradient(135deg, ${tournament.primaryColor || "#ff0"}, #000)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
            className="text-[50px] font-bold"
          >
            {primaryValue}
          </span>
        </div>
        <div
          style={{ backgroundImage: `linear-gradient(135deg, ${tournament.primaryColor || "#ff0"}, #000)` }}
          className="w-full h-[45%] mt-[15px] flex items-center justify-center text-white text-[62px] border-white border-2 text-center"
        >
          {secondaryValue}
        </div>
      </div>
    </div>
  );
});

/* -------------------- Main Component -------------------- */
const Mvp: React.FC<MatchFragrsProps> = ({ tournament, round, matchData }) => {
  const cacheKey = `mvp_${matchData?._id || 'default'}`;

  // Load from cache first, fallback to props
  // Load from cache first, fallback to props
  const [localMatchData, setLocalMatchData] = useState<MatchData | null>(() => {
    const cached = getCache(cacheKey);
    if (cached) {
      console.log('MVP: Using cached data');
      return cached;
    } else {
      console.log('MVP: Using fresh data');
      return matchData || null;
    }
  });

  useEffect(() => {
    if (matchData) {
      setLocalMatchData(matchData);
      setCache(cacheKey, matchData);
    }
  }, [matchData, cacheKey]);

  const topPlayers = useMemo(() => {
    if (!localMatchData?.teams) return [];
    const allPlayers = localMatchData.teams.flatMap(team =>
      team.players.map(player => ({
        ...player,
        teamLogo: team.teamLogo,
        teamTag: team.teamTag,
        teamName: team.teamName,
        numericDamage: player.damage || 0,
      }))
    );
    return allPlayers
      .sort((a, b) =>
        (b.killNum || 0) - (a.killNum || 0) ||
        (b.numericDamage || 0) - (a.numericDamage || 0)
      )
      .slice(0, 10);
  }, [localMatchData]);

  const topPlayer = topPlayers[0];

  const statBoxes = useMemo(() => topPlayer ? [
    { img: '/theme4assets/total elims.png', primaryValue: 'TOTAL KILLS', secondaryValue: topPlayer.killNum || 0 },
    { img: '/theme4assets/totaldamages.png', primaryValue: 'TOTAL DAMAGE', secondaryValue: topPlayer.numericDamage || 0 },
    { img: '/theme4assets/health.png', primaryValue: 'TOTAL HEALS', secondaryValue: topPlayer.heal || 0 },
    { img: '/theme4assets/longest dist elims.png', primaryValue: 'LONGEST ELIM', secondaryValue: `${((topPlayer.maxKillDistance || 0)/100).toFixed(1)}m` },
    { img: '/theme4assets/headshot.png', primaryValue: 'HEADSHOTS', secondaryValue: topPlayer.headShotNum || 0 },
    { img: '/theme4assets/grenade.png', primaryValue: 'GRENADE KILLS', secondaryValue: topPlayer.killNumByGrenade || 0 },
  ] : [], [topPlayer]);

  return (
    <div className="w-[1920px] h-[1080px] flex flex-col items-center relative ">
      {!topPlayer ? (
        <div className="w-full h-full flex items-center justify-center text-white text-2xl font-[Righteous]">
          Loading MVP...
        </div>
      ) : (
        <>
          {/* Big MVP Stroke Text */}
          <div
            className='font-[tungsten] text-[550px] absolute left-[-50px] top-[100px] rotate-[90deg]'
            style={{
              color: 'transparent',
              WebkitTextStroke: '5px white',
              fontWeight: 200,
            }}
          >
            MVP
          </div>

          {/* Round Name */}
          <div className='absolute left-[900px] top-[0px] text-white text-[200px] font-[tungsten]'>
            {round?.roundName.toUpperCase() || "ROUND"}
            <div 
              style={{
                backgroundImage: `linear-gradient(to left, transparent, ${tournament.primaryColor})`,
                clipPath: "polygon(30px 0%, 100% 0%, 100% 100%, 30px 100%, 0% 50%)",
              }}
              className='font-[agencyb] text-[50px] mt-[-70px] pl-[40px]'
            >
              MOST VALUABLE PLAYER
            </div>
          </div>

          {/* MVP Image */}
          <div className='absolute left-[-100px] top-[280px] w-[850px] h-[800px] z-0'>
            <img
              src={topPlayer.picUrl || "/def_char.png"}
              alt={topPlayer.playerName || "Player"}
              className='w-full h-full object-contain'
            />
          </div>

          {/* Player Name, Team Logo & Tag */}
          <div
            className="absolute left-[-50px] top-[880px] h-[140px] w-[640px] skew-x-[-12deg] z-50"
            style={{ backgroundImage: `linear-gradient(135deg, #000, ${tournament.primaryColor || "#ff0"})` }}
          >
            <div className="flex items-center h-full px-6 skew-x-[12deg]">
              <div className="w-[80px] h-[120px] flex-shrink-0 ml-[60px] mt-[40px]">
                <img src={topPlayer.teamLogo} alt={topPlayer.teamName} className="w-full h-full object-contain" />
              </div>
              <div className="ml-6 text-white text-[80px] font-[AGENCYB] truncate mt-[40px]">
                {topPlayer.playerName} 
              </div>
            </div>
            <div className='bg-white w-[70%] h-[30%] font-[AGENCYB] text-center text-[30px] flex items-center justify-center absolute left-[0%] top-[0%]'>
              {topPlayer.teamName.toUpperCase()}
            </div>
          </div>

          {/* MVP Stat Boxes */}
          <div className="w-[1000px] h-[650px] absolute left-[650px] top-[350px] grid grid-cols-2 grid-rows-3 gap-4 p-2">
            {statBoxes.map((box, idx) => (
              <StatBox
                key={idx}
                img={box.img}
                primaryValue={box.primaryValue}
                secondaryValue={box.secondaryValue}
                tournament={tournament}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Mvp;