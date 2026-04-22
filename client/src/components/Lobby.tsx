import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface LobbyProps {
  onCreateRoom: (name: string, matchTimeLimitMs: number) => void;
  onJoinRoom: (code: string, name: string) => void;
  onJoinSpectator: (code: string, name: string) => void;
  error: string | null;
}

export function Lobby({ onCreateRoom, onJoinRoom, onJoinSpectator, error }: LobbyProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [timeLimitMin, setTimeLimitMin] = useState(30);
  
  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'guest'>('guest');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState('');

  const [tab, setTab] = useState<'create' | 'join'>('create');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setName(session.user.email?.split('@')[0] || 'Player');
        setAuthMode('guest'); // Bypass auth screen if already logged in
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
         setName(session.user.email?.split('@')[0] || 'Player');
         setAuthMode('guest');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent, isSignUp = false) => {
    e.preventDefault();
    setAuthError('');
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
      
    if (error) setAuthError(error.message);
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateRoom(name.trim(), timeLimitMin * 60 * 1000);
  };

  const handleJoin = () => {
    if (!name.trim() || !code.trim()) return;
    onJoinRoom(code.trim().toUpperCase(), name.trim());
  };

  const handleSpectate = () => {
    if (!name.trim() || !code.trim()) return;
    onJoinSpectator(code.trim().toUpperCase(), name.trim());
  }

  // --- Auth Screen ---
  if (authMode === 'login' && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg-dark)]">
        <div className="panel flex flex-col gap-6 p-10 w-full max-w-md">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold tracking-[0.2em] text-[var(--color-gold)] mb-2 uppercase">GAMBIT</h1>
            <p className="text-xs text-white/50 uppercase tracking-[0.3em]">Player Authentication</p>
          </div>
          
          <form className="flex flex-col gap-4 font-sans-functional">
            <input
              type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--color-gold)]"
            />
            <input
              type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--color-gold)]"
            />
            <div className="flex gap-3 mt-2">
              <button onClick={(e) => handleLogin(e, false)} className="btn btn-primary flex-1 py-3">Login</button>
              <button onClick={(e) => handleLogin(e, true)} className="btn btn-secondary flex-1 py-3">Sign Up</button>
            </div>
            
            {authError && <div className="text-red-500 text-xs text-center mt-2">{authError}</div>}
            
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-white/30 text-xs uppercase tracking-widest">OR</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>
            
            <button type="button" onClick={() => setAuthMode('guest')} className="btn border border-white/5 text-white/50 hover:text-white py-3">
              Continue as Guest
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Main Lobby Screen ---
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg-dark)]">
      <div className="panel flex flex-col gap-8 p-10 w-full max-w-md relative">
        
        {user && (
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-[10px] text-[var(--color-gold)] uppercase tracking-widest">{user.email}</span>
            <button onClick={() => supabase.auth.signOut()} className="text-[10px] text-white/40 hover:text-white uppercase">Logout</button>
          </div>
        )}

        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-[0.2em] text-[var(--color-gold)] mb-2 uppercase drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">GAMBIT</h1>
          <p className="text-xs text-white/50 uppercase tracking-[0.3em]">Cinematic Edition</p>
        </div>

        <div className="flex flex-col gap-2 font-sans-functional">
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">Your Name</label>
          <input
            type="text"
            maxLength={16}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Atlas"
            className="w-full px-4 py-3 rounded border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]"
          />
        </div>

        <div className="flex bg-white/5 p-1 rounded font-sans-functional border border-white/10">
          {(['create', 'join'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                tab === t ? 'bg-[var(--color-gold)] text-black shadow' : 'text-white/50 hover:text-white'
              }`}
            >
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        {tab === 'create' && (
          <div className="flex flex-col gap-6 font-sans-functional">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">Match Time Limit</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={10} max={60} step={5}
                  value={timeLimitMin}
                  onChange={(e) => setTimeLimitMin(Number(e.target.value))}
                  className="flex-1 accent-[var(--color-gold)]"
                />
                <span className="font-bold text-lg w-16 text-right text-white">{timeLimitMin} min</span>
              </div>
            </div>
            <button className="btn btn-primary w-full py-4" onClick={handleCreate} disabled={!name.trim()}>
              Create Private Match
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="flex flex-col gap-6 font-sans-functional">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">Room Code</label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB3X7Z"
                className="w-full px-4 py-3 rounded border border-white/10 bg-white/5 font-bold text-2xl text-center tracking-[0.4em] uppercase text-[var(--color-gold)] outline-none focus:border-[var(--color-gold)]"
              />
            </div>
            <div className="flex gap-3">
              <button className="btn btn-primary flex-1 py-4" onClick={handleJoin} disabled={!name.trim() || code.length !== 6}>
                Join as Player
              </button>
              <button className="btn btn-secondary flex-1 py-4" onClick={handleSpectate} disabled={!name.trim() || code.length !== 6}>
                Spectate
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-sm font-bold text-red-500 bg-red-950/50 py-3 rounded border border-red-500/30">
            ⚠ {error}
          </div>
        )}
      </div>
    </div>
  );
}
