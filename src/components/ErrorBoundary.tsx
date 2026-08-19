import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    error: Error | null;
}

/**
 * Catches uncaught render errors so a single failure degrades into a readable
 * message instead of unmounting the whole tree and leaving a blank white page.
 *
 * This matters for cross-browser behaviour: engine differences (for example
 * Safari's stricter Date parsing) can throw where Chrome does not, and without
 * a boundary the user just sees nothing at all.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Unhandled UI error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        const { error } = this.state;

        if (!error) return this.props.children;

        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-lg w-full p-8 text-center">
                    <div className="h-16 w-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400" />
                    </div>

                    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Something went wrong
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        The page ran into an unexpected problem. Reloading usually fixes it.
                    </p>

                    <button
                        type="button"
                        onClick={this.handleReload}
                        className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-sm hover:bg-indigo-700 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reload page
                    </button>

                    {error.message && (
                        <p className="mt-6 text-xs text-left text-gray-400 dark:text-gray-500 break-words font-mono">
                            {error.message}
                        </p>
                    )}
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
