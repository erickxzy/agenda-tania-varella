import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SCENE_DURATIONS = [
  3000, // Scene 0: Hook "Técnico 2C" + Question (3s)
  5000, // Scene 1: Options + CTA (5s)
];

const TOTAL_DURATION = SCENE_DURATIONS.reduce((a, b) => a + b, 0);

export default function VideoEnquete() {
  const [currentScene, setCurrentScene] = useState(0);

  // Loop control
  useEffect(() => {
    let timeout: NodeJS.Timeout;
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
    <div className="relative w-full h-full bg-[#0a0a0f] overflow-hidden text-white flex flex-col items-center justify-center">
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 bg-noise" />
      
      {/* Animated Gradient Background */}
      <motion.div 
        className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-30"
        style={{
          background: 'radial-gradient(circle at center, #3b82f6 0%, transparent 40%), radial-gradient(circle at 80% 80%, #8b5cf6 0%, transparent 40%)'
        }}
        animate={{
          rotate: currentScene === 0 ? 0 : 45,
          scale: currentScene === 0 ? 1 : 1.2,
        }}
        transition={{ duration: 4, ease: "easeInOut" }}
      />

      {/* Persistent Floating Particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 10 + 5 + 'px',
            height: Math.random() * 10 + 5 + 'px',
            background: i % 2 === 0 ? '#3b82f6' : '#8b5cf6',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            opacity: 0.6
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, 50, 0],
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.8, 0.3]
          }}
          transition={{
            duration: Math.random() * 5 + 5,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 2
          }}
        />
      ))}

      {/* Content Layer */}
      <AnimatePresence mode="wait">
        {currentScene === 0 && <SceneHook key="scene-0" />}
        {currentScene === 1 && <SceneOptions key="scene-1" />}
      </AnimatePresence>

      {/* Persistent Footer */}
      <motion.div 
        className="absolute bottom-[5%] w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <motion.p 
          className="text-white/50 text-[3cqw] font-body tracking-widest uppercase font-semibold"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          Escola Tânia Varella Ferreira
        </motion.p>
      </motion.div>
    </div>
  );
}

function SceneHook() {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center w-full h-full p-12 text-center z-20"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="px-6 py-2 bg-blue-500/20 border border-blue-500/50 rounded-full mb-8 glow-blue"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
      >
        <span className="text-blue-400 font-display font-bold text-[4cqw] tracking-wider">TÉCNICO 2C</span>
      </motion.div>

      <motion.h1 
        className="font-display font-bold text-[8cqw] leading-[1.1] text-glow"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 20 }}
      >
        A escola deveria usar um <br/>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          sistema digital
        </span> de agenda?
      </motion.h1>
    </motion.div>
  );
}

function SceneOptions() {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center w-full h-full p-12 z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex gap-8 mb-16 w-full max-w-[80%]">
        <motion.div 
          className="flex-1 bg-gradient-to-br from-blue-600/30 to-blue-900/30 border-2 border-blue-500 rounded-3xl p-10 flex flex-col items-center justify-center glow-blue"
          initial={{ x: -50, opacity: 0, rotateY: -30 }}
          animate={{ x: 0, opacity: 1, rotateY: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
          whileHover={{ scale: 1.05 }}
        >
          <motion.span 
            className="text-[12cqw] mb-4"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            👍
          </motion.span>
          <span className="font-display font-bold text-[6cqw] text-blue-100">SIM</span>
        </motion.div>

        <motion.div 
          className="flex-1 bg-gradient-to-br from-purple-600/30 to-purple-900/30 border-2 border-purple-500 rounded-3xl p-10 flex flex-col items-center justify-center glow-purple"
          initial={{ x: 50, opacity: 0, rotateY: 30 }}
          animate={{ x: 0, opacity: 1, rotateY: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
        >
          <motion.span 
            className="text-[12cqw] mb-4"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            👎
          </motion.span>
          <span className="font-display font-bold text-[6cqw] text-purple-100">NÃO</span>
        </motion.div>
      </div>

      <motion.div
        className="bg-white text-black px-10 py-4 rounded-full font-bold font-display text-[5cqw] shadow-[0_0_30px_rgba(255,255,255,0.3)]"
        initial={{ y: 50, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 300, damping: 20 }}
      >
        Responde na enquete! 👇
      </motion.div>
    </motion.div>
  );
}
