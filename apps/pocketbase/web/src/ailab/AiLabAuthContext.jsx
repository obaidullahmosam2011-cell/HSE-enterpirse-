import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';

// SYNVOSA AI LAB — isolated auth context for the `ai_users` collection.
// Completely separate from the main website's `users` auth system.
const AiLabAuthContext = createContext(null);

const FAIL_KEY = 'ailab_fail_count';
const LOCK_KEY = 'ailab_lock_until';

export const AiLabAuthProvider = ({ children }) => {
  const [user, setUser] = useState(pb.authStore.record);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rec = pb.authStore.record;
    if (rec && rec.collectionName === 'ai_users') {
      setUser(rec);
    } else {
      setUser(null);
    }
    setLoading(false);
    const unsub = pb.authStore.onChange((_token, record) => {
      if (record && record.collectionName === 'ai_users') setUser(record);
      else setUser(null);
    });
    return () => unsub();
  }, []);

  const login = useCallback(async (email, password) => {
    const lockUntil = Number(localStorage.getItem(LOCK_KEY) || 0);
    if (Date.now() < lockUntil) {
      const secs = Math.ceil((lockUntil - Date.now()) / 1000);
      throw new Error(`Too many attempts. Locked for ${secs}s.`);
    }
    try {
      const rec = await pb.collection('ai_users').authWithPassword(email, password);
      localStorage.removeItem(FAIL_KEY);
      localStorage.removeItem(LOCK_KEY);
      try {
        await pb.collection('ai_users').update(rec.id, {
          last_login: new Date().toISOString().replace('T', ' ').slice(0, 19),
        });
      } catch (_) { /* non-fatal */ }
      try {
        await pb.collection('ai_login_logs').create({
          user: rec.id,
          success: true,
          user_agent: navigator.userAgent.slice(0, 300),
        });
      } catch (_) { /* non-fatal */ }
      return rec;
    } catch (err) {
      const count = Number(localStorage.getItem(FAIL_KEY) || 0) + 1;
      localStorage.setItem(FAIL_KEY, String(count));
      if (count >= 5) {
        localStorage.setItem(LOCK_KEY, String(Date.now() + 60000));
      }
      throw err;
    }
  }, []);

  const signup = useCallback(async (fullName, email, password) => {
    return pb.collection('ai_users').create({
      email,
      password,
      passwordConfirm: password,
      full_name: fullName,
      role: 'user',
      status: 'active',
      usage_count: 0,
    });
  }, []);

  const logout = useCallback(() => {
    pb.authStore.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!pb.authStore.record || pb.authStore.record.collectionName !== 'ai_users') return;
    try {
      const fresh = await pb.collection('ai_users').getOne(pb.authStore.record.id);
      setUser(fresh);
    } catch (_) { /* ignore */ }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthed: !!(user && user.collectionName === 'ai_users'),
      loading,
      login,
      signup,
      logout,
      refreshUser,
    }),
    [user, loading, login, signup, logout, refreshUser],
  );

  return <AiLabAuthContext.Provider value={value}>{children}</AiLabAuthContext.Provider>;
};

export const useAiLabAuth = () => useContext(AiLabAuthContext);
export default AiLabAuthContext;
