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
   * Returns the shared socket, creating it if it doesn't exist yet or if it
   * has actually dropped. Safe to call from as many components as you like —
   * they all share the same underlying connection.
   *
   * IMPORTANT: there is no "connection count" here anymore. Components must
   * NOT call disconnect() when they unmount — see disconnect() below. This
   * connection is meant to live for the lifetime of the browser tab.
   */
  connect(): Socket {
    if (!this.socket || this.socket.disconnected) {
      console.log("SocketManager: Creating new socket connection");

      this.socket = io(SOCKET_URL, {
        transports: ["websocket"],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity, // keep trying — this tab may run unattended in OBS for hours
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on("connect", () => {
        console.log("SocketManager: Socket connected");
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      });

      this.socket.on("disconnect", (reason) => {
        console.log("SocketManager: Socket disconnected:", reason);
        // socket.io's own `reconnection: true` already handles reconnecting
        // for us in almost every case. This manual fallback only exists as
        // a belt-and-braces safety net for reasons socket.io itself won't
        // auto-retry.
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
      this.connect();
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