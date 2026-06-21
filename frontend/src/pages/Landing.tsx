import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Mic2,
  Waves,
  Sparkles,
  Shield,
  Globe2,
  PlayCircle,
  PauseCircle,
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  Plus,
  Minus,
  Radio,
  Bot,
  Languages,
  Heart,
  ShieldAlert,
  Activity,
  Headphones,
  AudioLines,
  ChevronDown,
  Star,
  Users,
  Send,
  Mail,
  Github,
  Twitter,
  Linkedin,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   VOCARIA · Landing
   White-base · Deep blue + electric violet + iridescent accents
   ────────────────────────────────────────────────────────────── */

const ACCENT = {
  blue: "#2563eb",
  violet: "#7c3aed",
  pink: "#ec4899",
};

/* ============ Small primitives ============ */

const Logo = ({ size = 40 }: { size?: number }) => (
  <div className="flex items-center gap-2.5 group cursor-pointer">
    < div
className ="relative grid place-items-center rounded-[12px] bg-black overflow-hidden"
style = {{ width: size, height: size }}
    >
  {/* iridescent edge */ }
  < div className ="absolute inset-0 opacity-90 bg-[conic-gradient(from_0deg,#7c3aed,#2563eb,#ec4899,#7c3aed)] blur-[6px]" />
    < div className ="absolute inset-[2px] rounded-[10px] bg-black" />
{/* sound bars */ }
<div className="relative z-10 flex items-end gap-[2px] h-[55%]">
  < span className ="w-[3px] bg-white rounded-full" style={{ height: "40%" }} />
    < span className ="w-[3px] bg-white rounded-full" style={{ height: "90%" }} />
      < span className ="w-[3px] bg-white rounded-full" style={{ height: "60%" }} />
        < span className ="w-[3px] bg-white rounded-full" style={{ height: "100%" }} />
          < span className ="w-[3px] bg-white rounded-full" style={{ height: "50%" }} />
      </div >
    </div >
  <span className="font-semibold text-[20px] tracking-tight text-black">
Vocaria < span style = {{ color: ACCENT.violet }}>.</span >
    </span >
  </div >
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <div
    data-testid="hero-pill"
className ="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-black/10 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
  >
  <span className="relative flex h-2 w-2">
    < span
className ="absolute inset-0 rounded-full animate-ping"
style = {{ backgroundColor: ACCENT.violet, opacity: 0.45 }}
      />
  < span
className ="relative inline-flex h-2 w-2 rounded-full"
style = {{ backgroundColor: ACCENT.violet }}
      />
    </span >
  { children }
  </div >
);

const GradientText: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <span
    className={`bg-clip-text text-transparent ${className}`}
    style={{
      backgroundImage: `linear-gradient(90deg, ${ACCENT.violet} 0%, ${ACCENT.blue} 50%, ${ACCENT.pink} 100%)`,
    }}
  >
    {children}
  </span>
);

const ButtonPrimary: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  testid?: string;
}> = ({
  children, onClick, className = "", testid }) => (
    <button
    data-testid= { testid }
onClick = { onClick }
className = {`group relative inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-black text-white font-semibold text-sm shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_40px_-12px_rgba(124,58,237,0.45)] transition-all duration-300 hover:-translate-y-0.5 ${className}`}
  >
  <span
    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
style = {{
  background: `linear-gradient(120deg, ${ACCENT.violet}, ${ACCENT.blue}, ${ACCENT.pink})`,
      }}
    />
  < span className ="relative z-10 flex items-center gap-2">{children}</span>
  </button >
);

const ButtonGhost: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  testid?: string;
}> = ({
  children, onClick, className = "", testid }) => (
    <button
    data-testid= { testid }
onClick = { onClick }
className = {`group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white border border-black/10 text-black font-semibold text-sm hover:border-black/40 hover:-translate-y-0.5 transition-all duration-300 ${className}`}
  >
  { children }
  </button >
);

/* ============ Animated waveform ============ */

const Waveform: React.FC<{ playing: boolean; bars?: number; className?: string }> = ({
  playing,
  bars = 48,
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-[3px] h-16 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => {
        const seed = (i * 9301 + 49297) % 233280;
        const base = 18 + (seed / 233280) * 60;
        return (
          <motion.span
            key={i}
            className="w-[3px] rounded-full"
      style={{
        background: `linear-gradient(180deg, ${ACCENT.violet}, ${ACCENT.blue})`,
      }}
      animate={
        playing
          ? { height: [base * 0.4, base, base * 0.6, base * 1.1, base * 0.5] }
          : { height: base * 0.4 }
      }
      transition={{
        duration: 1.1 + (i % 5) * 0.12,
        repeat: playing ? Infinity : 0,
        ease: "easeInOut",
      delay: (i % 7) * 0.04,
            }}
          />
      );
      })}
    </div>
  );
};

/* ============ Audio Player Card ============ */

