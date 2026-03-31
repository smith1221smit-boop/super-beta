import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import api from '../login/api';
import { socket } from "./socket";
import SocketManager from './socketManager';
import { requestQueue, UpdateBatcher } from './requestQueue';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import { FaUpload, FaEdit, FaTimes, FaPlus, FaCheck } from 'react-icons/fa';

const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try { return await fn(); }
    catch (error: any) {
      if ((error.response?.status === 429 || error.response?.status === 500) && attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt) + Math.random() * 1000));
        continue;
      }
      throw error;
    }
  }
};

interface Player {
  _id: string; playerName: string; killNum: number;
  bHasDied: boolean; damage?: number; survivalTime?: number; assists?: number;
  [key: string]: any;
}
interface Team {
  _id: string; teamId?: string; teamName: string; teamTag?: string;
  slot?: number; placePoints: number; players: Player[]; [key: string]: any;
}
interface MatchData { _id: string; teams: Team[]; [key: string]: any; }

// ── Styles ─────────────────────────────────────────────────────────────────────
// ── Styles ─────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');

  .md-root { font-family: 'Rajdhani', sans-serif; }
  .md-root *, .md-root *::before, .md-root *::after { box-sizing: border-box; }
  .md-orb  { font-family: 'Orbitron', monospace !important; }
  .md-bar  { font-family: 'Barlow Condensed', sans-serif !important; }

  /* ── Page ── */
  .md-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #120038 0%, #000000 50%, #120038 100%);
    color: #fff;
  }
  .md-hex {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image: radial-gradient(circle, rgba(168,85,247,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .md-scan {
    position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.018;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(168,85,247,0.6) 2px, rgba(168,85,247,0.6) 4px);
  }
  .md-glow {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background: radial-gradient(ellipse 80% 40% at 50% -5%, rgba(168,85,247,0.08), transparent);
  }

  /* ── Sticky top bar ── */
  .md-topbar {
    position: sticky; top: 0; z-index: 50;
    background: rgba(4,0,8,0.92);
    border-bottom: 1px solid rgba(168,85,247,0.18);
    backdrop-filter: blur(20px);
  }

  /* ── Live stat pills ── */
  .md-live-row {
    display: flex; justify-content: center; align-items: center; gap: 24px;
    padding: 14px 24px;
    border-bottom: 1px solid rgba(168,85,247,0.1);
  }
  .md-live-pill {
    display: flex; align-items: center; gap: 12px;
    background: rgba(0,0,0,0.5); border: 1px solid rgba(168,85,247,0.2);
    border-radius: 10px; padding: 10px 22px;
  }
  .md-live-pill-lbl {
    font-family: 'Orbitron', monospace; font-size: 9px; font-weight: 700;
    color: #4b5563; letter-spacing: 2px; text-transform: uppercase;
  }
  .md-live-pill-val {
    font-family: 'Orbitron', monospace; font-size: 28px; font-weight: 900; color: #fff;
    line-height: 1;
  }
  .md-live-pill-val.green { color: #a855f7; text-shadow: 0 0 12px rgba(168,85,247,0.5); }
  .md-live-dot { width: 1px; height: 40px; background: rgba(168,85,247,0.15); }

  /* ── Slot nav ── */
  .md-slot-nav {
    display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;
    padding: 10px 20px;
  }
  .md-slot-btn {
    font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700;
    padding: 5px 12px; border-radius: 6px; border: 1px solid rgba(168,85,247,0.2);
    background: rgba(0,0,0,0.4); color: #6b7280; cursor: pointer; letter-spacing: 0.5px;
  }
  .md-slot-btn:hover { background: rgba(168,85,247,0.07); color: #a855f7; border-color: rgba(168,85,247,0.4); }
  .md-slot-btn.dead { background: rgba(220,38,38,0.08); color: #ef4444; border-color: rgba(220,38,38,0.25); }
  .md-slot-btn.highlighted { border-color: #a855f7; background: rgba(168,85,247,0.12); color: #a855f7; box-shadow: 0 0 10px rgba(168,85,247,0.25); }

  /* ── Sort bar ── */
  .md-sort-bar {
    display: flex; justify-content: flex-end; align-items: center; gap: 10px;
    padding: 16px 24px 8px; position: relative; z-index: 1;
  }
  .md-sort-lbl { font-family: 'Orbitron', monospace; font-size: 9px; color: #374151; letter-spacing: 1.5px; }
  .md-sort-select {
    background: rgba(0,0,0,0.5); border: 1px solid rgba(168,85,247,0.2);
    border-radius: 7px; color: #a855f7; padding: 6px 12px;
    font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700;
    outline: none; cursor: pointer;
  }
  .md-sort-select option { background: #0a0110; }

  /* ── Teams grid ── */
  .md-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 14px; padding: 0 20px 40px; position: relative; z-index: 1;
  }

  /* ── Team card ── */
  .md-card {
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(168,85,247,0.12);
    border-radius: 14px; overflow: hidden;
    position: relative;
  }
  .md-card:hover { border-color: rgba(168,85,247,0.32); box-shadow: 0 0 20px rgba(168,85,247,0.06); }
  .md-card.eliminated { border-color: rgba(220,38,38,0.25); }
  .md-card.highlighted { border-color: #a855f7; box-shadow: 0 0 24px rgba(168,85,247,0.2); }

  /* Top color bar */
  .md-card-topbar { height: 3px; background: linear-gradient(90deg, #a855f7, #6b21a8, transparent); }
  .md-card.eliminated .md-card-topbar { background: linear-gradient(90deg, #ef4444, #7f1d1d, transparent); }

  /* Card header */
  .md-card-hdr {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 14px 16px 10px;
    border-bottom: 1px solid rgba(168,85,247,0.08);
  }
  .md-card-hdr-l { display: flex; align-items: center; gap: 10px; }

  .md-slot-badge {
    font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 900;
    background: rgba(168,85,247,0.12); border: 1px solid rgba(168,85,247,0.3);
    color: #a855f7; border-radius: 6px; padding: 4px 10px; flex-shrink: 0;
  }
  .md-card.eliminated .md-slot-badge { background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.3); color: #ef4444; }

  .md-team-name {
    font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 900;
    color: #fff; letter-spacing: 0.3px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;
  }
  .md-team-tag { font-size: 11px; color: #6b7280; font-weight: 600; margin-top: 1px; }

  .md-card-hdr-r { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }

  /* Elim toggle */
  .md-elim-toggle {
    display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;
  }
  .md-elim-lbl { font-family: 'Orbitron', monospace; font-size: 8px; letter-spacing: 1px; color: #374151; }
  .md-card.eliminated .md-elim-lbl { color: #ef4444; }

  .md-toggle-track {
    width: 36px; height: 20px; border-radius: 10px;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
    position: relative; cursor: pointer;
  }
  .md-toggle-track.on { background: #dc2626; border-color: rgba(220,38,38,0.5); box-shadow: 0 0 8px rgba(220,38,38,0.35); }
  .md-toggle-thumb {
    position: absolute; top: 2px; left: 2px;
    width: 14px; height: 14px; border-radius: 50%; background: #6b7280;
  }
  .md-toggle-track.on .md-toggle-thumb { left: 18px; background: #fff; }

  .md-edit-roster-btn {
    font-family: 'Orbitron', monospace; font-size: 8px; font-weight: 700; letter-spacing: 0.5px;
    background: rgba(37,99,235,0.12); border: 1px solid rgba(37,99,235,0.3);
    color: #60a5fa; border-radius: 5px; padding: 4px 10px; cursor: pointer;
    display: flex; align-items: center; gap: 5px;
  }
  .md-edit-roster-btn:hover { background: rgba(37,99,235,0.22); border-color: rgba(37,99,235,0.5); }

  /* ── Points row ── */
  .md-points-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px; background: rgba(0,0,0,0.3);
    border-bottom: 1px solid rgba(168,85,247,0.06);
  }
  .md-pts-group { display: flex; align-items: center; gap: 8px; }
  .md-pts-lbl { font-size: 10px; color: #4b5563; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600; }
  .md-pts-input {
    width: 52px; padding: 5px 8px; text-align: center;
    background: rgba(0,0,0,0.6); border: 1px solid rgba(168,85,247,0.25);
    border-radius: 6px; color: #a855f7;
    font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 900; outline: none;
  }
  .md-pts-input:focus { border-color: rgba(168,85,247,0.7); box-shadow: 0 0 0 2px rgba(168,85,247,0.1); }

  .md-totals { display: flex; align-items: center; gap: 12px; }
  .md-total-item { display: flex; flex-direction: column; align-items: flex-end; }
  .md-total-lbl { font-size: 9px; color: #374151; letter-spacing: 0.5px; text-transform: uppercase; }
  .md-total-val { font-family: 'Orbitron', monospace; font-size: 16px; font-weight: 900; }
  .md-total-val.kills { color: #f59e0b; }
  .md-total-val.total { color: #a855f7; }
  .md-total-divider { width: 1px; height: 28px; background: rgba(168,85,247,0.1); }

  /* ── Player rows ── */
  .md-players { padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 5px; }

  .md-player-row {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; border-radius: 8px;
    background: rgba(168,85,247,0.04); border: 1px solid rgba(168,85,247,0.1);
  }
  .md-player-row.dead { background: rgba(220,38,38,0.05); border-color: rgba(220,38,38,0.15); }

  .md-player-name {
    flex: 1; font-size: 14px; font-weight: 600; color: #d1d5db;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.3px;
  }
  .md-player-row.dead .md-player-name { color: #4b5563; text-decoration: line-through; }

  /* Kill counter */
  .md-kill-group { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
  .md-kill-btn {
    width: 24px; height: 24px; border-radius: 5px; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; line-height: 1;
  }
  .md-kill-btn.minus {
    background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.2); color: #ef4444;
  }
  .md-kill-btn.minus:hover { background: rgba(220,38,38,0.25); }
  .md-kill-btn.plus {
    background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.2); color: #a855f7;
  }
  .md-kill-btn.plus:hover { background: rgba(168,85,247,0.25); }
  .md-kill-val {
    font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 900;
    color: #f59e0b; min-width: 22px; text-align: center;
  }

  /* Death toggle per player */
  .md-death-toggle {
    width: 42px; height: 22px; border-radius: 11px; cursor: pointer; flex-shrink: 0;
    background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3);
    position: relative;
  }
  .md-death-toggle.dead { background: rgba(220,38,38,0.25); border-color: rgba(220,38,38,0.4); box-shadow: 0 0 6px rgba(220,38,38,0.2); }
  .md-death-thumb {
    position: absolute; top: 2px; left: 2px;
    width: 16px; height: 16px; border-radius: 50%; background: #a855f7;
  }
  .md-death-toggle.dead .md-death-thumb { left: 22px; background: #ef4444; }
  .md-death-lbl {
    position: absolute; font-family: 'Orbitron', monospace; font-size: 7px; font-weight: 900;
    top: 50%; transform: translateY(-50%); letter-spacing: 0.3px;
  }
  .md-death-lbl.alive { right: 4px; color: rgba(168,85,247,0.8); }
  .md-death-lbl.dead  { left: 4px;  color: rgba(239,68,68,0.8); }

  /* ── Loading / Error ── */
  .md-center {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #120038 0%, #000 50%, #120038 100%);
    flex-direction: column; gap: 16px;
  }
  .md-spinner { width: 48px; height: 48px; border: 3px solid rgba(168,85,247,0.12); border-top-color: #a855f7; border-radius: 50%; animation: mdspin 1s linear infinite; }
  @keyframes mdspin { to { transform: rotate(360deg); } }
  .md-spin-txt { font-family: 'Orbitron', monospace; font-size: 11px; color: #a855f7; letter-spacing: 2px; }

  /* ── Roster modal ── */
  .md-modal-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(4,0,8,0.9); backdrop-filter: blur(16px);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .md-modal {
    background: #0a0110; border: 1px solid rgba(168,85,247,0.25);
    border-radius: 18px; width: 100%; max-width: 900px; max-height: 92vh;
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 0 60px rgba(168,85,247,0.08), 0 40px 80px rgba(0,0,0,0.8);
  }
  .md-modal-hdr {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 28px; border-bottom: 1px solid rgba(168,85,247,0.12);
    background: rgba(0,0,0,0.5); flex-shrink: 0;
  }
  .md-modal-hdr-l { display: flex; align-items: center; gap: 10px; }
  .md-modal-tag {
    font-family: 'Orbitron', monospace; font-size: 9px; font-weight: 700;
    letter-spacing: 2px; color: #a855f7;
    background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.25);
    padding: 3px 9px; border-radius: 4px;
  }
  .md-modal-title { font-family: 'Orbitron', monospace; font-size: 15px; font-weight: 900; color: #fff; letter-spacing: 0.5px; }
  .md-modal-team { font-size: 13px; color: #a855f7; font-weight: 600; margin-top: 1px; }
  .md-modal-close {
    width: 30px; height: 30px; border-radius: 7px; cursor: pointer;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    color: #6b7280; display: flex; align-items: center; justify-content: center; font-size: 14px;
  }
  .md-modal-close:hover { background: rgba(220,38,38,0.12); color: #f87171; border-color: rgba(220,38,38,0.3); }

  .md-modal-body {
    flex: 1; overflow-y: auto; display: grid; grid-template-columns: 1fr 1px 1fr; gap: 0;
  }
  .md-modal-body::-webkit-scrollbar { width: 4px; }
  .md-modal-body::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.15); border-radius: 4px; }

  .md-modal-col { padding: 24px; overflow-y: auto; }
  .md-modal-divider { background: rgba(168,85,247,0.1); }

  .md-modal-col-title {
    font-family: 'Orbitron', monospace; font-size: 9px; font-weight: 700;
    letter-spacing: 2px; color: #a855f7; margin-bottom: 14px;
    display: flex; align-items: center; gap: 7px;
  }
  .md-modal-col-title::before { content: ''; width: 3px; height: 12px; background: #a855f7; border-radius: 2px; box-shadow: 0 0 5px #a855f7; }

  /* Player selection rows */
  .md-player-sel-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 9px; margin-bottom: 5px; cursor: pointer;
    background: rgba(0,0,0,0.35); border: 1px solid rgba(168,85,247,0.08);
  }
  .md-player-sel-row:hover { border-color: rgba(168,85,247,0.3); background: rgba(168,85,247,0.04); }
  .md-player-sel-row.sel { background: rgba(168,85,247,0.08); border-color: #a855f7; }

  .md-check-box {
    width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
    background: rgba(0,0,0,0.5); border: 1px solid rgba(168,85,247,0.2);
    display: flex; align-items: center; justify-content: center;
  }
  .md-player-sel-row.sel .md-check-box { background: #a855f7; border-color: #a855f7; box-shadow: 0 0 6px rgba(168,85,247,0.4); }

  .md-sel-player-name { font-size: 14px; font-weight: 700; color: #9ca3af; flex: 1; font-family: 'Barlow Condensed', sans-serif; }
  .md-player-sel-row.sel .md-sel-player-name { color: #e5e7eb; }

  /* Add player form */
  .md-field-lbl { font-size: 10px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; font-weight: 600; }
  .md-add-input {
    width: 100%; padding: 10px 13px; margin-bottom: 12px;
    background: rgba(0,0,0,0.6); border: 1px solid rgba(168,85,247,0.2);
    border-radius: 8px; color: #fff;
    font-family: 'Rajdhani', sans-serif; font-size: 14px; outline: none;
  }
  .md-add-input::placeholder { color: #1f2937; }
  .md-add-input:focus { border-color: rgba(168,85,247,0.5); box-shadow: 0 0 0 2px rgba(168,85,247,0.08); }

  .md-upload-lbl {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 13px; border-radius: 8px; cursor: pointer; margin-bottom: 12px;
    background: rgba(0,0,0,0.5); border: 1px solid rgba(168,85,247,0.15); color: #6b7280;
    font-size: 13px; font-weight: 600;
  }
  .md-upload-lbl:hover { border-color: rgba(168,85,247,0.35); color: #9ca3af; }

  .md-photo-preview { width: 80px; height: 80px; border-radius: 10px; object-fit: cover; border: 1px solid rgba(168,85,247,0.3); margin-bottom: 12px; }

  .md-add-btn {
    width: 100%; padding: 11px;
    background: linear-gradient(135deg, #9333ea, #7e22ce);
    color: #fff; border: 1px solid rgba(168,85,247,0.4);
    font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700;
    letter-spacing: 1px; border-radius: 8px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .md-add-btn:hover { box-shadow: 0 0 14px rgba(168,85,247,0.28); }
  .md-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Modal footer */
  .md-modal-footer {
    display: flex; align-items: center; justify-content: flex-end; gap: 10px;
    padding: 16px 28px; border-top: 1px solid rgba(168,85,247,0.1);
    background: rgba(0,0,0,0.4); flex-shrink: 0;
  }
  .md-btn-save {
    background: linear-gradient(135deg, #9333ea, #7e22ce);
    color: #fff; border: 1px solid rgba(168,85,247,0.4);
    font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700;
    letter-spacing: 1px; padding: 11px 22px; border-radius: 8px; cursor: pointer;
    display: flex; align-items: center; gap: 8px;
  }
  .md-btn-save:hover { box-shadow: 0 0 16px rgba(168,85,247,0.28); }
  .md-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
  .md-btn-cancel {
    background: rgba(0,0,0,0.4); color: #6b7280;
    border: 1px solid rgba(255,255,255,0.08);
    font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 600;
    padding: 11px 20px; border-radius: 8px; cursor: pointer;
  }
  .md-btn-cancel:hover { color: #9ca3af; }

  /* Spinner sm */
  .md-spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff; border-radius: 50%; animation: mdspin 0.8s linear infinite; }

  /* Player loading */
  .md-player-loading { display: flex; flex-direction: column; align-items: center; padding: 40px; gap: 12px; }
  .md-sel-count { font-family: 'Orbitron', monospace; font-size: 9px; color: #374151; letter-spacing: 1px; margin-bottom: 10px; }
  .md-sel-count span { color: #a855f7; font-weight: 900; }
`;

// ── Component ──────────────────────────────────────────────────────────────────
const MatchDataViewer: React.FC = () => {
  const { t } = useTranslation();
  const { tournamentId, roundId, matchId } = useParams<{ tournamentId: string; roundId: string; matchId: string }>();

  const [matchData, setMatchData]           = useState<any>(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [highlightedTeam, setHighlightedTeam] = useState<string | null>(null);
  const [sortBy, setSortBy]                 = useState<'slot' | 'placePoints'>('slot');
  const [editingTeam, setEditingTeam]       = useState<null | { teamIndex: number; teamId: string; teamName: string }>(null);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers]   = useState<string[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [savingRoster, setSavingRoster]     = useState(false);
  const [newPlayerName, setNewPlayerName]   = useState('');
  const [newPlayerId, setNewPlayerId]       = useState('');
  const [newPlayerPhoto, setNewPlayerPhoto] = useState<File | null>(null);
  const [addingPlayer, setAddingPlayer]     = useState(false);

  const teamRefs         = useRef<Record<string, HTMLDivElement | null>>({});
  const lastUpdateRef    = useRef<Record<string, number>>({});
  const killUpdateBatcher  = useRef(new UpdateBatcher<{ change: number }>(3000, (e, n) => ({ change: e.change + n.change })));
  const pointsUpdateBatcher = useRef(new UpdateBatcher<{ points: number }>(4000));
  const deathUpdateBatcher  = useRef(new UpdateBatcher<{ bHasDied: boolean }>(2500));

  const setTeamRef = (id: string) => (el: HTMLDivElement | null) => { if (el) teamRefs.current[id] = el; };

  const fetchMatchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.get(`/tournament/${tournamentId}/round/${roundId}/match/${matchId}/matchdata`);
      setMatchData({
        ...data,
        teams: Array.isArray(data?.teams)
          ? data.teams.map((t: Team) => ({ ...t, _id: t?._id || t?.teamId || null, placePoints: t.placePoints ?? 0 }))
          : [],
      });
    } catch (err: any) { setError(err.message || 'Failed to fetch match data'); }
    finally { setLoading(false); }
  }, [tournamentId, roundId, matchId]);

  useEffect(() => { if (tournamentId && roundId && matchId) fetchMatchData(); }, [tournamentId, roundId, matchId, fetchMatchData]);

  useEffect(() => {
    if (!socket) return;
    const handleLiveMatchUpdate = (data: any) => {
      if (!data) return;
      const inId = typeof data.matchId === 'object' && data.matchId?._id ? data.matchId._id : data.matchId;
      if (inId?.toString?.() !== matchId?.toString?.()) return;
      setMatchData({ ...data, teams: Array.isArray(data?.teams) ? data.teams.map((t: any) => ({ ...t, _id: t?._id || t?.teamId || null, placePoints: t.placePoints ?? 0 })) : [] });
    };
    const handleTeamUpdate = (data: any) => {
      setMatchData((prev: any) => {
        if (!prev?.teams) return prev;
        return { ...prev, teams: prev.teams.map((team: any) => {
          if (team._id !== data.teamId) return team;
          const changes = data?.changes || {};
          const next: any = { ...team, ...changes };
          if (Array.isArray(changes.players)) {
            const byId = new Map(changes.players.map((p: any) => [p._id?.toString?.() || p._id, p]));
            next.players = (team.players || []).map((p: any) => { const k = p._id?.toString?.() || p._id; const u = byId.get(k); return u ? { ...p, ...u } : p; });
          }
          return next;
        })};
      });
    };
    const handlePlayerUpdate = (data: any) => {
      setMatchData((prev: any) => {
        if (!prev?.teams) return prev;
        return { ...prev, teams: prev.teams.map((team: any) => team._id !== data.teamId ? team : { ...team, players: team.players.map((p: any) => p._id === data.playerId ? { ...p, ...data.updates } : p) }) };
      });
    };
    socket.on('liveMatchUpdate', handleLiveMatchUpdate);
    socket.on('matchDataUpdated', handleTeamUpdate);
    socket.on('playerStatsUpdated', handlePlayerUpdate);
    return () => {
      socket.off('liveMatchUpdate', handleLiveMatchUpdate);
      socket.off('matchDataUpdated', handleTeamUpdate);
      socket.off('playerStatsUpdated', handlePlayerUpdate);
      SocketManager.getInstance().disconnect();
    };
  }, []);

  const updateKillCount = async (teamIndex: number, playerIndex: number, change: number) => {
    if (!matchData) return;
    const now = Date.now(); const key = `${teamIndex}-${playerIndex}`;
    if (lastUpdateRef.current[key] && now - lastUpdateRef.current[key] < 200) return;
    lastUpdateRef.current[key] = now;
    const team = matchData.teams[teamIndex]; const player = team.players[playerIndex];
    const newKillNum = Math.max(0, player.killNum + change);
    const actualChange = newKillNum - player.killNum;
    setMatchData((prev: any) => { if (!prev) return prev; const t = [...prev.teams]; t[teamIndex] = { ...team, players: team.players.map((p: Player, i: number) => i === playerIndex ? { ...p, killNum: newKillNum } : p) }; return { ...prev, teams: t }; });
    if (actualChange === 0) return;
    killUpdateBatcher.current.batch(`${teamIndex}-${playerIndex}`, { change: actualChange }, async (u) => {
      await retryWithBackoff(() => api.patch(`/tournament/${tournamentId}/round/${roundId}/match/${matchId}/matchdata/${matchData._id}/team/${team._id}/player/${player._id}/stats`, { killNumChange: u.change }));
    });
  };

  const savePlacePoints = async (teamId: string, teamIndex: number, newPoints: number) => {
    if (!matchData) return;
    const now = Date.now(); const key = `${teamId}-points`;
    if (lastUpdateRef.current[key] && now - lastUpdateRef.current[key] < 300) return;
    lastUpdateRef.current[key] = now;
    setMatchData((prev: any) => { if (!prev?.teams?.[teamIndex]) return prev; const t = [...prev.teams]; t[teamIndex] = { ...t[teamIndex], placePoints: typeof newPoints === 'number' ? newPoints : 0 }; return { ...prev, teams: t }; });
    pointsUpdateBatcher.current.batch(`${teamId}-points`, { points: newPoints }, async (u) => {
      await retryWithBackoff(() => api.patch(`/tournament/${tournamentId}/round/${roundId}/match/${matchId}/matchdata/${matchData._id}/team/${teamId}/points`, { placePoints: u.points }));
    });
  };

  const togglePlayerDeath = async (teamIndex: number, playerIndex: number) => {
    if (!matchData) return;
    const now = Date.now(); const key = `${teamIndex}-${playerIndex}-death`;
    if (lastUpdateRef.current[key] && now - lastUpdateRef.current[key] < 250) return;
    lastUpdateRef.current[key] = now;
    const team = matchData.teams[teamIndex]; const player = team.players[playerIndex];
    const newVal = !player.bHasDied;
    setMatchData((prev: MatchData | null) => { if (!prev) return prev; const t = [...prev.teams]; t[teamIndex] = { ...team, players: team.players.map((p: Player, i: number) => i === playerIndex ? { ...p, bHasDied: newVal } : p) }; return { ...prev, teams: t }; });
    deathUpdateBatcher.current.batch(`${key}`, { bHasDied: newVal }, async (u) => {
      await retryWithBackoff(() => api.patch(`/tournament/${tournamentId}/round/${roundId}/match/${matchId}/matchdata/${matchData._id}/team/${team._id}/player/${player._id}/stats`, { bHasDied: u.bHasDied }));
    });
  };

  const toggleAllPlayersDeath = async (teamIndex: number) => {
    if (!matchData) return;
    const now = Date.now(); const key = `team-${teamIndex}-all-death`;
    if (lastUpdateRef.current[key] && now - lastUpdateRef.current[key] < 500) return;
    lastUpdateRef.current[key] = now;
    const team = matchData.teams[teamIndex];
    const newVal = !team.players.every((p: Player) => p.bHasDied);
    setMatchData((prev: MatchData | null) => { if (!prev) return prev; const t = [...prev.teams]; t[teamIndex] = { ...team, players: team.players.map((p: Player) => ({ ...p, bHasDied: newVal })) }; return { ...prev, teams: t }; });
    requestQueue.add(async () => {
      await api.patch(`/tournament/${tournamentId}/round/${roundId}/match/${matchId}/matchdata/${matchData._id}/team/${team._id}/bulk`, { bHasDied: newVal });
    }).catch(console.error);
  };

  const openChangePlayers = async (teamIndex: number, teamId: string, teamName: string) => {
    setEditingTeam({ teamIndex, teamId, teamName }); setPlayersLoading(true);
    try {
      const { data: teamData } = await api.get(`/teams/${teamId}`);
      const playersForTeam = (teamData.players || []).filter((p: any) => p && p.playerName && p._id);
      const preselected = (matchData?.teams?.[teamIndex]?.players || []).filter((p: any) => p && p.playerName && p._id);
      const norm = (n: string) => n.trim().toLowerCase();
      const preMap = new Map<string, any>(); preselected.forEach((p: Player) => preMap.set(norm(p.playerName), p));
      const filtered = playersForTeam.filter((p: Player) => { const pre = preMap.get(norm(p.playerName)); return !(pre && pre._id !== p._id); });
      const combined = new Map<string, any>(); [...preselected, ...filtered].forEach((p: any) => combined.set(p._id.toString(), p));
      setAvailablePlayers(Array.from(combined.values()));
      setSelectedPlayers(preselected.map((p: Player) => p._id.toString()).filter((id: string) => combined.has(id)));
    } catch (err: any) { setError(err.message || 'Failed to fetch team players'); }
    finally { setPlayersLoading(false); }
  };

  const addNewPlayer = async () => {
    if (!editingTeam || !newPlayerName.trim()) { alert(t('matchData.pleaseEnterPlayerName')); return; }
    setAddingPlayer(true);
    try {
      let photoUrl = '';
      if (newPlayerPhoto) photoUrl = await uploadToCloudinary(newPlayerPhoto, "players/photos", "player_photo");
      const { data: team } = await api.get(`/teams/${editingTeam.teamId}`);
      const { data: updatedTeam } = await api.put(`/teams/${editingTeam.teamId}`, { ...team, players: [...team.players, { playerName: newPlayerName.trim(), playerId: newPlayerId.trim() || undefined, photo: photoUrl || undefined }] });
      const newPlayer = updatedTeam.players.find((p: any) => p.playerName === newPlayerName.trim() && (!newPlayerId.trim() || p.playerId === newPlayerId.trim()));
      if (!newPlayer) throw new Error('Failed to find newly added player');
      setAvailablePlayers(prev => [...prev, newPlayer]);
      setNewPlayerName(''); setNewPlayerId(''); setNewPlayerPhoto(null);
      alert(t('matchData.playerAddedSuccessfully'));
    } catch { alert(t('matchData.failedToAddPlayer')); }
    finally { setAddingPlayer(false); }
  };

  const saveChangedPlayers = async () => {
    if (!editingTeam || selectedPlayers.length < 1 || selectedPlayers.length > 4) { alert(t('matchData.pleaseSelectPlayers')); return; }
    setSavingRoster(true);
    try {
      const oldPlayers = matchData.teams[editingTeam.teamIndex].players.map((p: any) => p._id.toString());
      const newPlayers = selectedPlayers.map(id => id.toString());
      const removed = oldPlayers.filter((id: string) => !newPlayers.includes(id));
      const added = newPlayers.filter(id => !oldPlayers.includes(id));
      const replacements = removed.map((oldId: string, i: number) => ({ oldPlayerId: oldId, newPlayerId: added[i] })).filter((r: any) => r.newPlayerId !== undefined);
      if (replacements.length > 0) await api.put(`/matchdata/${matchData._id}/team/${editingTeam.teamId}/replace`, { replacements });
      if (added.length > removed.length) await api.post(`/matchdata/${matchData._id}/team/${editingTeam.teamId}/player/add`, { newPlayerIds: added.slice(removed.length) });
      if (removed.length > added.length) await api.delete(`/matchdata/${matchData._id}/team/${editingTeam.teamId}/players/remove`, { data: { playerIds: removed.slice(added.length) } });
      setMatchData((prev: any) => {
        if (!prev) return prev;
        const t = [...prev.teams];
        const current = t[editingTeam.teamIndex].players;
        t[editingTeam.teamIndex] = { ...t[editingTeam.teamIndex], players: selectedPlayers.map(id => { const ex = current.find((p: any) => p._id.toString() === id); if (ex) return ex; const fa = availablePlayers.find(p => p._id.toString() === id); return fa ? { ...fa, killNum: 0, damage: 0, survivalTime: 0, assists: 0, bHasDied: false } : null; }).filter(Boolean) };
        return { ...prev, teams: t };
      });
      setEditingTeam(null); setNewPlayerName(''); setNewPlayerId(''); setNewPlayerPhoto(null);
    } catch (err: any) { setError(err.message || 'Failed to update players'); }
    finally { setSavingRoster(false); }
  };

  const sortedTeams = useMemo(() => {
    const t = [...(matchData?.teams ?? [])];
    t.sort((a: any, b: any) => sortBy === 'slot' ? (a.slot ?? 0) - (b.slot ?? 0) : (b.placePoints ?? 0) - (a.placePoints ?? 0));
    return t;
  }, [matchData?.teams, sortBy]);

  const totalTeams   = useMemo(() => (matchData?.teams || []).filter((t: any) => t.players.some((p: any) => !p.bHasDied)).length, [matchData?.teams]);
  const totalPlayers = useMemo(() => (matchData?.teams || []).reduce((s: number, t: any) => s + t.players.filter((p: any) => !p.bHasDied).length, 0), [matchData?.teams]);

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (loading) return (
    <>
      <style>{STYLES}</style>
      <div className="md-root md-center">
        <div className="md-spinner" />
        <p className="md-spin-txt">LOADING MATCH DATA</p>
      </div>
    </>
  );

  if (error) return (
    <>
      <style>{STYLES}</style>
      <div className="md-root md-center">
        <p style={{ fontFamily: 'Orbitron,monospace', color: '#f87171', fontSize: 14 }}>ERROR: {error}</p>
      </div>
    </>
  );

  if (!matchData) return (
    <>
      <style>{STYLES}</style>
      <div className="md-root md-center">
        <p style={{ fontFamily: 'Orbitron,monospace', color: '#374151', fontSize: 12, letterSpacing: 2 }}>NO MATCH DATA</p>
      </div>
    </>
  );

  return (
    <>
      <style>{STYLES}</style>
      <div className="md-root md-page">
        <div className="md-hex" />
        <div className="md-scan" />
        <div className="md-glow" />

        {/* ── Sticky Top Bar ── */}
        <div className="md-topbar">
          {/* Live stats */}
          <div className="md-live-row">
            <div className="md-live-pill">
              <span className="md-live-pill-lbl">Teams Alive</span>
              <span className="md-orb md-live-pill-val">{totalTeams}</span>
            </div>
            <div className="md-live-dot" />
            <div className="md-live-pill">
              <span className="md-live-pill-lbl">Players Alive</span>
              <span className="md-orb md-live-pill-val green">{totalPlayers}</span>
            </div>
          </div>

          {/* Slot nav */}
          <div className="md-slot-nav">
            {matchData.teams.map((team: any) => {
              const dead = team.players.length > 0 && team.players.every((p: any) => p.bHasDied);
              return (
                <button
                  key={team._id}
                  className={`md-slot-btn${dead ? ' dead' : ''}${highlightedTeam === team._id ? ' highlighted' : ''}`}
                  onClick={() => {
                    setHighlightedTeam(team._id);
                    setTimeout(() => { teamRefs.current[team._id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 0);
                    setTimeout(() => setHighlightedTeam(p => p === team._id ? null : p), 1800);
                  }}
                >
                  {`${team.slot} - ${team.teamTag} `}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort */}
        <div className="md-sort-bar">
          <span className="md-sort-lbl">SORT</span>
          <select className="md-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value as 'slot' | 'placePoints')}>
            <option value="slot">SLOT</option>
            <option value="placePoints">POINTS</option>
          </select>
        </div>

        {/* ── Teams Grid ── */}
        <div className="md-grid">
          {sortedTeams.map((team: any) => {
            const teamIndex  = matchData.teams.findIndex((t: any) => t._id === team._id);
            const allDead    = team.players.every((p: any) => p.bHasDied);
            const totalKills = team.players.reduce((s: number, p: any) => s + (p.killNum ?? 0), 0);
            const totalPts   = (team.placePoints ?? 0) + totalKills;
            const isHighlighted = highlightedTeam === team._id;

            return (
              <div
                key={team._id}
                ref={setTeamRef(team._id)}
                className={`md-card${allDead ? ' eliminated' : ''}${isHighlighted ? ' highlighted' : ''}`}
              >
                <div className="md-card-topbar" />

                {/* Card header */}
                <div className="md-card-hdr">
                  <div className="md-card-hdr-l">
                    <span className="md-orb md-slot-badge">S{team.slot}</span>
                    <div>
                      <div className="md-orb md-team-name" title={team.teamName}>{team.teamName}</div>
                      {team.teamTag && <div className="md-team-tag">[{team.teamTag}]</div>}
                    </div>
                  </div>

                  <div className="md-card-hdr-r">
                    {/* Elim toggle */}
                    <div className="md-elim-toggle" onClick={() => toggleAllPlayersDeath(teamIndex)}>
                      <span className="md-orb md-elim-lbl">ELIM</span>
                      <div className={`md-toggle-track${allDead ? ' on' : ''}`}>
                        <div className="md-toggle-thumb" />
                      </div>
                    </div>
                    {/* Edit roster */}
                    <button
                      className="md-edit-roster-btn"
                      onClick={() => openChangePlayers(teamIndex, team.teamId || team._id, team.teamName)}
                    >
                      <FaEdit size={9} /> ROSTER
                    </button>
                  </div>
                </div>

                {/* Points row */}
                <div className="md-points-row">
                  <div className="md-pts-group">
                    <span className="md-pts-lbl">Place Pts</span>
                    <input
                      type="number" min={0}
                      value={team.placePoints ?? 0}
                      className="md-pts-input"
                      onChange={e => {
                        const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                        setMatchData((prev: MatchData | null) => {
                          if (!prev) return prev;
                          const t = [...prev.teams]; t[teamIndex] = { ...t[teamIndex], placePoints: isNaN(v) ? 0 : v };
                          return { ...prev, teams: t };
                        });
                      }}
                      onBlur={e => {
                        const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                        if (!isNaN(v)) savePlacePoints(team._id, teamIndex, v);
                      }}
                    />
                  </div>
                  <div className="md-totals">
                    <div className="md-total-item">
                      <span className="md-total-lbl">Kills</span>
                      <span className="md-orb md-total-val kills">{totalKills}</span>
                    </div>
                    <div className="md-total-divider" />
                    <div className="md-total-item">
                      <span className="md-total-lbl">Total</span>
                      <span className="md-orb md-total-val total">{totalPts}</span>
                    </div>
                  </div>
                </div>

                {/* Players */}
                <div className="md-players">
                  {team.players.map((player: any, pi: number) => (
                    <div key={player._id} className={`md-player-row${player.bHasDied ? ' dead' : ''}`}>
                      <span className="md-bar md-player-name" title={player.playerName}>{player.playerName}</span>

                      {/* Kill counter */}
                      <div className="md-kill-group">
                        <button className="md-kill-btn minus" onClick={() => updateKillCount(teamIndex, pi, -1)}>−</button>
                        <span className="md-orb md-kill-val">{player.killNum ?? 0}</span>
                        <button className="md-kill-btn plus"  onClick={() => updateKillCount(teamIndex, pi, 1)}>+</button>
                      </div>

                      {/* Death toggle */}
                      <div
                        className={`md-death-toggle${player.bHasDied ? ' dead' : ''}`}
                        onClick={() => togglePlayerDeath(teamIndex, pi)}
                        title={player.bHasDied ? 'Mark ALIVE' : 'Mark DEAD'}
                      >
                        <div className="md-death-thumb" />
                        {player.bHasDied
                          ? <span className="md-death-lbl dead">OUT</span>
                          : <span className="md-death-lbl alive">IN</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Roster Modal ── */}
        {editingTeam && (
          <div className="md-modal-overlay">
            <div className="md-modal">

              <div className="md-modal-hdr">
                <div className="md-modal-hdr-l">
                  <span className="md-modal-tag">ROSTER</span>
                  <div>
                    <div className="md-orb md-modal-title">Edit Roster</div>
                    <div className="md-modal-team">{editingTeam.teamName}</div>
                  </div>
                </div>
                <button className="md-modal-close" onClick={() => { setEditingTeam(null); setNewPlayerName(''); setNewPlayerId(''); setNewPlayerPhoto(null); }}>
                  <FaTimes size={13} />
                </button>
              </div>

              {playersLoading ? (
                <div className="md-player-loading">
                  <div className="md-spinner" />
                  <p className="md-spin-txt">LOADING PLAYERS</p>
                </div>
              ) : (
                <div className="md-modal-body">
                  {/* Left — player selection */}
                  <div className="md-modal-col">
                    <div className="md-orb md-modal-col-title">SELECT PLAYERS</div>
                    <p className="md-sel-count">
                      SELECTED <span>{selectedPlayers.length}</span> / 4
                    </p>
                    {availablePlayers.map(player => {
                      const id = player._id.toString();
                      const isSel = selectedPlayers.includes(id);
                      return (
                        <div
                          key={id}
                          className={`md-player-sel-row${isSel ? ' sel' : ''}`}
                          onClick={() => {
                            if (isSel) {
                              setSelectedPlayers(prev => prev.filter(x => x !== id));
                            } else {
                              if (selectedPlayers.length >= 4) { alert(t('matchData.pleaseUntickPlayer')); return; }
                              setSelectedPlayers(prev => [...prev, id]);
                            }
                          }}
                        >
                          <div className="md-check-box">
                            {isSel && <FaCheck size={9} color="#000" />}
                          </div>
                          <span className="md-sel-player-name">{player.playerName}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="md-modal-divider" />

                  {/* Right — add new player */}
                  <div className="md-modal-col">
                    <div className="md-orb md-modal-col-title">ADD NEW PLAYER</div>

                    <p className="md-field-lbl">Player Name *</p>
                    <input
                      type="text" placeholder="Enter player name"
                      value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}
                      className="md-add-input"
                    />

                    <p className="md-field-lbl">Player ID (Optional)</p>
                    <input
                      type="text" placeholder="Enter player ID"
                      value={newPlayerId} onChange={e => setNewPlayerId(e.target.value)}
                      className="md-add-input"
                    />

                    <p className="md-field-lbl">Player Photo</p>
                    <label htmlFor="new-player-photo" className="md-upload-lbl">
                      <FaUpload size={13} color="#4ade80" /> Upload Photo
                    </label>
                    <input id="new-player-photo" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setNewPlayerPhoto(e.target.files?.[0] || null)} />
                    {newPlayerPhoto && (
                      <img src={URL.createObjectURL(newPlayerPhoto)} alt="Preview" className="md-photo-preview" loading="lazy" />
                    )}

                    <button
                      className="md-add-btn"
                      onClick={addNewPlayer}
                      disabled={addingPlayer || !newPlayerName.trim()}
                    >
                      {addingPlayer
                        ? <><span className="md-spinner-sm" /> Adding...</>
                        : <><FaPlus size={10} /> Add Player</>
                      }
                    </button>
                  </div>
                </div>
              )}

              <div className="md-modal-footer">
                <button className="md-btn-cancel" onClick={() => { setEditingTeam(null); setNewPlayerName(''); setNewPlayerId(''); setNewPlayerPhoto(null); }}>
                  Cancel
                </button>
                <button className="md-btn-save" onClick={saveChangedPlayers} disabled={savingRoster}>
                  {savingRoster
                    ? <><span className="md-spinner-sm" /> Saving...</>
                    : <><FaCheck size={11} /> Save Roster</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MatchDataViewer;
  