import React, { useEffect, useRef } from 'react';

// Lightweight Matrix code-rain on a single canvas. Throttled + capped so it
// stays cheap on ordinary laptops. Sits behind all content (z-0, low opacity).
export default function MatrixBackground({ intense = false }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const intenseRef = useRef(intense);
  intenseRef.current = intense;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const chars = '01ｱｲｳｴｵｶｷｸｹｺ01<>/*=+-|01';
    let columns = 0;
    let drops = [];
    let last = 0;
    const fontSize = 14;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = Array(columns).fill(0).map(() => Math.random() * -50);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (t) => {
      rafRef.current = requestAnimationFrame(draw);
      const interval = intenseRef.current ? 45 : 70;
      if (t - last < interval) return;
      last = t;

      ctx.fillStyle = intenseRef.current ? 'rgba(2,6,10,0.08)' : 'rgba(2,6,10,0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        // Leading char brighter.
        ctx.fillStyle = Math.random() > 0.975 ? '#aaffe0' : '#00ff9c';
        ctx.fillText(text, x, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="ailab-matrix" aria-hidden="true" />;
}
