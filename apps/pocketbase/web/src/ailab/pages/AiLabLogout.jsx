import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAiLabAuth } from '../AiLabAuthContext';

export default function AiLabLogout() {
  const { logout } = useAiLabAuth();
  const nav = useNavigate();
  useEffect(() => { logout(); nav('/ai-lab/login', { replace: true }); }, [logout, nav]);
  return (
    <div className="ailab">
      <Helmet><title>SYNVOSA AI LAB | Logging out</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <div className="ailab-content flex items-center justify-center min-h-screen">
        <p className="display neon glow tracking-widest">SESSION TERMINATED...</p>
      </div>
    </div>
  );
}
