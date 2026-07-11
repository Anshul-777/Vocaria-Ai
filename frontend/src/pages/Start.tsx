import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LINES = [
  { text: "SYSTEM INITIALIZED", delay: 100 },
  { text: "VOCARIA AI", delay: 300, isBrand: true },
  { text: "Preparing your workspace...", delay: 600 },
];

export default function Start() {
  const navigate = useNavigate();
  const [shown, setShown] = useState<boolean[]>(new Array(LINES.length).fill(false));
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    LINES.forEach((line, i) => {
      setTimeout(() => setShown(prev => { const n = [...prev]; n[i] = true; return n; }), line.delay);
    });
    
    // Auto redirect after animation completes
    setTimeout(() => {
      setExiting(true);
      setTimeout(() => navigate("/dashboard"), 800);
    }, 2500); 
  }, [navigate]);

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden"
      style={{
        background: "#fafaf8",
        fontFamily: "'Inter',system-ui,sans-serif",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.02) translateY(-10px)" : "scale(1) translateY(0)",
        filter: exiting ? "blur(8px)" : "blur(0px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-8%] w-[55vw] h-[55vw] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(42,92,255,0.06) 0%,transparent 70%)" }} />
        <div className="absolute bottom-[-15%] right-[-8%] w-[45vw] h-[45vw] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(124,58,237,0.05) 0%,transparent 70%)" }} />
        
        {/* Dot grid */}
        {mounted && (
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.4 }}>
            <defs>
              <pattern id="dots" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.85" fill="#0a0a0f" opacity="0.08" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        )}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-8 sm:px-14 md:px-20 max-w-4xl mx-auto w-full">
        <div className="space-y-4">

          {/* Tagline */}
          <div className={`transition-all duration-1000 ease-out ${shown[0] ? "opacity-100 translate-y-0 filter-none" : "opacity-0 translate-y-8 blur-sm"}`}>
            <p className="text-xs sm:text-sm font-mono tracking-[0.3em] uppercase" style={{ color: "#8b949e" }}>
              {LINES[0].text}
            </p>
          </div>

          {/* Brand */}
          <div className={`my-4 transition-all duration-1000 delay-100 ease-out ${shown[1] ? "opacity-100 translate-y-0 filter-none" : "opacity-0 translate-y-8 blur-md"}`}>
            <h1 className="font-black leading-none tracking-tight"
              style={{
                fontSize: "clamp(48px,9vw,100px)",
                background: "linear-gradient(135deg,#0a0a0f 0%,#4b5563 45%,#2a5cff 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                color: "#0a0a0f",
              }}>
              {LINES[1].text}
            </h1>
          </div>

          {/* Body */}
          <div className={`transition-all duration-1000 delay-200 ease-out ${shown[2] ? "opacity-100 translate-y-0 filter-none" : "opacity-0 translate-y-8 blur-sm"}`}>
            <p className="text-lg md:text-xl font-medium leading-relaxed"
              style={{ color: "#2a5cff" }}>
              {LINES[2].text}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom: elegant loading bar */}
      <div className={`relative z-10 px-8 sm:px-14 md:px-20 pb-12 transition-all duration-1000 delay-300 ${mounted ? "opacity-100" : "opacity-0"}`}>
        <div className="w-48 h-[2px] bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full animate-loading-bar" />
        </div>
      </div>
      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; transform: translateX(-100%); }
          100% { width: 100%; transform: translateX(100%); }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
