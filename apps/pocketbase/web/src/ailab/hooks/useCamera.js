import { useCallback, useRef, useState } from 'react';

// Isolated webcam control for the AI Lab. Never activates without explicit
// START. Stops cleanly on demand / unmount.
export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [facing, setFacing] = useState('user');

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  const start = useCallback(async (facingMode = facing) => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('UNSUPPORTED BROWSER: Camera API not available. Use a modern Chrome/Edge/Firefox.');
      return false;
    }
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setActive(true);
      setFacing(facingMode);
      return true;
    } catch (e) {
      if (e.name === 'NotAllowedError') setError('CAMERA PERMISSION DENIED. Allow camera access in your browser, then retry.');
      else if (e.name === 'NotFoundError') setError('NO CAMERA FOUND. Connect a webcam and retry.');
      else if (e.name === 'NotReadableError') setError('CAMERA ALREADY IN USE. Close other apps using the camera.');
      else setError('CAMERA ERROR: ' + (e.message || e.name));
      setActive(false);
      return false;
    }
  }, [facing]);

  const switchCamera = useCallback(async () => {
    const next = facing === 'user' ? 'environment' : 'user';
    if (active) await start(next);
    else setFacing(next);
  }, [facing, active, start]);

  const snapshot = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    ctx.translate(c.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }, []);

  return { videoRef, active, error, start, stop, switchCamera, snapshot, facing };
}
