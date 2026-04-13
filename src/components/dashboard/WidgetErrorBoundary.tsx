'use client';

import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * A granular Error Boundary for dashboard widgets.
 * This prevents a single component crash from taking down the entire dashboard page.
 */
class WidgetErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[Widget Error] ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-white border border-red-100 rounded-3xl min-h-[200px] text-center shadow-sm animate-in fade-in duration-300">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mb-3">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1">
            {this.props.name || 'Widget'} crashed
          </h3>
          <p className="text-[11px] text-gray-400 mb-4 max-w-[180px]">
            Something went wrong while rendering this section.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-100 transition-all active:scale-95"
          >
            <RotateCcw size={14} />
            Reset Widget
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WidgetErrorBoundary;
