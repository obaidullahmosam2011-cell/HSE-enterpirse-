import React, { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  '> INITIALIZING SYNVOSA AI LAB...',
  '> LOADING VISION ENGINE...',
  '> CAMERA MODULE READY',
  '> FACE TRACKER ONLINE',
  '> HAND TRACKER ONLINE',
  '> FINGER ENGINE READY',
  '> POSE MODULE READY',
  '> OBJECT SCANNER READY',
  '> LOCAL PROCESSING ACTIVE',
  '> NEURAL VISION ACTIVE',
  '> SYSTEM ONLINE',
  '> AWAITING OPERATOR INPUT...',
  '> SCANNING LOCAL ENVIRONMENT...',
  '> GPU ACCELERATION ENABLED',
  '> MEDIAPIPE RUNTIME OK',
];

export default function Terminal({ extra = [] }) {
  const [lines, setLines] = useState([]);
  const idxRef = useRef(0);
  const boxRef = useRef(null);

  useEffect(() => {
    let timer;
    const push = () => {
      setLines((prev) => {
        const pool = [...MESSAGES, ...extra];
        const next = pool[idxRef.current % pool.length];
        idxRef.current++;
        const out = [...prev, next];
        return out.slice(-9);
      });
      timer = setTimeout(push, 1800 + Math.random() * 1400);
    };
    timer = setTimeout(push, 600);
    return () => clearTimeout(timer);
  }, [extra]);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [lines]);

  return (
    <div ref={boxRef} className="ailab-terminal ailab-scroll" style={{ height: '100%', overflowY: 'auto', padding: '12px 14px' }}>
      {lines.map((l, i) => (
        <div key={i} className="ln">
          <span className="prompt">root@synvosa-ai:~$ </span>
          <span>{l.replace(/^> /, '')}</span>
        </div>
      ))}
      <div className="ln"><span className="prompt">root@synvosa-ai:~$ </span><span className="cursor" /></div>
    </div>
  );
}
