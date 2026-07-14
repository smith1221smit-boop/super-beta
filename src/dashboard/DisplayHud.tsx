import React, { useEffect, useState } from 'react';
import api from '../login/api.tsx';
import PollingManager from './isPolling.tsx';
import {
  FaDiscord, FaTrophy, FaUsers, FaEye,
  FaBroadcastTower, FaCalendarAlt, FaSatelliteDish,
  FaChevronDown, FaChevronRight, FaExternalLinkAlt,
} from 'react-icons/fa';

interface Tournament { _id: string; tournamentName: string; }
interface Round       { _id: string; roundName: string; }
interface Match       { _id: string; matchName?: string; matchNo?: number; _matchNo?: number; }

const THEMES = ['Theme1', 'Theme2', 'Theme3', 'Theme4', 'Theme5', 'Theme6'];

const VIEW_GROUPS = [
  {
    id: 'match', label: 'ON-AIR', color: '#facc15',
    views: [
      { key: 'Alerts', label: 'Alerts' },
     
      { key: 'Lower', label: 'Lower' },
      { key: 'Upper', label: 'Upper' },
      { key: 'Dom', label: 'Dom' },
      { key: 'intro', label: 'Intro' },
      { key: 'LiveStats', label: 'Live Stats' },
      { key: 'LiveFrags', label: 'Live Frags' },
       { key: 'Battlebar', label: 'Battlebar' },    
    ]
  },
  {
    id: 'overall', label: 'POST MATCH ( OVERALL )', color: '#facc15',
    views: [
      { key: 'OverAllData', label: 'Overall Data' },
      { key: 'OverallFrags', label: 'Overall Frags' },
   
    ]
  },
  {
    id: 'h2h', label: 'POST MATCH ( MATCH )', color: '#facc15',
    views: [
       { key: 'mvp', label: 'MVP' },
       { key: 'Achive', label: 'Player Summary' },
         { key: 'WwcdStats', label: 'WWCD STATS' },
      { key: 'WwcdSummary', label: 'WWCD SUMMARY' },
       { key: 'MatchSummary', label: 'MATCH SUMMARY' },
      { key: 'MatchData', label: 'MATCH DATA' },
      { key: 'MatchFragrs', label: 'MATCH FRAGGERS' },
      { key: 'playerH2H', label: 'Player H2H' },
      { key: 'TeamH2H', label: 'TEAM H2H' },
    ]
  },
  {
    id: 'awards', label: 'AWARDS', color: '#facc15',
    views: [
      { key: 'Champions', label: 'Champions' },
      { key: '1stRunnerUp', label: '1st Runner Up' },
      { key: '2ndRunnerUp', label: '2nd Runner Up' },
      { key: 'EventMvp', label: 'Event MVP' },

     
    ]
  },
  {
    id: 'broadcast', label: 'PRE-MATCH', color: '#facc15',
    views: [
      
      { key: 'CommingUpNext', label: 'Up Next' },
    
      { key: 'highlightPoints', label: 'Hi-Points' },
     
      { key: 'slots', label: 'Slots' },
      { key: 'RosterShowCase', label: 'Roster' },
      { key: 'PlayerSwitch', label: 'Player Switch' },
    ]
  },
  {
    id: 'schedule', label: 'SCHEDULE', color: '#facc15',
    views: [
      { key: '__schedule', label: 'Schedule' },
      { key: '__highlight', label: 'Highlight' },
    ]
  },
];

const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Orbitron:wght@700;900&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root {
  --yellow: #facc15;
  --purple: #7c3aed;
  --purple-light: #a78bfa;
  --purple-dim: rgba(124,58,237,0.14);
  --purple-border: rgba(124,58,237,0.28);
  --bg: #09060f;
  --bg2: #0d0a18;
  --bg3: #110e1c;
  --border: rgba(124,58,237,0.18);
  --text: #ddd6fe;
  --text-dim: #64748b;
  --text-muted: #2a2040;
}

.r{font-family:'DM Sans',sans-serif;color:var(--text);display:flex;min-height:100vh;background:var(--bg);}
.orb{font-family:'Orbitron',monospace !important;}

.r::before{
  content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:linear-gradient(rgba(124,58,237,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.04) 1px,transparent 1px);
  background-size:48px 48px;
}

