// JSZipライブラリをインポート（manifest.jsonにJSZipを追加）
import JSZip from 'jszip';
import { getIconFromPngUrl } from './module';

function getItemUrl(itemUrlElement) {
    const itemUrl = itemUrlElement ? itemUrlElement.href : 'Unknown';
    if (itemUrlElement) {
        // console.log('itemUrl:', itemUrl);
    } else {
        console.log('failed to get item url');
    }
    return itemUrl
}

async function getItemInfo(item_url) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                action: "fetchItemInfo", url: item_url
            }, (response) => {
                if (response && response.data) {
                    resolve(response.data);
                } else {
                    reject(new Error("商品データの取得に失敗しました"));
                    //ここ，商品ページが消えてると404返る
                }
            });
    });
}

async function getItemBlob(downloadUrl) {
    return new Promise((resolve, reject) => {
        // 受信したチャンクを保存する配列
        const receivedChunks = [];
        let totalChunks = 0;
        let blobType = 'application/zip';

        // チャンク受信用のリスナー
        const chunkListener = (message) => {
            if (message.action === "receiveChunk") {
                console.log(`チャンク受信: ${message.chunkIndex + 1}/${message.totalChunks}`);

                // Base64データを抽出（データURLのヘッダー部分を削除）
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
                url: downloadUrl
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    chrome.runtime.onMessage.removeListener(chunkListener);
                    reject(new Error("メッセージ送信エラー: " + chrome.runtime.lastError.message));
                    return;
                }

                if (response.error) {
                    chrome.runtime.onMessage.removeListener(chunkListener);
                    reject(new Error(response.error));
                    return;
                }

                if (response.status === "start") {
                    console.log(`ダウンロード開始: 合計${response.totalChunks}チャンク, ${response.totalSize}バイト`);
                    totalChunks = response.totalChunks;
                    blobType = response.type || blobType;
                }
            }
        );
    });
}
// Uint8Array の配列を1つの Uint8Array に結合する関数
function concatenateUint8Arrays(arrays) {
    // 合計サイズを計算
    const totalLength = arrays.reduce((acc, array) => acc + array.length, 0);
    console.log("hoge")
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

function sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_');
}

// async function createZipArchive(productFileBlob, icoBlob, fileName) {
//     const zip = new JSZip();
//     zip.file(`boothThumbnail.ico`, icoBlob);//iconを追加
//     zip.file(fileName, productFileBlob); // 商品ファイルを追加
//     zip.file("desktop.ini", `[.ShellClassInfo]\nIconResource=boothThumbnail.ico,0\n[ViewState]\nMode=\nVid=\nFolderType=Generic`);//desktop.iniを追加
//     return zip.generateAsync({ type: "blob" });
// }

async function createZipArchive(fileMap) {
    const zip = new JSZip();
    // ループ処理
    for (const [fileName, blob] of fileMap) {
        zip.file(fileName, blob);
    }
    return zip.generateAsync({ type: "blob" });
}

async function downloadWithZip(itemDownloadUrl, thumbnailUrl, itemFileName) {
    console.log("downloading...");
    try {
        // 商品ファイルをBlobとして取得
        const productFileBlob = await getItemBlob(itemDownloadUrl);
        // サムネイル画像をBlobとして取得し、ICO形式に変換
        const icoBlob = await getIconFromPngUrl(thumbnailUrl);
        //zipの内容物を入れる
        const fileMap = new Map();
        fileMap.set(`boothThumbnail.ico`, icoBlob);//iconを追加
        fileMap.set(itemFileName, productFileBlob);// 商品ファイルを追加
        fileMap.set("desktop.ini", `[.ShellClassInfo]\nIconResource=boothThumbnail.ico,0\n[ViewState]\nMode=\nVid=\nFolderType=Generic`);//desktop.iniを追加
        // Zipアーカイブを作成
        const zipBlob = await createZipArchive(fileMap);

        // ダウンロード処理
        chrome.runtime.sendMessage({
            action: 'downloadZip',
            blobUrl: URL.createObjectURL(zipBlob),
            filename: itemFileName
        });
    } catch (error) {
        console.error('Zipアーカイブの作成またはダウンロード中にエラーが発生しました:', error);
    }
}

function createDownloadButton(shopName, itemName, itemUrlElement) {
    document.querySelectorAll('a[href*="/downloadables/"]').forEach(downloadLink => {
        const downloadUrl = downloadLink ? downloadLink.href : null;
        // 既にカスタムボタンが追加されていればスキップ
        if (downloadLink.parentElement.querySelector('.custom-dl-button')) return;

        const productContainer = downloadLink.closest('.mb-16.bg-white');
        if (!productContainer) return;

        //サムネイルのURLを取得
        const thumbnailElement = productContainer.querySelector('.l-library-item-thumbnail');//ここ，今の実装だと先頭要素だけを取っているので変更の必要あり
        if (!thumbnailElement) {
            throw new Error('サムネイル画像が見つかりません');
        }
        const thumbnailUrl = thumbnailElement.src;

        // 商品タイトルと作者名の抽出
        const titleElement = productContainer.querySelector('.text-text-default');
        const authorElement = productContainer.querySelector('.text-text-gray600');

        if (!titleElement || !authorElement) return;
        // ここ，サイトから商品名作ってるので404でも見た目はちゃんと見えてしまうが，DL時にエラーとなる
        const title = titleElement.textContent.trim().replace(/\s+/g, ' ');
        const author = authorElement.textContent.trim().replace(/\s+/g, ' ');
        // ファイル名を生成
        const filename = `${author}_${title}.zip`;
        //ボタン追加
        const customButton = document.createElement('button');
        customButton.textContent = `カスタムDL (${filename})`;
        customButton.className = 'custom-dl-button px-4 py-2 bg-blue-500 text-black rounded text-sm';

        customButton.addEventListener('click', () => {
            console.log("click!");
            console.log('ファイル名:', filename);

            if (!downloadUrl) {
                console.error('ダウンロードURLが取得できていません');
                return;
            }
            //iconとファイルをまとめてDL(アイコン自動設定付き)
            downloadWithZip(downloadUrl, thumbnailUrl, sanitizeFileName(filename));
        });

        // ボタンをこのリンクの直後に追加（ファイル単位に追加）
        downloadLink.parentElement.appendChild(customButton);
    });

}

async function main() {
    const selector = "a.no-underline[href*='/items/']";//商品リンクを含む要素(aタグ)のセレクタ
    const itemUrlElements = document.querySelectorAll(selector);//全件取得
    for (const [i, itemUrlElement] of itemUrlElements.entries()) {
        //商品ページのURL+.jsonから商品情報を取得
        console.log('ItemURL' + i, itemUrlElement.href);
        // const itemUrl = getItemUrl(itemUrlElement) ? getItemUrl(itemUrlElement) : null;
        const itemUrl = getItemUrl(itemUrlElement);
        if (!itemUrl) continue;
        let shopName = "unknownShopName";//default
        let itemName = "unknownItemName";//default
        try {
            const data = await getItemInfo(itemUrl + '.json');
            shopName = data.shop.name;
            itemName = data.name;
        } catch (error) {
            console.warn(`(${i}) 商品情報の取得に失敗: ${itemUrl}.json`, error);
            console.warn('商品情報が取得できなかったのでデフォルト名を使用します', error);
        } finally {
            console.log('ショップ名:', shopName);
            console.log('商品名:', itemName);
            // //DLボタン追加
            createDownloadButton(shopName, itemName, itemUrlElement)
        }
    }
}
main();