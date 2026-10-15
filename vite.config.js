// vite.config.js — plain object so it works with a global vite (no local deps)
export default {
  appType: 'mpa',
  optimizeDeps: {
    entries: ['/index.html']  // only scan this, ignore 404.html etc.
  },
  root: './public',
  server: {
    port: 5010,
    open: false,
  },
}
