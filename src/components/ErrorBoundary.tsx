import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const raw = error instanceof Error ? error.message : 'Unexpected application error';
    let friendly = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string') {
        friendly = parsed.error;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message: friendly.slice(0, 220) };
  }

  componentDidCatch(error: unknown) {
    console.error('ELARB FitPro Ultra ErrorBoundary caught:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#07060b] text-slate-100 flex items-center justify-center p-6">
        <div className="glass-panel-elevated max-w-md w-full rounded-[28px] p-7 text-center space-y-4 border border-amber-400/35">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
          <h1 className="text-xl font-extrabold text-white">
            ELARB FitPro Ultra · Recovery Mode
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            حدث خطأ غير متوقع في واجهة التطبيق وتم إيقاف العرض بأمان لحماية بياناتك. اضغط على زر إعادة التحميل للمتابعة.
          </p>
          {this.state.message && (
            <p dir="ltr" className="rounded-xl bg-black/60 border border-white/10 p-3 text-[11px] font-mono-tabular text-rose-300 break-words">
              {this.state.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 text-sm font-extrabold hover:opacity-95 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            <span>إعادة تحميل التطبيق · Reload App</span>
          </button>
        </div>
      </div>
    );
  }
}