.top-stripe{
  position:fixed;top:0;left:0;right:0;height:2px;z-index:300;
  background:linear-gradient(90deg,transparent 0%,var(--yellow) 30%,var(--purple-light) 70%,transparent 100%);
}

/* SIDEBAR */
.sb{
  position:fixed;left:0;top:0;bottom:0;width:72px;z-index:100;
  display:flex;flex-direction:column;align-items:center;padding:20px 0;
  background:var(--bg2);border-right:1px solid var(--border);
}
.sb-logo{width:38px;height:38px;border-radius:10px;margin-bottom:8px;overflow:hidden;border:1px solid rgba(250,204,21,0.3);box-shadow:0 0 16px rgba(250,204,21,0.1);}
.sb-user{display:flex;flex-direction:column;align-items:center;gap:3px;margin-bottom:4px;padding:5px 4px;width:48px;border-radius:8px;background:var(--purple-dim);border:1px solid var(--purple-border);}
.sb-user-dot{width:5px;height:5px;border-radius:50%;background:#facc15;box-shadow:0 0 6px #facc15;}
.sb-user-txt{font-family:'Orbitron',monospace;font-size:8px;color:#facc15;font-weight:700;text-align:center;max-width:44px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px;}
.sb-div{width:32px;height:1px;background:var(--border);margin:8px 0;}
.sb-btn{
  display:flex;flex-direction:column;align-items:center;gap:4px;
  width:52px;padding:9px 0;border-radius:10px;cursor:pointer;
  border:1px solid transparent;background:transparent;color:var(--text-dim);
  font-family:'DM Sans',sans-serif;font-size:9px;font-weight:600;letter-spacing:0.5px;
  transition:all 0.15s;
}
.sb-btn:hover{color:#a78bfa;background:var(--purple-dim);border-color:var(--purple-border);}
.sb-btn.on{color:#facc15;background:rgba(250,204,21,0.08);border-color:rgba(250,204,21,0.35);box-shadow:0 0 18px rgba(250,204,21,0.1);}
.sb-foot{margin-top:auto;}

/* LEFT NAV */
.nav{position:fixed;left:72px;top:0;bottom:0;width:252px;z-index:90;display:flex;flex-direction:column;background:var(--bg2);border-right:1px solid var(--border);}
.nav-head{padding:20px 16px 14px;border-bottom:1px solid var(--border);flex-shrink:0;}
.nav-eyebrow{font-family:'Orbitron',monospace;font-size:7px;font-weight:700;letter-spacing:3px;color:var(--text-muted);margin-bottom:5px;}
.nav-title{font-family:'Orbitron',monospace;font-size:16px;font-weight:900;color:#fff;letter-spacing:0.5px;}
.nav-title span{color:var(--yellow);}
.poll-row{display:flex;align-items:center;gap:6px;margin-top:10px;padding:7px 11px;border-radius:7px;background:rgba(250,204,21,0.06);border:1px solid rgba(250,204,21,0.18);}
.poll-dot{width:5px;height:5px;border-radius:50%;background:#facc15;box-shadow:0 0 5px #facc15;animation:pulse 2s ease-in-out infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
.poll-txt{font-family:'Orbitron',monospace;font-size:8px;color:#facc15;letter-spacing:0.8px;font-weight:700;}
.nav-scroll{flex:1;overflow-y:auto;padding:8px 8px 20px;scrollbar-width:thin;scrollbar-color:var(--purple-dim) transparent;}
.nav-scroll::-webkit-scrollbar{width:3px;}
.nav-scroll::-webkit-scrollbar-thumb{background:var(--purple-dim);border-radius:4px;}

.t-row{display:flex;align-items:center;gap:7px;padding:8px 9px;border-radius:7px;cursor:pointer;border:1px solid transparent;margin-bottom:1px;transition:all 0.12s;}
.t-row:hover{background:var(--purple-dim);border-color:var(--purple-border);}
.t-row.open{background:rgba(124,58,237,0.1);border-color:rgba(124,58,237,0.35);}
.t-bar{width:3px;height:18px;border-radius:2px;background:var(--text-muted);flex-shrink:0;}
.t-row.open .t-bar{background:var(--yellow);box-shadow:0 0 6px rgba(250,204,21,0.4);}
.t-name{font-family:'Orbitron',monospace;font-size:9px;font-weight:700;color:var(--text-dim);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.t-row.open .t-name{color:#fff;}
.t-chev{color:var(--text-muted);flex-shrink:0;}
.t-row.open .t-chev{color:var(--yellow);}
.rounds{padding:2px 0 4px 16px;}
.r-row{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-radius:6px;cursor:pointer;border:1px solid transparent;margin-bottom:1px;transition:all 0.12s;}
.r-row:hover{background:var(--purple-dim);border-color:var(--purple-border);}
.r-row.sel{background:rgba(250,204,21,0.08);border-color:rgba(250,204,21,0.35);}
.r-name{font-family:'Orbitron',monospace;font-size:9px;font-weight:700;color:var(--text-dim);}
.r-row.sel .r-name{color:#facc15;}
.r-live{display:flex;align-items:center;gap:3px;}
.r-live-dot{width:5px;height:5px;border-radius:50%;background:#4ade80;box-shadow:0 0 4px #4ade80;}
.r-live-txt{font-family:'Orbitron',monospace;font-size:7px;color:#4ade80;font-weight:700;}

/* MAIN */
.main{margin-left:324px;position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;}

/* TOPBAR */
.topbar{
  position:sticky;top:0;z-index:50;
  background:rgba(9,6,15,0.95);border-bottom:1px solid var(--border);
  backdrop-filter:blur(24px);
  display:flex;align-items:center;min-height:54px;padding:0 24px;
}
.topbar-round{font-family:'Orbitron',monospace;font-size:15px;font-weight:900;color:#fff;}
.topbar-tour{font-size:13px;color:var(--text-dim);font-weight:500;margin-left:14px;}
.topbar-idle{font-family:'Orbitron',monospace;font-size:10px;color:var(--text-muted);letter-spacing:2px;}
.topbar-right{display:flex;align-items:center;gap:8px;margin-left:auto;}

.status-pill{display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:6px;border:1px solid;}
.pill-live{background:rgba(74,222,128,0.06);border-color:rgba(74,222,128,0.2);}
.pill-sched{background:rgba(250,204,21,0.06);border-color:rgba(250,204,21,0.2);}
.pill-dot{width:6px;height:6px;border-radius:50%;}
.pill-lbl{font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;font-weight:700;}
.pill-val{font-family:'Orbitron',monospace;font-size:12px;font-weight:900;}

.theme-wrap{display:flex;align-items:center;gap:7px;margin-left:12px;padding-left:12px;border-left:1px solid var(--border);}
.theme-lbl{font-family:'Orbitron',monospace;font-size:7px;color:var(--text-muted);letter-spacing:1.5px;}
.theme-sel{background:var(--bg3);border:1px solid var(--purple-border);border-radius:7px;color:var(--yellow);padding:5px 10px;font-family:'Orbitron',monospace;font-size:10px;font-weight:700;outline:none;cursor:pointer;}
.theme-sel option{background:#09060f;}
.theme-sel:focus{border-color:var(--yellow);}

/* MATCH BAR */
.matchbar{padding:14px 24px;border-bottom:1px solid var(--border);background:rgba(13,10,24,0.8);display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;}
.mzone{display:flex;flex-direction:column;gap:7px;}
.mzone-hdr{display:flex;align-items:center;gap:5px;}
.mzone-lbl{font-family:'Orbitron',monospace;font-size:8px;font-weight:700;letter-spacing:1.5px;}
.mzone-sub{font-size:11px;color:var(--text-muted);font-weight:500;}
.msep{width:1px;background:var(--border);align-self:stretch;margin:0 4px;}
.mchips{display:flex;flex-wrap:wrap;gap:4px;}
.mchip{
  padding:4px 13px;border-radius:5px;cursor:pointer;
  font-family:'Orbitron',monospace;font-size:10px;font-weight:700;
  border:1px solid rgba(255,255,255,0.07);color:var(--text-muted);background:var(--bg3);
  transition:all 0.12s;user-select:none;
}
.mchip:hover{border-color:var(--purple-border);color:var(--purple-light);}
.mchip.live-on{background:rgba(74,222,128,0.08);border-color:#4ade80;color:#4ade80;box-shadow:0 0 8px rgba(74,222,128,0.12);}
.mchip.sched-on{background:rgba(250,204,21,0.08);border-color:#facc15;color:#facc15;box-shadow:0 0 8px rgba(250,204,21,0.12);}

/* CONTENT */
.content{flex:1;padding:16px 24px 48px;display:flex;flex-direction:column;gap:0;}

/* empty */
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;gap:14px;}
.empty-ring{width:72px;height:72px;border-radius:50%;border:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--text-muted);}
.empty-h{font-family:'Orbitron',monospace;font-size:12px;color:var(--text-muted);letter-spacing:2px;}
.empty-p{font-size:13px;color:var(--text-muted);}

/* SECTION — folder-tab style */
.section{margin-bottom:6px;}
.sec-hdr{display:flex;align-items:center;}
.sec-tab{
  display:inline-flex;align-items:center;gap:8px;
  padding:6px 16px 6px 12px;border-radius:6px 6px 0 0;
  border:1px solid var(--border);border-bottom:none;
  background:var(--bg2);
}
.sec-tab-label{font-family:'Orbitron',monospace;font-size:9px;font-weight:900;letter-spacing:1.5px;}
.sec-tab-count{font-family:'Orbitron',monospace;font-size:8px;color:var(--text-muted);}
.sec-hint{font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text-muted);margin-left:10px;}

.tile-block{
  border:1px solid var(--border);
  border-radius:0 8px 8px 8px;
  background:var(--bg2);
  padding:10px;margin-bottom:8px;
}
.tile-block.locked{opacity:0.3;pointer-events:none;}

/* TILES — horizontal list rows, no play button */
.tiles{display:flex;flex-wrap:wrap;gap:5px;}

.tile{
  cursor:pointer;user-select:none;display:flex;align-items:stretch;
  border-radius:6px;border:1px solid rgba(255,255,255,0.06);
  background:var(--bg3);overflow:hidden;
  transition:border-color 0.13s,box-shadow 0.13s,transform 0.1s;
  min-width:120px;
}
.tile:hover{
  border-color:var(--tc);
  box-shadow:0 0 0 1px var(--tc-dim),0 3px 14px rgba(0,0,0,0.5);
}
.tile:active{transform:scale(0.97);}

.tile-accent{width:3px;background:var(--tc);opacity:0.4;flex-shrink:0;transition:opacity 0.13s;}
.tile:hover .tile-accent{opacity:1;}

.tile-body{padding:8px 12px;flex:1;display:flex;flex-direction:column;gap:2px;}
.tile-label{font-size:13px;font-weight:600;color:#c4b5fd;letter-spacing:0.2px;line-height:1.2;}
.tile:hover .tile-label{color:#fff;}
.tile-key{font-family:'Orbitron',monospace;font-size:7px;color:var(--text-muted);letter-spacing:0.3px;margin-top:1px;}

.tile-arrow{
  display:flex;align-items:center;padding:0 9px;color:var(--text-muted);
  font-size:9px;opacity:0;transition:opacity 0.13s;
}
.tile:hover .tile-arrow{opacity:0.7;}

.no-matches{text-align:center;padding:48px;font-family:'Orbitron',monospace;font-size:9px;color:var(--text-muted);letter-spacing:1.5px;}
`;

const DisplayHud: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [expandedTours, setExpandedTours] = useState<string[]>([]);
  const [roundsMap, setRoundsMap] = useState<Record<string, Round[]>>({});
  const [matchesMap, setMatchesMap] = useState<Record<string, Match[]>>({});
  const [activeRound, setActiveRound] = useState<{ tId: string; rId: string } | null>(null);
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string | null>>({});
  const [selectedSchedule, setSelectedSchedule] = useState<Record<string, string[]>>({});
  const [user, setUser] = useState<any>(null);
  const [pollingKey, setPollingKey] = useState(0);
  const [themeMap, setThemeMap] = useState<Record<string, string>>(() => {
    try { const s = localStorage.getItem('selectedThemeMap'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  const getTheme = (tId: string) => themeMap[tId] || 'Theme1';

  useEffect(() => {
    api.get('/users/me').then(r => setUser(r.data)).catch(() => {});
    api.get('/tournaments').then(r => setTournaments(r.data)).catch(() => setTournaments([]));
    api.get('/matchSelection/selected').then(r => {
      const map: Record<string, string> = {};
      r.data.forEach((s: any) => {
        const rId = typeof s.roundId === 'object' ? s.roundId._id : s.roundId;
        map[`${s.tournamentId}_${rId}`] = s.matchId;
      });
      setSelectedMatches(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    try { localStorage.setItem('selectedThemeMap', JSON.stringify(themeMap)); } catch {}
  }, [themeMap]);

  const toggleTournament = (tId: string) => {
    if (expandedTours.includes(tId)) {
      setExpandedTours(p => p.filter(id => id !== tId));
      if (activeRound?.tId === tId) setActiveRound(null);
    } else {
      setExpandedTours(p => [...p, tId]);
      if (!roundsMap[tId]) {
        api.get(`/tournaments/${tId}/rounds`)
          .then(r => setRoundsMap(p => ({ ...p, [tId]: r.data })))
          .catch(() => setRoundsMap(p => ({ ...p, [tId]: [] })));
      }
    }
  };

  const selectRound = (tId: string, rId: string) => {
    if (activeRound?.tId === tId && activeRound?.rId === rId) { setActiveRound(null); return; }
    setActiveRound({ tId, rId });
    const key = `${tId}_${rId}`;
    if (!matchesMap[key]) {
      api.get(`/tournaments/${tId}/rounds/${rId}/matches`)
        .then(r => setMatchesMap(p => ({ ...p, [key]: r.data })))
        .catch(() => setMatchesMap(p => ({ ...p, [key]: [] })));
    }
  };

  const toggleLiveMatch = async (tId: string, rId: string, mId: string, checked: boolean) => {
    const key = `${tId}_${rId}`;
    const prev = { ...selectedMatches };
    setSelectedMatches(p => ({ ...p, [key]: checked ? mId : null }));
    try {
      const res = await api.post('/matchSelection/select', { tournamentId: tId, roundId: rId, matchId: mId });
      if (res.data.deselected && checked) setSelectedMatches(p => ({ ...p, [key]: null }));
      else if (!res.data.deselected && !checked) setSelectedMatches(p => ({ ...p, [key]: mId }));
      setPollingKey(p => p + 1);
    } catch {
      setSelectedMatches(prev);
      alert('Failed to update match selection. Please try again.');
    }
  };

  const toggleSchedMatch = (tId: string, rId: string, mId: string, checked: boolean) => {
    const key = `${tId}_${rId}`;
    setSelectedSchedule(p => {
      const cur = p[key] || [];
      return { ...p, [key]: checked ? [...cur, mId] : cur.filter(id => id !== mId) };
    });
  };

  const openView = (tId: string, rId: string, mId: string, theme: string, view: string) => {
    if (!mId) return;
    window.open(`/public/tournament/${tId}/round/${rId}/match/${mId}?theme=${encodeURIComponent(theme)}&view=${encodeURIComponent(view)}&followSelected=true`, '_blank', 'noopener,noreferrer');
  };

  const openSchedule = (tId: string, rId: string, mIds: string[], theme: string, view: string) => {
    if (!mIds.length) return;
    window.open(`/public/tournament/${tId}/round/${rId}/match/${mIds[0]}?theme=${encodeURIComponent(theme)}&view=${view}&followSelected=true&scheduleMatches=${encodeURIComponent(mIds.join(','))}`, '_blank', 'noopener,noreferrer');
  };

  const ar = activeRound;
  const arKey = ar ? `${ar.tId}_${ar.rId}` : '';
  const arTour = ar ? tournaments.find(t => t._id === ar.tId) : null;
  const arRound = ar ? roundsMap[ar.tId]?.find(r => r._id === ar.rId) : null;
  const arMatches = ar ? (matchesMap[arKey] || []) : [];
  const arLive = ar ? (selectedMatches[arKey] || null) : null;
  const arSched = ar ? (selectedSchedule[arKey] || []) : [];
  const arTheme = ar ? getTheme(ar.tId) : 'Theme1';
  const liveMatchObj = arLive ? arMatches.find(m => m._id === arLive) : null;

  const handleTileClick = (groupId: string, viewKey: string) => {
    if (!ar) return;
    if (groupId === 'schedule') {
      if (viewKey === '__schedule') openSchedule(ar.tId, ar.rId, arSched, arTheme, 'Schedule');
      if (viewKey === '__highlight') openSchedule(ar.tId, ar.rId, arSched, arTheme, 'HighlightSchedule');
    } else {
      if (!arLive) return;
      openView(ar.tId, ar.rId, arLive, arTheme, viewKey);
    }
  };

  const isTileEnabled = (groupId: string) =>
    groupId === 'schedule' ? arSched.length > 0 : !!arLive;

  return (
    <>
      <style>{S}</style>
      <div className="r">
        <div className="top-stripe" />

        {/* Sidebar */}
        <div className="sb">
          <div className="sb-logo">
            <img src="./logo.avif" alt="logo" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          </div>
          {user && (
            <div className="sb-user">
              <div className="sb-user-dot" />
              <span className="sb-user-txt">{user.username?.slice(0, 5).toUpperCase()}</span>
            </div>
          )}
          <div className="sb-div" />
          <button className="sb-btn" onClick={() => window.location.href = '/dashboard'}>
            <FaTrophy size={18} /><span>TOUR</span>
          </button>
          <button className="sb-btn" onClick={() => window.open('/teams', '_blank', 'noopener,noreferrer')}>
            <FaUsers size={18} /><span>TEAMS</span>
          </button>
          <button className="sb-btn on">
            <FaEye size={18} /><span>HUD</span>
          </button>
          <div className="sb-foot">
            <div className="sb-div" />
            <button className="sb-btn" onClick={() => window.open('https://discord.com/channels/623776491682922526/1426117227257663558', '_blank')}>
              <FaDiscord size={18} /><span>HELP</span>
            </button>
          </div>
        </div>

        {/* Left nav */}
        <div className="nav">
          <div className="nav-head">
            <div className="nav-eyebrow">BROADCAST CONTROL</div>
            <div className="orb nav-title">HUD <span>CTRL</span></div>
            <div className="poll-row">
              <div className="poll-dot" />
              <PollingManager key={pollingKey} />
            </div>
          </div>
          <div className="nav-scroll">
            {tournaments.length === 0
              ? <div style={{ padding: '32px 10px', textAlign: 'center', fontFamily: 'Orbitron,monospace', fontSize: 8, color: 'var(--text-muted)', letterSpacing: 1 }}>NO TOURNAMENTS</div>
              : tournaments.map(t => {
                  const isExp = expandedTours.includes(t._id);
                  return (
                    <div key={t._id} style={{ marginBottom: 1 }}>
                      <div className={`t-row${isExp ? ' open' : ''}`} onClick={() => toggleTournament(t._id)}>
                        <div className="t-bar" />
                        <span className="orb t-name">{t.tournamentName}</span>
                        <span className="t-chev">{isExp ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}</span>
                      </div>
                      {isExp && (
                        <div className="rounds">
                          {roundsMap[t._id]?.length
                            ? roundsMap[t._id].map(r => {
                                const key = `${t._id}_${r._id}`;
                                const isSel = activeRound?.tId === t._id && activeRound?.rId === r._id;
                                const hasLive = !!selectedMatches[key];
                                return (
                                  <div key={r._id} className={`r-row${isSel ? ' sel' : ''}`} onClick={() => selectRound(t._id, r._id)}>
                                    <span className="orb r-name">{r.roundName}</span>
                                    {hasLive && <div className="r-live"><div className="r-live-dot" /><span className="r-live-txt">LIVE</span></div>}
                                  </div>
                                );
                              })
                            : <div style={{ padding: '8px 10px', fontFamily: 'Orbitron,monospace', fontSize: 8, color: 'var(--text-muted)', letterSpacing: 1 }}>NO ROUNDS</div>
                          }
                        </div>
                      )}
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* Main */}
        <div className="main">
          {/* Topbar */}
          <div className="topbar">
            {ar
              ? <><span className="orb topbar-round">{arRound?.roundName}</span><span className="topbar-tour">{arTour?.tournamentName}</span></>
              : <span className="orb topbar-idle">← SELECT A ROUND</span>
            }
            <div className="topbar-right">
              <div className="status-pill pill-live">
                <div className="pill-dot" style={{ background: arLive ? '#4ade80' : '#1c2b20', boxShadow: arLive ? '0 0 6px #4ade80' : 'none' }} />
                <span className="pill-lbl" style={{ color: '#4ade80' }}>LIVE</span>
                <span className="pill-val" style={{ color: arLive ? '#4ade80' : '#1c2b20' }}>
                  {liveMatchObj ? `M${liveMatchObj.matchNo ?? liveMatchObj._matchNo ?? '?'}` : '—'}
                </span>
              </div>
              <div className="status-pill pill-sched">
                <div className="pill-dot" style={{ background: arSched.length > 0 ? '#facc15' : '#1f1a09', boxShadow: arSched.length > 0 ? '0 0 6px #facc15' : 'none', borderRadius: 2 }} />
                <span className="pill-lbl" style={{ color: '#facc15' }}>SCHED</span>
                <span className="pill-val" style={{ color: arSched.length > 0 ? '#facc15' : '#1f1a09' }}>
                  {arSched.length > 0 ? arSched.length : '—'}
                </span>
              </div>
              <div className="theme-wrap">
                <span className="theme-lbl">THEME</span>
                <select className="theme-sel" value={ar ? arTheme : 'Theme1'} disabled={!ar}
                  onChange={e => ar && setThemeMap(p => ({ ...p, [ar.tId]: e.target.value }))}>
                  {THEMES.map(th => <option key={th} value={th}>{th}</option>)}
                </select>
              </div>
            </div>
          </div>

          {!ar ? (
            <div className="empty">
              <div className="empty-ring"><FaSatelliteDish /></div>
              <div className="orb empty-h">NO ROUND SELECTED</div>
              <p className="empty-p">Choose a tournament → round from the left panel</p>
            </div>
          ) : (
            <>
              {/* Match selector */}
              {arMatches.length > 0 && (
                <div className="matchbar">
                  <div className="mzone">
                    <div className="mzone-hdr">
                      <FaBroadcastTower size={10} style={{ color: '#4ade80' }} />
                      <span className="orb mzone-lbl" style={{ color: '#4ade80' }}>LIVE</span>
                      <span className="mzone-sub">single select</span>
                    </div>
                    <div className="mchips">
                      {arMatches.map(m => {
                        const on = arLive === m._id;
                        return (
                          <div key={m._id} className={`mchip${on ? ' live-on' : ''}`}
                            onClick={() => toggleLiveMatch(ar.tId, ar.rId, m._id, !on)}>
                            M{m.matchNo ?? m._matchNo ?? '?'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="msep" />
                  <div className="mzone">
                    <div className="mzone-hdr">
                      <FaCalendarAlt size={10} style={{ color: '#facc15' }} />
                      <span className="orb mzone-lbl" style={{ color: '#facc15' }}>SCHEDULE</span>
                      <span className="mzone-sub">multi select</span>
                    </div>
                    <div className="mchips">
                      {arMatches.map(m => {
                        const on = arSched.includes(m._id);
                        return (
                          <div key={`s-${m._id}`} className={`mchip${on ? ' sched-on' : ''}`}
                            onClick={() => toggleSchedMatch(ar.tId, ar.rId, m._id, !on)}>
                            M{m.matchNo ?? m._matchNo ?? '?'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Overlay groups */}
              <div className="content">
                {arMatches.length === 0
                  ? <div className="no-matches">NO MATCHES IN THIS ROUND</div>
                  : VIEW_GROUPS.map(group => {
                      const enabled = isTileEnabled(group.id);
                      const tc = group.color;
                      const tcDim = `${tc}20`;

                      return (
                        <div key={group.id} className="section">
                          <div className="sec-hdr">
                            <div className="sec-tab" style={{
                              borderColor: enabled ? `${tc}35` : 'var(--border)',
                              background: enabled ? `${tc}08` : 'var(--bg2)',
                            }}>
                              <span className="orb sec-tab-label" style={{ color: enabled ? tc : 'var(--text-muted)' }}>
                                {group.label}
                              </span>
                              <span className="sec-tab-count">{group.views.length}</span>
                            </div>
                            {!enabled && (
                              <span className="sec-hint">
                                {group.id === 'schedule' ? '· select schedule matches' : '· select live match first'}
                              </span>
                            )}
                          </div>

                          <div className={`tile-block${!enabled ? ' locked' : ''}`} style={{
                            borderColor: enabled ? `${tc}22` : 'var(--border)',
                            borderTopColor: enabled ? `${tc}35` : 'var(--border)',
                          }}>
                            <div className="tiles">
                              {group.views.map(v => (
                                <div
                                  key={v.key}
                                  className="tile"
                                  style={{ '--tc': tc, '--tc-dim': tcDim } as React.CSSProperties}
                                  onClick={() => enabled && handleTileClick(group.id, v.key)}
                                >
                                  <div className="tile-accent" />
                                  <div className="tile-body">
                                    <div className="tile-label">{v.label}</div>
                                    <div className="tile-key">{v.key}</div>
                                  </div>
                                  <div className="tile-arrow"><FaExternalLinkAlt /></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default DisplayHud;
