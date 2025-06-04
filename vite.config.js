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
                    src: 'static/icons/icon*.png',
                    dest: 'static/icons'
                },
                {
                    src: 'static/desktop.ini',
                    dest: 'static'
                },
                {
                    src: 'static/setIcon.bat',
                    dest: 'static'
                },
                {
                    src: 'src/popup.html',
                    dest: 'src'
                },
                {
                    src: 'src/options.html',
                    dest: 'src'
                },
                {
                    src: 'src/content_styles.css',
                    dest: 'src'
                }, {
                    src: 'src/ui_template.html',
                    dest: 'src'
                }
            ]
        })
    ],
    build: {
        outDir: 'dist',
        emptyOutDir: true,// ビルド前に出力ディレクトリを空にする
        sourcemap: true,
        rollupOptions: {
            input: {
                background: resolve(__dirname, 'src/background.js'),
                content: resolve(__dirname, 'src/content.js'),
                popup: resolve(__dirname, 'src/popup.js'),
                options: resolve(__dirname, 'src/options.html')
            },
            output: {
                format: "es",
                entryFileNames: 'src/[name].js',
                chunkFileNames: 'src/[name].js',
                assetFileNames: 'src/[name][extname]',
            }
        },
        // minify: false,
        esbuild: {
            drop: ['console'], // console.* の呼び出しを削除
        },
    }
});
