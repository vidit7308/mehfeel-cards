import { useState } from 'react';
import type { PublicGameState, SeatIndex, MatchSettings } from '../types';

interface WaitingRoomProps {
  gameState: PublicGameState;
  roomCode: string;
  socketId: string;
  setSeat: (seat: SeatIndex) => void;
  swapSeats: (seatA: SeatIndex, seatB: SeatIndex) => void;
  updateSettings: (settings: Partial<MatchSettings>) => void;
  startGame: () => void;
}

export function WaitingRoom({
  gameState, roomCode, socketId,
  setSeat, swapSeats, updateSettings, startGame
}: WaitingRoomProps) {
  
  const isHost = gameState.hostSocketId === socketId;
  const amSpectator = gameState.spectators.some(s => s.id === socketId);

  const [draggedSeat, setDraggedSeat] = useState<SeatIndex | null>(null);

  const handleDrop = (targetSeat: SeatIndex) => {
    if (draggedSeat !== null && draggedSeat !== targetSeat) {
      swapSeats(draggedSeat, targetSeat);
    }
    setDraggedSeat(null);
  };

  const filledSeatsCount = gameState.players.filter(p => p.seat !== null).length;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg-dark)]">
      <div className="flex gap-6 w-full max-w-5xl">
        
        {/* Left Column: Seating */}
        <div className="flex-1 panel p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-[var(--color-gold)] tracking-widest uppercase">Waiting Room</h2>
              <p className="text-sm text-white/50 mt-1 font-sans-functional">Room Code: <span className="font-bold tracking-widest text-white">{roomCode}</span></p>
            </div>
            {isHost && (
              <button
                className="btn btn-primary"
                disabled={filledSeatsCount < 4}
                onClick={startGame}
              >
                {filledSeatsCount < 4 ? `Waiting for players (${filledSeatsCount}/4)...` : 'Start Game'}
              </button>
            )}
            {!isHost && (
              <div className="text-sm text-gray-500">
                Waiting for host to start...
              </div>
            )}
          </div>

          <div className="mb-4 text-sm font-sans-functional text-white/70">
            Seating (Click empty seat to join. {isHost ? 'Drag to swap.' : ''})
          </div>

          <div className="grid grid-cols-2 gap-4 font-sans-functional">
            {([0, 1, 2, 3] as SeatIndex[]).map((seat) => {
              const p = gameState.players.find(x => x.seat === seat);
              const teamLabel = seat % 2 === 0 ? 'Team A' : 'Team B';
              const teamColor = seat % 2 === 0 ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10' : 'border-white/40 bg-white/5';

              return (
                <div
                  key={seat}
                  draggable={isHost && !!p}
                  onDragStart={() => setDraggedSeat(seat)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => isHost && handleDrop(seat)}
                  onClick={() => !p && !amSpectator && setSeat(seat)}
                  className={`p-6 rounded border transition-all ${p ? teamColor : 'border-dashed border-white/20'} ${!p && !amSpectator ? 'cursor-pointer hover:border-white/50 hover:bg-white/5' : ''} ${isHost && p ? 'cursor-grab active:cursor-grabbing' : ''}`}
                >
                  <div className="text-[10px] text-[var(--color-gold)] font-bold uppercase tracking-widest mb-2">Seat {seat + 1} • {teamLabel}</div>
                  {p ? (
                    <div className="font-bold text-lg flex items-center gap-2 text-white">
                      {p.name}
                      {p.id === socketId && <span className="px-2 py-0.5 bg-[var(--color-gold)] text-black text-[10px] rounded uppercase tracking-wider">You</span>}
                    </div>
                  ) : (
                    <div className="text-white/30 italic text-sm">Empty</div>
                  )}
                </div>
              );
            })}
          </div>

          {gameState.spectators.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/10 font-sans-functional">
              <h3 className="text-xs uppercase tracking-widest font-bold text-[var(--color-gold)] mb-4">Spectators</h3>
              <div className="flex flex-wrap gap-2">
                {gameState.spectators.map(s => (
                  <span key={s.id} className="px-3 py-1 bg-white/10 rounded text-sm text-white/80 border border-white/5">
                    {s.name} {s.id === socketId ? '(You)' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Host Settings */}
        {isHost && (
          <div className="w-80 panel p-6 font-sans-functional">
            <h3 className="text-sm font-bold mb-6 border-b border-white/10 pb-4 text-[var(--color-gold)] uppercase tracking-widest">Match Settings</h3>
            
            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Match Time Limit (min)</label>
                <input
                  type="number" min={5} max={120}
                  value={gameState.settings.matchTimeLimitMs / 60000}
                  onChange={(e) => updateSettings({ matchTimeLimitMs: Number(e.target.value) * 60000 })}
                  className="w-full px-4 py-2 border border-white/10 bg-white/5 rounded text-sm outline-none focus:border-[var(--color-gold)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Bid Timer (sec)</label>
                <input
                  type="number" min={5} max={60}
                  value={gameState.settings.bidTimerSec}
                  onChange={(e) => updateSettings({ bidTimerSec: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-white/10 bg-white/5 rounded text-sm outline-none focus:border-[var(--color-gold)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Turn Timer (sec)</label>
                <input
                  type="number" min={5} max={60}
                  value={gameState.settings.turnTimerSec}
                  onChange={(e) => updateSettings({ turnTimerSec: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-white/10 bg-white/5 rounded text-sm outline-none focus:border-[var(--color-gold)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Center Table Logo URL</label>
                <input
                  type="text" placeholder="https://..."
                  value={gameState.settings.logoUrl}
                  onChange={(e) => updateSettings({ logoUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-white/10 bg-white/5 rounded text-sm outline-none focus:border-[var(--color-gold)]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
