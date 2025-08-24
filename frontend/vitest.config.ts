import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./test/setup.ts'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      include: ['test/**/*.test.ts'],
      exclude: [...configDefaults.exclude, 'e2e/**', '/_test/**'],
      passWithNoTests: true,
    },
  }),
)
