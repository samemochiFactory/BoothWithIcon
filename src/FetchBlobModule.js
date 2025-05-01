import { PngIcoConverter } from './png2icojs';
import JSZip from 'jszip';
export { fetchItemBlob, fetchThumbnail, convertPngToIcon, createZipArchive }

async function fetchThumbnail(thumbnailUrl) {
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

async function fetchItemBlob(downloadUrl, progressBarId) {
    return new Promise((resolve, reject) => {
        // 受信したチャンクを保存する配列
        const receivedChunks = [];
        let totalChunks = 0;
        let blobType = 'application/zip';

        // チャンク受信用のリスナー
        const chunkListener = (message) => {
            if (message.action === "receiveChunk") {
                console.log(`chunk received! : ${message.chunkIndex + 1}/${message.totalChunks}`);

                // Base64データを抽出（データURLのヘッダー部分を削除）
                // const prefix = message.dataUrl.split(',')[0];
                // console.log("prefix : ", prefix);
                const base64Data = message.dataUrl.split(',')[1];

                // Base64をバイナリデータに変換
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);

                // チャンクを保存
                receivedChunks[message.chunkIndex] = byteArray;

                // すべてのチャンクを受信したらBlobを作成
                if (receivedChunks.filter(Boolean).length === totalChunks) {
                    // チャンクをすべて結合
                    const completeData = concatenateUint8Arrays(receivedChunks);
                    console.log("saving as type : ", blobType);
                    const blob = new Blob([completeData], { type: blobType });
                    // リスナーをクリーンアップ
                    chrome.runtime.onMessage.removeListener(chunkListener);
                    resolve(blob);
                }
            }
        };

        // リスナーを登録
        chrome.runtime.onMessage.addListener(chunkListener);

        // ダウンロードリクエストを送信
        chrome.runtime.sendMessage(
            {
                action: "fetchItem",
                url: downloadUrl,
                progressBarId: progressBarId
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    chrome.runtime.onMessage.removeListener(chunkListener);
                    reject(new Error("message sending error: " + chrome.runtime.lastError.message));
                    return;
                }

                if (response.error) {
                    chrome.runtime.onMessage.removeListener(chunkListener);
                    reject(new Error(response.error));
                    return;
                }

                if (response.status === "start") {
                    console.log(`starting download : total:${response.totalChunks}chunks, ${response.totalSize} Byte`);
                    totalChunks = response.totalChunks;
                    blobType = response.type || blobType;
                    console.log("filetype : ", blobType);
                }
            }
        );
    });
}

async function convertPngToIcon(thumbnailBlob) {
    try {
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
            img.onerror = (e) => reject(new Error(`failed to load thumbnail : ${e}`));
            img.src = URL.createObjectURL(thumbnailBlob);
        });

        // CanvasからPNG Blobを生成
        const pngBlob = await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) reject(new Error("failed to generate PNG blob"));
                else resolve(blob);
            }, 'image/png');
        });

        // PNG BlobをICO形式に変換
        const converter = new PngIcoConverter();
        const icoBlob = await converter.convertToBlobAsync([{ png: pngBlob }]);

        return icoBlob;
    } catch (error) {
        console.error("failed to converting .ico : ", error);
        throw error;
    }
}

async function createZipArchive(fileMap) {
    const zip = new JSZip();
    // ループ処理
    for (const [fileName, blob] of fileMap) {
        zip.file(fileName, blob);
    }
    return zip.generateAsync({ type: "blob" });
}

// Uint8Array の配列を1つの Uint8Array に結合する関数
function concatenateUint8Arrays(arrays) {
    // 合計サイズを計算
    const totalLength = arrays.reduce((acc, array) => acc + array.length, 0);
    // 新しい配列を作成
    const result = new Uint8Array(totalLength);
    // データをコピー
    let offset = 0;
    for (const array of arrays) {
        result.set(array, offset);
        offset += array.length;
    }
    return result;
}