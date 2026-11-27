import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname || process.cwd(), 'package.json'), 'utf8')
);

/**
 * 将单页构建产出的 JS/CSS 内联进唯一 HTML 文件，支持直接 file:// 双击或群文件分发。
 */
function inlineSingleFilePlugin(outputFileName: string): Plugin {
  return {
    name: 'inline-single-file',
    enforce: 'post',
    generateBundle(_, bundle) {
      let htmlChunk: { fileName: string; source: string | Uint8Array } | null = null;
      const jsChunks: string[] = [];
      const cssChunks: string[] = [];

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'asset' && fileName.endsWith('.html')) {
          htmlChunk = chunk;
        } else if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
          jsChunks.push(chunk.code);
          delete bundle[fileName];
        } else if (chunk.type === 'asset' && fileName.endsWith('.css')) {
          cssChunks.push(String(chunk.source));
          delete bundle[fileName];
        }
      }

      if (!htmlChunk) return;

      let html = String(htmlChunk.source);
      // 移除外链 CSS / JS 标签并内联
      html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
      html = html.replace(/<script\b[^>]*type=["']module["'][^>]*><\/script>/gi, '');

      const inlineCss = cssChunks.length
        ? `<style>\n${cssChunks.join('\n')}\n</style>`
        : '';
      const safeJs = jsChunks.join('\n').replace(/<\/script>/gi, '<\\/script>');
      const inlineJs = safeJs ? `<script>\n${safeJs}\n</script>` : '';

      html = html.replace('</head>', `${inlineCss}\n</head>`);
      html = html.replace('</body>', `${inlineJs}\n</body>`);

      delete bundle[htmlChunk.fileName];
      this.emitFile({
        type: 'asset',
        fileName: outputFileName,
        source: html,
      });
    },
  };
}

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname || process.cwd(), './src'),
    },
  },
  plugins: [vue(), inlineSingleFilePlugin('terraria-guide.html')],
  build: {
    outDir: 'dist-single',
    emptyOutDir: true,
    copyPublicDir: false,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(import.meta.dirname || process.cwd(), 'guide-standalone.html'),
      output: {
        format: 'iife',
      },
    },
  },
});
