import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  type Variants,
} from "framer-motion";
import {
  Mic2,
  Sparkles,
  Globe2,
  Play,
  Pause,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  Plus,
  Minus,
  Activity,
  Headphones,
  AudioLines,
  Users,
  ShieldCheck,
  Bot,
  Radio,
  Wand2,
  Gauge,
  Languages,
  Fingerprint,
  ScanLine,
  Layers,
  Heart,
  Share2,
  Bookmark,
  Zap,
  Lock,
  Sliders,
  CircleDot,
  Volume2,
  BadgeCheck,
  Cpu,
  Network,
  FileAudio,
  Quote,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════════
   VOCARIA · Enterprise Voice AI Platform — Landing
   Cinematic · High-density · Scroll-reactive · Interactive
   Motion replays on scroll-down AND scroll-up (viewport once:false)
   ════════════════════════════════════════════════════════════════════════ */

// Font configuration for elegant, high-contrast serif typography.
const SERIF = "'Playfair Display', serif";

/* ─────────────────────────────  Motion helpers  ───────────────────────── */

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 34, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: easeOut },
  },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

// Replays entry + exit each time the block enters/leaves the viewport.
const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
  amount?: number;
  as?: keyof JSX.IntrinsicElements;
}> = ({ children, className = "", variants = fadeUp, amount = 0.25 }) => (
  <motion.div
    className={className}
    variants={variants}
    initial="hidden"
    whileInView="visible"
    exit="hidden"
    viewport={{ once: false, amount }}
  >
    {children}
  </motion.div>
);

const WaveRevealText: React.FC<{ text: string; delay?: number; className?: string; as?: any }> = ({ text, delay = 0, className = "", as: Component = "span" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.2 });
  return (
    <Component ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, delay: delay + i * 0.03, ease: easeOut }}
          className={char === " " ? "w-[0.3em]" : ""}
        >
          {char}
        </motion.span>
      ))}
    </Component>
  );
};

const WipeRevealText: React.FC<{ children: React.ReactNode; delay?: number; className?: string; as?: any }> = ({ children, delay = 0, className = "", as: Component = "div" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.2 });
  return (
    <Component ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={inView ? { clipPath: "inset(0 0% 0 0)" } : { clipPath: "inset(0 100% 0 0)" }}
        transition={{ duration: 0.9, ease: easeOut, delay }}
      >
        {children}
      </motion.div>
    </Component>
  );
};

const CascadeReveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string; staggerAmount?: number }> = ({ children, delay = 0, className = "", staggerAmount = 0.08 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.1 });
  return (
    <div ref={ref} className={className}>
      {React.Children.map(children, (child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: delay + i * staggerAmount, ease: easeOut }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
};

const PincerReveal: React.FC<{ leftText: React.ReactNode; rightText: React.ReactNode; centerText?: React.ReactNode; delay?: number; className?: string }> = ({ leftText, rightText, centerText, delay = 0, className = "" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.2 });
  return (
    <div ref={ref} className={`flex items-center justify-between w-full ${className}`}>
      <motion.div initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }} transition={{ duration: 0.6, delay, ease: easeOut }}>
        {leftText}
      </motion.div>
      {centerText && (
        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : { opacity: 0 }} transition={{ duration: 0.6, delay: delay + 0.15, ease: easeOut }}>
          {centerText}
        </motion.div>
      )}
      <motion.div initial={{ opacity: 0, x: 30 }} animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }} transition={{ duration: 0.6, delay, ease: easeOut }}>
        {rightText}
      </motion.div>
    </div>
  );
};

/* ─────────────────────────────  Primitives  ───────────────────────────── */

const Logo = ({ size = 34, dark = false }: { size?: number; dark?: boolean }) => (
  <div className="flex items-center gap-2.5 group cursor-pointer select-none">
    <div
      className="relative grid place-items-center rounded-xl overflow-hidden"
      style={{
        width: size,
        height: size,
        background: dark
          ? "linear-gradient(135deg,#ffffff,#c9d3ff)"
          : "linear-gradient(135deg,#0b0b0f,#242a52)",
      }}
    >
      <div className="relative z-10 flex items-end gap-[2px] h-[46%]">
        {[40, 90, 60, 100, 55].map((h, i) => (
          <motion.span
            key={i}
            className="w-[2px] rounded-full"
            style={{ background: dark ? "#0b0b0f" : "#fff", height: `${h}%` }}
            animate={{ scaleY: [1, 0.55, 1.15, 0.7, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
          />
        ))}
      </div>
    </div>
    <span
      className={`font-semibold text-xl tracking-tight ${dark ? "text-white" : "text-black"}`}
    >
      Vocaria
    </span>
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; dark?: boolean; className?: string }> = ({
  children,
  dark = false,
  className = "",
}) => (
  <div
    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.2em] border ${
      dark
        ? "bg-white/[0.06] text-white/70 border-white/10"
        : "bg-black/[0.03] text-black/55 border-black/[0.06]"
    } ${className}`}
  >
    {children}
  </div>
);

const GradientText: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <span
    className={className}
    style={{
      background: "linear-gradient(105deg,#3a5cf7 0%,#7c3aed 45%,#d946ef 100%)",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
    }}
  >
    {children}
  </span>
);

const WordRotator: React.FC<{ words: string[]; className?: string }> = ({ words, className = "" }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <span className={`relative inline-flex flex-col justify-end overflow-hidden align-bottom ${className}`} style={{ height: "1.1em", verticalAlign: "middle", paddingBottom: "0.1em" }}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={index}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="block leading-none"
        >
          <GradientText>{words[index]}</GradientText>
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

const PrimaryBtn: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  dark?: boolean;
}> = ({ children, onClick, className = "", dark = false }) => (
  <button
    onClick={onClick}
    className={`group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-medium text-sm hover:opacity-90 transition-opacity ${
      dark ? "bg-white text-black" : "bg-black text-white"
    } ${className}`}
  >
    {children}
  </button>
);

const GhostBtn: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white border border-black/10 text-black font-medium text-sm hover:bg-black/[0.03] hover:border-black/20 transition-all duration-300 ${className}`}
  >
    {children}
  </button>
);

// Portfolio + AexoTreX credit links — used in BOTH hero and footer.
const CreditLinks: React.FC<{ dark?: boolean }> = ({ dark = false }) => {
  const base = dark
    ? "bg-white/[0.06] text-white/70 border-white/10 hover:bg-white/[0.14]"
    : "bg-black/[0.03] text-black/60 border-black/[0.07] hover:bg-black/[0.07]";
  return (
    <div className="flex items-center gap-2.5">
      <a
        href="https://anshul-portfolio.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.15em] border transition-colors ${base}`}
      >
        <Globe2 size={12} /> Visit Portfolio <ArrowUpRight size={11} className="opacity-60" />
      </a>
      <a
        href="https://aexotrex.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.15em] border transition-colors ${base}`}
      >
        <Sparkles size={12} /> AexoTreX <ArrowUpRight size={11} className="opacity-60" />
      </a>
    </div>
  );
};

/* Animated equalizer waveform (deterministic bar heights). */
const Waveform: React.FC<{
  playing: boolean;
  bars?: number;
  color?: string;
  className?: string;
  height?: number;
}> = ({ playing, bars = 40, color = "rgba(0,0,0,0.8)", className = "", height = 40 }) => (
  <div className={`flex items-center gap-[2px] ${className}`} style={{ height }}>
    {Array.from({ length: bars }).map((_, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const base = 0.28 + (seed / 233280) * 0.72;
      return (
        <motion.span
          key={i}
          className="flex-1 rounded-full origin-center"
          style={{ background: color, minWidth: 2 }}
          animate={
            playing
              ? { scaleY: [base * 0.4, base, base * 0.55, base * 0.9, base * 0.45] }
              : { scaleY: 0.16 }
          }
          transition={{
            duration: 1 + (i % 6) * 0.14,
            repeat: playing ? Infinity : 0,
            ease: "easeInOut",
            delay: (i % 9) * 0.045,
          }}
        />
      );
    })}
  </div>
);

/* Floating glowing mesh blobs for cinematic backgrounds. */
const MeshBg: React.FC<{ variant?: "light" | "dark"; className?: string }> = ({
  variant = "light",
  className = "",
}) => (
  <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
    <motion.div
      className="absolute -top-40 -left-32 w-[46rem] h-[46rem] rounded-full blur-[130px]"
      style={{
        background:
          variant === "dark"
            ? "radial-gradient(circle,rgba(58,92,247,0.45),transparent 65%)"
            : "radial-gradient(circle,rgba(58,92,247,0.18),transparent 65%)",
      }}
      animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.12, 1] }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute top-20 right-[-10rem] w-[40rem] h-[40rem] rounded-full blur-[130px]"
      style={{
        background:
          variant === "dark"
            ? "radial-gradient(circle,rgba(217,70,239,0.4),transparent 65%)"
            : "radial-gradient(circle,rgba(217,70,239,0.15),transparent 65%)",
      }}
      animate={{ x: [0, -50, 0], y: [0, 60, 0], scale: [1, 1.18, 1] }}
      transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute bottom-[-12rem] left-1/3 w-[36rem] h-[36rem] rounded-full blur-[120px]"
      style={{
        background:
          variant === "dark"
            ? "radial-gradient(circle,rgba(124,58,237,0.4),transparent 65%)"
            : "radial-gradient(circle,rgba(124,58,237,0.13),transparent 65%)",
      }}
      animate={{ x: [0, 40, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

/* Fine dotted grid texture. */
const GridTexture: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div
    className="pointer-events-none absolute inset-0"
    style={{
      backgroundImage: `radial-gradient(${
        dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.045)"
      } 1px, transparent 1px)`,
      backgroundSize: "26px 26px",
      maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)",
      WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)",
    }}
  />
);

