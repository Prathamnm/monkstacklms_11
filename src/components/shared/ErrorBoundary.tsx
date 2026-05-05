'use client'

import { Component } from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary] Caught error:', error)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-slate-700 font-semibold text-lg mb-2">Something went wrong</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm">
            {this.state.error?.message ?? 'An unexpected error occurred. Please refresh the page.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
