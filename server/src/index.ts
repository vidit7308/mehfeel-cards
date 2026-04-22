import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './RoomManager';
import { EV } from './types';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Create Room
  socket.on(EV.CREATE_ROOM, ({ name, matchTimeLimitMs }) => {
    const engine = roomManager.createRoom(io, socket.id, matchTimeLimitMs);
    engine.addPlayer(socket.id, name);
    socket.join(engine.state.roomCode);
    socket.emit(EV.ROOM_CREATED, engine.state.roomCode);
    engine.broadcast();
  });

  // Join Room
  socket.on(EV.JOIN_ROOM, ({ code, name }) => {
    const engine = roomManager.getRoom(code);
    if (!engine) {
      socket.emit(EV.ROOM_ERROR, 'Room not found');
      return;
    }
    const res = engine.addPlayer(socket.id, name);
    if (!res.ok) {
      socket.emit(EV.ROOM_ERROR, res.error);
      return;
    }
    socket.join(code);
    socket.emit(EV.ROOM_JOINED, code);
    engine.broadcast();
  });

  // Join Spectator
  socket.on(EV.JOIN_SPECTATOR, ({ code, name }) => {
    const engine = roomManager.getRoom(code);
    if (!engine) {
      socket.emit(EV.ROOM_ERROR, 'Room not found');
      return;
    }
    engine.addSpectator(socket.id, name);
    socket.join(code);
    socket.emit(EV.ROOM_JOINED, code);
    engine.broadcast();
  });

  // Seating
  socket.on(EV.SET_SEAT, ({ code, seat }) => {
    const engine = roomManager.getRoom(code);
    if (engine) engine.setSeat(socket.id, seat);
  });

  socket.on(EV.SWAP_SEATS, ({ code, seatA, seatB }) => {
    const engine = roomManager.getRoom(code);
    if (engine) engine.swapSeats(socket.id, seatA, seatB);
  });

  // Settings
  socket.on(EV.UPDATE_SETTINGS, ({ code, settings }) => {
    const engine = roomManager.getRoom(code);
    if (engine) engine.updateSettings(socket.id, settings);
  });

  // Start game (host only)
  socket.on('start_game', ({ code }) => {
    const engine = roomManager.getRoom(code);
    if (engine) {
      const res = engine.startGame(socket.id);
      if (!res.ok) socket.emit(EV.ROOM_ERROR, res.error);
    }
  });

  // Gameplay actions
  socket.on(EV.PLACE_BID, ({ code, suit, raiseTo }) => {
    const engine = roomManager.getRoom(code);
    if (!engine) return;
    const res = engine.handleBid(socket.id, suit, raiseTo);
    if (!res.ok) socket.emit(EV.INVALID_ACTION, res.error);
  });

  socket.on(EV.SKIP_BID, ({ code }) => {
    const engine = roomManager.getRoom(code);
    if (!engine) return;
    const res = engine.handleSkip(socket.id);
    if (!res.ok) socket.emit(EV.INVALID_ACTION, res.error);
  });

  socket.on(EV.PLAY_CARD, ({ code, cardId }) => {
    const engine = roomManager.getRoom(code);
    if (!engine) return;
    const res = engine.handlePlayCard(socket.id, cardId);
    if (!res.ok) socket.emit(EV.INVALID_ACTION, res.error);
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🃏 Gambit server running on http://localhost:${PORT}`);
});
