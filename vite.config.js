import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      // Cuando alguien pida algo que empiece con '/api'...
      '/api': {
        // ...Vite lo redirigirá secretamente a Wispro
        target: 'https://www.cloud.wispro.co',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})