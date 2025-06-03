import { DownloadTask } from './DownloadTask';

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
// ファイル名生成関数
function generateCustomFileName(settings, shopName, productItemName, assetName) {
    const parts = [];

    if (settings.namingRules?.includes("ショップ名")) {
        parts.push(shopName);
    }
    if (settings.namingRules?.includes("商品名")) {
        parts.push(productItemName);
    }
    if (settings.namingRules?.includes("ファイル名")) {
        parts.push(assetName);
    }

    return sanitizeFileName(parts.join('_'));
}

function generateFileNameFormatLabel(settings) {
    const parts = [];

    if (settings.namingRules?.includes("ショップ名")) {
        parts.push("ショップ名");
    }
    if (settings.namingRules?.includes("商品名")) {
        parts.push("商品名");
    }
    if (settings.namingRules?.includes("ファイル名")) {
        parts.push("ファイル名");
    }

    return parts.join('_');
}

function sanitizeFileName(name) {
    //使用不可な文字列を_で置換，拡張子を削除
    return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\.[^\.]+$/, '');
}

// HTMLテンプレートを読み込み、DOM要素として返す関数
async function loadUITemplate(templatePath) {
    try {
        const templateUrl = chrome.runtime.getURL(templatePath); //
        const response = await fetch(templateUrl); //
        if (!response.ok) {
            throw new Error(`Failed to fetch template '${templatePath}': ${response.statusText}`);
        }
        const htmlString = await response.text(); //
        const parser = new DOMParser(); //
        const doc = parser.parseFromString(htmlString, 'text/html'); //
        const templateNode = doc.querySelector('.bwi-custom-wrapper'); // テンプレートのルート要素を取得
        if (!templateNode) {
            throw new Error(`Root element '.bwi-custom-wrapper' not found in template '${templatePath}'`);
        }
        return templateNode.cloneNode(true); // クローンして返す (複数の場所で使う場合のため)
    } catch (error) {
        console.error('Error loading UI template:', error);
        return null;
    }
}

async function main() {
    //--------------Bootstrap icon追加----------------
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css";
    document.head.appendChild(link);
    //-------------------------------------------
    //get item container (e.g. contains thumbnail,assets)
    const productItemElements = document.querySelectorAll('.mb-16');
    for (productItemElement of productItemElements) {

        let shopName = "unknownShopName";//default
        let productItemName = "unknownItemName";//default

        //get thumbnailUrl
        const thumbnailUrl = productItemElement.querySelector('.l-library-item-thumbnail').src;

        //get author
        const shopNameElement = productItemElement.querySelector('.text-text-gray600');
        shopName = shopNameElement.textContent.trim().replace(/\s+/g, ' ');

        //get title
        const itemNameElement = productItemElement.querySelector('.text-text-default');
        productItemName = itemNameElement.textContent.trim().replace(/\s+/g, ' ');

        //load naming rule from storage
        const settings = await new Promise((resolve) => {
            chrome.storage.local.get(['namingRules'], resolve);
        });

        //get assets containers (e.g. contains hoge.zip,downloadlink)
        const assetContainerElements = productItemElement.querySelector('.mt-16').children;
        for (assetContainerElement of assetContainerElements) {//assetContainerは一つだけダウンロードボタンを持つ
            //get assetName(file name)
            const assetName = assetContainerElement.querySelector('.typography-14').textContent.trim();

            //get downloadUrl
            const downloadUrl = assetContainerElement.querySelector('a').href;
            // console.log(downloadUrl);

            //make fileName (+ remove ext from assetName)
            const customFileName = generateCustomFileName(settings, shopName, productItemName, assetName);

            // ▼▼▼ テンプレートからUIを読み込む ▼▼▼
            const customUiElement = await loadUITemplate('src/ui_template.html');
            if (!customUiElement) {
                console.error('Failed to load UI template for asset, skipping:', assetName);
                continue; // テンプレート読み込み失敗時はスキップ
            }
            // テンプレート内の各要素を取得
            const customDownloadButton = customUiElement.querySelector('.bwi-download-button');
            const mainTextSpan = customDownloadButton.querySelector('.bwi-main-text');
            const formatLabelElement = customDownloadButton.querySelector('.bwi-format-label');
            const progressBarWrapper = customUiElement.querySelector('.bwi-progress-wrapper');

            // フォーマットラベル設定
            const formatLabelText = `${generateFileNameFormatLabel(settings)}.zip`;
            formatLabelElement.textContent = formatLabelText;

            customDownloadButton.setAttribute('title', formatLabelText);//ボタンをホバー表示した際に命名規則を表示

            const task = new DownloadTask({
                customFileName,
                downloadUrl,
                thumbnailUrl,
                assetName,
                progressBarElement: progressBarWrapper
            });

            customDownloadButton.addEventListener('click', async () => { //
                customDownloadButton.disabled = true; //
                mainTextSpan.textContent = "Loading..."; //

                await task.start();

                // reset
                mainTextSpan.textContent = `サムネ付`;
                customDownloadButton.disabled = false;
            });

            // 既存のダウンロードリンクなどを内包するコンテナを探す
            const downloadActionsContainer = assetContainerElement.querySelector('.mt-8');
            if (downloadActionsContainer) {
                // このコンテナは既にflexコンテナなので、その子として追加すれば横に並ぶはず
                customUiElement.style.marginLeft = '16px'; // gap-16 に合わせてマージンを追加（またはCSSで）
                downloadActionsContainer.appendChild(customUiElement);
            } else {
                // フォールバック
                assetContainerElement.appendChild(customUiElement);
            }
        }
    }
}
main();