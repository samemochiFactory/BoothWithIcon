import { build, defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
export default defineConfig({
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'icons/*',
                    dest: 'icons'
                }
            ]
        })
    ],
    build: {
        outDir: 'public', // 出力先を public に
        rollupOptions: {
            input: {
                background: resolve(__dirname, 'src/background.js'),
                content: resolve(__dirname, 'src/content.js'),
                popup: resolve(__dirname, 'src/popup.html')
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name][extname]'
            }
        },
        sourcemap: true
    }
});