const AudioPlayerCard: React.FC<{
  title: string;
  voice: string;
  testid?: string;
}> = ({ title, voice, testid }) => {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setPlaying(false), 4500);
    return () => clearTimeout(t);
  }, [playing]);

  return (
    <div
      data-testid={testid}
      className="rounded-2xl bg-white border border-black/[0.07] p-5 shadow-[0_2px_0_rgba(0,0,0,0.02),0_20px_50px_-20px_rgba(37,99,235,0.18)]"
        >
        <div className="flex items-center gap-4">
          < button
  onClick = {() => setPlaying((p) => !p)}
className ="relative w-12 h-12 grid place-items-center rounded-full bg-black text-white hover:scale-105 transition-transform"
  >
  { playing?<PauseCircle size = { 22 } /> : <PlayCircle size={22} className="ml-[1px]" />}
{
  playing && (
    <span
      className="absolute -inset-1 rounded-full animate-ping"
  style = {{ backgroundColor: ACCENT.violet, opacity: 0.25 }
}
            />
          )}
        </button >
  <div className="flex-1 min-w-0">
    < div className ="text-[11px] font-semibold uppercase tracking-widest text-black/40">
{ voice }
          </div >
  <div className="text-sm font-medium text-black truncate">{title}</div>
        </div >
  <div className="text-[11px] font-mono text-black/40 tabular-nums">0:14</div>
      </div >
  <div className="mt-4">
    < Waveform playing = { playing } bars = { 40} />
      </div >
    </div >
  );
};

/* ============ Navbar ============ */

const Navbar: React.FC<{ onLogin: () => void; onRegister: () => void }> = ({
  onLogin,
  onRegister,
}) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled
        ?"py-3 bg-white/80 backdrop-blur-xl border-b border-black/[0.06]"
          : "py-5 bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Logo />
        </div>
        <nav className="hidden md:flex items-center gap-9 text-sm font-medium text-black/60">
          <a href="#features" className="hover:text-black transition-colors">Features</a>
          <a href="#models" className="hover:text-black transition-colors">Models</a>
          <a href="#how" className="hover:text-black transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-black transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <button
            data-testid="nav-login-btn"
            onClick={onLogin}
            className="hidden sm:block text-sm font-semibold text-black/70 hover:text-black transition-colors px-3 py-2"
          >
            Log in
          </button>
          <button
            data-testid="nav-register-btn"
            onClick={onRegister}
            className="relative inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:-translate-y-0.5 transition-all overflow-hidden group"
          >
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: `linear-gradient(120deg, ${ ACCENT.violet }, ${ ACCENT.blue })`,
              }}
            />
            <span className="relative">Start free</span>
            <ArrowRight size={14} className="relative" />
          </button>
        </div>
      </div>
    </header>
  );
};

/* ============ Hero ============ */

