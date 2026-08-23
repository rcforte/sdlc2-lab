import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    // Git worktrees live INSIDE this repo (see .gitignore): sdlc2 builds concurrent slices in
    // .sdlc2/worktrees/ and the Claude Code harness puts agent worktrees in .claude/worktrees/.
    // Each has its own node_modules, so collecting their suites from here renders components
    // against a second copy of React and every render throws "Invalid hook call". Ignoring them
    // in git is only half the decision; a checkout of this repo is one project, not N+1.
    exclude: [...configDefaults.exclude, '.sdlc2/worktrees/**', '.claude/worktrees/**'],
  },
})
