// import { forEach } from 'jszip';
import { downloadWithZip } from './module';

// function getItemUrl(itemUrlElement) {
//     const itemUrl = itemUrlElement ? itemUrlElement.href : 'Unknown';
//     if (itemUrlElement) {
//         // console.log('itemUrl:', itemUrl);
//     } else {
//         console.log('failed to get item url');
//     }
//     return itemUrl
// }

async function fetchItemInfo(item_url) {
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


// function createDownloadButton(shopName, itemName, itemUrlElement) {
//     //↓↓↓↓↓↓↓これ，そもそもitemCard単位でselectorAllして，そのitemCardElementの下でmt-16.childrenの中のdownloadLinkを得ないといけないのでは？
//     document.querySelectorAll('a[href*="/downloadables/"]').forEach(downloadLinkElement => {
//         const downloadUrl = downloadLinkElement ? downloadLinkElement.href : null;

//         //商品カードを取得
//         const productContainer = downloadLinkElement.closest('.mb-16.bg-white');
//         if (!productContainer) return;

//         //サムネイルのURLを取得
//         const thumbnailElement = productContainer.querySelector('.l-library-item-thumbnail');//ここ，今の実装だと先頭要素だけを取っているので変更の必要あり
//         if (!thumbnailElement) {
//             throw new Error('サムネイル画像が見つかりません');
//         }
//         const thumbnailUrl = thumbnailElement.src;

//         // 商品タイトルと作者名の抽出
//         const titleElement = productContainer.querySelector('.text-text-default');
//         const authorElement = productContainer.querySelector('.text-text-gray600');

//         if (!titleElement || !authorElement) return;
//         // ここ，サイトから商品名作ってるので404でも見た目はちゃんと見えてしまうが，DL時にエラーとなる
//         const title = titleElement.textContent.trim().replace(/\s+/g, ' ');
//         const author = authorElement.textContent.trim().replace(/\s+/g, ' ');
//         // ファイル名を生成
//         // const filename = `${author}_${title}.zip`;
//         const filename = `${author}_${title}`;

//         //--------ボタン挿入--------
//         const insertPointElements = productContainer.querySelector('.mt-16').children;
//         console.log(insertPointElements);
//         // ボタンをこのリンクの直後に追加（ファイル単位に追加）
//         for (const insertPointElement of insertPointElements) {//ファイルが複数ある場合に対応
//             // 既にカスタムボタンが追加されていればスキップ
//             if (insertPointElement.querySelector('.custom-dl-button')) continue;

//             //ボタン追加
//             const customButtonWrapper = document.createElement("div");
//             customButtonWrapper.className = "custom-dl-button-wrapper";

//             const customButtonElement = document.createElement('button');
//             customButtonElement.classList.add("text-wrap");
//             // customButton.classList.remove("text-nowrap");
//             // customButtonElement.textContent = `カスタムDL (${filename})`;
//             customButtonElement.textContent = `ダウンロード(サムネ付)`;
//             customButtonElement.className = 'btn btn-outline-primary custom-dl-button px-4 py-2 bg-blue-500 rounded text-sm';

//             customButtonElement.addEventListener('click', () => {
//                 console.log("click!");
//                 console.log('ファイル名:', filename);

//                 if (!downloadUrl) {
//                     console.error('ダウンロードURLが取得できていません');
//                     return;
//                 }
//                 //iconとファイルをまとめてDL(アイコン自動設定付き)
//                 downloadWithZip(downloadUrl, thumbnailUrl, sanitizeFileName(filename));
//             });

//             customButtonWrapper.appendChild(customButtonElement);//add btn
//             //progressBar
//             const progressBarElement = createProgressBar();
//             customButtonWrapper.appendChild(progressBarElement);//add progressBar

//             insertPointElement.appendChild(customButtonWrapper);
//         }
//     });
// }

function createDownloadButton() {
    //--------ボタン作成--------
    const customButtonElement = document.createElement('button');
    customButtonElement.classList.add("text-wrap");

    customButtonElement.textContent = `ダウンロード(サムネ付)`;
    // customButtonElement.className = 'btn btn-outline-primary custom-dl-button px-4 py-2 bg-blue-500 rounded text-sm';
    customButtonElement.className = 'btn btn-outline-primary';

    return customButtonElement;
}

//progressBar作ってElementを返すやつ
function createProgressBar() {
    //Wrapper
    const progressWrapperElement = document.createElement("div");
    progressWrapperElement.className = "progress";
    progressWrapperElement.style.height = "20px"; // 高さ調整（任意）
    progressWrapperElement.style.borderRadius = "10px"; // 外枠の角丸

    //progressBar
    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";
    progressBar.style.width = "70%";  // 進捗
    progressBar.style.backgroundColor = "#fc4d50"//booth theme color
    progressBar.style.borderRadius = "10px"; // 中身の角丸
    progressBar.textContent = "70%";

    progressWrapperElement.appendChild(progressBar);

    return progressWrapperElement
}

async function main() {
    //Bootstrap追加
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
    document.head.appendChild(link);//add bootstrap

    //new----------------------------------------

    //get item container (e.g. contains thumbnail,assets)
    const productItemElements = document.querySelectorAll('.mb-16');
    for (productItemElement of productItemElements) {
        console.log(productItemElement);

        let shopName = "unknownShopName";//default
        let productItemName = "unknownItemName";//default

        //get thumbnailUrl
        const thumbnailUrl = productItemElement.querySelector('.l-library-item-thumbnail').src;
        console.log(thumbnailUrl);

        //get author
        const shopNameElement = productItemElement.querySelector('.text-text-gray600');
        shopName = shopNameElement.textContent.trim().replace(/\s+/g, ' ');

        //get title
        const itemNameElement = productItemElement.querySelector('.text-text-default');
        productItemName = itemNameElement.textContent.trim().replace(/\s+/g, ' ');

        //get assets containers (e.g. contains hoge.zip,downloadlink)
        const assetContainerElements = productItemElement.querySelector('.mt-16').children;
        for (assetContainerElement of assetContainerElements) {//assetContainerは一つだけダウンロードボタンを持つ
            console.log(assetContainerElement);
            //get assetName
            const assetName = assetContainerElement.querySelector('.typography-14').textContent;

            //get downloadUrl
            const downloadUrl = assetContainerElement.querySelector('a').href;
            console.log(downloadUrl);

            //make fileName(後でフォーマット選べるようにする)
            const customFileName = sanitizeFileName(`${shopName}_${productItemName}`);

            //make customDownloadButton and progressBar;
            const customWrapper = document.createElement('div');
            const customDownloadButton = createDownloadButton();//要変更
            const progressBar = createProgressBar();

            //set function to customDownloadButton
            customDownloadButton.addEventListener('click', () => {
                console.log("click!");
                console.log('ファイル名:', customFileName);

                if (!downloadUrl) {
                    console.error('ダウンロードURLが取得できていません');
                    return;
                }
                //iconとファイルをまとめてDL(アイコン自動設定付き)
                downloadWithZip(customFileName, downloadUrl, thumbnailUrl, assetName);
            });

            //insert to assetContainer
            customWrapper.appendChild(customDownloadButton);
            customWrapper.appendChild(progressBar);
            assetContainerElement.appendChild(customWrapper);

            //↓↓↓.jsonからshopNameとitemName取ってくるやつ(注:この方法で取ったitemNameはバリエーション商品の区別が出来ない(桔梗用,マヌカ用,等))
            // try {
            //     const data = await fetchItemInfo(itemUrl + '.json');//Libraryから取れなければ.jsonから取る(ページが消えてたら無理)
            //     shopName = data.shop.name;
            //     itemName = data.name;
            // } catch (error) {
            //     console.warn(`(${i}) 商品情報の取得に失敗: ${itemUrl}.json`, error);
            //     console.warn('商品情報が取得できなかったのでデフォルト名を使用します', error);
            // } finally {
            //     console.log('ショップ名:', shopName);
            //     console.log('商品名:', itemName);
            //     // //DLボタン追加
            //     createDownloadButton(shopName, itemName, itemUrlElement);
            // }
        }
    }

    //-----------------------------------

    // const selector = "a.no-underline[href*='/items/']";//商品リンクを含む要素(aタグ)のセレクタ
    // const itemUrlElements = document.querySelectorAll(selector);//全件取得

    // document.head.appendChild(link);//add bootstrap
    // for (const [i, itemUrlElement] of itemUrlElements.entries()) {
    //     //商品ページのURL+.jsonから商品情報を取得
    //     console.log('ItemURL' + i, itemUrlElement.href);
    //     // const itemUrl = getItemUrl(itemUrlElement) ? getItemUrl(itemUrlElement) : null;
    //     const itemUrl = getItemUrl(itemUrlElement);
    //     if (!itemUrl) continue;
    //     let shopName = "unknownShopName";//default
    //     let itemName = "unknownItemName";//default
    //     try {
    //         const data = await fetchItemInfo(itemUrl + '.json');
    //         shopName = data.shop.name;
    //         itemName = data.name;
    //     } catch (error) {
    //         console.warn(`(${i}) 商品情報の取得に失敗: ${itemUrl}.json`, error);
    //         console.warn('商品情報が取得できなかったのでデフォルト名を使用します', error);
    //     } finally {
    //         console.log('ショップ名:', shopName);
    //         console.log('商品名:', itemName);
    //         // //DLボタン追加
    //         createDownloadButton(shopName, itemName, itemUrlElement)
    //     }
    // }
}
main();