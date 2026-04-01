import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SCENE_DURATIONS = [
  2000, // Scene 0: Hook (2s)
  2500, // Scene 1: Feature 1 (2.5s)
  2500, // Scene 2: Feature 2 (2.5s)
  2500, // Scene 3: Feature 3 (2.5s)
  2500, // Scene 4: Feature 4 (2.5s)
  3000, // Scene 5: CTA (3s)
];

export default function VideoShowcase() {
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
      <div className="absolute inset-0 bg-noise" />

      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
          backgroundSize: '4cqw 4cqw',
          transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
          transformOrigin: 'top center'
        }}
      />
      
      {/* Animated Glowing Orb */}
      <motion.div 
        className="absolute w-[80%] h-[80%] rounded-full blur-[100px] opacity-40 mix-blend-screen"
        animate={{
          background: currentScene % 2 === 0 
            ? 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' 
            : 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
          x: currentScene === 5 ? 0 : (currentScene % 2 === 0 ? '-20%' : '20%'),
          y: currentScene === 5 ? 0 : (currentScene % 3 === 0 ? '-20%' : '20%'),
          scale: currentScene === 0 ? 1.5 : 1
        }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />

      <AnimatePresence mode="wait">
        {currentScene === 0 && <SceneHook key="scene-0" />}
        {currentScene === 1 && <SceneFeature key="scene-1" icon="📅" text="Eventos e Provas" color="blue" />}
        {currentScene === 2 && <SceneFeature key="scene-2" icon="🍽️" text="Cardápio Semanal" color="purple" />}
        {currentScene === 3 && <SceneFeature key="scene-3" icon="💬" text="Tire suas Dúvidas" color="blue" />}
        {currentScene === 4 && <SceneFeature key="scene-4" icon="📊" text="Enquetes e Ranking" color="purple" />}
        {currentScene === 5 && <SceneCTA key="scene-5" />}
      </AnimatePresence>

      {/* Persistent Footer */}
      <motion.div 
        className="absolute bottom-[5%] w-full text-center z-30"
        animate={{ opacity: currentScene === 0 ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-white/60 text-[2.5cqw] font-body tracking-widest uppercase font-semibold">
          Escola Tânia Varella Ferreira
        </p>
      </motion.div>
    </div>
  );
}

function SceneHook() {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center w-full h-full p-12 text-center z-20"
      initial={{ opacity: 0, scale: 0.5, rotateX: 90 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      exit={{ opacity: 0, scale: 1.5, filter: "blur(20px)" }}
      transition={{ duration: 0.8, type: "spring", stiffness: 100, damping: 15 }}
    >
      <motion.h1 
        className="font-display font-bold text-[9cqw] leading-[1.1] uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 text-glow"
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        Chegou a <br/>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400">
          agenda digital
        </span><br/>
        da sua escola!
      </motion.h1>
    </motion.div>
  );
}

function SceneFeature({ icon, text, color }: { icon: string, text: string, color: 'blue' | 'purple' }) {
  const glowClass = color === 'blue' ? 'glow-blue' : 'glow-purple';
  const borderColor = color === 'blue' ? 'border-blue-500' : 'border-purple-500';
  const bgColor = color === 'blue' ? 'bg-blue-500/10' : 'bg-purple-500/10';

  return (
    <motion.div 
      className="flex flex-col items-center justify-center w-full h-full p-12 z-20"
      initial={{ opacity: 0, x: 100, skewX: -10 }}
      animate={{ opacity: 1, x: 0, skewX: 0 }}
      exit={{ opacity: 0, x: -100, skewX: 10 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div 
        className={`w-[40cqw] h-[40cqw] rounded-3xl ${bgColor} border-2 ${borderColor} flex items-center justify-center mb-8 relative ${glowClass}`}
        initial={{ scale: 0.8, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
      >
        <motion.span 
          className="text-[20cqw]"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {icon}
        </motion.span>
      </motion.div>
      <motion.h2 
        className="font-display font-bold text-[7cqw] text-center"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {text}
      </motion.h2>
    </motion.div>
  );
}

function SceneCTA() {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center w-full h-full p-12 text-center z-20"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <motion.h2 
        className="font-display font-bold text-[7cqw] mb-8"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Acesse agora:
      </motion.h2>

      <motion.div 
        className="bg-black border border-zinc-700 rounded-2xl p-6 glow-blue relative overflow-hidden group"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 250, damping: 20 }}
      >
        {/* Shine effect */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ delay: 1, duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
        />
        
        <span className="font-display font-bold text-[5cqw] text-blue-400 relative z-10">
          agenda-tania-varella.replit.app
        </span>
      </motion.div>
    </motion.div>
  );
}
