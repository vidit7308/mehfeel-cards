import { motion } from 'framer-motion';
import type { PlayedCard, Player, SeatIndex, Suit } from '../types';
import { CardComponent } from './Card';
import { resolveTrick } from '../../../server/src/TrickManager';

interface TrickAreaProps {
  plays: PlayedCard[];
  players: Player[];
  mySeat: SeatIndex;
  currentTurnSeat: SeatIndex | null;
  handSizes: Record<SeatIndex, number>;
  trickNumber: number;
  trumpSuit: Suit | null;
  lastTrickWinner: SeatIndex | null;
}

export function TrickArea({ plays, trickNumber, trumpSuit }: TrickAreaProps) {
  // If we have plays, let's find the current winner so we can maybe highlight it
  const currentWinner = plays.length > 0 && plays[0].card.suit ? resolveTrick(plays, plays[0].card.suit, trumpSuit) : null;

  return (
    <div className="relative w-[300px] h-[300px] flex items-center justify-center pointer-events-none" style={{
      transformStyle: 'preserve-3d',
      transform: 'translateZ(-50px) rotateX(45deg)'
    }}>
      
      {/* Target marker for center table */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[120px] h-[160px] rounded-xl border-2 border-white/10 flex items-center justify-center" style={{ transform: 'translateZ(-1px)' }}>
          <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center">
             <span className="text-[var(--color-gold)]/20 text-xs font-bold font-sans-functional">TRICK {trickNumber}</span>
          </div>
        </div>
      </div>

      {plays.map((p, idx) => {
        // Randomize slight rotation for a messy, realistic stack
        // Use the card's ID as a seed so it doesn't jump around on re-renders
        const seed = p.card.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const randomRotZ = (seed % 30) - 15; // -15 to +15 degrees
        const randomOffsetX = (seed % 20) - 10; // -10 to +10 px
        const randomOffsetY = ((seed * 2) % 20) - 10;

        const isWinning = currentWinner && currentWinner.card.id === p.card.id;

        return (
          <motion.div
            key={p.card.id}
            initial={{ z: 200, opacity: 0, scale: 1.5 }}
            animate={{ 
              z: idx * 4, // Stack them upwards on Z axis
              opacity: 1, 
              scale: 1,
              rotateZ: randomRotZ,
              x: randomOffsetX,
              y: randomOffsetY
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute shadow-[0_10px_20px_rgba(0,0,0,0.5)] rounded-lg"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="relative">
              <CardComponent card={p.card} />
              {isWinning && (
                <div className="absolute inset-0 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.6)] pointer-events-none"></div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