/* Count-up number that re-runs whenever it re-enters view. */
const CountUp: React.FC<{ to: number; suffix?: string; decimals?: number }> = ({
  to,
  suffix = "",
  decimals = 0,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.6 });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) {
      setVal(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);

  return (
    <span ref={ref}>
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
};

/* ─────────────────────────────  Scroll progress bar  ──────────────────── */

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left"
      style={{
        scaleX,
        background: "linear-gradient(90deg,#3a5cf7,#7c3aed,#d946ef)",
      }}
    />
  );
};

/* ─────────────────────────────  Navbar  ───────────────────────────────── */

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

  const links = [
    ["Platform", "#pillars"],
    ["Voices", "#voices"],
    ["Detection", "#detection"],
    ["Pricing", "#pricing"],
    ["FAQ", "#faq"],
  ];

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: easeOut }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "py-3 bg-[#FDFBF7]/85 backdrop-blur-xl border-b border-black/[0.05]"
          : "py-5 bg-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 flex items-center justify-between">
        <div onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Logo dark={!scrolled} />
        </div>
        <nav className={`hidden lg:flex items-center gap-9 text-sm font-medium ${scrolled ? "text-black/55" : "text-white/80"}`}>
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={`relative transition-colors after:absolute after:left-0 after:-bottom-1.5 after:h-[2px] after:w-0 after:transition-all after:duration-300 hover:after:w-full ${
                scrolled 
                  ? "hover:text-black after:bg-black" 
                  : "hover:text-white after:bg-white"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={onLogin}
            className={`hidden sm:block text-sm font-medium transition-colors px-2 ${scrolled ? "text-black/60 hover:text-black" : "text-white/80 hover:text-white"}`}
          >
            Log in
          </button>
          <button
            onClick={onRegister}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-opacity ${scrolled ? "bg-black text-white hover:opacity-85" : "bg-white text-black hover:opacity-90"}`}
          >
            Start free
          </button>
        </div>
      </div>
    </motion.header>
  );
};

/* ─────────────────────────────  Hero  ─────────────────────────────────── */

