import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: { __DEV__: mode !== 'production' },
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      {
        find: /^react-native-svg$/,
        replacement: require.resolve('react-native-svg/lib/module/ReactNativeSVG.web.js'),
      },
    ],
    extensions: ['.web.tsx', '.tsx', '.web.ts', '.ts', '.web.js', '.js', '.mjs', '.json'],
    dedupe: ['react', 'react-dom'],
  },
}));
