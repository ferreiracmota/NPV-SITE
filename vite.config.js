import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { execFileSync } from 'node:child_process'

// Identificador de publicação visível apenas ao administrador do Clube.
// Somente metadados públicos: não incluir segredos do ambiente no bundle.
const checkoutSha = () => {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 1500 }).trim() }
  catch { return '' }
}
const npvBuildInfo = {
  commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || checkoutSha(),
  branch: process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || '',
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
