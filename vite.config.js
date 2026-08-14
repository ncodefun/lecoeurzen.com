// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  appType: 'mpa',
  optimizeDeps: {
    entries: ['/index.html']  // only scan this, ignore 404.html etc.
  },
  root: './public',
  server: {
    port: 5008,
    open: false,
  },
})
