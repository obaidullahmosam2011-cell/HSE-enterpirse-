import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import AiLabLayout from '../components/AiLabLayout';
import { useCamera } from '../hooks/useCamera';
import { useVisionEngine } from '../hooks/useVisionEngine';

export default function AiLabAirDrawing() {
  const cam = useCamera();
  const eng = useVisionEngine();
  const overlayRef = useRef(null);
  const drawRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef(null);
  const strokesRef = useRef([]);
  const currentRef = useRef([]);
  const [drawing, setDrawing] = useState(false);
  const [lineSize, setLineSize] = useState(4);
  const [color, setColor] = useState('#00ff9c');
  const lineSizeRef = useRef(4);
  const colorRef = useRef('#00ff9c');
  useEffect(() => { lineSizeRef.current = lineSize; }, [lineSize]);
  useEffect(() => { colorRef.current = color; }, [color]);

  useEffect(() => () => { cam.stop(); eng.stop(); }, []); // eslint-disable-line

  const redraw = () => {
    const c = drawRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const all = [...strokesRef.current, currentRef.current];
    for (const stroke of all) {
      if (stroke.length < 2) continue;
      ctx.strokeStyle = stroke[0].color;
      ctx.lineWidth = stroke[0].size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 8; ctx.shadowColor = stroke[0].color;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
    }
  };

  const onFrame = ({ handLandmarks, fingers }) => {
    if (!handLandmarks || handLandmarks.length === 0) { lastPtRef.current = null; return; }
    const lm = handLandmarks[0];
    if (!lm || lm.length < 9) return;
    const tip = lm[8];
    const c = drawRef.current; if (!c) return;
    const x = (1 - tip.x) * c.width; // mirror to match video
    const y = tip.y * c.height;
    // Only draw when index extended and middle folded (pen pose).
    const indexExt = lm[8].y < lm[6].y - 0.02;
    const midFold = lm[12].y > lm[10].y;
    if (drawingRef.current && indexExt) {
      currentRef.current.push({ x, y, color: colorRef.current, size: lineSizeRef.current });
      if (currentRef.current.length > 2) redraw();
    } else if (!indexExt && currentRef.current.length > 0) {
      // pen lifted — commit stroke
      if (currentRef.current.length > 1) strokesRef.current.push([...currentRef.current]);
      currentRef.current = []; lastPtRef.current = null; redraw();
    }
  };

  const onStart = async () => {
    const ok = await cam.start();
    if (ok && cam.videoRef.current && overlayRef.current) {
      const c = drawRef.current;
      c.width = cam.videoRef.current.videoWidth || 640;
      c.height = cam.videoRef.current.videoHeight || 480;
      await eng.start(cam.videoRef.current, overlayRef.current, { face: false, hand: true, pose: false, object: false }, onFrame);
    }
  };
  const onStop = () => { eng.stop(); cam.stop(); };

  const toggleDraw = () => { drawingRef.current = !drawingRef.current; setDrawing(drawingRef.current); if (!drawingRef.current) { if (currentRef.current.length > 1) strokesRef.current.push([...currentRef.current]); currentRef.current = []; redraw(); } };
  const clear = () => { strokesRef.current = []; currentRef.current = []; redraw(); };
  const undo = () => { strokesRef.current.pop(); redraw(); };
  const save = () => {
    const c = drawRef.current; if (!c) return;
    const a = document.createElement('a'); a.download = 'ailab-airdrawing.png'; a.href = c.toDataURL('image/png'); a.click();
  };

  return (
    <AiLabLayout>
      <Helmet><title>SYNVOSA AI LAB | Air Drawing</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-6 items-start">
        <div className="ailab-panel">
          <span className="corner-tr" /><span className="corner-bl" />
          <div className="ailab-panel-head"><span>AIR DRAWING</span><span className="cyan">INDEX FINGER PEN</span></div>
          <div className="ailab-panel-body">
            <div className="ailab-stage">
              <video ref={cam.videoRef} playsInline muted />
              <canvas ref={overlayRef} />
              <canvas ref={drawRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 4, pointerEvents: 'none' }} />
              <span className="ailab-hud-corner tl" /><span className="ailab-hud-corner tr" /><span className="ailab-hud-corner bl" /><span className="ailab-hud-corner br" />
              {!cam.active && <div className="no-feed"><div className="display neon glow">CAMERA OFFLINE</div><div>Press START CAMERA</div>{cam.error && <div className="red mt-2" style={{textTransform:'none'}}>{cam.error}</div>}</div>}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {!cam.active ? <button onClick={onStart} className="ailab-btn solid">▶ START CAMERA</button> : <button onClick={onStop} className="ailab-btn red">■ STOP</button>}
              <button onClick={toggleDraw} className={`ailab-btn ${drawing ? 'solid' : 'cyan'}`} disabled={!cam.active}>{drawing ? '⏸ STOP DRAWING' : '✎ START DRAWING'}</button>
              <button onClick={clear} className="ailab-btn red" disabled={!cam.active}>CLEAR</button>
              <button onClick={undo} className="ailab-btn amber" disabled={!cam.active}>UNDO</button>
              <button onClick={save} className="ailab-btn cyan" disabled={!cam.active}>⬇ SAVE</button>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <label className="flex items-center gap-2 text-[11px] dim tracking-[0.12em] uppercase">LINE SIZE
                <input type="range" min="1" max="20" value={lineSize} onChange={(e)=>setLineSize(+e.target.value)} className="accent-[var(--neon)]" />
                <span className="neon">{lineSize}</span>
              </label>
              <label className="flex items-center gap-2 text-[11px] dim tracking-[0.12em] uppercase">COLOR
                <input type="color" value={color} onChange={(e)=>setColor(e.target.value)} className="bg-transparent border border-[var(--line)] rounded" />
              </label>
            </div>
            <p className="mt-4 text-[10px] dim tracking-[0.12em] uppercase">Point your index finger to draw. Lower it to lift the pen. Drawings stay local — nothing is uploaded.</p>
          </div>
        </div>
        <div className="ailab-panel">
          <span className="corner-tr" /><span className="corner-bl" />
          <div className="ailab-panel-head"><span>STATUS</span><span className="cyan">CV</span></div>
          <div className="ailab-panel-body text-[12px] space-y-1.5">
            <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Camera</span><span className={cam.active?'neon':'red'}>{cam.active?'CONNECTED':'OFFLINE'}</span></div>
            <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Hands</span><span className="neon">{eng.results.handsCount}</span></div>
            <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Fingers</span><span className="neon">{eng.results.fingers}</span></div>
            <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Drawing</span><span className={drawing?'neon glow':'dim'}>{drawing?'ACTIVE':'PAUSED'}</span></div>
            <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">Strokes</span><span className="cyan">{strokesRef.current.length}</span></div>
            <div className="flex justify-between"><span className="dim tracking-[0.12em] uppercase">FPS</span><span className="cyan">{eng.stats.fps}</span></div>
          </div>
        </div>
      </div>
    </AiLabLayout>
  );
}
