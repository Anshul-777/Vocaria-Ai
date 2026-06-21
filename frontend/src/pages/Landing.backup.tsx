import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, Waves, Sparkles, Zap, Shield, Globe, 
  ChevronRight, PlayCircle, ArrowRight,
  Cpu, Check, X, Plus
} from 'lucide-react';

const GlowingBadge = ({ text }: { text: string }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F5F5] border border-[#E5E5E5] text-[#000000] text-xs font-semibold uppercase tracking-wider shadow-sm transition-transform hover:scale-105 cursor-default">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black/40 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
    </span>
    {text}
  </div>
);

const ButtonPrimary = ({ children, onClick, className = '' }: { children: React.ReactNode, onClick?: () => void, className?: string }) => (
  <button 
    onClick={onClick}
    className={`group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-black text-white font-semibold rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-1 ${className}`}
  >
    {children}
    <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
  </button>
);

const ButtonSecondary = ({ children, onClick, className = '' }: { children: React.ReactNode, onClick?: () => void, className?: string }) => (
  <button 
    onClick={onClick}
    className={`group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border border-[#E5E5E5] text-black font-semibold rounded-2xl shadow-sm hover:shadow-md hover:border-black transition-all duration-300 hover:-translate-y-0.5 ${className}`}
  >
    {children}
  </button>
);

const Navbar = ({ onLogin, onRegister }: { onLogin: () => void, onRegister: () => void }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-[#F0F0F0] shadow-sm py-4' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
          <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white shadow-lg shadow-black/10 group-hover:scale-105 transition-transform duration-300">
            <span className="font-bold text-xl">V</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-black">Vocaria AI<span className="text-black/30">.</span></span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-black/60">
          <a href="#features" className="hover:text-black transition-colors">Features</a>
          <a href="#demo" className="hover:text-black transition-colors">Listen</a>
          <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-black transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-4">
          <button onClick={onLogin} className="text-sm font-bold text-black/70 hover:text-black transition-colors hidden sm:block">
            Log in
          </button>
          <button 
            onClick={onRegister}
            className="px-5 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-black/80 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
          >
            Start Free Trial
          </button>
        </div>
      </div>
    </header>
  );
};

