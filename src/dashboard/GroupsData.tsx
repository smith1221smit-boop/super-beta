import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FaTrash, FaEdit, FaTimes, FaSearch, FaChevronDown, FaChevronUp, FaUsers, FaPlus, FaCheck, FaLayerGroup, FaSpinner } from "react-icons/fa";
import { useParams } from "react-router-dom";
import api from "../login/api.tsx";

interface Team {
  _id: string;
  teamFullName: string;
  teamTag: string;
  logo?: string;
}

interface Slot {
  _id: string;
  slot: number;
  team: Team;
}

interface Group {
  _id: string;
  groupName: string;
  slots?: Slot[];
}

interface SelectedTeam {
  teamId: string;
  slot: number | null;
}

interface GroupProps {
  onSelectionChange?: (groupIds: string[]) => void;
}

export interface GroupRef {
  openForm: () => void;
}

// ── Styles ────────────────────────────────────────────────────────────────────
// PERF NOTES:
// - Initial data (teams + groups) is fetched once on mount, in parallel via
//   Promise.all, regardless of whether the panel is open — so by the time
//   openForm() fires, the data is already sitting in state. openForm() no
//   longer blocks on a network round trip.
// - sessionStorage is read synchronously on mount to paint stale-but-fast
//   content immediately (stale-while-revalidate), then replaced once the
//   network response lands. Both teams and groups are cached now (only
//   groups were cached before).
// - Every network call carries an AbortController signal and is cancelled
//   on unmount / tournament change, so a slow response from a previous
//   tournament can never clobber the current one.
// - Team cards, slot rows and group cards are extracted into their own
//   React.memo'd components. Selecting one team previously re-rendered the
//   entire grid; now only the affected card re-renders.
// - Hover states use color/border/opacity transitions only (no glow
//   box-shadow animation, no transform-on-hover, no blur-on-scroll) —
//   cheap, compositor-friendly, and consistent with the broadcast site's
//   "no animation work on interaction" rule.
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');

.gx-root *, .gx-root *::before, .gx-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
.gx-root {
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --gx-bg: #0B0C0E;
  --gx-panel: #131418;
  --gx-panel-raised: #17181D;
  --gx-line: #24262B;
  --gx-text: #F4F2EE;
  --gx-text-muted: #93959C;
  --gx-text-dim: #55565C;
  --gx-red: #E11D2E;
  --gx-red-dim: #8C1220;
}
.gx-disp { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif; }
.gx-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

/* ── Overlay ── */
.gx-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(6,6,8,0.96);
  backdrop-filter: blur(10px);
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* ── Top bar ── */
.gx-topbar {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--gx-line);
  background: rgba(0,0,0,0.55);
  flex-shrink: 0;
}
.gx-topbar-title {
  font-size: 14px; font-weight: 800;
  color: var(--gx-text); letter-spacing: 1px; text-transform: uppercase;
  flex: 1;
}
.gx-live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--gx-red); flex-shrink: 0;
}
.gx-topbar-badge {
  display: flex; align-items: center; gap: 7px;
  background: rgba(225,29,46,0.08);
  border: 1px solid rgba(225,29,46,0.35);
  color: var(--gx-red);
  font-size: 9px; font-weight: 700;
  padding: 5px 10px; letter-spacing: 1.5px;
  cursor: pointer;
}
.gx-topbar-badge.on { background: rgba(225,29,46,0.22); }

.gx-close-btn {
  width: 32px; height: 32px;
  background: transparent;
  border: 1px solid var(--gx-line);
  color: var(--gx-text-dim); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
  transition: border-color 0.1s, color 0.1s;
}
.gx-close-btn:hover { border-color: var(--gx-red); color: var(--gx-red); }

/* ── Step tabs ── */
.gx-steps {
  display: flex; gap: 0;
  border-bottom: 1px solid var(--gx-line);
  background: rgba(0,0,0,0.35);
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}
.gx-steps::-webkit-scrollbar { display: none; }

