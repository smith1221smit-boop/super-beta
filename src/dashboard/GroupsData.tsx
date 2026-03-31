import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FaTrash, FaEdit, FaTimes, FaSearch, FaChevronDown, FaChevronUp, FaUsers, FaPlus, FaCheck, FaLayerGroup } from "react-icons/fa";
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
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&display=swap');

.gx-root *, .gx-root *::before, .gx-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
.gx-root { font-family: 'Rajdhani', sans-serif; }
.gx-orb { font-family: 'Orbitron', monospace; }

/* ── Overlay ── */
.gx-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(8,0,20,0.97);
  backdrop-filter: blur(20px);
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* ── Top bar ── */
.gx-topbar {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(168,85,247,0.18);
  background: rgba(0,0,0,0.6);
  flex-shrink: 0;
}

.gx-topbar-title {
  font-family: 'Orbitron', monospace;
  font-size: 14px; font-weight: 900;
  color: #fff; letter-spacing: 1.5px;
  flex: 1;
}

.gx-topbar-badge {
  background: rgba(168,85,247,0.15);
  border: 1px solid rgba(168,85,247,0.35);
  color: #a855f7;
  font-family: 'Orbitron', monospace;
  font-size: 9px; font-weight: 700;
  padding: 3px 10px; border-radius: 4px;
  letter-spacing: 1px;
}

.gx-close-btn {
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(168,85,247,0.2);
  color: #6b7280; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
  transition: all 0.15s;
}
.gx-close-btn:hover {
  background: rgba(220,38,38,0.15);
  border-color: rgba(239,68,68,0.4);
  color: #f87171;
}

/* ── Step tabs (mobile: horizontal scroll, desktop: inline) ── */
.gx-steps {
  display: flex; gap: 0;
  border-bottom: 1px solid rgba(168,85,247,0.12);
  background: rgba(0,0,0,0.4);
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}
.gx-steps::-webkit-scrollbar { display: none; }

.gx-step-tab {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 20px;
  border: none; background: transparent;
  color: #4b5563; cursor: pointer;
  font-family: 'Orbitron', monospace; font-size: 9px;
  font-weight: 700; letter-spacing: 1.5px;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  flex-shrink: 0;
}
.gx-step-tab:hover { color: #9ca3af; }
.gx-step-tab.active {
  color: #a855f7;
  border-bottom-color: #a855f7;
  background: rgba(168,85,247,0.05);
}
.gx-step-num {
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(168,85,247,0.1);
  border: 1px solid rgba(168,85,247,0.25);
  color: #a855f7; font-size: 9px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
}
.gx-step-tab.active .gx-step-num {
  background: #a855f7; color: #fff;
  box-shadow: 0 0 10px rgba(168,85,247,0.5);
}
.gx-step-num.done {
  background: rgba(34,197,94,0.15);
  border-color: rgba(34,197,94,0.4);
  color: #22c55e;
}

/* ── Main body ── */
.gx-body {
  flex: 1; display: flex; overflow: hidden;
  position: relative;
}

/* ── Panel (shared) ── */
.gx-panel {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden;
}

/* ── Panel header ── */
.gx-panel-hdr {
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(168,85,247,0.1);
  flex-shrink: 0;
}
.gx-panel-label {
  font-family: 'Orbitron', monospace; font-size: 8px;
  font-weight: 700; letter-spacing: 2.5px; color: #a855f7;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 10px;
}
.gx-panel-label::before {
  content: '';
  width: 3px; height: 12px;
  background: #a855f7; border-radius: 2px;
  box-shadow: 0 0 8px rgba(168,85,247,0.7);
}

/* ── Search bar ── */
.gx-search-wrap { position: relative; }
.gx-search {
  width: 100%; padding: 9px 14px 9px 36px;
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(168,85,247,0.22);
  border-radius: 8px; color: #e5e7eb;
  font-family: 'Rajdhani', sans-serif; font-size: 14px;
  outline: none; letter-spacing: 0.3px;
}
.gx-search::placeholder { color: #374151; }
.gx-search:focus {
  border-color: rgba(168,85,247,0.6);
  box-shadow: 0 0 0 3px rgba(168,85,247,0.1);
}
.gx-search-ic {
  position: absolute; left: 12px; top: 50%;
  transform: translateY(-50%);
  color: #4b5563; font-size: 12px; pointer-events: none;
}

/* ── Step 1: Team grid ── */
.gx-team-grid-wrap {
  flex: 1; overflow-y: auto; padding: 16px 20px;
  scrollbar-width: thin; scrollbar-color: rgba(168,85,247,0.15) transparent;
}
.gx-team-grid-wrap::-webkit-scrollbar { width: 3px; }
.gx-team-grid-wrap::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.2); border-radius: 4px; }

