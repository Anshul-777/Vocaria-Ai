import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MicOff, FileText, Activity, Palette, RefreshCw, Volume2, Paintbrush, MoveHorizontal,
  Target, Crop, Zap, TrendingUp, Diamond, Columns, MonitorPlay, Layout, Wand2,
  Layers, UserCircle, Presentation, ArrowDownCircle, FileEdit, Languages, Music,
  Film, Clapperboard, Scissors, Image as ImageIcon, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';

const ALL_FEATURES = [
  { name: 'Silence Detection', icon: MicOff },
  { name: 'Speech to Text', icon: FileText },
  { name: 'Audio Visualizer', icon: Activity },
  { name: 'Color Correction', icon: Palette },
  { name: 'Auto Synchronization', icon: RefreshCw },
  { name: 'Text to Speech', icon: Volume2 },
  { name: 'Color Match', icon: Paintbrush },
  { name: 'AI Audio Stretch', icon: MoveHorizontal },
  { name: 'Motion Tracking', icon: Target },
  { name: 'Auto Reframe', icon: Crop },
  { name: 'Auto Beat Sync', icon: Activity },
  { name: 'Speed Ramping', icon: TrendingUp },
  { name: 'Keyframing', icon: Diamond },
  { name: 'Split Screen', icon: Columns },
  { name: 'Screen Recorder', icon: MonitorPlay },
  { name: 'Instant Mode', icon: Zap },
  { name: 'Preset Templates', icon: Layout },
  { name: 'Video Effects', icon: Wand2 },
  { name: 'Mask & Blend', icon: Layers },
  { name: 'AI Portrait', icon: UserCircle },
  { name: 'Chroma Key (Green Screen)', icon: Presentation },
  { name: 'Audio Ducking', icon: ArrowDownCircle },
  { name: 'AI Text-Based Editing', icon: FileEdit },
  { name: 'AI Translation', icon: Languages },
  { name: 'AI Music Generator', icon: Music },
  { name: 'AI Video Interpolation', icon: Film },
  { name: 'AI Text-To-Video', icon: Clapperboard },
  { name: 'AI Vocal Remover', icon: Scissors },
  { name: 'AI Thumbnail Creator', icon: ImageIcon },
  { name: 'AI Audio Denoise', icon: Filter },
];

const ITEMS_PER_PAGE = 8;

export default function VoiceTools() {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(ALL_FEATURES.length / ITEMS_PER_PAGE);

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const currentFeatures = ALL_FEATURES.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center bg-white py-16 px-4 font-sans">
      <h2 className="text-3xl md:text-[32px] font-bold text-[#1a2b3c] mb-16" style={{ fontFamily: "'Inter', sans-serif" }}>
        Explore More Features
      </h2>

      <div className="w-full max-w-5xl flex items-center justify-between">
        {/* Left Arrow */}
        <button 
          onClick={prevPage}
          className="p-2 text-[#1a2b3c] hover:text-gray-500 transition-colors disabled:opacity-30 disabled:hover:text-[#1a2b3c]"
        >
          <ChevronLeft size={48} strokeWidth={1} />
        </button>

        {/* Features Grid */}
        <div className="flex-1 overflow-hidden px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-y-16 gap-x-8"
            >
              {currentFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={index} 
                    className="flex flex-col items-center text-center cursor-pointer group"
                  >
                    <div className="w-16 h-16 mb-4 flex items-center justify-center text-[#1a2b3c] group-hover:scale-110 transition-transform duration-300">
                      <Icon size={40} strokeWidth={1.5} />
                    </div>
                    <span className="text-[#1a2b3c] font-medium text-[15px]">
                      {feature.name}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Arrow */}
        <button 
          onClick={nextPage}
          className="p-2 text-[#1a2b3c] hover:text-gray-500 transition-colors disabled:opacity-30 disabled:hover:text-[#1a2b3c]"
        >
          <ChevronRight size={48} strokeWidth={1} />
        </button>
      </div>

      {/* Pagination Dots (Optional, but good for UX) */}
      <div className="flex items-center gap-2 mt-16">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              currentPage === i ? 'bg-[#1a2b3c]' : 'bg-gray-300'
            }`}
            aria-label={`Go to page ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
