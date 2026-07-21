import React, {
  useState, useEffect, ChangeEvent, FormEvent,
  useCallback, useMemo, useTransition, memo
} from 'react';
import {
  FaTrash, FaEdit, FaDiscord, FaUpload, FaTrophy, FaUsers, FaEye,
  FaSearch, FaTimes, FaBars, FaPlus, FaCheck
} from 'react-icons/fa';
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
  teamFlag?: string;
  logo?: string;
  players: Player[];
}

interface TeamForm {
  teamFullName: string;
  teamTag: string;
  logo: string;
  teamFlag: string;
}

const EMPTY_FORM: TeamForm = { teamFullName: '', teamTag: '', logo: '', teamFlag: '' };
const EMPTY_PLAYER: Player = { playerName: '', playerId: '', photo: '' };

// ── Design system ────────────────────────────────────────────────────────────
// PERF NOTES (read before touching this file again):
// - No setInterval/rAF loops anywhere in this file. A 30fps timecode ticker
//   used to live in TopNav and forced a full re-render of the nav (and
//   anything under it) 30x/second, forever — that was the actual jank
//   source, not CSS. Do not reintroduce a polling/ticking clock here.
// - No CSS keyframe animations. No continuous transitions. Hover states use
//   instant property swaps (no `transition`) so there's zero animation work
//   on interaction, matching the "no animation" requirement.
// - The nav uses a solid background instead of backdrop-filter: blur(). A
//   blurred sticky element repaints its blur every scroll frame — solid bg
//   is functionally identical here (nothing meaningful scrolls under it)
//   and costs nothing.
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

.tm-root * { box-sizing: border-box; }
.tm-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
.tm-orb { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif !important; }
.tm-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

.tm-hex {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse 80% 40% at 50% 0%, rgba(225,29,46,0.07), transparent);
}

