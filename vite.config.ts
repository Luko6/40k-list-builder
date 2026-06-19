import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Project is served from https://luko6.github.io/40k-list-builder/
// so assets must be referenced under that base path in production.
export default defineConfig({
  base: '/40k-list-builder/',
  plugins: [react()],
})
