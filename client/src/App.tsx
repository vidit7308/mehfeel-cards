import { useGameState } from './hooks/useGameState';
import { Lobby } from './components/Lobby';
import { WaitingRoom } from './components/WaitingRoom';
import { GameBoard } from './components/GameBoard';
import socket from './socket';

export default function App() {
  const {
    gameState,
    error,
    roomCode,
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
  } = useGameState();

  const phase = gameState?.phase;

  if (!roomCode || !gameState) {
    return (
      <Lobby
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onJoinSpectator={joinSpectator}
        error={error}
      />
    );
  }

  if (phase === 'LOBBY') {
    return (
      <WaitingRoom
        gameState={gameState}
        roomCode={roomCode}
        socketId={socket.id || ''}
        setSeat={setSeat}
        swapSeats={swapSeats}
        updateSettings={updateSettings}
        startGame={startGame}
      />
    );
  }

  return (
    <GameBoard
      gameState={gameState}
      onPlayCard={playCard}
      onBid={placeBid}
      onSkip={skipBid}
    />
  );
}
