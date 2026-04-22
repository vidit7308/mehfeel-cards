import { useState, useEffect, useCallback } from 'react';
import socket from '../socket';
import type { PublicGameState, Suit, SeatIndex, MatchSettings } from '../types';
import { EV } from '../types';

export function useGameState() {
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [trumpBreak, setTrumpBreak] = useState(false);

  useEffect(() => {
    socket.on(EV.ROOM_CREATED, (code: string) => {
      setRoomCode(code);
      setError(null);
    });

    socket.on(EV.ROOM_JOINED, (code: string) => {
      setRoomCode(code);
      setError(null);
    });

    socket.on(EV.ROOM_ERROR, (err: string) => {
      setError(err);
      setTimeout(() => setError(null), 5000);
    });

    socket.on(EV.INVALID_ACTION, (err: string) => {
      setError(err);
      setTimeout(() => setError(null), 3000);
    });

    socket.on(EV.GAME_STATE_UPDATE, (state: PublicGameState) => {
      setGameState(state);
    });

    socket.on(EV.TRUMP_BREAK, () => {
      setTrumpBreak(true);
      setTimeout(() => setTrumpBreak(false), 600);
    });

    // We don't really need to do much on trick_complete unless we want specific animations
    socket.on(EV.TRICK_COMPLETE, () => {
      // reserved for future animation triggers
    });

    return () => {
      socket.off(EV.ROOM_CREATED);
      socket.off(EV.ROOM_JOINED);
      socket.off(EV.ROOM_ERROR);
      socket.off(EV.INVALID_ACTION);
      socket.off(EV.GAME_STATE_UPDATE);
      socket.off(EV.TRUMP_BREAK);
      socket.off(EV.TRICK_COMPLETE);
    };
  }, []);

  const createRoom = useCallback((name: string, matchTimeLimitMs: number) => {
    socket.emit(EV.CREATE_ROOM, { name, matchTimeLimitMs });
  }, []);

  const joinRoom = useCallback((code: string, name: string) => {
    socket.emit(EV.JOIN_ROOM, { code, name });
  }, []);

  const joinSpectator = useCallback((code: string, name: string) => {
    socket.emit(EV.JOIN_SPECTATOR, { code, name });
  }, []);

  const setSeat = useCallback((seat: SeatIndex) => {
    if (roomCode) socket.emit(EV.SET_SEAT, { code: roomCode, seat });
  }, [roomCode]);

  const swapSeats = useCallback((seatA: SeatIndex, seatB: SeatIndex) => {
    if (roomCode) socket.emit(EV.SWAP_SEATS, { code: roomCode, seatA, seatB });
  }, [roomCode]);

  const updateSettings = useCallback((settings: Partial<MatchSettings>) => {
    if (roomCode) socket.emit(EV.UPDATE_SETTINGS, { code: roomCode, settings });
  }, [roomCode]);

  const startGame = useCallback(() => {
    if (roomCode) socket.emit('start_game', { code: roomCode });
  }, [roomCode]);

  const placeBid = useCallback((suit: Suit, raiseTo?: number) => {
    if (roomCode) socket.emit(EV.PLACE_BID, { code: roomCode, suit, raiseTo });
  }, [roomCode]);

  const skipBid = useCallback(() => {
    if (roomCode) socket.emit(EV.SKIP_BID, { code: roomCode });
  }, [roomCode]);

  const playCard = useCallback((cardId: string) => {
    if (roomCode) socket.emit(EV.PLAY_CARD, { code: roomCode, cardId });
  }, [roomCode]);

  return {
    gameState,
    error,
    roomCode,
    trumpBreak,
    createRoom,
    joinRoom,
    joinSpectator,
    setSeat,
    swapSeats,
    updateSettings,
    startGame,
    placeBid,
    skipBid,
    playCard,
  };
}
