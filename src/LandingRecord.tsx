import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { Screen, Note } from './types';
import { processVoiceNote } from './services/geminiService';
import { useAuth } from './hooks/useAuth';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { Sparkles, X, AlertTriangle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
type Phase = 'idle' | 'activating' | 'recording' | 'processing';

interface LandingRecordProps {
  setScreen: (s: Screen) => void;
  onSaveNote: (n: Note) => void;
  isDark: boolean;
}

// (Mock phrases removed — using real speech recognition now)

// ─── Waveform bar ─────────────────────────────────────────
const WaveBar: React.FC<{ index: number }> = ({ index }) => {
  const duration = 0.38 + (index % 5) * 0.09;
  const delay = (index * 0.045) % 0.55;
  const maxH = 14 + (index % 7) * 9;
  return (
    <motion.div
      animate={{ height: [`4px`, `${maxH}px`, `4px`], opacity: [0.35, 1, 0.35] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
      style={{ width: '2.5px', borderRadius: '2px', background: 'var(--color-primary, #f97316)', flexShrink: 0 }}
    />
  );
};

// ─── 3D Orb (CSS perspective + mouse parallax) ────────────
// We achieve the Spline aesthetic using:
// • CSS radial-gradient for depth + specularity
// • perspective() + rotateX/Y for parallax tilt
// • layered box-shadows for volumetric glow
// • No external 3D library — zero additional bundle cost

interface OrbProps {
  phase: Phase;
  tiltX: number; // -1 → 1
  tiltY: number; // -1 → 1
  onClick: () => void;
  isDark: boolean;
}

const Orb: React.FC<OrbProps> = ({ phase, tiltX, tiltY, onClick, isDark }) => {
  const isIdle = phase === 'idle';
  const isRecording = phase === 'recording';
  const isProcessing = phase === 'processing';
  const isActive = isRecording || isProcessing;
  const MAX_TILT = 10; // degrees

  // Perspective tilt from mouse
  const rx = tiltY * MAX_TILT;  // mouse-y → X-axis rotation
  const ry = tiltX * MAX_TILT;  // mouse-x → Y-axis rotation

  const specX = 30 - tiltX * 20; // specular highlight shifts opposite to tilt
  const specY = 28 - tiltY * 15;

  // Light mode: softer palette
  const orbGrad = isDark
    ? `radial-gradient(circle at ${specX}% ${specY}%, #ff7c38 0%, #c04a00 38%, #5a1800 72%, #0d0500 100%)`
    : `radial-gradient(circle at ${specX}% ${specY}%, #ff9d5c 0%, #e05c10 40%, #9c3600 78%, #3a1200 100%)`;

  const glowColor = isDark
    ? 'rgba(249,115,22,0.42)'
    : 'rgba(225,90,10,0.32)';
  const glowColorFar = isDark
    ? 'rgba(249,115,22,0.18)'
    : 'rgba(200,75,0,0.12)';

  const glowStrength = isActive ? 1.7 : isIdle ? 1 : 1.3;

  return (
    <div
      style={{
        perspective: '700px',
        perspectiveOrigin: '50% 50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        animate={isRecording ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={{ duration: 2.6, repeat: isRecording ? Infinity : 0, ease: 'easeInOut' }}
        whileHover={isIdle ? { scale: 1.06 } : undefined}
        whileTap={isIdle ? { scale: 0.97 } : undefined}
        onClick={onClick}
        style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          cursor: isIdle ? 'pointer' : 'default',
          position: 'relative',
          transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
          transition: 'transform 0.18s cubic-bezier(0.2,0,0,1)',
          willChange: 'transform',
        }}
      >
        {/* ── Drop shadow beneath orb */}
        <div style={{
          position: 'absolute',
          bottom: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '140px',
          height: '20px',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${glowColor.replace('0.42', isDark ? '0.28' : '0.18')} 0%, transparent 80%)`,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }} />

        {/* ── Far glow (ambient) */}
        <motion.div
          animate={isRecording
            ? { opacity: [0.5, 1, 0.5], scale: [1, 1.15, 1] }
            : { opacity: glowStrength * 0.45, scale: 1 }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: '-40px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${glowColorFar} 0%, transparent 68%)`,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />

        {/* ── Near glow (focused) */}
        <motion.div
          animate={isRecording
            ? { opacity: [0.6, 1, 0.6] }
            : { opacity: glowStrength * 0.6 }}
          transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 60%)`,
            filter: 'blur(14px)',
            pointerEvents: 'none',
          }}
        />

        {/* ── Orb body */}
        <motion.div
          animate={{ scale: isIdle ? [1, 1.025, 1] : 1 }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: orbGrad,
            boxShadow: [
              `inset 0 -12px 28px rgba(0,0,0,0.55)`,
              `inset 0 4px 16px rgba(255,180,100,0.12)`,
              `0 0 ${40 * glowStrength}px ${glowColor}`,
              `0 0 ${80 * glowStrength}px ${glowColor.replace('0.42', '0.12')}`,
            ].join(', '),
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* ── Primary specular highlight (shifts with mouse) */}
          <div style={{
            position: 'absolute',
            top: `${specY - 12}%`,
            left: `${specX - 10}%`,
            width: '42%',
            height: '34%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.22) 0%, transparent 100%)',
            pointerEvents: 'none',
            transition: 'top 0.18s ease, left 0.18s ease',
          }} />

          {/* ── Secondary rim light (opposite edge) */}
          <div style={{
            position: 'absolute',
            bottom: '12%',
            right: '10%',
            width: '28%',
            height: '22%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,120,40,0.18) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* ── Dark core depth layer */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60%', height: '60%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,0,0,0.35) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* ── Noise texture overlay (organic skin) */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay',
            opacity: 0.55,
            pointerEvents: 'none',
          }} />

          {/* ── Rotating environment light arc */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', inset: '6px',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          >
            <div style={{
              position: 'absolute',
              top: '5%', left: '10%',
              width: '55%', height: '30%',
              borderRadius: '50%',
              background: `linear-gradient(135deg, rgba(255,200,140,${isDark ? '0.08' : '0.06'}) 0%, transparent 100%)`,
              filter: 'blur(4px)',
            }} />
          </motion.div>

          {/* ── Fresnel edge ring */}
          <div style={{
            position: 'absolute', inset: '2px',
            borderRadius: '50%',
            border: `1px solid rgba(255,180,100,${isDark ? '0.08' : '0.05'})`,
            pointerEvents: 'none',
          }} />

          {/* ── Processing spinner */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{
                  rotate: { duration: 1.2, repeat: Infinity, ease: 'linear' },
                  opacity: { duration: 0.25 },
                }}
                style={{
                  position: 'absolute', inset: '16px',
                  borderRadius: '50%',
                  border: '1.5px solid transparent',
                  borderTopColor: 'rgba(255,255,255,0.55)',
                  borderRightColor: 'rgba(255,255,255,0.18)',
                }}
              />
            )}
          </AnimatePresence>

          {/* ── Center icon */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AnimatePresence mode="wait">
              {isIdle && (
                <motion.div
                  key="mic"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 0.65, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.3 }}
                  style={{ color: '#000', lineHeight: 0 }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"/>
                    <path d="M19 10a7 7 0 0 1-14 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </motion.div>
              )}
              {isProcessing && (
                <motion.div
                  key="sparkles"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 0.7, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ color: 'rgba(0,0,0,0.65)', lineHeight: 0 }}
                >
                  <Sparkles size={30} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Ripple rings (recording) */}
        <AnimatePresence>
          {isRecording && [0, 1, 2].map(i => (
            <motion.div
              key={i}
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: 2.4 + i * 0.35, opacity: 0 }}
              transition={{ duration: 2.2, delay: i * 0.7, repeat: Infinity, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: '200px', height: '200px',
                marginTop: '-100px', marginLeft: '-100px',
                borderRadius: '50%',
                border: `1px solid ${isDark ? 'rgba(249,115,22,0.3)' : 'rgba(200,80,0,0.2)'}`,
                pointerEvents: 'none',
              }}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ─── Float chips ──────────────────────────────────────────
const FloatChip: React.FC<{ label: string; visible: boolean; x: number; y: number; delay: number; rotate: number }> =
  ({ label, visible, x, y, delay, rotate }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={visible ? { opacity: 0.55, scale: 1, x, y, rotate } : { opacity: 0, scale: 0.5, x: x * 0.2, y: y * 0.2, rotate: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.2, 0, 0, 1] }}
      style={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-16px', marginLeft: '-32px', pointerEvents: 'none' }}
    >
      <div style={{
        padding: '5px 13px',
        borderRadius: '999px',
        border: '1px solid rgba(249,115,22,0.22)',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(10px)',
        fontSize: '8.5px', fontWeight: 800,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        color: 'rgba(249,115,22,0.85)',
        whiteSpace: 'nowrap',
      }}>{label}</div>
    </motion.div>
  );

// ─────────────────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────────────────
export const LandingRecordScreen: React.FC<LandingRecordProps> = ({ setScreen, onSaveNote, isDark }) => {
  const { isAuthenticated } = useAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [timer, setTimer] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const orbControls = useAnimation();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    transcript,
    liveText,
    isSupported: isSpeechSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // ── Mouse tracking → parallax tilt
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (phase !== 'idle') return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const nx = (e.clientX / vw) * 2 - 1; // -1 → 1
      const ny = (e.clientY / vh) * 2 - 1; // -1 → 1
      setTilt(prev => ({
        x: prev.x + (nx - prev.x) * 0.08, // lerp
        y: prev.y + (ny - prev.y) * 0.08,
      }));
    };

    let raf: number;
    let last = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => { last = { x: e.clientX, y: e.clientY }; };
    const tick = () => {
      if (phase === 'idle') {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const nx = (last.x / vw) * 2 - 1;
        const ny = (last.y / vh) * 2 - 1;
        setTilt(prev => ({
          x: prev.x + (nx - prev.x) * 0.06,
          y: prev.y + (ny - prev.y) * 0.06,
        }));
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [phase]);

  // ── Timer
  useEffect(() => {
    if (phase === 'recording') {
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── Entrance
  useEffect(() => {
    orbControls.start({
      opacity: [0, 1], scale: [0.88, 1.03, 1],
      transition: { duration: 1.4, ease: [0.2, 0, 0, 1] },
    });
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Click handler
  const handleActivate = useCallback(async () => {
    if (phase !== 'idle') return;

    if (!isAuthenticated) {
      // Unauthenticated → sign in
      setScreen('signin');
      return;
    }

    // Authenticated → animate out, then go to home
    setPhase('activating');
    await orbControls.start({ scale: [1, 1.12, 1.06], transition: { duration: 0.55, ease: [0.2, 0, 0, 1] } });
    setTimeout(() => setScreen('home'), 400);
  }, [phase, isAuthenticated, orbControls, setScreen]);

  // ── Start recording (called from the recording screen flow)
  const handleStartRecording = useCallback(() => {
    if (!isSpeechSupported) {
      // Fallback: go to dedicated recording screen which handles unsupported browsers
      setScreen('recording');
      return;
    }
    resetTranscript();
    setTimer(0);
    setPhase('recording');
    startListening();
  }, [isSpeechSupported, setScreen, resetTranscript, startListening]);

  // ── Stop recording
  const handleStop = useCallback(async () => {
    if (phase !== 'recording') return;
    stopListening();
    setPhase('processing');
    
    const finalText = transcript.trim();
    if (!finalText) {
      setPhase('idle');
      return;
    }

    try {
      const aiResult = await processVoiceNote(finalText);
      onSaveNote({
        id: crypto.randomUUID(),
        title: aiResult?.title || `Voice Note ${new Date().toLocaleDateString()}`,
        content: aiResult?.content || finalText.slice(0, 120),
        body: aiResult?.body || finalText,
        type: aiResult?.type || 'voice',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pinned: false, createdAt: Date.now(),
        mood: aiResult?.mood || 'Neutral',
        tags: aiResult?.tags || [], attachments: [],
      });
    } catch {
      onSaveNote({
        id: crypto.randomUUID(), title: `Voice Note ${new Date().toLocaleDateString()}`,
        content: finalText.slice(0, 120), body: finalText, type: 'voice',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pinned: false, createdAt: Date.now(), mood: 'Neutral', tags: [], attachments: [],
      });
    } finally { setScreen('home'); }
  }, [phase, transcript, stopListening, onSaveNote, setScreen]);

  const isIdle = phase === 'idle';
  const isRecording = phase === 'recording';
  const isActive = isRecording || phase === 'processing';

  const bg = isDark ? '#000000' : '#fafaf9';
  const textPrimary = isDark ? 'rgba(255,255,255,0.95)' : 'rgba(15,15,15,0.95)';
  const textSecondary = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.35)';

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh', width: '100%',
        background: bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        fontFamily: "'Space Grotesk', 'DM Sans', system-ui, sans-serif",
        transition: 'background 0.5s ease',
      }}
    >
      {/* ── Grain overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='${isDark ? '0.04' : '0.025'}'/%3E%3C/svg%3E")`,
        opacity: 0.7,
      }} />

      {/* ── Ambient background bloom */}
      <motion.div
        animate={{ opacity: isActive ? (isDark ? 0.14 : 0.09) : (isDark ? 0.07 : 0.05), scale: isActive ? 1.3 : 1 }}
        transition={{ duration: 2, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px', height: '700px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,1) 0%, transparent 70%)',
          filter: 'blur(90px)', pointerEvents: 'none',
        }}
      />

      {/* ── Top status bar (recording) */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45 }}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '22px 28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isRecording && (
                <motion.div
                  animate={{ opacity: [1, 0.1, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                  style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f97316' }}
                />
              )}
              <span style={{
                fontSize: '10px', fontWeight: 800, letterSpacing: '0.28em',
                textTransform: 'uppercase', color: '#f97316',
              }}>
                {phase === 'processing' ? 'Processing signal' : 'Listening'}
              </span>
            </div>
            {isRecording && (
              <span style={{
                fontSize: '20px', fontWeight: 800, color: textPrimary,
                letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
              }}>
                {formatTime(timer)}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cancel (recording) */}
      <AnimatePresence>
        {isRecording && (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setScreen('home')}
            style={{
              position: 'absolute', top: '20px', right: '24px', zIndex: 30,
              background: 'none', border: 'none', cursor: 'pointer',
              color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', padding: '8px',
            }}
          >
            <X size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Title (idle) */}
      <AnimatePresence>
        {isIdle && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.65, delay: 0.25, ease: [0.2, 0, 0, 1] }}
            style={{ textAlign: 'center', marginBottom: '56px', zIndex: 10, position: 'relative' }}
          >
            <h1 style={{
              fontSize: 'clamp(40px, 9vw, 72px)',
              fontWeight: 900, color: textPrimary,
              letterSpacing: '-0.045em', lineHeight: 1, margin: 0,
            }}>
              VoiceAction
            </h1>
            <p style={{
              marginTop: '14px', fontSize: '10px', fontWeight: 800,
              letterSpacing: '0.32em', textTransform: 'uppercase', color: '#f97316',
            }}>
              Speak. Capture. Act.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ORB SYSTEM ─────────────────────────────────────── */}
      <motion.div animate={orbControls} style={{ position: 'relative', zIndex: 10 }}>

        {/* Float chips */}
        <FloatChip label="Task"  visible={isIdle} x={-128} y={-18} delay={0.5}  rotate={-7} />
        <FloatChip label="Idea"  visible={isIdle} x={112}  y={-28} delay={0.65} rotate={6}  />
        <FloatChip label="Event" visible={isIdle} x={-90}  y={82}  delay={0.8}  rotate={3}  />

        <Orb
          phase={phase}
          tiltX={tilt.x}
          tiltY={tilt.y}
          onClick={handleActivate}
          isDark={isDark}
        />

        {/* Waveform (recording) */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '52px', marginTop: '22px' }}
            >
              {Array.from({ length: 30 }).map((_, i) => <WaveBar key={i} index={i} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Speech error banner */}
      <AnimatePresence>
        {speechError && isActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', top: '70px', left: '20px', right: '20px',
              zIndex: 30, display: 'flex', alignItems: 'center', gap: '10px',
              background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '16px', padding: '12px 16px',
            }}
          >
            <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)', margin: 0 }}>{speechError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Transcript (recording) */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            style={{
              marginTop: '44px', maxWidth: '340px', width: '100%',
              padding: '0 24px', textAlign: 'center', zIndex: 10,
            }}
          >
            <p style={{
              fontSize: '15px', fontWeight: 500,
              color: liveText ? (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)') : (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.22)'),
              lineHeight: 1.75, fontStyle: liveText ? 'normal' : 'italic',
              letterSpacing: '-0.01em',
            }}>
              {liveText || 'Begin speaking…'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CTA (idle) */}
      <AnimatePresence>
        {isIdle && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.55, delay: 0.45, ease: [0.2, 0, 0, 1] }}
            style={{ marginTop: '68px', zIndex: 10, textAlign: 'center' }}
          >
            {/* Primary CTA */}
            <button
              onClick={handleActivate}
              style={{
                background: '#f97316', color: '#000', border: 'none',
                borderRadius: '999px', padding: '15px 44px',
                fontSize: '11px', fontWeight: 800, letterSpacing: '0.22em',
                textTransform: 'uppercase', cursor: 'pointer',
                boxShadow: isDark
                  ? '0 0 0 1px rgba(249,115,22,0.15), 0 0 32px rgba(249,115,22,0.28)'
                  : '0 0 0 1px rgba(249,115,22,0.2), 0 4px 20px rgba(249,115,22,0.22)',
                transition: 'transform 0.14s ease, box-shadow 0.25s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = isDark
                  ? '0 0 0 1px rgba(249,115,22,0.25), 0 0 50px rgba(249,115,22,0.38)'
                  : '0 0 0 1px rgba(249,115,22,0.3), 0 6px 28px rgba(249,115,22,0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = isDark
                  ? '0 0 0 1px rgba(249,115,22,0.15), 0 0 32px rgba(249,115,22,0.28)'
                  : '0 0 0 1px rgba(249,115,22,0.2), 0 4px 20px rgba(249,115,22,0.22)';
              }}
            >
              {isAuthenticated ? 'Tap to Begin' : 'Get Started'}
            </button>

            {/* Ghost link */}
            {!isAuthenticated && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                <button
                  onClick={() => setScreen('signin')}
                  style={{
                    marginTop: '20px', display: 'block', width: '100%',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: textSecondary,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f97316'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = textSecondary; }}
                >
                  Already have an account →
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stop button (recording) */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
            style={{ marginTop: '52px', zIndex: 10 }}
          >
            <button
              onClick={handleStop}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '14px 34px',
                background: isDark ? 'rgba(249,115,22,0.07)' : 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.28)',
                borderRadius: '999px', cursor: 'pointer',
                fontSize: '11px', fontWeight: 800,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: '#f97316',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(249,115,22,0.14)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(249,115,22,0.07)' : 'rgba(249,115,22,0.08)'; }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f97316', display: 'block', flexShrink: 0 }} />
              Stop & Save
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer */}
      <AnimatePresence>
        {isIdle && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            style={{
              position: 'absolute', bottom: '28px', fontSize: '9px',
              fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: textSecondary,
            }}
          >
            Privacy first. No data sold.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};
