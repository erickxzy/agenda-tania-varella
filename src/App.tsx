import React, { useState } from 'react';
import VideoEnquete from './videos/VideoEnquete';
import VideoShowcase from './videos/VideoShowcase';

export default function App() {
  const [activeVideo, setActiveVideo] = useState<'enquete' | 'showcase'>('enquete');

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 gap-8 font-sans">
      <div className="flex gap-4">
        <button
          onClick={() => setActiveVideo('enquete')}
          className={`px-6 py-2 rounded-full font-bold transition-all ${
            activeVideo === 'enquete' 
              ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
              : 'bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          Video 1: Enquete
        </button>
        <button
          onClick={() => setActiveVideo('showcase')}
          className={`px-6 py-2 rounded-full font-bold transition-all ${
            activeVideo === 'showcase' 
              ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]' 
              : 'bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          Video 2: Showcase
        </button>
      </div>

      {/* Container to enforce 1:1 aspect ratio mapping to 100vmin */}
      <div className="relative overflow-hidden rounded-xl shadow-2xl border border-zinc-800" style={{ width: '80vmin', height: '80vmin', maxWidth: '800px', maxHeight: '800px' }}>
        {activeVideo === 'enquete' ? <VideoEnquete /> : <VideoShowcase />}
      </div>
      
      <div className="text-zinc-500 text-sm">
        1080x1080 Square Format (Preview scaled to fit)
      </div>
    </div>
  );
}
