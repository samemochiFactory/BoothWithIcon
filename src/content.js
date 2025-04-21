// JSZipライブラリをインポート（manifest.jsonにJSZipを追加）
import JSZip from 'jszip'; // ✅ npmモジュールからちゃんとバンドルされる
import * as icojs from 'icojs';
import { saveAs } from 'file-saver';

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
                    //ここ，商品ページが消えてると404返るのでなんとかしたい
                }
            });
    });
}

// //商品データ取得させるやつ(旧)
// async function getItem(downloadUrl) {
//     return new Promise((resolve, reject) => {
//         chrome.runtime.sendMessage(
//             {
//                 action: "fetchItem", url: downloadUrl
//             }, (response) => {
//                 if (response && response.data) {
//                     resolve(response.data);
//                 } else {
//                     reject(new Error("データの取得に失敗しました"));
//                     //ここ，商品ページが消えてると404返るのでなんとかしたい
//                 }
//             });
//     });
// }
// 商品データを取得して Blob に変換する関数
async function getItemBlob(downloadUrl) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                action: "fetchItem",
                url: downloadUrl
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

async function createZipArchive(productFileBlob, icoData, shopName, itemName) {
    const zip = new JSZip();
    // zip.file(`${shopName}_${itemName}.ico`, icoData);
    zip.file(`boothThumbnail.ico`, icoData);
    // zip.file(`${shopName}_${itemName}.zip`, productFileBlob); // 商品ファイルを追加
    zip.file(`${itemName}.zip`, productFileBlob); // 商品ファイルを追加
    // zip.file("desktop.ini", `[FolderDescription]\nIconResource=${shopName}_${itemName}.ico,0`);
    zip.file("desktop.ini", `[.ShellClassInfo]\nIconResource=boothThumbnail.ico,0\n[ViewState]\nMode=\nVid=\nFolderType=Generic`);

    // return zip.generate({ type: "blob" });
    return zip.generateAsync({ type: "blob" }).then(function (content) {
        saveAs(content, `${shopName}_${itemName}.zip`);

    });
}

async function downloadWithZip(downloadUrl, shopName, itemName) {
    console.log("downloading...");
    try {
        // 商品ファイルをBlobとして取得
        const productFileBlob = await getItemBlob(downloadUrl);

        // サムネイル画像をBlobとして取得し、ICO形式に変換
        const thumbnailElement = document.querySelector('.l-library-item-thumbnail');
        if (!thumbnailElement) {
            throw new Error('サムネイル画像が見つかりません');
        }
        const thumbnailUrl = thumbnailElement.src;

        const imageData = await getThumbnail(thumbnailUrl);

        // ICO形式への変換 (ライブラリを使用することを推奨)
        // ここでICOエンコード処理を実装またはライブラリを使用する
        // 例：iconv-lite を使用する場合
        // const icoData = convertToIco(imageData); // 自分で実装するか、ライブラリを使用

        const icoData = await new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                canvas.width = 300; // サムネイルのサイズに合わせて調整
                canvas.height = 300;
                ctx.drawImage(img, 0, 0);

                // CanvasからBlobを作成し、ICO形式として返す（簡易的な例）
                canvas.toBlob(blob => {
                    resolve(blob);
                }, 'image/png'); // ICO形式は直接サポートされていないため、PNGで代替
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(imageData);
        });

        // Zipアーカイブを作成
        const zipBlob = await createZipArchive(productFileBlob, icoData, shopName, itemName);

        // ダウンロード処理
        chrome.downloads.download({
            url: URL.createObjectURL(zipBlob), // BlobからURLを作成
            filename: `${shopName}_${itemName}.zip`,
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('Download error:', chrome.runtime.lastError);
            } else {
                console.log('Download started:', downloadId);
            }
        });

    } catch (error) {
        console.error('Zipアーカイブの作成またはダウンロード中にエラーが発生しました:', error);
    }
}

function createDownloadButton(shopName, itemName, itemUrlElement) {
    // ファイル名を生成
    const fileName = `${sanitizeFileName(shopName)}_${sanitizeFileName(itemName)}.zip`;
    console.log('ファイル名:', fileName);
    document.querySelectorAll('a[href*="/downloadables/"]').forEach(downloadLink => {
        const downloadUrl = downloadLink ? downloadLink.href : null;
        // 既にカスタムボタンが追加されていればスキップ
        if (downloadLink.parentElement.querySelector('.custom-dl-button')) return;

        const productContainer = downloadLink.closest('.mb-16.bg-white');
        if (!productContainer) return;

        // 商品タイトルと作者名の抽出
        const titleElement = productContainer.querySelector('.text-text-default');
        const authorElement = productContainer.querySelector('.text-text-gray600');

        if (!titleElement || !authorElement) return;
        //ここ，サイトから商品名作ってるので404でも見た目はちゃんと見えてしまうが，DL時にエラーとなる
        const title = titleElement.textContent.trim().replace(/\s+/g, ' ');
        const author = authorElement.textContent.trim().replace(/\s+/g, ' ');
        const filename = `${author}_${title}.zip`;
        //ボタン追加
        const customButton = document.createElement('button');
        customButton.textContent = `カスタムDL (${filename})`;
        customButton.className = 'custom-dl-button px-4 py-2 bg-blue-500 text-black rounded text-sm';

        customButton.addEventListener('click', () => {
            console.log("click!");
            console.log('ファイル名:', fileName);

            if (!downloadUrl) {
                console.error('ダウンロードURLが取得できていません');
                return;
            }
            //iconとファイルをまとめてDL(アイコン自動設定付き)
            downloadWithZip(downloadUrl, author, title);
            //----普通にファイル名変更だけしてDLする場合----
            // chrome.runtime.sendMessage({
            //     action: 'download',
            //     url: downloadUrl,
            //     filename: fileName
            // });
            //----------------------------------------------
        });

        // ボタンをこのリンクの直後に追加（ファイル単位に追加）
        downloadLink.parentElement.appendChild(customButton);
    });

}

function sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_');
}

async function main(itemUrlElements) {
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

const selector = "a.no-underline[href*='/items/']";//商品リンクを含む要素(aタグ)のセレクタ
const itemUrlElements = document.querySelectorAll(selector);//全件取得
main(itemUrlElements);