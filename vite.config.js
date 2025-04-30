import { build, defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
export default defineConfig({
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'manifest.json',
                    dest: ''
                },
                {
                    // src: 'static/icons/*',
                    src: 'static/icons/icon.png',
                    dest: 'static/icons'
                },
                {
                    src: 'src/popup.html',
                    dest: 'src'
                }
            ]
        })
    ],
    build: {
        outDir: 'dist',
        emptyOutDir: true,// ビルド前に出力ディレクトリを空にする
        sourcemap: false,
        rollupOptions: {
            input: {
                background: resolve(__dirname, 'src/background.js'),
                content: resolve(__dirname, 'src/content.js'),
                popup: resolve(__dirname, 'src/popup.html')
            },
            output: {
                entryFileNames: 'src/[name].js',
                chunkFileNames: 'src/[name].js',
                assetFileNames: 'src/[name][extname]'
            }
        }
    }
});
