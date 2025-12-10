import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  root: '.',
  base: './',
  
  // Configuration du serveur de développement
  server: {
    port: 5173,
    host: true,
    open: true,
    cors: true,
    strictPort: true,
    hmr: {
      overlay: true,
    },
  },

  // Configuration de la build de production
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'terser' : false,
    cssMinify: mode === 'production',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/js/[name].[hash].js',
        chunkFileNames: 'assets/js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name].[hash][ext]`;
          }
          
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name].[hash][ext]`;
          }
          
          if (/css|scss|sass|less/i.test(ext)) {
            return `assets/css/[name].[hash][ext]`;
          }
          
          return `assets/[name].[hash][ext]`;
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
    chunkSizeWarningLimit: 1000,
  },

  // Configuration des plugins
  plugins: [
    createHtmlPlugin({
      minify: mode === 'production',
      inject: {
        data: {
          title: 'Portail Cosmique | Exploration Stellaire Interactive',
          description: 'Découvrez un portail cosmique interactif avec des effets de particules et des énigmes stellaires',
          themeColor: '#0a0414',
        },
      },
    }),
  ],

  // Alias pour les imports
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@assets': resolve(__dirname, 'assets'),
    },
  },

  // Optimisations de performance
  optimizeDeps: {
    include: ['gsap'],
    exclude: [],
  },

  // Configuration CSS
  css: {
    devSourcemap: mode === 'development',
    preprocessorOptions: {
      scss: {
        additionalData: `
          @import "@/styles/_variables.scss";
          @import "@/styles/_mixins.scss";
        `,
      },
    },
  },

  // Configuration des tests
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
  },
}));