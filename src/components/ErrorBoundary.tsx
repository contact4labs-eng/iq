import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="text-center max-w-md space-y-4">
            <AlertTriangle className="w-10 h-10 text-warning mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">
              {this.props.fallbackTitle || "\u039A\u03AC\u03C4\u03B9 \u03C0\u03AE\u03B3\u03B5 \u03C3\u03C4\u03C1\u03B1\u03B2\u03AC"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {this.props.fallbackDescription || "\u03A0\u03B1\u03C1\u03BF\u03C5\u03C3\u03B9\u03AC\u03C3\u03C4\u03B7\u03BA\u03B5 \u03AD\u03BD\u03B1 \u03B1\u03C0\u03C1\u03CC\u03C3\u03BC\u03B5\u03BD\u03BF \u03C3\u03C6\u03AC\u03BB\u03BC\u03B1. \u0394\u03BF\u03BA\u03B9\u03BC\u03AC\u03C3\u03C4\u03B5 \u03BD\u03B1 \u03B1\u03BD\u03B1\u03BD\u03B5\u03CE\u03C3\u03B5\u03C4\u03B5 \u03C4\u03B7 \u03C3\u03B5\u03BB\u03AF\u03B4\u03B1."}
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="text-xs text-left bg-muted p-3 rounded-md overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                \u0394\u03BF\u03BA\u03B9\u03BC\u03AE \u03BE\u03B1\u03BD\u03AC
              </Button>
              <Button size="sm" onClick={this.handleReload}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                \u0391\u03BD\u03B1\u03BD\u03AD\u03C9\u03C3\u03B7 \u03C3\u03B5\u03BB\u03AF\u03B4\u03B1\u03C2
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
