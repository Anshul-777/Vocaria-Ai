import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LINES = [
  { text: "Vocaria Engine Initialized.", delay: 0, speed: 45 },
  { text: "VOCARIA AI", delay: 1200, speed: 80, isBrand: true },
  { text: "Loading your workspace...", delay: 2800, speed: 30, isBody: true },
];

function Typewriter({ text, speed, active }: { text: string; speed: number; active: boolean }) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (!active) { setOut(""); setDone(false); return; }
    if (speed === 0) { setOut(text); setDone(true); return; }
    setOut(""); setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, active]);

  useEffect(() => {
    const t = setInterval(() => setBlink(v => !v), 520);
    return () => clearInterval(t);
  }, []);

  const cursor = !done && active ? (
    <span className="inline-block w-[2px] h-[1em] ml-[2px] -mb-[2px] align-middle transition-opacity duration-100"
      style={{ opacity: blink ? 1 : 0, background: "currentcolor" }} />
  ) : null;

  return <>{out}{cursor}</>;
}

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
      setTimeout(() => navigate("/dashboard"), 650);
    }, 4500);
  }, [navigate]);

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden"
      style={{
        background: "#fafaf8",
        fontFamily: "'Inter',system-ui,sans-serif",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.012)" : "scale(1)",
        transition: "opacity 0.65s ease, transform 0.65s ease",
      }}>

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-8%] w-[55vw] h-[55vw] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(42,92,255,0.06) 0%,transparent 70%)" }} />
        <div className="absolute bottom-[-15%] right-[-8%] w-[45vw] h-[45vw] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(124,58,237,0.05) 0%,transparent 70%)" }} />
        {/* Dot grid */}
        {mounted && (
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
            <defs>
              <pattern id="dots" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.85" fill="#0a0a0f" opacity="0.07" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        )}
        {/* Corner brackets */}
        {[["top-7 left-7", "tl"], ["top-7 right-7", "tr"], ["bottom-7 left-7", "bl"], ["bottom-7 right-7", "br"]].map(([pos, side]) => (
          <div key={side} className={`absolute ${pos} w-9 h-9`}
            style={{
              borderTop: ["tl", "tr"].includes(side) ? "1.5px solid #e5e5e0" : undefined,
              borderBottom: ["bl", "br"].includes(side) ? "1.5px solid #e5e5e0" : undefined,
              borderLeft: ["tl", "bl"].includes(side) ? "1.5px solid #e5e5e0" : undefined,
              borderRight: ["tr", "br"].includes(side) ? "1.5px solid #e5e5e0" : undefined,
              borderRadius: side === "tl" ? "12px 0 0 0" : side === "tr" ? "0 12px 0 0" : side === "bl" ? "0 0 0 12px" : "0 0 12px 0",
            }} />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-8 sm:px-14 md:px-20 lg:px-32 xl:px-44 max-w-4xl mx-auto">
        <div className="space-y-4">

          {/* Tagline */}
          {LINES[0] && (
            <div className={`transition-all duration-700 ${shown[0] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <p className="text-sm font-mono tracking-[0.28em] uppercase" style={{ color: "#9ca3af" }}>
                <Typewriter text={LINES[0].text} speed={LINES[0].speed} active={shown[0]} />
              </p>
            </div>
          )}

          {/* Brand */}
          {LINES[1] && (
            <div className={`my-4 transition-all duration-700 ${shown[1] ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
              <h1 className="font-black leading-none tracking-tight"
                style={{
                  fontSize: "clamp(48px,9vw,100px)",
                  background: "linear-gradient(135deg,#0a0a0f 0%,#374151 45%,#2a5cff 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  color: "#0a0a0f",
                }}>
                <Typewriter text={LINES[1].text} speed={LINES[1].speed} active={shown[1]} />
              </h1>
            </div>
          )}

          {/* Body */}
          {LINES[2] && (
            <div className={`transition-all duration-700 ${shown[2] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
              <p className="text-xl md:text-2xl font-medium leading-relaxed"
                style={{ color: "#2a5cff" }}>
                <Typewriter text={LINES[2].text} speed={LINES[2].speed} active={shown[2]} />
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: 3 animated dots */}
      <div className={`relative z-10 px-8 sm:px-14 pb-8 transition-all duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full"
              style={{
                background: `linear-gradient(135deg,#2a5cff,#7c3aed)`,
                animation: `dotPulse 1.4s ease-in-out infinite ${i * 0.22}s`,
              }} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes dotPulse {
          0%,100% { transform:scale(1);   opacity:0.3; }
          50%      { transform:scale(1.5); opacity:1;   }
        }
      `}</style>
    </div>
  );
}