const Hero: React.FC<{ onRegister: () => void }> = ({ onRegister }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <section ref={ref} className="relative pt-32 lg:pt-44 pb-20 overflow-hidden bg-white">
      {/* iridescent mesh background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] rounded-full opacity-[0.18] blur-3xl"
          style={{
            background: `radial-gradient(closest-side, ${ ACCENT.violet }, transparent 70%)`,
          }}
        />
        <div
          className="absolute top-40 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.18] blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${ ACCENT.blue }, transparent 70%)` }}
        />
        <div
          className="absolute top-20 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.14] blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${ ACCENT.pink }, transparent 70%)` }}
        />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Pill>Vocaria Engine · v3 Live</Pill>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.05 }}
          className="mt-7 text-[44px] sm:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] text-black max-w-5xl leading-[1.02]"
          style={{ fontFamily: "Outfit, Inter, ui-sans-serif" }}
        >
          The voice layer for the next{" "}
          <GradientText className="italic font-serif" >
            internet
          </GradientText>
          .
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="mt-6 text-[17px] sm:text-xl text-black/55 max-w-2xl leading-relaxed"
        >
          Clone any voice in seconds, generate studio-grade speech in 17 languages,
          deploy live voice agents, and detect deepfakes — all from one platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-3"
        >
          <ButtonPrimary testid="hero-cta-primary" onClick={onRegister}>
            Start cloning free
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </ButtonPrimary>
          <ButtonGhost testid="hero-cta-secondary" onClick={() => {
            document.getElementById("demos")?.scrollIntoView({ behavior: "smooth" });
          }}>
            <Headphones size={16} />
            Listen to demos
          </ButtonGhost>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-8 flex items-center gap-6 text-[12px] text-black/45 font-medium"
        >
          <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> No credit card</span>
          <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> 20k free credits</span>
          <span className="hidden sm:flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> 17 languages</span>
        </motion.div>

        {/* Hero visual: glassmorphic studio mock */}
        <motion.div
          style={{ y }}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.35 }}
          className="mt-16 w-full max-w-5xl relative"
          id="demos"
        >
          <div
            className="absolute -inset-6 rounded-[36px] opacity-50 blur-2xl"
            style={{
              background: `conic-gradient(from 90deg, ${ ACCENT.violet }, ${ ACCENT.blue }, ${ ACCENT.pink }, ${ ACCENT.violet })`,
            }}
          />
          <div className="relative rounded-[28px] bg-white/80 backdrop-blur-xl border border-black/[0.08] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-black/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                vocaria.studio · live
              </div>
              <div className="w-12" />
            </div>
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-7 border-b md:border-b-0 md:border-r border-black/[0.06]">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-black/40 mb-4">
                  Prompt
                </div>
                <div className="rounded-2xl bg-[#FAFAFB] border border-black/[0.06] p-5 text-[15px] leading-relaxed text-black/80 font-medium">
                  &quot;Welcome back, Alex. Your studio session is ready —
                  shall we pick up where we left off?&quot;
                </div>
                <div className="mt-5 flex items-center gap-2 flex-wrap">
                  {["Calm", "Warm", "Whisper", "Excited"].map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-black/10 font-medium text-black/60"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-7 space-y-4">
                <AudioPlayerCard title="Welcome back, Alex…" voice="Aria · Female · EN" testid="hero-audio-1" />
                <AudioPlayerCard title="Hola Alex, ¿continuamos?" voice="Lingua · Spanish" testid="hero-audio-2" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* trust strip */}
        <div className="mt-16 w-full">
          <div className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-black/30 mb-6">
            Trusted by audio teams at
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60">
            {["NORDIC", "Voxel", "Studio·Echo", "Helio", "Arcadia", "Nimbus"].map((b) => (
              <span key={b} className="text-black/50 font-semibold tracking-widest text-sm">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ============ Feature Bento ============ */

const featureItems = [
  {
    icon: Mic2,
    title: "Instant Voice Cloning",
    desc: "Flawless digital clones from just 10 seconds of audio. Zero-shot, fine-tunable, and yours forever.",
    accent: ACCENT.violet,
    span: "lg:col-span-2 lg:row-span-2",
    big: true,
  },
  {
    icon: Sparkles,
    title: "Voice Profiling",
    desc: "Quality, SNR, prosody & speaker fingerprints — analyzed before a single sample is used.",
    accent: ACCENT.blue,
  },
  {
    icon: AudioLines,
    title: "Ultra-Realistic TTS",
    desc: "Lifelike speech in 17 languages with emotion, pitch, and pacing control.",
    accent: ACCENT.violet,
  },
  {
    icon: ShieldAlert,
    title: "Deepfake Detection",
    desc: "5-model ensemble that flags AI-generated audio with confidence scores in milliseconds.",
    accent: ACCENT.pink,
  },
  {
    icon: Radio,
    title: "Live Detection",
    desc: "Real-time streaming analysis over WebSocket — protect calls, broadcasts, and meetings as they happen.",
    accent: ACCENT.blue,
  },
  {
    icon: Bot,
    title: "Voice Agents",
    desc: "Low-latency conversational agents with custom voices, memory, and live interruption handling.",
    accent: ACCENT.violet,
  },
];

const FeatureBento = () => {
  return (
    <section id="features" className="relative py-28 lg:py-36 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl">
          <Pill>Features</Pill>
          <h2
            className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] text-black leading-[1.02]"
            style={{ fontFamily: "Outfit, Inter, ui-sans-serif" }}
          >
            One platform.
            <br />
            <GradientText>Every voice problem solved.</GradientText>
          </h2>
          <p className="mt-5 text-lg text-black/55 max-w-xl">
            From cloning to detection, profiling to live agents — Vocaria gives you the
            entire voice stack with a single, elegant API.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureItems.map((f, idx) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: idx * 0.06 }}
                className={`group relative overflow-hidden rounded-3xl border border-black/[0.07] bg-white p-7 hover:-translate-y-1 hover:shadow-[0_30px_60px_ - 30px_rgba(0, 0, 0, 0.15)] transition-all duration-500 ${
  f.span || ""}`}
  data-testid={ `feature-card-${idx}` }
              >
    {/* accent glow */ }
    < div
  className ="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-700 blur-3xl"
  style = {{ background: f.accent }
}
                />
  < div
className ="w-11 h-11 rounded-xl grid place-items-center mb-5 transition-transform group-hover:scale-110"
style = {{
  background: `linear-gradient(135deg, ${f.accent}, ${f.accent}cc)`,
    boxShadow: `0 12px 30px -10px ${f.accent}`,
                  }}
                >
  <Icon size={20} className="text-white" />
                </div >
  <h3
    className={`font-semibold text-black ${f.big ?"text-2xl" : "text-lg"}`}
style = {{
  fontFamily: "Outfit, Inter, ui-sans-serif" }}
    >
    { f.title }
                </h3 >
    <p className={`mt-2 text-black/55 ${f.big ?"text-base" : "text-sm"} leading-relaxed`}>
  { f.desc }
                </p >

    {
      f.big && (
        <div className="mt-7">
        <Waveform playing bars = { 36 } />
    <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-black/40">
      < span className ="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      training Echo · 7s sample · 98.4 % similarity
                    </div >
                  </div >
                )
}
              </motion.div >
            );
          })}
        </div >
      </div >
    </section >
  );
};

/* ============ How It Works ============ */

const steps = [
  {
    n: "01",
    title: "Upload a sample",
    desc: "Drop a clean 10-second clip — or record live in the browser. We instantly profile prosody, SNR, and timbre.",
    icon: Mic2,
  },
  {
    n: "02",
    title: "Vocaria trains your voice",
    desc: "Our neural engine builds a high-fidelity model in seconds. Public or private — you decide.",
    icon: Sparkles,
  },
  {
    n: "03",
    title: "Generate, stream, protect",
    desc: "Type text, stream live audio, or run real-time deepfake detection from the same dashboard.",
    icon: Activity,
  },
];

