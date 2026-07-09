import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { VocariaLogo } from '../../components/ui/VocariaLogo';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/start` },
    });
    if (error) setError(error.message);
  };

  const handleMagicLink = async () => {
    if (!email) return setError("Please enter an email for the magic link.");
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setLoading(false);
    if (error) setError(error.message);
    else alert("Magic link sent! Check your email.");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill in all fields.");
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      navigate('/start');
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white font-sans text-black selection:bg-black selection:text-white">

      {/* Left Panel - Image Area */}
      <div className="hidden lg:block lg:w-1/2 relative bg-black overflow-hidden">
        <motion.img
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2940&auto=format&fit=crop"
          alt="Voice Audio Visualizer"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>

        <div className="absolute top-0 left-0 w-full h-full p-12 lg:p-16 flex flex-col justify-between">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
              <VocariaLogo size={42} withText={true} textColor="white" className="shadow-sm" />
            </Link>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-6 max-w-sm"
          >
            <h1 className="text-5xl font-bold text-white tracking-tight mb-4 leading-tight shadow-sm">
              Welcome Back
            </h1>
            <p className="text-lg text-white/80 leading-relaxed max-w-md font-medium">
              Log in to continue building with the most advanced voice models.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full lg:w-1/2 relative flex flex-col px-8 sm:px-16 lg:px-24"
      >

        {/* Top Navigation */}
        <div className="absolute top-10 left-8 sm:left-10 w-[calc(100%-4rem)] sm:w-[calc(100%-5rem)] flex items-center justify-between z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back
          </button>

          <div className="hidden sm:flex items-center text-sm font-medium">
            <span className="text-gray-500 mr-1">New to Vocaria?</span>
            <Link to="/register" className="text-black font-semibold hover:underline">Sign up</Link>
          </div>
        </div>

        {/* Form Container */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="flex-1 flex flex-col justify-center max-w-[440px] w-full mx-auto py-12"
        >

          <motion.h2 
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            className="text-3xl font-bold tracking-tight mb-8"
          >
            Welcome Back
          </motion.h2>

          {/* Social Buttons */}
          <motion.div 
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            className="space-y-3 mb-8"
          >
            <button
              onClick={handleGoogle}
              className="w-full py-3.5 px-4 bg-white border border-gray-300 rounded-full font-medium text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09a6.97 6.97 0 010-4.18V7.07H2.18A11 11 0 001 12c0 1.78.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
              Continue with Google
            </button>
          </motion.div>

          {/* OR Divider */}
          <motion.div 
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            className="relative flex items-center mb-8"
          >
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                User name or email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                title="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-gray-300 rounded-xl text-sm focus:border-black focus:ring-1 focus:ring-black transition-colors outline-none"
              />
            </motion.div>

            {/* Password Field */}
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Your password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-black transition-colors"
                >
                  {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                  Hide
                </button>
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                title="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-gray-300 rounded-xl text-sm focus:border-black focus:ring-1 focus:ring-black transition-colors outline-none"
              />
            </motion.div>

            {/* Options */}
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-600 group-hover:text-black transition-colors">
                  Remember me
                </span>
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-gray-600 hover:text-black underline decoration-gray-300 hover:decoration-black transition-colors">
                Forget your password?
              </Link>
            </motion.div>

            {error && <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="text-sm text-red-500 font-medium">{error}</motion.p>}

            {/* Submit Button */}
            <motion.button
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 bg-black text-white rounded-full font-bold text-lg hover:bg-black/80 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading && <Loader2 size={20} className="animate-spin" />}
              Sign in
            </motion.button>
          </form>

          {/* Bottom mobile text */}
          <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="mt-8 text-center text-sm font-medium sm:hidden">
            <span className="text-gray-500">Don't have an account?</span>{' '}
            <Link to="/register" className="text-black hover:underline">Sign up</Link>
          </motion.p>

        </motion.div>
      </motion.div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
