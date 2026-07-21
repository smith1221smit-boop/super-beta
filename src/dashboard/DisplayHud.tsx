import React, { useEffect, useState, useCallback, useMemo, useTransition, memo } from 'react';
import api from '../login/api.tsx';
import PollingManager from './isPolling.tsx';
import {
  FaDiscord, FaTrophy, FaUsers, FaEye, FaBars, FaTimes, FaSearch,
  FaBroadcastTower, FaCalendarAlt, FaExternalLinkAlt, FaCheckCircle,
} from 'react-icons/fa';

interface Tournament { _id: string; tournamentName: string; }
interface Round       { _id: string; roundName: string; }
interface Match       { _id: string; matchName?: string; matchNo?: number; _matchNo?: number; }

const THEMES = ['Theme1', 'Theme2', 'Theme3', 'Theme4', 'Theme5', 'Theme6'];

const VIEW_GROUPS = [
  {
    id: 'match', label: 'On-air', hint: 'Live match overlays', requires: 'live',
    views: [
      { key: 'Alerts', label: 'Alerts' },
      { key: 'Lower', label: 'Lower Third' },
      { key: 'Upper', label: 'Upper Third' },
      { key: 'Dom', label: 'Dominator' },
      { key: 'intro', label: 'Intro' },
      { key: 'LiveStats', label: 'Live Stats' },
      { key: 'LiveFrags', label: 'Live Frags' },
      { key: 'Battlebar', label: 'Battle Bar' },
    ]
  },
  {
    id: 'overall', label: 'Post match — overall', hint: 'Tournament-wide standings', requires: 'live',
    views: [
      { key: 'OverAllData', label: 'Overall Data' },
      { key: 'OverallFrags', label: 'Overall Frags' },
    ]
  },
  {
    id: 'h2h', label: 'Post match — this match', hint: 'Results for the selected match', requires: 'live',
    views: [
      { key: 'mvp', label: 'MVP' },
      { key: 'Achive', label: 'Player Summary' },
      { key: 'WwcdStats', label: 'WWCD Stats' },
      { key: 'WwcdSummary', label: 'WWCD Summary' },
      { key: 'MatchSummary', label: 'Match Summary' },
      { key: 'MatchData', label: 'Match Data' },
      { key: 'MatchFragrs', label: 'Match Fraggers' },
      { key: 'playerH2H', label: 'Player H2H' },
      { key: 'TeamH2H', label: 'Team H2H' },
    ]
  },
  {
    id: 'awards', label: 'Awards', hint: 'Podium & trophy screens', requires: 'live',
    views: [
      { key: 'Champions', label: 'Champions' },
      { key: '1stRunnerUp', label: '1st Runner Up' },
      { key: '2ndRunnerUp', label: '2nd Runner Up' },
      { key: 'EventMvp', label: 'Event MVP' },
    ]
  },
  {
    id: 'broadcast', label: 'Pre-match', hint: 'Before the match goes live', requires: 'live',
    views: [
      { key: 'CommingUpNext', label: 'Up Next' },
      { key: 'highlightPoints', label: 'Highlight Points' },
      { key: 'slots', label: 'Slots' },
      { key: 'RosterShowCase', label: 'Roster Showcase' },
      { key: 'PlayerSwitch', label: 'Player Switch' },
    ]
  },
  {
    id: 'schedule', label: 'Schedule', hint: 'Uses the matches checked below', requires: 'schedule',
    views: [
      { key: '__schedule', label: 'Schedule' },
      { key: '__highlight', label: 'Highlight Schedule' },
    ]
  },
];

// ── Design system ────────────────────────────────────────────────────────────
// Same visual identity as the Team Ops screen: dark control-room void, one red
// tally accent, Space Grotesk / Inter / JetBrains Mono. The old page packed a
// tournament tree, a match bar, and six overlay groups onto one screen at
// once — this version turns that into four numbered steps so a new operator
// always knows exactly what to click next, and later steps simply stay dim
// and unclickable until the step above them is done.
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

.hd-root * { box-sizing: border-box; }
.hd-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
.hd-orb { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif !important; }
.hd-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

.hd-glow {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse 80% 40% at 50% 0%, rgba(225,29,46,0.07), transparent);
}

@keyframes hd-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
.hd-dot { animation: hd-pulse 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .hd-dot { animation: none; } }

