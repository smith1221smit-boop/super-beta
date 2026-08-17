import { io, Socket } from "socket.io-client";
import api from "../login/api"; // adjust path if needed

// Remove "/api" from the axios baseURL
const SOCKET_URL = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  /**
   * Returns the shared socket, creating it only the very first time it's
   * needed. Safe to call from as many components as you like — they all
   * share the same underlying connection.
   *
   * IMPORTANT FIX: the previous version re-created the socket whenever
   * `this.socket.disconnected` was true. But a freshly-created socket.io
   * client is `disconnected === true` for the brief async gap between
   * `io(...)` being called and the `'connect'` event actually firing. Any
   * component calling `connect()` during that gap (e.g. two components
   * mounting close together, or React StrictMode double-invoking effects
   * in dev) would see `disconnected === true` and spin up a SECOND socket,
   * silently orphaning the first — each orphan still finishes connecting
   * on its own, leaking a real connection to the server. That's why you'd
   * see "Creating new socket connection" / "Socket connected" logged
   * multiple times for what should be a single shared connection.
   *
   * Fix: only create a socket if one has never been created (`this.socket
   * === null`). Once it exists, `reconnection: true` (already configured
   * below) is responsible for bringing it back after any drop — we no
   * longer tear down and replace it just because it's momentarily
   * disconnected.
   *
   * There is still no "connection count" here — components must NOT call
   * disconnect() when they unmount (see disconnect() below). This
   * connection is meant to live for the lifetime of the browser tab.
   */
  connect(): Socket {
    if (!this.socket) {
      console.log("SocketManager: Creating new socket connection");

      this.socket = io(SOCKET_URL, {
        transports: ["websocket"],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity, // keep trying — this tab may run unattended in OBS for hours
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        // Bandwidth: declares this client can decode msgpack on the
        // dashboard's user:${userKey} liveMatchUpdate (today it's plain
        // JSON there). PERMANENT negotiated default, not a rollout flag —
        // an old/unreloaded tab that never sends this keeps getting plain
        // JSON forever, correctly. See matchDataController.tsx's
        // decodeIncoming for the matching decode step.
        query: { msgpackLiveUpdate: "1" },
      });

      this.socket.on("connect", () => {
        console.log(`[bw][socketManager] connected id=${this.socket?.id} msgpackLiveUpdate=1 (negotiated for user: room liveMatchUpdate)`);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      });

      this.socket.on("disconnect", (reason) => {
        console.log("SocketManager: Socket disconnected:", reason);
        // socket.io's own `reconnection: true` already handles reconnecting
        // the SAME socket instance for us in almost every case. This manual
        // fallback only exists as a belt-and-braces safety net for reasons
        // socket.io itself won't auto-retry (e.g. the server explicitly
        // disconnected the client).
        if (reason === "io server disconnect") {
          this.scheduleReconnect();
        }
      });

      this.socket.on("connect_error", (error) => {
        console.error("SocketManager: Connection error:", error);
        this.scheduleReconnect();
      });
    }

    return this.socket;
  }

  /**
   * Components should call this on unmount ONLY to clean up their own
   * listeners — NOT to tear down the shared socket. This method
   * intentionally does nothing to the underlying connection.
   *
   * Kept as a no-op (rather than deleted) so existing call sites like
   * `socketManager.disconnect()` don't need to be ripped out everywhere —
   * they just stop being destructive.
   */
  disconnect(): void {
    // Intentionally does not touch this.socket.
    // A shared connection must never be closed just because one component
    // (Alerts, LiveStats, Dom, etc.) unmounted or re-ran its effect — other
    // components may still depend on it, and there is no reliable way to
    // count "how many components are actively using it" from here.
    console.log(
      "SocketManager: disconnect() called — no-op, shared socket stays alive"
    );
  }

  /**
   * Use this only for an actual full teardown, e.g. on logout or when the
   * whole app is shutting down — never from a single component's cleanup.
   * This is the only place that should ever set this.socket back to null,
   * so a subsequent connect() correctly creates a fresh instance.
   */
  forceDisconnect(): void {
    if (this.socket) {
      console.log("SocketManager: Force-closing socket connection");
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    console.log("SocketManager: Scheduling reconnection in 3 seconds");

    this.reconnectTimer = setTimeout(() => {
      console.log("SocketManager: Attempting to reconnect");
      // this.socket already exists at this point (it was only ever set to
      // null by forceDisconnect()), so this just nudges socket.io's own
      // reconnection logic rather than creating another instance.
      this.socket?.connect();
      this.reconnectTimer = null;
    }, 3000);
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default SocketManager;