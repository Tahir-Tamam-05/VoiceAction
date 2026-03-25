import * as React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mb-8 animate-pulse">
            <AlertTriangle size={40} />
          </div>
          
          <h1 className="text-3xl font-headline font-extrabold text-white mb-4 tracking-tight uppercase">
            System Interruption
          </h1>
          
          <p className="text-text-secondary max-w-md mb-12 leading-relaxed">
            An unexpected error occurred within the application core.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest transition-all border border-white/5"
            >
              <RefreshCw size={18} />
              <span>Reload App</span>
            </button>
            
            <button
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:scale-105 transition-transform"
            >
              <Home size={18} />
              <span>Reset State</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
