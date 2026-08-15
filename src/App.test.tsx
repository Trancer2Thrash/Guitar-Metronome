import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App shell', () => {
  it('renders the selected String Pulse product shell', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /六弦节拍器/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /开始节拍/i })).toBeInTheDocument()
  })
})
