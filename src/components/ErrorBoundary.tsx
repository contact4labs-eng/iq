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
              {this.props.fallbackTitle || "Κάτι πήγε στραβά"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {this.props.fallbackDescription || "Παρουσιάστηκε ένα απρόσμενο σφάλμα. Δοκιμάστε να ανανεώσετε τη σελίδα."}
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="text-xs text-left bg-muted p-3 rounded-md overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                Δοκιμή ξανά
              </Button>
              <Button size="sm" onClick={this.handleReload}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Ανανέωση σελίδας
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
