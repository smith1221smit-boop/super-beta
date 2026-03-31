import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { FaTrash, FaEdit } from 'react-icons/fa';
import Group, { GroupRef } from './GroupsData.tsx';
import api from '../login/api.tsx';
import { socket } from './socket.tsx';

interface RoundData {
  _id: string;
  roundName: string;
  roundNumber: number;
  tournamentId?: string;
  day?: string;
  apiEnable?: boolean;
}

const Round: React.FC = () => {
  const { t } = useTranslation();
  const { tournamentId } = useParams<{ tournamentId?: string }>();
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = tournamentId ? `rounds-${tournamentId}` : 'rounds-user';
  const groupRef = useRef<GroupRef>(null);

  // Modal & form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [roundName, setRoundName] = useState('');
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [day, setDay] = useState('');
  const [apiEnable, setApiEnable] = useState(false);

  // Edit states
  const [editRoundId, setEditRoundId] = useState<string | null>(null);
  const [editRoundName, setEditRoundName] = useState('');
  const [editRoundNumber, setEditRoundNumber] = useState<number>(1);
  const [editDay, setEditDay] = useState('');
  const [editApiEnable, setEditApiEnable] = useState(false);

  const fetchRounds = useCallback(async () => {
    setLoading(true);
    try {
      let url = tournamentId
        ? `/tournaments/${tournamentId}/rounds`
        : '/user/rounds';
      const { data } = await api.get(url);
      setRounds(data);
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rounds');
    } finally {
      setLoading(false);
    }
  }, [tournamentId, cacheKey]);

  useEffect(() => {
    fetchRounds();
    socket.on('roundUpdated', () => {
      sessionStorage.removeItem(cacheKey);
      fetchRounds();
    });
    return () => {
      socket.off('roundUpdated', fetchRounds);
    };
  }, [tournamentId, cacheKey, fetchRounds]);

  const openAddModal = () => {
    setShowAddModal(true);
    setRoundName('');
    setRoundNumber(rounds.length + 1);
    setDay('');
    setApiEnable(false);
  };

  const closeAddModal = () => setShowAddModal(false);

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundName) return;
    try {
      const url = tournamentId
        ? `/tournaments/${tournamentId}/rounds`
        : '/tournaments/undefined/rounds';
      await api.post(url, { roundName, roundNumber, day, apiEnable });
      sessionStorage.removeItem(cacheKey);
      await fetchRounds();
      closeAddModal();
    } catch (err: any) {
      alert(err.message || 'Error creating round');
    }
  };

  const handleDelete = async (roundId: string) => {
    if (!window.confirm('Are you sure you want to delete this round?')) return;
    try {
      const url = tournamentId
        ? `/tournaments/${tournamentId}/rounds/${roundId}`
        : `/rounds/${roundId}`;
      await api.delete(url);
      const updatedRounds = rounds.filter(r => r._id !== roundId);
      setRounds(updatedRounds);
      sessionStorage.setItem(cacheKey, JSON.stringify(updatedRounds));
    } catch (err: any) {
      alert(err.message || 'Error deleting round');
    }
  };

  const handleEditClick = (round: RoundData) => {
    setEditRoundId(round._id);
    setEditRoundName(round.roundName);
    setEditRoundNumber(round.roundNumber);
    setEditDay(round.day || '');
    setEditApiEnable(round.apiEnable || false);
  };

  const handleUpdate = async (roundId: string) => {
    try {
      const url = tournamentId
        ? `/tournaments/${tournamentId}/rounds/${roundId}`
        : `/rounds/${roundId}`;
      await api.put(url, {
        roundName: editRoundName,
        roundNumber: editRoundNumber,
        day: editDay,
        apiEnable: editApiEnable,
      });
      sessionStorage.removeItem(cacheKey);
      await fetchRounds();
      setEditRoundId(null);
    } catch (err: any) {
      alert(err.message || 'Error updating round');
    }
  };

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&display=swap');

.r-root * { box-sizing: border-box; }
.r-root { font-family: 'Rajdhani', sans-serif; }
.r-orbitron { font-family: 'Orbitron', monospace; }

.r-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #120038 0%, #000000 50%, #120038 100%);
  padding: 32px;
  position: relative;
  overflow: hidden;
}

