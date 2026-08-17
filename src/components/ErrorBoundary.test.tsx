import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function BrokenTool(): never {
  throw new Error('lazy chunk failed')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('shows a recoverable fallback when a practice module crashes', async () => {
    const user = userEvent.setup()
    const reload = vi.fn()
    render(
      <ErrorBoundary onReload={reload}>
        <BrokenTool />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('练习工具暂时无法加载')
    await user.click(screen.getByRole('button', { name: '重新加载' }))
    expect(reload).toHaveBeenCalledOnce()
  })
})
