import './_group.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const SCENE_DURATIONS = [2000, 2500, 2500, 2500, 2500, 3000];
const FEATURES = [
  { icon: '📅', text: 'Eventos e Provas', color: 'blue' as const },
  { icon: '🍽️', text: 'Cardápio Semanal', color: 'purple' as const },
  { icon: '💬', text: 'Tire suas Dúvidas', color: 'blue' as const },
  { icon: '📊', text: 'Enquetes e Ranking', color: 'purple' as const },
];

export function VideoShowcase() {
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const playNext = (idx: number) => {
      timeout = setTimeout(() => {
        const next = (idx + 1) % SCENE_DURATIONS.length;
        setCurrentScene(next);
        playNext(next);
      }, SCENE_DURATIONS[idx]);
    };
    playNext(0);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div
        className="video-root relative bg-[#0a0a0f] overflow-hidden text-white flex flex-col items-center justify-center"
        style={{ width: 'min(100vw,100vh)', aspectRatio: '1/1' }}
      >
        <div className="absolute inset-0 bg-noise" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#3b82f6 1px,transparent 1px),linear-gradient(90deg,#3b82f6 1px,transparent 1px)',
            backgroundSize: '5cqw 5cqw',
            transform: 'perspective(500px) rotateX(55deg) translateY(-5cqw)',
            transformOrigin: 'top center',
          }}
        />

        {/* Orb */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ width: '70%', height: '70%', filter: 'blur(80px)', opacity: 0.35, mixBlendMode: 'screen' }}
          animate={{
            background: currentScene % 2 === 0
              ? 'radial-gradient(circle,#3b82f6 0%,transparent 70%)'
              : 'radial-gradient(circle,#8b5cf6 0%,transparent 70%)',
            x: currentScene === 5 ? '0%' : (currentScene % 2 === 0 ? '-20%' : '20%'),
            y: currentScene === 5 ? '0%' : (currentScene % 3 === 0 ? '-15%' : '15%'),
          }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />

        <AnimatePresence mode="wait">
          {currentScene === 0 && <SceneHook key="s0" />}
          {currentScene >= 1 && currentScene <= 4 && (
            <SceneFeature key={`s${currentScene}`} {...FEATURES[currentScene - 1]} />
          )}
          {currentScene === 5 && <SceneCTA key="s5" />}
        </AnimatePresence>

        <motion.div
          className="absolute bottom-[4%] w-full text-center z-30 pointer-events-none"
          animate={{ opacity: currentScene === 0 ? 0 : 0.6 }}
          transition={{ duration: 0.5 }}
        >
          <p className="font-body tracking-widest uppercase font-semibold text-white/60" style={{ fontSize: '2.2cqw' }}>
            Escola Tânia Varella Ferreira
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function SceneHook() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center w-full h-full text-center z-20"
      style={{ padding: '10cqw' }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.5, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, type: 'spring', stiffness: 100, damping: 15 }}
    >
      <motion.h1
        className="font-display font-bold uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 text-glow"
        style={{ fontSize: '9cqw', lineHeight: 1.1 }}
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        Chegou a<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400">
          agenda digital
        </span>
        <br />da sua escola!
      </motion.h1>
    </motion.div>
  );
}

function SceneFeature({ icon, text, color }: { icon: string; text: string; color: 'blue' | 'purple' }) {
  const glowClass = color === 'blue' ? 'glow-blue' : 'glow-purple';
  const borderColor = color === 'blue' ? '#3b82f6' : '#8b5cf6';
  const bg = color === 'blue' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)';

  return (
    <motion.div
      className="flex flex-col items-center justify-center w-full h-full z-20"
      style={{ padding: '10cqw' }}
      initial={{ opacity: 0, x: 80, skewX: -8 }}
      animate={{ opacity: 1, x: 0, skewX: 0 }}
      exit={{ opacity: 0, x: -80, skewX: 8 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className={`rounded-3xl flex items-center justify-center relative ${glowClass}`}
        style={{
          width: '42cqw', height: '42cqw',
          background: bg, border: `2px solid ${borderColor}`,
          marginBottom: '6cqw',
        }}
        initial={{ scale: 0.8, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
      >
        <motion.span
          style={{ fontSize: '22cqw', lineHeight: 1 }}
          animate={{ y: [0, '-8cqw', 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {icon}
        </motion.span>
      </motion.div>
      <motion.h2
        className="font-display font-bold text-center"
        style={{ fontSize: '7.5cqw' }}
        initial={{ y: 25, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        {text}
      </motion.h2>
    </motion.div>
  );
}

function SceneCTA() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center w-full h-full text-center z-20"
      style={{ padding: '10cqw' }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: 80 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <motion.h2
        className="font-display font-bold"
        style={{ fontSize: '7cqw', marginBottom: '6cqw' }}
        initial={{ y: -25, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Acesse agora:
      </motion.h2>

      <motion.div
        className="relative overflow-hidden glow-blue rounded-2xl"
        style={{
          background: '#000', border: '1px solid #3f3f46',
          padding: '4cqw 6cqw',
        }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 250, damping: 20 }}
      >
        <motion.div
          className="absolute inset-0 skew-x-12"
          style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)' }}
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ delay: 1, duration: 1.4, repeat: Infinity, repeatDelay: 1.2 }}
        />
        <span className="font-display font-bold text-blue-400 relative z-10" style={{ fontSize: '4.5cqw' }}>
          agenda-tania-varella.replit.app
        </span>
      </motion.div>
    </motion.div>
  );
}
