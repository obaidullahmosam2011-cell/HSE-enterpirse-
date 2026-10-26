import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import AiLabLayout from '../components/AiLabLayout';
import { useAiLabAuth } from '../AiLabAuthContext';

const strongPw = (pw) => pw.length >= 10 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);

export default function AiLabRegister() {
  const { signup, login } = useAiLabAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (form.name.trim().length < 2) return setErr('Enter your full name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return setErr('Enter a valid email address.');
    if (!strongPw(form.password)) return setErr('Password must be 10+ chars with upper, lower, number and symbol.');
    if (form.password !== form.confirm) return setErr('Passwords do not match.');
    setBusy(true);
    try {
      await signup(form.name.trim(), form.email.trim(), form.password);
      await login(form.email.trim(), form.password);
      nav('/ai-lab/dashboard', { replace: true });
    } catch (e2) {
      const m = e2?.response?.message || e2?.message || 'Registration failed';
      if (m.includes('already') || (e2?.status === 400)) setErr('That email is already registered.');
      else setErr(m);
    } finally { setBusy(false); }
  };

  return (
    <AiLabLayout>
      <Helmet>
        <title>SYNVOSA AI LAB | Operator Registration</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="max-w-md mx-auto">
        <div className="ailab-panel">
          <span className="corner-tr" /><span className="corner-bl" />
          <div className="ailab-panel-head"><span>NEW OPERATOR</span><span className="cyan">REGISTER</span></div>
          <div className="ailab-panel-body">
            <h1 className="display neon glow text-xl tracking-widest mb-1">CREATE ACCOUNT</h1>
            <p className="dim text-[11px] tracking-[0.16em] uppercase mb-6">Request access to AI Lab</p>
            <form onSubmit={submit}>
              <div className="ailab-field">
                <label className="ailab-label">Full Name</label>
                <input className="ailab-input" required value={form.name} onChange={set('name')} placeholder="Your full name" autoComplete="name" />
              </div>
              <div className="ailab-field">
                <label className="ailab-label">Email Address</label>
                <input className="ailab-input" type="email" required value={form.email} onChange={set('email')} placeholder="operator@synvosa.com" autoComplete="email" />
              </div>
              <div className="ailab-field">
                <label className="ailab-label">Password</label>
                <input className="ailab-input" type="password" required value={form.password} onChange={set('password')} placeholder="10+ chars, A a 1 !" autoComplete="new-password" />
                <p className="text-[10px] dim mt-1">10+ chars with upper, lower, number and symbol.</p>
              </div>
              <div className="ailab-field">
                <label className="ailab-label">Confirm Password</label>
                <input className="ailab-input" type="password" required value={form.confirm} onChange={set('confirm')} placeholder="Re-enter password" autoComplete="new-password" />
              </div>
              <button type="submit" className="ailab-btn solid w-full" disabled={busy}>{busy ? 'CREATING...' : 'CREATE ACCOUNT →'}</button>
              <div className="ailab-err">{err}</div>
            </form>
            <p className="mt-4 text-[11px] dim tracking-[0.12em] uppercase text-center">
              Already have an account? <Link to="/ai-lab/login" className="cyan">Login</Link>
            </p>
          </div>
        </div>
        <p className="mt-4 text-center"><Link to="/ai-lab" className="text-[10px] dim tracking-[0.14em] uppercase">← BACK TO AI LAB</Link></p>
      </div>
    </AiLabLayout>
  );
}
