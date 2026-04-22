import type { PublicGameState, SeatIndex } from '../types';
import { PlayerHand } from './PlayerHand';
import { TrickArea } from './TrickArea';
import { BidPanel } from './BidPanel';
import { MatchTimerBar } from './TimerBar';
import { OpponentHand } from './OpponentHand';
import { SUIT_SYMBOLS } from '../types';

interface GameBoardProps {
  gameState: PublicGameState;
  onPlayCard: (cardId: string) => void;
  onBid: (suit: any, raiseTo?: number) => void;
  onSkip: () => void;
}

function Avatar({ name, isDealer, active }: { name: string; isDealer?: boolean; active?: boolean }) {
  return (
    <div className={`flex flex-col items-center transition-all ${active ? 'scale-110' : 'opacity-70'}`}>
      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-[#111] shadow-lg ${active ? 'border-[var(--color-gold)] shadow-[0_0_15px_var(--color-gold-glow)]' : 'border-white/20'}`}>
        <span className="font-bold text-lg text-white/90">{name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="mt-1 flex items-center gap-1">
        {isDealer && <span className="text-[var(--color-gold)] text-xs font-bold">D</span>}
        <span className="text-xs uppercase tracking-wider text-white/70 font-sans-functional">{name}</span>
      </div>
    </div>
  );
}

export function GameBoard({ gameState, onPlayCard, onBid, onSkip }: GameBoardProps) {
  const { phase, players, mySeat, myHand, handSizes, validCardIds, bid, trick, round, scores, winnerTeam, winReason, settings } = gameState;

  const perspectiveSeat = mySeat !== null ? mySeat : 0;
  const isMyTurn = phase === 'GAMEPLAY' && trick?.currentTurnSeat === mySeat;
  const amSpectator = mySeat === null;

  const topSeat = ((perspectiveSeat + 2) % 4) as SeatIndex;
  const leftSeat = ((perspectiveSeat + 3) % 4) as SeatIndex;
  const rightSeat = ((perspectiveSeat + 1) % 4) as SeatIndex;

  const getPlayer = (s: SeatIndex) => players.find(p => p.seat === s);
  
  const bottomName = amSpectator ? getPlayer(perspectiveSeat)?.name || 'Seat 1' : 'You';
  const topName = getPlayer(topSeat)?.name || `Seat ${topSeat + 1}`;
  const leftName = getPlayer(leftSeat)?.name || `Seat ${leftSeat + 1}`;
  const rightName = getPlayer(rightSeat)?.name || `Seat ${rightSeat + 1}`;

  const isActive = (s: SeatIndex) => trick?.currentTurnSeat === s || bid?.currentBidderSeat === s || (phase === 'LATE_BID' && !bid?.passedSeats.includes(s));

  return (
    <div className="table-3d-container">
      <div className="table-spotlight"></div>

      {/* --- 3D Scene Elements --- */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
        
        {/* Opponents */}
        <OpponentHand position="top" cardCount={handSizes[topSeat] || 0} />
        <OpponentHand position="left" cardCount={handSizes[leftSeat] || 0} />
        <OpponentHand position="right" cardCount={handSizes[rightSeat] || 0} />

        {/* Center Trick Area */}
        <div className="absolute flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
          {trick && (
            <TrickArea
              plays={trick.plays}
              players={players}
              mySeat={perspectiveSeat}
              currentTurnSeat={trick.currentTurnSeat}
              handSizes={handSizes}
              trickNumber={trick.trickNumber}
              trumpSuit={round?.trumpSuit ?? null}
              lastTrickWinner={trick.lastTrickWinner}
            />
          )}
        </div>
      </div>

      {/* --- 2D UI Overlay (Not affected by 3D table rotation) --- */}
      <div className="ui-overlay">
        
        {/* Top Bar */}
        <div className="h-24 w-full flex items-center justify-between px-8 bg-black/40 border-b border-[var(--color-gold)] border-opacity-20 z-20 shrink-0 backdrop-blur-sm pointer-events-auto">
          <div className="flex flex-col items-start w-48">
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] font-sans-functional">Team A</div>
            <div className="text-3xl font-bold drop-shadow-md">{scores.teamA}</div>
          </div>

          <div className="flex-1 flex flex-col items-center gap-3">
            <div className="flex items-center gap-12">
              <Avatar name={leftName} isDealer={round?.shufflerSeat === leftSeat} active={isActive(leftSeat)} />
              <Avatar name={topName} isDealer={round?.shufflerSeat === topSeat} active={isActive(topSeat)} />
              <Avatar name={rightName} isDealer={round?.shufflerSeat === rightSeat} active={isActive(rightSeat)} />
              <Avatar name={bottomName} isDealer={round?.shufflerSeat === perspectiveSeat} active={isActive(perspectiveSeat)} />
            </div>
            <div className="w-full max-w-md">
              <MatchTimerBar startedAt={gameState.matchStartedAt} totalMs={settings.matchTimeLimitMs} />
            </div>
          </div>

          <div className="flex flex-col items-end w-48">
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] font-sans-functional">Team B</div>
            <div className="text-3xl font-bold drop-shadow-md">{scores.teamB}</div>
          </div>
        </div>

        {/* Middle UI Area (Bidding Panel, Side Info) */}
        <div className="flex-1 w-full flex items-center justify-between px-8 pointer-events-none">
          {/* Left Info */}
          <div className="w-48 flex flex-col pointer-events-auto">
            {round?.trumpSuit && (
              <div className="panel p-4 text-center bg-black/60">
                <div className="text-[var(--color-gold)] text-3xl mb-1">{SUIT_SYMBOLS[round.trumpSuit]}</div>
                <div className="text-xs uppercase tracking-widest text-white/70 font-sans-functional">Trump</div>
                <div className="mt-3 border-t border-white/10 pt-3">
                  <div className="text-2xl font-bold">{round.bidTarget}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--color-gold)] font-sans-functional">Target Bid</div>
                </div>
              </div>
            )}
          </div>

          {/* Center Bidding Panel */}
          <div className="flex-1 flex justify-center pointer-events-auto relative z-50">
            {(phase === 'FIRST_BID' || phase === 'LATE_BID') && bid && !amSpectator && (
               <div className="transform -translate-y-12">
                 <BidPanel
                   bid={bid}
                   mySeat={mySeat}
                   onBid={onBid}
                   onSkip={onSkip}
                   phase={phase as 'FIRST_BID' | 'LATE_BID'}
                 />
               </div>
            )}
          </div>

          {/* Right Info */}
          <div className="w-48 flex flex-col gap-4 pointer-events-auto">
             <div className="panel p-4 text-center bg-black/60">
                <div className="text-xs uppercase tracking-widest text-[var(--color-gold)] mb-1 font-sans-functional">Team A Won</div>
                <div className="text-2xl font-bold">{round?.tricksWon.teamA || 0}</div>
             </div>
             <div className="panel p-4 text-center bg-black/60">
                <div className="text-xs uppercase tracking-widest text-[var(--color-gold)] mb-1 font-sans-functional">Team B Won</div>
                <div className="text-2xl font-bold">{round?.tricksWon.teamB || 0}</div>
             </div>
          </div>
        </div>

        {/* Bottom Area: Player Hand */}
        <div className="w-full flex justify-center h-[180px] pointer-events-auto relative z-40">
           {!amSpectator && (
              <PlayerHand
                hand={myHand}
                validCardIds={validCardIds}
                isMyTurn={isMyTurn}
                onPlayCard={onPlayCard}
              />
           )}
        </div>
      </div>

      {/* --- Full Screen Overlays --- */}
      {phase === 'ROUND_END' && (
         <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center pointer-events-auto">
            <div className="panel bg-black/60 p-12 text-center max-w-lg w-full">
               <h2 className="text-3xl text-[var(--color-gold)] font-bold mb-6 tracking-widest uppercase">Round Complete</h2>
               <div className="mb-8 text-lg font-sans-functional">
                 <p className="mb-2">Team {round?.bidTeam === 0 ? 'A' : 'B'} bid <span className="font-bold text-white">{round?.bidTarget}</span>.</p>
                 <p>They secured <span className="font-bold text-white">{round?.bidTeam === 0 ? round?.tricksWon.teamA : round?.tricksWon.teamB}</span> tricks.</p>
               </div>
            </div>
         </div>
      )}

      {phase === 'GAME_OVER' && (
         <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center pointer-events-auto">
            <div className="panel bg-black/80 p-16 text-center max-w-2xl w-full border-[var(--color-gold)] border-opacity-50 border-2">
               <h1 className="text-5xl font-bold text-[var(--color-gold)] mb-4 tracking-[0.2em] uppercase shadow-[var(--color-gold)] drop-shadow-lg">Game Over</h1>
               <p className="text-2xl font-bold text-white mb-8 tracking-widest">Team {winnerTeam === 0 ? 'A' : 'B'} Triumphs</p>
               <p className="text-gray-400 italic mb-10 font-sans-functional">{winReason}</p>
               
               <div className="flex justify-center gap-16 text-4xl font-bold">
                 <div className="flex flex-col items-center">
                   <div className="text-sm text-[var(--color-gold)] uppercase tracking-[0.2em] mb-2 font-sans-functional">Team A</div>
                   {scores.teamA}
                 </div>
                 <div className="flex flex-col items-center">
                   <div className="text-sm text-[var(--color-gold)] uppercase tracking-[0.2em] mb-2 font-sans-functional">Team B</div>
                   {scores.teamB}
                 </div>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}
