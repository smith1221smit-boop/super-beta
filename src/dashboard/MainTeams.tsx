import React, {
  useState, useEffect, ChangeEvent, FormEvent,
  useCallback, useMemo, useTransition, memo
} from 'react';
import { flushSync } from 'react-dom';
import { FaTrash, FaEdit, FaDiscord, FaUpload, FaTrophy, FaUsers, FaEye, FaChevronDown, FaChevronUp, FaSearch, FaTimes } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import api from '../login/api.tsx';
import { uploadToCloudinary } from '../utils/cloudinaryUpload.tsx';

interface Player {
  _id?: string;
  playerName: string;
  playerId?: string;
  photo?: string;
}

interface Team {
  _id: string;
  teamFullName: string;
  teamTag: string;
  logo?: string;
  players: Player[];
}

// ── Styles ────────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&display=swap');

.tm-root * { box-sizing: border-box; }
.tm-root { font-family: 'Rajdhani', sans-serif; }
.tm-orb { font-family: 'Orbitron', monospace !important; }

/* ── Ambient ── */
.tm-scan {
  position: fixed; inset: 0; pointer-events: none; z-index: 999; opacity: 0.02;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(168,85,247,0.5) 2px, rgba(168,85,247,0.5) 4px);
}
.tm-hex {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: radial-gradient(circle, rgba(168,85,247,0.05) 1px, transparent 1px);
  background-size: 38px 38px;
}

/* ── Sidebar ── */
.tm-sidebar-btn {
  display: flex; flex-direction: column; align-items: center;
  color: #6b7280; cursor: pointer;
  padding: 10px; border-radius: 12px; width: 64px;
  border: 1px solid transparent; background: transparent;
}
.tm-sidebar-btn:hover {
  color: #a855f7; background: rgba(168,85,247,0.08);
  border-color: rgba(168,85,247,0.3);
  box-shadow: 0 0 16px rgba(168,85,247,0.2);
}
.tm-sidebar-btn.active {
  color: #a855f7; background: rgba(168,85,247,0.12);
  border-color: rgba(168,85,247,0.5);
  box-shadow: 0 0 20px rgba(168,85,247,0.3);
}

/* ── Tags / Badges ── */
.tm-tag {
  display: inline-flex; align-items: center;
  background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.28);
  color: #a855f7; font-family: 'Orbitron', monospace; font-size: 10px;
  padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px; font-weight: 700;
}

