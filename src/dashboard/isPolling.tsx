import React, { useState, useEffect, useMemo, useRef } from "react";
import api from "../login/api";
import SocketManager from "./socketManager";

interface Selection {
  _id: string;
  matchId: string;
  roundId: {
    _id: string;
    apiEnable: boolean;
    roundName: string;
  };
  tournamentId: string;
  createdAt: string;
  isSelected: boolean;
  isPollingActive: boolean;
}

interface PollingManagerProps {
  // Optional context from DisplayHud — when provided, PollingManager shows
  // the polling/live-data status for THIS tournament+round (whatever the
  // operator currently has open in the HUD), instead of falling back to
  // "whichever match happens to be flagged isSelected somewhere". Because
  // these come from DisplayHud's own React state, changing the dropdown
  // there re-renders this component with fresh props immediately — no
  // page refresh needed.
  tournamentId?: string;
  roundId?: string;
  // Optional label (e.g. "Match 3") so the status pill can say what it's
  // actually reporting on.
  matchLabel?: string;
}

const PollingManager: React.FC<PollingManagerProps> = ({ tournamentId, roundId, matchLabel }) => {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Live-data-arrival tracking — separate from "is polling toggled on".
  // This answers "is real match data actually flowing right now", which is
  // what an operator staring at this for hours actually needs to know.
  const [lastDataAt, setLastDataAt] = useState<number | null>(null);
  const [pulsing, setPulsing] = useState(false);
  const pulseTimeoutRef = useRef<number | null>(null);
  const [, forceTick] = useState(0); // re-render once/sec to keep "Xs ago" fresh

  // --- Fetch initial selections (unchanged) ---
  useEffect(() => {
    api
      .get<Selection[]>("/matchSelection/selected")
      .then((res) => {
        const uniqueSelections = Array.from(
          new Map(res.data.map((item) => [item._id, item])).values()
        );
        setSelections(uniqueSelections);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // --- Socket setup for selection/polling-toggle events ---
  // FIX: this now runs ONCE (mount-only deps), and cleans up its own
  // listeners with socket.off(...) before the shared socket could ever
  // accumulate duplicates. Previously this effect depended on
  // [activeMatchId] and re-subscribed on every change without ever
  // removing the old handlers — each stale handler kept firing forever
  // on the shared singleton socket.
  useEffect(() => {
    const socketManager = SocketManager.getInstance();
    const socket = socketManager.connect();

    const handlePollingStatusUpdated = (updated: Selection) => {
      setSelections((prev) =>
        prev.map((s) =>
          s._id === updated._id ? { ...s, isPollingActive: updated.isPollingActive } : s
        )
      );
    };

    const handleMatchSelected = ({ selected }: { selected: Selection }) => {
      setSelections((prev) => {
        const updatedPrev = prev.map((s) => ({ ...s, isSelected: false }));
        const index = updatedPrev.findIndex((s) => s._id === selected._id);
        if (index !== -1) {
          updatedPrev[index] = { ...selected, isSelected: true };
          return updatedPrev;
        }
        return [...updatedPrev, { ...selected, isSelected: true }];
      });
    };

    const handleMatchDeselected = ({ matchId }: { matchId: string }) => {
      setSelections((prev) =>
        prev.map((s) =>
          s._id === matchId ? { ...s, isSelected: false, isPollingActive: false } : s
        )
      );
    };

    const handleMatchDeleted = ({ matchId }: { matchId: string }) => {
      setSelections((prev) => prev.filter((s) => s._id !== matchId));
    };

    socket.on("pollingStatusUpdated", handlePollingStatusUpdated);
    socket.on("matchSelected", handleMatchSelected);
    socket.on("matchDeselected", handleMatchDeselected);
    socket.on("matchDeleted", handleMatchDeleted);

    return () => {
      socket.off("pollingStatusUpdated", handlePollingStatusUpdated);
      socket.off("matchSelected", handleMatchSelected);
      socket.off("matchDeselected", handleMatchDeselected);
      socket.off("matchDeleted", handleMatchDeleted);
      socketManager.disconnect(); // no-op, shared socket stays alive — kept for parity
    };
  }, []);

  // --- Which selection is "active"? ---
  // If DisplayHud told us the current tournament+round via props, prefer
  // the selection that actually matches it — this is what makes the panel
  // track whatever the operator is looking at right now, instead of an
  // arbitrary "first selected match" guess.
  const activeSelection = useMemo(() => {
    if (tournamentId && roundId) {
      const match = selections.find((s) => {
        const sRoundId = typeof s.roundId === "object" ? s.roundId._id : s.roundId;
        return s.tournamentId === tournamentId && sRoundId === roundId;
      });
      if (match) return match;
    }

    const apiEnabledSelections = selections.filter(
      (s) => s.roundId && typeof s.roundId === "object" && s.roundId.apiEnable
    );
    if (apiEnabledSelections.length > 0) {
      return apiEnabledSelections.find((s) => s.isSelected) || apiEnabledSelections[0];
    }
    return selections.find((s) => s.isSelected) || selections[0] || null;
  }, [selections, tournamentId, roundId]);

  const hasApiEnabled =
    !!activeSelection?.roundId &&
    typeof activeSelection.roundId === "object" &&
    activeSelection.roundId.apiEnable;

  // Derived, not separately-tracked state — this is what used to go stale
  // across the three places the old code manually mirrored it.
  const buttonState = !!(activeSelection?.isPollingActive && hasApiEnabled);

  const activeTournamentId = activeSelection?.tournamentId;
  const activeRoundId =
    activeSelection?.roundId && typeof activeSelection.roundId === "object"
      ? activeSelection.roundId._id
      : (activeSelection?.roundId as unknown as string | undefined);

  // Reset the "last data" indicator whenever the active round changes, so
  // stale freshness from a previous match can't linger on screen.
  useEffect(() => {
    setLastDataAt(null);
    setPulsing(false);
  }, [activeTournamentId, activeRoundId]);

  // --- Live data confirmation ---
  // Joins the same bulk room PublicThemeRenderer uses and listens for the
  // actual 'bulkUpdate' event. Every time one arrives while polling is on,
  // this flashes the indicator and updates "last data Xs ago" — a real
  // confirmation that match data is flowing, not just that the toggle is
  // switched on.
  useEffect(() => {
    if (!activeTournamentId || !activeRoundId || !buttonState) return;

    const socketManager = SocketManager.getInstance();
    const socket = socketManager.connect();
    socket.emit("joinBulkRoom", { tournamentId: activeTournamentId, roundId: activeRoundId });

    const handleBulkUpdate = () => {
      setLastDataAt(Date.now());
      setPulsing(true);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = window.setTimeout(() => setPulsing(false), 900);
    };

    socket.on("bulkUpdate", handleBulkUpdate);

    return () => {
      socket.off("bulkUpdate", handleBulkUpdate);
      socket.emit("leaveBulkRoom", { tournamentId: activeTournamentId, roundId: activeRoundId });
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, [activeTournamentId, activeRoundId, buttonState]);

  // Tick once a second so "Xs ago" stays live without needing new data.
  useEffect(() => {
    if (!buttonState) return;
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [buttonState]);

  const secondsSinceData = lastDataAt !== null ? Math.max(0, Math.floor((Date.now() - lastDataAt) / 1000)) : null;

  // --- Toggle polling for the active match ---
  const handleTogglePollingForActive = async () => {
    if (!activeSelection) return;
    if (!hasApiEnabled) return;

    const newState = !activeSelection.isPollingActive;
    const prevSelections = selections;

    // Optimistic update — buttonState is derived, so this alone flips the UI.
    setSelections((prev) =>
      prev.map((s) => (s._id === activeSelection._id ? { ...s, isPollingActive: newState } : s))
    );

    setUpdating(true);
    try {
      const roundIdStr = typeof activeSelection.roundId === "object" ? activeSelection.roundId._id : activeSelection.roundId;
      await api.patch(
        `/matchSelection/${activeSelection.tournamentId}/${roundIdStr}/${activeSelection.matchId}/polling`,
        { isPollingActive: newState }
      );
    } catch (err) {
      console.error("Failed to update polling:", err);
      setSelections(prevSelections); // roll back optimistic update
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="w-4 h-4 border-2 border-gray-600 border-t-purple-500 rounded-full animate-spin"></div>
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  if (!activeSelection) return null;

  // Three distinct states now, instead of just LIVE/PAUSED:
  //  - PAUSED: polling toggled off
  //  - LIVE (waiting): polling is on, but no bulkUpdate has arrived yet
  //  - LIVE (Xs ago): polling is on AND data is confirmed flowing
  const statusLabel = !buttonState
    ? "PAUSED"
    : secondsSinceData === null
      ? "LIVE — waiting for data"
      : `LIVE • data ${secondsSinceData}s ago`;

  const statusColor = !buttonState ? "gray" : secondsSinceData === null ? "amber" : "green";

  return (
    <div className="flex items-center gap-3">
      {matchLabel && (
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{matchLabel}</span>
      )}

      {/* Status Indicator */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-shadow duration-300 ${
          statusColor === "green"
            ? "bg-green-900/20 border-green-500/30"
            : statusColor === "amber"
              ? "bg-amber-900/20 border-amber-500/30"
              : "bg-gray-800/50 border-gray-700"
        } ${pulsing ? "shadow-[0_0_14px_rgba(34,197,94,0.55)]" : ""}`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            statusColor === "green"
              ? `bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] ${pulsing ? "" : "animate-pulse"}`
              : statusColor === "amber"
                ? "bg-amber-500 animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                : "bg-gray-500"
          }`}
        ></div>
        <span
          className={`text-xs font-medium uppercase tracking-wider ${
            statusColor === "green" ? "text-green-400" : statusColor === "amber" ? "text-amber-400" : "text-gray-500"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Toggle Button */}
      <button
        onClick={handleTogglePollingForActive}
        disabled={updating || !hasApiEnabled}
        className={`
          relative flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200
          ${!hasApiEnabled
            ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700'
            : buttonState
              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-900/30 hover:from-green-500 hover:to-green-600 active:scale-[0.98]'
              : 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-900/30 hover:from-red-500 hover:to-red-600 active:scale-[0.98]'
          }
          ${updating ? 'opacity-70' : ''}
        `}
        title={!hasApiEnabled ? 'API not enabled for this round' : ''}
      >
        {updating ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Updating...</span>
          </>
        ) : (
          <div className={`relative w-10 h-5 rounded-full transition-colors ${buttonState ? 'bg-green-400' : 'bg-gray-600'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${buttonState ? 'left-5' : 'left-0.5'}`}></div>
          </div>
        )}
      </button>

      {!hasApiEnabled && (
        <span className="text-xs text-yellow-500/70 italic">API disabled</span>
      )}
    </div>
  );
};

export default PollingManager;