import { io, Socket } from "socket.io-client";
import api from "../login/api"; // adjust path if needed

// Remove "/api" from the axios baseURL
const SOCKET_URL = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private connectionCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  connect(): Socket {
    this.connectionCount++;

    if (!this.socket || this.socket.disconnected) {
      console.log("SocketManager: Creating new socket connection");

      this.socket = io(SOCKET_URL, {
        transports: ["websocket"],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
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
        if (
          reason === "io server disconnect" ||
          reason === "transport close"
        ) {
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

  disconnect(): void {
    this.connectionCount = Math.max(0, this.connectionCount - 1);

    console.log(
      `SocketManager: Disconnect requested. Active connections: ${this.connectionCount}`
    );

    if (this.connectionCount === 0 && this.socket) {
      console.log("SocketManager: Closing socket connection");
      this.socket.disconnect();
      this.socket = null;

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.connectionCount === 0) return;

    console.log("SocketManager: Scheduling reconnection in 3 seconds");

    this.reconnectTimer = setTimeout(() => {
      if (this.connectionCount > 0) {
        console.log("SocketManager: Attempting to reconnect");
        this.connect();
      }
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