/* ── Buttons ── */
.tm-btn-primary {
  background: linear-gradient(135deg, #9333ea, #7e22ce);
  color: #fff; border: 1px solid rgba(168,85,247,0.5);
  font-family: 'Orbitron', monospace; font-size: 11px;
  letter-spacing: 1px; padding: 10px 22px; border-radius: 8px;
  cursor: pointer; font-weight: 700;
}
.tm-btn-primary:hover {
  background: linear-gradient(135deg, #7e22ce, #6b21a8);
  box-shadow: 0 0 18px rgba(168,85,247,0.35);
}

.tm-btn-ghost {
  background: rgba(0,0,0,0.4); color: #9ca3af;
  border: 1px solid rgba(168,85,247,0.18);
  font-family: 'Rajdhani', sans-serif; font-size: 14px;
  padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;
}
.tm-btn-ghost:hover {
  background: rgba(168,85,247,0.07); color: #a855f7;
  border-color: rgba(168,85,247,0.35);
}

.tm-btn-danger {
  background: rgba(220,38,38,0.12); color: #f87171;
  border: 1px solid rgba(220,38,38,0.28);
  font-family: 'Rajdhani', sans-serif; font-size: 13px;
  padding: 7px 12px; border-radius: 7px; cursor: pointer; font-weight: 600;
}
.tm-btn-danger:hover { background: rgba(220,38,38,0.25); }
.tm-btn-danger:disabled { opacity: 0.35; cursor: not-allowed; }

.tm-btn-edit {
  background: rgba(37,99,235,0.15); color: #60a5fa;
  border: 1px solid rgba(37,99,235,0.28);
  font-family: 'Rajdhani', sans-serif; font-size: 13px;
  padding: 7px 12px; border-radius: 7px; cursor: pointer; font-weight: 600;
}
.tm-btn-edit:hover { background: rgba(37,99,235,0.28); }

.tm-btn-purple-ghost {
  background: rgba(168,85,247,0.08); color: #a855f7;
  border: 1px solid rgba(168,85,247,0.22);
  font-family: 'Rajdhani', sans-serif; font-size: 13px;
  padding: 7px 14px; border-radius: 7px; cursor: pointer; font-weight: 600;
}
.tm-btn-purple-ghost:hover { background: rgba(168,85,247,0.15); }

/* ── Inputs ── */
.tm-input {
  width: 100%; padding: 10px 13px;
  background: rgba(0,0,0,0.6); border: 1px solid rgba(168,85,247,0.28);
  border-radius: 8px; color: #fff;
  font-family: 'Rajdhani', sans-serif; font-size: 14px; letter-spacing: 0.3px; outline: none;
}
.tm-input::placeholder { color: #374151; }
.tm-input:focus {
  border-color: rgba(168,85,247,0.7);
  box-shadow: 0 0 0 3px rgba(168,85,247,0.12), 0 0 12px rgba(168,85,247,0.12);
}

/* ── Glass panels ── */
.tm-glass {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(168,85,247,0.15);
  backdrop-filter: blur(16px);
}
.tm-glass-dark {
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(168,85,247,0.25);
  backdrop-filter: blur(20px);
}

/* ── Team row (new layout: horizontal list) ── */
.tm-team-row {
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(168,85,247,0.12);
  border-radius: 14px; overflow: hidden; margin-bottom: 8px;
}
.tm-team-row:hover { border-color: rgba(168,85,247,0.32); }

.tm-team-row-hdr {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 16px; cursor: pointer; user-select: none;
}

/* Accent bar left edge */
.tm-team-row-accent {
  width: 3px; height: 44px; border-radius: 3px; flex-shrink: 0;
  background: linear-gradient(180deg, #a855f7, rgba(168,85,247,0.3));
  box-shadow: 0 0 8px rgba(168,85,247,0.4);
}

.tm-team-logo {
  width: 44px; height: 44px; border-radius: 10px;
  object-fit: cover; border: 1px solid rgba(168,85,247,0.25); flex-shrink: 0;
}
.tm-team-logo-ph {
  width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0;
  background: rgba(168,85,247,0.07); border: 1px solid rgba(168,85,247,0.18);
  display: flex; align-items: center; justify-content: center;
}

.tm-team-meta { flex: 1; min-width: 0; }
.tm-team-tag {
  font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 900;
  color: #a855f7; letter-spacing: 0.5px; line-height: 1;
}
.tm-team-name {
  font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700;
  color: #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-top: 3px;
}

/* Player count pill */
.tm-player-pill {
  display: flex; align-items: center; gap: 5px;
  background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.22);
  border-radius: 20px; padding: 4px 11px;
  font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700;
  color: #a855f7; flex-shrink: 0;
}

.tm-row-actions { display: flex; gap: 7px; flex-shrink: 0; }
.tm-chevron { color: #4b5563; font-size: 11px; flex-shrink: 0; }

/* ── Expanded player list ── */
.tm-player-section {
  border-top: 1px solid rgba(168,85,247,0.08);
  padding: 0 16px 12px;
  background: rgba(0,0,0,0.2);
}

.tm-player-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 6px; padding-top: 10px;
}

.tm-player-card {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border-radius: 8px;
  background: rgba(0,0,0,0.35); border: 1px solid rgba(168,85,247,0.1);
}
.tm-player-card:hover { border-color: rgba(168,85,247,0.25); }

.tm-player-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  object-fit: cover; border: 1px solid rgba(168,85,247,0.25); flex-shrink: 0;
}
.tm-player-avatar-ph {
  width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.15);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Orbitron', monospace; font-size: 9px; color: #a855f7; font-weight: 900;
}

/* Checkbox */
.tm-checkbox {
  width: 17px; height: 17px; border-radius: 4px; flex-shrink: 0; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.tm-checkbox.checked {
  background: #9333ea; border: 1px solid #a855f7;
  box-shadow: 0 0 6px rgba(168,85,247,0.4);
}
.tm-checkbox.unchecked {
  background: rgba(0,0,0,0.4); border: 1px solid rgba(168,85,247,0.28);
}
.tm-checkbox.unchecked:hover { border-color: #a855f7; }

.tm-player-info { flex: 1; min-width: 0; }
.tm-player-name { font-size: 13px; color: #e5e7eb; font-weight: 600; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tm-player-id { font-size: 10px; color: #6b7280; font-family: 'Orbitron', monospace; }

.tm-del-player {
  width: 22px; height: 22px; border-radius: 5px; flex-shrink: 0;
  background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.2);
  color: #ef4444; cursor: pointer;
  display: flex; align-items: center; justify-content: center; opacity: 0;
}
.tm-player-card:hover .tm-del-player { opacity: 1; }
.tm-del-player:hover { background: rgba(220,38,38,0.28); }

/* ── Search ── */
.tm-search-wrap { position: relative; max-width: 380px; }
.tm-search-ic { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #4b5563; font-size: 12px; pointer-events: none; }

/* ── Player form row ── */
.tm-player-form-row {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  background: rgba(0,0,0,0.35); border: 1px solid rgba(168,85,247,0.12);
  border-radius: 10px; padding: 10px 12px; margin-bottom: 8px;
}

/* ── Modal ── */
.tm-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.82);
  backdrop-filter: blur(10px); display: flex; align-items: center;
  justify-content: center; z-index: 200; padding: 16px;
}
.tm-modal-box {
  width: 100%; max-width: 620px; max-height: 90vh; overflow-y: auto;
  border-radius: 18px; background: rgba(5,0,18,0.97);
  border: 1px solid rgba(168,85,247,0.3);
  box-shadow: 0 0 50px rgba(168,85,247,0.1), 0 40px 80px rgba(0,0,0,0.7);
}
.tm-modal-box::-webkit-scrollbar { width: 5px; }
.tm-modal-box::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.3); border-radius: 4px; }

