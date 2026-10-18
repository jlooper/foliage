import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Use Node server output so upload credentials stay on the server.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
});