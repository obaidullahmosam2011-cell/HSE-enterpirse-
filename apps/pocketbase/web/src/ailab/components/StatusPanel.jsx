import React from 'react';

const Row = ({ label, value, ok, warn, bad }) => {
  const cls = bad ? 'red' : warn ? 'amber' : ok ? 'neon' : 'dim';
  const dot = bad ? 'red' : warn ? 'amber' : ok ? '' : 'off';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--line-soft)] text-[11px]">
      <span className="dim tracking-[0.12em] uppercase">{label}</span>
      <span className={`mono ${cls} flex items-center gap-2`}>
        <span className={`ailab-dot ${dot}`} style={{ animation: dot === 'off' ? 'none' : undefined }} />
        {value}
      </span>
    </div>
  );
};

export default function StatusPanel({ stats, results, cameraOn }) {
  return (
    <div className="ailab-panel h-full">
      <span className="corner-tr" /><span className="corner-bl" />
      <div className="ailab-panel-head"><span>SYSTEM STATUS</span><span className="cyan">REALTIME</span></div>
      <div className="ailab-panel-body py-2">
        <Row label="System" value="ONLINE" ok />
        <Row label="Camera" value={cameraOn ? 'CONNECTED' : 'OFFLINE'} ok={cameraOn} bad={!cameraOn} />
        <Row label="Face" value={results.face ? 'DETECTED' : 'NOT DETECTED'} ok={results.face} />
        <Row label="Left Hand" value={results.leftHand ? 'DETECTED' : 'NOT DETECTED'} ok={results.leftHand} />
        <Row label="Right Hand" value={results.rightHand ? 'DETECTED' : 'NOT DETECTED'} ok={results.rightHand} />
        <Row label="Fingers" value={String(results.fingers)} ok={results.fingers > 0} />
        <Row label="Gesture" value={results.gesture} ok={results.gesture !== 'NONE'} />
        <Row label="Pose" value={results.pose ? 'DETECTED' : 'NOT DETECTED'} ok={results.pose} />
        <Row label="Objects" value={String(results.objects.length)} ok={results.objects.length > 0} />
        <Row label="Head" value={results.headDirection} ok={results.face} />
        <Row label="Blinks" value={String(results.blinkCount)} ok={results.blinkCount > 0} />
        <Row label="FPS" value={String(stats.fps)} ok={stats.fps > 0} />
        <Row label="Proc Time" value={`${stats.processingTime}ms`} ok={stats.fps > 0} />
        <Row label="Resolution" value={stats.resolution || '—'} ok={!!stats.resolution} />
      </div>
    </div>
  );
}
