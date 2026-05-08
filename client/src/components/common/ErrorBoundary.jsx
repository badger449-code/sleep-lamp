import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * 全局错误边界组件
 * 捕获子组件的 JavaScript 错误，显示友好提示而非白屏
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 使下一次渲染能够显示降级 UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误日志
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // 自定义 fallback UI
      if (fallback) {
        return fallback;
      }

      // 默认降级 UI - 夜间模式友好
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          <div
            className="max-w-md w-full rounded-3xl p-8 text-center"
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}
          >
            {/* 柔和的警示图标 - 不刺眼 */}
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(251, 191, 36, 0.1)' }}
            >
              <AlertTriangle 
                size={32} 
                className="text-amber-400"
              />
            </div>

            <h2 className="text-xl font-light text-slate-200 mb-3">
              遇到了一点小问题
            </h2>

            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              别担心，这只是页面渲染时的小故障。
              点击下方按钮重新加载。
            </p>

            {/* 可折叠的错误详情 */}
            {error && (
              <details className="text-left mb-6">
                <summary 
                  className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors"
                  style={{ listStyle: 'none' }}
                >
                  技术详情（可展开）
                </summary>
                <pre
                  className="mt-2 p-3 rounded-lg text-xs text-red-300 overflow-auto max-h-32"
                  style={{
                    background: 'rgba(127, 29, 29, 0.3)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                >
                  {error.toString()}
                  {errorInfo?.componentStack && (
                    <>{'\n\n组件堆栈:\n'}{errorInfo.componentStack}</>
                  )}
                </pre>
              </details>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-3 rounded-full text-sm font-medium transition-all"
                style={{
                  background: 'rgba(71, 85, 105, 0.5)',
                  border: '1px solid rgba(100, 116, 139, 0.3)',
                  color: '#e2e8f0'
                }}
              >
                重试
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-3 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                  color: '#ffffff'
                }}
              >
                <RefreshCw size={16} />
                重新加载
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
