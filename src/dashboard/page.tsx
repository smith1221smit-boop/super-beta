import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaEdit, FaTrash, FaDiscord, FaUpload, FaTrophy, FaUsers, FaEye } from "react-icons/fa";
import { useTranslation } from 'react-i18next';
import api from "../login/api"; // Axios instance with withCredentials
import { socket } from "./socket"; // socket instance
import { setCache, getCache, removeCache } from "./cache"; // ✅ caching utils
import { uploadToCloudinary } from '../utils/cloudinaryUpload.tsx';

interface TournamentFormState {
  tournamentName: string;
  torLogo: string;
  primaryColor: string;
  secondaryColor: string;
  overlayBg: string;
}

interface Tournament {
  _id: string;
  tournamentName: string;
  torLogo: string;
  primaryColor: string;
  secondaryColor: string;
  overlayBg: string;
}

const GLOBAL_CACHE_KEY = "auth_user";
const CACHE_KEY_BASE = "tournaments";

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TournamentFormState>({
    tournamentName: "",
    torLogo: "",
    primaryColor: "",
    secondaryColor: "",
    overlayBg: "",
  });

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [editForm, setEditForm] = useState<Partial<Tournament>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  const handleTorLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadToCloudinary(file, "tournaments/logos", "team_logo");
      setForm((prev) => ({ ...prev, torLogo: url }));
    } catch (err) {
      alert("Upload failed");
    }
  };

  // --- Auth check (cached) ---
  const checkAuth = async () => {
    console.log("checkAuth called");
    const cachedUser = getCache(GLOBAL_CACHE_KEY, 1000 * 60 * 5);
    console.log("Cached user:", cachedUser);
    if (cachedUser) return cachedUser;

    try {
      console.log("Making API call to /users/me");
      const { data } = await api.get("/users/me");
      console.log("API response:", data);
      setCache(GLOBAL_CACHE_KEY, data);
      return data;
    } catch (err) {
      console.error("Auth check failed:", err);
      removeCache(GLOBAL_CACHE_KEY);
      return null;
    }
  };

  // --- Fetch tournaments with caching (per user) ---
  const fetchTournaments = async () => {
    console.log("fetchTournaments called");
    const userData = await checkAuth();
    console.log("checkAuth returned:", userData);
    if (!userData) {
      console.log("No user data, redirecting to login");
      navigate("/login");
      return;
    }
    setUser(userData);

    socket.emit('join', userData._id);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const key = `${CACHE_KEY_BASE}_${userData._id}`;

    const cached = getCache(CACHE_KEY_BASE, 1000 * 60 * 10);
    if (cached) {
      setTournaments(cached);
      return;
    }

    try {
      const { data } = await api.get<Tournament[]>("/tournaments");
      setTournaments(data);
      setCache(CACHE_KEY_BASE, data);
    } catch (err: any) {
      console.error("Error fetching tournaments:", err.response?.data?.message || err.message);
    }
  };

  useEffect(() => {
    console.log("Dashboard useEffect triggered");
    fetchTournaments();

    const handleNewTournament = (tournament: Tournament) => {
      setTournaments((prev) => {
        if (prev.find((t) => t._id === tournament._id)) return prev;
        const updated = [...prev, tournament];
        setCache(CACHE_KEY_BASE, updated);
        return updated;
      });
    };

    socket.on("newTournament", handleNewTournament);

    return () => {
      socket.off("newTournament", handleNewTournament);
    };
  }, []);

  // --- Create handlers ---
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/tournaments", form);
      const updated = [...tournaments, data];
      setTournaments(updated);
      setCache(CACHE_KEY_BASE, updated);
      setForm({
        tournamentName: "",
        torLogo: "",
        primaryColor: "",
        secondaryColor: "",
        overlayBg: "",
      });
      setShowForm(false);
      alert(t('dashboard.page.messages.created'));
    } catch (err: any) {
      console.error("Error creating tournament:", err.response?.data?.message || err.message);
      alert(t('dashboard.page.messages.updateFailed'));
    }
  };

  // --- Edit handlers ---
  const handleEdit = (id: string) => {
    const tournament = tournaments.find((t) => t._id === id);
    if (tournament) {
      setEditingTournament(tournament);
      setEditForm(tournament);
      setShowEditModal(true);
    }
  };

  const handleEditChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTournament) return;

    try {
      const { data: updatedTournament } = await api.put<Tournament>(
        `/tournaments/${editingTournament._id}`,
        editForm
      );

      const updated = tournaments.map((t) =>
        t._id === updatedTournament._id ? updatedTournament : t
      );
      setTournaments(updated);
      setCache(CACHE_KEY_BASE, updated);
      setEditingTournament(null);
      setShowEditModal(false);
      alert(t('dashboard.page.messages.updated'));
    } catch (err: any) {
      console.error("Edit error:", err.response?.data?.message || err.message);
      alert(t('dashboard.page.messages.updateFailed'));
    }
  };

  // --- Delete handler ---
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this tournament?")) return;

    try {
      await api.delete(`/tournaments/${id}`);
      const updated = tournaments.filter((t) => t._id !== id);
      setTournaments(updated);
      setCache(CACHE_KEY_BASE, updated);
      alert(t('dashboard.page.messages.deleted'));
    } catch (err: any) {
      console.error("Delete error:", err.response?.data?.message || err.message);
      alert(t('dashboard.page.messages.deleteFailed'));
    }
  };

 return (
  <div className="min-h-screen bg-gradient-to-br from-[#120038] via-black to-[#120038] font-mono">
   <style>{`
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&display=swap');

* { font-family: 'Rajdhani', sans-serif; }
.orbitron { font-family: 'Orbitron', monospace; }

.sidebar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #6b7280;
  cursor: pointer;
  padding: 10px;
  border-radius: 12px;
  width: 64px;
  border: 1px solid transparent;
  background: transparent;
  text-decoration: none;
}

.sidebar-btn:hover {
  color: #a855f7;
  background: rgba(168,85,247,0.08);
  border-color: rgba(168,85,247,0.3);
  box-shadow: 0 0 16px rgba(168,85,247,0.25), inset 0 0 8px rgba(168,85,247,0.05);
}

.sidebar-btn.active {
  color: #a855f7;
  background: rgba(168,85,247,0.12);
  border-color: rgba(168,85,247,0.5);
  box-shadow: 0 0 20px rgba(168,85,247,0.3);
}

.card-hover { cursor: pointer; }

.card-hover:hover {
  box-shadow:
    0 0 30px rgba(168,85,247,0.3),
    0 0 60px rgba(168,85,247,0.12),
    0 20px 40px rgba(0,0,0,0.5);
}

.glass {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(168,85,247,0.2);
}

.glass-dark {
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(168,85,247,0.3);
}

.neon-border {
  border: 1px solid rgba(168,85,247,0.4);
  box-shadow: 0 0 10px rgba(168,85,247,0.15), inset 0 0 10px rgba(168,85,247,0.05);
}

.card-actions { opacity: 0; }
.card-hover:hover .card-actions { opacity: 1; }

.input-cyber {
  width: 100%;
  padding: 12px 16px;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(168,85,247,0.3);
  border-radius: 8px;
  color: #fff;
  font-family: 'Rajdhani', sans-serif;
  font-size: 15px;
  letter-spacing: 0.5px;
  outline: none;
}

.input-cyber::placeholder {
  color: rgba(156,163,175,0.6);
}

.input-cyber:focus {
  border-color: rgba(168,85,247,0.8);
  box-shadow: 0 0 0 3px rgba(168,85,247,0.15),
              0 0 15px rgba(168,85,247,0.2);
}

.btn-primary {
  background: linear-gradient(135deg, #9333ea, #7e22ce);
  color: #fff;
  border: 1px solid rgba(168,85,247,0.5);
  font-family: 'Orbitron', monospace;
  font-size: 12px;
  letter-spacing: 1px;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #7e22ce, #6b21a8);
  box-shadow: 0 0 20px rgba(168,85,247,0.4);
}

.btn-ghost {
  background: rgba(0,0,0,0.5);
  color: #9ca3af;
  border: 1px solid rgba(168,85,247,0.2);
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-ghost:hover {
  background: rgba(168,85,247,0.08);
  color: #a855f7;
  border-color: rgba(168,85,247,0.4);
}

.scan-line {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 999;
  opacity: 0.025;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(168,85,247,0.4) 2px,
    rgba(168,85,247,0.4) 4px
  );
}

.hex-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(circle, rgba(168,85,247,0.06) 1px, transparent 1px);
  background-size: 40px 40px;
  z-index: 0;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.15);
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

.logo-mark {
  box-shadow: 0 0 5px rgba(168,85,247,0.2);
}

.tag {
  display: inline-block;
  background: rgba(168,85,247,0.1);
  border: 1px solid rgba(168,85,247,0.25);
  color: #a855f7;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Orbitron', monospace;
  letter-spacing: 0.5px;
}
`}</style>

    {/* Ambient effects */}
    <div className="scan-line" />
    <div className="hex-bg" />
    <div className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(74,222,128,0.12), transparent)' }} />

    {/* ── LEFT SIDEBAR ── */}
    <div className="fixed left-0 top-0 h-full w-[78px] z-50 flex flex-col items-center py-6 gap-2"
      style={{
        background: 'rgba(0,0,0,0.85)',
   borderRight: '1px solid #120038', // match your dark bg
        backdropFilter: 'blur(24px)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.6), inset -1px 0 0 rgba(74,222,128,0.1)'
      }}>
      {/* Logo mark */}
      <div className="w-10 h-10 rounded-xl logo-mark mb-2 flex items-center justify-center"
       style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}>
        <img src="./logo.avif" alt="logo" className="w-9 h-9 object-contain rounded" />
      </div>

      {/* User badge */}
      {user && (
        <div style={{
          width: 48, padding: '4px 0', borderRadius: 8,
          background: 'rgba(168,85,247,0.1', border: '1px solid rgba(168,85,247,0.25)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, marginBottom: 4
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'yellow', boxShadow: '0 0 6px yellow' }} />
          <span style={{ fontSize: 9, color: 'yellow', letterSpacing: '0.5px', fontWeight: 700,
            maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textAlign: 'center', padding: '0 4px' }}>
            {user.username}
          </span>
        </div>
      )}

      <div style={{ width: '40px', height: '1px', background: 'rgba(74,222,128,0.2)', margin: '4px 0 8px' }} />

      <button className="sidebar-btn active" onClick={() => (window.location.href = '/dashboard')}>
        <FaTrophy size={20} />
        <span style={{ fontSize: '10px', marginTop: '4px', letterSpacing: '0.5px', fontWeight: 600 }}>TOUR</span>
      </button>
      <button className="sidebar-btn" onClick={() => window.open('/teams', '_blank', 'noopener,noreferrer')}>
        <FaUsers size={20} />
        <span style={{ fontSize: '10px', marginTop: '4px', letterSpacing: '0.5px', fontWeight: 600 }}>TEAMS</span>
      </button>
      <button className="sidebar-btn" onClick={() => window.open('/displayhud', '_blank', 'noopener,noreferrer')}>
        <FaEye size={20} />
        <span style={{ fontSize: '10px', marginTop: '4px', letterSpacing: '0.5px', fontWeight: 600 }}>HUD</span>
      </button>

      <div style={{ flex: 1 }} />

      <button className="sidebar-btn" onClick={() => window.open('https://discord.com/channels/623776491682922526/1426117227257663558', '_blank')}>
        <FaDiscord size={20} />
        <span style={{ fontSize: '10px', marginTop: '4px', letterSpacing: '0.5px', fontWeight: 600 }}>HELP</span>
      </button>
    </div>

    {/* ── MAIN ── */}
    <main style={{
      marginLeft: '78px',
      padding: '32px 32px 32px 32px',
      position: 'relative',
      zIndex: 1,
      maxWidth: '1360px'
    }}>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="tag">DASHBOARD</span>
        </div>
        <h2 className="orbitron font-black text-white mb-1" style={{ fontSize: '28px', letterSpacing: '1px' }}>
          {t('dashboard.page.title')}
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px', letterSpacing: '0.3px' }}>{t('dashboard.page.subtitle')}</p>
      </div>

      {/* Add button */}
      <button className="btn-primary mb-8" style={{ padding: '12px 28px', fontSize: '13px' }}
        onClick={() => setShowForm(!showForm)}>
        + {t('dashboard.page.addTournament')}
      </button>

      {/* ── CREATE FORM ── */}
      {showForm && (
        <div className="glass-dark neon-border rounded-2xl p-6 mb-8" style={{ maxWidth: '560px' }}>
          <div className="flex items-center gap-2 mb-5">
            <span className="tag">NEW</span>
            <h3 className="orbitron text-white font-bold" style={{ fontSize: '16px' }}>
              {t('dashboard.page.create.title')}
            </h3>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input type="text" name="tournamentName" placeholder={t('dashboard.page.create.name')}
              value={form.tournamentName} onChange={handleChange} className="input-cyber" />
            <div>
              <label htmlFor="tournament-logo-upload" className="input-cyber flex items-center gap-2"
                style={{ cursor: 'pointer', display: 'flex' }}>
                <FaUpload size={14} style={{ color: 'yellow' }} />
                <span>{t('dashboard.page.create.logo')}</span>
              </label>
              <input id="tournament-logo-upload" type="file" accept="image/*"
                onChange={handleTorLogoUpload} style={{ display: 'none' }} />
              {form.torLogo && (
                <img src={form.torLogo} alt="Preview"
                  className="w-20 h-20 object-contain mt-2 rounded-lg"
                  style={{ border: '1px solid rgba(74,222,128,0.4)' }}
                  loading="lazy" onError={(e) => e.currentTarget.src = './logo.png'} />
              )}
            </div>
            {[
              { name: "primaryColor", placeholder: t('dashboard.page.create.primaryColor') },
              { name: "secondaryColor", placeholder: t('dashboard.page.create.secondaryColor') },
              { name: "overlayBg", placeholder: t('dashboard.page.create.overlayBg') },
            ].map((field) => (
              <input key={field.name} type="text" name={field.name}
                placeholder={field.placeholder} value={(form as any)[field.name]}
                onChange={handleChange} className="input-cyber" />
            ))}
            <div className="flex gap-3 pt-1">
              <button type="submit" className="btn-primary">{t('dashboard.page.create.button')}</button>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
                {t('dashboard.page.create.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TOURNAMENT CARDS ── */}
      {tournaments.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {tournaments.map((t) => (
            <div key={t._id} className="card-hover glass rounded-2xl relative overflow-hidden"
              style={{ padding: '0' }}>
              {/* Card top accent bar */}
              <div style={{
                height: '3px',
                background: `linear-gradient(90deg, ${t.primaryColor || '#4ade80'}, ${t.secondaryColor || '#166534'}, transparent)`
              }} />

              <div style={{ padding: '20px' }}>
                {/* Action buttons */}
                <div className="card-actions absolute top-8 right-4 flex gap-2">
                  <button onClick={() => handleEdit(t._id)}
                    style={{ padding: '7px', background: 'rgba(37,99,235,0.85)', borderRadius: '8px', border: 'none', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 12px rgba(59,130,246,0.6)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <FaEdit style={{ color: '#fff' }} size={15} />
                  </button>
                  <button onClick={() => handleDelete(t._id)}
                    style={{ padding: '7px', background: 'rgba(220,38,38,0.85)', borderRadius: '8px', border: 'none', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 12px rgba(239,68,68,0.6)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <FaTrash style={{ color: '#fff' }} size={15} />
                  </button>
                </div>

                <Link to={`/tournaments/${t._id}/rounds`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="flex items-center gap-3 mb-4">
                    {t.torLogo ? (
                      <img src={t.torLogo} alt={t.tournamentName}
                        style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: `1px solid ${t.primaryColor || 'rgba(74,222,128,0.3)'}`, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: 10, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FaTrophy size={22} style={{ color: '#4ade80', opacity: 0.6 }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="orbitron font-bold truncate"
                        style={{ color: t.primaryColor || '#ffffff', fontSize: '15px', letterSpacing: '0.5px' }}>
                        {t.tournamentName}
                      </h3>
                    </div>
                  </div>

                  {/* Color swatches */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 11, color: '#6b7280', marginRight: 4, letterSpacing: '0.5px' }}>COLORS</span>
                    {t.primaryColor && (
                      <div className="color-swatch" style={{ background: t.primaryColor }} title="Primary" />
                    )}
                    {t.secondaryColor && (
                      <div className="color-swatch" style={{ background: t.secondaryColor }} title="Secondary" />
                    )}
                    {t.overlayBg && (
                      <div className="color-swatch" style={{ background: t.overlayBg }} title="Overlay BG" />
                    )}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, color: 'white', opacity: 0.6 }}>Click to view rounds →</span>
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── EMPTY STATE ── */
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(74,222,128,0.15)'
          }}>
            <FaTrophy size={30} style={{ color: '#4ade80', opacity: 0.7 }} />
          </div>
          <h3 className="orbitron font-bold text-white mb-2" style={{ fontSize: '18px' }}>
            {t('dashboard.page.empty.title')}
          </h3>
          <p style={{ color: '#6b7280', marginBottom: 24, fontSize: '14px' }}>{t('dashboard.page.empty.desc')}</p>
          <button className="btn-primary" style={{ padding: '12px 32px' }} onClick={() => setShowForm(true)}>
            + {t('dashboard.page.empty.button')}
          </button>
        </div>
      )}
    </main>

    {/* ── EDIT MODAL ── */}
    {showEditModal && editingTournament && (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 100, padding: '16px'
      }}>
        <div className="glass-dark rounded-2xl"
          style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '28px',
            boxShadow: '0 0 60px rgba(74,222,128,0.15), 0 40px 80px rgba(0,0,0,0.6)' }}>
          <div className="flex items-center gap-2 mb-5">
            <span className="tag">EDIT</span>
            <h3 className="orbitron text-white font-bold" style={{ fontSize: '16px' }}>
              {t('dashboard.page.edit.title')}
            </h3>
          </div>
          <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input type="text" name="tournamentName" value={editForm.tournamentName || ""}
              onChange={handleEditChange} placeholder={t('dashboard.page.edit.name')} className="input-cyber" />
            <div>
              <label htmlFor="edit-tournament-logo-upload" className="input-cyber flex items-center gap-2"
                style={{ cursor: 'pointer', display: 'flex' }}>
                <FaUpload size={14} style={{ color: '#4ade80' }} />
                <span>{t('dashboard.page.edit.logo')}</span>
              </label>
              <input id="edit-tournament-logo-upload" type="file" accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const url = await uploadToCloudinary(file, "tournaments/logos", "team_logo");
                    setEditForm((prev) => ({ ...prev, torLogo: url }));
                  } catch { alert("Upload failed"); }
                }} />
              {editForm.torLogo && (
                <img src={editForm.torLogo} alt="Preview"
                  className="w-20 h-20 object-contain mt-2 rounded-lg"
                  style={{ border: '1px solid rgba(74,222,128,0.4)' }}
                  loading="lazy" onError={(e) => e.currentTarget.src = './logo.png'} />
              )}
            </div>
            {["primaryColor", "secondaryColor", "overlayBg"].map((field) => (
              <input key={field} type="text" name={field}
                value={(editForm as any)[field] || ""}
                onChange={handleEditChange}
                placeholder={t(`dashboard.page.edit.${field}`)}
                className="input-cyber" />
            ))}
            <div className="flex gap-3 pt-1">
              <button type="submit" className="btn-primary">Save Changes</button>
              <button type="button" className="btn-ghost"
                onClick={() => { setEditingTournament(null); setShowEditModal(false); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
);
};

export default Dashboard;