const HowItWorks = () => (
  <section id="how" className="relative py-28 lg:py-36 bg-[#FAFAFB] border-y border-black/[0.05]">
    < div className ="max-w-7xl mx-auto px-6">
      < div className ="text-center max-w-2xl mx-auto">
        < Pill > How it works</Pill >
          <h2
            className="mt-6 text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-black leading-[1.05]"
style = {{
  fontFamily: "Outfit, Inter, ui-sans-serif" }}
    >
    Three steps.Studio-grade voice in under a minute.
        </h2 >
      </div >

    <div className="mt-16 grid md:grid-cols-3 gap-5 relative">
  {/* connecting line */ }
  <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-black/15 to-transparent" />
  {
    steps.map((s, i) => {
      const Icon = s.icon;
      return (
        <motion.div
          key={s.n}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{
            once: true, margin: "-60px" }}
              transition = {{ duration: 0.6, delay: i * 0.1
    }}
  className ="relative bg-white rounded-3xl border border-black/[0.07] p-8 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.1)] transition-shadow"
  data-testid={ `step-card-${i}` }
            >
    <div className="flex items-center justify-between">
      < span className ="text-[11px] font-mono uppercase tracking-widest text-black/35">
                  Step { s.n }
                </span >
    <div
      className="w-10 h-10 rounded-xl grid place-items-center"
  style = {{
    background: `linear-gradient(135deg, ${ACCENT.violet}, ${ACCENT.blue})`,
                  }
}
                >
  <Icon size={18} className="text-white" />
                </div >
              </div >
  <h3
    className="mt-6 text-2xl font-semibold text-black"
style = {{
  fontFamily: "Outfit, Inter, ui-sans-serif" }}
    >
    { s.title }
              </h3 >
    <p className="mt-3 text-[15px] text-black/55 leading-relaxed">{s.desc}</p>
            </motion.div >
          );
})}
      </div >
    </div >
  </section >
);

/* ============ Models ============ */

const models = [
  {
    name: "Echo",
    tag: "V1 · Cloning",
    desc: "Zero-shot voice cloning from short samples.",
    grad: "linear-gradient(135deg,#22d3ee,#2563eb 60%,#0b1437)",
    shadow: "rgba(37,99,235,0.4)",
  },
  {
    name: "Aria",
    tag: "V2 · Synthesis",
    desc: "Premium TTS with studio-grade realism.",
    grad: "linear-gradient(135deg,#a78bfa,#7c3aed 55%,#1e0a45)",
    shadow: "rgba(124,58,237,0.45)",
  },
  {
    name: "Pulse",
    tag: "V3 · Emotion",
    desc: "Expressive range — whisper to shout.",
    grad: "linear-gradient(135deg,#fb7185,#be123c 60%,#260008)",
    shadow: "rgba(244,63,94,0.4)",
  },
  {
    name: "Lingua",
    tag: "V4 · Polyglot",
    desc: "17 languages, perfect accent transfer.",
    grad: "linear-gradient(135deg,#fcd34d,#d97706 60%,#3a1d04)",
    shadow: "rgba(217,119,6,0.35)",
  },
  {
    name: "Sentinel",
    tag: "V5 · Detection",
    desc: "5-net ensemble that catches deepfakes.",
    grad: "linear-gradient(135deg,#34d399,#047857 60%,#022c1a)",
    shadow: "rgba(16,185,129,0.4)",
  },
];

const Models = () => (
  <section id="models" className="relative py-28 lg:py-36 bg-[#050505] overflow-hidden">
    < div
className ="absolute inset-0 opacity-20 pointer-events-none"
style = {{
  backgroundImage:
  "linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)",
  backgroundSize: "48px 48px",
  maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
}}
    />
  < div className ="relative max-w-7xl mx-auto px-6">
    < div className ="text-center max-w-2xl mx-auto">
      < div className ="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/10 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
        < span className ="w-1.5 h-1.5 rounded-full bg-white" /> Five neural models
        </div >
  <h2
    className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] text-white leading-[1.05]"
