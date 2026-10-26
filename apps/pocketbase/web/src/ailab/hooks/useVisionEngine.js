import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FilesetResolver,
  FaceLandmarker,
  HandLandmarker,
  PoseLandmarker,
  ObjectDetector,
} from '@mediapipe/tasks-vision';

// CDN roots for WASM + models (loaded once, runs fully locally in-browser).
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL = {
  face: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  hand: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  pose: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker/float16/1/pose_landmarker.task',
  object: 'https://storage.googleapis.com/mediapipe-models/object_detector/object_detector/float32/1/object_detector.tflite',
};

let visionFileset = null;
const getFileset = async () => {
  if (!visionFileset) visionFileset = await FilesetResolver.forVisionTasks(WASM);
  return visionFileset;
};

// ---- finger / gesture helpers ----
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function countFingers(lm, handedness) {
  if (!lm || lm.length < 21) return 0;
  let count = 0;
  // Thumb: tip farther from pinky-mcp than ip.
  const thumbExt = dist(lm[4], lm[17]) > dist(lm[2], lm[17]) * 1.2;
  if (thumbExt) count++;
  // Other fingers: tip above pip (y smaller) => extended.
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  for (let i = 0; i < 4; i++) {
    if (lm[tips[i]].y < lm[pips[i]].y - 0.02) count++;
  }
  return count;
}

function detectGesture(lm) {
  if (!lm || lm.length < 21) return 'NONE';
  const thumbExt = dist(lm[4], lm[17]) > dist(lm[2], lm[17]) * 1.2;
  const ext = (t, p) => lm[t].y < lm[p].y - 0.02;
  const index = ext(8, 6);
  const middle = ext(12, 10);
  const ring = ext(16, 14);
  const pinky = ext(20, 18);
  const okClose = dist(lm[4], lm[8]) < 0.07 && middle && ring && pinky;
  if (okClose) return 'OK SIGN';
  const count = [thumbExt, index, middle, ring, pinky].filter(Boolean).length;
  if (count === 0) return 'CLOSED FIST';
  if (count >= 5) return 'OPEN PALM';
  if (thumbExt && !index && !middle && !ring && !pinky) return 'THUMBS UP';
  if (index && middle && !ring && !pinky) return 'PEACE SIGN';
  if (index && !middle && !ring && !pinky) return 'POINTING';
  return 'UNKNOWN';
}

function headDirection(lm) {
  if (!lm || lm.length < 468) return 'UNKNOWN';
  const nose = lm[1];
  const left = lm[234];
  const right = lm[454];
  const top = lm[10];
  const bottom = lm[152];
  const cx = (left.x + right.x) / 2;
  const cy = (top.y + bottom.y) / 2;
  const dx = nose.x - cx;
  const dy = nose.y - cy;
  const fw = Math.abs(right.x - left.x);
  const fh = Math.abs(bottom.y - top.y);
  if (Math.abs(dx) > fw * 0.18) return dx > 0 ? 'RIGHT' : 'LEFT';
  if (Math.abs(dy) > fh * 0.22) return dy > 0 ? 'DOWN' : 'UP';
  return 'CENTER';
}

function eyeAspectRatio(lm) {
  // Right eye landmarks (subject's right, image left): 33,160,158,133,153,144
  const p1 = lm[33], p2 = lm[160], p3 = lm[158], p4 = lm[133], p5 = lm[153], p6 = lm[144];
  const a = dist(p2, p6);
  const b = dist(p3, p5);
  const c = dist(p1, p4);
  return (a + b) / (2 * c);
}

