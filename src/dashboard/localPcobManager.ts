import { io, Socket } from 'socket.io-client';

// Local PCOB game-telemetry server — bundled/launched alongside the Tauri
// desktop app on the tournament operator's own machine (see
// desktop-app\src-tauri\src\commands.rs::launch_server and tauri.conf.json's
// bundle.resources). Only resolves when this browser tab / OBS Browser
// Source runs on that SAME physical machine. Proven reachable from plain
// browser JS (no Tauri/Rust runtime needed) by
// desktop-app\src\dashboard\Component2.tsx, which this manager's parsing
// mirrors.
const LOCAL_SOCKET_URL = 'http://localhost:10086';
const EVENT = 'totalPlayerList';

// PCOB pushes totalPlayerList roughly every ~2s (see fetcher.rs's
// LOCAL_STALL_THRESHOLD comment) — anything quieter than this is treated as
// stale so callers fall back to remote-sourced vitals instead of freezing
// on a player's last-known local values.
const STALE_MS = 8000;
const STALE_CHECK_INTERVAL_MS = 2000;

export interface RawPlayerInfo {
  uId: number | string;
  bHasDied?: boolean;
  liveState?: number;
  health?: number;
  isFiring?: boolean;
  isOutsideBlueCircle?: boolean;
  [key: string]: any;
}

type TotalPlayerListPayload = RawPlayerInfo[] | { playerInfoList: RawPlayerInfo[] };

// PCOB is inconsistent about this shape — a raw array on initial connect,
// `{ playerInfoList: [...] }` on every subsequent push. Mirrors
// desktop-app\src\dashboard\Component2.tsx's extractPlayerList.
const extractPlayerList = (payload: TotalPlayerListPayload): RawPlayerInfo[] => {
  if (Array.isArray(payload)) return payload;
  return payload?.playerInfoList ?? [];
};

type DataListener = (players: RawPlayerInfo[]) => void;
type StaleListener = (stale: boolean) => void;

class LocalPcobManager {
  private static instance: LocalPcobManager;
  private socket: Socket | null = null;
  private dataListeners = new Set<DataListener>();
  private staleListeners = new Set<StaleListener>();
  private lastTickAt: number | null = null;
  private stale = true;
  private staleCheckTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  static getInstance(): LocalPcobManager {
    if (!LocalPcobManager.instance) {
      LocalPcobManager.instance = new LocalPcobManager();
    }
    return LocalPcobManager.instance;
  }

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(LOCAL_SOCKET_URL);

      this.socket.on('connect', () => {
        console.log('[localPcobManager] connected to local PCOB (localhost:10086)');
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[localPcobManager] disconnected:', reason);
      });

      this.socket.on('connect_error', (error: Error) => {
        console.log('[localPcobManager] connection error (is PCOB running on this machine?):', error.message);
      });

      this.socket.on(EVENT, (payload: TotalPlayerListPayload) => {
        const players = extractPlayerList(payload);
        if (!players.length) return;

        this.lastTickAt = Date.now();
        if (this.stale) {
          this.stale = false;
          console.log('[localPcobManager] receiving local ticks again');
          this.staleListeners.forEach((cb) => cb(false));
        }
        this.dataListeners.forEach((cb) => cb(players));
      });

      this.staleCheckTimer = setInterval(() => this.checkStale(), STALE_CHECK_INTERVAL_MS);
    }
    return this.socket;
  }

  private checkStale(): void {
    const isStaleNow = this.lastTickAt === null || Date.now() - this.lastTickAt > STALE_MS;
    if (isStaleNow === this.stale) return;

    this.stale = isStaleNow;
    if (isStaleNow) {
      console.log(`[localPcobManager] stale — no tick in over ${STALE_MS / 1000}s, falling back to remote`);
    }
    this.staleListeners.forEach((cb) => cb(isStaleNow));
  }

  onTotalPlayerList(cb: DataListener): () => void {
    this.dataListeners.add(cb);
    return () => this.dataListeners.delete(cb);
  }

  onStaleChange(cb: StaleListener): () => void {
    this.staleListeners.add(cb);
    return () => this.staleListeners.delete(cb);
  }

  isStale(): boolean {
    return this.stale;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Real teardown (unlike socketManager.tsx's intentional disconnect()
  // no-op) — this connection is opt-in and scoped to one overlay instance's
  // lifetime, not a shared resource other components depend on staying
  // alive for hours unattended.
  disconnect(): void {
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
    if (this.socket) {
      console.log('[localPcobManager] disconnecting');
      this.socket.disconnect();
      this.socket = null;
    }
    this.dataListeners.clear();
    this.staleListeners.clear();
    this.lastTickAt = null;
    this.stale = true;
  }
}

export default LocalPcobManager;
