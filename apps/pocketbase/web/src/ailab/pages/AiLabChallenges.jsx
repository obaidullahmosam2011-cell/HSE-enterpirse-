import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import AiLabLayout from '../components/AiLabLayout';
import { useCamera } from '../hooks/useCamera';
import { useVisionEngine } from '../hooks/useVisionEngine';

const CHALLENGES = [
  { id: 'f1', text: 'SHOW 1 FINGER', check: (r) => r.fingers === 1 },
  { id: 'f3', text: 'SHOW 3 FINGERS', check: (r) => r.fingers === 3 },
  { id: 'f5', text: 'SHOW 5 FINGERS', check: (r) => r.fingers === 5 },
  { id: 'rh', text: 'RAISE YOUR RIGHT HAND', check: (r) => r.rightHand && !r.leftHand },
  { id: 'bh', text: 'RAISE BOTH HANDS', check: (r) => r.leftHand && r.rightHand },
  { id: 'tu', text: 'SHOW THUMBS UP', check: (r) => r.gesture === 'THUMBS UP' },
  { id: 'fist', text: 'MAKE A FIST', check: (r) => r.gesture === 'CLOSED FIST' },
  { id: 'peace', text: 'SHOW PEACE SIGN', check: (r) => r.gesture === 'PEACE SIGN' },
];

export default function AiLabChallenges() {
  const cam = useCamera();
  const eng = useVisionEngine();
  const overlayRef = useRef(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [current, setCurrent] = useState(() => CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]);
  const [status, setStatus] = useState(''); // '' | 'pass' | 'fail'
  const [timeLeft, setTimeLeft] = useState(15);
  const [accessFx, setAccessFx] = useState(false);
  const lastResultRef = useRef(null);
  const passLockRef = useRef(false);

  const onFrame = useCallback((r) => { lastResultRef.current = r; }, []);

  const nextChallenge = useCallback(() => {
    let n = current;
    while (n.id === current.id) n = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
    setCurrent(n); setStatus(''); setTimeLeft(15); passLockRef.current = false;
  }, [current]);

  // Timer
  useEffect(() => {
    if (!cam.active) return;
    const t = setInterval(() => {
      setTimeLeft((tl) => {
        if (tl <= 1) { setStatus('fail'); passLockRef.current = false; return 15; }
        return tl - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [cam.active, current]);

  // Verification loop
  useEffect(() => {
    if (!cam.active) return;
    const t = setInterval(() => {
      const r = lastResultRef.current;
      if (!r || passLockRef.current) return;
      if (current.check(r)) {
        passLockRef.current = true;
        setStatus('pass');
        setScore((s) => s + 100);
        setCompleted((c) => c + 1);
        setAccessFx(true);
        setTimeout(() => setAccessFx(false), 1800);
        setTimeout(nextChallenge, 1900);
      }
    }, 250);
    return () => clearInterval(t);
  }, [cam.active, current, nextChallenge]);

  useEffect(() => () => { cam.stop(); eng.stop(); }, []); // eslint-disable-line

  const onStart = async () => {
    const ok = await cam.start();
    if (ok && cam.videoRef.current && overlayRef.current) {
      await eng.start(cam.videoRef.current, overlayRef.current, { face: false, hand: true, pose: false, object: false }, onFrame);
    }
  };
  const onStop = () => { eng.stop(); cam.stop(); };

  const skip = () => { setStatus('fail'); nextChallenge(); };

  return (
    <AiLabLayout>
      <Helmet><title>SYNVOSA AI LAB | AI Challenges</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      {accessFx && (
        <div className="ailab-access">
          <div className="box">ACCESS GRANTED</div>
        </div>
      )}
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
        <div className="ailab-panel">
          <span className="corner-tr" /><span className="corner-bl" />
          <div className="ailab-panel-head"><span>AI CHALLENGE MODE</span><span className="cyan">VISION VERIFIED</span></div>
          <div className="ailab-panel-body">
            <div className="ailab-stage">
              <video ref={cam.videoRef} playsInline muted />
              <canvas ref={overlayRef} />
              <span className="ailab-hud-corner tl" /><span className="ailab-hud-corner tr" /><span className="ailab-hud-corner bl" /><span className="ailab-hud-corner br" />
              {!cam.active && <div className="no-feed"><div className="display neon glow">CAMERA OFFLINE</div><div>Press START CAMERA to begin</div>{cam.error && <div className="red mt-2" style={{textTransform:'none'}}>{cam.error}</div>}</div>}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {!cam.active ? <button onClick={onStart} className="ailab-btn solid">▶ START CAMERA</button> : <button onClick={onStop} className="ailab-btn red">■ STOP</button>}
              <button onClick={skip} className="ailab-btn amber" disabled={!cam.active}>SKIP →</button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="ailab-panel">
            <span className="corner-tr" /><span className="corner-bl" />
            <div className="ailab-panel-head"><span>CURRENT CHALLENGE</span><span className="amber">TIMER {timeLeft}s</span></div>
            <div className="ailab-panel-body text-center">
              <div className="display neon glow text-xl tracking-widest mb-3">{current.text}</div>
              {status === 'pass' && <div className="neon text-sm tracking-[0.2em]">✓ CHALLENGE PASSED</div>}
              {status === 'fail' && <div className="amber text-sm tracking-[0.2em]">TRY AGAIN</div>}
              {!status && <div className="dim text-[11px] tracking-[0.16em] uppercase">Awaiting input...</div>}
            </div>
          </div>
          <div className="ailab-panel">
            <span className="corner-tr" /><span className="corner-bl" />
            <div className="ailab-panel-head"><span>SCORE</span><span className="cyan">LIVE</span></div>
            <div className="ailab-panel-body grid grid-cols-2 gap-4 text-center">
              <div><div className="ailab-label">Score</div><div className="display neon glow text-2xl">{score}</div></div>
              <div><div className="ailab-label">Completed</div><div className="display cyan glow text-2xl">{completed}</div></div>
            </div>
          </div>
          <div className="ailab-panel">
            <span className="corner-tr" /><span className="corner-bl" />
            <div className="ailab-panel-head"><span>LIVE READOUT</span><span className="cyan">CV</span></div>
            <div className="ailab-panel-body text-[12px] space-y-1.5">
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Hands</span><span className="neon">{eng.results.handsCount}</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Fingers</span><span className="neon glow text-base">{eng.results.fingers}</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Gesture</span><span className="cyan">{eng.results.gesture}</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Left</span><span className={eng.results.leftHand?'neon':'dim'}>{eng.results.leftHand?'YES':'NO'}</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Right</span><span className={eng.results.rightHand?'neon':'dim'}>{eng.results.rightHand?'YES':'NO'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </AiLabLayout>
  );
}
