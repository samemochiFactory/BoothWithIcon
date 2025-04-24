// JSZipライブラリをインポート（manifest.jsonにJSZipを追加）
import { downloadWithZip } from './module';

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

function sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_');
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