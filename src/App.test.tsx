import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

// The walking skeleton, at the composition seam: the greeting has to co-exist with the
// existing banner, so this one scenario renders the whole app. Every other scenario of this
// slice is about the greeting screen itself and lives in GreetingScreen.test.tsx.
// Driven keyboard-only on purpose (mockup.html section 7 / VH-14): the primary path must be
// completable without a pointer.
describe('Greet the visitor by name', () => {
  it('greets the visitor by the name they typed', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<App />)
    // And the existing heading "sdlc2 lab" is shown
    expect(screen.getByRole('heading', { name: 'sdlc2 lab' })).toBeVisible()
    // And the Name field is empty
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')

    // When the visitor types "Ada" into the Name field
    await user.tab()
    await user.keyboard('Ada')
    // And the visitor activates the submit control
    await user.tab()
    await user.keyboard('{Enter}')

    // Then the greeting reads "Hello, Ada"
    // And the greeting is exposed as a live status region (role="status")
    expect(screen.getByRole('status')).toHaveTextContent('Hello, Ada')
    // And the Name field has an accessible label "Name"
    expect(screen.getByLabelText('Name')).toBe(screen.getByRole('textbox', { name: 'Name' }))
    // And the submit control has the accessible name "Greet me"
    expect(screen.getByRole('button', { name: 'Greet me' })).toBeVisible()
    // And the Name field still contains "Ada"
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ada')
    // And the existing heading "sdlc2 lab" is still shown
    expect(screen.getByRole('heading', { name: 'sdlc2 lab' })).toBeVisible()
  })
})
