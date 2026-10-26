import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import AiLabLayout from '../components/AiLabLayout';
import StatusPanel from '../components/StatusPanel';
import Terminal from '../components/Terminal';
import { useCamera } from '../hooks/useCamera';
import { useVisionEngine } from '../hooks/useVisionEngine';

export default function AiLabVision() {
  const cam = useCamera();
  const eng = useVisionEngine();
  const canvasRef = useRef(null);
  const [modes, setModes] = useState({ face: true, hand: true, pose: false, object: false });
  const [snap, setSnap] = useState(null);
  const [scan, setScan] = useState(false);

  // Trigger biometric scan visual when a face appears.
  useEffect(() => {
    if (eng.results.face && !scan) {
      setScan(true);
      const t = setTimeout(() => setScan(false), 2600);
      return () => clearTimeout(t);
    }
  }, [eng.results.face, scan]);

  useEffect(() => () => { cam.stop(); eng.stop(); }, []); // eslint-disable-line

  const onStart = async () => {
    const ok = await cam.start();
    if (ok && cam.videoRef.current && canvasRef.current) {
      await eng.start(cam.videoRef.current, canvasRef.current, modes);
    }
  };
  const onStop = () => { eng.stop(); cam.stop(); };

  const toggleMode = (k) => {
    const next = { ...modes, [k]: !modes[k] };
    setModes(next);
    eng.setModes(next);
  };

  const takeSnap = () => {
    const url = cam.snapshot();
    if (url) {
      // Overlay current canvas drawings onto snapshot.
      const v = cam.videoRef.current;
      const c = canvasRef.current;
      if (v && c) {
        const out = document.createElement('canvas');
        out.width = v.videoWidth; out.height = v.videoHeight;
        const ctx = out.getContext('2d');
        ctx.translate(out.width, 0); ctx.scale(-1, 1);
        ctx.drawImage(v, 0, 0, out.width, out.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(c, 0, 0, out.width, out.height);
        setSnap(out.toDataURL('image/png'));
      } else setSnap(url);
    }
  };

  const fullscreen = () => {
    const el = document.getElementById('ailab-stage');
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const Mode = ({ k, label }) => (
    <button onClick={() => toggleMode(k)} className={`ailab-btn sm ${modes[k] ? 'solid' : ''}`}>{label} {modes[k] ? 'ON' : 'OFF'}</button>
  );

  return (
    <AiLabLayout>
      <Helmet><title>SYNVOSA AI LAB | AI Vision System</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-6 items-start">
        <div>
          <div className="ailab-panel mb-4">
            <span className="corner-tr" /><span className="corner-bl" />
            <div className="ailab-panel-head"><span>AI VISION SYSTEM</span><span className="cyan">LOCAL PROCESSING</span></div>
            <div className="ailab-panel-body">
              <div id="ailab-stage" className="ailab-stage">
                <video ref={cam.videoRef} playsInline muted />
                <canvas ref={canvasRef} />
                <span className="ailab-hud-corner tl" /><span className="ailab-hud-corner tr" />
                <span className="ailab-hud-corner bl" /><span className="ailab-hud-corner br" />
                {cam.active && <div className="ailab-scanline" />}
                <div className="ailab-hud-tag" style={{ top: 12, left: 48 }}>{cam.active ? 'LIVE FEED' : 'CAMERA OFFLINE'}</div>
                <div className="ailab-hud-tag" style={{ top: 12, right: 48 }}>{cam.active ? 'AI ANALYSIS ACTIVE' : 'STANDBY'}</div>
                <div className="ailab-hud-tag" style={{ bottom: 12, left: 48 }}>{eng.stats.resolution || '—'} · {eng.stats.fps} FPS · {eng.stats.processingTime}ms</div>
                <div className="ailab-hud-tag" style={{ bottom: 12, right: 48 }}>{eng.results.face ? 'FACE DETECTED' : 'NO FACE'}</div>
                {scan && <div className="ailab-hud-tag" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 12, color: 'var(--neon)', borderColor: 'var(--neon)' }}>BIOMETRIC SCAN IN PROGRESS...</div>}
                {!cam.active && (
                  <div className="no-feed">
                    <div className="display neon glow text-lg">CAMERA OFFLINE</div>
                    <div>Press START CAMERA to activate webcam</div>
                    {cam.error && <div className="red mt-2 max-w-md text-center" style={{ textTransform: 'none', letterSpacing: 0 }}>{cam.error}</div>}
                    {eng.error && <div className="amber mt-2 max-w-md text-center" style={{ textTransform: 'none', letterSpacing: 0 }}>MODEL: {eng.error}</div>}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {!cam.active ? (
                  <button onClick={onStart} className="ailab-btn solid">▶ START CAMERA</button>
                ) : (
                  <button onClick={onStop} className="ailab-btn red">■ STOP CAMERA</button>
                )}
                <button onClick={cam.switchCamera} className="ailab-btn cyan" disabled={!cam.active}>⇄ SWITCH</button>
                <button onClick={fullscreen} className="ailab-btn cyan" disabled={!cam.active}>⛶ FULLSCREEN</button>
                <button onClick={takeSnap} className="ailab-btn amber" disabled={!cam.active}>📷 SNAPSHOT</button>
                <button onClick={() => setSnap(null)} className="ailab-btn" disabled={!snap}>RESET</button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <Mode k="face" label="FACE" />
                <Mode k="hand" label="HAND" />
                <Mode k="pose" label="POSE" />
                <Mode k="object" label="OBJECT" />
              </div>

              {snap && (
                <div className="mt-4">
                  <div className="ailab-label">Snapshot (saved locally only — not uploaded)</div>
                  <img src={snap} alt="snapshot" className="border border-[var(--line)] rounded max-w-xs" />
                  <div className="mt-2"><a href={snap} download="ailab-snapshot.png" className="ailab-btn sm cyan">⬇ DOWNLOAD</a></div>
                </div>
              )}

              <p className="mt-4 text-[10px] dim tracking-[0.12em] uppercase">
                Camera processing is performed locally in your browser. No camera images or video are uploaded or stored by default. Snapshot only saves when you press the button.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <StatusPanel stats={eng.stats} results={eng.results} cameraOn={cam.active} />
          <div className="ailab-panel">
            <span className="corner-tr" /><span className="corner-bl" />
            <div className="ailab-panel-head"><span>LIVE READOUT</span><span className="cyan">CV</span></div>
            <div className="ailab-panel-body text-[12px] space-y-1.5">
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Face</span><span className={eng.results.face ? 'neon' : 'dim'}>{eng.results.face ? 'DETECTED' : 'NONE'}</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Head Dir</span><span className="cyan">{eng.results.headDirection}</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Blinks</span><span className="cyan">{eng.results.blinkCount}</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Hands</span><span className={eng.results.handsCount ? 'neon' : 'dim'}>{eng.results.handsCount}</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Fingers</span><span className="neon glow text-base">{eng.results.fingers}</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Gesture</span><span className="cyan">{eng.results.gesture}</span></div>
              <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Pose</span><span className={eng.results.pose ? 'neon' : 'dim'}>{eng.results.pose ? 'DETECTED' : 'NONE'}</span></div>
              <div className="border-t border-[var(--line-soft)] pt-2 mt-2">
                <div className="ailab-label mb-1">Objects</div>
                {eng.results.objects.length === 0 && <span className="dim">None detected</span>}
                {eng.results.objects.map((o, i) => (
                  <div key={i} className="flex justify-between"><span className="amber">{o.name}</span><span className="cyan">{o.score}%</span></div>
                ))}
              </div>
            </div>
          </div>
          <div className="ailab-panel min-h-[180px]">
            <span className="corner-tr" /><span className="corner-bl" />
            <div className="ailab-panel-head"><span>SYSTEM TERMINAL</span><span className="cyan">LIVE</span></div>
            <div className="ailab-panel-body p-0 h-[180px]"><Terminal extra={[`> VISION ENGINE: ${eng.status.toUpperCase()}`, `> FPS ${eng.stats.fps} · ${eng.stats.processingTime}MS`]} /></div>
          </div>
        </div>
      </div>
    </AiLabLayout>
  );
}
