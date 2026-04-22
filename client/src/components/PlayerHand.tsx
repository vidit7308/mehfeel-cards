import { motion } from 'framer-motion';
import type { Card as CardType } from '../types';
import { CardComponent } from './Card';

interface PlayerHandProps {
  hand: CardType[];
  validCardIds: string[];
  isMyTurn: boolean;
  onPlayCard: (id: string) => void;
}

export function PlayerHand({ hand, validCardIds, isMyTurn, onPlayCard }: PlayerHandProps) {
  // Sort hand: by suit, then by rank (value)
  const sortedHand = [...hand].sort((a, b) => {
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
    return a.value - b.value;
  });

  const totalCards = sortedHand.length;

  return (
    <div className="relative w-full max-w-3xl h-full flex justify-center items-end pb-4 perspective-1000">
      {sortedHand.map((card, idx) => {
        const isPlayable = isMyTurn && validCardIds.includes(card.id);
        
        // Calculate curve for realistic fan
        const spread = Math.min(70, totalCards * 5); // Angle spread: max 70 degrees
        const startAngle = -spread / 2;
        const angleStep = totalCards > 1 ? spread / (totalCards - 1) : 0;
        const angle = startAngle + idx * angleStep;
        
        // Y offset for the arc shape
        const normalizedX = totalCards > 1 ? (idx - (totalCards - 1) / 2) / ((totalCards - 1) / 2 || 1) : 0;
        const yOffset = Math.pow(normalizedX, 2) * 45; 
        
        // Slight X translation to fan them out properly
        const xOffset = normalizedX * (totalCards * 15);

        return (
          <motion.div
            key={card.id}
            initial={{ y: 200, opacity: 0, rotateZ: 0 }}
            animate={{ 
              y: yOffset,
              rotateZ: angle,
              opacity: 1,
              x: xOffset,
              // Add tiny Z offsets to stack them correctly
              z: idx
            }}
            whileHover={isPlayable ? { 
              y: yOffset - 40, 
              scale: 1.15,
              rotateZ: angle * 0.5, // Straighten slightly on hover
              zIndex: 100
            } : {}}
            transition={{ type: "spring", stiffness: 250, damping: 25 }}
            style={{ 
              position: 'absolute',
              zIndex: idx,
              transformOrigin: 'bottom center',
              transformStyle: 'preserve-3d'
            }}
          >
            <div className={`transition-all duration-300 ${isPlayable ? 'shadow-[0_15px_30px_rgba(0,0,0,0.5)]' : 'shadow-md'}`}>
               <CardComponent
                 card={card}
                 playable={isPlayable}
                 onClick={() => isPlayable ? onPlayCard(card.id) : undefined}
               />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
