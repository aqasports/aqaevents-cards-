"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/admin/ui";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class CallsErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || "An unexpected error occurred." };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CallsErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-xl space-y-4 text-center max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-display">
              {this.props.fallbackTitle || "Reinscription Calls Desk Temporarily Unavailable"}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              An issue occurred while rendering the calling desk. The rest of your Swim Manager remains fully operational.
            </p>
            {this.state.errorMessage && (
              <p className="text-[11px] font-mono text-amber-300/80 bg-slate-950/60 p-2 rounded-lg mt-3 border border-amber-500/20 text-left overflow-x-auto">
                {this.state.errorMessage}
              </p>
            )}
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Button variant="primary" size="sm" onClick={this.handleReset}>
              Reload Calling Desk
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