.r-hex-bg {
  position: fixed; inset: 0; pointer-events: none;
  background-image: radial-gradient(circle, rgba(168,85,247,0.05) 1px, transparent 1px);
  background-size: 40px 40px; z-index: 0;
}

.r-scan {
  position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.02;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 2px,
    rgba(168,85,247,0.5) 2px, rgba(168,85,247,0.5) 4px
  );
}

.r-inner {
  position: relative; z-index: 1;
  max-width: 1100px; margin: 0 auto;
}

/* ── Header ── */
.r-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 36px; padding-bottom: 24px;
  border-bottom: 1px solid rgba(168,85,247,0.2);
}

.r-tag {
  display: inline-block;
  background: rgba(168,85,247,0.1);
  border: 1px solid rgba(168,85,247,0.3);
  color: #a855f7; font-size: 10px;
  padding: 3px 10px; border-radius: 4px;
  font-family: 'Orbitron', monospace;
  letter-spacing: 1px; margin-bottom: 8px;
}

.r-title {
  font-family: 'Orbitron', monospace;
  font-size: 26px; font-weight: 900;
  color: #fff; letter-spacing: 1px;
  margin: 0 0 4px;
}

.r-subtitle {
  color: #6b7280; font-size: 13px; letter-spacing: 0.3px;
}

.r-header-actions {
  display: flex; gap: 12px; align-items: center; padding-top: 8px;
}

