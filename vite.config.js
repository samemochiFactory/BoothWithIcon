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
                // setting resource
                {
                    src: 'static/desktop.ini',
                    dest: 'static'
                },
                {
                    src: 'static/setIcon.bat',
                    dest: 'static'
                },
                {
                    src: 'static/BoothLink.url',
                    dest: 'static'
                },
                // popup
                {
                    src: 'src/popup.html',
                    dest: 'src'
                },
                {
                    src: 'src/popup_styles.css',
                    dest: 'src'
                },
                // options
                {
                    src: 'src/options.html',
                    dest: 'src'
                },
                // {
                //     src: 'src/options_styles.css',
                //     dest: 'src'
                // },
                // customUI
                {
                    src: 'src/ui_template.html',
                    dest: 'src'
                },
                {
                    src: 'src/content_styles.css',
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
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
            }
        }
    }
});
