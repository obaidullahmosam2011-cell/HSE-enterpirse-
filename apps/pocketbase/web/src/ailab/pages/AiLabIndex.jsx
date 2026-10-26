import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import AiLabLayout from '../components/AiLabLayout';
import Terminal from '../components/Terminal';
import { useAiLabAuth } from '../AiLabAuthContext';

export default function AiLabIndex() {
  const { isAuthed, user } = useAiLabAuth();
  return (
    <AiLabLayout>
      <Helmet>
        <title>SYNVOSA AI LAB | Experimental Computer Vision System</title>
        <meta name="description" content="SYNVOSA AI LAB — a futuristic browser-based AI computer-vision laboratory. Real webcam face, hand, finger, gesture, pose and object detection running locally." />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch">
        <div className="ailab-panel">
          <span className="corner-tr" /><span className="corner-bl" />
          <div className="ailab-panel-head"><span>AI VISION ENGINE</span><span className="cyan">v1.0</span></div>
          <div className="ailab-panel-body">
            <h1 className="display neon glow text-2xl sm:text-4xl tracking-widest mb-2">SYNVOSA AI LAB</h1>
            <p className="cyan text-xs tracking-[0.2em] uppercase mb-6">Experimental Computer Vision System</p>
            <p className="dim text-sm leading-relaxed mb-6 max-w-xl">
              A futuristic browser-based AI vision laboratory. Turn on your webcam and run real-time
              face detection, hand tracking, finger counting, gesture recognition, pose tracking and
              object scanning — all processed locally inside your browser. No video is uploaded.
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="ailab-chip"><span className="ailab-dot" /> LOCAL AI PROCESSING</span>
              <span className="ailab-chip"><span className="ailab-dot" /> MEDIAPIPE RUNTIME</span>
              <span className="ailab-chip"><span className="ailab-dot" /> NO VIDEO UPLOADED</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {isAuthed ? (
                <>
                  <Link to="/ai-lab/dashboard" className="ailab-btn solid">ENTER DASHBOARD →</Link>
                  <Link to="/ai-lab/vision" className="ailab-btn cyan">LAUNCH AI VISION</Link>
                </>
              ) : (
                <>
                  <Link to="/ai-lab/register" className="ailab-btn solid">CREATE ACCOUNT →</Link>
                  <Link to="/ai-lab/login" className="ailab-btn cyan">LOGIN</Link>
                </>
              )}
            </div>
            {isAuthed && user && (
              <p className="mt-6 text-[11px] dim tracking-[0.14em] uppercase">
                Operator: <span className="neon">{user.full_name || user.email}</span> · Access Granted
              </p>
            )}
          </div>
        </div>
        <div className="ailab-panel min-h-[260px]">
          <span className="corner-tr" /><span className="corner-bl" />
          <div className="ailab-panel-head"><span>SYSTEM TERMINAL</span><span className="cyan">LIVE</span></div>
          <div className="ailab-panel-body p-0 h-[260px]">
            <Terminal />
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[
          ['FACE DETECTION', 'Biometric scan + head direction + blink counter'],
          ['HAND TRACKING', '21-point landmarks · left / right / both hands'],
          ['FINGER COUNTER', 'Real-time count from 0 to 10 fingers'],
          ['GESTURE CONTROL', 'Fist, palm, thumbs up, peace, pointing, OK'],
        ].map(([t, d]) => (
          <div key={t} className="ailab-panel">
            <span className="corner-tr" /><span className="corner-bl" />
            <div className="ailab-panel-body">
              <div className="neon display text-sm tracking-widest mb-1">{t}</div>
              <div className="dim text-[11px] leading-relaxed">{d}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-[10px] dim tracking-[0.14em] uppercase text-center">
        Camera processing is performed locally in your browser whenever possible. No camera images or video are uploaded or stored by default.
      </p>
      <p className="mt-2 text-center">
        <Link to="/" className="text-[10px] dim tracking-[0.14em] uppercase hover:text-[var(--neon)]">← BACK TO SYNVOSA.COM</Link>
      </p>
    </AiLabLayout>
  );
}