.gx-step-tab {
  display: flex; align-items: center; gap: 9px;
  padding: 12px 20px;
  border: none; background: transparent;
  color: var(--gx-text-dim); cursor: pointer;
  font-size: 10px;
  font-weight: 700; letter-spacing: 1.8px;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color 0.1s;
  flex-shrink: 0;
}
.gx-step-tab:hover { color: var(--gx-text-muted); }
.gx-step-tab.active {
  color: var(--gx-red);
  border-bottom-color: var(--gx-red);
}
.gx-step-num {
  width: 19px; height: 19px;
  background: transparent;
  border: 1px solid var(--gx-line);
  color: var(--gx-text-dim); font-size: 9px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.gx-step-tab.active .gx-step-num {
  background: var(--gx-red); border-color: var(--gx-red); color: #fff;
}
.gx-step-num.done {
  background: rgba(225,29,46,0.12);
  border-color: rgba(225,29,46,0.4);
  color: var(--gx-red);
}

/* ── Main body ── */
.gx-body { flex: 1; display: flex; overflow: hidden; position: relative; }
.gx-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* ── Panel header ── */
.gx-panel-hdr {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--gx-line);
  flex-shrink: 0;
}
.gx-panel-label {
  font-size: 9px;
  font-weight: 700; letter-spacing: 2.5px; color: var(--gx-red);
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 10px; text-transform: uppercase;
}
.gx-panel-label::before { content: ''; width: 10px; height: 2px; background: var(--gx-red); }

/* ── Search bar ── */
.gx-search-wrap { position: relative; }
.gx-search {
  width: 100%; padding: 10px 14px 10px 36px;
  background: var(--gx-bg);
  border: 1px solid var(--gx-line);
  color: var(--gx-text);
  font-family: 'Inter', sans-serif; font-size: 14px;
  outline: none;
}
.gx-search::placeholder { color: var(--gx-text-dim); }
.gx-search:focus { border-color: var(--gx-red); }
.gx-search-ic { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--gx-text-dim); font-size: 12px; pointer-events: none; }

/* ── Step 1: Team grid ── */
.gx-team-grid-wrap { flex: 1; overflow-y: auto; padding: 16px 20px; scrollbar-width: thin; scrollbar-color: rgba(225,29,46,0.2) transparent; }
.gx-team-grid-wrap::-webkit-scrollbar { width: 3px; }
.gx-team-grid-wrap::-webkit-scrollbar-thumb { background: rgba(225,29,46,0.25); }
.gx-team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
@media (max-width: 600px) { .gx-team-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; } }

/* ── Team card (with corner-bracket framing, matches broadcast HUD motif) ── */
.gx-team-card {
  position: relative; cursor: pointer;
  background: var(--gx-panel);
  border: 1px solid var(--gx-line);
  padding: 16px 10px 12px;
  display: flex; flex-direction: column;
  align-items: center; gap: 8px;
  text-align: center;
  transition: border-color 0.1s, background-color 0.1s;
  user-select: none;
}
.gx-team-card:hover { border-color: rgba(225,29,46,0.4); background: var(--gx-panel-raised); }
.gx-team-card.selected { border-color: var(--gx-red); background: rgba(225,29,46,0.06); }
.gx-team-card.selected::before,
.gx-team-card.selected::after {
  content: ''; position: absolute; width: 10px; height: 10px;
  border-top: 2px solid var(--gx-red); border-left: 2px solid var(--gx-red);
  top: -1px; left: -1px;
}
.gx-team-card.selected::after { top: auto; left: auto; bottom: -1px; right: -1px; border: none; border-bottom: 2px solid var(--gx-red); border-right: 2px solid var(--gx-red); }

.gx-card-check {
  position: absolute; top: 6px; right: 6px;
  width: 16px; height: 16px;
  background: var(--gx-red);
  display: flex; align-items: center; justify-content: center;
}
.gx-card-slot-pip {
  position: absolute; top: 6px; left: 6px;
  font-size: 8px; font-weight: 800; color: #fff;
  background: rgba(0,0,0,0.6); border: 1px solid var(--gx-red);
  padding: 1px 5px; line-height: 1.4;
}
.gx-card-logo { width: 46px; height: 46px; object-fit: cover; border: 1px solid var(--gx-line); }
.gx-card-logo-placeholder {
  width: 46px; height: 46px;
  background: var(--gx-bg); border: 1px solid var(--gx-line);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; color: var(--gx-red); opacity: 0.6;
}
.gx-card-tag { font-size: 10px; font-weight: 700; color: var(--gx-text); letter-spacing: 0.5px; }
.gx-card-name { font-size: 11px; color: var(--gx-text-dim); line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-weight: 500; }

