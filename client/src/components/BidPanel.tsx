import { useState, useEffect } from 'react';
import type { BidState, Suit, SeatIndex } from '../types';
import { SUIT_SYMBOLS, SUIT_LABELS } from '../types';

interface BidPanelProps {
  bid: BidState;
  mySeat: SeatIndex | null;
  onBid: (suit: Suit, raiseTo?: number) => void;
  onSkip: () => void;
  phase: 'FIRST_BID' | 'LATE_BID';
}

function BidTimerBar({ timerEndAt }: { timerEndAt: number }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const totalMs = 15000; // rough estimate, just for visual 
    const update = () => {
      const remaining = timerEndAt - Date.now();
      if (remaining <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.max(0, Math.min(100, (remaining / totalMs) * 100)));
    };
    
    update();
    const interval = setInterval(update, 50);
    return () => clearInterval(interval);
  }, [timerEndAt]);

  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-6">
      <div 
        className="h-full bg-[var(--color-gold)] transition-all ease-linear shadow-[0_0_10px_var(--color-gold)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function BidPanel({ bid, mySeat, onBid, onSkip, phase }: BidPanelProps) {
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null);

  if (mySeat === null) return null; // Spectator

  const amIHighest = bid.highestBidderSeat === mySeat;
  const haveIPassed = bid.passedSeats.includes(mySeat);
  const isMyTurnFirst = phase === 'FIRST_BID' && bid.currentBidderSeat === mySeat;
  
  // During FIRST_BID, if it's not my turn, show waiting.
  if (phase === 'FIRST_BID' && !isMyTurnFirst) {
    return (
      <div className="panel p-6 text-center max-w-sm mx-auto">
        <h3 className="text-[var(--color-gold)] uppercase tracking-widest text-sm mb-2">First Bid Phase</h3>
        <p className="font-sans-functional">Waiting for Seat {bid.currentBidderSeat! + 1} to choose...</p>
      </div>
    );
  }

  // During LATE_BID, if I have passed, show waiting.
  if (phase === 'LATE_BID' && haveIPassed) {
    return (
      <div className="panel p-6 text-center max-w-sm mx-auto">
        <h3 className="text-gray-400 uppercase tracking-widest text-sm mb-2">You Passed</h3>
        <p className="font-sans-functional">Waiting for other players to conclude the bidding war.</p>
        <div className="mt-4 text-xs tracking-widest text-[var(--color-gold)] font-bold">
          CURRENT HIGH BID: {bid.bidTarget} {SUIT_LABELS[bid.trumpSuit!]} (Seat {bid.highestBidderSeat! + 1})
        </div>
      </div>
    );
  }

  // Active Bidding Interface
  const isForced = bid.forcedBid && phase === 'FIRST_BID';
  const minRaise = phase === 'LATE_BID' ? bid.bidTarget + 1 : 8; // Actually, First Bid target is 8 normally.
  
  // If we are raising, let's allow clicking a number directly.
  // Actually, we must select a suit first, then a number.
  // Or just pick a suit, and it auto-raises by 1. But spec says "Increase the bid (only higher than current, up to 13)".
  const handleRaise = (val: number) => {
    if (!selectedSuit && phase === 'LATE_BID') {
      // Keep existing trump suit if they don't pick one
      onBid(bid.trumpSuit!, val);
    } else if (selectedSuit) {
      onBid(selectedSuit, val);
    }
  };

  return (
    <div className="panel p-8 max-w-lg mx-auto relative overflow-hidden">
      {/* Decorative border glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-50"></div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold tracking-widest text-[var(--color-gold)] mb-1">
          {phase === 'FIRST_BID' ? (isForced ? 'Forced Bid' : 'Place Your Bid') : 'Bidding War'}
        </h2>
        {phase === 'LATE_BID' && (
          <p className="text-sm text-gray-400 font-sans-functional uppercase tracking-widest">
            Current Highest: <span className="text-white font-bold">{bid.bidTarget} {SUIT_LABELS[bid.trumpSuit!]}</span>
          </p>
        )}
      </div>

      {amIHighest && phase === 'LATE_BID' ? (
        <div className="text-center py-4 font-sans-functional">
          <p className="text-lg text-green-400 font-bold mb-2">You hold the highest bid.</p>
          <p className="text-sm text-gray-400">Waiting to see if anyone challenges you...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Suit Selection */}
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-2 font-sans-functional text-center">
              1. Select Trump Suit {phase === 'LATE_BID' && '(Optional)'}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'] as Suit[]).map(suit => (
                <button
                  key={suit}
                  onClick={() => setSelectedSuit(suit)}
                  className={`py-3 rounded border flex flex-col items-center justify-center transition-all ${
                    selectedSuit === suit 
                      ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 shadow-[0_0_10px_var(--color-gold-glow)]' 
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <span className={`text-2xl ${(suit === 'HEARTS' || suit === 'DIAMONDS') ? 'text-red-500' : 'text-white'}`}>
                    {SUIT_SYMBOLS[suit]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Number Selection */}
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-2 font-sans-functional text-center">
              2. Select Target Tricks
            </div>
            {phase === 'FIRST_BID' ? (
              <button
                className="btn btn-primary w-full py-4 text-lg"
                disabled={!selectedSuit}
                onClick={() => onBid(selectedSuit!)}
              >
                {isForced ? 'Bid 7 (Forced)' : 'Bid 8'}
              </button>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {[9, 10, 11, 12, 13].map(val => (
                  <button
                    key={val}
                    disabled={val < minRaise}
                    onClick={() => handleRaise(val)}
                    className={`btn py-2 text-lg ${
                      val >= minRaise 
                        ? 'btn-primary' 
                        : 'border-white/5 text-white/20 cursor-not-allowed'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Skip Button */}
          {!isForced && (
            <div className="pt-2">
              <button
                onClick={onSkip}
                className="w-full btn btn-secondary py-3"
              >
                {phase === 'FIRST_BID' ? 'Skip' : 'Pass'}
              </button>
            </div>
          )}

          <BidTimerBar timerEndAt={bid.timerEndAt} />
        </div>
      )}
    </div>
  );
}
