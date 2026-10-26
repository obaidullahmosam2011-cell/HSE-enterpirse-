import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAiLabAuth } from '../AiLabAuthContext';
import MatrixBackground from './MatrixBackground';

const NAV = [
  { to: '/ai-lab/dashboard', label: 'DASHBOARD' },
  { to: '/ai-lab/vision', label: 'AI VISION' },
  { to: '/ai-lab/air-drawing', label: 'AIR DRAWING' },
  { to: '/ai-lab/challenges', label: 'CHALLENGES' },
  { to: '/ai-lab/profile', label: 'PROFILE' },
];

export default function AiLabLayout({ children, console = false }) {
  const { user, isAuthed, logout } = useAiLabAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [matrix, setMatrix] = useState(() => localStorage.getItem('ailab_matrix') === '1');

  useEffect(() => {
    document.body.classList.toggle('ailab-matrix-on', matrix);
    const el = document.getElementById('ailab-root');
    if (el) el.classList.toggle('matrix-mode', matrix);
    localStorage.setItem('ailab_matrix', matrix ? '1' : '0');
  }, [matrix]);

  return (
    <div id="ailab-root" className={`ailab ${matrix ? 'matrix-mode' : ''}`}>
      <MatrixBackground intense={matrix} />
      <div className="ailab-grid-overlay" />
      <div className="ailab-scanlines" />
      <div className="ailab-vignette" />
      <div className="ailab-content">
        {/* Top HUD bar */}
        <header className="border-b border-[var(--line)] bg-[rgba(2,6,10,0.7)] backdrop-blur">
          <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <Link to="/ai-lab" className="flex items-center gap-3">
              <span className="display neon glow text-lg sm:text-xl tracking-widest">SYNVOSA<span className="cyan"> AI LAB</span></span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {isAuthed && NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-3 py-1.5 text-[10px] tracking-[0.16em] uppercase border ${loc.pathname === n.to ? 'border-[var(--neon)] text-[var(--neon)] bg-[rgba(0,255,156,0.08)]' : 'border-transparent text-[var(--text-dim)] hover:text-[var(--neon)]'}`}
                >
                  {n.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-2 text-[10px] tracking-[0.16em] uppercase dim">
                <span className="ailab-dot" /> SYSTEM ONLINE
              </span>
              <button
                onClick={() => setMatrix((m) => !m)}
                className={`ailab-btn sm ${matrix ? 'solid' : ''}`}
                title="Toggle Matrix Mode"
              >
                MATRIX {matrix ? 'ON' : 'OFF'}
              </button>
              {isAuthed ? (
                <button onClick={() => { logout(); nav('/ai-lab/login'); }} className="ailab-btn sm red">LOGOUT</button>
              ) : (
                <Link to="/ai-lab/login" className="ailab-btn sm">LOGIN</Link>
              )}
            </div>
          </div>
          {isAuthed && (
            <div className="md:hidden border-t border-[var(--line-soft)] overflow-x-auto">
              <div className="flex gap-1 px-2 py-2 whitespace-nowrap">
                {NAV.map((n) => (
                  <Link key={n.to} to={n.to} className={`px-3 py-1.5 text-[10px] tracking-[0.14em] uppercase border ${loc.pathname === n.to ? 'border-[var(--neon)] text-[var(--neon)]' : 'border-transparent text-[var(--text-dim)]'}`}>{n.label}</Link>
                ))}
              </div>
            </div>
          )}
        </header>

        <main className="max-w-[1400px] mx-auto px-4 py-6">{children}</main>

        <footer className="border-t border-[var(--line-soft)] mt-8">
          <div className="max-w-[1400px] mx-auto px-4 py-5 text-[10px] tracking-[0.16em] uppercase dim flex flex-wrap items-center justify-between gap-3">
            <span>SYNVOSA AI LAB · EXPERIMENTAL COMPUTER VISION SYSTEM</span>
            <span className="cyan">LOCAL AI PROCESSING · NO VIDEO UPLOADED</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
