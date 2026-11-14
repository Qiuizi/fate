import { Component, ReactNode } from 'react';

interface State {
  hasError: boolean;
  msg?: string;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(e: any): State {
    return { hasError: true, msg: String((e && e.message) || e) };
  }
  componentDidCatch() {
    /* swallow */
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="eb-fallback">
          <div className="eb-box">
            <h3>出了点小问题</h3>
            <p>{this.state.msg || '页面渲染出错'}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              重新加载
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
