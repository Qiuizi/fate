import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** 独立子页，产物拷进 public/yijing，不进入八字主包。 */
export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: 'dist-yijing',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: 'yijing.html',
      output: {
        manualChunks(id: string) {
          if (id.includes('lunar-javascript')) return 'lunar';
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
});
