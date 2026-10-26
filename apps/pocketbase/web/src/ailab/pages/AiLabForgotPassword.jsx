import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import AiLabLayout from '../components/AiLabLayout';
import pb from '@/lib/pocketbaseClient';

export default function AiLabForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setMsg(''); setBusy(true);
    try {
      // Uses PocketBase's built-in password-reset flow (isolated to ai_users).
      await pb.collection('ai_users').requestPasswordReset(email.trim());
      setMsg('Password reset link sent. Check your email inbox (and spam folder).');
    } catch (e2) {
      setErr(e2?.message || 'Request failed. Try again.');
    } finally { setBusy(false); }
  };

  return (
    <AiLabLayout>
      <Helmet>
        <title>SYNVOSA AI LAB | Forgot Password</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="max-w-md mx-auto">
        <div className="ailab-panel">
          <span className="corner-tr" /><span className="corner-bl" />
          <div className="ailab-panel-head"><span>PASSWORD RESET</span><span className="amber">RECOVERY</span></div>
          <div className="ailab-panel-body">
            <h1 className="display neon glow text-xl tracking-widest mb-1">FORGOT PASSWORD</h1>
            <p className="dim text-[11px] tracking-[0.16em] uppercase mb-6">Enter your email to receive a reset link</p>
            <form onSubmit={submit}>
              <div className="ailab-field">
                <label className="ailab-label">Email Address</label>
                <input className="ailab-input" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="operator@synvosa.com" autoComplete="email" />
              </div>
              <button type="submit" className="ailab-btn solid w-full" disabled={busy}>{busy ? 'SENDING...' : 'SEND RESET LINK →'}</button>
              <div className="ailab-err">{err}</div>
              {msg && <p className="mt-3 text-[11px] neon tracking-[0.1em]">{msg}</p>}
            </form>
            <p className="mt-4 text-[11px] dim tracking-[0.12em] uppercase text-center">
              <Link to="/ai-lab/login" className="cyan">← Back to Login</Link>
            </p>
          </div>
        </div>
      </div>
    </AiLabLayout>
  );
}