/* ── Create form card ── */
.tm-create-card {
  background: rgba(0,0,0,0.55); border: 1px solid rgba(168,85,247,0.25);
  border-radius: 16px; overflow: hidden; margin-bottom: 28px;
}
.tm-create-card-hdr {
  padding: 16px 20px; border-bottom: 1px solid rgba(168,85,247,0.12);
  display: flex; align-items: center; gap: 10px;
  background: rgba(168,85,247,0.04);
}
.tm-create-card-body { padding: 18px 20px; }

/* ── Divider ── */
.tm-divider {
  height: 1px; background: rgba(168,85,247,0.08); margin: 0 0 12px;
}

/* ── Empty state ── */
.tm-empty {
  text-align: center; padding: 64px 24px;
}
.tm-empty-icon-wrap {
  width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 20px;
  background: rgba(168,85,247,0.07); border: 1px solid rgba(168,85,247,0.25);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 24px rgba(168,85,247,0.1);
}

@media (max-width: 600px) {
  .tm-team-name { font-size: 12px; }
  .tm-player-grid { grid-template-columns: 1fr; }
  .tm-row-actions { gap: 5px; }
}
`;

// ── PlayerCard ────────────────────────────────────────────────────────────────
const PlayerCard = memo(({
  player, isSelected, onToggle, onDelete, teamId, isDeleting,
}: {
  player: Player; isSelected: boolean;
  onToggle: (id: string) => void;
  onDelete: (teamId: string, playerId: string) => void;
  teamId: string; isDeleting: boolean;
}) => {
  const initials = player.playerName?.slice(0, 2).toUpperCase() || '??';
  return (
    <div className="tm-player-card">
      <div
        className={`tm-checkbox ${isSelected ? 'checked' : 'unchecked'}`}
        onClick={() => player._id && onToggle(player._id)}
      >
        {isSelected && (
          <svg width="9" height="9" fill="none" stroke="#fff" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      {player.photo
        ? <img src={player.photo} alt={player.playerName} className="tm-player-avatar" loading="lazy" onError={e => e.currentTarget.src = './def_char.png'} />
        : <div className="tm-player-avatar-ph">{initials}</div>
      }
      <div className="tm-player-info">
        <div className="tm-player-name">{player.playerName}</div>
        {player.playerId && <div className="tm-player-id">#{player.playerId}</div>}
      </div>
      {player._id && (
        <button className="tm-del-player" onClick={() => onDelete(teamId, player._id!)} disabled={isDeleting}>
          <FaTrash size={9} />
        </button>
      )}
    </div>
  );
});

// ── TeamRow ───────────────────────────────────────────────────────────────────
const TeamRow = memo(({
  team, onEdit, onDelete, onDeletePlayer, onDeleteSelectedPlayers,
  deletingTeamIds, deletingPlayerIds,
}: {
  team: Team;
  onEdit: (team: Team) => void;
  onDelete: (id: string) => void;
  onDeletePlayer: (teamId: string, playerId: string) => void;
  onDeleteSelectedPlayers: (teamId: string, playerIds: string[]) => Promise<void>;
  deletingTeamIds: Set<string>;
  deletingPlayerIds: Set<string>;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(prev => {
      const validIds = new Set(team.players.map(p => p._id!).filter(Boolean));
      const pruned = new Set(Array.from(prev).filter(id => validIds.has(id)));
      return pruned.size === prev.size ? prev : pruned;
    });
  }, [team.players]);

  const togglePlayer = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selected.size === 0) return;
    if (!window.confirm('Delete selected players?')) return;
    try {
      await onDeleteSelectedPlayers(team._id, Array.from(selected));
      setSelected(new Set());
    } catch {}
  }, [selected, team._id, onDeleteSelectedPlayers]);

  return (
    <div className="tm-team-row">
      {/* Header row */}
      <div className="tm-team-row-hdr" onClick={() => setExpanded(v => !v)}>
        <div className="tm-team-row-accent" />
        {team.logo
          ? <img src={team.logo} alt={team.teamFullName} className="tm-team-logo" loading="lazy" onError={e => e.currentTarget.src = './logo.png'} />
          : <div className="tm-team-logo-ph"><FaUsers size={20} style={{ color: '#a855f7', opacity: 0.45 }} /></div>
        }
        <div className="tm-team-meta">
          <div className="tm-team-tag">[{team.teamTag}]</div>
          <div className="tm-team-name">{team.teamFullName}</div>
        </div>

        <div className="tm-player-pill">
          <FaUsers size={9} />
          {team.players.length}
        </div>

        <div className="tm-row-actions" onClick={e => e.stopPropagation()}>
          <button className="tm-btn-edit" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => onEdit(team)}>
            <FaEdit size={11} /> Edit
          </button>
          <button className="tm-btn-danger" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => onDelete(team._id)} disabled={deletingTeamIds.has(team._id)}>
            <FaTrash size={11} /> Delete
          </button>
        </div>

        <span className="tm-chevron">
          {expanded ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
        </span>
      </div>

      {/* Expanded player section */}
      {expanded && (
        <div className="tm-player-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 6 }}>
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: '#6b7280', letterSpacing: '2px' }}>
              PLAYERS — {team.players.length}
            </span>
            {selected.size > 0 && (
              <button className="tm-btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={handleDeleteSelected}>
                Delete {selected.size} selected
              </button>
            )}
          </div>
          <div className="tm-divider" />
          {team.players.length === 0 ? (
            <p style={{ color: '#4b5563', fontSize: 12, padding: '10px 0', fontFamily: 'Orbitron, monospace', letterSpacing: 1 }}>
              NO PLAYERS ADDED
            </p>
          ) : (
            <div className="tm-player-grid">
              {team.players.map(player => (
                <PlayerCard
                  key={player._id || player.playerName}
                  player={player}
                  isSelected={selected.has(player._id!)}
                  onToggle={togglePlayer}
                  onDelete={onDeletePlayer}
                  isDeleting={deletingPlayerIds.has(player._id!)}
                  teamId={team._id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ── SearchInput ───────────────────────────────────────────────────────────────
const SearchInput = memo(({ onSearchChange }: { onSearchChange: (q: string) => void }) => {
  const [localQuery, setLocalQuery] = useState('');
  const [, startTransition] = useTransition();

  useEffect(() => {
    const id = setTimeout(() => {
      startTransition(() => onSearchChange(localQuery));
    }, localQuery === '' ? 0 : 280);
    return () => clearTimeout(id);
  }, [localQuery, onSearchChange]);

  return (
    <div className="tm-search-wrap" style={{ flex: 1 }}>
      <FaSearch className="tm-search-ic" />
      <input
        type="text" value={localQuery}
        onChange={e => setLocalQuery(e.target.value)}
        placeholder="Search teams by name or tag…"
        className="tm-input" style={{ paddingLeft: 34 }}
      />
    </div>
  );
});

// ── FormFields (shared between create + edit) ─────────────────────────────────
const FormFields = memo(({
  form, playersForm, editingTeamId,
  handleTeamInputChange, handlePlayerChange,
  addPlayerInput, removePlayerInput,
  handleSubmit, resetForm,
  handleLogoUpload, handlePlayerPhotoUpload,
}: {
  form: { teamFullName: string; teamTag: string; logo: string };
  playersForm: Player[];
  editingTeamId: string | null;
  handleTeamInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handlePlayerChange: (index: number, e: ChangeEvent<HTMLInputElement>) => void;
  addPlayerInput: () => void;
  removePlayerInput: (index: number) => void;
  handleSubmit: (e: FormEvent) => void;
  resetForm: () => void;
  handleLogoUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  handlePlayerPhotoUpload: (index: number, e: ChangeEvent<HTMLInputElement>) => void;
}) => {
  const idPrefix = editingTeamId ? 'modal' : 'inline';
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {/* Team info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
        <input type="text" name="teamFullName" placeholder="Team full name"
          value={form.teamFullName} onChange={handleTeamInputChange} required autoFocus
          className="tm-input" />
        <input type="text" name="teamTag" placeholder="TAG"
          value={form.teamTag} onChange={handleTeamInputChange} required
          className="tm-input" style={{ width: 100 }} />
      </div>

      {/* Logo upload */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label htmlFor={`${idPrefix}-logo`} className="tm-input"
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 'auto', flex: 1 }}>
          <FaUpload size={13} style={{ color: '#a855f7', flexShrink: 0 }} />
          <span style={{ color: '#9ca3af' }}>Upload team logo</span>
        </label>
        <input id={`${idPrefix}-logo`} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
        {form.logo && (
          <img src={form.logo} alt="Logo"
            style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid rgba(168,85,247,0.35)', flexShrink: 0 }}
            loading="lazy" onError={e => e.currentTarget.src = './logo.png'} />
        )}
      </div>

      {/* Players */}
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: '#a855f7', letterSpacing: '2px', paddingTop: 4 }}>
        PLAYERS
      </div>

      {playersForm.map((player, index) => (
        <div key={player._id || index} className="tm-player-form-row">
          <input type="text" name="playerName" placeholder="Player name"
            value={player.playerName} onChange={e => handlePlayerChange(index, e)} required
            className="tm-input" style={{ flex: '1 1 150px', width: 'auto' }} />
          <input type="text" name="playerId" placeholder="ID / IGN"
            value={player.playerId} onChange={e => handlePlayerChange(index, e)}
            className="tm-input" style={{ flex: '0 0 100px', width: 100 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor={`${idPrefix}-photo-${index}`} className="tm-input"
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', width: 'auto', padding: '10px 12px', whiteSpace: 'nowrap' }}>
              <FaUpload size={11} style={{ color: '#a855f7', flexShrink: 0 }} />
              Photo
            </label>
            <input id={`${idPrefix}-photo-${index}`} type="file" accept="image/*"
              onChange={e => handlePlayerPhotoUpload(index, e)} style={{ display: 'none' }} />
            {player.photo && (
              <img src={player.photo} alt="Preview"
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(168,85,247,0.35)' }}
                loading="lazy" onError={e => e.currentTarget.src = './def_char.png'} />
            )}
            {playersForm.length > 1 && (
              <button type="button" onClick={() => removePlayerInput(index)} className="tm-btn-danger" style={{ padding: '6px 9px' }}>
                <FaTrash size={11} />
              </button>
            )}
          </div>
        </div>
      ))}

      <button type="button" onClick={addPlayerInput} className="tm-btn-purple-ghost" style={{ alignSelf: 'flex-start' }}>
        + Add player
      </button>

      <div style={{ display: 'flex', gap: 10, paddingTop: 6, borderTop: '1px solid rgba(168,85,247,0.1)', marginTop: 2 }}>
        <button type="button" onClick={resetForm} className="tm-btn-ghost">Cancel</button>
        <button type="submit" className="tm-btn-primary">
          {editingTeamId ? 'UPDATE TEAM' : 'CREATE TEAM'}
        </button>
      </div>
    </form>
  );
});

// ── FormContainer ─────────────────────────────────────────────────────────────
const FormContainer = memo(({
  showForm, setShowForm, editingTeamId, setEditingTeamId, teams, setTeams,
}: {
  showForm: boolean;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
  editingTeamId: string | null;
  setEditingTeamId: React.Dispatch<React.SetStateAction<string | null>>;
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
}) => {
  const [form, setForm] = useState({ teamFullName: '', teamTag: '', logo: '' });
  const [playersForm, setPlayersForm] = useState<Player[]>([{ playerName: '', playerId: '', photo: '' }]);

  const resetForm = useCallback(() => {
    setEditingTeamId(null);
    setForm({ teamFullName: '', teamTag: '', logo: '' });
    setPlayersForm([{ playerName: '', playerId: '', photo: '' }]);
    setShowForm(false);
  }, [setEditingTeamId, setShowForm]);

  const handleTeamInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handlePlayerChange = useCallback((index: number, e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPlayersForm(prev => { const c = [...prev]; c[index] = { ...c[index], [name]: value }; return c; });
  }, []);

  const addPlayerInput = useCallback(() => {
    setPlayersForm(prev => [...prev, { playerName: '', playerId: '', photo: '' }]);
  }, []);

  const removePlayerInput = useCallback((index: number) => {
    setPlayersForm(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleLogoUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const url = await uploadToCloudinary(file, 'teams/logos', 'team_logo'); setForm(p => ({ ...p, logo: url })); }
    catch { alert('Upload failed'); }
  }, []);

  const handlePlayerPhotoUpload = useCallback(async (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const url = await uploadToCloudinary(file, 'players/photos', 'player_photo');
      setPlayersForm(prev => { const c = [...prev]; c[index] = { ...c[index], photo: url }; return c; });
    } catch { alert('Upload failed'); }
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (playersForm.some(p => p.playerName.trim() === '')) { alert('Fill in all player names'); return; }
    try {
      const payload = { ...form, players: playersForm };
      if (editingTeamId) {
        const res = await api.put(`/teams/${editingTeamId}`, payload);
        setTeams(prev => prev.map(t => t._id === editingTeamId ? res.data : t));
      } else {
        const res = await api.post('/teams', payload);
        setTeams(prev => [...prev, res.data]);
      }
      resetForm();
    } catch { alert('Failed to save team'); }
  }, [form, playersForm, editingTeamId, setTeams, resetForm]);

  useEffect(() => {
    if (editingTeamId) {
      const team = teams.find(t => t._id === editingTeamId);
      if (team) {
        setForm({ teamFullName: team.teamFullName, teamTag: team.teamTag, logo: team.logo || '' });
        setPlayersForm(team.players.length ? team.players : [{ playerName: '', playerId: '', photo: '' }]);
        setShowForm(true);
      }
    }
  }, [editingTeamId, teams, setShowForm]);

  useEffect(() => {
    if (editingTeamId) {
      const team = teams.find(t => t._id === editingTeamId);
      if (team) setPlayersForm(team.players.length ? team.players : [{ playerName: '', playerId: '', photo: '' }]);
    }
  }, [teams, editingTeamId]);

  const fieldProps = {
    form, playersForm, editingTeamId,
    handleTeamInputChange, handlePlayerChange,
    addPlayerInput, removePlayerInput,
    handleSubmit, resetForm,
    handleLogoUpload, handlePlayerPhotoUpload,
  };

  // Edit modal
  if (editingTeamId) {
    return (
      <div className="tm-modal-overlay">
        <div className="tm-modal-box">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 22px 14px', borderBottom: '1px solid rgba(168,85,247,0.15)',
            background: 'rgba(168,85,247,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="tm-tag">EDIT</span>
              <span className="tm-orb" style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Edit Team</span>
            </div>
            <button onClick={resetForm} style={{
              width: 30, height: 30, borderRadius: 7,
              background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
              color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FaTimes size={13} />
            </button>
          </div>
          <div style={{ padding: '18px 22px' }}>
            <FormFields {...fieldProps} />
          </div>
        </div>
      </div>
    );
  }

  // Inline create form
  if (!showForm) return null;
  return (
    <div className="tm-create-card" style={{ maxWidth: 680 }}>
      <div className="tm-create-card-hdr">
        <div style={{ width: 3, height: 18, borderRadius: 2, background: '#a855f7', boxShadow: '0 0 8px rgba(168,85,247,0.6)' }} />
        <span className="tm-tag">NEW</span>
        <span className="tm-orb" style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Create Team</span>
      </div>
      <div className="tm-create-card-body">
        <FormFields {...fieldProps} />
      </div>
    </div>
  );
});

// ── Teams root ────────────────────────────────────────────────────────────────
const Teams: React.FC = () => {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingTeamIds, setDeletingTeamIds] = useState<Set<string>>(new Set());
  const [deletingPlayerIds, setDeletingPlayerIds] = useState<Set<string>>(new Set());

  const deletingTeamIdsRef = React.useRef(deletingTeamIds);
  const deletingPlayerIdsRef = React.useRef(deletingPlayerIds);
  useEffect(() => { deletingTeamIdsRef.current = deletingTeamIds; }, [deletingTeamIds]);
  useEffect(() => { deletingPlayerIdsRef.current = deletingPlayerIds; }, [deletingPlayerIds]);

  const fetchTeams = useCallback(async () => {
    try { const res = await api.get<Team[]>('/teams'); setTeams(res.data); }
    catch (err) { console.error('Fetch teams failed:', err); }
  }, []);

  useEffect(() => {
    api.get('/users/me').then(({ data }) => setUser(data)).catch(() => {});
    fetchTeams();
  }, [fetchTeams]);

  const visibleTeams = useMemo(() => {
    if (!searchQuery) return teams;
    const q = searchQuery.toLowerCase();
    return teams.filter(t =>
      t.teamFullName.toLowerCase().includes(q) || t.teamTag.toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  const handleSearchChange = useCallback((q: string) => setSearchQuery(q), []);

  const handleAddTeamClick = useCallback(() => {
    flushSync(() => {
      if (showForm) { setShowForm(false); setEditingTeamId(null); }
      else setShowForm(true);
    });
  }, [showForm]);

  const startEditTeam = useCallback((team: Team) => setEditingTeamId(team._id), []);

  const deleteTeam = useCallback(async (id: string) => {
    if (!window.confirm('Delete this team?')) return;
    if (deletingTeamIdsRef.current.has(id)) return;
    setDeletingTeamIds(prev => new Set(prev).add(id));
    setTeams(prev => prev.filter(t => t._id !== id));
    try { await api.delete(`/teams/${id}`); }
    catch { alert('Failed to delete team'); fetchTeams(); }
    finally { setDeletingTeamIds(prev => { const c = new Set(prev); c.delete(id); return c; }); }
  }, [fetchTeams]);

  const deletePlayer = useCallback(async (teamId: string, playerId: string) => {
    if (!window.confirm('Delete this player?')) return;
    if (deletingPlayerIdsRef.current.has(playerId)) return;
    setDeletingPlayerIds(prev => new Set(prev).add(playerId));
    try {
      await api.delete(`/teams/${teamId}/players/${playerId}`);
      setTeams(prev => prev.map(t =>
        t._id === teamId ? { ...t, players: t.players.filter(p => p._id !== playerId) } : t
      ));
    } catch { alert('Failed to delete player'); }
    finally { setDeletingPlayerIds(prev => { const c = new Set(prev); c.delete(playerId); return c; }); }
  }, []);

  const deleteSelectedPlayers = useCallback(async (teamId: string, playerIds: string[]) => {
    try {
      await api.delete(`/teams/${teamId}/players`, { data: { playerIds } });
      setTeams(prev => prev.map(t =>
        t._id === teamId ? { ...t, players: t.players.filter(p => !playerIds.includes(p._id!)) } : t
      ));
    } catch {
      alert('Failed to delete selected players');
      throw new Error('delete failed');
    }
  }, []);

  return (
    <div className="tm-root" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #120038 0%, #000000 50%, #120038 100%)'
    }}>
      <style>{STYLES}</style>
      <div className="tm-scan" />
      <div className="tm-hex" />
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(168,85,247,0.1), transparent)'
      }} />

      {/* ── SIDEBAR ── */}
      <div style={{
        position: 'fixed', left: 0, top: 0, height: '100%', width: 78, zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '24px 0', gap: 8,
        background: 'rgba(0,0,0,0.88)',
        borderRight: '1px solid #120038',
        backdropFilter: 'blur(24px)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.6), inset -1px 0 0 rgba(168,85,247,0.08)'
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, marginBottom: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)'
        }}>
          <img src="./logo.avif" alt="logo" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
        </div>

        {user && (
          <div style={{
            width: 50, padding: '4px 2px', borderRadius: 8, marginBottom: 4,
            background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'yellow', boxShadow: '0 0 6px yellow' }} />
            <span style={{
              fontSize: 9, color: 'yellow', letterSpacing: '0.5px', fontWeight: 700,
              maxWidth: 46, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', textAlign: 'center', padding: '0 3px'
            }}>
              {user.username}
            </span>
          </div>
        )}

        <div style={{ width: 40, height: 1, background: 'rgba(168,85,247,0.2)', margin: '2px 0 6px' }} />

        <button className="tm-sidebar-btn" onClick={() => window.location.href = '/dashboard'}>
          <FaTrophy size={20} />
          <span style={{ fontSize: 10, marginTop: 4, letterSpacing: '0.5px', fontWeight: 600 }}>TOUR</span>
        </button>
        <button className="tm-sidebar-btn active">
          <FaUsers size={20} />
          <span style={{ fontSize: 10, marginTop: 4, letterSpacing: '0.5px', fontWeight: 600 }}>TEAMS</span>
        </button>
        <button className="tm-sidebar-btn" onClick={() => window.open('/displayhud', '_blank', 'noopener,noreferrer')}>
          <FaEye size={20} />
          <span style={{ fontSize: 10, marginTop: 4, letterSpacing: '0.5px', fontWeight: 600 }}>HUD</span>
        </button>

        <div style={{ flex: 1 }} />

        <button className="tm-sidebar-btn"
          onClick={() => window.open('https://discord.com/channels/623776491682922526/1426117227257663558', '_blank')}>
          <FaDiscord size={20} />
          <span style={{ fontSize: 10, marginTop: 4, letterSpacing: '0.5px', fontWeight: 600 }}>HELP</span>
        </button>
      </div>

      {/* ── MAIN ── */}
      <main style={{ marginLeft: 78, padding: '32px 28px', position: 'relative', zIndex: 1, maxWidth: 1200 }}>

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="tm-tag">TEAMS</span>
          </div>
          <h2 className="tm-orb" style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: 1, marginBottom: 4 }}>
            {t('teams.header.title')}
          </h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>{t('teams.header.subtitle')}</p>
        </div>

        <button className="tm-btn-primary" style={{ padding: '12px 28px', marginBottom: 28 }}
          onClick={handleAddTeamClick}>
          {showForm ? 'CANCEL' : '+ CREATE TEAM'}
        </button>

        {/* Create form */}
        <FormContainer
          showForm={showForm} setShowForm={setShowForm}
          editingTeamId={editingTeamId} setEditingTeamId={setEditingTeamId}
          teams={teams} setTeams={setTeams}
        />

        {/* Roster section */}
        <div style={{ marginBottom: 16 }}>
          {/* Section header + search inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 18, borderRadius: 2, background: '#a855f7', boxShadow: '0 0 8px rgba(168,85,247,0.6)' }} />
              <span className="tm-tag">ROSTER</span>
              <span className="tm-orb" style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
                All Teams
              </span>
            </div>
            <SearchInput onSearchChange={handleSearchChange} />
            <span className="tm-orb" style={{ fontSize: 11, color: '#4b5563', marginLeft: 'auto' }}>
              {visibleTeams.length} / {teams.length}
            </span>
          </div>

          {/* Stats strip */}
          <div style={{
            display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap'
          }}>
            {[
              { label: 'TOTAL TEAMS', value: teams.length },
              { label: 'TOTAL PLAYERS', value: teams.reduce((s, t) => s + t.players.length, 0) },
              { label: 'AVG SQUAD SIZE', value: teams.length ? (teams.reduce((s, t) => s + t.players.length, 0) / teams.length).toFixed(1) : '—' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(168,85,247,0.15)',
                borderRadius: 10, padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 2
              }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 8, color: '#6b7280', letterSpacing: '2px' }}>
                  {stat.label}
                </span>
                <span className="tm-orb" style={{ fontSize: 20, fontWeight: 900, color: '#a855f7' }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Team list */}
        {visibleTeams.length === 0 ? (
          <div className="tm-empty">
            <div className="tm-empty-icon-wrap">
              <FaUsers size={28} style={{ color: '#a855f7', opacity: 0.6 }} />
            </div>
            <h3 className="tm-orb" style={{ fontSize: 16, color: '#fff', marginBottom: 8 }}>
              {t('teams.messages.noTeams')}
            </h3>
            <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
              {t('teams.messages.createFirst')}
            </p>
            <button className="tm-btn-primary" style={{ padding: '12px 32px' }} onClick={() => setShowForm(true)}>
              + CREATE TEAM
            </button>
          </div>
        ) : (
          <div>
            {visibleTeams.map(team => (
              <TeamRow
                key={team._id}
                team={team}
                onEdit={startEditTeam}
                onDelete={deleteTeam}
                onDeletePlayer={deletePlayer}
                onDeleteSelectedPlayers={deleteSelectedPlayers}
                deletingTeamIds={deletingTeamIds}
                deletingPlayerIds={deletingPlayerIds}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Teams;