/* ── Selection bar ── */
.gx-sel-bar { padding: 12px 20px; border-top: 1px solid var(--gx-line); background: rgba(0,0,0,0.4); display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.gx-sel-count { font-size: 9px; color: var(--gx-text-dim); letter-spacing: 1px; text-transform: uppercase; }
.gx-sel-count span { color: var(--gx-red); font-size: 14px; font-weight: 800; }
.gx-sel-chips { flex: 1; display: flex; gap: 6px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
.gx-sel-chips::-webkit-scrollbar { display: none; }
.gx-sel-chip {
  display: flex; align-items: center; gap: 5px;
  background: rgba(225,29,46,0.08); border: 1px solid rgba(225,29,46,0.35);
  padding: 3px 8px; font-size: 9px; font-weight: 700; color: var(--gx-red);
  white-space: nowrap; cursor: pointer; flex-shrink: 0;
  transition: background-color 0.1s, border-color 0.1s;
}
.gx-sel-chip:hover { background: rgba(225,29,46,0.2); }
.gx-sel-chip-x { font-size: 8px; opacity: 0.7; }

/* ── Step 2: Slots ── */
.gx-slots-wrap { flex: 1; overflow-y: auto; padding: 16px 20px; scrollbar-width: thin; scrollbar-color: rgba(225,29,46,0.2) transparent; }
.gx-slots-wrap::-webkit-scrollbar { width: 3px; }
.gx-slots-wrap::-webkit-scrollbar-thumb { background: rgba(225,29,46,0.25); }

.gx-slot-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; margin-bottom: 6px;
  background: var(--gx-panel); border: 1px solid var(--gx-line);
  transition: border-color 0.1s;
}
.gx-slot-row:hover { border-color: rgba(225,29,46,0.35); }

.gx-slot-num-badge {
  font-size: 11px; font-weight: 800; color: #fff; background: var(--gx-red);
  min-width: 30px; height: 26px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.gx-slot-logo { width: 32px; height: 32px; object-fit: cover; border: 1px solid var(--gx-line); flex-shrink: 0; }
.gx-slot-nlogo { width: 32px; height: 32px; flex-shrink: 0; background: var(--gx-bg); border: 1px solid var(--gx-line); display: flex; align-items: center; justify-content: center; font-size: 9px; color: var(--gx-red); opacity: 0.6; }
.gx-slot-info { flex: 1; min-width: 0; }
.gx-slot-tag { font-size: 11px; font-weight: 700; color: var(--gx-text); }
.gx-slot-full { font-size: 12px; color: var(--gx-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gx-slot-num-input {
  width: 50px; padding: 5px 6px; text-align: center;
  background: var(--gx-bg); border: 1px solid var(--gx-line);
  color: var(--gx-red); font-size: 11px; font-weight: 700; outline: none; flex-shrink: 0;
}
.gx-slot-num-input:focus { border-color: var(--gx-red); }
.gx-slot-rm {
  width: 24px; height: 24px; flex-shrink: 0;
  background: transparent; border: 1px solid var(--gx-line); color: var(--gx-text-dim); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 0.1s, color 0.1s;
}
.gx-slot-rm:hover { border-color: var(--gx-red); color: var(--gx-red); }

/* ── Group name input ── */
.gx-group-name-input {
  width: 100%; padding: 11px 15px;
  background: var(--gx-bg); border: 1px solid var(--gx-line);
  color: var(--gx-text); font-size: 13px; font-weight: 700; letter-spacing: 0.5px; outline: none;
}
.gx-group-name-input::placeholder { color: var(--gx-text-dim); font-family: 'Inter', sans-serif; font-weight: 400; letter-spacing: 0; }
.gx-group-name-input:focus { border-color: var(--gx-red); }

/* ── Step 3: Groups list ── */
.gx-groups-scroll { flex: 1; overflow-y: auto; padding: 16px 20px; scrollbar-width: thin; scrollbar-color: rgba(225,29,46,0.2) transparent; }
.gx-groups-scroll::-webkit-scrollbar { width: 3px; }
.gx-groups-scroll::-webkit-scrollbar-thumb { background: rgba(225,29,46,0.25); }

.gx-group-card { background: var(--gx-panel); border: 1px solid var(--gx-line); border-left: 2px solid var(--gx-red); margin-bottom: 10px; transition: border-color 0.1s; }
.gx-group-card:hover { border-color: rgba(225,29,46,0.4); border-left-color: var(--gx-red); }

.gx-group-card-hdr { display: flex; align-items: center; padding: 13px 16px; cursor: pointer; gap: 10px; }
.gx-group-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--gx-red); flex-shrink: 0; }
.gx-group-card-name { font-size: 12px; font-weight: 700; color: var(--gx-text); letter-spacing: 0.4px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; }
.gx-group-card-badge { font-size: 9px; font-weight: 700; color: var(--gx-red); background: rgba(225,29,46,0.08); border: 1px solid rgba(225,29,46,0.3); padding: 2px 8px; flex-shrink: 0; }
.gx-group-card-actions { display: flex; gap: 5px; flex-shrink: 0; }
.gx-group-ic { width: 26px; height: 26px; border: 1px solid var(--gx-line); cursor: pointer; display: flex; align-items: center; justify-content: center; background: transparent; transition: border-color 0.1s, background-color 0.1s; }
.gx-group-ic-e:hover { border-color: #3b82f6; background: rgba(59,130,246,0.12); }
.gx-group-ic-d:hover { border-color: var(--gx-red); background: rgba(225,29,46,0.12); }
.gx-chevron { color: var(--gx-text-dim); font-size: 9px; margin-left: 2px; flex-shrink: 0; }

.gx-group-teams { border-top: 1px solid var(--gx-line); background: rgba(0,0,0,0.2); padding: 8px 16px 12px; }
.gx-group-team-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-bottom: 3px; transition: background-color 0.1s; }
.gx-group-team-row:hover { background: rgba(225,29,46,0.05); }
.gx-group-slot-pill { font-size: 9px; font-weight: 800; color: #fff; background: var(--gx-red); min-width: 28px; height: 22px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.gx-group-tlogo { width: 32px; height: 32px; object-fit: cover; border: 1px solid var(--gx-line); flex-shrink: 0; }
.gx-group-tnlogo { width: 32px; height: 32px; flex-shrink: 0; background: var(--gx-bg); border: 1px solid var(--gx-line); display: flex; align-items: center; justify-content: center; font-size: 9px; color: var(--gx-red); opacity: 0.5; }
.gx-group-ttag { font-size: 11px; font-weight: 700; color: var(--gx-text-muted); }
.gx-group-tname { font-size: 12px; color: var(--gx-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Footer ── */
.gx-footer { display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-top: 1px solid var(--gx-line); background: rgba(0,0,0,0.5); flex-shrink: 0; }
.gx-btn-primary {
  flex: 1; padding: 12px 20px;
  background: var(--gx-red); color: #fff; border: 1px solid var(--gx-red);
  font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
  cursor: pointer; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: background-color 0.1s, opacity 0.1s;
}
.gx-btn-primary:hover:not(:disabled) { background: var(--gx-red-dim); border-color: var(--gx-red-dim); }
.gx-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.gx-btn-ghost {
  padding: 12px 16px; background: transparent; color: var(--gx-text-dim);
  border: 1px solid var(--gx-line); font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: border-color 0.1s, color 0.1s;
}
.gx-btn-ghost:hover { color: var(--gx-text-muted); border-color: rgba(225,29,46,0.4); }
.gx-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
.gx-spin { animation: gx-spin 0.7s linear infinite; }
@keyframes gx-spin { to { transform: rotate(360deg); } }

/* ── Empty state ── */
.gx-empty { text-align: center; padding: 40px 20px; color: var(--gx-text-dim); font-size: 9px; letter-spacing: 2px; border: 1px dashed var(--gx-line); text-transform: uppercase; }
.gx-empty-icon { font-size: 26px; margin-bottom: 12px; opacity: 0.3; color: var(--gx-red); }

/* ── Desktop layout ── */
@media (min-width: 768px) {
  .gx-body { flex-direction: row; }
  .gx-left-panel { flex: 1; display: flex; flex-direction: column; border-right: 1px solid var(--gx-line); overflow: hidden; }
  .gx-right-panel { width: 320px; display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; }
}
@media (max-width: 767px) {
  .gx-left-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .gx-right-panel { display: none; }
  .gx-body.show-groups .gx-left-panel { display: none; }
  .gx-body.show-groups .gx-right-panel { display: flex; flex: 1; flex-direction: column; }
}

/* ── Ambient scanlines — static, no animation, cheap to paint ── */
.gx-scan {
  position: fixed; inset: 0; pointer-events: none; z-index: 201; opacity: 0.02;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(225,29,46,0.6) 2px, rgba(225,29,46,0.6) 4px);
}
`;

// ── Memoized subcomponents ─────────────────────────────────────────────────────
// Extracted so selecting/editing one item only re-renders its own row/card,
// not the whole list.

const TeamCard = React.memo(function TeamCard({
  team, isSelected, slot, onToggle,
}: { team: Team; isSelected: boolean; slot: number | null | undefined; onToggle: (id: string) => void }) {
  return (
    <div className={`gx-team-card${isSelected ? ' selected' : ''}`} onClick={() => onToggle(team._id)}>
      {isSelected && (
        <div className="gx-card-check">
          <FaCheck size={8} color="#fff" />
        </div>
      )}
      {isSelected && slot != null && <span className="gx-card-slot-pip">S{slot}</span>}
      {team.logo
        ? <img src={team.logo} alt={team.teamTag} className="gx-card-logo" loading="lazy" decoding="async" />
        : <div className="gx-card-logo-placeholder">{team.teamTag?.slice(0, 2)}</div>
      }
      <span className="gx-card-tag gx-mono">{team.teamTag}</span>
      <span className="gx-card-name">{team.teamFullName}</span>
    </div>
  );
});

const SlotRow = React.memo(function SlotRow({
  team, slot, onSlotChange, onRemove,
}: { team: Team | undefined; slot: number | null; onSlotChange: (id: string, val: string) => void; onRemove: (id: string) => void }) {
  if (!team) return null;
  return (
    <div className="gx-slot-row">
      <div className="gx-slot-num-badge gx-mono">{slot ?? '?'}</div>
      {team.logo
        ? <img src={team.logo} alt="" className="gx-slot-logo" loading="lazy" decoding="async" />
        : <div className="gx-slot-nlogo gx-mono">{team.teamTag?.slice(0, 2)}</div>
      }
      <div className="gx-slot-info">
        <div className="gx-slot-tag gx-mono">{team.teamTag}</div>
        <div className="gx-slot-full">{team.teamFullName}</div>
      </div>
      <input
        type="number" min={1} value={slot ?? ""}
        onChange={e => onSlotChange(team._id, e.target.value)}
        className="gx-slot-num-input gx-mono"
        title="Slot number"
      />
      <button className="gx-slot-rm" onClick={() => onRemove(team._id)} aria-label={`Remove ${team.teamTag}`}>
        <FaTimes size={9} />
      </button>
    </div>
  );
});

const GroupCard = React.memo(function GroupCard({
  group, isExpanded, onToggleExpand, onEdit, onDelete,
}: { group: Group; isExpanded: boolean; onToggleExpand: (id: string) => void; onEdit: (g: Group) => void; onDelete: (id: string) => void }) {
  const sorted = useMemo(() => [...(group.slots || [])].sort((a, b) => a.slot - b.slot), [group.slots]);
  return (
    <div className="gx-group-card">
      <div className="gx-group-card-hdr" onClick={() => onToggleExpand(group._id)}>
        <span className="gx-group-dot" />
        <span className="gx-group-card-name">{group.groupName}</span>
        <span className="gx-group-card-badge gx-mono">{sorted.length}T</span>
        <div className="gx-group-card-actions">
          <button className="gx-group-ic gx-group-ic-e"
            onClick={e => { e.stopPropagation(); onEdit(group); }}
            onMouseDown={e => e.preventDefault()}
            aria-label="Edit group">
            <FaEdit color="#93959C" size={11} />
          </button>
          <button className="gx-group-ic gx-group-ic-d"
            onClick={e => { e.stopPropagation(); onDelete(group._id); }}
            onMouseDown={e => e.preventDefault()}
            aria-label="Delete group">
            <FaTrash color="#93959C" size={11} />
          </button>
        </div>
        <span className="gx-chevron">{isExpanded ? <FaChevronUp size={9} /> : <FaChevronDown size={9} />}</span>
      </div>
      {isExpanded && (
        <div className="gx-group-teams">
          {sorted.length === 0 ? (
            <div className="gx-empty" style={{ padding: '12px' }}>No teams assigned</div>
          ) : sorted.map((slot, idx) => (
            <React.Fragment key={slot._id}>
              <div className="gx-group-team-row">
                <div className="gx-group-slot-pill gx-mono">S{slot.slot}</div>
                {slot.team?.logo
                  ? <img src={slot.team.logo} alt="" className="gx-group-tlogo" loading="lazy" decoding="async" />
                  : <div className="gx-group-tnlogo gx-mono">{slot.team?.teamTag?.slice(0, 2)}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="gx-group-ttag gx-mono">{slot.team?.teamTag || '—'}</div>
                  <div className="gx-group-tname">{slot.team?.teamFullName || 'Unknown'}</div>
                </div>
              </div>
              {idx < sorted.length - 1 && <div style={{ height: 1, background: 'rgba(225,29,46,0.08)', margin: '0 4px' }} />}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
});

// ── Main Component ─────────────────────────────────────────────────────────────
const Group = React.forwardRef<GroupRef, GroupProps>(({ onSelectionChange }, ref) => {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  const [showForm, setShowForm]       = useState(false);
  const [teams, setTeams]             = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<SelectedTeam[]>([]);
  const groupNameRef                  = useRef<HTMLInputElement>(null);
  const [groups, setGroups]           = useState<Group[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm]   = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep]   = useState<1 | 2 | 3>(1);
  const [mobileShowGroups, setMobileShowGroups] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false); // synchronous guard, closes the double-click race that state alone can't

  const GROUPS_CACHE_KEY = `groups_cache_${tournamentId}`;
  const TEAMS_CACHE_KEY = `teams_cache`;

  React.useImperativeHandle(ref, () => ({
    openForm: () => {
      // Data is already prefetched on mount — just reset and show.
      setShowForm(true);
      clearForm();
      setActiveStep(1);
    }
  }));

  const isCanceled = (err: any) => err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED';

  // Fetch teams + groups together, in parallel, so opening the panel never waits.
  const loadInitialData = useCallback(async (signal: AbortSignal, forceRefresh = false) => {
    if (!forceRefresh) {
      const cachedGroups = sessionStorage.getItem(GROUPS_CACHE_KEY);
      const cachedTeams = sessionStorage.getItem(TEAMS_CACHE_KEY);
      if (cachedGroups) { try { setGroups(JSON.parse(cachedGroups)); } catch {} }
      if (cachedTeams) { try { setTeams(JSON.parse(cachedTeams)); } catch {} }
    }
    try {
      const [groupsRes, teamsRes] = await Promise.all([
        api.get(`/tournaments/${tournamentId}/groups`, { signal }),
        api.get("/teams", { signal }),
      ]);
      setGroups(groupsRes.data);
      setTeams(teamsRes.data);
      sessionStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify(groupsRes.data));
      sessionStorage.setItem(TEAMS_CACHE_KEY, JSON.stringify(teamsRes.data));
    } catch (err: any) {
      if (isCanceled(err)) return;
      console.error("Failed to load groups/teams:", err);
      if (err.response?.status === 401) alert("Unauthorized. Please login.");
    }
  }, [tournamentId, GROUPS_CACHE_KEY]);

  useEffect(() => {
    const controller = new AbortController();
    loadInitialData(controller.signal);
    return () => controller.abort();
  }, [loadInitialData]);

  const clearForm = () => {
    if (groupNameRef.current) groupNameRef.current.value = "";
    setSelectedTeams([]);
    setEditingGroupId(null);
    setSearchTerm("");
    setActiveStep(1);
  };

  // Auto-increment: newly selected teams get the next free slot number.
  const toggleTeam = useCallback((teamId: string) => {
    setSelectedTeams(prev => {
      const exists = prev.find(t => t.teamId === teamId);
      if (exists) return prev.filter(t => t.teamId !== teamId);
      const nextSlot = prev.length > 0 ? Math.max(...prev.map(t => t.slot || 0)) + 1 : 1;
      return [...prev, { teamId, slot: nextSlot }];
    });
  }, []);

  const handleSlotChange = useCallback((teamId: string, val: string) => {
    const slotNum = val === "" ? null : parseInt(val, 10);
    setSelectedTeams(prev => prev.map(t => t.teamId === teamId ? { ...t, slot: slotNum } : t));
  }, []);

  const openFormForEditGroup = useCallback((group: Group) => {
    if (groupNameRef.current) groupNameRef.current.value = group.groupName;
    setSelectedTeams((group.slots || []).filter((s): s is Slot & { team: Team } => !!s.team).map(s => ({ teamId: s.team._id, slot: s.slot })));
    setEditingGroupId(group._id);
    setActiveStep(1);
    setShowForm(true);
    setMobileShowGroups(false);
  }, []);

  const handleSubmit = async () => {
    if (submittingRef.current) return; // hard stop against rapid double-clicks
    const name = groupNameRef.current?.value || "";
    if (!name.trim()) { setActiveStep(2); alert("Group name is required."); return; }
    if (selectedTeams.length === 0) { alert("Select at least one team."); return; }
    for (const t of selectedTeams) {
      if (t.slot === null || isNaN(t.slot as number)) { alert("Please assign a valid slot for all teams."); return; }
    }
    const invalid = selectedTeams.filter(st => !teams.find(t => t._id === st.teamId));
    if (invalid.length > 0) {
      alert("Some teams no longer exist. Refresh and try again.");
      const controller = new AbortController();
      loadInitialData(controller.signal, true);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const payload = { groupName: name, slots: selectedTeams.map(({ teamId, slot }) => ({ team: teamId, slot })) };
      if (editingGroupId) {
        await api.put(`/tournaments/${tournamentId}/groups/${editingGroupId}`, payload);
      } else {
        await api.post(`/tournaments/${tournamentId}/groups`, payload);
      }
      clearForm();
      setShowForm(false);
      const controller = new AbortController();
      loadInitialData(controller.signal, true);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to submit group.";
      const missing = err.response?.data?.missingTeamIds;
      if (missing?.length > 0) {
        alert(`${msg}\nMissing: ${missing.join(', ')}`);
        const controller = new AbortController();
        loadInitialData(controller.signal, true);
      } else {
        alert(msg);
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = useCallback(async (groupId: string) => {
    if (!window.confirm("Delete this group?")) return;
    try {
      await api.delete(`/tournaments/${tournamentId}/groups/${groupId}`);
      const controller = new AbortController();
      loadInitialData(controller.signal, true);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete group.");
    }
  }, [tournamentId, loadInitialData]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (onSelectionChange) onSelectionChange(groups.map(g => g._id));
  }, [groups, onSelectionChange]);

  const filteredTeams = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (!q) return teams;
    return teams.filter(t => t.teamFullName.toLowerCase().includes(q) || t.teamTag.toLowerCase().includes(q));
  }, [teams, searchTerm]);

  const selectedMap = useMemo(() => {
    const m = new Map<string, number | null>();
    selectedTeams.forEach(t => m.set(t.teamId, t.slot));
    return m;
  }, [selectedTeams]);

  if (!showForm) return null;

  // ── Groups column (shared between desktop right panel and mobile tab 3)
  const GroupsColumn = () => (
    <>
      <div className="gx-panel-hdr">
        <div className="gx-panel-label">Existing groups</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#93959C', fontSize: 13, fontWeight: 500 }}>
            {groups.length} group{groups.length !== 1 ? 's' : ''} created
          </span>
          <span className="gx-mono" style={{ color: '#E11D2E', fontSize: 13, fontWeight: 800 }}>{groups.length}</span>
        </div>
      </div>
      <div className="gx-groups-scroll">
        {groups.length === 0 ? (
          <div className="gx-empty">
            <div className="gx-empty-icon"><FaLayerGroup /></div>
            No groups yet
          </div>
        ) : groups.map(group => (
          <GroupCard
            key={group._id}
            group={group}
            isExpanded={expandedGroups.has(group._id)}
            onToggleExpand={toggleExpand}
            onEdit={openFormForEditGroup}
            onDelete={handleDeleteGroup}
          />
        ))}
      </div>
    </>
  );

  return (
    <>
      <style>{STYLES}</style>
      <div className="gx-root gx-overlay">
        <div className="gx-scan" />

        {/* ── Top bar ── */}
        <div className="gx-topbar">
          <span className="gx-live-dot" />
          <span className="gx-topbar-title gx-disp">
            {editingGroupId ? 'Edit Group' : 'Group Manager'}
          </span>
          <button
            className={`gx-topbar-badge gx-mono${mobileShowGroups ? ' on' : ''}`}
            onClick={() => setMobileShowGroups(v => !v)}
          >
            <FaUsers size={9} /> {groups.length}
          </button>
          <button className="gx-close-btn" onClick={() => setShowForm(false)} aria-label="Close">
            <FaTimes size={13} />
          </button>
        </div>

        {/* ── Step tabs ── */}
        <div className="gx-steps">
          <button className={`gx-step-tab${activeStep === 1 ? ' active' : ''}`} onClick={() => setActiveStep(1)}>
            <span className={`gx-step-num${selectedTeams.length > 0 && activeStep !== 1 ? ' done' : ''}`}>
              {selectedTeams.length > 0 && activeStep !== 1 ? <FaCheck size={8} /> : '1'}
            </span>
            Select teams
          </button>
          <button className={`gx-step-tab${activeStep === 2 ? ' active' : ''}`} onClick={() => setActiveStep(2)}>
            <span className="gx-step-num">2</span>
            Assign slots
          </button>
          <button
            className={`gx-step-tab${activeStep === 3 ? ' active' : ''}`}
            style={{ display: 'none' }}
            onClick={() => { setActiveStep(3); setMobileShowGroups(true); }}
          >
            <span className="gx-step-num">3</span>
            Groups
          </button>
        </div>

        {/* ── Body ── */}
        <div className={`gx-body${mobileShowGroups ? ' show-groups' : ''}`}>

          <div className="gx-left-panel">

            {/* STEP 1 — Team selection */}
            {activeStep === 1 && (
              <div className="gx-panel">
                <div className="gx-panel-hdr">
                  <div className="gx-panel-label">Select teams</div>
                  <div className="gx-search-wrap">
                    <FaSearch className="gx-search-ic" />
                    <input
                      type="text" value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search by name or tag…"
                      className="gx-search"
                    />
                  </div>
                </div>

                <div className="gx-team-grid-wrap">
                  {filteredTeams.length === 0 ? (
                    <div className="gx-empty">
                      <div className="gx-empty-icon"><FaUsers /></div>
                      No teams found
                    </div>
                  ) : (
                    <div className="gx-team-grid">
                      {filteredTeams.map(team => (
                        <TeamCard
                          key={team._id}
                          team={team}
                          isSelected={selectedMap.has(team._id)}
                          slot={selectedMap.get(team._id)}
                          onToggle={toggleTeam}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="gx-sel-bar">
                  <span className="gx-sel-count gx-mono">
                    <span>{selectedTeams.length}</span> selected
                  </span>
                  <div className="gx-sel-chips">
                    {selectedTeams.map(sel => {
                      const team = teams.find(t => t._id === sel.teamId);
                      return (
                        <span key={sel.teamId} className="gx-sel-chip gx-mono" onClick={() => toggleTeam(sel.teamId)}>
                          {team?.teamTag || '?'}
                          <span className="gx-sel-chip-x">✕</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 — Slots + group name */}
            {activeStep === 2 && (
              <div className="gx-panel">
                <div className="gx-panel-hdr">
                  <div className="gx-panel-label">Name &amp; assign slots</div>
                  <input ref={groupNameRef} type="text" placeholder="Group name…" className="gx-group-name-input" />
                </div>

                <div className="gx-slots-wrap">
                  {selectedTeams.length === 0 ? (
                    <div className="gx-empty">
                      <div className="gx-empty-icon"><FaPlus /></div>
                      Go back and select teams first
                    </div>
                  ) : (
                    [...selectedTeams]
                      .sort((a, b) => (a.slot || 0) - (b.slot || 0))
                      .map(sel => (
                        <SlotRow
                          key={sel.teamId}
                          team={teams.find(t => t._id === sel.teamId)}
                          slot={sel.slot}
                          onSlotChange={handleSlotChange}
                          onRemove={toggleTeam}
                        />
                      ))
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="gx-footer">
              {activeStep === 1 ? (
                <>
                  <button className="gx-btn-ghost" onClick={clearForm} disabled={isSubmitting}>Clear</button>
                  <button
                    className="gx-btn-primary"
                    onClick={() => setActiveStep(2)}
                    disabled={selectedTeams.length === 0}
                    style={{ opacity: selectedTeams.length === 0 ? 0.4 : 1 }}
                  >
                    Next: assign slots →
                  </button>
                </>
              ) : (
                <>
                  <button className="gx-btn-ghost" onClick={() => setActiveStep(1)} disabled={isSubmitting}>← Back</button>
                  <button className="gx-btn-ghost" onClick={clearForm} disabled={isSubmitting}>Clear</button>
                  <button className="gx-btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting && <FaSpinner size={11} className="gx-spin" />}
                    {isSubmitting ? 'Saving…' : editingGroupId ? 'Update group' : 'Create group'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="gx-right-panel">
            <GroupsColumn />
          </div>

        </div>
      </div>
    </>
  );
});

export default Group;