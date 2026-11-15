import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('app shell', () => {
  it('renders the dashboard and navigates to the daily page', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'RoadmapTrack dashboard' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Open settings' }),
    ).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: /Daily/ })[0])

    expect(
      screen.getByRole('heading', { name: 'Daily Tracker' }),
    ).toBeInTheDocument()
  })
})
