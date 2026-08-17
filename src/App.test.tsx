import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App shell', () => {
  it('renders the selected String Pulse product shell', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /六弦练习室/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /开始节拍/i })).toBeInTheDocument()
  })

  it('applies a practice song tempo and meter in one update', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '打开练习曲目' }))
    const search = await screen.findByPlaceholderText('曲名、艺人或练习重点')
    await user.type(search, 'House of the Rising Sun')
    await user.click(screen.getByRole('button', { name: /慢速开始/ }))

    expect(screen.getByRole('spinbutton', { name: 'BPM' })).toHaveValue(55)
    expect(screen.getByRole('button', { name: /拍号\s*3\/4/ })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '节拍器练习曲目列表' })).not.toBeInTheDocument()
  })
})
