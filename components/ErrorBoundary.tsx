import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-[3rem] p-12 max-w-lg w-full text-center shadow-2xl border border-slate-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <AlertTriangle size={40} />
            </div>

            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4">
              Something went wrong
            </h1>

            <p className="text-slate-500 font-medium mb-8">
              An unexpected error occurred. Please try reloading the page.
            </p>

            {this.state.error && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8 text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Error Details
                </p>
                <code className="text-xs text-slate-600 font-mono break-all">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-3 bg-indigo-600 text-white font-black px-8 py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
              <RefreshCw size={20} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