/* ── Buttons ── */
.r-btn-primary {
  background: linear-gradient(135deg, #9333ea, #7e22ce);
  color: #fff; border: 1px solid rgba(168,85,247,0.5);
  font-family: 'Orbitron', monospace; font-size: 11px;
  letter-spacing: 1px; padding: 10px 22px; border-radius: 8px;
  cursor: pointer; font-weight: 700;
}
.r-btn-primary:hover {
  background: linear-gradient(135deg, #7e22ce, #6b21a8);
  box-shadow: 0 0 18px rgba(168,85,247,0.35);
}

.r-btn-secondary {
  background: rgba(0,0,0,0.5);
  color: #9ca3af; border: 1px solid rgba(168,85,247,0.2);
  font-family: 'Rajdhani', sans-serif; font-size: 14px;
  padding: 10px 22px; border-radius: 8px;
  cursor: pointer; font-weight: 600;
}
.r-btn-secondary:hover {
  background: rgba(168,85,247,0.08); color: #a855f7;
  border-color: rgba(168,85,247,0.4);
}

/* ── Stats bar ── */
.r-statsbar {
  display: flex; gap: 16px; margin-bottom: 28px;
}

.r-stat {
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(168,85,247,0.15);
  border-radius: 10px; padding: 14px 20px;
  display: flex; flex-direction: column; gap: 2px;
  min-width: 110px;
}

.r-stat-val {
  font-family: 'Orbitron', monospace;
  font-size: 22px; font-weight: 900; color: yellow;
}

.r-stat-label {
  font-size: 11px; color: #6b7280; letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* ── Round list ── */
.r-list { display: flex; flex-direction: column; gap: 10px; }

.r-row {
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(168,85,247,0.15);
  border-radius: 12px;
  overflow: hidden;
}

.r-row:hover {
  border-color: rgba(168,85,247,0.4);
  box-shadow: 0 0 20px rgba(168,85,247,0.08);
}

/* Left accent bar */
.r-row-inner {
  display: flex; align-items: stretch;
}

.r-accent-bar {
  width: 4px; flex-shrink: 0;
  background: linear-gradient(180deg, #a855f7, #9333ea);
}

.r-accent-bar.api-on {
  background: linear-gradient(180deg, #a855f7, #9333ea, #a855f7);
}

.r-row-content {
  flex: 1; padding: 16px 20px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}

/* Round number badge */
.r-num-badge {
  font-family: 'Orbitron', monospace;
  font-size: 11px; font-weight: 700;
  color: #a855f7;
  background: rgba(168,85,247,0.1);
  border: 1px solid rgba(168,85,247,0.3);
  border-radius: 6px; padding: 4px 10px;
  letter-spacing: 0.5px; flex-shrink: 0;
}

.r-round-name {
  font-size: 17px; font-weight: 700;
  color: #fff; letter-spacing: 0.3px;
  text-decoration: none;
}

.r-round-name:hover { color: #a855f7; }

.r-meta {
  display: flex; align-items: center; gap: 10px; margin-top: 4px;
}

.r-day-chip {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: #9ca3af;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 3px 10px; border-radius: 5px;
  letter-spacing: 0.3px;
}

.r-api-chip {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; color: #a855f7;
  background: rgba(168,85,247,0.08);
  border: 1px solid rgba(168,85,247,0.3);
  padding: 3px 10px; border-radius: 5px;
  font-family: 'Orbitron', monospace; letter-spacing: 0.5px;
}

.r-api-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #a855f7;
  box-shadow: 0 0 6px #a855f7;
}

/* Action buttons */
.r-actions {
  display: flex; gap: 8px; align-items: center;
  opacity: 0;
}

.r-row:hover .r-actions { opacity: 1; }

.r-action-btn {
  width: 32px; height: 32px; border-radius: 7px;
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.r-action-edit {
  background: rgba(109,40,217,0.8);
}
.r-action-edit:hover {
  background: rgba(109,40,217,1);
  box-shadow: 0 0 10px rgba(168,85,247,0.5);
}

/* Delete button remains red */
.r-action-del {
  background: rgba(220,38,38,0.8);
}
.r-action-del:hover {
  background: rgba(220,38,38,1);
  box-shadow: 0 0 10px rgba(239,68,68,0.5);
}

/* ── Edit inline form ── */
.r-edit-form {
  padding: 20px 24px 20px 28px;
  border-top: 1px solid rgba(168,85,247,0.1);
  background: rgba(0,0,0,0.3);
}

.r-edit-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;
}

.r-field-label {
  font-size: 11px; color: #6b7280;
  letter-spacing: 0.5px; text-transform: uppercase;
  margin-bottom: 5px;
}

.r-input {
  width: 100%; padding: 10px 14px;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(168,85,247,0.25);
  border-radius: 7px; color: #fff;
  font-family: 'Rajdhani', sans-serif; font-size: 15px;
  outline: none;
}
.r-input::placeholder { color: rgba(156,163,175,0.5); }
.r-input:focus {
  border-color: rgba(168,85,247,0.7);
  box-shadow: 0 0 0 2px rgba(168,85,247,0.12);
}

.r-api-toggle {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: rgba(220,38,38,0.06);
  border: 1px solid rgba(220,38,38,0.2);
  border-radius: 7px; cursor: pointer; margin-bottom: 14px;
  font-weight: 700; font-size: 14px;
  color: #f87171; letter-spacing: 0.3px;
}
.r-api-toggle input { accent-color: #ef4444; width: 16px; height: 16px; }

.r-edit-actions { display: flex; gap: 10px; justify-content: flex-end; }

.r-btn-save {
  background: linear-gradient(135deg, #9333ea, #7e22ce);
  color: #fff; border: 1px solid rgba(168,85,247,0.4);
  font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700;
  letter-spacing: 1px; padding: 9px 20px; border-radius: 7px; cursor: pointer;
}
.r-btn-save:hover { box-shadow: 0 0 14px rgba(168,85,247,0.3); }

.r-btn-cancel {
  background: rgba(0,0,0,0.4);
  color: #9ca3af; border: 1px solid rgba(255,255,255,0.1);
  font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 600;
  padding: 9px 20px; border-radius: 7px; cursor: pointer;
}
.r-btn-cancel:hover { background: rgba(255,255,255,0.06); color: #d1d5db; }

/* ── Modal ── */
.r-modal-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}

.r-modal {
  background: #03030f;
  border: 1px solid rgba(168,85,247,0.3);
  border-radius: 16px; width: 100%; max-width: 500px;
  padding: 32px;
  box-shadow: 0 0 60px rgba(168,85,247,0.12), 0 40px 80px rgba(0,0,0,0.7);
}

.r-modal-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 24px;
  padding-bottom: 16px; border-bottom: 1px solid rgba(168,85,247,0.15);
}

.r-modal-title {
  font-family: 'Orbitron', monospace;
  font-size: 16px; font-weight: 700; color: #fff;
  letter-spacing: 0.5px;
}

.r-modal-fields { display: flex; flex-direction: column; gap: 14px; }

.r-modal-actions { display: flex; gap: 10px; margin-top: 24px; }

/* ── Empty state ── */
.r-empty {
  text-align: center; padding: 72px 24px;
}

.r-empty-icon {
  width: 68px; height: 68px; border-radius: 50%;
  background: rgba(168,85,247,0.07);
  border: 1px solid rgba(168,85,247,0.25);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 20px;
  box-shadow: 0 0 20px rgba(168,85,247,0.1);
}

.r-empty-title {
  font-family: 'Orbitron', monospace;
  font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 8px;
}

.r-empty-desc { color: #6b7280; font-size: 14px; margin-bottom: 24px; }

/* ── Loading ── */
.r-loading {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #120038 0%, #000 50%, #120038 100%);
  flex-direction: column; gap: 16px;
}

.r-spinner {
  width: 48px; height: 48px;
  border: 3px solid rgba(168,85,247,0.15);
  border-top-color: #a855f7;
  border-radius: 50%;
}

.r-loading-text {
  font-family: 'Orbitron', monospace;
  font-size: 13px; color: #a855f7; letter-spacing: 1px;
}

/* divider between group and rounds */
.r-section-label {
  display: flex; align-items: center; gap: 12px;
  margin: 28px 0 16px;
}

.r-section-label span {
  font-family: 'Orbitron', monospace;
  font-size: 10px; letter-spacing: 2px;
  color: #a855f7; white-space: nowrap;
}

.r-section-label::before, .r-section-label::after {
  content: ''; flex: 1;
  height: 1px; background: rgba(168,85,247,0.2);
}
`;

  const apiActiveCount = rounds.filter(r => r.apiEnable).length;

  // ── Loading / Error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="r-root r-loading">
          <div className="r-spinner" style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p className="r-loading-text">LOADING ROUNDS</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div className="r-root r-loading">
          <p style={{ color: '#f87171', fontFamily: 'Orbitron, monospace', fontSize: 14 }}>
            ERROR: {error}
          </p>
        </div>
      </>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="r-root r-page">
        <div className="r-hex-bg" />
        <div className="r-scan" />
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 70% 40% at 50% -5%, rgba(74,222,128,0.1), transparent)'
        }} />

        <div className="r-inner">

          {/* ── Page Header ── */}
          <div className="r-header">
            <div>
              <div className="r-tag">BROADCAST SYSTEM</div>
              <h1 className="r-orbitron r-title">{t('rounds.title')}</h1>
              <p className="r-subtitle">Manage rounds, schedule and API broadcast feeds</p>
            </div>
            <div className="r-header-actions">
              <button className="r-btn-secondary" onClick={() => groupRef.current?.openForm()}>
                + {t('rounds.addGroup')}
              </button>
              <button className="r-btn-primary" onClick={openAddModal}>
                + {t('rounds.addRound')}
              </button>
            </div>
          </div>

          {/* ── Stats Bar ── */}
          <div className="r-statsbar">
            <div className="r-stat">
              <span className="r-orbitron r-stat-val">{rounds.length}</span>
              <span className="r-stat-label">Total Rounds</span>
            </div>
            <div className="r-stat">
              <span className="r-orbitron r-stat-val" style={{ color: apiActiveCount > 0 ? 'white': '#6b7280' }}>
                {apiActiveCount}
              </span>
              <span className="r-stat-label">API Active</span>
            </div>
            <div className="r-stat">
              <span className="r-orbitron r-stat-val">{rounds.filter(r => r.day).length}</span>
              <span className="r-stat-label">Scheduled</span>
            </div>
          </div>

          {/* ── Group Component ── */}
          <Group ref={groupRef} />

          {/* ── Section Divider ── */}
          <div className="r-section-label">
            <span>ROUNDS</span>
          </div>

          {/* ── Round List ── */}
          {rounds.length > 0 ? (
            <ul className="r-list" style={{ listStyle: 'none', margin: 0, padding: 0, paddingBottom: 48 }}>
              {rounds.map(round => (
                <li key={round._id} className="r-row">
                  <div className="r-row-inner">
                    <div className={`r-accent-bar${round.apiEnable ? ' api-on' : ''}`} />

                    <div style={{ flex: 1 }}>
                      {/* ── View mode ── */}
                      {editRoundId !== round._id ? (
                        <div className="r-row-content">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                              <span className="r-num-badge">R{round.roundNumber}</span>
                              {tournamentId ? (
                                <Link
                                  to={`/tournaments/${tournamentId}/rounds/${round._id}/matches`}
                                  className="r-round-name"
                                >
                                  {round.roundName}
                                </Link>
                              ) : (
                                <span className="r-round-name">{round.roundName}</span>
                              )}
                            </div>
                            <div className="r-meta">
                              <span className="r-day-chip">
                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {round.day || t('rounds.noDaySet')}
                              </span>
                              {round.apiEnable && (
                                <span className="r-api-chip">
                                  <span className="r-api-dot" />
                                  {t('rounds.apiActive')}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="r-actions">
                            <button
                              className="r-action-btn r-action-edit"
                              onClick={() => handleEditClick(round)}
                              title="Edit"
                            >
                              <FaEdit color="#fff" size={13} />
                            </button>
                            <button
                              className="r-action-btn r-action-del"
                              onClick={() => handleDelete(round._id)}
                              title="Delete"
                            >
                              <FaTrash color="#fff" size={13} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Edit mode ── */
                        <div className="r-edit-form">
                          <div className="r-edit-grid">
                            <div>
                              <p className="r-field-label">{t('rounds.name')}</p>
                              <input
                                type="text"
                                value={editRoundName}
                                onChange={e => setEditRoundName(e.target.value)}
                                className="r-input"
                                placeholder="Round name"
                              />
                            </div>
                            <div>
                              <p className="r-field-label">{t('rounds.day')}</p>
                              <input
                                type="text"
                                value={editDay}
                                onChange={e => setEditDay(e.target.value)}
                                className="r-input"
                                placeholder="e.g. Day 1"
                              />
                            </div>
                          </div>

                          <label className="r-api-toggle">
                            <input
                              type="checkbox"
                              checked={editApiEnable}
                              onChange={e => setEditApiEnable(e.target.checked)}
                            />
                            {t('rounds.enableApi')}
                          </label>

                          <div className="r-edit-actions">
                            <button className="r-btn-cancel" onClick={() => setEditRoundId(null)}>
                              {t('rounds.cancel')}
                            </button>
                            <button className="r-btn-save" onClick={() => handleUpdate(round._id)}>
                              {t('rounds.saveChanges')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            /* ── Empty State ── */
            <div className="r-empty">
              <div className="r-empty-icon">
                <svg width="28" height="28" fill="none" stroke="#4ade80" strokeWidth="1.5" viewBox="0 0 24 24" opacity="0.7">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="r-orbitron r-empty-title">No Rounds Yet</h3>
              <p className="r-empty-desc">Create your first round to start managing the broadcast schedule.</p>
              <button className="r-btn-primary" style={{ padding: '12px 32px' }} onClick={openAddModal}>
                + {t('rounds.addRound')}
              </button>
            </div>
          )}
        </div>

        {/* ── Add Modal ── */}
        {showAddModal && (
          <div className="r-modal-overlay">
            <div className="r-modal">
              <div className="r-modal-header">
                <span className="r-tag" style={{ margin: 0 }}>NEW</span>
                <h3 className="r-orbitron r-modal-title">{t('rounds.addNewRound')}</h3>
              </div>

              <form onSubmit={handleAddRound}>
                <div className="r-modal-fields">
                  <div>
                    <p className="r-field-label">{t('rounds.roundName')}</p>
                    <input
                      type="text"
                      placeholder="e.g. Grand Finals"
                      value={roundName}
                      onChange={e => setRoundName(e.target.value)}
                      className="r-input"
                      required
                    />
                  </div>
                  <div>
                    <p className="r-field-label">{t('rounds.day')}</p>
                    <input
                      type="text"
                      placeholder="e.g. Day 1"
                      value={day}
                      onChange={e => setDay(e.target.value)}
                      className="r-input"
                    />
                  </div>
                  <label className="r-api-toggle" style={{ marginBottom: 0 }}>
                    <input
                      type="checkbox"
                      checked={apiEnable}
                      onChange={e => setApiEnable(e.target.checked)}
                    />
                    {t('rounds.enableApi')}
                  </label>
                </div>

                <div className="r-modal-actions">
                  <button type="button" className="r-btn-cancel" style={{ flex: 1 }} onClick={closeAddModal}>
                    {t('rounds.cancel')}
                  </button>
                  <button type="submit" className="r-btn-primary" style={{ flex: 1 }}>
                    {t('rounds.saveRound')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Round;