.gx-team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

@media (max-width: 600px) {
  .gx-team-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }
}

/* ── Team card ── */
.gx-team-card {
  position: relative; cursor: pointer;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(168,85,247,0.12);
  border-radius: 12px;
  padding: 16px 10px 12px;
  display: flex; flex-direction: column;
  align-items: center; gap: 8px;
  text-align: center;
  transition: all 0.15s; user-select: none;
}
.gx-team-card:hover {
  border-color: rgba(168,85,247,0.4);
  background: rgba(168,85,247,0.05);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(168,85,247,0.12);
}
.gx-team-card.selected {
  border-color: #a855f7;
  background: rgba(168,85,247,0.1);
  box-shadow: 0 0 20px rgba(168,85,247,0.2), inset 0 0 12px rgba(168,85,247,0.05);
}

/* Selected checkmark badge */
.gx-card-check {
  position: absolute; top: 6px; right: 6px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #a855f7;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 8px rgba(168,85,247,0.6);
}

/* Slot pip */
.gx-card-slot-pip {
  position: absolute; top: 6px; left: 6px;
  font-family: 'Orbitron', monospace; font-size: 8px;
  font-weight: 900; color: #000;
  background: #a855f7; border-radius: 3px;
  padding: 1px 5px; line-height: 1.4;
  box-shadow: 0 0 6px rgba(168,85,247,0.5);
}

.gx-card-logo {
  width: 48px; height: 48px; border-radius: 10px;
  object-fit: cover;
  border: 1px solid rgba(168,85,247,0.2);
}
.gx-card-logo-placeholder {
  width: 48px; height: 48px; border-radius: 10px;
  background: rgba(168,85,247,0.07);
  border: 1px solid rgba(168,85,247,0.15);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Orbitron', monospace; font-size: 12px;
  font-weight: 900; color: #a855f7; opacity: 0.5;
}
.gx-team-card.selected .gx-card-logo,
.gx-team-card.selected .gx-card-logo-placeholder {
  border-color: rgba(168,85,247,0.6);
  box-shadow: 0 0 10px rgba(168,85,247,0.25);
}

.gx-card-tag {
  font-family: 'Orbitron', monospace; font-size: 10px;
  font-weight: 700; color: #a855f7; letter-spacing: 0.5px;
}
.gx-card-name {
  font-size: 11px; color: #6b7280; line-height: 1.2;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
  font-weight: 600;
}

/* ── Selection bar (bottom of step 1) ── */
.gx-sel-bar {
  padding: 12px 20px;
  border-top: 1px solid rgba(168,85,247,0.12);
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; gap: 12px;
  flex-shrink: 0;
}
.gx-sel-count {
  font-family: 'Orbitron', monospace; font-size: 9px;
  color: #6b7280; letter-spacing: 1px;
}
.gx-sel-count span { color: #a855f7; font-size: 14px; font-weight: 900; }
.gx-sel-chips {
  flex: 1; display: flex; gap: 6px; flex-wrap: nowrap;
  overflow-x: auto; scrollbar-width: none;
}
.gx-sel-chips::-webkit-scrollbar { display: none; }
.gx-sel-chip {
  display: flex; align-items: center; gap: 5px;
  background: rgba(168,85,247,0.12);
  border: 1px solid rgba(168,85,247,0.3);
  border-radius: 6px; padding: 3px 8px;
  font-family: 'Orbitron', monospace; font-size: 9px;
  font-weight: 700; color: #a855f7;
  white-space: nowrap; cursor: pointer;
  flex-shrink: 0;
  transition: all 0.12s;
}
.gx-sel-chip:hover {
  background: rgba(220,38,38,0.12);
  border-color: rgba(239,68,68,0.35);
  color: #f87171;
}
.gx-sel-chip-x { font-size: 8px; opacity: 0.7; }

/* ── Step 2: Slots ── */
.gx-slots-wrap {
  flex: 1; overflow-y: auto; padding: 16px 20px;
  scrollbar-width: thin; scrollbar-color: rgba(168,85,247,0.15) transparent;
}
.gx-slots-wrap::-webkit-scrollbar { width: 3px; }
.gx-slots-wrap::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.2); border-radius: 4px; }