/* ── Top navbar ── */
.tm-nav {
  position: sticky; top: 0; z-index: 60;
  background: #0E0F12;
  border-bottom: 1px solid #24262B;
}
.tm-nav-inner {
  max-width: 1280px; margin: 0 auto; padding: 0 20px;
  display: flex; align-items: center; height: 64px; gap: 18px;
}
.tm-nav-brand { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.tm-nav-links { display: flex; align-items: center; gap: 4px; }
.tm-nav-link {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; color: #93959C; text-decoration: none; cursor: pointer;
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  border: 1px solid transparent; background: none; white-space: nowrap;
}
.tm-nav-link:hover { color: #F4F2EE; }
.tm-nav-link.active { color: #E11D2E; border-bottom: 2px solid #E11D2E; padding-bottom: 6px; }
.tm-nav-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.tm-nav-user {
  display: flex; align-items: center; gap: 8px; padding: 5px 12px 5px 6px;
  border: 1px solid #24262B;
}
.tm-nav-avatar {
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  background: rgba(225,29,46,0.15); border: 1px solid rgba(225,29,46,0.4);
  display: flex; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; color: #E11D2E;
}
.tm-nav-burger {
  display: none; background: none; border: 1px solid #24262B; color: #F4F2EE;
  width: 38px; height: 38px; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
}
.tm-nav-mobile-panel {
  display: none; flex-direction: column; padding: 10px 20px 16px; gap: 2px;
  border-bottom: 1px solid #24262B; background: #0B0C0E;
}
.tm-nav-mobile-panel.open { display: flex; }

@media (max-width: 860px) {
  .tm-nav-links { display: none; }
  .tm-nav-burger { display: flex; }
  .tm-nav-user span { display: none; }
}

/* ── Tags / badges ── */
.tm-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #93959C; letter-spacing: 0.22em; text-transform: uppercase; }
.tm-eyebrow-dot { width: 6px; height: 6px; background: #E11D2E; flex-shrink: 0; }
.tm-pill { display: inline-flex; align-items: center; background: rgba(225,29,46,0.08); border: 1px solid rgba(225,29,46,0.3); color: #E11D2E; font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 3px 9px; letter-spacing: 0.05em; font-weight: 700; }

/* ── Buttons ── */
.tm-btn-primary { display: inline-flex; align-items: center; gap: 8px; background: #E11D2E; color: #fff; border: 1px solid #E11D2E; font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.02em; padding: 12px 22px; cursor: pointer; }
.tm-btn-primary:hover { background: #F4F2EE; color: #0B0C0E; border-color: #F4F2EE; }
.tm-btn-ghost { background: transparent; color: #93959C; border: 1px solid #24262B; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; padding: 10px 18px; cursor: pointer; }
.tm-btn-ghost:hover { border-color: #E11D2E; color: #F4F2EE; }
.tm-btn-outline { background: transparent; color: #E11D2E; border: 1px solid rgba(225,29,46,0.35); font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; padding: 9px 16px; cursor: pointer; }
.tm-btn-outline:hover { background: rgba(225,29,46,0.1); }
.tm-icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #131418; border: 1px solid #24262B; color: #93959C; cursor: pointer; flex-shrink: 0; }
.tm-icon-btn:hover { border-color: #F4F2EE; color: #F4F2EE; }
.tm-icon-btn.danger:hover { border-color: #E11D2E; color: #E11D2E; }
.tm-icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* ── Inputs ── */
.tm-input { width: 100%; padding: 11px 13px; background: #0B0C0E; border: 1px solid #24262B; color: #F4F2EE; font-family: 'Inter', sans-serif; font-size: 14px; outline: none; }
.tm-input::placeholder { color: #55565C; }
.tm-input:focus { border-color: #E11D2E; }

/* ── Page layout ── */
.tm-page { max-width: 1280px; margin: 0 auto; padding: 36px 20px 64px; position: relative; z-index: 1; }
.tm-header-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
.tm-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.tm-search-wrap { position: relative; flex: 1; min-width: 220px; max-width: 380px; }
.tm-search-ic { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #55565C; font-size: 12px; pointer-events: none; }
.tm-stats { display: flex; gap: 10px; margin-left: auto; flex-wrap: wrap; }
.tm-stat { background: #131418; border: 1px solid #24262B; padding: 8px 14px; display: flex; align-items: baseline; gap: 7px; }

/* ── Team card grid ── */
.tm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.tm-card { position: relative; background: #131418; border: 1px solid #24262B; padding: 18px; cursor: pointer; }
.tm-card:hover { border-color: rgba(225,29,46,0.4); }
.tm-card-top { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.tm-card-logo { width: 48px; height: 48px; object-fit: cover; border: 1px solid #24262B; flex-shrink: 0; }
.tm-card-logo-ph { width: 48px; height: 48px; flex-shrink: 0; background: #0B0C0E; border: 1px solid #24262B; display: flex; align-items: center; justify-content: center; }
.tm-card-actions { position: absolute; top: 14px; right: 14px; display: flex; gap: 6px; }
.tm-card-tag { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: #E11D2E; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px; }
.tm-card-flag { width: 18px; height: 13px; object-fit: cover; border: 1px solid #24262B; }
.tm-card-name { font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 700; color: #F4F2EE; text-transform: uppercase; line-height: 1.25; margin-top: 4px; }
.tm-card-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid #24262B; }
.tm-card-count { display: flex; align-items: center; gap: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #93959C; }
.tm-card-view { font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; color: #55565C; }
.tm-card:hover .tm-card-view { color: #E11D2E; }

/* ── Modals ── */
.tm-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
.tm-modal-box { width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; background: #0B0C0E; border: 1px solid rgba(225,29,46,0.35); box-shadow: 0 40px 80px rgba(0,0,0,0.7); }
.tm-modal-box::-webkit-scrollbar { width: 5px; }
.tm-modal-box::-webkit-scrollbar-thumb { background: rgba(225,29,46,0.35); }
.tm-modal-hdr { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 14px; border-bottom: 1px solid #24262B; position: sticky; top: 0; background: #0B0C0E; z-index: 2; }
.tm-modal-body { padding: 20px 22px 22px; }

/* ── Player rows (detail modal) ── */
.tm-player-row { display: flex; align-items: center; gap: 10px; padding: 9px 10px; background: #131418; border: 1px solid #24262B; margin-bottom: 6px; }
.tm-player-row:hover { border-color: rgba(225,29,46,0.3); }
.tm-player-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #24262B; flex-shrink: 0; }
.tm-player-avatar-ph { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; background: #0B0C0E; border: 1px solid #24262B; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #E11D2E; font-weight: 700; }
.tm-checkbox { width: 17px; height: 17px; flex-shrink: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.tm-checkbox.checked { background: #E11D2E; border: 1px solid #E11D2E; }
.tm-checkbox.unchecked { background: #0B0C0E; border: 1px solid #24262B; }
.tm-checkbox.unchecked:hover { border-color: #E11D2E; }
.tm-player-info { flex: 1; min-width: 0; }
.tm-player-name { font-size: 13px; color: #F4F2EE; font-weight: 600; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tm-player-id { font-size: 10px; color: #55565C; font-family: 'JetBrains Mono', monospace; }

/* ── Player form row (create/edit modal) ── */
.tm-player-form-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; background: #131418; border: 1px solid #24262B; padding: 10px 12px; margin-bottom: 8px; }

/* ── Empty state ── */
.tm-empty { text-align: center; padding: 72px 24px; border: 1px dashed #24262B; }
.tm-empty-icon-wrap { width: 68px; height: 68px; border-radius: 50%; margin: 0 auto 20px; background: rgba(225,29,46,0.08); border: 1px solid rgba(225,29,46,0.3); display: flex; align-items: center; justify-content: center; }

@media (max-width: 560px) {
  .tm-header-row { align-items: flex-start; }
  .tm-header-row .tm-btn-primary { width: 100%; justify-content: center; }
  .tm-stats { width: 100%; margin-left: 0; }
  .tm-stat { flex: 1; justify-content: center; }
  .tm-grid { grid-template-columns: 1fr; }
}
`;

// ── Top navigation ───────────────────────────────────────────────────────────
// No ticking clock, no interval, no animation. Pure static render — only
// re-renders when `user` changes or the mobile menu is toggled.
const TopNav: React.FC<{ user: any }> = memo(({ user }) => {
  const [open, setOpen] = useState(false);

  const links = [
    { label: 'TOURNAMENTS', icon: <FaTrophy size={13} />, onClick: () => window.location.href = '/dashboard' },
    { label: 'TEAMS', icon: <FaUsers size={13} />, active: true },
    { label: 'HUD', icon: <FaEye size={13} />, onClick: () => window.open('/displayhud', '_blank', 'noopener,noreferrer') },
    { label: 'HELP', icon: <FaDiscord size={13} />, onClick: () => window.open('https://discord.com/channels/623776491682922526/1426117227257663558', '_blank') },
  ];

  return (
    <nav className="tm-nav">
      <div className="tm-nav-inner">
        <div className="tm-nav-brand">
          <img src="./logo.avif" alt="logo" width={30} height={30} style={{ width: 30, height: 30, objectFit: 'contain' }} />
          <span className="tm-orb" style={{ fontSize: 14, fontWeight: 700, color: '#F4F2EE', letterSpacing: '0.02em' }}>TEAM OPS</span>
        </div>

        <div className="tm-nav-links">
          {links.map(link => (
            <button key={link.label} className={`tm-nav-link ${link.active ? 'active' : ''}`} onClick={link.onClick}>
              {link.icon} {link.label}
            </button>
          ))}
        </div>

        <div className="tm-nav-right">
          {user && (
            <div className="tm-nav-user">
              <div className="tm-nav-avatar">{(user.username || '?').slice(0, 2).toUpperCase()}</div>
              <span className="tm-mono" style={{ fontSize: 11, color: '#F4F2EE' }}>{user.username}</span>
            </div>
          )}
          <button className="tm-nav-burger" onClick={() => setOpen(v => !v)} aria-label="Toggle menu">
            {open ? <FaTimes size={15} /> : <FaBars size={15} />}
          </button>
        </div>
      </div>

      <div className={`tm-nav-mobile-panel ${open ? 'open' : ''}`}>
        {links.map(link => (
          <button
            key={link.label}
            className={`tm-nav-link ${link.active ? 'active' : ''}`}
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
    <div className="tm-search-wrap">
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

// ── TeamCard ──────────────────────────────────────────────────────────────────
const TeamCard = memo(({
  team, onOpenDetail, onEdit, onDelete, isDeleting,
}: {
  team: Team;
  onOpenDetail: (team: Team) => void;
  onEdit: (team: Team) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) => (
  <div className="tm-card" onClick={() => onOpenDetail(team)}>
    <div className="tm-card-actions" onClick={e => e.stopPropagation()}>
      <button className="tm-icon-btn" onClick={() => onEdit(team)} aria-label="Edit team"><FaEdit size={12} /></button>
      <button className="tm-icon-btn danger" onClick={() => onDelete(team._id)} disabled={isDeleting} aria-label="Delete team"><FaTrash size={12} /></button>
    </div>

    <div className="tm-card-top">
      {team.logo
        ? <img src={team.logo} alt={team.teamFullName} className="tm-card-logo" width={48} height={48} loading="lazy" decoding="async" onError={e => e.currentTarget.src = './logo.png'} />
        : <div className="tm-card-logo-ph"><FaUsers size={18} style={{ color: '#E11D2E', opacity: 0.5 }} /></div>}
      <div style={{ minWidth: 0, paddingRight: 60 }}>
        <div className="tm-card-tag">
          [{team.teamTag}]
          {team.teamFlag && <img src={team.teamFlag} alt="" className="tm-card-flag" width={18} height={13} loading="lazy" decoding="async" onError={e => e.currentTarget.style.display = 'none'} />}
        </div>
        <div className="tm-card-name">{team.teamFullName}</div>
      </div>
    </div>

    <div className="tm-card-foot">
      <span className="tm-card-count"><FaUsers size={10} /> {team.players.length} player{team.players.length === 1 ? '' : 's'}</span>
      <span className="tm-card-view">View roster →</span>
    </div>
  </div>
));

// ── Detail modal: view + prune roster ───────────────────────────────────────
const DetailModal: React.FC<{
  team: Team;
  onClose: () => void;
  onEdit: (team: Team) => void;
  onDeletePlayer: (teamId: string, playerId: string) => Promise<void>;
  onDeleteSelectedPlayers: (teamId: string, playerIds: string[]) => Promise<void>;
  deletingPlayerIds: Set<string>;
}> = ({ team, onClose, onEdit, onDeletePlayer, onDeleteSelectedPlayers, deletingPlayerIds }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected player(s)?`)) return;
    try { await onDeleteSelectedPlayers(team._id, Array.from(selected)); setSelected(new Set()); } catch {}
  };

  return (
    <div className="tm-modal-overlay" onClick={onClose}>
      <div className="tm-modal-box" onClick={e => e.stopPropagation()}>
        <div className="tm-modal-hdr">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {team.logo
              ? <img src={team.logo} alt="" width={36} height={36} style={{ width: 36, height: 36, objectFit: 'cover', border: '1px solid #24262B', flexShrink: 0 }} />
              : <div style={{ width: 36, height: 36, background: '#131418', border: '1px solid #24262B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FaUsers size={15} style={{ color: '#E11D2E' }} /></div>}
            <div style={{ minWidth: 0 }}>
              <div className="tm-card-tag" style={{ fontSize: 10 }}>[{team.teamTag}]</div>
              <div className="tm-orb" style={{ fontSize: 15, fontWeight: 700, color: '#F4F2EE', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.teamFullName}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 30, height: 30, background: 'transparent', border: '1px solid #24262B', color: '#93959C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FaTimes size={13} />
          </button>
        </div>

        <div className="tm-modal-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
            <span className="tm-mono" style={{ fontSize: 9, color: '#55565C', letterSpacing: '2px' }}>ROSTER — {team.players.length}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {selected.size > 0 && (
                <button className="tm-btn-outline" style={{ fontSize: 11, padding: '6px 12px' }} onClick={handleDeleteSelected}>
                  Delete {selected.size} selected
                </button>
              )}
              <button className="tm-btn-outline" style={{ fontSize: 11, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => { onEdit(team); onClose(); }}>
                <FaEdit size={11} /> Edit team & players
              </button>
            </div>
          </div>

          {team.players.length === 0 ? (
            <p className="tm-mono" style={{ color: '#55565C', fontSize: 12, padding: '20px 0', letterSpacing: 1, textAlign: 'center' }}>NO PLAYERS ADDED YET</p>
          ) : (
            team.players.map(player => {
              const initials = player.playerName?.slice(0, 2).toUpperCase() || '??';
              const isSelected = !!player._id && selected.has(player._id);
              return (
                <div key={player._id || player.playerName} className="tm-player-row">
                  <div className={`tm-checkbox ${isSelected ? 'checked' : 'unchecked'}`} onClick={() => player._id && toggle(player._id)}>
                    {isSelected && <FaCheck size={8} color="#fff" />}
                  </div>
                  {player.photo
                    ? <img src={player.photo} alt={player.playerName} className="tm-player-avatar" width={32} height={32} loading="lazy" decoding="async" onError={e => e.currentTarget.src = './def_char.png'} />
                    : <div className="tm-player-avatar-ph">{initials}</div>}
                  <div className="tm-player-info">
                    <div className="tm-player-name">{player.playerName}</div>
                    {player.playerId && <div className="tm-player-id">#{player.playerId}</div>}
                  </div>
                  {player._id && (
                    <button className="tm-icon-btn danger" style={{ width: 28, height: 28 }} onClick={() => onDeletePlayer(team._id, player._id!)} disabled={deletingPlayerIds.has(player._id)} aria-label="Delete player">
                      <FaTrash size={10} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ── FormFields (shared between create + edit) ─────────────────────────────────
const FormFields = memo(({
  form, playersForm, editingTeamId,
  handleTeamInputChange, handlePlayerChange,
  addPlayerInput, removePlayerInput,
  handleSubmit, onCancel,
  handleLogoUpload, handleFlagUpload, handlePlayerPhotoUpload,
}: {
  form: TeamForm;
  playersForm: Player[];
  editingTeamId: string | null;
  handleTeamInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handlePlayerChange: (index: number, e: ChangeEvent<HTMLInputElement>) => void;
  addPlayerInput: () => void;
  removePlayerInput: (index: number) => void;
  handleSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  handleLogoUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  handleFlagUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  handlePlayerPhotoUpload: (index: number, e: ChangeEvent<HTMLInputElement>) => void;
}) => {
  const idPrefix = editingTeamId ? 'edit' : 'new';
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
        <input type="text" name="teamFullName" placeholder="Team full name"
          value={form.teamFullName} onChange={handleTeamInputChange} required autoFocus
          className="tm-input" />
        <input type="text" name="teamTag" placeholder="TAG"
          value={form.teamTag} onChange={handleTeamInputChange} required
          className="tm-input" style={{ width: 100 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label htmlFor={`${idPrefix}-logo`} className="tm-input" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 'auto', flex: 1 }}>
            <FaUpload size={12} style={{ color: '#E11D2E', flexShrink: 0 }} />
            <span style={{ color: '#93959C', fontSize: 13 }}>Team logo</span>
          </label>
          <input id={`${idPrefix}-logo`} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
          {form.logo && <img src={form.logo} alt="Logo" width={40} height={40} style={{ width: 40, height: 40, objectFit: 'contain', border: '1px solid #24262B', flexShrink: 0 }} loading="lazy" decoding="async" onError={e => (e.currentTarget.src = './logo.png')} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label htmlFor={`${idPrefix}-flag`} className="tm-input" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 'auto', flex: 1 }}>
            <FaUpload size={12} style={{ color: '#E11D2E', flexShrink: 0 }} />
            <span style={{ color: '#93959C', fontSize: 13 }}>Team flag</span>
          </label>
          <input id={`${idPrefix}-flag`} type="file" accept="image/*" onChange={handleFlagUpload} style={{ display: 'none' }} />
          {form.teamFlag && <img src={form.teamFlag} alt="Flag" width={40} height={40} style={{ width: 40, height: 40, objectFit: 'cover', border: '1px solid #24262B', flexShrink: 0 }} loading="lazy" decoding="async" onError={e => (e.currentTarget.src = './def_flag.avif')} />}
        </div>
      </div>

      <div className="tm-mono" style={{ fontSize: 9, color: '#E11D2E', letterSpacing: '2px', paddingTop: 4 }}>PLAYERS</div>

      {playersForm.map((player, index) => (
        <div key={player._id || index} className="tm-player-form-row">
          <input type="text" name="playerName" placeholder="Player name"
            value={player.playerName} onChange={e => handlePlayerChange(index, e)} required
            className="tm-input" style={{ flex: '1 1 150px', width: 'auto' }} />
          <input type="text" name="playerId" placeholder="ID / IGN"
            value={player.playerId} onChange={e => handlePlayerChange(index, e)}
            className="tm-input" style={{ flex: '0 0 100px', width: 100 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor={`${idPrefix}-photo-${index}`} className="tm-input" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', width: 'auto', padding: '10px 12px', whiteSpace: 'nowrap' }}>
              <FaUpload size={11} style={{ color: '#E11D2E', flexShrink: 0 }} />
              Photo
            </label>
            <input id={`${idPrefix}-photo-${index}`} type="file" accept="image/*" onChange={e => handlePlayerPhotoUpload(index, e)} style={{ display: 'none' }} />
            {player.photo && <img src={player.photo} alt="Preview" width={32} height={32} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid #24262B' }} loading="lazy" decoding="async" onError={e => e.currentTarget.src = './def_char.png'} />}
            {playersForm.length > 1 && (
              <button type="button" onClick={() => removePlayerInput(index)} className="tm-icon-btn danger" aria-label="Remove player"><FaTrash size={11} /></button>
            )}
          </div>
        </div>
      ))}

      <button type="button" onClick={addPlayerInput} className="tm-btn-outline" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <FaPlus size={10} /> Add player
      </button>

      <div style={{ display: 'flex', gap: 10, paddingTop: 6, borderTop: '1px solid #24262B', marginTop: 2 }}>
        <button type="button" onClick={onCancel} className="tm-btn-ghost">Cancel</button>
        <button type="submit" className="tm-btn-primary">{editingTeamId ? 'SAVE CHANGES' : 'CREATE TEAM'}</button>
      </div>
    </form>
  );
});

// ── Create/Edit modal ────────────────────────────────────────────────────────
const FormModal: React.FC<{
  editingTeam: Team | null;
  onClose: () => void;
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
}> = ({ editingTeam, onClose, setTeams }) => {
  const [form, setForm] = useState<TeamForm>(editingTeam ? {
    teamFullName: editingTeam.teamFullName,
    teamTag: editingTeam.teamTag,
    logo: editingTeam.logo || '',
    teamFlag: editingTeam.teamFlag || '',
  } : EMPTY_FORM);
  const [playersForm, setPlayersForm] = useState<Player[]>(
    editingTeam && editingTeam.players.length ? editingTeam.players : [{ ...EMPTY_PLAYER }]
  );

  const handleTeamInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handlePlayerChange = useCallback((index: number, e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPlayersForm(prev => { const c = [...prev]; c[index] = { ...c[index], [name]: value }; return c; });
  }, []);

  const addPlayerInput = useCallback(() => setPlayersForm(prev => [...prev, { ...EMPTY_PLAYER }]), []);
  const removePlayerInput = useCallback((index: number) => setPlayersForm(prev => prev.filter((_, i) => i !== index)), []);

  const handleLogoUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const url = await uploadToCloudinary(file, 'teams/logos', 'team_logo'); setForm(p => ({ ...p, logo: url })); }
    catch { alert('Upload failed'); }
  }, []);

  const handleFlagUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const url = await uploadToCloudinary(file, 'teams/flags', 'team_flag'); setForm(prev => ({ ...prev, teamFlag: url })); }
    catch { alert('Flag upload failed'); }
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
      if (editingTeam) {
        const res = await api.put(`/teams/${editingTeam._id}`, payload);
        setTeams(prev => prev.map(t => t._id === editingTeam._id ? res.data : t));
      } else {
        const res = await api.post('/teams', payload);
        setTeams(prev => [...prev, res.data]);
      }
      onClose();
    } catch { alert('Failed to save team'); }
  }, [form, playersForm, editingTeam, setTeams, onClose]);

  return (
    <div className="tm-modal-overlay" onClick={onClose}>
      <div className="tm-modal-box" onClick={e => e.stopPropagation()}>
        <div className="tm-modal-hdr">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="tm-pill">{editingTeam ? 'EDIT' : 'NEW'}</span>
            <span className="tm-orb" style={{ color: '#F4F2EE', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>
              {editingTeam ? 'Edit team' : 'Create team'}
            </span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 30, height: 30, background: 'transparent', border: '1px solid #24262B', color: '#93959C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaTimes size={13} />
          </button>
        </div>
        <div className="tm-modal-body">
          <FormFields
            form={form} playersForm={playersForm} editingTeamId={editingTeam?._id ?? null}
            handleTeamInputChange={handleTeamInputChange} handlePlayerChange={handlePlayerChange}
            addPlayerInput={addPlayerInput} removePlayerInput={removePlayerInput}
            handleSubmit={handleSubmit} onCancel={onClose}
            handleLogoUpload={handleLogoUpload} handleFlagUpload={handleFlagUpload}
            handlePlayerPhotoUpload={handlePlayerPhotoUpload}
          />
        </div>
      </div>
    </div>
  );
};

// ── Teams root ────────────────────────────────────────────────────────────────
const Teams: React.FC = () => {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formTeam, setFormTeam] = useState<Team | 'new' | null>(null);
  const [viewingTeamId, setViewingTeamId] = useState<string | null>(null);

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
    return teams.filter(t => t.teamFullName.toLowerCase().includes(q) || t.teamTag.toLowerCase().includes(q));
  }, [teams, searchQuery]);

  const viewingTeam = useMemo(() => teams.find(t => t._id === viewingTeamId) || null, [teams, viewingTeamId]);

  // Stats used to be recomputed inline in JSX on every render of the whole
  // page (including on every keystroke in search). Memoized so they only
  // recompute when `teams` actually changes.
  const teamStats = useMemo(() => {
    const totalPlayers = teams.reduce((s, t) => s + t.players.length, 0);
    return {
      totalTeams: teams.length,
      totalPlayers,
      avgSize: teams.length ? (totalPlayers / teams.length).toFixed(1) : '—',
    };
  }, [teams]);

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
    if (deletingPlayerIdsRef.current.has(playerId)) return;
    setDeletingPlayerIds(prev => new Set(prev).add(playerId));
    try {
      await api.delete(`/teams/${teamId}/players/${playerId}`);
      setTeams(prev => prev.map(t => t._id === teamId ? { ...t, players: t.players.filter(p => p._id !== playerId) } : t));
    } catch { alert('Failed to delete player'); }
    finally { setDeletingPlayerIds(prev => { const c = new Set(prev); c.delete(playerId); return c; }); }
  }, []);

  const deleteSelectedPlayers = useCallback(async (teamId: string, playerIds: string[]) => {
    try {
      await api.delete(`/teams/${teamId}/players`, { data: { playerIds } });
      setTeams(prev => prev.map(t => t._id === teamId ? { ...t, players: t.players.filter(p => !playerIds.includes(p._id!)) } : t));
    } catch { alert('Failed to delete selected players'); throw new Error('delete failed'); }
  }, []);

  const openNewForm = useCallback(() => setFormTeam('new'), []);
  const closeForm = useCallback(() => setFormTeam(null), []);
  const closeDetail = useCallback(() => setViewingTeamId(null), []);
  const openDetail = useCallback((t2: Team) => setViewingTeamId(t2._id), []);
  const openEdit = useCallback((t2: Team) => setFormTeam(t2), []);

  return (
    <div className="tm-root" style={{ minHeight: '100vh', background: '#0B0C0E' }}>
      <style>{STYLES}</style>
      <div className="tm-hex" />

      <TopNav user={user} />

      <div className="tm-page">
        <div className="tm-header-row">
          <div>
            <div className="tm-eyebrow" style={{ marginBottom: 8 }}>
              <span className="tm-eyebrow-dot" /> TEAM MANAGEMENT
            </div>
            <h1 className="tm-orb" style={{ fontSize: 28, fontWeight: 800, color: '#F4F2EE', letterSpacing: '-0.01em', marginBottom: 6, textTransform: 'uppercase' }}>
              {t('teams.header.title')}
            </h1>
            <p style={{ color: '#93959C', fontSize: 14, maxWidth: 480 }}>{t('teams.header.subtitle')}</p>
          </div>
          <button className="tm-btn-primary" onClick={openNewForm}>
            <FaPlus size={12} /> NEW TEAM
          </button>
        </div>

        <div className="tm-toolbar">
          <SearchInput onSearchChange={setSearchQuery} />
          <span className="tm-mono" style={{ fontSize: 11, color: '#55565C' }}>{visibleTeams.length} / {teams.length} shown</span>
          <div className="tm-stats">
            <div className="tm-stat">
              <span className="tm-orb" style={{ fontSize: 15, fontWeight: 800, color: '#E11D2E' }}>{teamStats.totalTeams}</span>
              <span className="tm-mono" style={{ fontSize: 9, color: '#55565C', letterSpacing: '1px' }}>TEAMS</span>
            </div>
            <div className="tm-stat">
              <span className="tm-orb" style={{ fontSize: 15, fontWeight: 800, color: '#E11D2E' }}>{teamStats.totalPlayers}</span>
              <span className="tm-mono" style={{ fontSize: 9, color: '#55565C', letterSpacing: '1px' }}>PLAYERS</span>
            </div>
            <div className="tm-stat">
              <span className="tm-orb" style={{ fontSize: 15, fontWeight: 800, color: '#E11D2E' }}>{teamStats.avgSize}</span>
              <span className="tm-mono" style={{ fontSize: 9, color: '#55565C', letterSpacing: '1px' }}>AVG SIZE</span>
            </div>
          </div>
        </div>

        {visibleTeams.length === 0 ? (
          <div className="tm-empty">
            <div className="tm-empty-icon-wrap"><FaUsers size={26} style={{ color: '#E11D2E', opacity: 0.7 }} /></div>
            <h3 className="tm-orb" style={{ fontSize: 16, color: '#F4F2EE', marginBottom: 8, textTransform: 'uppercase' }}>
              {teams.length === 0 ? t('teams.messages.noTeams') : 'No teams match your search'}
            </h3>
            <p style={{ color: '#93959C', marginBottom: 24, fontSize: 14 }}>
              {teams.length === 0 ? t('teams.messages.createFirst') : 'Try a different name or tag.'}
            </p>
            {teams.length === 0 && (
              <button className="tm-btn-primary" style={{ margin: '0 auto' }} onClick={openNewForm}>
                <FaPlus size={12} /> CREATE TEAM
              </button>
            )}
          </div>
        ) : (
          <div className="tm-grid">
            {visibleTeams.map(team => (
              <TeamCard
                key={team._id}
                team={team}
                onOpenDetail={openDetail}
                onEdit={openEdit}
                onDelete={deleteTeam}
                isDeleting={deletingTeamIds.has(team._id)}
              />
            ))}
          </div>
        )}
      </div>

      {formTeam && (
        <FormModal
          editingTeam={formTeam === 'new' ? null : formTeam}
          onClose={closeForm}
          setTeams={setTeams}
        />
      )}

      {viewingTeam && (
        <DetailModal
          team={viewingTeam}
          onClose={closeDetail}
          onEdit={openEdit}
          onDeletePlayer={deletePlayer}
          onDeleteSelectedPlayers={deleteSelectedPlayers}
          deletingPlayerIds={deletingPlayerIds}
        />
      )}
    </div>
  );
};

export default Teams;