style = {{
  fontFamily: "Outfit, Inter, ui-sans-serif" }}
    >
    Powered by purpose-built engines.
        </h2 >
    <p className="mt-5 text-lg text-white/50 max-w-xl mx-auto">
          Each Vocaria model is specialized — one for cloning, one for emotion,
    one for languages, one to catch the fakes.
        </p >
      </div >

    <div className="mt-20 flex flex-wrap items-end justify-center gap-x-10 gap-y-16">
  {
    models.map((m, i) => (
      <motion.div
        key={m.name}
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{
          once: true, margin: "-80px" }}
            transition = {{ duration: 0.7, delay: i * 0.08 }
}
className ="flex flex-col items-center gap-5"
data-testid={ `model-${m.name.toLowerCase()}` }
          >
  <motion.div
    whileHover={{ scale: 1.06, rotate: -2 }}
    transition={{
      type: "spring", stiffness: 200, damping: 18 }}
              className ="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden cursor-pointer"
              style = {{
                background: m.grad,
    boxShadow: `0 0 80px ${m.shadow}`,
              }}
            >
  <div className="absolute inset-0 rounded-full border border-white/15" />
    < div className ="absolute top-[8%] left-[18%] w-[55%] h-[28%] bg-white/40 rounded-full blur-[10px] -rotate-12" />
{/* core ring */ }
<motion.div
  className="absolute inset-6 rounded-full border border-white/20"
animate = {{ rotate: 360 }}
transition = {{
  duration: 18, repeat: Infinity, ease: "linear" }}
  style = {{
    borderStyle: "dashed" }}
      />
      {/* inner glow */ }
      < div className ="absolute inset-0 grid place-items-center">
        < div className ="w-10 h-10 rounded-full bg-white/80 blur-md" />
              </div >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
            </motion.div >
      <div className="text-center">
        < div className ="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">
    { m.tag }
              </div >
      <div
        className="text-xl font-semibold text-white mt-1"
    style = {{
      fontFamily: "Outfit, Inter, ui-sans-serif" }}
        >
        { m.name }
              </div >
        <div className="text-xs text-white/50 mt-1 max-w-[180px]">{m.desc}</div>
            </div >
          </motion.div >
        ))
    }
      </div >
    </div >
  </section >
);

    /* ============ Detection / Security ============ */

    const Detection = () => {
      const [scanning, setScanning] = useState(true);
      useEffect(() => {
        const t = setInterval(() => setScanning((s) => !s), 3500);
        return () => clearInterval(t);
      }, []);

      return (
        <section id="detection" className="relative py-28 lg:py-36 bg-white">
          < div className ="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            < div >
          <Pill>Sentinel · Detection</Pill>
          <h2
            className="mt-6 text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-black leading-[1.05]"
      style = {{
        fontFamily: "Outfit, Inter, ui-sans-serif" }}
          >
          Catch every deepfake.
            < br />
            <GradientText>Before it spreads.</GradientText>
          </h2 >
      <p className="mt-5 text-lg text-black/55 max-w-xl">
            Vocaria Sentinel runs a 5-network ensemble across spectral, prosodic, and
            glottal features — flagging AI-generated audio with millisecond latency.
            Live or on file.Online or air-gapped.
          </p >
      <ul className="mt-8 space-y-4">
    {
      [
        "5-model ensemble (AASIST + RawNet2 + Prosodic + Spectral + Glottal)",
        "Real-time streaming detection on calls & broadcasts",
        "Per-speaker scoring with confidence timeline",
        "Tamper-proof, exportable evidence logs",
      ].map((t) => (
        <li key={t} className="flex items-start gap-3">
      < span
                  className ="mt-1 grid place-items-center w-5 h-5 rounded-full"
                  style = {{
        background: `linear-gradient(135deg, ${ACCENT.violet}, ${ACCENT.blue})`,
      }}
                >
      <Check size={12} className="text-white" />
                </span >
      <span className="text-black/70 font-medium">{t}</span>
              </li >
            ))
  }
          </ul >
    <div className="mt-10">
      < ButtonGhost testid ="detection-cta">
              Open Detection Lab
    < ArrowUpRight size = { 16} />
            </ButtonGhost >
          </div >
        </div >

    {/* Detection panel mock */ }
    < div className ="relative">
      < div
  className ="absolute -inset-6 rounded-[32px] opacity-40 blur-2xl"
  style = {{
    background: `conic-gradient(from 0deg, ${ACCENT.violet}, ${ACCENT.blue}, ${ACCENT.pink}, ${ACCENT.violet})`,
            }
}
          />
  < div className ="relative rounded-3xl bg-white border border-black/[0.08] p-6 shadow-[0_30px_80px_-30px_rgba(37,99,235,0.3)]">
    < div className ="flex items-center justify-between">
      < div className ="flex items-center gap-2 text-[11px] font-mono text-black/45">
        < span className ="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
sentinel · live stream
              </div >
  <span className="text-[11px] font-mono text-black/35">99.2ms</span>
            </div >
  <div className="mt-5 rounded-2xl bg-[#FAFAFB] border border-black/[0.06] p-5">
    < div className ="flex items-center justify-between">
      < div >
      <div className="text-[10px] font-mono uppercase tracking-widest text-black/40">
Verdict
                  </div >
  <div className="mt-1 flex items-center gap-2">
    < span
className ="px-2.5 py-1 rounded-full text-xs font-bold"
style = {{
  background: scanning ?"#FEF3F2" : "#ECFDF5",
  color: scanning ?"#B42318" : "#067647",
}}
                    >
{
  scanning?"AI-GENERATED" : "REAL HUMAN"}
                    </span>
  <span className="text-[12px] text-black/40 font-mono">
{
  scanning ?"97.8%" : "99.1%"}
                    </span >
                  </div >
                </div >
    <ShieldAlert
      size={28}
      style={{
        color: scanning ?"#B42318" : "#067647" }}
                />
              </div>
        <div className="mt-5">
          < Waveform playing bars = { 40} />
              </div >
            </div >
    <div className="mt-5 grid grid-cols-5 gap-2">
  {
    ["AASIST", "RawNet2", "Prosodic", "Spectral", "Glottal"].map((m, i) => (
      < div
                  key = { m }
                  className ="rounded-xl border border-black/[0.07] p-3 text-center"
    >
    <div className="text-[9px] font-mono uppercase tracking-widest text-black/40">
                    { m }
                  </div >
    <motion.div
      className="mt-2 h-1.5 rounded-full bg-black/5 overflow-hidden"
    >
    <motion.div
      className="h-full"
                      style = {{
      background: `linear-gradient(90deg, ${ACCENT.violet}, ${ACCENT.blue})`,
    }}
  animate = {{
    width: scanning ? ["20%", "90%"] : ["80%", "30%"] }}
                      transition = {{
        duration: 2, repeat: Infinity, repeatType: "reverse", delay: i * 0.1 }}
                    />
                  </motion.div >
                </div>
              ))}
            </div >
          </div >
        </div >
      </div >
    </section >
  );
};

/* ============ Community Hub ============ */

const creators = [
  {
    name: "Lena Park", handle: "@lenavoice", followers: "12.4k", voices: 18, color: "#7c3aed" },
  {
      name: "Mateo Rivas", handle: "@mateosound", followers: "8.9k", voices: 11, color: "#2563eb" },
  { name: "Yuki Tanaka", handle: "@yukitone", followers: "21.7k", voices: 27, color: "#ec4899" },
];

