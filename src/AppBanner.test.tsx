import { render, screen } from '@testing-library/react'
import { AppBanner } from './AppBanner'

describe('AppBanner', () => {
  it('names the application', () => {
    render(<AppBanner />)
    expect(screen.getByRole('heading', { name: 'sdlc2 lab' })).toBeVisible()
  })
})