const Hero = ({ onRegister }: { onRegister: () => void }) => {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
      <div className="absolute top-0 inset-x-0 h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-black/[0.02] blur-3xl"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-black/[0.03] blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
        <div className="animate-[fadeSlideUp_0.8s_ease]">
          <GlowingBadge text="Voice Engine v2.0 Now Live" />
        </div>
        
        <h1 className="mt-8 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-black max-w-4xl leading-[1.1] animate-[fadeSlideUp_1s_ease]">
          Craft human-like voices with <span className="text-black/40 italic">unprecedented</span> realism.
        </h1>
        
        <p className="mt-6 text-xl text-black/60 max-w-2xl animate-[fadeSlideUp_1.2s_ease]">
          The most advanced AI voice generation platform. Clone, synthesize, and manipulate audio with emotional depth and perfect cadence in seconds.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 animate-[fadeSlideUp_1.4s_ease]">
          <ButtonPrimary onClick={onRegister}>
            Start Creating Free
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </ButtonPrimary>
          <ButtonSecondary>
            <PlayCircle size={18} />
            Hear the Demo
          </ButtonSecondary>
        </div>

        <div className="mt-16 w-full max-w-5xl relative animate-[fadeSlideUp_1.6s_ease]">
          <div className="absolute -inset-1 bg-black rounded-2xl blur opacity-[0.08]"></div>
          <div className="relative rounded-2xl bg-white border border-[#E5E5E5] shadow-2xl overflow-hidden p-2">
            <div className="rounded-xl bg-[#F8F8F8] border border-[#EEEEEE] h-64 md:h-[400px] flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                <Waves size={200} strokeWidth={0.5} className="text-black animate-pulse" />
              </div>
              <button className="relative z-10 w-20 h-20 bg-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center text-black hover:scale-110 hover:bg-black hover:text-white transition-all duration-300">
                <PlayCircle size={40} className="ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const EngineSpheres = () => {
  return (
    <section className="py-32 bg-[#050505] relative overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzExMTExMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
      
      <div className="text-center mb-24 relative z-10 px-6">
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">Powered by neural engines.</h2>
        <p className="text-base md:text-lg text-white/60 max-w-2xl mx-auto">Four distinct, highly specialized models optimized for every possible audio generation use case.</p>
      </div>
      
      <div className="flex flex-wrap justify-center gap-12 md:gap-24 items-center relative z-10 max-w-7xl mx-auto px-6">
        
        {/* Sphere 1: Blue/Cyan (Cloning) */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full shadow-[0_0_100px_rgba(56,189,248,0.4)] bg-gradient-to-br from-[#00ffff] via-[#0055ff] to-[#000033] flex items-center justify-center overflow-hidden transition-transform duration-700 hover:scale-110 cursor-crosshair">
            <div className="absolute inset-0 rounded-full border border-white/20"></div>
            <div className="absolute top-[10%] left-[20%] w-[60%] h-[30%] bg-white/40 rounded-full blur-[10px] transform -rotate-12"></div>
            {/* Internal soundwave abstract */}
            <div className="flex gap-1.5 items-center justify-center w-full opacity-80 z-10">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-1.5 bg-white rounded-full animate-[wave_1.5s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.1}s`, height: `${Math.random() * 60 + 20}px` }}></div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
          <span className="text-white font-bold tracking-widest uppercase text-sm">V1 - Clone</span>
        </div>

        {/* Sphere 2: Deep Purple/Blue (TTS) */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full shadow-[0_0_100px_rgba(99,102,241,0.5)] bg-gradient-to-br from-[#6366f1] via-[#3b0764] to-[#000000] flex items-center justify-center overflow-hidden transition-transform duration-700 hover:scale-110 cursor-crosshair">
             <div className="absolute inset-0 rounded-full border border-white/20"></div>
             <div className="absolute top-[15%] right-[20%] w-[50%] h-[40%] bg-white/30 rounded-full blur-[12px] transform rotate-12"></div>
             {/* Glowing core */}
             <div className="w-[80%] h-12 bg-blue-300/40 rounded-full blur-md animate-[pulse_2s_ease-in-out_infinite] z-10"></div>
             <div className="absolute w-full h-1 bg-white/80 blur-[1px] rounded-full top-1/2 -translate-y-1/2 z-20 shadow-[0_0_20px_white]"></div>
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_40%,rgba(0,0,0,0.8))]"></div>
          </div>
          <span className="text-white font-bold tracking-widest uppercase text-sm">V2 - Synthesis</span>
        </div>

        {/* Sphere 3: Pink/Red (Emotional) */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full shadow-[0_0_100px_rgba(244,63,94,0.4)] bg-gradient-to-br from-[#fb7185] via-[#be123c] to-[#290000] flex items-center justify-center overflow-hidden transition-transform duration-700 hover:scale-110 cursor-crosshair">
            <div className="absolute inset-0 rounded-full border border-white/20"></div>
            <div className="absolute top-[5%] left-[30%] w-[40%] h-[30%] bg-white/30 rounded-full blur-[8px]"></div>
            {/* Organic moving core */}
            <div className="absolute inset-0 flex items-center justify-center mix-blend-screen opacity-80 z-10">
              <div className="w-16 h-16 bg-rose-200 rounded-full shadow-[0_0_50px_#fff] blur-[4px] animate-[ping_3s_ease-in-out_infinite]"></div>
            </div>
            <div className="w-24 h-24 border border-rose-300/30 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] animate-[spin-slow_4s_linear_infinite] z-20"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
          </div>
          <span className="text-white font-bold tracking-widest uppercase text-sm">V3 - Emotion</span>
        </div>

        {/* Sphere 4: Copper/Gold (Multilingual) */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full shadow-[0_0_100px_rgba(217,119,6,0.3)] bg-gradient-to-br from-[#fcd34d] via-[#d97706] to-[#451a03] flex items-center justify-center overflow-hidden transition-transform duration-700 hover:scale-110 cursor-crosshair">
             <div className="absolute inset-0 rounded-full border border-white/20"></div>
             <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] bg-white/40 rounded-full blur-[10px]"></div>
             {/* Abstract eye/core pattern */}
             <div className="w-24 h-24 border-[4px] border-black/40 rounded-full flex items-center justify-center z-10 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
               <div className="w-10 h-10 bg-black rounded-full shadow-[0_0_30px_#fcd34d]"></div>
             </div>
             {/* Radial lines */}
             <div className="absolute inset-0 border-[24px] border-dashed border-black/30 rounded-full animate-spin-slow mix-blend-overlay"></div>
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_50%,rgba(0,0,0,0.6))]"></div>
          </div>
          <span className="text-white font-bold tracking-widest uppercase text-sm">V4 - Polyglot</span>
        </div>

      </div>
    </section>
  );
};

const AdvancedFeatures = () => {
  return (
    <section id="features" className="py-32 bg-white relative overflow-hidden border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-black leading-[1.1] mb-8">
            Manage your AI voice models in real-time
          </h2>
          <p className="text-lg text-black/60 mb-12 leading-relaxed max-w-xl">
            Streamline your audio workflow with our collaborative dashboard. Monitor voice generations, organize custom clones, and deploy studio-grade synthetic speech instantly.
          </p>
          <div className="inline-flex items-center gap-10 px-10 py-8 rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#faf5ff] to-[#fff7ed] border border-gray-100 shadow-sm">
            <div>
              <div className="text-3xl font-extrabold text-black mb-1">12K+</div>
              <div className="text-xs font-bold uppercase tracking-widest text-black/40">Voices Cloned</div>
            </div>
            <div className="w-px h-12 bg-black/10"></div>
            <div>
              <div className="text-3xl font-extrabold text-black mb-1">1947</div>
              <div className="text-xs font-bold uppercase tracking-widest text-black/40">Studios Joined</div>
            </div>
          </div>
        </div>

        {/* Floating Window UI */}
        <div className="relative">
          <div className="absolute inset-0 bg-gray-100 rounded-[3rem] -z-10 scale-105 translate-y-4"></div>
          <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden transform hover:-translate-y-2 transition-transform duration-500">
            {/* Window header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50 bg-gray-50/50">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            
            <div className="p-8">
              <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-black/40 mb-8">Generation Queue</div>
              <div className="space-y-8">
                {[
                  { label: "Synthesize narration for Nike ad", date: "Dec 19, 2026", time: "10:45 AM", avatars: ["bg-blue-200", "bg-rose-200", "bg-amber-200"] },
                  { label: "Train custom clone V3", date: "Dec 08, 2026", time: "4:10 PM", avatars: ["bg-emerald-200", "bg-purple-200"] },
                  { label: "Translate NPC dialogue to Spanish", date: "Dec 04, 2026", time: "3:35 PM", avatars: ["bg-cyan-200"] },
                  { label: "Fine-tune emotional inflections", date: "Nov 27, 2026", time: "11:10 AM", avatars: ["bg-indigo-200", "bg-pink-200"] }
                ].map((task, i) => (
                  <div key={i} className="flex items-start justify-between group cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="w-5 h-5 rounded border-2 border-gray-200 mt-0.5 group-hover:border-blue-500 transition-colors"></div>
                      <div>
                        <div className="font-bold text-black mb-1">{task.label}</div>
                        <div className="text-sm font-medium text-black/40">{task.date} &nbsp; {task.time}</div>
                      </div>
                    </div>
                    <div className="flex -space-x-2">
                      {task.avatars.map((color, j) => (
                        <div key={j} className={`w-8 h-8 rounded-full border-2 border-white ${color} shadow-sm`}></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-32 bg-[#FAFAFA] relative border-t border-[#F0F0F0]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20 relative">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-black tracking-tight mb-6">
            Powerful features for<br/>
            <span className="text-[#3b82f6]">powerful creators</span>
          </h2>
          <p className="text-base md:text-lg text-black/60 mb-10 font-medium">Choose a plan that's right for your audio needs</p>
          
          <div className="flex items-center justify-center gap-4 text-sm font-bold relative inline-flex">
            <span className={!isYearly ? "text-black" : "text-black/40"}>Pay Monthly</span>
            <button 
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-14 h-7 rounded-full bg-gray-200 transition-colors duration-300"
            >
              <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${isYearly ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </button>
            <span className={isYearly ? "text-black" : "text-black/40"}>Pay Yearly</span>
            
            {/* Hand drawn arrow for save 25% */}
            <div className="absolute -right-32 -top-6 text-[#3b82f6] font-bold hidden md:flex items-center gap-2">
              <svg width="60" height="40" viewBox="0 0 60 40" fill="none" className="transform rotate-12">
                <path d="M58 20 C 40 40, 20 0, 2 20 M2 20 L 10 12 M2 20 L 10 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Save 25%
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
          {/* Freebie */}
          <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold mb-3 text-black">Freebie</h3>
            <p className="text-sm text-black/50 mb-8 font-medium leading-relaxed">Ideal for developers needing quick access to basic voice generation.</p>
            <div className="mb-8">
              <span className="text-5xl font-extrabold text-black">$0</span>
              <span className="text-black/40 text-sm font-bold ml-1">/ Month</span>
            </div>
            <button className="w-full py-4 rounded-xl border-2 border-[#3b82f6] text-[#3b82f6] font-bold mb-10 hover:bg-blue-50 transition-colors">
              Get Started Now
            </button>
            <ul className="space-y-5 text-sm font-bold text-black/70">
              <li className="flex items-center gap-3"><div className="bg-blue-50 p-1 rounded-full"><Check size={14} className="text-[#3b82f6]" /></div> 20,000 credits / month</li>
              <li className="flex items-center gap-3"><div className="bg-blue-50 p-1 rounded-full"><Check size={14} className="text-[#3b82f6]" /></div> Access to 5 standard voices</li>
              <li className="flex items-center gap-3 text-black/30"><div className="bg-gray-50 p-1 rounded-full"><X size={14} className="text-black/30" /></div> Upload custom voices</li>
              <li className="flex items-center gap-3 text-black/30"><div className="bg-gray-50 p-1 rounded-full"><X size={14} className="text-black/30" /></div> Unlimited Sharing</li>
              <li className="flex items-center gap-3 text-black/30"><div className="bg-gray-50 p-1 rounded-full"><X size={14} className="text-black/30" /></div> Commercial rights</li>
            </ul>
          </div>

          {/* Professional */}
          <div className="bg-[#2563eb] rounded-[2.5rem] p-12 shadow-2xl text-white transform md:scale-105 z-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Sparkles size={100} />
            </div>
            <h3 className="text-xl font-bold mb-3 relative z-10">Professional</h3>
            <p className="text-sm text-white/70 mb-8 font-medium leading-relaxed relative z-10">Ideal for creators needing advanced synthesis tools for client work.</p>
            <div className="mb-8 relative z-10">
              <span className="text-6xl font-extrabold">${isYearly ? '19' : '25'}</span>
              <span className="text-white/60 text-sm font-bold ml-1">/ Month</span>
            </div>
            <button className="w-full py-4 rounded-xl bg-white text-[#2563eb] font-bold mb-10 hover:shadow-lg transition-shadow relative z-10">
              Get Started Now
            </button>
            <ul className="space-y-5 text-sm font-bold relative z-10">
               <li className="flex items-center gap-3"><div className="bg-white/20 p-1 rounded-full"><Check size={14} className="text-white" /></div> 200,000 credits / month</li>
               <li className="flex items-center gap-3"><div className="bg-white/20 p-1 rounded-full"><Check size={14} className="text-white" /></div> Access to 500+ premium voices</li>
               <li className="flex items-center gap-3"><div className="bg-white/20 p-1 rounded-full"><Check size={14} className="text-white" /></div> Upload custom voices (5 slots)</li>
               <li className="flex items-center gap-3"><div className="bg-white/20 p-1 rounded-full"><Check size={14} className="text-white" /></div> Unlimited Sharing</li>
               <li className="flex items-center gap-3"><div className="bg-white/20 p-1 rounded-full"><Check size={14} className="text-white" /></div> Full Commercial rights</li>
            </ul>
          </div>

          {/* Enterprise */}
          <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold mb-3 text-black">Enterprise</h3>
            <p className="text-sm text-black/50 mb-8 font-medium leading-relaxed">Ideal for studios needing massive API scale and custom model training.</p>
            <div className="mb-8">
              <span className="text-5xl font-extrabold text-black">${isYearly ? '75' : '100'}</span>
              <span className="text-black/40 text-sm font-bold ml-1">/ Month</span>
            </div>
            <button className="w-full py-4 rounded-xl border-2 border-[#3b82f6] text-[#3b82f6] font-bold mb-10 hover:bg-blue-50 transition-colors">
              Get Started Now
            </button>
            <ul className="space-y-5 text-sm font-bold text-black/70">
              <li className="flex items-center gap-3"><div className="bg-blue-50 p-1 rounded-full"><Check size={14} className="text-blue-500" /></div> Unlimited credits</li>
              <li className="flex items-center gap-3"><div className="bg-blue-50 p-1 rounded-full"><Check size={14} className="text-blue-500" /></div> Access to all voice models</li>
              <li className="flex items-center gap-3"><div className="bg-blue-50 p-1 rounded-full"><Check size={14} className="text-blue-500" /></div> Upload custom icons and fonts</li>
              <li className="flex items-center gap-3"><div className="bg-blue-50 p-1 rounded-full"><Check size={14} className="text-blue-500" /></div> Unlimited Sharing</li>
              <li className="flex items-center gap-3"><div className="bg-blue-50 p-1 rounded-full"><Check size={14} className="text-blue-500" /></div> Advanced security & SSO</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

const FAQ = () => {
  return (
    <section id="faq" className="py-24 bg-white relative">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-8">
          {[
            { q: "How much audio is needed to clone a voice?", a: "Our proprietary zero-shot model requires only 3 to 5 seconds of clean, background-noise-free audio to generate a high-fidelity clone of any speaker." },
            { q: "Can I use generated audio commercially?", a: "Yes, users on our Professional and Enterprise tiers retain full commercial rights to all audio generated on our platform." },
            { q: "Is my data secure?", a: "Absolutely. We are SOC2 compliant and employ end-to-end encryption. Your voice data is never used to train our base models without explicit opt-in." },
            { q: "What languages do you support?", a: "We currently support over 40 languages and dialects, with seamless cross-lingual voice cloning capabilities." }
          ].map((item, i) => (
             <div key={i} className="border-b border-gray-100 pb-8">
               <h4 className="text-xl font-bold text-black mb-3">{item.q}</h4>
               <p className="text-black/60 font-medium leading-relaxed">{item.a}</p>
             </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const Footer = () => {
  return (
    <footer className="bg-[#FAFAFA] border-t border-[#F0F0F0] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white">
                <span className="font-bold text-xl">V</span>
              </div>
              <span className="font-bold text-2xl text-black tracking-tight">Vocaria AI<span className="text-black/30">.</span></span>
            </div>
            <p className="text-black/50 text-base max-w-sm leading-relaxed font-medium">
              Redefining synthetic speech. The platform for developers and creators to generate, clone, and manipulate voices with unparalleled realism.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-black mb-6 uppercase tracking-wider text-sm">Product</h4>
            <ul className="space-y-4 text-sm font-medium text-black/50">
              <li><a href="#" className="hover:text-black transition-colors">Text to Speech</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Voice Cloning</a></li>
              <li><a href="#" className="hover:text-black transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-black mb-6 uppercase tracking-wider text-sm">Resources</h4>
            <ul className="space-y-4 text-sm font-medium text-black/50">
              <li><a href="#" className="hover:text-black transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Guides & Tutorials</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Community Discord</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-black mb-6 uppercase tracking-wider text-sm">Company</h4>
            <ul className="space-y-4 text-sm font-medium text-black/50">
              <li><a href="#" className="hover:text-black transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#F0F0F0] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-black/40 text-sm font-bold">© {new Date().getFullYear()} Vocaria AI Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black/40 hover:bg-black hover:text-white cursor-pointer transition-colors font-bold">X</div>
            <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black/40 hover:bg-black hover:text-white cursor-pointer transition-colors font-bold">in</div>
            <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black/40 hover:bg-black hover:text-white cursor-pointer transition-colors font-bold">GH</div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans text-black selection:bg-black selection:text-white scroll-smooth">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>

      <Navbar 
        onLogin={() => navigate('/login')} 
        onRegister={() => navigate('/register')} 
      />
      
      <main>
        <Hero onRegister={() => navigate('/register')} />
        <EngineSpheres />
        <AdvancedFeatures />
        <Pricing />
        <FAQ />
      </main>

      <Footer />
    </div>
  );
}
