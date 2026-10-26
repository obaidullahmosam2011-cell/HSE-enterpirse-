import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import AiLabLayout from '../components/AiLabLayout';
import { useAiLabAuth } from '../AiLabAuthContext';

export default function AiLabLogin() {
  const { login } = useAiLabAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await login(email.trim(), password);
      const dest = loc.state?.from || '/ai-lab/dashboard';
      nav(dest, { replace: true });
    } catch (e2) {
      const m = e2?.response?.message || e2?.message || 'Login failed';
      setErr(m.includes('Failed to authenticate') ? 'Invalid email or password.' : m);
    } finally { setBusy(false); }
  };

  return (
    <AiLabLayout>
      <Helmet>
        <title>SYNVOSA AI LAB | Operator Login</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="max-w-md mx-auto">
        <div className="ailab-panel">
          <span className="corner-tr" /><span className="corner-bl" />
          <div className="ailab-panel-head"><span>OPERATOR LOGIN</span><span className="cyan">SECURE</span></div>
          <div className="ailab-panel-body">
            <h1 className="display neon glow text-xl tracking-widest mb-1">ACCESS TERMINAL</h1>
            <p className="dim text-[11px] tracking-[0.16em] uppercase mb-6">Authenticate to enter AI Lab</p>
            <form onSubmit={submit}>
              <div className="ailab-field">
                <label className="ailab-label">Email Address</label>
                <input className="ailab-input" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="operator@synvosa.com" autoComplete="email" />
              </div>
              <div className="ailab-field">
                <label className="ailab-label">Password</label>
                <input className="ailab-input" type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••••" autoComplete="current-password" />
              </div>
              <div className="flex items-center justify-between mb-5">
                <label className="flex items-center gap-2 text-[11px] dim tracking-[0.12em] uppercase cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} className="accent-[var(--neon)]" /> Remember Me
                </label>
                <Link to="/ai-lab/forgot-password" className="text-[10px] cyan tracking-[0.14em] uppercase">Forgot Password?</Link>
              </div>
              <button type="submit" className="ailab-btn solid w-full" disabled={busy}>{busy ? 'AUTHENTICATING...' : 'LOGIN →'}</button>
              <div className="ailab-err">{err}</div>
            </form>
            <p className="mt-4 text-[11px] dim tracking-[0.12em] uppercase text-center">
              No account? <Link to="/ai-lab/register" className="cyan">Create Account</Link>
            </p>
          </div>
        </div>
        <p className="mt-4 text-center"><Link to="/ai-lab" className="text-[10px] dim tracking-[0.14em] uppercase">← BACK TO AI LAB</Link></p>
      </div>
    </AiLabLayout>
  );
}
