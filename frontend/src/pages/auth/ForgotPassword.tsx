import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Assumes redirecting to a reset password page after clicking the email link
    // The email link will be something like: site_url/#access_token=...&type=recovery
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    setLoading(false);
    
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans">
      
      {/* Left Panel - Image Area */}
      <div className="hidden lg:block lg:w-1/2 relative bg-black">
        <img 
          src="/voice_forgot_password.png" 
          alt="Secure Lock Voice" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
        
        {/* Overlay Content */}
        <div className="absolute top-0 left-0 w-full h-full p-12 lg:p-16 flex flex-col justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black font-bold text-xl shadow-lg">V</div>
             <span className="text-white font-bold text-xl tracking-tight shadow-sm">Vocaria AI</span>
          </div>
          <div>
            <h1 className="text-5xl font-bold text-white tracking-tight mb-4 leading-tight shadow-sm">
              Recover Access
            </h1>
            <p className="text-lg text-white/80 leading-relaxed max-w-md font-medium">
              Regain control of your proprietary voice models and workspaces securely.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Area */}
      <div className="w-full lg:w-1/2 relative flex flex-col px-8 sm:px-16 lg:px-24 animate-[fadeIn_0.8s_ease-out]">
        
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
            <span className="text-gray-500 mr-1">Remember your password?</span>
            <Link to="/login" className="text-black font-semibold hover:underline">Sign in</Link>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center max-w-[440px] w-full mx-auto py-6">
          
          {sent ? (
            <div className="flex flex-col items-center justify-center text-center space-y-6 animate-[fadeIn_0.8s_ease-out]">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-2">
                <Mail className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">Check your email</h2>
              <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-[320px]">
                We sent a secure password reset link to <span className="font-bold text-black">{email}</span>. Please click the link to choose a new password.
              </p>
              <Link to="/login" className="w-full py-4 mt-6 bg-black text-white rounded-full font-bold text-lg hover:bg-black/80 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2">
                <ArrowLeft size={20} />
                Return to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold tracking-tight mb-2">Forgot password?</h2>
              <p className="text-gray-500 font-medium mb-8">No worries, we'll send you reset instructions.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Email address
                  </label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-3.5 bg-white border border-gray-300 rounded-xl text-sm focus:border-black focus:ring-1 focus:ring-black transition-colors outline-none"
                    placeholder="name@company.com"
                  />
                </div>

                {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                {/* Submit Button */}
                <button 
                  type="submit" 
                  disabled={loading || !email}
                  className="w-full py-4 mt-2 bg-black text-white rounded-full font-bold text-lg hover:bg-black/80 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {loading && <Loader2 size={20} className="animate-spin" />}
                  Send reset link
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                <Link to="/login" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black transition-colors">
                  <ArrowLeft size={16} />
                  Back to sign in
                </Link>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
