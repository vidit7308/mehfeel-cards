import type { TeamScores, Player, SeatIndex } from '../types';

interface ScoreBoardProps {
  scores: TeamScores;
  delta: TeamScores | null;
  players: Player[];
  mySeat: SeatIndex | null;
  shufflerSeat?: SeatIndex;
}

export function ScoreBoard({ scores, shufflerSeat }: ScoreBoardProps) {
  return (
    <div className="flex items-center gap-6">
      
      {/* Dealer Badge */}
      {shufflerSeat !== undefined && (
        <div className="flex items-center gap-2 text-xs bg-black/40 px-3 py-1 rounded">
          <span className="text-gray-400">DEALER:</span>
          <span className="font-bold text-white">Seat {shufflerSeat + 1}</span>
        </div>
      )}

      {/* Scores */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Team A</div>
          <div className="text-xl font-bold font-mono">
            {scores.teamA}
          </div>
        </div>
        
        <div className="w-px h-8 bg-white/20 self-center"></div>

        <div className="flex flex-col items-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-red-300">Team B</div>
          <div className="text-xl font-bold font-mono">
            {scores.teamB}
          </div>
        </div>
      </div>

    </div>
  );
}
