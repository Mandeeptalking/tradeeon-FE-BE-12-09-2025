import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Plugin to remove console statements in production
const removeConsolePlugin = () => {
  return {
    name: 'remove-console',
    transform(code: string, id: string) {
      // Only transform source files, not node_modules
      if (process.env.NODE_ENV === 'production' && 
          !id.includes('node_modules') && 
          (id.endsWith('.ts') || id.endsWith('.tsx') || id.endsWith('.js') || id.endsWith('.jsx'))) {
        return {
          code: code.replace(/console\.(log|debug|info|warn|error|trace|table|group|groupEnd|time|timeEnd)/g, '// console.$1'),
          map: null
        }
      }
      return null
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), removeConsolePlugin()],
  build: {
    // Skip type checking during build for faster production builds
    // Type checking is still done via tsc separately
    target: 'es2015',
    minify: true,
    sourcemap: false, // Security: Disable source maps in production
    // Ensure proper base path for production
    outDir: 'dist',
    assetsDir: 'assets',
  },
  // Base path for production (empty for root domain)
  base: '/',
  server: {
    port: 5173,
    host: true,
    // Add mock TA service for development
    setupMiddlewares: (middlewares, devServer) => {
      if (devServer.middlewares) {
        // Mock TA service middleware - simple response for development
        devServer.middlewares.use('/api/ta/series', async (req, res, next) => {
          try {
            // Parse query parameters
            const url = new URL(req.url!, `http://localhost:5173`);
            const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
            const tf = url.searchParams.get('tf') || '1m';
            const name = url.searchParams.get('name') || 'EMA';
            const source = url.searchParams.get('source') || 'close';
            const params = JSON.parse(url.searchParams.get('params') || '{}');
            
            // For development, return mock data
            // In production, this would connect to your real TA service
            const mockData = Array.from({ length: 100 }, (_, i) => ({
              t: Date.now() - (100 - i) * 60000, // Mock timestamps
              v: name.toUpperCase() === 'EMA' 
                ? 50000 + Math.random() * 1000 // Mock EMA values
                : 50 + Math.random() * 50 // Mock RSI values
            }));
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(mockData));
          } catch (error) {
            console.error('Mock TA service error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
      }
      return middlewares;
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

