import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { VocariaLogo } from '../../components/ui/VocariaLogo';

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);

  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  useEffect(() => {
    // Listen for auth state changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session && isEmailSent) {
        setVerificationSuccess(true);
        setTimeout(() => { navigate('/start'); }, 1500);
      }
    });

    // Also check session when window regains focus (in case they confirmed in another tab)
    const handleFocus = async () => {
      if (isEmailSent) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setVerificationSuccess(true);
          setTimeout(() => { navigate('/start'); }, 1500);
        }
      }
    };
    window.addEventListener('focus', handleFocus);

    // Fallback: Actively poll the session every 2 seconds while on the OTP screen.
    // This perfectly catches when the user confirms in another tab, even without them focusing this tab!
    let pollInterval: NodeJS.Timeout;
    if (isEmailSent) {
      pollInterval = setInterval(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setVerificationSuccess(true);
          clearInterval(pollInterval);
          setTimeout(() => { navigate('/start'); }, 1500);
        }
      }, 2000);
    }

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isEmailSent, navigate]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError('');

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup'
    });

    if (error) {
      // Check if they are actually already logged in (e.g. they clicked the link in another tab)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setVerifying(false);
        setVerificationSuccess(true);
        setTimeout(() => { navigate('/start'); }, 1500);
        return;
      }

      setVerifying(false);
      setError(error.message);
    } else {
      setVerifying(false);
      setVerificationSuccess(true);
      setTimeout(() => {
        navigate('/start');
      }, 1500);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      // Gracefully handle rate limits for resending as well
      if (error.message.toLowerCase().includes('rate')) {
        setError('A new code has been sent to your email.');
      } else {
        setError(error.message);
      }
    } else {
      setError('A new code has been sent to your email.');
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/start` },
    });
    if (error) setError(error.message);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return setError("Please fill in required fields.");
    if (!termsAccepted) return setError("You must accept the terms of use.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    setLoading(false);

    if (error) {
      console.error("Supabase Auth Error:", error.message);
      setError(error.message);
    } else {
      if (data.session) {
        navigate('/start');
      } else {
        setIsEmailSent(true);
      }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden w-full bg-white font-sans text-black selection:bg-black selection:text-white">

      {/* Left Panel - Image Area */}
      <div className="hidden lg:block lg:w-1/2 relative bg-black overflow-hidden">
        <motion.img
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2940&auto=format&fit=crop"
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
              The future of voice
            </h1>
            <p className="text-lg text-white/80 leading-relaxed max-w-md font-medium">
              Create, synthesize, and control voices with unparalleled realism and emotion.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
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
            <span className="text-gray-500 mr-1">Already have an account?</span>
            <Link to="/login" className="text-black font-semibold hover:underline">Sign in</Link>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center max-w-[440px] w-full mx-auto py-6">

          {verificationSuccess ? (
            <div className="flex flex-col items-center justify-center text-center space-y-6 animate-[fadeIn_0.5s_ease-out]">
              <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center mb-2 animate-[scaleIn_0.5s_ease-out]">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Verified Successfully</h2>
                <p className="text-gray-500 font-medium text-lg">Preparing your workspace...</p>
              </div>
            </div>
          ) : isEmailSent ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 animate-[fadeIn_0.8s_ease-out] w-full max-w-sm mx-auto">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                <Mail className="w-8 h-8 text-black" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">Check your email</h2>
              <p className="text-gray-500 text-sm font-medium leading-relaxed mb-4">
                We sent a verification code to <br /> <span className="font-bold text-black">{email}</span>.
              </p>

              <form onSubmit={handleVerifyOtp} className="w-full">
                <input
                  type="text"
                  placeholder="Enter verification code"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-center text-2xl font-bold tracking-[0.25em] focus:border-black focus:ring-1 focus:ring-black transition-colors outline-none mb-4 placeholder:tracking-normal placeholder:font-medium placeholder:text-gray-400 placeholder:text-lg"
                />

                {error && <p className="text-sm text-red-500 font-medium mb-4">{error}</p>}

                <button
                  type="submit"
                  disabled={verifying || otp.length < 6}
                  className="w-full py-4 bg-black text-white rounded-full font-bold text-lg hover:bg-black/80 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {verifying ? <Loader2 size={20} className="animate-spin" /> : 'Verify Code'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 w-full flex flex-col items-center gap-4">
                <button
                  onClick={handleResendOtp}
                  className="text-sm font-bold text-black hover:underline"
                >
                  Didn't receive a code? Resend OTP
                </button>
                <p className="text-xs text-gray-400 font-medium text-center">Or click the confirmation link in the email to automatically proceed.</p>
              </div>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              className="w-full"
            >
              <motion.h2
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                className="text-3xl font-bold tracking-tight mb-6"
              >
                Sign up now
              </motion.h2>

              {/* Social Buttons */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                className="space-y-3 mb-6"
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
                className="relative flex items-center mb-6"
              >
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Or</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </motion.div>

              <form onSubmit={handleRegister} className="space-y-4">

                {/* Full Name Field */}
                <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Your Name"
                    title="Full Name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-gray-300 rounded-xl text-sm focus:border-black focus:ring-1 focus:ring-black transition-colors outline-none"
                  />
                </motion.div>

                {/* Email Field */}
                <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                  <label htmlFor="email" className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Email address
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
                      Password
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
                  <p className="text-xs text-gray-400 mt-2 font-medium">Use 8 or more characters with a mix of letters, numbers & symbols</p>
                </motion.div>

                {/* Checkboxes */}
                <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="pt-1">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="peer appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-black checked:border-black transition-colors cursor-pointer"
                      />
                      <svg className="absolute w-2.5 h-2.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-xs text-gray-600 font-medium leading-relaxed">
                      By creating an account, I agree to our <a href="#" className="font-bold underline text-black hover:text-gray-700">Terms of use</a> and <a href="#" className="font-bold underline text-black hover:text-gray-700">Privacy Policy</a>
                    </span>
                  </label>
                </motion.div>

                {error && <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="text-sm text-red-500 font-medium">{error}</motion.p>}

                {/* Submit Button */}
                <motion.button
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-black text-white rounded-full font-bold text-lg hover:bg-black/80 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {loading && <Loader2 size={20} className="animate-spin" />}
                  Sign up
                </motion.button>
              </form>

              {/* Bottom mobile text */}
              <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="mt-8 text-center text-sm font-medium sm:hidden">
                <span className="text-gray-500">Already have an account?</span>{' '}
                <Link to="/login" className="text-black hover:underline">Sign in</Link>
              </motion.p>
            </motion.div>
          )}

        </div>
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
