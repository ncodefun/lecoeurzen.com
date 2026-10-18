// vite.config.js — plain object so it works with a global vite (no local deps)
export default {
  appType: 'mpa',
  optimizeDeps: {
    entries: ['/index.html']  // only scan this, ignore 404.html etc.
  },
  root: './public',
  plugins: [
    {
      // Full-reload the browser whenever any .html file changes.
      name: 'reload-on-html-change',
      handleHotUpdate({ file, server }) {
        if (file.endsWith('.html')) {
          server.ws.send({ type: 'full-reload', path: '*' })
          return []
        }
      },
    },
  ],
  server: {
    port: 5010,
    open: false,
  },
}
