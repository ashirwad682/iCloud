import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      const token = localStorage.getItem('cv_access_token');
      const wsUrl = (import.meta as any).env?.VITE_WS_URL || (import.meta as any).env?.VITE_API_URL || undefined;
      this.socket = io(wsUrl, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        // console.log('⚡ Connected to CloudVault Real-time Gateway');
      });
    }
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