.gx-slot-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; margin-bottom: 6px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(168,85,247,0.14);
  border-radius: 10px;
  transition: border-color 0.12s;
}
.gx-slot-row:hover { border-color: rgba(168,85,247,0.3); }

.gx-slot-num-badge {
  font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 900;
  color: #000; background: #a855f7;
  border-radius: 6px; min-width: 32px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; box-shadow: 0 0 8px rgba(168,85,247,0.4);
}

.gx-slot-logo { width: 32px; height: 32px; border-radius: 7px; object-fit: cover; border: 1px solid rgba(168,85,247,0.2); flex-shrink: 0; }
.gx-slot-nlogo {
  width: 32px; height: 32px; border-radius: 7px; flex-shrink: 0;
  background: rgba(168,85,247,0.07); border: 1px solid rgba(168,85,247,0.15);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Orbitron', monospace; font-size: 9px; color: #a855f7; opacity: 0.5;
}

.gx-slot-info { flex: 1; min-width: 0; }
.gx-slot-tag { font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700; color: #a855f7; }
.gx-slot-full { font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.gx-slot-num-input {
  width: 52px; padding: 5px 6px; text-align: center;
  background: rgba(0,0,0,0.7);
  border: 1px solid rgba(168,85,247,0.25);
  border-radius: 6px; color: #a855f7;
  font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700;
  outline: none; flex-shrink: 0;
}
.gx-slot-num-input:focus { border-color: #a855f7; box-shadow: 0 0 0 2px rgba(168,85,247,0.15); }

.gx-slot-rm {
  width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0;
  background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.2);
  color: #ef4444; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.12s;
}
.gx-slot-rm:hover { background: rgba(220,38,38,0.25); border-color: rgba(239,68,68,0.5); }

/* ── Group name input (step 2 header area) ── */
.gx-group-name-input {
  width: 100%; padding: 11px 15px;
  background: rgba(0,0,0,0.65);
  border: 1px solid rgba(168,85,247,0.3);
  border-radius: 8px; color: #fff;
  font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700;
  letter-spacing: 1px; outline: none;
}
.gx-group-name-input::placeholder { color: #2d1b4e; font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 400; letter-spacing: 0; }
.gx-group-name-input:focus { border-color: #a855f7; box-shadow: 0 0 0 3px rgba(168,85,247,0.12), 0 0 15px rgba(168,85,247,0.15); }

/* ── Step 3: Groups list ── */
.gx-groups-scroll {
  flex: 1; overflow-y: auto; padding: 16px 20px;
  scrollbar-width: thin; scrollbar-color: rgba(168,85,247,0.15) transparent;
}
.gx-groups-scroll::-webkit-scrollbar { width: 3px; }
.gx-groups-scroll::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.2); border-radius: 4px; }

.gx-group-card {
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(168,85,247,0.12);
  border-radius: 14px; overflow: hidden;
  margin-bottom: 10px;
  transition: border-color 0.12s;
}
.gx-group-card:hover { border-color: rgba(168,85,247,0.3); }

.gx-group-card-hdr {
  display: flex; align-items: center;
  padding: 13px 16px; cursor: pointer;
  gap: 10px;
}
.gx-group-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #a855f7; flex-shrink: 0;
  box-shadow: 0 0 6px rgba(168,85,247,0.7);
}
.gx-group-card-name {
  font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700;
  color: #e5e7eb; letter-spacing: 0.5px; flex: 1; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.gx-group-card-badge {
  font-family: 'Orbitron', monospace; font-size: 9px; font-weight: 700;
  color: #a855f7; background: rgba(168,85,247,0.1);
  border: 1px solid rgba(168,85,247,0.22);
  border-radius: 4px; padding: 2px 8px; flex-shrink: 0;
}
.gx-group-card-actions { display: flex; gap: 5px; flex-shrink: 0; }
.gx-group-ic {
  width: 26px; height: 26px; border-radius: 6px;
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.12s;
}
.gx-group-ic-e { background: rgba(37,99,235,0.6); }
.gx-group-ic-e:hover { background: rgba(37,99,235,0.9); box-shadow: 0 0 8px rgba(59,130,246,0.3); }
.gx-group-ic-d { background: rgba(220,38,38,0.6); }
.gx-group-ic-d:hover { background: rgba(220,38,38,0.9); box-shadow: 0 0 8px rgba(239,68,68,0.3); }
.gx-chevron { color: #374151; font-size: 9px; margin-left: 2px; flex-shrink: 0; }

/* Top color accent bar */
.gx-group-accent {
  height: 2px;
  background: linear-gradient(90deg, #a855f7, rgba(168,85,247,0.3), transparent);
}

/* Expanded team list */
.gx-group-teams {
  border-top: 1px solid rgba(168,85,247,0.07);
  background: rgba(0,0,0,0.2);
  padding: 8px 16px 12px;
}

.gx-group-team-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 8px;
  margin-bottom: 3px;
  transition: background 0.1s;
}
.gx-group-team-row:hover { background: rgba(168,85,247,0.05); }

.gx-group-slot-pill {
  font-family: 'Orbitron', monospace; font-size: 9px; font-weight: 900;
  color: #000; background: #a855f7; border-radius: 4px;
  min-width: 30px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; box-shadow: 0 0 5px rgba(168,85,247,0.3);
}
.gx-group-tlogo { width: 32px; height: 32px; border-radius: 7px; object-fit: cover; border: 1px solid rgba(168,85,247,0.18); flex-shrink: 0; }
.gx-group-tnlogo {
  width: 32px; height: 32px; border-radius: 7px; flex-shrink: 0;
  background: rgba(168,85,247,0.06); border: 1px solid rgba(168,85,247,0.12);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Orbitron', monospace; font-size: 9px; color: #a855f7; opacity: 0.4;
}
.gx-group-ttag { font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700; color: #d1d5db; }
.gx-group-tname { font-size: 12px; color: #4b5563; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Footer ── */
.gx-footer {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid rgba(168,85,247,0.15);
  background: rgba(0,0,0,0.6);
  flex-shrink: 0;
}
.gx-btn-primary {
  flex: 1; padding: 11px 20px;
  background: linear-gradient(135deg, #9333ea, #7e22ce);
  color: #fff; border: 1px solid rgba(168,85,247,0.5);
  font-family: 'Orbitron', monospace; font-size: 11px;
  font-weight: 700; letter-spacing: 1px;
  border-radius: 8px; cursor: pointer;
  transition: all 0.15s;
}
.gx-btn-primary:hover {
  background: linear-gradient(135deg, #7e22ce, #6b21a8);
  box-shadow: 0 0 20px rgba(168,85,247,0.35);
}
.gx-btn-ghost {
  padding: 11px 16px;
  background: rgba(0,0,0,0.4); color: #6b7280;
  border: 1px solid rgba(168,85,247,0.15);
  font-family: 'Rajdhani', sans-serif; font-size: 14px;
  font-weight: 600; border-radius: 8px; cursor: pointer;
  transition: all 0.12s;
}
.gx-btn-ghost:hover { color: #9ca3af; border-color: rgba(168,85,247,0.3); background: rgba(168,85,247,0.05); }

/* ── Empty state ── */
.gx-empty {
  text-align: center; padding: 40px 20px;
  color: #2d1b4e;
  font-family: 'Orbitron', monospace; font-size: 9px;
  letter-spacing: 2px;
  border: 1px dashed rgba(168,85,247,0.1);
  border-radius: 10px;
}
.gx-empty-icon { font-size: 28px; margin-bottom: 12px; opacity: 0.3; }

/* ── Desktop: side-by-side layout for step 1+2 and step 3 ── */
@media (min-width: 768px) {
  .gx-body { flex-direction: row; }

  /* Steps 1 and 2 share left panel, groups always visible on right */
  .gx-left-panel {
    flex: 1; display: flex; flex-direction: column;
    border-right: 1px solid rgba(168,85,247,0.12);
    overflow: hidden;
  }
  .gx-right-panel {
    width: 320px; display: flex; flex-direction: column;
    overflow: hidden; flex-shrink: 0;
  }
}

@media (max-width: 767px) {
  .gx-left-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .gx-right-panel { display: none; } /* hidden on mobile, shown as tab */
  .gx-body.show-groups .gx-left-panel { display: none; }
  .gx-body.show-groups .gx-right-panel { display: flex; flex: 1; flex-direction: column; }
}

/* ── Scan lines overlay (ambient) ── */
.gx-scan {
  position: fixed; inset: 0; pointer-events: none; z-index: 201;
  opacity: 0.018;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(168,85,247,0.5) 2px, rgba(168,85,247,0.5) 4px);
}
.gx-hex-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: radial-gradient(circle, rgba(168,85,247,0.04) 1px, transparent 1px);
  background-size: 36px 36px;
}
`;

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

  const CACHE_KEY = `groups_cache_${tournamentId}`;

  React.useImperativeHandle(ref, () => ({
    openForm: async () => {
      setShowForm(true);
      await fetchTeams();
      clearForm();
      setActiveStep(1);
    }
  }));

  const fetchTeams = async () => {
    try {
      const res = await api.get("/teams");
      setTeams(res.data);
    } catch (err: any) {
      console.error("Failed to fetch teams:", err);
      if (err.response?.status === 401) alert("Unauthorized. Please login.");
    }
  };

  const fetchGroups = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) { setGroups(JSON.parse(cached)); return; }
      }
      const res = await api.get(`/tournaments/${tournamentId}/groups`);
      setGroups(res.data);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
    } catch (err: any) {
      console.error("Failed to fetch groups:", err);
      if (err.response?.status === 401) alert("Unauthorized. Please login.");
    }
  }, [tournamentId, CACHE_KEY]);

  const clearForm = () => {
    if (groupNameRef.current) groupNameRef.current.value = "";
    setSelectedTeams([]);
    setEditingGroupId(null);
    setSearchTerm("");
    setActiveStep(1);
  };

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

  const openFormForEditGroup = async (group: Group) => {
    await fetchTeams();
    if (groupNameRef.current) groupNameRef.current.value = group.groupName;
    setSelectedTeams((group.slots || []).filter((s): s is Slot & {team: Team} => !!s.team).map(s => ({ teamId: s.team._id, slot: s.slot })));
    setEditingGroupId(group._id);
    setActiveStep(1);
    setShowForm(true);
    setMobileShowGroups(false);
  };

  const handleSubmit = async () => {
    const name = groupNameRef.current?.value || "";
    if (!name.trim()) { setActiveStep(2); return alert("Group name is required."); }
    if (selectedTeams.length === 0) return alert("Select at least one team.");
    for (const t of selectedTeams) {
      if (t.slot === null || isNaN(t.slot as number)) return alert("Please assign a valid slot for all teams.");
    }
    const invalid = selectedTeams.filter(st => !teams.find(t => t._id === st.teamId));
    if (invalid.length > 0) { alert("Some teams no longer exist. Refresh and try again."); await fetchTeams(); return; }
    try {
      const payload = { groupName: name, slots: selectedTeams.map(({ teamId, slot }) => ({ team: teamId, slot })) };
      if (editingGroupId) {
        await api.put(`/tournaments/${tournamentId}/groups/${editingGroupId}`, payload);
      } else {
        await api.post(`/tournaments/${tournamentId}/groups`, payload);
      }
      clearForm(); setShowForm(false); fetchGroups(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to submit group.";
      const missing = err.response?.data?.missingTeamIds;
      if (missing?.length > 0) { alert(`${msg}\nMissing: ${missing.join(', ')}`); await fetchTeams(); }
      else alert(msg);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Delete this group?")) return;
    try {
      await api.delete(`/tournaments/${tournamentId}/groups/${groupId}`);
      fetchGroups(true);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete group.");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (onSelectionChange) onSelectionChange(groups.map(g => g._id));
  }, [groups, selectedTeams, onSelectionChange]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const filteredTeams = useMemo(() =>
    teams.filter(t =>
      t.teamFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.teamTag.toLowerCase().includes(searchTerm.toLowerCase())
    ), [teams, searchTerm]);

  if (!showForm) return null;

  // ── Groups column (shared between desktop right panel and mobile tab 3)
  const GroupsColumn = () => (
    <>
      <div className="gx-panel-hdr">
        <div className="gx-panel-label">EXISTING GROUPS</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 600 }}>
            {groups.length} group{groups.length !== 1 ? 's' : ''} created
          </span>
          <span className="gx-orb" style={{ color: '#a855f7', fontSize: 13, fontWeight: 900 }}>{groups.length}</span>
        </div>
      </div>
      <div className="gx-groups-scroll">
        {groups.length === 0 ? (
          <div className="gx-empty">
            <div className="gx-empty-icon">
              <FaLayerGroup />
            </div>
            NO GROUPS YET
          </div>
        ) : groups.map(group => {
          const isExpanded = expandedGroups.has(group._id);
          const sorted = [...(group.slots || [])].sort((a, b) => a.slot - b.slot);
          return (
            <div key={group._id} className="gx-group-card">
              <div className="gx-group-accent" />
              <div className="gx-group-card-hdr" onClick={() => toggleExpand(group._id)}>
                <span className="gx-group-dot" />
                <span className="gx-group-card-name">{group.groupName}</span>
                <span className="gx-group-card-badge">{sorted.length}T</span>
                <div className="gx-group-card-actions">
                  <button className="gx-group-ic gx-group-ic-e"
                    onClick={e => { e.stopPropagation(); openFormForEditGroup(group); }}
                    onMouseDown={e => e.preventDefault()}>
                    <FaEdit color="#fff" size={11} />
                  </button>
                  <button className="gx-group-ic gx-group-ic-d"
                    onClick={e => { e.stopPropagation(); handleDeleteGroup(group._id); }}
                    onMouseDown={e => e.preventDefault()}>
                    <FaTrash color="#fff" size={11} />
                  </button>
                </div>
                <span className="gx-chevron">
                  {isExpanded ? <FaChevronUp size={9} /> : <FaChevronDown size={9} />}
                </span>
              </div>
              {isExpanded && (
                <div className="gx-group-teams">
                  {sorted.length === 0 ? (
                    <div className="gx-empty" style={{ padding: '12px' }}>NO TEAMS ASSIGNED</div>
                  ) : sorted.map((slot, idx) => (
                    <React.Fragment key={slot._id}>
                      <div className="gx-group-team-row">
                        <div className="gx-group-slot-pill">S{slot.slot}</div>
                        {slot.team?.logo
                          ? <img src={slot.team.logo} alt="" className="gx-group-tlogo" loading="lazy" />
                          : <div className="gx-group-tnlogo">{slot.team?.teamTag?.slice(0, 2)}</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="gx-group-ttag">{slot.team?.teamTag || '—'}</div>
                          <div className="gx-group-tname">{slot.team?.teamFullName || 'Unknown'}</div>
                        </div>
                      </div>
                      {idx < sorted.length - 1 && (
                        <div style={{ height: 1, background: 'rgba(168,85,247,0.06)', margin: '0 4px' }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      <style>{STYLES}</style>
      <div className="gx-root gx-overlay">
        <div className="gx-scan" />
        <div className="gx-hex-bg" />

        {/* ── Top bar ── */}
        <div className="gx-topbar">
          <FaUsers size={16} style={{ color: '#a855f7', flexShrink: 0 }} />
          <span className="gx-topbar-title">
            {editingGroupId ? 'EDIT GROUP' : 'GROUP MANAGER'}
          </span>
          {/* Mobile: groups toggle */}
          <button
            className="gx-topbar-badge"
            style={{ cursor: 'pointer', background: mobileShowGroups ? 'rgba(168,85,247,0.3)' : undefined }}
            onClick={() => setMobileShowGroups(v => !v)}
          >
            GROUPS ({groups.length})
          </button>
          <button className="gx-close-btn" onClick={() => setShowForm(false)}>
            <FaTimes size={13} />
          </button>
        </div>

        {/* ── Step tabs ── */}
        <div className="gx-steps">
          <button
            className={`gx-step-tab${activeStep === 1 ? ' active' : ''}`}
            onClick={() => setActiveStep(1)}
          >
            <span className={`gx-step-num${selectedTeams.length > 0 && activeStep !== 1 ? ' done' : ''}`}>
              {selectedTeams.length > 0 && activeStep !== 1 ? <FaCheck size={8} /> : '1'}
            </span>
            SELECT TEAMS
          </button>
          <button
            className={`gx-step-tab${activeStep === 2 ? ' active' : ''}`}
            onClick={() => setActiveStep(2)}
          >
            <span className="gx-step-num">2</span>
            ASSIGN SLOTS
          </button>
          {/* Mobile-only groups tab */}
          <button
            className={`gx-step-tab${activeStep === 3 ? ' active' : ''}`}
            style={{ display: 'none' }}
            onClick={() => { setActiveStep(3); setMobileShowGroups(true); }}
          >
            <span className="gx-step-num">3</span>
            GROUPS
          </button>
        </div>

        {/* ── Body ── */}
        <div className={`gx-body${mobileShowGroups ? ' show-groups' : ''}`}>

          {/* ── Left panel: steps 1 and 2 ── */}
          <div className="gx-left-panel">

            {/* STEP 1 — Team selection */}
            {activeStep === 1 && (
              <div className="gx-panel">
                <div className="gx-panel-hdr">
                  <div className="gx-panel-label">SELECT TEAMS</div>
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
                      NO TEAMS FOUND
                    </div>
                  ) : (
                    <div className="gx-team-grid">
                      {filteredTeams.map(team => {
                        const sel = selectedTeams.find(t => t.teamId === team._id);
                        const isSelected = !!sel;
                        return (
                          <div
                            key={team._id}
                            className={`gx-team-card${isSelected ? ' selected' : ''}`}
                            onClick={() => toggleTeam(team._id)}
                          >
                            {isSelected && (
                              <div className="gx-card-check">
                                <FaCheck size={8} color="#fff" />
                              </div>
                            )}
                            {isSelected && sel?.slot != null && (
                              <span className="gx-card-slot-pip">S{sel.slot}</span>
                            )}
                            {team.logo
                              ? <img src={team.logo} alt={team.teamTag} className="gx-card-logo" loading="lazy" />
                              : <div className="gx-card-logo-placeholder">{team.teamTag?.slice(0, 2)}</div>
                            }
                            <span className="gx-card-tag">{team.teamTag}</span>
                            <span className="gx-card-name">{team.teamFullName}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selection chips bar */}
                <div className="gx-sel-bar">
                  <span className="gx-sel-count">
                    <span>{selectedTeams.length}</span> selected
                  </span>
                  <div className="gx-sel-chips">
                    {selectedTeams.map(sel => {
                      const team = teams.find(t => t._id === sel.teamId);
                      return (
                        <span key={sel.teamId} className="gx-sel-chip" onClick={() => toggleTeam(sel.teamId)}>
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
                  <div className="gx-panel-label">NAME & ASSIGN SLOTS</div>
                  <input
                    ref={groupNameRef}
                    type="text"
                    placeholder="Group name…"
                    className="gx-group-name-input"
                  />
                </div>

                <div className="gx-slots-wrap">
                  {selectedTeams.length === 0 ? (
                    <div className="gx-empty">
                      <div className="gx-empty-icon"><FaPlus /></div>
                      GO BACK AND SELECT TEAMS FIRST
                    </div>
                  ) : (
                    [...selectedTeams]
                      .sort((a, b) => (a.slot || 0) - (b.slot || 0))
                      .map(sel => {
                        const team = teams.find(t => t._id === sel.teamId);
                        return (
                          <div key={sel.teamId} className="gx-slot-row">
                            <div className="gx-slot-num-badge">{sel.slot ?? '?'}</div>
                            {team?.logo
                              ? <img src={team.logo} alt="" className="gx-slot-logo" loading="lazy" />
                              : <div className="gx-slot-nlogo">{team?.teamTag?.slice(0, 2)}</div>
                            }
                            <div className="gx-slot-info">
                              <div className="gx-slot-tag">{team?.teamTag}</div>
                              <div className="gx-slot-full">{team?.teamFullName}</div>
                            </div>
                            <input
                              type="number" min={1} value={sel.slot ?? ""}
                              onChange={e => handleSlotChange(sel.teamId, e.target.value)}
                              className="gx-slot-num-input"
                              title="Slot number"
                            />
                            <button className="gx-slot-rm" onClick={() => toggleTeam(sel.teamId)}>
                              <FaTimes size={9} />
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="gx-footer">
              {activeStep === 1 ? (
                <>
                  <button className="gx-btn-ghost" onClick={clearForm}>Clear</button>
                  <button
                    className="gx-btn-primary"
                    onClick={() => setActiveStep(2)}
                    disabled={selectedTeams.length === 0}
                    style={{ opacity: selectedTeams.length === 0 ? 0.4 : 1 }}
                  >
                    NEXT: ASSIGN SLOTS →
                  </button>
                </>
              ) : (
                <>
                  <button className="gx-btn-ghost" onClick={() => setActiveStep(1)}>← BACK</button>
                  <button className="gx-btn-ghost" onClick={clearForm}>Clear</button>
                  <button className="gx-btn-primary" onClick={handleSubmit}>
                    {editingGroupId ? 'UPDATE GROUP' : 'CREATE GROUP'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Right panel: groups list (desktop always visible) ── */}
          <div className="gx-right-panel">
            <GroupsColumn />
          </div>

        </div>
      </div>
    </>
  );
});

export default Group;