const CommunityHub = () => (
  <section id="hub" className="relative py-28 lg:py-36 bg-[#FAFAFB] border-y border-black/[0.05] overflow-hidden">
    < div className ="max-w-7xl mx-auto px-6">
      < div className ="text-center max-w-2xl mx-auto">
        < Pill > Voice Hub</Pill >
          <h2
            className="mt-6 text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-black leading-[1.05]"
style = {{
  fontFamily: "Outfit, Inter, ui-sans-serif" }}
    >
    A community of voice creators.
        </h2 >
    <p className="mt-5 text-lg text-black/55">
          Discover public voice models, follow your favorite creators, and build on
          top of the world & apos;s largest open voice library.
        </p >
      </div >

    <div className="mt-16 grid md:grid-cols-3 gap-5">
  {
    creators.map((c, i) => (
      <motion.div
        key={c.handle}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{
          once: true, margin: "-60px" }}
            transition = {{ duration: 0.6, delay: i * 0.1 }
}
className ="group bg-white rounded-3xl border border-black/[0.07] p-7 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] transition-all"
data-testid={ `creator-card-${i}` }
          >
  <div className="flex items-center gap-4">
    < div
className ="w-14 h-14 rounded-2xl grid place-items-center text-white text-xl font-semibold"
style = {{
  background: `linear-gradient(135deg, ${c.color}, ${c.color}99)`,
    boxShadow: `0 10px 30px -10px ${c.color}`,
                }}
              >
  { c.name[0] }
              </div >
  <div className="flex-1 min-w-0">
    < div className ="font-semibold text-black">{c.name}</div>
      < div className ="text-sm text-black/45">{c.handle}</div>
              </div >
  <button
    className="px-3 py-1.5 rounded-full bg-black text-white text-xs font-semibold hover:opacity-90"
      >
      Follow
              </button >
            </div >
  <div className="mt-5 grid grid-cols-3 gap-3 text-center">
    < div >
    <div className="text-lg font-semibold text-black">{c.followers}</div>
      < div className ="text-[10px] uppercase tracking-widest text-black/40">Followers</div>
              </div >
              <div>
                <div className="text-lg font-semibold text-black">{c.voices}</div>
                <div className="text-[10px] uppercase tracking-widest text-black/40">Voices</div>
              </div >
              <div>
                <div className="text-lg font-semibold text-black flex items-center justify-center gap-1">
                  <Star size={14} className="fill-amber-400 text-amber-400" /> 4.9
                </div>
                <div className="text-[10px] uppercase tracking-widest text-black/40">Rating</div>
              </div >
            </div >
  <div className="mt-5">
    < Waveform playing bars = { 32} />
            </div >
          </motion.div >
        ))}
      </div >
    </div >
  </section >
);

/* ============ Pricing ============ */

