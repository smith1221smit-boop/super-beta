import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaClock, FaMap, FaChevronRight } from 'react-icons/fa';
import api from '../login/api.tsx';

interface Match {
  _id: string;
  matchNo: number;
  time: string;
  map: string;
  groups?: {
    _id: string;
    groupName: string;
    slots?: { _id: string; slot: number; team: { _id: string; teamFullName: string } }[];
  }[];
}

interface GroupData {
  _id: string;
  groupName: string;
  slots?: { _id: string; slot: number; team: { _id: string; teamFullName: string } }[];
}

// ── 4 maps only ───────────────────────────────────────────────────────────────
const MAPS = ['Erangel', 'Miramar', 'Rondo', 'Sanhok'] as const;
type MapName = typeof MAPS[number];

const MAP_COLORS: Record<MapName, string> = {
  Erangel: '#4ade80',
  Miramar: '#f59e0b',
  Rondo:   '#60a5fa',
  Sanhok:  '#34d399',
};

// Map descriptors shown in the picker card
const MAP_DESC: Record<MapName, string> = {
  Erangel: 'Temperate · 8×8 km',
  Miramar: 'Desert · 8×8 km',
  Rondo:   'Urban · 8×8 km',
  Sanhok:  'Tropical · 4×4 km',
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');

  .m-root { font-family: 'Rajdhani', sans-serif; }
  .m-root *, .m-root *::before, .m-root *::after { box-sizing: border-box; }
  .m-orb { font-family: 'Orbitron', monospace !important; }

  /* ── Page ── */
  .m-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #120038 0%, #000000 50%, #120038 100%);
    padding: 32px; position: relative; overflow: hidden;
  }
  .m-hex {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image: radial-gradient(circle, rgba(139,92,246,0.05) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .m-scan {
    position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.02;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139,92,246,0.5) 2px, rgba(139,92,246,0.5) 4px);
  }
  .m-glow {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background: radial-gradient(ellipse 80% 40% at 50% -5%, rgba(139,92,246,0.1), transparent);
  }
  .m-inner { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; }

  /* ── Page header ── */
  .m-page-hdr {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 32px; padding-bottom: 24px;
    border-bottom: 1px solid rgba(139,92,246,0.18);
  }
  .m-tag {
    display: inline-block;
    background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.3);
    color: #8b5cf6; font-family: 'Orbitron', monospace;
    font-size: 10px; letter-spacing: 1px;
    padding: 3px 10px; border-radius: 4px; margin-bottom: 8px;
  }
  .m-page-title { font-family: 'Orbitron', monospace; font-size: 26px; font-weight: 900; color: #fff; letter-spacing: 1px; margin: 0 0 4px; }
  .m-page-sub { color: #9ca3af; font-size: 13px; letter-spacing: 0.3px; }

  /* ── Stats bar ── */
  .m-statsbar { display: flex; gap: 14px; margin-bottom: 28px; }
  .m-stat {
    background: rgba(0,0,0,0.5); border: 1px solid rgba(139,92,246,0.14);
    border-radius: 10px; padding: 13px 20px;
    display: flex; flex-direction: column; gap: 2px; min-width: 100px;
  }
  .m-stat-val { font-family: 'Orbitron', monospace; font-size: 22px; font-weight: 900; color: yellow; }
  .m-stat-lbl { font-size: 11px; color: #9ca3af; letter-spacing: 0.5px; text-transform: uppercase; }

  /* ── Buttons ── */
  .m-btn-primary {
    background: linear-gradient(135deg, #a855f7, #7e22ce);
    color: #fff; border: 1px solid rgba(139,92,246,0.5);
    font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700;
    letter-spacing: 1px; padding: 11px 24px; border-radius: 8px; cursor: pointer;
    display: flex; align-items: center; gap: 8px;
  }
  .m-btn-primary:hover { box-shadow: 0 0 18px rgba(139,92,246,0.35); }
  .m-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

  .m-btn-ghost {
    background: rgba(0,0,0,0.45); color: #9ca3af;
    border: 1px solid rgba(139,92,246,0.18);
    font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 600;
    padding: 11px 22px; border-radius: 8px; cursor: pointer;
  }
  .m-btn-ghost:hover { background: rgba(0,0,0,0.06); color: #8b5cf6; border-color: rgba(139,92,246,0.4); }

  .m-btn-save {
    background: linear-gradient(135deg, #a855f7, #7e22ce);
    color: #fff; border: 1px solid rgba(139,92,246,0.4);
    font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700;
    letter-spacing: 1px; padding: 9px 18px; border-radius: 7px; cursor: pointer;
  }
  .m-btn-save:hover { box-shadow: 0 0 14px rgba(139,92,246,0.3); }

  .m-btn-cancel {
    background: rgba(0,0,0,0.4); color: #6b7280;
    border: 1px solid rgba(255,255,255,0.08);
    font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 600;
    padding: 9px 18px; border-radius: 7px; cursor: pointer;
  }
  .m-btn-cancel:hover { color: #9ca3af; }

  /* ══════════════════════════════════════════
     REMODELED FORM
  ══════════════════════════════════════════ */
  .m-form-panel {
    background: rgba(0,0,0,0.55);
    border: 1px solid rgba(139,92,246,0.22);
    border-radius: 18px; margin-bottom: 28px;
    overflow: hidden;
    box-shadow: 0 0 40px rgba(139,92,246,0.05);
  }

  /* Form top bar */
  .m-form-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 28px;
    background: rgba(0,0,0,0.4);
    border-bottom: 1px solid rgba(139,92,246,0.12);
  }
  .m-form-topbar-l { display: flex; align-items: center; gap: 10px; }
  .m-form-title { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 700; color: #fff; letter-spacing: 0.5px; }

  /* Form body — two column layout */
  .m-form-body { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .m-form-left { padding: 24px 28px; border-right: 1px solid rgba(139,92,246,0.1); }
  .m-form-right { padding: 24px 28px; display: flex; flex-direction: column; }

  .m-field-lbl { font-size: 10px; color: #9ca3af; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .m-field-lbl::before { content: ''; width: 3px; height: 11px; background: #8b5cf6; border-radius: 2px; box-shadow: 0 0 5px #8b5cf6; }

  .m-input {
    width: 100%; padding: 11px 14px;
    background: rgba(0,0,0,0.6); border: 1px solid rgba(139,92,246,0.2);
    border-radius: 8px; color: #fff;
    font-family: 'Rajdhani', sans-serif; font-size: 15px; outline: none;
  }
  .m-input::placeholder { color: rgba(156,163,175,0.35); }
  .m-input:focus { border-color: rgba(139,92,246,0.6); box-shadow: 0 0 0 2px rgba(139,92,246,0.1); }

  /* Two small fields side by side */
  .m-fields-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }

  /* ── Map picker cards ── */
  .m-map-picker-lbl { margin-bottom: 12px; }
  .m-map-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

  .m-map-card {
    position: relative; cursor: pointer; user-select: none;
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(139,92,246,0.12);
    border-radius: 11px; padding: 14px 14px 12px;
    overflow: hidden;
  }
  .m-map-card:hover { border-color: rgba(139,92,246,0.35); background: rgba(139,92,246,0.04); }

  .m-map-card.mc-sel {
    border-color: var(--mc);
    background: rgba(0,0,0,0.7);
    box-shadow: 0 0 0 1px var(--mc), 0 0 18px color-mix(in srgb, var(--mc) 25%, transparent);
  }

  .m-map-card-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--mc); opacity: 0.4; }
  .m-map-card.mc-sel .m-map-card-bar { opacity: 1; }

  .m-map-card-name { font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 900; color: #9ca3af; letter-spacing: 0.5px; margin-bottom: 3px; }
  .m-map-card.mc-sel .m-map-card-name { color: var(--mc); }

  .m-map-card-desc { font-size: 11px; color: #374151; font-family: 'Barlow Condensed', sans-serif; font-weight: 600; letter-spacing: 0.3px; }
  .m-map-card.mc-sel .m-map-card-desc { color: #6b7280; }

  .m-map-check {
    position: absolute; top: 8px; right: 9px;
    width: 16px; height: 16px; border-radius: 50%;
    background: var(--mc); display: none;
    align-items: center; justify-content: center;
    font-size: 9px; font-weight: 900; color: #000;
  }
  .m-map-card.mc-sel .m-map-check { display: flex; box-shadow: 0 0 6px var(--mc); }

  /* ── Group chips ── */
  .m-groups-lbl { margin-bottom: 12px; }
  .m-groups-list { display: flex; flex-direction: column; gap: 7px; flex: 1; overflow-y: auto; }

  .m-group-chip {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 14px; border-radius: 9px; cursor: pointer;
    background: rgba(0,0,0,0.4); border: 1px solid rgba(139,92,246,0.1);
    user-select: none;
  }
  .m-group-chip:hover { border-color: rgba(139,92,246,0.32); background: rgba(139,92,246,0.04); }
  .m-group-chip.gc-active { background: rgba(139,92,246,0.09); border-color: #8b5cf6; }

  .m-group-chip-dot {
    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    background: rgba(139,92,246,0.2); border: 1px solid rgba(139,92,246,0.3);
  }
  .m-group-chip.gc-active .m-group-chip-dot { background: #8b5cf6; box-shadow: 0 0 6px #8b5cf6; border-color: #8b5cf6; }

  .m-group-chip-name { font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 0.3px; flex: 1; }
  .m-group-chip.gc-active .m-group-chip-name { color: #8b5cf6; }

  .m-group-chip-check {
    font-size: 10px; color: #8b5cf6; font-weight: 900; opacity: 0;
  }
  .m-group-chip.gc-active .m-group-chip-check { opacity: 1; }

  .m-no-groups { font-family: 'Orbitron', monospace; font-size: 10px; color: #1f2937; letter-spacing: 1px; text-align: center; padding: 24px; border: 1px dashed rgba(139,92,246,0.08); border-radius: 9px; }

  /* Form footer */
  .m-form-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 28px;
    border-top: 1px solid rgba(139,92,246,0.1);
    background: rgba(0,0,0,0.35);
  }
  .m-form-footer-info { font-size: 12px; color: #374151; font-family: 'Orbitron', monospace; letter-spacing: 0.5px; }
  .m-form-footer-info span { color: #8b5cf6; font-weight: 900; }
  .m-form-footer-actions { display: flex; gap: 10px; }

  /* ── Spinner sm ── */
  .m-spinner-sm {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff;
    border-radius: 50%; animation: mspin 0.8s linear infinite; display: inline-block;
  }

  /* ══════════════════════════════════════════
     MATCH LIST
  ══════════════════════════════════════════ */
  .m-divider {
    display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
  }
  .m-divider span { font-family: 'Orbitron', monospace; font-size: 10px; letter-spacing: 2px; color: #8b5cf6; white-space: nowrap; }
  .m-divider::before, .m-divider::after { content: ''; flex: 1; height: 1px; background: rgba(139,92,246,0.2); }

  .m-list { display: flex; flex-direction: column; gap: 10px; padding-bottom: 48px; }

  .m-row {
    position: relative; overflow: hidden;
    background: rgba(0,0,0,0.45); border: 1px solid rgba(139,92,246,0.12);
    border-radius: 14px; cursor: pointer;
  }
  .m-row:hover { border-color: rgba(139,92,246,0.38); box-shadow: 0 0 20px rgba(139,92,246,0.07); }

  .m-row-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
  .m-row-body { padding: 18px 20px 18px 24px; display: flex; align-items: center; gap: 16px; }

  .m-match-num {
    font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 900; color: #000;
    border-radius: 7px; padding: 6px 12px; flex-shrink: 0; letter-spacing: 0.5px;
  }

  .m-map-block { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .m-map-name { font-family: 'Orbitron', monospace; font-size: 16px; font-weight: 900; color: #fff; letter-spacing: 0.5px; margin-bottom: 4px; }
  .m-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  .m-time-chip {
    display: flex; align-items: center; gap: 5px; font-size: 12px; color: #9ca3af;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
    padding: 3px 10px; border-radius: 5px;
  }
  .m-group-pill {
    font-size: 11px; color: #8b5cf6;
    background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.2);
    padding: 2px 9px; border-radius: 4px;
    font-family: 'Orbitron', monospace; letter-spacing: 0.3px;
  }

  .m-row-actions { display: flex; gap: 6px; flex-shrink: 0; opacity: 0; }
  .m-row:hover .m-row-actions { opacity: 1; }
  .m-nav-arrow { color: #1f2937; flex-shrink: 0; }
  .m-row:hover .m-nav-arrow { color: #8b5cf6; }

  .m-ic-btn { width: 32px; height: 32px; border-radius: 7px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .m-ic-edit { background: rgba(37,99,235,0.75); }
  .m-ic-edit:hover { background: rgba(37,99,235,1); box-shadow: 0 0 10px rgba(59,130,246,0.4); }
  .m-ic-del { background: rgba(220,38,38,0.75); }
  .m-ic-del:hover { background: rgba(220,38,38,1); box-shadow: 0 0 10px rgba(239,68,68,0.4); }

  /* ── Inline edit ── */
  .m-edit-form { padding: 16px 22px; border-top: 1px solid rgba(139,92,246,0.1); background: rgba(0,0,0,0.3); }
  .m-edit-grid { display: grid; grid-template-columns: 1fr 1fr 2fr; gap: 12px; margin-bottom: 14px; }

  /* ── Map picker inline (edit mode) ── */
  .m-edit-map-row { display: flex; gap: 8px; }
  .m-edit-map-chip {
    flex: 1; padding: 9px 8px; border-radius: 8px; cursor: pointer; text-align: center;
    background: rgba(0,0,0,0.5); border: 1px solid rgba(139,92,246,0.1);
    font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700;
    color: #4b5563; letter-spacing: 0.3px; user-select: none;
  }
  .m-edit-map-chip:hover { border-color: rgba(139,92,246,0.3); color: #9ca3af; }
  .m-edit-map-chip.emc-sel { border-color: var(--mc); color: var(--mc); background: rgba(0,0,0,0.7); box-shadow: 0 0 0 1px var(--mc); }

  .m-edit-actions { display: flex; gap: 8px; justify-content: flex-end; }

  /* ── Loading ── */
  .m-loading {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #120038 0%, #000 50%, #120038 100%);
    flex-direction: column; gap: 16px;
  }
  .m-spinner { width: 48px; height: 48px; border: 3px solid rgba(139,92,246,0.12); border-top-color: #8b5cf6; border-radius: 50%; animation: mspin 1s linear infinite; }
  @keyframes mspin { to { transform: rotate(360deg); } }
  .m-loading-txt { font-family: 'Orbitron', monospace; font-size: 12px; color: #8b5cf6; letter-spacing: 2px; }

  /* ── Empty ── */
  .m-empty { text-align: center; padding: 64px 24px; }
  .m-empty-icon {
    width: 68px; height: 68px; border-radius: 50%; margin: 0 auto 20px;
    background: rgba(139,92,246,0.07); border: 1px solid rgba(139,92,246,0.25);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 20px rgba(139,92,246,0.1);
  }
  .m-empty-title { font-family: 'Orbitron', monospace; font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; }
  .m-empty-sub { color: #9ca3af; font-size: 14px; margin-bottom: 24px; }
`;

// ── Component ──────────────────────────────────────────────────────────────────
const Match: React.FC = () => {
  const { t } = useTranslation();
  const { tournamentId, roundId } = useParams<{ tournamentId: string; roundId: string }>();
  const navigate = useNavigate();

  const [matches, setMatches]           = useState<Match[]>([]);
  const [groups, setGroups]             = useState<GroupData[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [showAddForm, setShowAddForm]   = useState(false);
  const [newMatchNo, setNewMatchNo]     = useState<number>(1);
  const [newTime, setNewTime]           = useState<string>('00:00');
  const [newMap, setNewMap]             = useState<MapName | ''>('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [editMatchId, setEditMatchId]   = useState<string | null>(null);
  const [editMatchNo, setEditMatchNo]   = useState<number>(1);
  const [editTime, setEditTime]         = useState<string>('00:00');
  const [editMap, setEditMap]           = useState<MapName | ''>('');
  const [isCreating, setIsCreating]     = useState(false);

  const matchesCache = useRef<Record<string, Match[]>>({});
  const groupsCache  = useRef<Record<string, GroupData[]>>({});

  const to24Hour = (time: string) => {
    if (!time) return '00:00';
    if (!time.includes('AM') && !time.includes('PM')) return time;
    const [t, mod] = time.split(' ');
    let [h, m] = t.split(':').map(Number);
    if (mod === 'PM' && h < 12) h += 12;
    if (mod === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
  };

  const fetchData = async () => {
    if (!tournamentId || !roundId) return;
    const key = `${tournamentId}-${roundId}`;
    setLoading(true);
    if (matchesCache.current[key]) {
      setMatches(matchesCache.current[key]);
      if (groupsCache.current[tournamentId]) setGroups(groupsCache.current[tournamentId]);
      setLoading(false);
      return;
    }
    try {
      const [mRes, gRes] = await Promise.all([
        api.get(`/tournaments/${tournamentId}/rounds/${roundId}/matches`),
        groupsCache.current[tournamentId]
          ? Promise.resolve({ data: groupsCache.current[tournamentId] })
          : api.get(`/tournaments/${tournamentId}/groups`)
      ]);
      setMatches(mRes.data);
      setGroups(gRes.data);
      matchesCache.current[key] = mRes.data;
      groupsCache.current[tournamentId] = gRes.data;
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tournamentId, roundId]);

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMap) return alert('Please select a map.');
    if (!newTime) return alert('Please enter a valid time.');
    if (selectedGroupIds.length === 0) return alert('Select at least one group.');
    setIsCreating(true);
    try {
      const res = await api.post(`/tournaments/${tournamentId}/rounds/${roundId}/matches`, {
        matchNo: newMatchNo, time: newTime, map: newMap, groupIds: selectedGroupIds,
      });
      const added = { ...res.data.match, groups: groups.filter(g => selectedGroupIds.includes(g._id)) };
      delete matchesCache.current[`${tournamentId}-${roundId}`];
      setMatches(prev => [...prev, added]);
      setNewMatchNo(newMatchNo + 1);
      setNewTime('00:00'); setNewMap(''); setSelectedGroupIds([]);
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message || 'Error adding match');
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (match: Match) => {
    setEditMatchId(match._id);
    setEditMatchNo(match.matchNo);
    setEditTime(to24Hour(match.time));
    setEditMap((match.map as MapName) || '');
  };

  const handleUpdateMatch = async (matchId: string) => {
    if (!editMap) return alert('Please select a map.');
    if (!editTime) return alert('Please enter a valid time.');
    try {
      const res = await api.put(`/tournaments/${tournamentId}/rounds/${roundId}/matches/${matchId}`, {
        matchNo: editMatchNo, time: editTime, map: editMap, groupIds: selectedGroupIds,
      });
      delete matchesCache.current[`${tournamentId}-${roundId}`];
      setMatches(prev => prev.map(m => m._id === matchId ? res.data : m));
      setEditMatchId(null);
    } catch (err: any) {
      alert(err.message || 'Error updating match');
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!window.confirm('Delete this match?')) return;
    try {
      await api.delete(`/tournaments/${tournamentId}/rounds/${roundId}/matches/${matchId}`);
      delete matchesCache.current[`${tournamentId}-${roundId}`];
      setMatches(prev => prev.filter(m => m._id !== matchId));
    } catch (err: any) {
      alert(err.message || 'Error deleting match');
    }
  };

  const toggleGroup = (id: string) =>
    setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (loading) return (
    <>
      <style>{STYLES}</style>
      <div className="m-root m-loading">
        <div className="m-spinner" />
        <p className="m-loading-txt">LOADING MATCHES</p>
      </div>
    </>
  );

  if (error) return (
    <>
      <style>{STYLES}</style>
      <div className="m-root m-loading">
        <p style={{ fontFamily: 'Orbitron,monospace', color: '#f87171', fontSize: 14 }}>ERROR: {error}</p>
      </div>
    </>
  );

  const uniqueMaps = Array.from(new Set(matches.map(m => m.map)));

  return (
    <>
      <style>{STYLES}</style>
      <div className="m-root m-page">
        <div className="m-hex" />
        <div className="m-scan" />
        <div className="m-glow" />

        <div className="m-inner">

          {/* ── Page Header ── */}
          <div className="m-page-hdr">
            <div>
              <div className="m-tag">MATCH SCHEDULE</div>
              <h1 className="m-orb m-page-title">{t('matches.title')}</h1>
              <p className="m-page-sub">{t('matches.subtitle')}</p>
            </div>
            <button
              className={showAddForm ? 'm-btn-ghost' : 'm-btn-primary'}
              onClick={() => setShowAddForm(p => !p)}
            >
              {showAddForm ? t('matches.cancel') : `+ ${t('matches.addMatch')}`}
            </button>
          </div>

          {/* ── Stats Bar ── */}
          <div className="m-statsbar">
            <div className="m-stat">
              <span className="m-orb m-stat-val">{matches.length}</span>
              <span className="m-stat-lbl">Total Matches</span>
            </div>
            <div className="m-stat">
              <span className="m-orb m-stat-val">{uniqueMaps.length}</span>
              <span className="m-stat-lbl">Maps Used</span>
            </div>
            <div className="m-stat">
              <span className="m-orb m-stat-val">{groups.length}</span>
              <span className="m-stat-lbl">Groups</span>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              REMODELED ADD FORM
          ══════════════════════════════════════════ */}
          {showAddForm && (
            <div className="m-form-panel">

              {/* Top bar */}
              <div className="m-form-topbar">
                <div className="m-form-topbar-l">
                  <span className="m-tag" style={{ margin: 0 }}>NEW</span>
                  <span className="m-orb m-form-title">{t('matches.addNewMatch')}</span>
                </div>
              </div>

              <form onSubmit={handleAddMatch}>
                <div className="m-form-body">

                  {/* ── LEFT: fields + map picker ── */}
                  <div className="m-form-left">

                    {/* Match No + Time */}
                    <div className="m-fields-row">
                      <div>
                        <p className="m-field-lbl">{t('matches.matchNumber')}</p>
                        <input
                          type="number" value={newMatchNo}
                          onChange={e => setNewMatchNo(parseInt(e.target.value))}
                          className="m-input" required
                        />
                      </div>
                      <div>
                        <p className="m-field-lbl">{t('matches.matchTime')}</p>
                        <input
                          type="time" value={newTime}
                          onChange={e => setNewTime(e.target.value)}
                          className="m-input" required
                        />
                      </div>
                    </div>

                    {/* Map picker */}
                    <p className="m-field-lbl m-map-picker-lbl">{t('matches.mapName')}</p>
                    <div className="m-map-grid">
                      {MAPS.map(map => {
                        const color = MAP_COLORS[map];
                        const isSelected = newMap === map;
                        return (
                          <div
                            key={map}
                            className={`m-map-card${isSelected ? ' mc-sel' : ''}`}
                            style={{ '--mc': color } as React.CSSProperties}
                            onClick={() => setNewMap(map)}
                          >
                            <div className="m-map-card-bar" />
                            <div className="m-map-check">✓</div>
                            <div className="m-map-card-name">{map}</div>
                            <div className="m-map-card-desc">{MAP_DESC[map]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── RIGHT: group selection ── */}
                  <div className="m-form-right">
                    <p className="m-field-lbl m-groups-lbl">{t('matches.selectGroups')}</p>
                    {groups.length === 0 ? (
                      <div className="m-no-groups">NO GROUPS AVAILABLE</div>
                    ) : (
                      <div className="m-groups-list">
                        {groups.map(group => {
                          const isActive = selectedGroupIds.includes(group._id);
                          return (
                            <div
                              key={group._id}
                              className={`m-group-chip${isActive ? ' gc-active' : ''}`}
                              onClick={() => toggleGroup(group._id)}
                            >
                              <span className="m-group-chip-dot" />
                              <span className="m-group-chip-name">{group.groupName}</span>
                              <span className="m-group-chip-check">✓</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form footer */}
                <div className="m-form-footer">
                  <span className="m-form-footer-info">
                    MAP: <span>{newMap || '—'}</span>
                    &nbsp;&nbsp;|&nbsp;&nbsp;
                    GROUPS: <span>{selectedGroupIds.length}</span>
                  </span>
                  <div className="m-form-footer-actions">
                    <button type="button" className="m-btn-cancel" onClick={() => setShowAddForm(false)}>
                      {t('matches.cancel')}
                    </button>
                    <button type="submit" className="m-btn-primary" disabled={isCreating}>
                      {isCreating
                        ? <><span className="m-spinner-sm" />{t('matches.creating')}</>
                        : t('matches.createMatch')
                      }
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ── Match List ── */}
          {matches.length === 0 ? (
            <div className="m-empty">
              <div className="m-empty-icon">
                <FaMap size={26} style={{ color: '#4ade80', opacity: 0.6 }} />
              </div>
              <h3 className="m-orb m-empty-title">{t('matches.noMatches')}</h3>
              <p className="m-empty-sub">{t('matches.clickAddMatch')}</p>
              <button className="m-btn-primary" style={{ padding: '12px 32px', margin: '0 auto' }} onClick={() => setShowAddForm(true)}>
                + {t('matches.addMatch')}
              </button>
            </div>
          ) : (
            <>
              <div className="m-divider"><span>SCHEDULED MATCHES</span></div>
              <div className="m-list">
                {matches.map(match => {
                  const mapColor  = MAP_COLORS[match.map as MapName] || '#4ade80';
                  const isEditing = editMatchId === match._id;

                  return (
                    <div
                      key={match._id}
                      className="m-row"
                      onClick={() => { if (!isEditing) navigate(`/tournaments/${tournamentId}/rounds/${roundId}/matches/${match._id}`); }}
                    >
                      <div className="m-row-bar" style={{ background: `linear-gradient(180deg, ${mapColor}, ${mapColor}88)` }} />

                      {!isEditing ? (
                        <div className="m-row-body">
                          <div className="m-match-num" style={{ background: mapColor, boxShadow: `0 0 8px ${mapColor}55` }}>
                            M{match.matchNo}
                          </div>
                          <div className="m-map-block">
                            <div className="m-orb m-map-name" style={{ color: mapColor }}>{match.map}</div>
                            <div className="m-meta">
                              <span className="m-time-chip">
                                <FaClock size={10} />{match.time}
                              </span>
                              {match.groups?.map(g => (
                                <span key={g._id} className="m-group-pill">{g.groupName}</span>
                              ))}
                            </div>
                          </div>
                          <div className="m-row-actions" onClick={e => e.stopPropagation()}>
                            <button className="m-ic-btn m-ic-edit" onClick={() => startEdit(match)} title="Edit">
                              <FaEdit color="#fff" size={13} />
                            </button>
                            <button className="m-ic-btn m-ic-del" onClick={() => handleDeleteMatch(match._id)} title="Delete">
                              <FaTrash color="#fff" size={13} />
                            </button>
                          </div>
                          <FaChevronRight className="m-nav-arrow" size={14} />
                        </div>
                      ) : (
                        /* ── Inline edit mode ── */
                        <div onClick={e => e.stopPropagation()}>
                          <div className="m-row-body" style={{ paddingBottom: 10 }}>
                            <div className="m-match-num" style={{ background: mapColor }}>M{match.matchNo}</div>
                            <span className="m-orb" style={{ fontSize: 11, color: '#4ade80', letterSpacing: 1 }}>EDITING</span>
                          </div>
                          <div className="m-edit-form">
                            <div className="m-edit-grid">
                              <div>
                                <p className="m-field-lbl">Match No</p>
                                <input type="number" min={1} value={editMatchNo}
                                  onChange={e => setEditMatchNo(parseInt(e.target.value) || 1)}
                                  className="m-input" />
                              </div>
                              <div>
                                <p className="m-field-lbl">Time</p>
                                <input type="time" value={editTime}
                                  onChange={e => setEditTime(e.target.value)}
                                  className="m-input" />
                              </div>
                              <div>
                                <p className="m-field-lbl">Map</p>
                                <div className="m-edit-map-row">
                                  {MAPS.map(map => {
                                    const color = MAP_COLORS[map];
                                    return (
                                      <div
                                        key={map}
                                        className={`m-edit-map-chip${editMap === map ? ' emc-sel' : ''}`}
                                        style={{ '--mc': color } as React.CSSProperties}
                                        onClick={() => setEditMap(map)}
                                      >
                                        {map}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="m-edit-actions">
                              <button className="m-btn-cancel" onClick={() => setEditMatchId(null)}>Cancel</button>
                              <button className="m-btn-save" onClick={() => handleUpdateMatch(match._id)}>Save Changes</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
};

export default Match;
