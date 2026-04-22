import { GameEngine } from './GameEngine';

export class RoomManager {
  private rooms: Map<string, GameEngine> = new Map();

  createRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(io: any, hostSocketId: string, matchTimeLimitMs: number): GameEngine {
    const code = this.createRoomCode();
    const engine = new GameEngine(io, code, hostSocketId, matchTimeLimitMs);
    this.rooms.set(code, engine);
    return engine;
  }

  getRoom(code: string): GameEngine | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  handleDisconnect(socketId: string) {
    for (const engine of this.rooms.values()) {
      engine.disconnectPlayer(socketId);
      engine.broadcast();
    }
  }

  reconnect(socketId: string, oldSocketId: string) {
    for (const engine of this.rooms.values()) {
      engine.reconnectPlayer(socketId, oldSocketId);
      engine.broadcast();
    }
  }
}
