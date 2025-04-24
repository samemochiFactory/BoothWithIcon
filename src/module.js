import { PngIcoConverter } from './png2icojs';

async function getThumbnail(thumbnailUrl) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                action: "fetchThumbnail",
                url: thumbnailUrl
            },
            (response) => {
                if (response && response.data) {
                    // ArrayBuffer を受け取った前提で Blob に変換
                    const byteArray = new Uint8Array(response.data);
                    const blob = new Blob([byteArray]);
                    resolve(blob);
                } else {
                    reject(new Error("商品データの取得に失敗しました"));
                }
            }
        );
    });
}

export async function getIconFromPngUrl(thumbnailUrl) {
    try {
        // サムネイル画像をBlobとして取得
        const imageData = await getThumbnail(thumbnailUrl);

        // PNG画像をCanvasに描画
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 256; // ICO最大サイズ
        canvas.width = size;
        canvas.height = size;

        // 画像の読み込みと描画を待機
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, size, size);
                // メモリリークを防止
                URL.revokeObjectURL(img.src);
                resolve();
            };
            img.onerror = (e) => reject(new Error(`画像の読み込みに失敗: ${e}`));
            img.src = URL.createObjectURL(imageData);
        });

        // CanvasからPNG Blobを生成
        const pngBlob = await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) reject(new Error("PNG blob生成に失敗"));
                else resolve(blob);
            }, 'image/png');
        });

        // PNG BlobをICO形式に変換
        const converter = new PngIcoConverter();
        const icoBlob = await converter.convertToBlobAsync([{ png: pngBlob }]);

        return icoBlob;
    } catch (error) {
        console.error("ICO変換エラー:", error);
        throw error;
    }
}