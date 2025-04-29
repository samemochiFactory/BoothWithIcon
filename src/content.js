import { downloadWithZip } from './module_v2';

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
    //add id to Wrapper
    progressWrapperElement.id = crypto.randomUUID();
    console.log("progressBarId : ", progressWrapperElement.id);

    //progressBar
    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";
    progressBar.ariaValueMax = "100";
    progressBar.ariaValueMin = "0";
    progressBar.style.width = "0%";  // 進捗
    progressBar.style.backgroundColor = "#fc4d50"//booth theme color
    progressBar.style.borderRadius = "10px"; // 中身の角丸
    progressBar.textContent = "";
    progressBar.ariaValueNow = '50';

    progressWrapperElement.appendChild(progressBar);

    const progressListener = (message) => {
        if ((message.action === "receiveChunk") && (message.progressBarId === progressWrapperElement.id)) {
            const progress = Math.round(100 * ((message.chunkIndex + 1) / message.totalChunks));
            progressBar.textContent = `${progress}%`;
            progressBar.style.width = `${progress}%`;
        }
    }
    chrome.runtime.onMessage.addListener(progressListener);

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
            console.log("progressBarId in main : ", progressBar.id);

            //set function to customDownloadButton
            customDownloadButton.addEventListener('click', () => {
                console.log("click!");
                console.log('ファイル名:', customFileName);

                if (!downloadUrl) {
                    console.error('ダウンロードURLが取得できていません');
                    return;
                }
                //iconとファイルをまとめてDL(アイコン自動設定付き)
                downloadWithZip(customFileName, downloadUrl, thumbnailUrl, assetName, progressBar.id);
            });

            //WIP
            //----------------------------------------------------------------
            //ここでクラスをインスタンス化する．
            // const task = new DownloadTask({//ダウンロードとprogressBarを管理するclass
            //     downloadUrl, thumbnailUrl, assetName,
            //     filename: customFileName,
            // });
            // customDownloadButton.addEventListener('click', () => {
            //     task.start();
            // });
            //----------------------------------------------------------------

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