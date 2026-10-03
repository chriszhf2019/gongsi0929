import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : String(err);
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="w-full rounded-xs border border-[#A84A3E]/40 bg-[#FDF7F7] p-6 shadow-xs text-center">
          <div className="text-[#A84A3E] font-serif font-bold mb-2">页面渲染出错</div>
          <div className="text-xs text-[#5C2E28]">{this.state.message}</div>
          <button
            className="mt-3 px-4 py-1.5 text-xs bg-[#A84A3E] text-white rounded-xs"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