/* ── Top navbar (matches Team Ops) ── */
.hd-nav { position: sticky; top: 0; z-index: 60; background: rgba(11,12,14,0.92); backdrop-filter: blur(16px); border-bottom: 1px solid #24262B; }
.hd-nav-inner { max-width: 1280px; margin: 0 auto; padding: 0 20px; display: flex; align-items: center; height: 64px; gap: 18px; }
.hd-nav-brand { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.hd-nav-links { display: flex; align-items: center; gap: 4px; }
.hd-nav-link { display: flex; align-items: center; gap: 8px; padding: 8px 14px; color: #93959C; text-decoration: none; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; border: 1px solid transparent; background: none; white-space: nowrap; transition: color .15s ease, border-color .15s ease; }
.hd-nav-link:hover { color: #F4F2EE; }
.hd-nav-link.active { color: #E11D2E; border-bottom: 2px solid #E11D2E; padding-bottom: 6px; }
.hd-nav-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.hd-nav-poll { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border: 1px solid #24262B; color: #55565C; }
.hd-nav-user { display: flex; align-items: center; gap: 8px; padding: 5px 12px 5px 6px; border: 1px solid #24262B; }
.hd-nav-avatar { width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0; background: rgba(225,29,46,0.15); border: 1px solid rgba(225,29,46,0.4); display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; color: #E11D2E; }
.hd-nav-burger { display: none; background: none; border: 1px solid #24262B; color: #F4F2EE; width: 38px; height: 38px; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
.hd-nav-mobile-panel { display: none; flex-direction: column; padding: 10px 20px 16px; gap: 2px; border-bottom: 1px solid #24262B; background: #0B0C0E; }
.hd-nav-mobile-panel.open { display: flex; }
@media (max-width: 860px) {
  .hd-nav-links { display: none; }
  .hd-nav-poll { display: none; }
  .hd-nav-burger { display: flex; }
  .hd-nav-user span { display: none; }
}

.hd-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #93959C; letter-spacing: 0.22em; text-transform: uppercase; }
.hd-eyebrow-dot { width: 6px; height: 6px; background: #E11D2E; flex-shrink: 0; }
.hd-pill { display: inline-flex; align-items: center; background: rgba(225,29,46,0.08); border: 1px solid rgba(225,29,46,0.3); color: #E11D2E; font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 3px 9px; letter-spacing: 0.05em; font-weight: 700; }

.hd-page { max-width: 1000px; margin: 0 auto; padding: 36px 20px 72px; position: relative; z-index: 1; }
.hd-header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 30px; flex-wrap: wrap; }
.hd-status-row { display: flex; gap: 10px; flex-wrap: wrap; }
.hd-status { display: flex; align-items: center; gap: 7px; background: #131418; border: 1px solid #24262B; padding: 8px 14px; }
.hd-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

/* ── Step cards ── */
.hd-step { display: flex; gap: 16px; margin-bottom: 14px; }
.hd-step-num-wrap { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 34px; }
.hd-step-num { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; border: 1px solid #24262B; background: #131418; color: #55565C; flex-shrink: 0; }
.hd-step-num.done { border-color: #E11D2E; color: #E11D2E; background: rgba(225,29,46,0.08); }
.hd-step-line { flex: 1; width: 1px; background: #24262B; margin: 6px 0; }
.hd-step-body { flex: 1; min-width: 0; padding-bottom: 26px; }
.hd-step-card { background: #131418; border: 1px solid #24262B; padding: 18px 20px; transition: border-color .15s ease, opacity .15s ease; }
.hd-step-card.locked { opacity: 0.45; pointer-events: none; }
.hd-step-title { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #F4F2EE; text-transform: uppercase; letter-spacing: 0.01em; }
.hd-step-sub { font-size: 13px; color: #93959C; margin-top: 3px; }

/* ── Search ── */
.hd-search-wrap { position: relative; margin-top: 14px; max-width: 320px; }
.hd-search-ic { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #55565C; font-size: 12px; pointer-events: none; }
.hd-search-input { width: 100%; padding: 10px 13px 10px 34px; background: #0B0C0E; border: 1px solid #24262B; color: #F4F2EE; font-family: 'Inter', sans-serif; font-size: 13px; outline: none; transition: border-color .15s ease; }
.hd-search-input::placeholder { color: #55565C; }
.hd-search-input:focus { border-color: #E11D2E; }
.hd-search-count { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #55565C; margin-top: 6px; }

/* ── Selects ── */
.hd-select-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
@media (max-width: 560px) { .hd-select-row { grid-template-columns: 1fr; } }
.hd-field-label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #55565C; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px; }
.hd-select { width: 100%; padding: 11px 13px; background: #0B0C0E; border: 1px solid #24262B; color: #F4F2EE; font-family: 'Inter', sans-serif; font-size: 14px; outline: none; cursor: pointer; transition: border-color .15s ease; appearance: none; }
.hd-select:focus { border-color: #E11D2E; }
.hd-select:disabled { color: #55565C; cursor: not-allowed; }

/* ── Match chips ── */
.hd-chip-group { margin-top: 14px; }
.hd-chip-hdr { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
.hd-chip-hdr-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
.hd-chip-hdr-sub { font-size: 12px; color: #55565C; }
.hd-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.hd-chip { padding: 8px 16px; border-radius: 3px; cursor: pointer; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; border: 1px solid #24262B; color: #93959C; background: #0B0C0E; transition: all .12s ease; user-select: none; }
.hd-chip:hover { border-color: rgba(225,29,46,0.4); color: #F4F2EE; }
.hd-chip.on-live { background: rgba(74,222,128,0.1); border-color: #4ADE80; color: #4ADE80; }
.hd-chip.on-sched { background: rgba(225,29,46,0.1); border-color: #E11D2E; color: #E11D2E; }

/* ── Theme picker ── */
.hd-theme-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.hd-theme-btn { padding: 9px 16px; border: 1px solid #24262B; background: #0B0C0E; color: #93959C; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; cursor: pointer; transition: all .12s ease; }
.hd-theme-btn:hover { color: #F4F2EE; border-color: rgba(225,29,46,0.4); }
.hd-theme-btn.on { background: rgba(225,29,46,0.1); border-color: #E11D2E; color: #E11D2E; }

/* ── Overlay groups ── */
.hd-group { margin-bottom: 18px; }
.hd-group:last-child { margin-bottom: 0; }
.hd-group-hdr { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.hd-group-label { font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700; color: #F4F2EE; text-transform: uppercase; }
.hd-group-hint { font-size: 11px; color: #55565C; }
.hd-tiles { display: flex; flex-wrap: wrap; gap: 6px; }
.hd-tile { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #0B0C0E; border: 1px solid #24262B; cursor: pointer; user-select: none; transition: border-color .12s ease, transform .1s ease; }
.hd-tile:hover { border-color: #E11D2E; transform: translateY(-1px); }
.hd-tile:active { transform: scale(0.97); }
.hd-tile-label { font-size: 13px; font-weight: 600; color: #F4F2EE; }
.hd-tile-ic { color: #55565C; font-size: 10px; }
.hd-tile:hover .hd-tile-ic { color: #E11D2E; }

/* ── Empty / locked notices ── */
.hd-note { display: flex; align-items: center; gap: 8px; margin-top: 14px; padding: 10px 13px; background: rgba(225,29,46,0.06); border: 1px solid rgba(225,29,46,0.2); font-size: 12px; color: #93959C; }
.hd-empty { text-align: center; padding: 56px 20px; border: 1px dashed #24262B; }
`;

// ── Top navigation (identical identity to Team Ops) ─────────────────────────
// Memoized: user rarely changes, but the page re-renders on every search
// keystroke and chip click — without this the nav (and its polling manager)
// would rebuild on each of those for no reason.
const TopNav = memo(({ user }: { user: any }) => {
  const [open, setOpen] = useState(false);

  const links = [
    { label: 'TOURNAMENTS', icon: <FaTrophy size={13} />, onClick: () => (window.location.href = '/dashboard') },
    { label: 'TEAMS', icon: <FaUsers size={13} />, onClick: () => window.open('/teams', '_blank', 'noopener,noreferrer') },
    { label: 'HUD', icon: <FaEye size={13} />, active: true },
    { label: 'HELP', icon: <FaDiscord size={13} />, onClick: () => window.open('https://discord.com/channels/623776491682922526/1426117227257663558', '_blank') },
  ];

  return (
    <nav className="hd-nav">
      <div className="hd-nav-inner">
        <div className="hd-nav-brand">
          <img src="./logo.avif" alt="logo" style={{ width: 30, height: 30, objectFit: 'contain' }} />
          <span className="hd-orb" style={{ fontSize: 14, fontWeight: 700, color: '#F4F2EE', letterSpacing: '0.02em' }}>OVERLAY CONTROL</span>
        </div>

        <div className="hd-nav-links">
          {links.map(link => (
            <button key={link.label} className={`hd-nav-link ${link.active ? 'active' : ''}`} onClick={link.onClick}>
              {link.icon} {link.label}
            </button>
          ))}
        </div>

        <div className="hd-nav-right">
          <div className="hd-nav-poll">
            <span className="hd-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#E11D2E' }} />
            <PollingManager />
          </div>
          {user && (
            <div className="hd-nav-user">
              <div className="hd-nav-avatar">{(user.username || '?').slice(0, 2).toUpperCase()}</div>
              <span className="hd-mono" style={{ fontSize: 11, color: '#F4F2EE' }}>{user.username}</span>
            </div>
          )}
          <button className="hd-nav-burger" onClick={() => setOpen(v => !v)} aria-label="Toggle menu">
            {open ? <FaTimes size={15} /> : <FaBars size={15} />}
          </button>
        </div>
      </div>

      <div className={`hd-nav-mobile-panel ${open ? 'open' : ''}`}>
        {links.map(link => (
          <button
            key={link.label}
            className={`hd-nav-link ${link.active ? 'active' : ''}`}
            style={{ justifyContent: 'flex-start', padding: '12px 8px', borderBottom: 'none' }}
            onClick={() => { link.onClick?.(); setOpen(false); }}
          >
            {link.icon} {link.label}
          </button>
        ))}
      </div>
    </nav>
  );
});

// ── Tournament search box ────────────────────────────────────────────────────
// Local state + a debounce keeps every keystroke instant even with a large
// tournament list — the (potentially expensive) filter only runs 200ms after
// typing stops, via useTransition so it never blocks the input itself.
const TournamentSearch = memo(({ onQueryChange }: { onQueryChange: (q: string) => void }) => {
  const [localQuery, setLocalQuery] = useState('');
  const [, startTransition] = useTransition();

  useEffect(() => {
    const id = setTimeout(() => {
      startTransition(() => onQueryChange(localQuery));
    }, localQuery === '' ? 0 : 200);
    return () => clearTimeout(id);
  }, [localQuery, onQueryChange]);

  return (
    <div className="hd-search-wrap">
      <FaSearch className="hd-search-ic" />
      <input
        type="text"
        value={localQuery}
        onChange={e => setLocalQuery(e.target.value)}
        placeholder="Search tournaments…"
        className="hd-search-input"
      />
    </div>
  );
});

// ── Overlay tile group ───────────────────────────────────────────────────────
// Memoized so the six overlay groups (up to ~30 tiles) only re-render when
// their own click handler or enabled state actually changes — not on every
// keystroke in the search box or every unrelated chip toggle.
const OverlayGroup = memo(({ group, onTileClick }: {
  group: typeof VIEW_GROUPS[number];
  onTileClick: (groupId: string, viewKey: string) => void;
}) => (
  <div className="hd-group">
    <div className="hd-group-hdr">
      <span className="hd-group-label">{group.label}</span>
      <span className="hd-group-hint">{group.hint}</span>
    </div>
    <div className="hd-tiles">
      {group.views.map(v => (
        <div key={v.key} className="hd-tile" onClick={() => onTileClick(group.id, v.key)}>
          <span className="hd-tile-label">{v.label}</span>
          <FaExternalLinkAlt className="hd-tile-ic" />
        </div>
      ))}
    </div>
  </div>
));

const DisplayHud: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [tournamentId, setTournamentId] = useState('');
  const [roundId, setRoundId] = useState('');
  const [tournamentQuery, setTournamentQuery] = useState('');

  const [selectedMatches, setSelectedMatches] = useState<Record<string, string | null>>({});
  const [selectedSchedule, setSelectedSchedule] = useState<Record<string, string[]>>({});
  const [user, setUser] = useState<any>(null);
  const [pollingKey, setPollingKey] = useState(0);
  const [themeMap, setThemeMap] = useState<Record<string, string>>(() => {
    try { const s = localStorage.getItem('selectedThemeMap'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  const filteredTournaments = useMemo(() => {
    const q = tournamentQuery.trim().toLowerCase();
    const base = q ? tournaments.filter(t => t.tournamentName.toLowerCase().includes(q)) : tournaments;
    // Keep the currently selected tournament in the list even if it no
    // longer matches the search, so the <select> doesn't lose its label.
    if (tournamentId && !base.some(t => t._id === tournamentId)) {
      const current = tournaments.find(t => t._id === tournamentId);
      if (current) return [current, ...base];
    }
    return base;
  }, [tournaments, tournamentQuery, tournamentId]);

  const roundKey = tournamentId && roundId ? `${tournamentId}_${roundId}` : '';
  const theme = tournamentId ? (themeMap[tournamentId] || 'Theme1') : 'Theme1';
  const liveMatchId = roundKey ? selectedMatches[roundKey] || null : null;
  const schedMatchIds = roundKey ? selectedSchedule[roundKey] || [] : [];
  const liveMatchObj = liveMatchId ? matches.find(m => m._id === liveMatchId) : null;

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

  const handleTournamentChange = useCallback((id: string) => {
    setTournamentId(id);
    setRoundId('');
    setRounds([]);
    setMatches([]);
    if (!id) return;
    api.get(`/tournaments/${id}/rounds`).then(r => setRounds(r.data)).catch(() => setRounds([]));
  }, []);

  const handleRoundChange = useCallback((id: string) => {
    setRoundId(id);
    setMatches([]);
    if (!id || !tournamentId) return;
    api.get(`/tournaments/${tournamentId}/rounds/${id}/matches`)
      .then(r => setMatches(r.data))
      .catch(() => setMatches([]));
  }, [tournamentId]);

  const toggleLiveMatch = useCallback(async (mId: string, checked: boolean) => {
    if (!roundKey) return;
    let prevValue: string | null = null;
    setSelectedMatches(p => { prevValue = p[roundKey] ?? null; return { ...p, [roundKey]: checked ? mId : null }; });
    try {
      const res = await api.post('/matchSelection/select', { tournamentId, roundId, matchId: mId });
      if (res.data.deselected && checked) setSelectedMatches(p => ({ ...p, [roundKey]: null }));
      else if (!res.data.deselected && !checked) setSelectedMatches(p => ({ ...p, [roundKey]: mId }));
      setPollingKey(p => p + 1);
    } catch {
      setSelectedMatches(p => ({ ...p, [roundKey]: prevValue }));
      alert('Failed to update match selection. Please try again.');
    }
  }, [roundKey, tournamentId, roundId]);

  const toggleSchedMatch = useCallback((mId: string, checked: boolean) => {
    if (!roundKey) return;
    setSelectedSchedule(p => {
      const cur = p[roundKey] || [];
      return { ...p, [roundKey]: checked ? [...cur, mId] : cur.filter(id => id !== mId) };
    });
  }, [roundKey]);

  const openView = (view: string) => {
    if (!liveMatchId) return;
    window.open(`/public/tournament/${tournamentId}/round/${roundId}/match/${liveMatchId}?theme=${encodeURIComponent(theme)}&view=${encodeURIComponent(view)}&followSelected=true`, '_blank', 'noopener,noreferrer');
  };

  const openSchedule = (view: string) => {
    if (!schedMatchIds.length) return;
    window.open(`/public/tournament/${tournamentId}/round/${roundId}/match/${schedMatchIds[0]}?theme=${encodeURIComponent(theme)}&view=${view}&followSelected=true&scheduleMatches=${encodeURIComponent(schedMatchIds.join(','))}`, '_blank', 'noopener,noreferrer');
  };

  const handleTileClick = useCallback((groupId: string, viewKey: string) => {
    if (groupId === 'schedule') {
      if (viewKey === '__schedule') openSchedule('Schedule');
      if (viewKey === '__highlight') openSchedule('HighlightSchedule');
    } else {
      openView(viewKey);
    }
  }, [tournamentId, roundId, theme, liveMatchId, schedMatchIds]);

  const step1Done = !!tournamentId && !!roundId;
  const step2Done = !!liveMatchId || schedMatchIds.length > 0;

  const visibleGroups = useMemo(
    () => VIEW_GROUPS.filter(g => (g.requires === 'schedule' ? schedMatchIds.length > 0 : !!liveMatchId)),
    [liveMatchId, schedMatchIds]
  );

  const selectedTournamentName = useMemo(
    () => tournaments.find(t => t._id === tournamentId)?.tournamentName || '',
    [tournaments, tournamentId]
  );

  return (
    <div className="hd-root" style={{ minHeight: '100vh', background: '#0B0C0E' }}>
      <style>{STYLES}</style>
      <div className="hd-glow" />

      <TopNav user={user} />

      <div className="hd-page">
        <div className="hd-header-row">
          <div>
            <div className="hd-eyebrow" style={{ marginBottom: 8 }}>
              <span className="hd-eyebrow-dot" /> BROADCAST OVERLAYS
            </div>
            <h1 className="hd-orb" style={{ fontSize: 26, fontWeight: 800, color: '#F4F2EE', letterSpacing: '-0.01em', marginBottom: 6, textTransform: 'uppercase' }}>
              Send an overlay live
            </h1>
            <p style={{ color: '#93959C', fontSize: 14, maxWidth: 460 }}>
              Follow the steps below in order — pick a round, pick a match, then open the overlay you need.
            </p>
          </div>
          <div className="hd-status-row">
            <div className="hd-status">
              <span className="hd-status-dot" style={{ background: liveMatchId ? '#4ADE80' : '#24262B' }} />
              <span className="hd-mono" style={{ fontSize: 10, color: '#55565C', letterSpacing: '1px' }}>LIVE</span>
              <span className="hd-orb" style={{ fontSize: 13, fontWeight: 700, color: liveMatchId ? '#4ADE80' : '#55565C' }}>
                {liveMatchObj ? `Match ${liveMatchObj.matchNo ?? liveMatchObj._matchNo ?? '?'}` : 'None'}
              </span>
            </div>
            <div className="hd-status">
              <span className="hd-status-dot" style={{ background: schedMatchIds.length ? '#E11D2E' : '#24262B' }} />
              <span className="hd-mono" style={{ fontSize: 10, color: '#55565C', letterSpacing: '1px' }}>SCHEDULE</span>
              <span className="hd-orb" style={{ fontSize: 13, fontWeight: 700, color: schedMatchIds.length ? '#E11D2E' : '#55565C' }}>
                {schedMatchIds.length ? `${schedMatchIds.length} matches` : 'None'}
              </span>
            </div>
          </div>
        </div>

        {tournaments.length === 0 ? (
          <div className="hd-empty">
            <h3 className="hd-orb" style={{ fontSize: 15, color: '#F4F2EE', marginBottom: 6, textTransform: 'uppercase' }}>No tournaments yet</h3>
            <p style={{ color: '#93959C', fontSize: 13 }}>Create a tournament first, then come back here to control its overlays.</p>
          </div>
        ) : (
          <>
            {/* STEP 1 — Tournament & round */}
            <div className="hd-step">
              <div className="hd-step-num-wrap">
                <div className={`hd-step-num ${step1Done ? 'done' : ''}`}>{step1Done ? <FaCheckCircle size={13} /> : '01'}</div>
                <div className="hd-step-line" />
              </div>
              <div className="hd-step-body">
                <div className="hd-step-card">
                  <div className="hd-step-title">Choose tournament &amp; round</div>
                  <div className="hd-step-sub">This tells the HUD which matches to load.</div>

                  <TournamentSearch onQueryChange={setTournamentQuery} />
                  {tournamentQuery && (
                    <div className="hd-search-count">
                      {filteredTournaments.length} of {tournaments.length} tournaments match
                    </div>
                  )}

                  <div className="hd-select-row">
                    <div>
                      <label className="hd-field-label" htmlFor="hd-tournament">Tournament</label>
                      <select id="hd-tournament" className="hd-select" value={tournamentId} onChange={e => handleTournamentChange(e.target.value)}>
                        <option value="">Select a tournament…</option>
                        {filteredTournaments.map(t => <option key={t._id} value={t._id}>{t.tournamentName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="hd-field-label" htmlFor="hd-round">Round</label>
                      <select id="hd-round" className="hd-select" value={roundId} disabled={!tournamentId} onChange={e => handleRoundChange(e.target.value)}>
                        <option value="">{tournamentId ? 'Select a round…' : 'Choose a tournament first'}</option>
                        {rounds.map(r => <option key={r._id} value={r._id}>{r.roundName}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2 — Match */}
            <div className="hd-step">
              <div className="hd-step-num-wrap">
                <div className={`hd-step-num ${step2Done ? 'done' : ''}`}>{step2Done ? <FaCheckCircle size={13} /> : '02'}</div>
                <div className="hd-step-line" />
              </div>
              <div className="hd-step-body">
                <div className={`hd-step-card ${step1Done ? '' : 'locked'}`}>
                  <div className="hd-step-title">Choose a match</div>
                  <div className="hd-step-sub">
                    {step1Done
                      ? `${matches.length} match${matches.length === 1 ? '' : 'es'} in ${selectedTournamentName}`
                      : 'Finish step 1 first.'}
                  </div>

                  {step1Done && matches.length === 0 && (
                    <div className="hd-note">This round has no matches yet.</div>
                  )}

                  {matches.length > 0 && (
                    <>
                      <div className="hd-chip-group">
                        <div className="hd-chip-hdr">
                          <FaBroadcastTower size={11} style={{ color: '#4ADE80' }} />
                          <span className="hd-mono hd-chip-hdr-label" style={{ color: '#4ADE80' }}>Live now</span>
                          <span className="hd-chip-hdr-sub">— pick one match</span>
                        </div>
                        <div className="hd-chips">
                          {matches.map(m => {
                            const on = liveMatchId === m._id;
                            return (
                              <div key={m._id} className={`hd-chip${on ? ' on-live' : ''}`} onClick={() => toggleLiveMatch(m._id, !on)}>
                                Match {m.matchNo ?? m._matchNo ?? '?'}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="hd-chip-group">
                        <div className="hd-chip-hdr">
                          <FaCalendarAlt size={11} style={{ color: '#E11D2E' }} />
                          <span className="hd-mono hd-chip-hdr-label" style={{ color: '#E11D2E' }}>Schedule</span>
                          <span className="hd-chip-hdr-sub">— pick any number of matches</span>
                        </div>
                        <div className="hd-chips">
                          {matches.map(m => {
                            const on = schedMatchIds.includes(m._id);
                            return (
                              <div key={`s-${m._id}`} className={`hd-chip${on ? ' on-sched' : ''}`} onClick={() => toggleSchedMatch(m._id, !on)}>
                                Match {m.matchNo ?? m._matchNo ?? '?'}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 3 — Theme */}
            <div className="hd-step">
              <div className="hd-step-num-wrap">
                <div className="hd-step-num done"><FaCheckCircle size={13} /></div>
                <div className="hd-step-line" />
              </div>
              <div className="hd-step-body">
                <div className="hd-step-card">
                  <div className="hd-step-title">Pick a theme</div>
                  <div className="hd-step-sub">Applies to every overlay you open below. Defaults to Theme1.</div>
                  <div className="hd-theme-row">
                    {THEMES.map(th => (
                      <button
                        key={th}
                        className={`hd-theme-btn ${theme === th ? 'on' : ''}`}
                        disabled={!tournamentId}
                        onClick={() => tournamentId && setThemeMap(p => ({ ...p, [tournamentId]: th }))}
                      >
                        {th}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 4 — Overlays */}
            <div className="hd-step">
              <div className="hd-step-num-wrap">
                <div className={`hd-step-num ${step2Done ? 'done' : ''}`}>{step2Done ? <FaCheckCircle size={13} /> : '04'}</div>
              </div>
              <div className="hd-step-body">
                <div className={`hd-step-card ${step2Done ? '' : 'locked'}`}>
                  <div className="hd-step-title">Open an overlay</div>
                  <div className="hd-step-sub">
                    {step2Done ? 'Click any tile to open it in a new tab.' : 'Pick a live match or schedule matches in step 2 first.'}
                  </div>

                  {step2Done && (
                    <div style={{ marginTop: 16 }}>
                      {visibleGroups.map(group => (
                        <OverlayGroup key={group.id} group={group} onTileClick={handleTileClick} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DisplayHud;