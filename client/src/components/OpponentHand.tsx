import { motion } from 'framer-motion';
import { CardBack } from './Card';

interface OpponentHandProps {
  position: 'top' | 'left' | 'right';
  cardCount: number;
}

export function OpponentHand({ position, cardCount }: OpponentHandProps) {
  // We want to create a fan layout of face-down cards.
  const cards = Array.from({ length: cardCount });

  let containerClass = "absolute z-20 flex items-center justify-center pointer-events-none ";
  
  // 3D placement relative to the table center
  // Top: sits flat on the far side
  // Left/Right: sits flat on the sides, rotated to face inward
  if (position === 'top') {
    containerClass += "top-[10%] left-1/2 -translate-x-1/2";
  } else if (position === 'left') {
    containerClass += "top-1/2 left-[10%] -translate-y-1/2";
  } else if (position === 'right') {
    containerClass += "top-1/2 right-[10%] -translate-y-1/2";
  }

  return (
    <div className={containerClass}>
      <div className="relative w-[100px] h-[100px] flex items-center justify-center" style={{
        // Orient the entire hand container in 3D space
        transformStyle: 'preserve-3d',
        transform: position === 'top' 
          ? 'translateZ(-200px) rotateX(60deg) scale(0.8)' 
          : position === 'left'
            ? 'translateZ(-100px) rotateY(40deg) rotateX(40deg) rotateZ(90deg) scale(0.8)'
            : 'translateZ(-100px) rotateY(-40deg) rotateX(40deg) rotateZ(-90deg) scale(0.8)'
      }}>
        {cards.map((_, idx) => {
          // Calculate curve
          const spread = Math.min(50, cardCount * 5);
          const startAngle = -spread / 2;
          const angleStep = cardCount > 1 ? spread / (cardCount - 1) : 0;
          const angle = startAngle + idx * angleStep;
          
          // Y offset for arc
          const normalizedX = cardCount > 1 ? (idx - (cardCount - 1) / 2) / ((cardCount-1) / 2 || 1) : 0; // -1 to 1
          const yOffset = Math.pow(normalizedX, 2) * 20; 

          return (
            <motion.div
              key={idx}
              initial={false}
              animate={{ 
                y: yOffset,
                rotateZ: angle,
                x: normalizedX * (cardCount * 6)
              }}
              style={{ 
                position: 'absolute',
                zIndex: idx,
                transformOrigin: 'bottom center',
                transformStyle: 'preserve-3d',
                // Add a slight translation upwards on Z so cards stack realistically
                translateZ: idx * 2
              }}
            >
              <div className="card-container shadow-xl">
                 <CardBack />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
