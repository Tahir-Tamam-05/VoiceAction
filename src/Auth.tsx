import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Screen } from './types';
import { Mic, CheckCircle2, Lightbulb, Calendar, Smartphone, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from './hooks/useAuth';

export const LandingScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="text-center z-10">
        <h1 className="text-6xl font-headline font-extrabold text-on-surface tracking-tighter mb-4">VoiceAction</h1>
        <p className="text-primary font-bold tracking-[0.2em] uppercase mb-16">Speak. Capture. Act.</p>
      </div>

      {/* Central Orb */}
      <div className="relative mb-24 z-10">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-orange-800 flex items-center justify-center glow-strong">
          <Mic size={40} className="text-black" fill="currentColor" />
        </div>
        
        {/* Floating Icons */}
        <div className="absolute -top-12 -left-12 w-16 h-16 bg-surface-low rounded-xl flex items-center justify-center glow-medium ghost-border rotate-[-12deg]">
          <CheckCircle2 size={24} className="text-primary" />
          <span className="absolute bottom-2 text-[8px] font-bold uppercase tracking-widest text-primary">Task</span>
        </div>
        <div className="absolute -bottom-8 left-0 w-20 h-20 bg-surface-low rounded-xl flex items-center justify-center glow-medium ghost-border">
          <Calendar size={28} className="text-primary" />
          <span className="absolute bottom-2 text-[8px] font-bold uppercase tracking-widest text-primary">Event</span>
        </div>
        <div className="absolute top-4 -right-16 w-18 h-18 bg-surface-low rounded-xl flex items-center justify-center glow-medium ghost-border rotate-[8deg]">
          <Lightbulb size={24} className="text-primary" />
          <span className="absolute bottom-2 text-[8px] font-bold uppercase tracking-widest text-primary">Idea</span>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4 z-10">
        <button 
          onClick={() => setScreen('signin')}
          className="w-full py-4 bg-primary text-black font-bold rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.4)] active:scale-95 transition-transform uppercase tracking-widest text-xs"
        >
          Get Started
        </button>
        <button 
          onClick={() => setScreen('signin')}
          className="w-full py-4 bg-transparent border border-primary/40 text-primary font-bold rounded-xl active:scale-95 transition-transform uppercase tracking-widest text-xs"
        >
          Sign In
        </button>
      </div>

      <p className="mt-8 text-[10px] font-bold text-text-secondary uppercase tracking-widest z-10">
        Built for focus. Privacy first.
      </p>
    </div>
  );
};

export const SignInScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup } = useAuth();

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
    } catch (err) {
      setError('Authentication failed. Please check your credentials.');
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
              <p className="text-on-surface/60 text-[11px] font-bold tracking-[0.2em] uppercase">Editorial Intelligence Platform</p>
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

            <form className="space-y-6" onSubmit={handleSubmit}>
              {isSignUp && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface/40 px-1">Full Name</label>
                  <input 
                    className="w-full bg-surface-low border border-primary/10 rounded-xl px-4 py-3.5 text-on-surface font-medium focus:ring-1 focus:ring-primary/40 outline-none transition-all placeholder:text-on-surface/30 text-sm" 
                    placeholder="John Doe" 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required={isSignUp}
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface/40 px-1">Identity (Email)</label>
                <input 
                  className="w-full bg-surface-low border border-primary/10 rounded-xl px-4 py-3.5 text-on-surface font-medium focus:ring-1 focus:ring-primary/40 outline-none transition-all placeholder:text-on-surface/30 text-sm" 
                  placeholder="name@intel.com" 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between px-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface/40">Access Code</label>
                  <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">Forgot?</a>
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

            <button className="w-full bg-surface-highest border border-primary/10 hover:bg-surface-high transition-colors text-on-surface/60 font-bold text-[12px] uppercase tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-3">
              <Smartphone size={18} />
              Sign in with Phone
            </button>
          </div>

          <p className="mt-10 text-center text-on-surface/30 text-[9px] font-bold tracking-widest leading-relaxed max-w-xs mx-auto px-4 uppercase">
            Restricted to authorized staff. All activity monitored.
          </p>
        </div>
      </main>

      <footer className="mt-auto w-full px-8 py-8 flex flex-col items-center gap-6">
        <div className="font-bold text-[9px] tracking-[0.2em] uppercase text-on-surface/40">
          © 2024 VOICEACTION. EDITORIAL INTELLIGENCE.
        </div>
        <div className="flex gap-8">
          {['Privacy', 'Terms', 'Support'].map(link => (
            <a key={link} href="#" className="font-bold text-[9px] tracking-[0.2em] uppercase text-on-surface/40 hover:text-primary transition-all">{link}</a>
          ))}
        </div>
      </footer>
    </div>
  );
};
