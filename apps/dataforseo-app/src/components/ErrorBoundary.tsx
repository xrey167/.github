import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/// Top-level boundary that catches React render errors. Doesn't catch
/// async/IPC errors — those are handled by the formatError() toast
/// pattern in lib/errors.ts. The reload button hard-reloads to recover
/// from a corrupt provider/context state.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface in the dev console; production crash reporting (Sentry)
    // hooks here in Phase D5.
    // eslint-disable-next-line no-console
    console.error("Render error:", error, info);
  }

  reset = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-8">
          <h1 className="text-xl font-semibold text-slate-800">Something went wrong.</h1>
          <pre className="max-w-2xl overflow-auto rounded border bg-white p-3 text-xs text-red-700">
            {this.state.error.message}
          </pre>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white"
            >
              Reload app
            </button>
            <Link
              to="/settings"
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
            >
              Open Settings
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