const Pricing = () => {
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(false);

  const tiers = [
    {
      name: "Free",
      desc: "Perfect for tinkering and your first voice agent.",
      price: { m: 0, y: 0 },
      cta: "Get started free",
      featured: false,
      features: [
        "2 voice profiles",
        "5 clone jobs / month",
        "10,000 characters / month",
        "30 detection minutes / month",
        "500 MB storage",
      ],
      missing: ["API access", "Commercial rights"],
    },
    {
      name: "Starter",
      desc: "For creators and small teams.",
      price: { m: 19, y: 15 },
      cta: "Start trial",
      featured: false,
      features: [
        "10 voice profiles",
        "50 clone jobs / month",
        "100,000 characters / month",
        "300 detection minutes / month",
        "5 GB storage",
        "API access (3 keys)",
        "Speaker diarization",
        "Hub publishing",
      ],
      missing: [],
    },
    {
      name: "Pro",
      desc: "For professionals shipping real products.",
      price: { m: 79, y: 65 },
      cta: "Start Pro trial",
      featured: true,
      features: [
        "50 voice profiles",
        "500 clone jobs / month",
        "1,000,000 characters / month",
        "3,000 detection minutes / month",
        "50 GB storage",
        "API access (10 keys)",
        "Fine-tuning mode",
        "SSML support",
        "Priority queue",
        "Evidence export",
      ],
      missing: [],
    },
    {
      name: "Enterprise",
      desc: "For studios, platforms, and security teams at scale.",
      price: { m: 299, y: 249 },
      cta: "Contact sales",
      featured: false,
      features: [
        "Unlimited voice profiles",
        "Unlimited clone jobs",
        "Unlimited characters",
        "Unlimited detection minutes",
        "Unlimited storage",
        "Unlimited API keys",
        "Custom models",
        "Dedicated support",
        "SLA guarantee",
      ],
      missing: [],
    },
  ];

return (
  <section id="pricing" className="relative py-28 lg:py-36 bg-white">
    < div className ="max-w-7xl mx-auto px-6">
      < div className ="text-center max-w-2xl mx-auto">
        < Pill > Pricing</Pill >
          <h2
            className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] text-black leading-[1.02]"
style = {{
  fontFamily: "Outfit, Inter, ui-sans-serif" }}
    >
    Simple pricing.
            < br />
      <GradientText>Honest scale.</GradientText>
          </h2 >
    <p className="mt-5 text-lg text-black/55">
            Start free.Upgrade only when your voices start paying you back.
          </p >

    <div className="mt-10 inline-flex items-center gap-3 rounded-full bg-[#F4F4F5] p-1.5 border border-black/[0.06]">
      < button
  data-testid="pricing-toggle-monthly"
  onClick = {() => setYearly(false)
}
className = {`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!yearly ?"bg-white text-black shadow-sm" : "text-black/50"
              }`}
            >
              Monthly
            </button>
            <button
              data-testid="pricing-toggle-yearly"
              onClick={() => setYearly(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
  yearly ?"bg-white text-black shadow-sm" : "text-black/50"
} `}
            >
              Yearly
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: ACCENT.violet }}
              >
                -25%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch max-w-7xl mx-auto">
          {tiers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className={`relative rounded-3xl p-8 flex flex-col ${
  t.featured
    ?"bg-black text-white border border-black"
                  : "bg-white text-black border border-black/[0.08]"
} `}
              data-testid={`pricing-card - ${ t.name.toLowerCase() } `}
            >
              {t.featured && (
                <>
                  <div
                    className="absolute -inset-px rounded-3xl pointer-events-none opacity-80"
                    style={{
                      background: `linear-gradient(135deg, ${ ACCENT.violet }, ${ ACCENT.blue }, ${ ACCENT.pink })`,
                      padding: 1,
                      WebkitMask:
                        "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                    }}
                  />
                  <span
                    className="absolute -top-3 left-8 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest text-white"
                    style={{
                      background: `linear-gradient(90deg, ${ ACCENT.violet }, ${ ACCENT.blue })`,
                    }}
                  >
                    Most popular
                  </span>
                </>
              )}

              <h3
                className="text-2xl font-semibold"
                style={{ fontFamily: "Outfit, Inter, ui-sans-serif" }}
              >
                {t.name}
              </h3>
              <p className={`mt-2 text-sm ${
  t.featured ?"text-white/55" : "text-black/50"}`}>
  { t.desc }
              </p >
    <div className="mt-7 flex items-baseline gap-1">
      < span className ="text-5xl font-semibold tracking-tight">
                  ${ yearly ? t.price.y : t.price.m }
                </span >
    <span className={`text-sm ${t.featured ?"text-white/45" : "text-black/40"}`}>
      / mo
                </span >
              </div >
              <button
                onClick={() => {
                  if (t.name === 'Enterprise') {
                    document.getElementById('help')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    navigate('/register');
                  }
                }}
                className={`mt-7 w-full py-3.5 rounded-2xl font-semibold text-sm transition-all hover:-translate-y-0.5 ${t.featured
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-black text-white hover:bg-black/90"
                }`}
              >
                {t.cta}
              </button>
              <ul className="mt-8 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check
                      size={16}
                      className={t.featured ? "text-white" : "text-emerald-500"}
                    />
                    <span className={t.featured ? "text-white/85" : "text-black/75"}>{f}</span>
                  </li>
                ))}
                {t.missing.map((f) => (
                  <li
                    key={f}
                    className={`flex items-start gap-2.5 ${
  t.featured ?"text-white/30" : "text-black/30"
} `}
                  >
                    <X size={16} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ============ FAQ ============ */

const faqs = [
  {
    q: "How much audio do I need to clone a voice?",
    a: "Just 10 seconds of clean, single-speaker audio is enough to produce a high-fidelity clone. Upload longer samples (1–3 minutes) for our fine-tune mode if you need even higher similarity.",
  },
  {
    q: "Which languages does Vocaria support?",
    a: "17 languages out of the box, including English, Spanish, French, German, Italian, Portuguese, Polish, Turkish, Russian, Dutch, Czech, Arabic, Chinese, Japanese, Korean, Hindi, and Hungarian.",
  },
  {
    q: "Can I use the audio commercially?",
    a: "Yes. Pro and Enterprise plans include full commercial rights for everything you generate on the platform.",
  },
  {
    q: "How does the deepfake detection work?",
    a: "Sentinel runs a 5-model ensemble that combines spectral, prosodic, and glottal analysis. You get a confidence score, per-speaker breakdown, and tamper-proof evidence logs — in milliseconds.",
  },
  {
    q: "Is my voice data private?",
    a: "Absolutely. Your samples and clones are encrypted at rest and in transit. We never train base models on your voice unless you explicitly opt in.",
  },
  {
    q: "Do you offer an API?",
    a: "Yes — every feature is available via our REST and WebSocket APIs. Pro and Enterprise plans include higher rate limits and dedicated infrastructure.",
  },
];

const FAQ = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-28 lg:py-36 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-14">
          <Pill>FAQ</Pill>
          <h2
            className="mt-6 text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-black leading-[1.05]"
            style={{ fontFamily: "Outfit, Inter, ui-sans-serif" }}
          >
            Questions, answered.
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.q}
                className="rounded-2xl border border-black/[0.07] bg-white overflow-hidden"
                data-testid={`faq-item - ${ i } `}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-black/[0.02] transition-colors"
                >
                  <span className="text-base sm:text-lg font-semibold text-black pr-6">
                    {f.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-8 h-8 rounded-full grid place-items-center bg-black text-white shrink-0"
                  >
                    <Plus size={16} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-6 text-[15px] text-black/60 leading-relaxed">
                        {f.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ============ Help / Contact ============ */

const HelpForm = () => {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setForm({ name: "", email: "", message: "" });
    }, 2800);
  };

  return (
    <section id="help" className="relative py-28 lg:py-36 bg-[#FAFAFB] border-t border-black/[0.05]">
      <div className="max-w-5xl mx-auto px-6 grid lg:grid-cols-2 gap-14 items-start">
        <div>
          <Pill>Talk to us</Pill>
          <h2
            className="mt-6 text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-black leading-[1.05]"
            style={{ fontFamily: "Outfit, Inter, ui-sans-serif" }}
          >
            Need a hand?
            <br />
            <GradientText>We&apos;re a message away.</GradientText>
          </h2>
          <p className="mt-5 text-lg text-black/55">
            Questions about cloning, custom enterprise plans, or building a voice
            agent for your product? Our team replies within a few hours.
          </p>
          <div className="mt-8 space-y-3 text-sm text-black/65">
            <div className="flex items-center gap-3">
              <Mail size={16} /> hello@vocaria.ai
            </div>
            <div className="flex items-center gap-3">
              <Users size={16} /> 24/7 community on Discord
            </div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-3xl border border-black/[0.08] p-7 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.18)]"
          data-testid="help-form"
        >
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-black/45">
              Your name
            </span>
            <input
              data-testid="help-input-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-2 w-full px-4 py-3 rounded-xl border border-black/10 focus:border-black focus:outline-none transition-colors text-sm"
              placeholder="Alex Rivera"
            />
          </label>
          <label className="block mt-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-black/45">
              Email
            </span>
            <input
              data-testid="help-input-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-2 w-full px-4 py-3 rounded-xl border border-black/10 focus:border-black focus:outline-none transition-colors text-sm"
              placeholder="alex@studio.com"
            />
          </label>
          <label className="block mt-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-black/45">
              How can we help?
            </span>
            <textarea
              data-testid="help-input-message"
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="mt-2 w-full px-4 py-3 rounded-xl border border-black/10 focus:border-black focus:outline-none transition-colors text-sm resize-none"
              placeholder="Tell us about your project…"
            />
          </label>
          <button
            data-testid="help-submit-btn"
            type="submit"
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-black text-white font-semibold text-sm hover:-translate-y-0.5 transition-all"
          >
            {sent ? (
              <>
                <Check size={16} /> Message sent
              </>
            ) : (
              <>
                Send message
                <Send size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
};

/* ============ Final CTA ============ */

const FinalCTA: React.FC<{ onRegister: () => void }> = ({ onRegister }) => (
  <section className="relative py-24 bg-white">
    <div className="max-w-5xl mx-auto px-6">
      <div className="relative overflow-hidden rounded-[36px] bg-black p-12 sm:p-16 text-center">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(circle at 20 % 20 %, ${ ACCENT.violet }55, transparent 50 %), radial-gradient(circle at 80 % 80 %, ${ ACCENT.blue }55, transparent 50 %)`,
          }}
        />
        <div className="relative z-10">
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white tracking-[-0.03em] leading-[1.05]"
            style={{ fontFamily: "Outfit, Inter, ui-sans-serif" }}
          >
            Your voice. Everywhere.
          </h2>
          <p className="mt-5 text-lg text-white/60 max-w-xl mx-auto">
            Start cloning, generating, and protecting voices in under a minute.
            Free forever for solo creators.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              data-testid="final-cta-register"
              onClick={onRegister}
              className="px-7 py-3.5 rounded-2xl bg-white text-black font-semibold text-sm hover:-translate-y-0.5 transition-all"
            >
              Start free →
            </button>
            <button
              data-testid="final-cta-demo"
              onClick={() => document.getElementById("demos")?.scrollIntoView({ behavior: "smooth" })}
              className="px-7 py-3.5 rounded-2xl bg-white/10 backdrop-blur text-white font-semibold text-sm border border-white/20 hover:bg-white/15 transition-all"
            >
              Hear it first
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ============ Footer ============ */

