import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  // @minda/common is TypeScript source, so bundle it. Everything else stays an external dependency.
  noExternal: ['@minda/common'],
});
