import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="card-glass focus-card" style={{ padding: 24, paddingBottom: 16, height: 260, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#E53E3E' }}>Component Failed</h3>
          <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', textAlign: 'center', marginTop: 8 }}>
            There was an error loading this specific chart or module. The rest of your dashboard is safe.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
