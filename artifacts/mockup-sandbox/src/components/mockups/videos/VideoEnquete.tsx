import './_group.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const SCENE_DURATIONS = [
  3000,
  5000,
];

export function VideoEnquete() {
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const playNext = (sceneIndex: number) => {
      timeout = setTimeout(() => {
        const nextScene = (sceneIndex + 1) % SCENE_DURATIONS.length;
        setCurrentScene(nextScene);
        playNext(nextScene);
      }, SCENE_DURATIONS[sceneIndex]);
    };
    playNext(0);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="video-root relative w-[min(100vw,100vh)] aspect-square bg-[#0a0a0f] overflow-hidden text-white flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-noise" />
        <motion.div
          className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-30"
          style={{
            background: 'radial-gradient(circle at center, #3b82f6 0%, transparent 40%), radial-gradient(circle at 80% 80%, #8b5cf6 0%, transparent 40%)'
          }}
          animate={{ rotate: currentScene === 0 ? 0 : 45, scale: currentScene === 0 ? 1 : 1.2 }}
          transition={{ duration: 4, ease: "easeInOut" }}
        />

        {[0,1,2,3,4].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: `${[8,6,10,5,7][i]}cqw`,
              height: `${[8,6,10,5,7][i]}cqw`,
              background: i % 2 === 0 ? '#3b82f6' : '#8b5cf6',
              left: `${[15,70,40,85,25][i]}%`,
              top: `${[20,15,60,70,80][i]}%`,
            }}
            animate={{ y: [0, -60, 0], x: [0, 30, 0], scale: [1, 1.4, 1], opacity: [0.25, 0.7, 0.25] }}
            transition={{ duration: [7,5,9,6,8][i], repeat: Infinity, ease: "easeInOut", delay: i * 0.7 }}
          />
        ))}

        <AnimatePresence mode="wait">
          {currentScene === 0 && <SceneHook key="scene-0" />}
          {currentScene === 1 && <SceneOptions key="scene-1" />}
        </AnimatePresence>

        <motion.div
          className="absolute bottom-[5%] w-full text-center z-30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <motion.p
            className="font-body text-white/50 tracking-widest uppercase font-semibold"
            style={{ fontSize: '2.5cqw' }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            Escola Tânia Varella Ferreira
          </motion.p>
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="border border-blue-500/50 rounded-full glow-blue"
        style={{ padding: '2cqw 5cqw', background: 'rgba(59,130,246,0.15)', marginBottom: '7cqw' }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
      >
        <span className="font-display font-bold text-blue-400 tracking-widest" style={{ fontSize: '4cqw' }}>
          TÉCNICO 2C
        </span>
      </motion.div>

      <motion.h1
        className="font-display font-bold leading-tight text-glow"
        style={{ fontSize: '8cqw', lineHeight: 1.1 }}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
      >
        A escola deveria usar um<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          sistema digital
        </span>{' '}
        de agenda?
      </motion.h1>
    </motion.div>
  );
}

function SceneOptions() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center w-full h-full z-20"
      style={{ padding: '8cqw' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex w-full" style={{ gap: '6cqw', marginBottom: '10cqw' }}>
        <motion.div
          className="flex-1 border-2 border-blue-500 rounded-3xl flex flex-col items-center justify-center glow-blue"
          style={{ padding: '8cqw 4cqw', background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(30,58,138,0.25))' }}
          initial={{ x: -50, opacity: 0, rotateY: -20 }}
          animate={{ x: 0, opacity: 1, rotateY: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
        >
          <motion.span
            style={{ fontSize: '14cqw', lineHeight: 1, marginBottom: '3cqw', display: 'block' }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            👍
          </motion.span>
          <span className="font-display font-bold text-blue-100" style={{ fontSize: '7cqw' }}>SIM</span>
        </motion.div>

        <motion.div
          className="flex-1 border-2 border-purple-500 rounded-3xl flex flex-col items-center justify-center glow-purple"
          style={{ padding: '8cqw 4cqw', background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(76,29,149,0.25))' }}
          initial={{ x: 50, opacity: 0, rotateY: 20 }}
          animate={{ x: 0, opacity: 1, rotateY: 0 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 15 }}
        >
          <motion.span
            style={{ fontSize: '14cqw', lineHeight: 1, marginBottom: '3cqw', display: 'block' }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            👎
          </motion.span>
          <span className="font-display font-bold text-purple-100" style={{ fontSize: '7cqw' }}>NÃO</span>
        </motion.div>
      </div>

      <motion.div
        className="bg-white text-black rounded-full font-display font-bold"
        style={{
          padding: '3cqw 8cqw',
          fontSize: '5cqw',
          boxShadow: '0 0 30px rgba(255,255,255,0.3)'
        }}
        initial={{ y: 50, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 20 }}
      >
        Responde na enquete! 👇
      </motion.div>
    </motion.div>
  );
}
