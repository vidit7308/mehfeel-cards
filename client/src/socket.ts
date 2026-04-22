import { io } from 'socket.io-client';

// During development Vite proxies /socket.io → localhost:3001
// In production set VITE_SERVER_URL to your Render/Railway backend
const SERVER_URL = import.meta.env.DEV 
  ? '' // Uses Vite proxy in development
  : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'); // Fallback to localhost if not set in production

export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

export default socket;