const Footer = () => (
  <footer className="bg-[#FAFAFB] border-t border-black/[0.05] pt-20 pb-10">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2">
          <Logo />
          <p className="mt-4 text-sm text-black/55 max-w-xs leading-relaxed">
            The voice layer for the next internet. Clone, generate, stream, and
            protect — all from one platform.
          </p>
          <div className="mt-6 flex items-center gap-2">
            {[
              { Icon: Twitter },
              { Icon: Github },
              { Icon: Linkedin },
            ].map(({ Icon }, i) => (
              <button
                key={i}
                className="w-9 h-9 rounded-full grid place-items-center bg-white border border-black/[0.08] text-black/55 hover:text-black hover:border-black/40 transition-colors"
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
        {[
          {
            title: "Product",
            items: ["Voice Cloning", "Text to Speech", "Detection Lab", "Voice Agents", "Voice Hub"],
          },
          {
            title: "Resources",
            items: ["Documentation", "API Reference", "Changelog", "Guides", "Status"],
          },
          {
            title: "Company",
            items: ["About", "Pricing", "Privacy", "Terms", "Contact"],
          },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="font-semibold text-black text-sm uppercase tracking-widest mb-5">
              {col.title}
            </h4>
            <ul className="space-y-3 text-sm text-black/55">
              {col.items.map((it) => (
                <li key={it}>
                  <a href="#" className="hover:text-black transition-colors">
                    {it}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-14 pt-6 border-t border-black/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-black/40">
          © {new Date().getFullYear()} Vocaria, Inc. All rights reserved.
        </p>
        <p className="text-xs text-black/40">
          Built for creators · Designed for craft.
        </p>
      </div>
    </div>
  </footer>
);

/* ============ Page ============ */

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
      data-testid="landing-page"
    >
      {/* Google fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&family=Instrument+Serif:ital@1&display=swap"
      />
      <style>{`
  .font-serif { font-family: 'Instrument Serif', ui-serif, Georgia, serif; }
`}</style>

      <Navbar
        onLogin={() => navigate("/login")}
        onRegister={() => navigate("/register")}
      />

      <main>
        <Hero onRegister={() => navigate("/register")} />
        <FeatureBento />
        <HowItWorks />
        <Models />
        <Detection />
        <CommunityHub />
        <Pricing />
        <FAQ />
        <HelpForm />
        <FinalCTA onRegister={() => navigate("/register")} />
      </main>

      <Footer />
    </div>
  );
}
