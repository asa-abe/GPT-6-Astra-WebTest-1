import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  devToolbar: { enabled: false },
  vite: {
    // Prerendered chunks must resolve Astro's cookie version through pnpm's dependency boundary.
    environments: {
      prerender: { resolve: { noExternal: ['cookie'] } },
    },
    build: { assetsInlineLimit: 0 },
  },
});
