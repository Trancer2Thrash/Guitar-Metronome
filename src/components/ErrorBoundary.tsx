import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  onReload?: () => void
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Practice module crashed', error, info.componentStack)
  }

  private reload = () => {
    if (this.props.onReload) this.props.onReload()
    else window.location.reload()
  }

  private returnToMetronome = () => {
    window.location.hash = '#/metronome'
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="app-fallback" role="alert">
        <span className="app-fallback__mark" aria-hidden="true">VI</span>
        <p className="eyebrow">RECOVERY MODE</p>
        <h1>练习工具暂时无法加载</h1>
        <p>可能是网络中断或旧版本缓存导致。你可以重新加载页面，或先返回节拍器。</p>
        <div className="app-fallback__actions">
          <button type="button" className="primary-action" onClick={this.reload}>重新加载</button>
          <button type="button" className="secondary-action" onClick={this.returnToMetronome}>返回节拍器</button>
        </div>
      </main>
    )
  }
}
