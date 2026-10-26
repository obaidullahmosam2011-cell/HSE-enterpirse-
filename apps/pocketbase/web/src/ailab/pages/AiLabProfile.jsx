import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import AiLabLayout from '../components/AiLabLayout';
import { useAiLabAuth } from '../AiLabAuthContext';
import pb from '@/lib/pocketbaseClient';

export default function AiLabProfile() {
  const { user, refreshUser } = useAiLabAuth();
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const changePw = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (pw.next.length < 10 || !/[a-z]/.test(pw.next) || !/[A-Z]/.test(pw.next) || !/[0-9]/.test(pw.next) || !/[^A-Za-z0-9]/.test(pw.next)) {
      return setErr('New password must be 10+ chars with upper, lower, number and symbol.');
    }
    if (pw.next !== pw.confirm) return setErr('New passwords do not match.');
    setBusy(true);
    try {
      await pb.collection('ai_users').authWithPassword(user.email, pw.current);
      await pb.collection('ai_users').update(user.id, { password: pw.next, passwordConfirm: pw.confirm });
      setMsg('Password changed successfully.');
      setPw({ current: '', next: '', confirm: '' });
    } catch (e2) {
      setErr('Current password incorrect or update failed.');
    } finally { setBusy(false); }
  };

  return (
    <AiLabLayout>
      <Helmet><title>SYNVOSA AI LAB | Operator Profile</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <div className="max-w-2xl mx-auto">
        <div className="ailab-panel mb-6">
          <span className="corner-tr" /><span className="corner-bl" />
          <div className="ailab-panel-head"><span>OPERATOR PROFILE</span><span className="cyan">CLEARANCE</span></div>
          <div className="ailab-panel-body">
            <h1 className="display neon glow text-xl tracking-widest mb-4">{user?.full_name}</h1>
            <div className="grid sm:grid-cols-2 gap-4 text-[12px]">
              <div><div className="ailab-label">Full Name</div><div className="neon">{user?.full_name}</div></div>
              <div><div className="ailab-label">Email</div><div className="cyan">{user?.email}</div></div>
              <div><div className="ailab-label">Registration Date</div><div className="dim">{user?.created ? new Date(user.created).toLocaleString() : '—'}</div></div>
              <div><div className="ailab-label">Last Login</div><div className="dim">{user?.last_login ? new Date(user.last_login).toLocaleString() : '—'}</div></div>
              <div><div className="ailab-label">Role</div><div className="neon">{user?.role || 'user'}</div></div>
              <div><div className="ailab-label">Status</div><div className="neon">{user?.status || 'active'}</div></div>
            </div>
            <p className="mt-4 text-[10px] dim tracking-[0.14em] uppercase">Passwords are never displayed. All credentials are hashed server-side.</p>
          </div>
        </div>

        <div className="ailab-panel">
          <span className="corner-tr" /><span className="corner-bl" />
          <div className="ailab-panel-head"><span>CHANGE PASSWORD</span><span className="amber">SECURE</span></div>
          <div className="ailab-panel-body">
            <form onSubmit={changePw}>
              <div className="ailab-field"><label className="ailab-label">Current Password</label><input className="ailab-input" type="password" required value={pw.current} onChange={(e)=>setPw({...pw, current:e.target.value})} autoComplete="current-password" /></div>
              <div className="ailab-field"><label className="ailab-label">New Password</label><input className="ailab-input" type="password" required value={pw.next} onChange={(e)=>setPw({...pw, next:e.target.value})} autoComplete="new-password" /></div>
              <div className="ailab-field"><label className="ailab-label">Confirm New Password</label><input className="ailab-input" type="password" required value={pw.confirm} onChange={(e)=>setPw({...pw, confirm:e.target.value})} autoComplete="new-password" /></div>
              <button type="submit" className="ailab-btn solid" disabled={busy}>{busy ? 'UPDATING...' : 'UPDATE PASSWORD →'}</button>
              <div className="ailab-err">{err}</div>
              {msg && <p className="mt-3 text-[11px] neon tracking-[0.1em]">{msg}</p>}
            </form>
          </div>
        </div>
      </div>
    </AiLabLayout>
  );
}