const POSE_PAIRS = [
  [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 12], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

export function useVisionEngine() {
  const [status, setStatus] = useState('idle'); // idle|loading|ready|error
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ fps: 0, processingTime: 0, resolution: '' });
  const [results, setResults] = useState({
    face: false,
    headDirection: 'UNKNOWN',
    blinkCount: 0,
    leftHand: false,
    rightHand: false,
    handsCount: 0,
    fingers: 0,
    gesture: 'NONE',
    pose: false,
    objects: [],
  });

  const faceRef = useRef(null);
  const handRef = useRef(null);
  const poseRef = useRef(null);
  const objRef = useRef(null);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const blinkStateRef = useRef(false);
  const blinkCountRef = useRef(0);
  const lastFrameRef = useRef(0);
  const fpsRef = useRef(0);
  const fpsCounterRef = useRef(0);
  const fpsTimerRef = useRef(0);
  const modesRef = useRef({ face: true, hand: true, pose: false, object: false });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const stateThrottleRef = useRef(0);
  const onFrameRef = useRef(null);

  const loadModels = useCallback(async (modes) => {
    setStatus('loading');
    setError('');
    try {
      const fileset = await getFileset();
      if (modes.face && !faceRef.current) {
        faceRef.current = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL.face, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
        });
      }
      if (modes.hand && !handRef.current) {
        handRef.current = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL.hand, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 2,
        });
      }
      if (modes.pose && !poseRef.current) {
        poseRef.current = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL.pose, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
      }
      if (modes.object && !objRef.current) {
        try {
          objRef.current = await ObjectDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL.object, delegate: 'GPU' },
            runningMode: 'VIDEO',
            maxResults: 5,
          });
        } catch (e) {
          // Object detector optional — degrade gracefully.
          objRef.current = null;
        }
      }
      setStatus('ready');
    } catch (e) {
      setStatus('error');
      setError(e.message || 'Model failed to load');
    }
  }, []);

  const drawConnectors = (ctx, lm, pairs, color, w, h) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (const [a, b] of pairs) {
      if (!lm[a] || !lm[b]) continue;
      ctx.beginPath();
      ctx.moveTo(lm[a].x * w, lm[a].y * h);
      ctx.lineTo(lm[b].x * w, lm[b].y * h);
      ctx.stroke();
    }
  };
  const drawPoints = (ctx, lm, indices, color, w, h, r = 3) => {
    ctx.fillStyle = color;
    for (const i of indices) {
      if (!lm[i]) continue;
      ctx.beginPath();
      ctx.arc(lm[i].x * w, lm[i].y * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const loop = useCallback(() => {
    if (!runningRef.current) return;
    rafRef.current = requestAnimationFrame(loop);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const t0 = performance.now();
    const w = canvas.width = video.videoWidth || 640;
    const h = canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    // Because the video is mirrored via CSS, mirror the canvas drawing too.
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);

    const now = performance.now();
    const ts = now;
    const modes = modesRef.current;
    let face = false, head = 'UNKNOWN', leftHand = false, rightHand = false;
    let handsCount = 0, fingers = 0, gesture = 'NONE', pose = false, objects = [];
    let handLandmarks = null;

    try {
      if (modes.face && faceRef.current) {
        const fr = faceRef.current.detectForVideo(video, ts);
        if (fr.faceLandmarks && fr.faceLandmarks.length > 0) {
          face = true;
          const lm = fr.faceLandmarks[0];
          head = headDirection(lm);
          const ear = eyeAspectRatio(lm);
          if (ear < 0.22 && !blinkStateRef.current) {
            blinkStateRef.current = true;
            blinkCountRef.current++;
          } else if (ear >= 0.26) {
            blinkStateRef.current = false;
          }
          // bounding box from a few landmarks
          let minX = 1, minY = 1, maxX = 0, maxY = 0;
          for (const p of lm) {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
          }
          const pad = 20;
          ctx.strokeStyle = '#00ff9c';
          ctx.lineWidth = 2;
          ctx.strokeRect(minX * w - pad, minY * h - pad, (maxX - minX) * w + pad * 2, (maxY - minY) * h + pad * 2);
          drawPoints(ctx, lm, [1, 10, 152, 33, 263, 61, 291], '#00e5ff', w, h, 3);
        }
      }
      if (modes.hand && handRef.current) {
        const hr = handRef.current.detectForVideo(video, ts);
        if (hr.landmarks && hr.landmarks.length > 0) {
          handsCount = hr.landmarks.length;
          handLandmarks = hr.landmarks;
          hr.landmarks.forEach((lm, i) => {
            const label = hr.handedness && hr.handedness[i] && hr.handedness[i][0];
            const isLeft = label && label.categoryName === 'Left';
            if (isLeft) leftHand = true; else rightHand = true;
            const f = countFingers(lm, label);
            fingers += f;
            const g = detectGesture(lm);
            if (g !== 'UNKNOWN' && g !== 'NONE') gesture = g;
            const color = isLeft ? '#00e5ff' : '#00ff9c';
            drawConnectors(ctx, lm, [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]], color, w, h);
            drawPoints(ctx, lm, Array.from({length:21},(_,k)=>k), color, w, h, 2.5);
          });
        }
      }
      if (modes.pose && poseRef.current) {
        const pr = poseRef.current.detectForVideo(video, ts);
        if (pr.landmarks && pr.landmarks.length > 0) {
          pose = true;
          const lm = pr.landmarks[0];
          drawConnectors(ctx, lm, POSE_PAIRS, '#ffb020', w, h);
          drawPoints(ctx, lm, Array.from({length:33},(_,k)=>k), '#00e5ff', w, h, 3);
        }
      }
      if (modes.object && objRef.current) {
        try {
          const od = objRef.current.detectForVideo(video, ts);
          if (od.detections) {
            objects = od.detections.map((d) => ({
              name: (d.categories[0] && d.categories[0].categoryName) || 'OBJECT',
              score: Math.round((d.categories[0]?.score || 0) * 100),
              box: d.boundingBox,
            }));
            ctx.lineWidth = 2;
            objects.forEach((o) => {
              if (!o.box) return;
              const bx = o.box.originX, by = o.box.originY, bw = o.box.width, bh = o.box.height;
              ctx.strokeStyle = '#ffb020';
              ctx.strokeRect(bx, by, bw, bh);
              ctx.fillStyle = 'rgba(255,176,32,0.85)';
              ctx.fillRect(bx, by - 18, ctx.measureText(o.name).width + 70, 18);
            });
          }
        } catch (_) { /* object detection non-fatal */ }
      }
    } catch (_) { /* per-frame errors non-fatal */ }

    ctx.restore();

    // object labels drawn unmirrored so text is readable
    if (objects.length) {
      ctx.font = '12px monospace';
      objects.forEach((o) => {
        if (!o.box) return;
        ctx.fillStyle = '#021008';
        ctx.fillText(`${o.name} ${o.score}%`, o.box.originX + 4, o.box.originY - 5);
      });
    }

    // FPS + processing time
    const procMs = performance.now() - t0;
    fpsCounterRef.current++;
    if (now - fpsTimerRef.current > 1000) {
      fpsRef.current = fpsCounterRef.current;
      fpsCounterRef.current = 0;
      fpsTimerRef.current = now;
    }

    // Expose raw per-frame data to consumers (air drawing, challenges).
    if (onFrameRef.current) {
      onFrameRef.current({ handLandmarks, fingers, gesture, face, handsCount, leftHand, rightHand });
    }

    // Throttle React state updates to ~8/sec.
    if (now - stateThrottleRef.current > 120) {
      stateThrottleRef.current = now;
      setStats({ fps: fpsRef.current, processingTime: Math.round(procMs), resolution: `${w}×${h}` });
      setResults({
        face, headDirection: head, blinkCount: blinkCountRef.current,
        leftHand, rightHand, handsCount, fingers, gesture, pose, objects,
      });
    }
  }, []);

  const start = useCallback(async (videoEl, canvasEl, modes, onFrame) => {
    videoRef.current = videoEl;
    canvasRef.current = canvasEl;
    onFrameRef.current = onFrame || null;
    modesRef.current = { face: true, hand: true, pose: false, object: false, ...modes };
    await loadModels(modesRef.current);
    if (status === 'error') return;
    runningRef.current = true;
    fpsTimerRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
  }, [loadModels, loop, status]);

  const setModes = useCallback((modes) => {
    modesRef.current = { ...modesRef.current, ...modes };
  }, []);

  const stop = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }, []);

  const resetBlinks = useCallback(() => { blinkCountRef.current = 0; }, []);

  useEffect(() => () => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    try { faceRef.current?.close?.(); handRef.current?.close?.(); poseRef.current?.close?.(); objRef.current?.close?.(); } catch (_) {}
  }, []);

  return { status, error, stats, results, start, stop, setModes, resetBlinks, loadModels };
}
