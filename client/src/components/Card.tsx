import { motion } from 'framer-motion';
import type { Card as CardType } from '../types';
import { SUIT_SYMBOLS } from '../types';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  playable?: boolean;
  small?: boolean;
  style?: React.CSSProperties;
}

export function CardComponent({ card, onClick, playable = false, small = false, style }: CardProps) {
  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
  const colorClass = isRed ? 'text-red-600' : 'text-gray-900';

  return (
    <motion.div
      className={`card-container ${small ? 'w-[60px] h-[84px]' : 'w-[80px] h-[112px]'}`}
      style={style}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div
        onClick={playable ? onClick : undefined}
        className={`card ${colorClass} ${playable ? 'card-playable' : ''} ${!playable && onClick ? 'card-invalid' : ''}`}
      >
        <div className="flex flex-col items-start leading-none">
          <span className={`font-bold ${small ? 'text-sm' : 'text-lg'}`}>{card.rank}</span>
          <span className={small ? 'text-xs' : 'text-sm'}>{SUIT_SYMBOLS[card.suit]}</span>
        </div>
        
        {/* Large center symbol */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <span className={`${small ? 'text-4xl' : 'text-6xl'}`}>{SUIT_SYMBOLS[card.suit]}</span>
        </div>

        <div className="flex flex-col items-end leading-none rotate-180">
          <span className={`font-bold ${small ? 'text-sm' : 'text-lg'}`}>{card.rank}</span>
          <span className={small ? 'text-xs' : 'text-sm'}>{SUIT_SYMBOLS[card.suit]}</span>
        </div>
      </div>
    </motion.div>
  );
}

export function CardBack({ small = false, style }: { small?: boolean; style?: React.CSSProperties }) {
  return (
    <div className={`card-container ${small ? 'w-[60px] h-[84px]' : 'w-[80px] h-[112px]'}`} style={style}>
      <div className="card-back" />
    </div>
  );
}
