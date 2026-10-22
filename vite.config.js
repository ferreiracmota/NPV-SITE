import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Identificador de publicação visível apenas ao administrador do Clube.
// Somente metadados públicos: não incluir segredos do ambiente no bundle.
const npvBuildInfo = {
  commit: process.env.VERCEL_GIT_COMMIT_SHA || '',
  branch: process.env.VERCEL_GIT_COMMIT_REF || '',
  builtAt: new Date().toISOString()
}

// https://vite.dev/config/
export default defineConfig({
  define: { __NPV_BUILD_INFO__: JSON.stringify(npvBuildInfo) },
  plugins: [react(),tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