const Hero: React.FC<{ onRegister: () => void }> = ({ onRegister }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yPanel = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0.75, 1], [1, 0]);
  const [playing, setPlaying] = useState(true);

  const langs = ["English", "Español", "Français", "Deutsch", "日本語", "हिन्दी", "中文", "Italiano"];

  return (
    <section ref={ref} className="relative pt-36 pb-24 overflow-hidden bg-black">
      <div className="absolute inset-0 z-0 bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="https://res.cloudinary.com/i1su92rm/video/upload/Abstract_glass_sound_waves_dark_202607082031_k4azj6.mp4" type="video/mp4" />
        </video>
        {/* Only fade at the very bottom to blend into the next section */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </div>
      <MeshBg variant="light" className="opacity-50" />
      <GridTexture />
      <motion.div
        style={{ opacity }}
        className="relative max-w-[1400px] mx-auto px-6 md:px-8 flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center gap-5 mb-9"
        >
          <Pill dark>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Enterprise Voice AI Platform
          </Pill>
          <CreditLinks dark />
        </motion.div>

        <WipeRevealText as="h1" delay={0.1} className="text-5xl sm:text-6xl lg:text-[84px] font-bold tracking-tight text-white max-w-5xl leading-[1.05]">
          <span style={{ fontFamily: SERIF }}>
            A unified architecture to <br className="hidden md:block" />
            <WordRotator words={["clone", "generate", "detect", "stream", "analyze"]} /> human voice.
          </span>
        </WipeRevealText>

        <WipeRevealText as="p" delay={0.25} className="mt-6 text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed font-light">
          Scale your voice AI capabilities with zero-shot cloning, sub-second generation, 
          and advanced synthetic fraud detection—all delivered through a single, 
          production-ready enterprise API.
        </WipeRevealText>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.35 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <PrimaryBtn onClick={onRegister} dark>
            Start building free <ArrowRight size={16} />
          </PrimaryBtn>
          <GhostBtn
            className="text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => document.getElementById("voices")?.scrollIntoView({ behavior: "smooth" })}
          >
            <Headphones size={16} /> Hear the voices
          </GhostBtn>
        </motion.div>

        <CascadeReveal
          delay={0.5}
          staggerAmount={0.1}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-white/60"
        >
          <span className="inline-flex items-center gap-1.5">
            <Check size={13} className="text-emerald-500" /> No credit card
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check size={13} className="text-emerald-500" /> Sub-200ms latency
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check size={13} className="text-emerald-500" /> SOC-grade audit trails
          </span>
        </CascadeReveal>

        {/* Hero interactive console */}
        <motion.div
          style={{ y: yPanel }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.55, ease: easeOut }}
          className="mt-16 w-full max-w-5xl"
        >
          <div className="relative rounded-[32px] p-[1.5px] overflow-hidden shadow-[0_40px_110px_-25px_rgba(15,20,70,0.8)]">
            {/* Dynamic rotating border glow */}
            <motion.div
              className="absolute inset-[-150%] opacity-90"
              style={{
                background:
                  "conic-gradient(from 0deg at 50% 50%, #3a5cf7 0deg, transparent 55deg, #d946ef 140deg, transparent 200deg, #7c3aed 275deg, transparent 335deg, #3a5cf7 360deg)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            />

            {/* Darker frosted-glass surface over the background video */}
            <div className="relative rounded-[31px] bg-black text-white overflow-hidden flex flex-col md:flex-row text-left border border-white/[0.08]">
              {/* Glass sheen + top edge highlight */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-black/20" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <GridTexture dark />
              
              {/* Left Side: Welcome Message & Intro */}
              <div className="relative p-8 md:p-12 md:w-3/5 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10">
                <div>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <span className="text-xs font-mono text-white/50 tracking-wider">
                      VOCARIA_TERMINAL
                    </span>
                  </div>

                  <h3 
                    className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-6 leading-tight" 
                    style={{ fontFamily: SERIF }}
                  >
                    Welcome User.
                  </h3>
                  
                  <p className="text-white/70 text-lg md:text-xl leading-relaxed font-light mb-8">
                    Step into the future of synthetic voice. Vocaria AI provides the most advanced architecture for zero-shot cloning, instantaneous text-to-speech rendering, and enterprise-grade voice analytics. Let's begin your session.
                  </p>
                </div>
                
                {/* Visual Line */}
                <div className="w-full h-px bg-gradient-to-r from-white/30 via-white/10 to-transparent my-6" />

                <div className="flex items-center gap-4 text-xs font-mono text-white/40 uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    System Online
                  </span>
                  <span>•</span>
                  <span>v2.4.0</span>
                </div>
              </div>

              {/* Right Side: Interactive Audio Element */}
              <div className="relative p-8 md:p-12 md:w-2/5 flex flex-col justify-center bg-black/40">
                <div className="absolute top-6 right-8">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-widest font-semibold text-emerald-400">
                    <Activity size={12} className="text-emerald-400" /> Live
                  </span>
                </div>

                <div className="flex flex-col items-center text-center mt-4">
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-white text-black hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] mb-8"
                  >
                    {playing ? <Pause size={28} className="ml-0.5" /> : <Play size={28} className="ml-1" />}
                  </button>
                  
                  <div className="w-full max-w-[200px]">
                    <Waveform
                      playing={playing}
                      bars={30}
                      height={44}
                      color="rgba(255,255,255,0.85)"
                      className="w-full justify-center"
                    />
                  </div>
                  <div className="mt-4 text-[11px] font-mono text-white/40 flex items-center justify-center gap-2">
                    <Gauge size={13} /> 182ms
                  </div>

                  <div className="mt-8 flex flex-wrap justify-center gap-2">
                    {langs.slice(0, 4).map((l) => (
                      <span key={l} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/60">
                        {l}
                      </span>
                    ))}
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/40">
                      +4
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

/* ─────────────────────────────  Marquee logos / stat band  ────────────── */

const TrustBand = () => {
  const items = [
    "Real-time Agents",
    "Neural Synthesis",
    "Zero-shot Cloning",
    "Deepfake Defense",
    "17 Languages",
    "WebSocket Streaming",
    "SSML Control",
    "Community Hub",
  ];
  const row = [...items, ...items];
  return (
    <section className="py-12 bg-[#FDFBF7] border-y border-black/[0.03] overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-8 mb-8 text-center flex items-center justify-center gap-4">
        <div className="h-px bg-black/[0.04] flex-1 max-w-[100px]" />
        <PincerReveal 
          className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/40"
          leftText="One Platform"
          centerText="·"
          rightText="The Entire Voice Lifecycle"
        />
        <div className="h-px bg-black/[0.04] flex-1 max-w-[100px]" />
      </div>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-48 bg-gradient-to-r from-[#FDFBF7] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-[#FDFBF7] to-transparent z-10" />
        <motion.div
          className="flex gap-6 whitespace-nowrap pl-6"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        >
          {row.map((it, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white border border-black/[0.04] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] text-[13.5px] font-medium text-black/60 transition-colors hover:text-black hover:border-black/10"
            >
              <AudioLines size={15} className="text-black/25" /> {it}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ─────────────────────────────  Six Core Pillars  ─────────────────────── */

const pillars = [
  {
    id: "agent",
    icon: Bot,
    kicker: "Vocaria Agent",
    title: "Conversational agents that respond in real time.",
    desc: "Deploy ultra-low latency voice agents your developers can wire into any interactive application — with natural turn-taking, instant interruption handling, and streaming responses that feel genuinely alive.",
    color: "#3a5cf7",
    points: ["Sub-200ms round trip", "Barge-in & interruption", "Streaming full-duplex audio", "Custom memory & tools"],
  },
  {
    id: "studio",
    icon: Layers,
    kicker: "Vocaria Studio",
    title: "A full studio to shape every second of sound.",
    desc: "A complete editor for creators and businesses to sequence, layer, and fine-tune audio. Arrange takes on a timeline, adjust delivery per phrase, and export production-ready masters.",
    color: "#7c3aed",
    points: ["Multi-track timeline", "Per-phrase direction", "Non-destructive edits", "Studio-grade export"],
  },
  {
    id: "engine",
    icon: Wand2,
    kicker: "Generation Engine",
    title: "Lightning-fast speech in seventeen languages.",
    desc: "Convert text into breathtaking, expressive speech with fine control over speed, pitch, and temperature. Full SSML support and a palette of emotion styles let you direct performance down to the syllable.",
    color: "#d946ef",
    points: ["17 native languages", "Speed · Pitch · Temperature", "SSML markup", "Emotion & style presets"],
  },
  {
    id: "hub",
    icon: Users,
    kicker: "Vocaria Hub",
    title: "A living library of community voices.",
    desc: "A public network of high-fidelity voices contributed by the community. Discover, like, save, and share signature voices — then clone any of them into your own workspace in a single click.",
    color: "#0ea5e9",
    points: ["100+ curated voices", "Like · Save · Share", "Instant one-click clone", "Creator profiles"],
  },
  {
    id: "cloning",
    icon: Fingerprint,
    kicker: "Voice Cloning",
    title: "Your voice, faithfully — from seconds of audio.",
    desc: "Zero-shot cloning needs only three seconds of reference audio, while fine-tuning modes push fidelity to the extreme. Speaker-embedding extraction and pre-clone quality analysis guarantee a pristine result.",
    color: "#f59e0b",
    points: ["3-second zero-shot", "Fine-tune for fidelity", "Speaker embedding extraction", "Pre-clone quality analysis"],
  },
  {
    id: "detection",
    icon: ShieldCheck,
    kicker: "Deepfake Detection",
    title: "Catch synthetic audio the moment it speaks.",
    desc: "Live audio analysis powered by a multi-model ensemble flags manipulated speech in real time. Streaming detection over WebSocket, speaker diarization, and immutable chain-of-custody logs stand guard.",
    color: "#10b981",
    points: ["Multi-model ensemble", "Real-time WebSocket stream", "Speaker diarization", "Chain-of-custody logs"],
  },
];

const PillarsOverview = () => (
  <section id="pillars" className="relative py-28 md:py-36 bg-[#FDFBF7] overflow-hidden">
    <MeshBg variant="light" className="opacity-70" />
    <div className="relative max-w-[1400px] mx-auto px-6 md:px-8">
      <Reveal className="max-w-3xl mb-24">
        <Pill>
          <Cpu size={12} /> The Platform
        </Pill>
        <WipeRevealText as="h2" delay={0.1} className="mt-6 text-4xl md:text-6xl font-bold text-black leading-[1.05]">
          <span style={{ fontFamily: SERIF }}>
            Six capabilities. <GradientText>One</GradientText> continuous voice stack.
          </span>
        </WipeRevealText>
        <WipeRevealText as="p" delay={0.25} className="mt-8 text-[17px] md:text-lg text-black/50 leading-relaxed max-w-2xl">
          Everything you need to create, refine, distribute, and protect synthetic voice —
          engineered to work as a single, coherent system rather than a pile of disconnected
          tools.
        </WipeRevealText>
      </Reveal>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        exit="hidden"
        viewport={{ once: false, amount: 0.1 }}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
      >
        {pillars.map((p, idx) => (
          <motion.a
            key={p.id}
            href={`#${p.id}`}
            variants={fadeUp}
            whileHover={{ y: -8 }}
            className="group relative rounded-[2rem] bg-white p-8 md:p-10 overflow-hidden transition-all duration-500 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.08)] border border-black/[0.03] flex flex-col h-full"
          >
            {/* Elegant large number */}
            <div 
              className="absolute -top-6 -right-6 text-[140px] md:text-[180px] font-bold text-black/[0.02] leading-none select-none pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-translate-x-4 group-hover:translate-y-4" 
              style={{ fontFamily: SERIF }}
            >
              0{idx + 1}
            </div>

            {/* Header: Icon & Kicker */}
            <div className="relative flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#FDFBF7] border border-black/[0.04] text-black/70 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
                <p.icon size={20} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-black/40">
                {p.kicker}
              </span>
            </div>

            {/* Content */}
            <WipeRevealText as="h3" delay={0.1} className="relative text-[22px] md:text-2xl font-bold text-black leading-[1.35] mb-4">
              {p.title}
            </WipeRevealText>
            <WipeRevealText as="p" delay={0.2} className="relative text-[15px] text-black/50 leading-relaxed mb-10 flex-grow">
              {p.desc}
            </WipeRevealText>

            {/* Footer / Features */}
            <div className="relative mt-auto pt-6 border-t border-black/[0.04]">
              <CascadeReveal delay={0.3} staggerAmount={0.05} className="flex flex-wrap gap-2 mb-6">
                {p.points.slice(0, 3).map((pt) => (
                  <span
                    key={pt}
                    className="flex items-center gap-2 text-[12px] font-medium px-3.5 py-1.5 rounded-lg bg-[#FDFBF7] text-black/60 border border-black/[0.03]"
                  >
                    <div className="w-1 h-1 rounded-full bg-black/20" />
                    {pt}
                  </span>
                ))}
              </CascadeReveal>
              <div className="flex items-center justify-between text-[13px] font-semibold text-black/30 uppercase tracking-widest group-hover:text-black transition-colors duration-300">
                <span>Explore Capability</span>
                <ArrowRight size={16} className="transform -translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
              </div>
            </div>
          </motion.a>
        ))}
      </motion.div>
    </div>
  </section>
);

/* ─────────────────────────────  Deep dive: Agent (latency)  ───────────── */

const AgentDeepDive = () => {
  const pts = [72, 58, 40, 30, 22, 18, 15, 19, 14, 12, 16, 11];
  const max = 80;
  const path = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * 100;
      const y = 100 - (v / max) * 100;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const area = `${path} L100,100 L0,100 Z`;

  return (
    <section id="agent" className="relative py-28 md:py-32 bg-black text-white overflow-hidden">
      <GridTexture dark />
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-8 grid lg:grid-cols-2 gap-16 items-center">
        <Reveal>
          <Pill dark>
            <Bot size={12} /> Vocaria Agent
          </Pill>
          <WipeRevealText as="h2" delay={0.1} className="mt-6 text-4xl md:text-5xl font-bold leading-[1.05]">
            <span style={{ fontFamily: SERIF }}>Conversations at the speed of thought.</span>
          </WipeRevealText>
          <WipeRevealText as="p" delay={0.2} className="mt-6 text-lg text-white/55 leading-relaxed">
            Every millisecond is engineered out of the loop. Streaming synthesis begins before
            the sentence is finished, so your agents answer the instant a user stops speaking —
            no dead air, no robotic pauses.
          </WipeRevealText>
          <CascadeReveal delay={0.3} staggerAmount={0.1} className="mt-10 grid grid-cols-2 gap-8">
            {[
              { icon: Zap, label: "First-token", value: "48ms" },
              { icon: Gauge, label: "Round trip", value: "182ms" },
              { icon: Radio, label: "Protocol", value: "WebRTC" },
              { icon: Network, label: "Concurrency", value: "Unlimited" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col">
                <s.icon size={18} className="text-white/50 mb-2" />
                <div className="text-3xl font-semibold tracking-tight">{s.value}</div>
                <div className="mt-1 text-[12px] text-white/40 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </CascadeReveal>
        </Reveal>

        <Reveal variants={{ hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.9, ease: easeOut } } }}>
          <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-7 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/40">
                  Latency · last 12 turns
                </div>
                <div className="text-3xl font-semibold mt-1 flex items-baseline gap-2">
                  11<span className="text-base text-white/40">ms first-token</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                ▼ 38% faster
              </span>
            </div>
            <div className="relative h-48">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="latFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3a5cf7" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#3a5cf7" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 25, 50, 75, 100].map((y) => (
                  <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
                ))}
                <motion.path
                  d={area}
                  fill="url(#latFill)"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: false }}
                  transition={{ duration: 0.8 }}
                />
                <motion.path
                  d={path}
                  fill="none"
                  stroke="#7c8bff"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: false }}
                  transition={{ duration: 1.4, ease: easeOut }}
                />
              </svg>
            </div>
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-black/40 border border-white/10 p-4">
              <button className="w-10 h-10 rounded-full bg-white text-black grid place-items-center shrink-0">
                <Play size={16} />
              </button>
              <Waveform playing bars={40} color="rgba(124,139,255,0.7)" height={32} className="flex-1" />
              <span className="text-[11px] font-mono text-white/40">0:07</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ─────────────────────────────  Deep dive: Generation Engine  ─────────── */

const GenerationDeepDive = () => {
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const [temp, setTemp] = useState(0.7);
  const [emotion, setEmotion] = useState("Warm");
  const emotions = ["Neutral", "Warm", "Excited", "Calm", "Serious", "Cheerful", "Whisper"];

  return (
    <section id="engine" className="relative py-28 md:py-32 bg-[#FDFBF7] overflow-hidden">
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-8 grid lg:grid-cols-2 gap-16 items-center">
        <Reveal className="order-2 lg:order-1">
          <div className="rounded-3xl border border-black/[0.07] bg-white shadow-[0_24px_70px_-30px_rgba(30,40,120,0.4)] p-7">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-black/40 flex items-center gap-2">
                <Sliders size={14} /> Synthesis controls
              </span>
              <span className="text-[11px] font-mono px-2 py-1 rounded-md bg-black/[0.04] text-black/50">
                SSML ready
              </span>
            </div>

            {/* Editable SSML-style text */}
            <div className="rounded-2xl bg-[#0b0b0f] text-white/90 p-5 font-mono text-[13px] leading-relaxed mb-6">
              <span className="text-fuchsia-400">&lt;speak&gt;</span>
              <br />
              <span className="pl-4 inline-block">
                Good morning.{" "}
                <span className="text-blue-400">&lt;break time="300ms"/&gt;</span> Today feels{" "}
                <span className="text-emerald-400">&lt;emphasis&gt;</span>limitless
                <span className="text-emerald-400">&lt;/emphasis&gt;</span>.
              </span>
              <br />
              <span className="text-fuchsia-400">&lt;/speak&gt;</span>
            </div>

            {/* Sliders */}
            <div className="space-y-5">
              <SliderRow label="Speed" value={speed} min={0.5} max={2} step={0.05} unit="×" onChange={setSpeed} />
              <SliderRow label="Pitch" value={pitch} min={-12} max={12} step={1} unit=" st" onChange={setPitch} />
              <SliderRow label="Temperature" value={temp} min={0} max={1} step={0.05} unit="" onChange={setTemp} />
            </div>

            {/* Emotion presets */}
            <div className="mt-6">
              <div className="text-[12px] font-medium text-black/45 mb-2.5">Emotion style</div>
              <div className="flex flex-wrap gap-2">
                {emotions.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmotion(e)}
                    className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-all ${
                      emotion === e
                        ? "bg-black text-white border-black"
                        : "bg-white text-black/55 border-black/10 hover:border-black/25"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-black/[0.06] flex items-center gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black text-white text-sm font-semibold">
                <Volume2 size={15} /> Generate
              </button>
              <Waveform playing bars={30} height={30} className="flex-1" />
            </div>
          </div>
        </Reveal>

        <Reveal className="order-1 lg:order-2">
          <Pill>
            <Wand2 size={12} /> Generation Engine
          </Pill>
          <WipeRevealText as="h2" delay={0.1} className="mt-6 text-4xl md:text-5xl font-bold text-black leading-[1.05]">
            <span style={{ fontFamily: SERIF }}>Direct every syllable like a performance.</span>
          </WipeRevealText>
          <WipeRevealText as="p" delay={0.2} className="mt-6 text-lg text-black/50 leading-relaxed">
            This is not text-to-speech that reads — it acts. Dial in speed, pitch, and
            temperature, layer in SSML for precise pacing and emphasis, then choose from a
            palette of emotion styles. Render broadcast-quality speech across seventeen
            languages in a fraction of a second.
          </WipeRevealText>
          <CascadeReveal delay={0.3} staggerAmount={0.1} className="mt-8 grid sm:grid-cols-2 gap-4">
            {[
              { icon: Languages, t: "17 languages", d: "Native pronunciation & accent transfer" },
              { icon: Gauge, t: "Real-time factor < 0.3", d: "Faster than playback speed" },
              { icon: Sliders, t: "Fine parameter control", d: "Speed, pitch, temperature" },
              { icon: Sparkles, t: "Emotion styles", d: "From a whisper to elation" },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border border-black/[0.07] bg-white p-5">
                <f.icon size={18} className="text-black/60" />
                <div className="mt-3 font-semibold text-black text-[15px]">{f.t}</div>
                <div className="text-[13px] text-black/45 mt-1">{f.d}</div>
              </div>
            ))}
          </CascadeReveal>
        </Reveal>
      </div>
    </section>
  );
};

const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, unit, onChange }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[13px] font-medium text-black/60">{label}</span>
      <span className="text-[13px] font-mono font-semibold text-black tabular-nums">
        {value.toFixed(step < 1 ? 2 : 0)}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full"
    />
  </div>
);

/* ─────────────────────────────  Featured Voices Showcase  ─────────────── */

// NOTE: audio files are wired later. Replace `src: null` with the hosted
// sample URL for each character (e.g. src: "/samples/aria.mp3") and the
// player below will stream it. UI states are already fully implemented.
const featuredVoices = [
  {
    id: "aria",
    name: "Aria",
    role: "Cinematic Narrator",
    lang: "English · US",
    style: "Warm · Intimate",
    line: "Some stories are meant to be felt before they are ever understood.",
    color: "#7c3aed",
    likes: "12.4k",
    src: null as string | null,
  },
  {
    id: "kenji",
    name: "Kenji",
    role: "News Anchor",
    lang: "日本語 · JP",
    style: "Crisp · Authoritative",
    line: "こんばんは。本日の主要ニュースをお伝えします。",
    color: "#3a5cf7",
    likes: "8.1k",
    src: null as string | null,
  },
  {
    id: "sofia",
    name: "Sofía",
    role: "Audiobook Voice",
    lang: "Español · ES",
    style: "Expressive · Bright",
    line: "El viento susurraba secretos entre los viejos olivos.",
    color: "#d946ef",
    likes: "15.7k",
    src: null as string | null,
  },
  {
    id: "atlas",
    name: "Atlas",
    role: "Game Companion",
    lang: "English · UK",
    style: "Deep · Heroic",
    line: "Stand ready — the gates will not hold for much longer.",
    color: "#0ea5e9",
    likes: "9.9k",
    src: null as string | null,
  },
  {
    id: "nova",
    name: "Nova",
    role: "Product Assistant",
    lang: "English · US",
    style: "Friendly · Clear",
    line: "All set — I've scheduled that for tomorrow at nine.",
    color: "#10b981",
    likes: "21.2k",
    src: null as string | null,
  },
  {
    id: "leila",
    name: "Leila",
    role: "Meditation Guide",
    lang: "English · US",
    style: "Soft · Soothing",
    line: "Breathe in slowly… and let the day gently fall away.",
    color: "#f59e0b",
    likes: "18.0k",
    src: null as string | null,
  },
];

const FeaturedVoices = () => {
  const [selected, setSelected] = useState(featuredVoices[0].id);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const active = featuredVoices.find((v) => v.id === selected)!;

  // Simulated playback progress. Real audio wiring replaces this with the
  // <audio> element's timeupdate events using `active.src`.
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setPlaying(false);
          return 0;
        }
        return p + 0.7;
      });
    }, 60);
    return () => clearInterval(iv);
  }, [playing]);

  const selectVoice = (id: string) => {
    setSelected(id);
    setProgress(0);
    setPlaying(true);
  };

  return (
    <section id="voices" className="relative py-28 md:py-36 bg-black text-white overflow-hidden">
      <GridTexture dark />
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-8">
        <Reveal className="max-w-3xl mb-16">
          <Pill dark>
            <Users size={12} /> Vocaria Hub · Featured Voices
          </Pill>
          <WipeRevealText as="h2" delay={0.1} className="mt-6 text-4xl md:text-6xl font-bold leading-[1.02]">
            <span style={{ fontFamily: SERIF }}>Meet the <GradientText>voices</GradientText> people love.</span>
          </WipeRevealText>
          <WipeRevealText as="p" delay={0.2} className="mt-6 text-lg text-white/55 leading-relaxed">
            A curated glimpse of the community library. Select a character to hear their
            signature delivery — then like it, save it, or clone it into your workspace in a
            single click.
          </WipeRevealText>
        </Reveal>

        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
          {/* Voice list */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            exit="hidden"
            viewport={{ once: false, amount: 0.2 }}
            className="space-y-2.5"
          >
            {featuredVoices.map((v) => {
              const isActive = v.id === selected;
              return (
                <motion.button
                  key={v.id}
                  variants={fadeUp}
                  onClick={() => selectVoice(v.id)}
                  className={`w-full text-left border-b border-white/10 py-5 flex items-center gap-4 transition-all duration-300 ${
                    isActive
                      ? "text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <div
                    className="relative w-12 h-12 rounded-2xl grid place-items-center shrink-0 font-semibold text-lg"
                    style={{ background: `linear-gradient(135deg,${v.color},${v.color}88)` }}
                  >
                    {isActive && playing ? (
                      <Waveform playing bars={4} height={20} color="rgba(255,255,255,0.9)" />
                    ) : (
                      v.name[0]
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{v.name}</span>
                      <span className="text-[11px] text-white/40">{v.role}</span>
                    </div>
                    <div className="text-[12px] text-white/40 truncate">
                      {v.lang} · {v.style}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-white/40 shrink-0">
                    <Heart size={13} className={isActive ? "text-fuchsia-400 fill-fuchsia-400" : ""} />
                    {v.likes}
                  </div>
                  <div
                    className={`w-9 h-9 rounded-full grid place-items-center shrink-0 transition-colors ${
                      isActive ? "bg-white text-black" : "bg-white/10 text-white"
                    }`}
                  >
                    {isActive && playing ? <Pause size={15} /> : <Play size={15} />}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Now playing panel */}
          <Reveal
            variants={{
              hidden: { opacity: 0, scale: 0.97 },
              visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: easeOut } },
            }}
          >
            <div className="relative h-full rounded-3xl border border-white/10 overflow-hidden">
              <div
                className="absolute inset-0 opacity-40 transition-all duration-700"
                style={{
                  background: `radial-gradient(circle at 30% 20%,${active.color}66,transparent 60%)`,
                }}
              />
              <div className="relative p-8 md:p-10 flex flex-col h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                    Now playing
                  </span>
                  <div className="flex items-center gap-2">
                    {[Heart, Bookmark, Share2].map((Ic, i) => (
                      <button
                        key={i}
                        className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 grid place-items-center text-white/70 hover:bg-white/15 transition-colors"
                      >
                        <Ic size={15} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-5">
                  <div
                    className="w-20 h-20 rounded-3xl grid place-items-center text-3xl font-semibold shrink-0"
                    style={{ background: `linear-gradient(135deg,${active.color},${active.color}88)` }}
                  >
                    {active.name[0]}
                  </div>
                  <div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={active.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="text-2xl font-semibold">{active.name}</div>
                        <div className="text-white/50">{active.role}</div>
                        <div className="mt-1.5 flex gap-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                            {active.lang}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                            {active.style}
                          </span>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.p
                    key={active.id + "-line"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="mt-8 text-xl md:text-2xl leading-relaxed text-white/85"
                    style={{ fontFamily: SERIF }}
                  >
                    “{active.line}”
                  </motion.p>
                </AnimatePresence>

                <div className="mt-auto pt-10">
                  <Waveform
                    playing={playing}
                    bars={64}
                    height={56}
                    color={`${active.color}cc`}
                    className="mb-5"
                  />
                  {/* Progress */}
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ width: `${progress}%`, background: active.color }}
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <button
                      onClick={() => setPlaying((p) => !p)}
                      className="w-14 h-14 rounded-full bg-white text-black grid place-items-center hover:scale-105 transition-transform shrink-0"
                    >
                      {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                    </button>
                    <button className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-white/[0.06] border border-white/15 text-sm font-semibold hover:bg-white/[0.12] transition-colors">
                      <Fingerprint size={16} /> Clone this voice
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────  Deep dive: Cloning  ───────────────────── */

const CloningDeepDive = () => {
  const steps = [
    { icon: FileAudio, t: "Upload 3+ seconds", d: "A short, clean reference is all it takes." },
    { icon: ScanLine, t: "Quality analysis", d: "SNR, clipping, and prosody checked pre-clone." },
    { icon: Fingerprint, t: "Speaker embedding", d: "A unique vocal fingerprint is extracted." },
    { icon: BadgeCheck, t: "Voice is ready", d: "Zero-shot in seconds, or fine-tune for fidelity." },
  ];
  return (
    <section id="cloning" className="relative py-28 md:py-32 bg-[#FDFBF7] overflow-hidden">
      <MeshBg variant="light" className="opacity-60" />
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-8">
        <Reveal className="max-w-3xl mb-16">
          <Pill>
            <Fingerprint size={12} /> Voice Cloning
          </Pill>
          <WipeRevealText as="h2" delay={0.1} className="mt-6 text-4xl md:text-6xl font-bold text-black leading-[1.02]">
            <span style={{ fontFamily: SERIF }}>From three seconds to a <GradientText>flawless</GradientText> clone.</span>
          </WipeRevealText>
          <WipeRevealText as="p" delay={0.2} className="mt-6 text-lg text-black/50 leading-relaxed">
            A rigorous pipeline turns a whisper of audio into a production-grade voice — with
            quality analysis and speaker-embedding extraction guarding fidelity at every step.
          </WipeRevealText>
        </Reveal>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          exit="hidden"
          viewport={{ once: false, amount: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {steps.map((s, i) => (
            <motion.div
              key={s.t}
              variants={fadeUp}
              className="relative rounded-3xl border border-black/[0.07] bg-white p-6"
            >
              <div className="absolute top-5 right-5 text-5xl font-serif text-black/[0.06]" style={{ fontFamily: SERIF }}>
                {i + 1}
              </div>
              <div className="w-11 h-11 rounded-2xl bg-black text-white grid place-items-center mb-5">
                <s.icon size={19} />
              </div>
              <h3 className="font-semibold text-black">{s.t}</h3>
              <p className="mt-2 text-[13.5px] text-black/50 leading-relaxed">{s.d}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Quality analysis mock */}
        <Reveal>
          <div className="rounded-3xl border border-black/[0.07] bg-white p-7 md:p-9 grid md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2">
              <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-black/40 mb-4">
                Pre-clone quality report
              </div>
              <div className="space-y-4">
                {[
                  { label: "Signal-to-noise ratio", val: 94, tag: "Excellent" },
                  { label: "Clarity & articulation", val: 88, tag: "Great" },
                  { label: "Prosody richness", val: 82, tag: "Great" },
                  { label: "Background silence", val: 96, tag: "Clean" },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between mb-1.5 text-[13.5px]">
                      <span className="text-black/60 font-medium">{m.label}</span>
                      <span className="text-black/45 font-mono">
                        {m.val}% · {m.tag}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg,#3a5cf7,#7c3aed)" }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${m.val}%` }}
                        viewport={{ once: false }}
                        transition={{ duration: 1, ease: easeOut }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-[#0b0b0f] text-white p-6 text-center">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/40">Overall</div>
              <div className="mt-2 text-6xl font-semibold" style={{ fontFamily: SERIF }}>
                <CountUp to={90} suffix="" />
              </div>
              <div className="text-emerald-400 text-sm font-medium">Ready to clone</div>
              <button className="mt-5 w-full py-3 rounded-full bg-white text-black text-sm font-semibold inline-flex items-center justify-center gap-2">
                <Fingerprint size={15} /> Extract embedding
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ─────────────────────────────  Deep dive: Detection  ─────────────────── */

const DetectionDeepDive = () => {
  const [scanning, setScanning] = useState(true);
  const score = 96.4;
  const circumference = 2 * Math.PI * 52;

  return (
    <section id="detection" className="relative py-28 md:py-32 bg-black text-white overflow-hidden">
      <GridTexture dark />
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-8 grid lg:grid-cols-2 gap-16 items-center">
        <Reveal>
          <Pill dark>
            <ShieldCheck size={12} /> Deepfake Detection
          </Pill>
          <WipeRevealText as="h2" delay={0.1} className="mt-6 text-4xl md:text-5xl font-bold leading-[1.05]">
            <span style={{ fontFamily: SERIF }}>A live shield against synthetic fraud.</span>
          </WipeRevealText>
          <WipeRevealText as="p" delay={0.2} className="mt-6 text-lg text-white/55 leading-relaxed">
            A multi-model ensemble listens to audio as it streams and returns a manipulation
            probability in real time. Speaker diarization separates who spoke when, while an
            immutable chain-of-custody log makes every verdict defensible.
          </WipeRevealText>
          <CascadeReveal delay={0.3} staggerAmount={0.1} className="mt-8 space-y-3">
            {[
              { icon: Network, t: "Multi-model ensemble", d: "Independent detectors vote on every segment." },
              { icon: Radio, t: "Real-time WebSocket stream", d: "Verdicts arrive as the audio plays." },
              { icon: Users, t: "Speaker diarization", d: "Attributes each phrase to a distinct speaker." },
              { icon: Lock, t: "Chain-of-custody logs", d: "Tamper-evident record for compliance." },
            ].map((f) => (
              <div key={f.t} className="flex items-start gap-4 border-b border-white/10 py-5">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] grid place-items-center shrink-0">
                  <f.icon size={18} className="text-white/70" />
                </div>
                <div>
                  <div className="font-semibold text-[15px]">{f.t}</div>
                  <div className="text-[13px] text-white/45">{f.d}</div>
                </div>
              </div>
            ))}
          </CascadeReveal>
        </Reveal>

        <Reveal
          variants={{
            hidden: { opacity: 0, x: 40 },
            visible: { opacity: 1, x: 0, transition: { duration: 0.9, ease: easeOut } },
          }}
        >
          <div className="p-8 border-l border-white/10">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[12px] uppercase tracking-[0.18em] text-white/45">
                Live analysis
              </span>
              <button
                onClick={() => setScanning((s) => !s)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {scanning ? "Streaming" : "Paused"}
              </button>
            </div>

            {/* Probability gauge */}
            <div className="flex items-center gap-8">
              <div className="relative w-36 h-36 shrink-0">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    whileInView={{ strokeDashoffset: circumference * (1 - score / 100) }}
                    viewport={{ once: false }}
                    transition={{ duration: 1.4, ease: easeOut }}
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="text-3xl font-semibold">{score}%</div>
                    <div className="text-[10.5px] uppercase tracking-wider text-emerald-400">Authentic</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {[
                  { m: "Spectral", v: 97 },
                  { m: "Prosodic", v: 95 },
                  { m: "Artifact", v: 96 },
                  { m: "Neural", v: 98 },
                ].map((d) => (
                  <div key={d.m}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-white/55">{d.m} model</span>
                      <span className="font-mono text-white/40">{d.v}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-emerald-400"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${d.v}%` }}
                        viewport={{ once: false }}
                        transition={{ duration: 1, ease: easeOut }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Diarization track */}
            <div className="mt-8">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/40 mb-3">
                Speaker diarization
              </div>
              <div className="flex h-8 rounded-lg overflow-hidden border border-white/10">
                {[
                  { w: 32, c: "#3a5cf7", l: "S1" },
                  { w: 20, c: "#d946ef", l: "S2" },
                  { w: 28, c: "#3a5cf7", l: "S1" },
                  { w: 20, c: "#10b981", l: "S3" },
                ].map((seg, i) => (
                  <div
                    key={i}
                    className="grid place-items-center text-[10px] font-semibold text-white/90"
                    style={{ width: `${seg.w}%`, background: `${seg.c}aa` }}
                  >
                    {seg.l}
                  </div>
                ))}
              </div>
            </div>

            {/* Chain of custody */}
            <div className="mt-6 rounded-2xl bg-black/40 border border-white/10 p-4 font-mono text-[11px] text-white/50 space-y-1.5">
              <div className="flex items-center gap-2">
                <Lock size={11} className="text-emerald-400" /> 14:02:11 · segment#0142 · hash 0x9f…a2c
              </div>
              <div className="flex items-center gap-2">
                <Lock size={11} className="text-emerald-400" /> 14:02:12 · verdict AUTHENTIC · 96.4%
              </div>
              <div className="flex items-center gap-2">
                <Lock size={11} className="text-emerald-400" /> 14:02:12 · signed · custody sealed
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ─────────────────────────────  Studio strip  ─────────────────────────── */

const StudioStrip = () => (
  <section id="studio" className="relative py-28 md:py-32 bg-[#FDFBF7] overflow-hidden">
    <div className="relative max-w-[1400px] mx-auto px-6 md:px-8">
      <Reveal className="max-w-3xl mb-14">
        <Pill>
          <Layers size={12} /> Vocaria Studio
        </Pill>
        <WipeRevealText as="h2" delay={0.1} className="mt-6 text-4xl md:text-6xl font-bold text-black leading-[1.02]">
          <span style={{ fontFamily: SERIF }}>Sequence, layer, and <GradientText>perfect</GradientText> every take.</span>
        </WipeRevealText>
        <WipeRevealText as="p" delay={0.2} className="mt-6 text-lg text-black/50 leading-relaxed">
          A production timeline where phrases become tracks, direction becomes a gesture, and
          the final master is always one export away.
        </WipeRevealText>
      </Reveal>

      <Reveal>
        <div className="rounded-3xl border border-black/[0.07] bg-white shadow-[0_30px_80px_-40px_rgba(30,40,120,0.4)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06]">
            <div className="flex items-center gap-2 text-[12px] font-mono text-black/40">
              <CircleDot size={13} className="text-red-500" /> session · untitled_master.wav
            </div>
            <div className="flex items-center gap-2">
              {["Cut", "Fade", "Pitch", "Export"].map((b) => (
                <span key={b} className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-black/[0.04] text-black/55">
                  {b}
                </span>
              ))}
            </div>
          </div>
          <div className="p-6 space-y-3">
            {[
              { name: "Narration", color: "#3a5cf7", blocks: [[4, 22], [30, 26], [62, 30]] },
              { name: "Character · Aria", color: "#d946ef", blocks: [[10, 18], [40, 16], [70, 22]] },
              { name: "Ambience", color: "#10b981", blocks: [[0, 96]] },
              { name: "SFX", color: "#f59e0b", blocks: [[18, 6], [52, 8], [80, 10]] },
            ].map((track) => (
              <div key={track.name} className="flex items-center gap-4">
                <div className="w-28 shrink-0 text-[12.5px] font-medium text-black/55">{track.name}</div>
                <div className="relative flex-1 h-11 rounded-xl bg-black/[0.035] overflow-hidden">
                  {track.blocks.map((b, i) => (
                    <motion.div
                      key={i}
                      className="absolute top-1.5 bottom-1.5 rounded-lg flex items-center px-2 gap-[2px] overflow-hidden"
                      style={{ left: `${b[0]}%`, width: `${b[1]}%`, background: `${track.color}22`, border: `1px solid ${track.color}55` }}
                      initial={{ opacity: 0, scaleX: 0.6 }}
                      whileInView={{ opacity: 1, scaleX: 1 }}
                      viewport={{ once: false }}
                      transition={{ duration: 0.6, ease: easeOut }}
                    >
                      {Array.from({ length: Math.max(3, Math.floor(b[1] / 2)) }).map((_, j) => (
                        <span
                          key={j}
                          className="w-[2px] rounded-full"
                          style={{ height: `${20 + ((j * 37) % 60)}%`, background: `${track.color}` }}
                        />
                      ))}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 pt-2">
              <div className="w-28 shrink-0" />
              <div className="flex-1 flex justify-between text-[10px] font-mono text-black/30">
                {["0:00", "0:15", "0:30", "0:45", "1:00", "1:15"].map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ─────────────────────────────  Stats band  ───────────────────────────── */

const StatsBand = () => {
  const stats = [
    { to: 17, suffix: "", label: "Languages supported", d: 0 },
    { to: 3, suffix: "s", label: "Audio to clone a voice", d: 0 },
    { to: 182, suffix: "ms", label: "Agent round-trip latency", d: 0 },
    { to: 99.2, suffix: "%", label: "Detection accuracy", d: 1 },
  ];
  return (
    <section className="relative py-24 bg-[#FDFBF7] border-y border-black/[0.05]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          exit="hidden"
          viewport={{ once: false, amount: 0.4 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="text-center">
              <div className="text-5xl md:text-6xl font-bold text-black tracking-tight" style={{ fontFamily: SERIF }}>
                <CountUp to={s.to} suffix={s.suffix} decimals={s.d} />
              </div>
              <div className="mt-3 text-[13px] uppercase tracking-[0.15em] text-black/40">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ─────────────────────────────  Workflow  ─────────────────────────────── */

const Workflow = () => {
  const steps = [
    { n: "01", icon: Mic2, t: "Capture or upload", d: "Bring a reference sample, or write a script — the platform takes it from there." },
    { n: "02", icon: Wand2, t: "Generate or clone", d: "Synthesize expressive speech, or clone a voice with quality analysis built in." },
    { n: "03", icon: Layers, t: "Refine in Studio", d: "Sequence takes, direct delivery, and master to broadcast quality." },
    { n: "04", icon: ShieldCheck, t: "Ship with confidence", d: "Stream to agents and defend every output with live deepfake detection." },
  ];
  return (
    <section className="relative py-28 md:py-32 bg-black text-white overflow-hidden">
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-8">
        <Reveal className="max-w-2xl mb-16">
          <Pill dark>
            <Activity size={12} /> How it works
          </Pill>
          <WipeRevealText as="h2" delay={0.1} className="mt-6 text-4xl md:text-5xl font-bold leading-[1.05]">
            <span style={{ fontFamily: SERIF }}>From idea to production in four moves.</span>
          </WipeRevealText>
        </Reveal>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          exit="hidden"
          viewport={{ once: false, amount: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-white/10 border-y border-white/10 mt-10"
        >
          {steps.map((s) => (
            <motion.div key={s.n} variants={fadeUp} className="relative bg-black p-8">
              <div className="text-[12px] font-mono text-white/30 mb-6">{s.n}</div>
              <div className="w-12 h-12 rounded-2xl bg-white/[0.06] grid place-items-center mb-5">
                <s.icon size={22} className="text-white/80" />
              </div>
              <h3 className="font-semibold text-lg">{s.t}</h3>
              <p className="mt-2 text-[13.5px] text-white/45 leading-relaxed">{s.d}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ─────────────────────────────  Testimonials  ─────────────────────────── */

const Testimonials = () => {
  const quotes = [
    { q: "We replaced three vendors with one platform. The latency alone justified the switch.", n: "Priya Nair", r: "Head of Voice, a conversational-AI startup", c: "#3a5cf7" },
    { q: "The cloning fidelity is uncanny, and the quality report caught issues before we shipped.", n: "Marcus Feld", r: "Creative Director, audio studio", c: "#d946ef" },
    { q: "Real-time deepfake detection with a custody log is exactly what our compliance team needed.", n: "Dana Osei", r: "Security Lead, fintech", c: "#10b981" },
  ];
  return (
    <section className="relative py-28 md:py-32 bg-[#FDFBF7] overflow-hidden">
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-8">
        <Reveal className="max-w-2xl mb-14">
          <Pill>
            <Quote size={12} /> Loved by builders
          </Pill>
          <WipeRevealText as="h2" delay={0.1} className="mt-6 text-4xl md:text-5xl font-bold text-black leading-[1.05]">
            <span style={{ fontFamily: SERIF }}>Teams ship faster on Vocaria.</span>
          </WipeRevealText>
        </Reveal>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          exit="hidden"
          viewport={{ once: false, amount: 0.2 }}
          className="grid md:grid-cols-3 gap-5"
        >
          {quotes.map((t) => (
            <motion.div
              key={t.n}
              variants={fadeUp}
              className="rounded-3xl border border-black/[0.07] bg-white p-8 flex flex-col"
            >
              <Quote size={28} style={{ color: t.c }} />
              <p className="mt-5 text-lg text-black/75 leading-relaxed flex-1" style={{ fontFamily: SERIF }}>
                “{t.q}”
              </p>
              <div className="mt-7 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full grid place-items-center text-white font-semibold" style={{ background: t.c }}>
                  {t.n[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-black">{t.n}</div>
                  <div className="text-[12px] text-black/45">{t.r}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ─────────────────────────────  Pricing  ──────────────────────────────── */

const Pricing = () => {
  const [yearly, setYearly] = useState(false);
  const tiers = [
    { name: "Free", desc: "For tinkering and first prototypes.", price: { m: 0, y: 0 }, feats: ["10k characters / mo", "Community Hub access", "Zero-shot cloning", "Standard voices"], cta: "Get started", highlight: false },
    { name: "Creator", desc: "For creators shipping real work.", price: { m: 19, y: 15 }, feats: ["500k characters / mo", "Studio editor", "Fine-tune cloning", "Emotion styles"], cta: "Start trial", highlight: false },
    { name: "Pro", desc: "For teams building products.", price: { m: 79, y: 65 }, feats: ["3M characters / mo", "Real-time agents", "Deepfake detection", "Priority latency"], cta: "Start Pro trial", highlight: true },
    { name: "Enterprise", desc: "For platforms at scale.", price: { m: 299, y: 249 }, feats: ["Unlimited volume", "WebSocket streaming", "Chain-of-custody logs", "Dedicated support"], cta: "Contact sales", highlight: false },
  ];
  return (
    <section id="pricing" className="relative py-28 md:py-32 bg-[#FDFBF7] overflow-hidden">
      <MeshBg variant="light" className="opacity-60" />
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-8">
        <Reveal className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-xl">
            <Pill>
              <BadgeCheck size={12} /> Pricing
            </Pill>
            <WipeRevealText as="h2" delay={0.1} className="mt-6 text-4xl md:text-6xl font-bold text-black leading-[1.02]">
              <span style={{ fontFamily: SERIF }}>Simple pricing, <GradientText>honest</GradientText> scale.</span>
            </WipeRevealText>
            <WipeRevealText as="p" delay={0.2} className="mt-6 text-lg text-black/50">
              Start free. Upgrade only when your voices start paying you back.
            </WipeRevealText>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] p-1 border border-black/[0.06]">
            <button onClick={() => setYearly(false)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!yearly ? "bg-white text-black shadow-sm" : "text-black/50"}`}>Monthly</button>
            <button onClick={() => setYearly(true)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${yearly ? "bg-white text-black shadow-sm" : "text-black/50"}`}>
              Yearly <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black text-white">-25%</span>
            </button>
          </div>
        </Reveal>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          exit="hidden"
          viewport={{ once: false, amount: 0.15 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {tiers.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              className={`relative p-8 rounded-3xl flex flex-col border ${
                t.highlight
                  ? "bg-[#0b0b0f] text-white border-transparent shadow-[0_30px_70px_-30px_rgba(30,40,120,0.6)]"
                  : "bg-white text-black border-black/[0.07]"
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-8 text-[10.5px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-white" style={{ background: "linear-gradient(105deg,#3a5cf7,#d946ef)" }}>
                  Most popular
                </span>
              )}
              <h3 className="text-2xl font-semibold" style={{ fontFamily: SERIF }}>{t.name}</h3>
              <p className={`mt-2 text-[13.5px] h-10 ${t.highlight ? "text-white/50" : "text-black/50"}`}>{t.desc}</p>
              <div className="mt-6 mb-8 flex items-baseline gap-1">
                <span className="text-5xl font-medium tracking-tight">${yearly ? t.price.y : t.price.m}</span>
                <span className={`text-sm ${t.highlight ? "text-white/40" : "text-black/40"}`}>/ mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {t.feats.map((f) => (
                  <li key={f} className={`flex items-center gap-2.5 text-[13.5px] ${t.highlight ? "text-white/70" : "text-black/60"}`}>
                    <Check size={15} className={t.highlight ? "text-emerald-400" : "text-emerald-500"} /> {f}
                  </li>
                ))}
              </ul>
              <button className={`mt-auto w-full py-3.5 rounded-full font-medium text-sm transition-opacity hover:opacity-85 ${t.highlight ? "bg-white text-black" : "bg-black text-white"}`}>
                {t.cta}
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ─────────────────────────────  FAQ  ──────────────────────────────────── */

const FAQ = () => {
  const faqs = [
    { q: "How much audio do I need to clone a voice?", a: "Zero-shot cloning needs only three seconds of clean, single-speaker audio. For extreme fidelity, fine-tuning modes accept longer references and refine the speaker embedding further." },
    { q: "Which languages are supported for generation?", a: "Seventeen languages out of the box, each with native pronunciation and accent transfer — including English, Spanish, French, German, Japanese, Hindi, Mandarin, and Italian." },
    { q: "How does the deepfake detection actually work?", a: "A multi-model ensemble analyses spectral, prosodic, and artifact signatures independently, then votes on a manipulation probability. It streams over WebSocket in real time, with speaker diarization and a tamper-evident chain-of-custody log." },
    { q: "Can I control the emotion and delivery of generated speech?", a: "Yes. Adjust speed, pitch, and temperature directly, apply SSML for precise pacing and emphasis, and choose from a palette of emotion styles ranging from a whisper to elation." },
    { q: "What is the Vocaria Hub?", a: "A public library and social network of community voices. Discover high-fidelity voices, like, save, and share them, and clone any voice into your own workspace in a single click." },
    { q: "Can I use generated audio commercially?", a: "Yes. Creator, Pro, and Enterprise plans include full commercial rights, with Enterprise adding dedicated support and compliance-grade audit trails." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-28 md:py-32 bg-[#FDFBF7]">
      <div className="max-w-[820px] mx-auto px-6 md:px-8">
        <Reveal className="text-center mb-14">
          <Pill className="mx-auto">
            <CircleDot size={12} /> FAQ
          </Pill>
          <WipeRevealText as="h2" delay={0.1} className="mt-6 text-4xl md:text-5xl font-bold text-black flex justify-center">
            <span style={{ fontFamily: SERIF }}>Questions, answered.</span>
          </WipeRevealText>
        </Reveal>
        <div className="border-t border-black/[0.09]">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="border-b border-black/[0.09]">
                <button onClick={() => setOpen(isOpen ? null : i)} className="w-full py-6 flex items-center justify-between text-left gap-6 group">
                  <span className="text-[17px] font-medium text-black group-hover:text-black/70 transition-colors">{f.q}</span>
                  <span className={`shrink-0 rounded-full p-2 transition-colors ${isOpen ? "bg-black text-white" : "bg-black/[0.05] text-black/50"}`}>
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: easeOut }} className="overflow-hidden">
                      <p className="pb-7 pr-12 text-black/55 leading-relaxed text-[15px]">{f.a}</p>
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

/* ─────────────────────────────  Final CTA  ────────────────────────────── */

const FinalCTA: React.FC<{ onRegister: () => void }> = ({ onRegister }) => (
  <section className="relative py-32 bg-[#FDFBF7] overflow-hidden">
    <div className="relative max-w-[1400px] mx-auto px-6 md:px-8">
      <Reveal>
        <div className="relative rounded-[40px] overflow-hidden bg-[#0b0b0f] text-white text-center px-8 py-24">
          <MeshBg variant="dark" />
          <GridTexture dark />
          <div className="relative flex flex-col items-center">
            <WipeRevealText as="h2" delay={0.1} className="text-4xl md:text-7xl font-bold leading-[1.02] max-w-4xl mx-auto text-center">
              <span style={{ fontFamily: SERIF }}>Give your product <GradientText>a voice</GradientText> worth remembering.</span>
            </WipeRevealText>
            <WipeRevealText as="p" delay={0.2} className="mt-7 text-lg text-white/55 max-w-2xl mx-auto text-center">
              Join the builders creating, refining, and protecting synthetic voice on a single
              platform. Start free — no credit card required.
            </WipeRevealText>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={onRegister} className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold text-sm hover:scale-[1.03] transition-transform">
                Start building free <ArrowRight size={16} />
              </button>
              <CreditLinks dark />
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ─────────────────────────────  Footer  ───────────────────────────────── */

const Footer = () => {
  // Model attributions — credited here to respect their licenses.
  const credits = [
    "Kokoro-82M",
    "Coqui XTTS-v2",
    "Parler TTS",
    "Chatterbox Turbo",
    "Wav2Vec2",
    "AASIST",
    "RawNet2",
    "Pyannote.audio",
  ];
  const cols = [
    { title: "Platform", items: ["Vocaria Agent", "Vocaria Studio", "Generation Engine", "Vocaria Hub"] },
    { title: "Solutions", items: ["Voice Cloning", "Deepfake Detection", "Live Streaming", "API Reference"] },
    { title: "Company", items: ["About", "Pricing", "Privacy", "Contact"] },
  ];

  /* ── Refs for in-view detection ── */
  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const heroInView = useInView(heroRef, { once: true, amount: 0.2 });
  const gridInView = useInView(gridRef, { once: true, amount: 0.15 });
  const wordmarkInView = useInView(wordmarkRef, { once: true, amount: 0.3 });
  const barInView = useInView(barRef, { once: true, amount: 0.5 });

  return (
    <footer className="relative border-t border-white/10 bg-black text-white overflow-hidden">
      {/* ── Top: statement ── */}
      <div
        ref={heroRef}
        className="mx-auto max-w-[1400px] px-6 lg:px-10 pt-24 pb-16 grid grid-cols-12 gap-8"
      >
        <div className="col-span-12 md:col-span-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="font-mono text-white/40 mb-6 flex items-center gap-3 text-[11px] uppercase tracking-widest"
          >
            <Logo dark />
          </motion.div>
          <motion.h2
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={heroInView ? { clipPath: "inset(0 0% 0 0)" } : {}}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="text-4xl md:text-5xl lg:text-[64px] font-medium leading-[0.95] tracking-tight max-w-[20ch] text-[#FDFBF7]"
            style={{ fontFamily: SERIF }}
          >
            The complete voice layer for the modern internet — create, refine, distribute, and protect synthetic voice from one elegant platform.
          </motion.h2>
        </div>
        <div className="col-span-12 md:col-span-4 flex flex-col justify-end gap-4 mt-8 md:mt-0">
          <motion.a
            href="#"
            initial={{ opacity: 0, x: 30 }}
            animate={heroInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-full px-6 h-14 flex items-center justify-between gap-3 group bg-white/[0.05] border border-white/10 hover:bg-white hover:text-black transition-colors backdrop-blur-md"
          >
            <span className="font-mono text-xs uppercase tracking-widest font-semibold">VISIT PORTFOLIO</span>
            <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </motion.a>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={heroInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.55 }}
          >
            <a
              href="#"
              className="rounded-full px-6 h-14 flex items-center justify-between gap-3 group bg-white/[0.05] border border-white/10 hover:bg-white hover:text-black transition-colors backdrop-blur-md"
            >
              <span className="font-mono text-xs uppercase tracking-widest font-semibold flex items-center gap-2">
                <Sparkles size={14} /> AEXOTREX
              </span>
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </motion.div>
        </div>
      </div>

      {/* ── Meta grid ── */}
      <div
        ref={gridRef}
        className="mx-auto max-w-[1400px] px-6 lg:px-10 pb-16 grid grid-cols-2 md:grid-cols-5 gap-10 border-t border-white/10 pt-12"
      >
        {cols.map((c, colIdx) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 20 }}
            animate={gridInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 + colIdx * 0.1 }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff7242] mb-5 pb-2 border-b border-white/10">{c.title}</div>
            <ul className="space-y-2.5">
              {c.items.map((it, linkIdx) => (
                <li key={it}>
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={gridInView ? { opacity: 1, x: 0 } : {}}
                    transition={{
                      duration: 0.4,
                      delay: 0.2 + colIdx * 0.1 + linkIdx * 0.06,
                    }}
                  >
                    <a href="#" className="text-[15px] md:text-lg text-white/80 hover:text-white transition-colors">
                      {it}
                    </a>
                  </motion.div>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}

        {/* Model credits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={gridInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="col-span-2 md:col-span-2"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff7242] mb-5 pb-2 border-b border-white/10 flex items-center gap-2">
            <Cpu size={12} /> Powered by · open model credits
          </div>
          <div className="flex flex-wrap gap-2.5">
            {credits.map((c, i) => (
              <motion.span
                key={c}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={gridInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.45 + i * 0.04 }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-[11px] font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <CircleDot size={9} className="text-[#ff7242]" /> {c}
              </motion.span>
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={gridInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-6 text-xs text-white/40 leading-relaxed max-w-md"
          >
            Vocaria gratefully builds on the work of the open-source research community. All trademarks and model weights belong to their respective authors and are used in accordance with their licenses.
          </motion.p>
        </motion.div>
      </div>

      {/* ── Massive wordmark with character reveal ── */}
      <div ref={wordmarkRef} className="border-t border-white/10 overflow-hidden">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 pt-10 pb-2">
          <div 
            className="leading-[0.82] tracking-tighter select-none text-[clamp(80px,21vw,340px)] flex text-[#FDFBF7]"
            style={{ fontFamily: SERIF }}
          >
            {"Vocaria".split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={wordmarkInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: i * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {char}
              </motion.span>
            ))}
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={wordmarkInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.55, type: "spring", stiffness: 300 }}
              className="text-[#ff7242]"
            >
              .
            </motion.span>
          </div>
        </div>
      </div>

      {/* ── Bottom bar with subtle parallax ── */}
      <div ref={barRef} className="border-t border-white/10">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-6 flex flex-wrap items-center justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={barInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            © {new Date().getFullYear()} VOCARIA — ALL QUIET, ALL DELIBERATE.
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={barInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            N 47.37 · E 08.54 · EST 2026
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={barInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            BUILD · 0XB8A1 · V8.1.0
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

const MoveToTop = () => {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return scrollY.on("change", (latest) => {
      setVisible(latest > 400);
    });
  }, [scrollY]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-8 left-8 z-[999] p-3.5 rounded-full bg-black text-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] hover:scale-110 hover:bg-black transition-all border border-white/10"
        >
          <ArrowUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

/* ─────────────────────────────  Page  ─────────────────────────────────── */

export default function Landing() {
  const navigate = useNavigate();
  const toRegister = () => navigate("/register");
  const toLogin = () => navigate("/login");

  return (
    <div
      className="min-h-screen bg-[#FDFBF7] text-black antialiased selection:bg-black selection:text-white overflow-x-hidden"
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
    >
      <ScrollProgress />
      <MoveToTop />
      <Navbar onLogin={toLogin} onRegister={toRegister} />
      <Hero onRegister={toRegister} />
      <TrustBand />
      <PillarsOverview />
      <AgentDeepDive />
      <GenerationDeepDive />
      <FeaturedVoices />
      <CloningDeepDive />
      <DetectionDeepDive />
      <StudioStrip />
      <StatsBand />
      <Workflow />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA onRegister={toRegister} />
      <Footer />
    </div>
  );
}

