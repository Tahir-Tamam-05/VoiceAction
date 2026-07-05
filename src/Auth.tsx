import React, { useState } from 'react';
import { Screen } from './types';
import { Smartphone, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { auth, isFirebaseConfigured } from './config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { notifications } from './features/notifications/notificationService';


export const SignInScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const { login, signup, signInWithGoogle } = useAuth();

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email above, then tap Forgot Password.');
      return;
    }
    if (!isFirebaseConfigured || !auth) {
      notifications.info('Password reset requires Firebase to be configured.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Could not send reset email. Check the address and try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      setScreen('home');
    } catch (err: any) {
      setError(err.message || 'Google Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isSignUp) {
        await signup(name, email, password);
      } else {
        await login(email, password);
      }
      setScreen('home');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col pt-12">
      <header className="fixed top-0 w-full z-50 h-16 flex items-center px-6 bg-surface/80 backdrop-blur-md border-b border-primary/5">
        <button onClick={() => setScreen('landing')} className="text-primary hover:opacity-80 transition-opacity">
          <ArrowLeft size={24} />
        </button>
        <h1 className="ml-4 text-lg font-headline font-bold tracking-[0.15em] text-on-surface uppercase">VOICEACTION</h1>
      </header>

      <main className="flex-grow pt-24 pb-32 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="bg-surface-low p-8 md:p-12 rounded-2xl border border-primary/10 shadow-[0_0_60px_rgba(255,145,83,0.03)]">
            <div className="text-center mb-10">
              <h2 className="font-headline font-bold text-3xl text-on-surface tracking-[0.1em] mb-3 uppercase">VOICEACTION</h2>
              <p className="text-on-surface/60 text-[11px] font-bold tracking-[0.2em] uppercase">Capture thoughts. Build knowledge.</p>
            </div>

            <div className="bg-surface-highest p-1 rounded-full flex gap-1 mb-10 border border-primary/5">
              <button 
                onClick={() => setIsSignUp(false)}
                className={`flex-1 py-2.5 px-4 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${!isSignUp ? 'bg-primary/10 text-primary' : 'text-on-surface/40'}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => setIsSignUp(true)}
                className={`flex-1 py-2.5 px-4 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${isSignUp ? 'bg-primary/10 text-primary' : 'text-on-surface/40'}`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            {resetSent && (
              <div className="mb-6 p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary text-[10px] font-bold uppercase tracking-widest text-center">
                Reset link sent — check your email.
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {isSignUp && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface/40 px-1">Full Name</label>
                  <input
                    className="w-full bg-surface-low border border-primary/10 rounded-xl px-4 py-3.5 text-on-surface font-medium focus:ring-1 focus:ring-primary/40 outline-none transition-all placeholder:text-on-surface/30 text-sm"
                    placeholder="Jane Smith"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required={isSignUp}
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface/40 px-1">Email</label>
                <input
                  className="w-full bg-surface-low border border-primary/10 rounded-xl px-4 py-3.5 text-on-surface font-medium focus:ring-1 focus:ring-primary/40 outline-none transition-all placeholder:text-on-surface/30 text-sm"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between px-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface/40">Password</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  className="w-full bg-surface-low border border-primary/10 rounded-xl px-4 py-3.5 text-on-surface font-medium focus:ring-1 focus:ring-primary/40 outline-none transition-all placeholder:text-on-surface/30 text-sm"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary text-black font-headline font-bold text-sm tracking-widest uppercase rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>
            </form>

            <div className="relative my-10 flex items-center">
              <div className="flex-grow border-t border-primary/5" />
              <span className="px-4 text-[10px] font-bold uppercase tracking-widest text-on-surface/20">or</span>
              <div className="flex-grow border-t border-primary/5" />
            </div>

            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-surface-highest border border-primary/10 hover:bg-surface-high transition-colors text-on-surface/60 font-bold text-[12px] uppercase tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Smartphone size={18} />
              Sign in with Google
            </button>
          </div>

          <p className="mt-10 text-center text-on-surface/30 text-[9px] font-bold tracking-widest leading-relaxed max-w-xs mx-auto px-4 uppercase">
            By continuing you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </main>

      <footer className="mt-auto w-full px-8 py-8 flex flex-col items-center gap-6">
        <div className="font-bold text-[9px] tracking-[0.2em] uppercase text-on-surface/40">
          © 2026 VOICEACTION.
        </div>
        <div className="flex gap-8">
          {(['Privacy', 'Terms', 'Support'] as const).map(link => (
            <button
              key={link}
              type="button"
              onClick={() => notifications.info(`${link} page coming soon.`)}
              className="font-bold text-[9px] tracking-[0.2em] uppercase text-on-surface/40 hover:text-primary transition-all"
            >
              {link}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
};
