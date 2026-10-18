import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// Use server output so upload credentials stay on the server.
export default defineConfig({
  output: 'server',
  adapter: netlify(),
  site: 'https://local-leaf.netlify.app',
});

