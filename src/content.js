// JSZipライブラリをインポート（manifest.jsonにJSZipを追加）
import JSZip from 'jszip'; // ✅ npmモジュールからちゃんとバンドルされる
// import { saveAs } from 'file-saver';
import { PngIcoConverter } from './png2icojs';

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
// 商品データを取得して Blob に変換する関数(動作済)
// async function getItemBlob(downloadUrl) {
//     return new Promise((resolve, reject) => {
//         chrome.runtime.sendMessage(
//             {
//                 action: "fetchItem",
//                 url: downloadUrl
//             },
//             (response) => {
//                 if (response && response.data) {
//                     // ArrayBuffer を受け取った前提で Blob に変換
//                     const byteArray = new Uint8Array(response.data);//いけるけどサイズ制限がある
//                     // const byteArray = response.data;//←これ無理．そのまま送れない．のでUint8Arrayに変換している．
//                     const blob = new Blob([byteArray]);
//                     resolve(blob);
//                 } else {
//                     reject(new Error("商品データの取得に失敗しました"));
//                 }
//             }
//         );
//     });
// }
async function getItemBlob(downloadUrl) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                action: "fetchItem",
                url: downloadUrl
            },
            async (response) => {
                if (response && response.blobUrl) {
                    try {
                        // // fetch でデータを取得（blobとして）
                        // const res = await fetch(response.blobUrl);
                        // const blob = await res.blob();
                        // base64文字列からBlobを復元
                        const base64Data = response.blobUrl.split(',')[1]; // "data:application/zip;base64,..." の後ろだけ
                        const byteCharacters = atob(base64Data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: 'application/zip' });
                        resolve(blob);
                    } catch (e) {
                        reject(new Error("Blobの取得に失敗: " + e));
                    }
                } else {
                    reject(new Error("商品データの取得に失敗しました"));
                }
            }
        );
    });
}
//↓直接fetch(CORSで無理)
// async function getItemBlob(downloadUrl) {
//     try {
//         const response = await fetch(downloadUrl);
//         if (!response.ok) throw new Error("ダウンロード失敗");
//         const blob = await response.blob();
//         return blob;
//     } catch (err) {
//         throw new Error("Blobの取得に失敗: " + err.message);
//     }
// }
//----------------------------------------------------------------------------

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

async function createZipArchive(productFileBlob, icoData, fileName) {
    const zip = new JSZip();
    zip.file(`boothThumbnail.ico`, icoData);//iconを追加
    // zip.file(`${itemName}.zip`, productFileBlob); // 商品ファイルを追加
    zip.file(fileName, productFileBlob); // 商品ファイルを追加
    zip.file("desktop.ini", `[.ShellClassInfo]\nIconResource=boothThumbnail.ico,0\n[ViewState]\nMode=\nVid=\nFolderType=Generic`);//desktop.iniを追加

    // return zip.generateAsync({ type: "blob" }).then(function (content) {
    //     saveAs(content, fileName);
    // });
    return zip.generateAsync({ type: "blob" });
}

async function downloadWithZip(downloadUrl, thumbnailUrl, fileName) {
    console.log("downloading...");
    try {
        // 商品ファイルをBlobとして取得
        const productFileBlob = await getItemBlob(downloadUrl);

        // サムネイル画像をBlobとして取得し、ICO形式に変換
        // const thumbnailElement = document.querySelector('.l-library-item-thumbnail');//ここ，今の実装だと先頭要素だけを取っているので変更の必要あり
        // if (!thumbnailElement) {
        //     throw new Error('サムネイル画像が見つかりません');
        // }
        // const thumbnailUrl = thumbnailElement.src;

        const imageData = await getThumbnail(thumbnailUrl);

        // ICO形式への変換 (ライブラリを使用することを推奨)

        // const icoData = await new Promise((resolve, reject) => {
        //     const canvas = document.createElement('canvas');
        //     const ctx = canvas.getContext('2d');
        //     const img = new Image();
        //     img.onload = () => {
        //         canvas.width = 300; // サムネイルのサイズに合わせて調整
        //         canvas.height = 300;
        //         ctx.drawImage(img, 0, 0);
        //         // CanvasからBlobを作成し、ICO形式として返す（簡易的な例）
        //         canvas.toBlob(blob => {
        //             resolve(blob);
        //         }, 'image/png'); // ICO形式は直接サポートされていないため、PNGで代替
        //     };
        //     img.onerror = reject;
        //     img.src = URL.createObjectURL(imageData);
        // });
        const icoData = await new Promise(async (resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = async () => {
                const size = 256; // ICO最大サイズ
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);

                // canvas から PNG Blob を作成
                canvas.toBlob(async (pngBlob) => {
                    if (!pngBlob) return reject("PNG blob generation failed");

                    const converter = new PngIcoConverter();
                    try {
                        const icoBlob = await converter.convertToBlobAsync([
                            { png: pngBlob }
                        ]);
                        resolve(icoBlob); // 正しい ICO 形式の Blob を返す
                    } catch (e) {
                        reject(e);
                    }
                }, 'image/png');
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(imageData); // imageData: Blob or File
        });


        // Zipアーカイブを作成
        const zipBlob = await createZipArchive(productFileBlob, icoData, fileName);

        // ダウンロード処理
        chrome.runtime.sendMessage({
            action: 'downloadZip',
            blobUrl: URL.createObjectURL(zipBlob),
            // filename: `${shopName}_${itemName}.zip`
            filename: fileName
        });
    } catch (error) {
        console.error('Zipアーカイブの作成またはダウンロード中にエラーが発生しました:', error);
    }
}

function createDownloadButton(shopName, itemName, itemUrlElement) {
    // ファイル名を生成
    // const fileName = `${sanitizeFileName(shopName)}_${sanitizeFileName(itemName)}.zip`;
    // const fileName = sanitizeFileName(`${shopName}_${itemName}.zip`);
    // console.log('ファイル名:', fileName);
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