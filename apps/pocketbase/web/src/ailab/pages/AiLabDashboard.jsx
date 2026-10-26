import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import AiLabLayout from '../components/AiLabLayout';
import Terminal from '../components/Terminal';
import { useAiLabAuth } from '../AiLabAuthContext';
import pb from '@/lib/pocketbaseClient';

const MODULES = [
  { to: '/ai-lab/vision', icon: '◉', t: 'AI VISION', d: 'Live webcam face, hand, finger, gesture & pose tracking' },
  { to: '/ai-lab/vision', icon: '✋', t: 'HAND TRACKING', d: '21-point hand landmarks, left / right / both' },
  { to: '/ai-lab/vision', icon: '✌', t: 'FINGER COUNTER', d: 'Real-time finger count 0–10' },
  { to: '/ai-lab/vision', icon: '⌖', t: 'GESTURE CONTROL', d: 'Fist, palm, thumbs up, peace, pointing, OK' },
  { to: '/ai-lab/vision', icon: '🧍', t: 'POSE DETECTION', d: 'Body skeleton landmark overlay' },
  { to: '/ai-lab/vision', icon: '▢', t: 'OBJECT SCANNER', d: 'Detect common objects with confidence %' },
  { to: '/ai-lab/air-drawing', icon: '✎', t: 'AIR DRAWING', d: 'Draw in the air with your index finger' },
  { to: '/ai-lab/challenges', icon: '⚑', t: 'AI CHALLENGES', d: 'Complete vision-based challenges for score' },
];

export default function AiLabDashboard() {
  const { user, refreshUser } = useAiLabAuth();
  const [logs, setLogs] = useState([]);

  useEffect(() => { refreshUser(); }, [refreshUser]);
  useEffect(() => {
    pb.collection('ai_login_logs').getList(1, 5, { sort: '-created', filter: `user = "${user?.id}"` })
      .then((r) => setLogs(r.items)).catch(() => {});
  }, [user?.id]);

  return (
    <AiLabLayout>
      <Helmet>
        <title>SYNVOSA AI LAB | Dashboard</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
        <div>
          <div className="ailab-panel mb-6">
            <span className="corner-tr" /><span className="corner-bl" />
            <div className="ailab-panel-head"><span>OPERATOR WELCOME</span><span className="cyan">ACCESS GRANTED</span></div>
            <div className="ailab-panel-body">
              <h1 className="display neon glow text-2xl tracking-widest mb-1">WELCOME, {String(user?.full_name || 'OPERATOR').toUpperCase()}</h1>
              <p className="dim text-[11px] tracking-[0.16em] uppercase mb-4">SYNVOSA AI LAB · Neural Vision Console</p>
              <div className="flex flex-wrap gap-3">
                <Link to="/ai-lab/vision" className="ailab-btn solid">LAUNCH AI VISION →</Link>
                <Link to="/ai-lab/challenges" className="ailab-btn cyan">AI CHALLENGES</Link>
                <Link to="/ai-lab/air-drawing" className="ailab-btn amber">AIR DRAWING</Link>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULES.map((m, i) => (
              <Link to={m.to} key={i} className="ailab-mod">
                <span className="ico">{m.icon}</span>
                <span className="t neon">{m.t}</span>
                <span className="d">{m.d}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="ailab-panel">
            <span className="corner-tr" /><span className="corner-bl" />
            <div className="ailab-panel-head"><span>SYSTEM STATUS</span><span className="cyan">ONLINE</span></div>
            <div className="ailab-panel-body text-[11px] space-y-2">
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">System</span><span className="neon flex items-center gap-2"><span className="ailab-dot" />ONLINE</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">AI Engine</span><span className="neon">READY</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Camera</span><span className="amber">OFFLINE</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Processing</span><span className="cyan">LOCAL</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Model Status</span><span className="neon">MEDIAPIPE</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Operator</span><span className="neon">{user?.email}</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Last Login</span><span className="dim">{user?.last_login ? new Date(user.last_login).toLocaleString() : '—'}</span></div>
            </div>
          </div>

          <div className="ailab-panel min-h-[200px]">
            <span className="corner-tr" /><span className="corner-bl" />
            <div className="ailab-panel-head"><span>SYSTEM TERMINAL</span><span className="cyan">LIVE</span></div>
            <div className="ailab-panel-body p-0 h-[200px]"><Terminal extra={[`> OPERATOR ${user?.email} AUTHENTICATED`, '> DASHBOARD LOADED']} /></div>
          </div>

          <div className="ailab-panel">
            <span className="corner-tr" /><span className="corner-bl" />
            <div className="ailab-panel-head"><span>RECENT LOGINS</span><span className="cyan">LOG</span></div>
            <div className="ailab-panel-body text-[11px] space-y-1.5">
              {logs.length === 0 && <p className="dim">No login logs yet.</p>}
              {logs.map((l) => (
                <div key={l.id} className="flex justify-between"><span className="neon">✓ AUTH</span><span className="dim">{new Date(l.created).toLocaleString()}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AiLabLayout>
  );
}
