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

async function fetchItemInfo(itemPageUrl) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                action: "fetchItemInfo", url: itemPageUrl
            }, (response) => {
                if (response && response.data) {
                    resolve(response.data);
                } else if (response && response.error) {
                    reject(new Error(response.error));
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
    //Bootstrap icon追加
    //=====================================================
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css";
    document.head.appendChild(link);
    //=====================================================

    // 設定を読み込む
    //=====================================================
    //命名規則
    // chrome.storage.local.get(['namingRules'], (result) => {
    //     let namingRules = result.namingRules || [];
    //     if (namingRules.length === 0) {
    //         console.log("namingRules is undefined");
    //         namingRules = ['ファイル名']; // デフォルトで「ファイル名」を設定
    //         chrome.storage.local.set({ namingRules });// このデフォルト値をストレージにも保存する（任意だが、次回読み込み時の一貫性のため推奨）
    //     }
    // });
    // //再読み込み
    const settings = await new Promise((resolve) => {
        chrome.storage.local.get(['namingRules'], resolve);
    });
    console.log(`namingRules is loaded > ${settings.namingRules}`);
    // //商品ページへのショートカットを含めるか
    // const optionSettingsResult = await new Promise((resolve) => {
    //     chrome.storage.local.get(['includeItemPageLink'], resolve);
    // });
    // const includeItemPageLink = optionSettingsResult.includeItemPageLink !== false;
    // if (includeItemPageLink === undefined) {
    //     chrome.storage.local.set({ includeItemPageLink: true });// 未設定(undefined)の場合はデフォルト値(true)を設定
    // }
    //=====================================================

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

        //get item page url
        //=====================================================
        let itemPageUrl = '';
        const itemPageUrlElement = productItemElement.querySelector('a[href*="/items/"]');
        if (itemPageUrlElement) {
            // 念のため、より厳密な正規表現で最終確認（任意）
            // if (itemPageUrlElement.href.match(/^https:\/\/[\w-]+\.booth\.pm(\/ja)?\/items\/\d+$/)) {
            if (itemPageUrlElement.href.match(/^https:\/\/booth\.pm\/[^/]+\/items\/\d+$/)) {
                itemPageUrl = itemPageUrlElement.href;
            }
        }
        // 取得できたか確認
        if (itemPageUrl) {
            console.log("取得した商品ページURL:", itemPageUrl);
        } else {
            console.warn("商品ページのURLが見つかりませんでした。");
        }
        //=====================================================
        //itemPage.jsonを取得する(今のとこ不要．ページロード時に一気に動かすとサーバーに負荷をかけるので，ボタンを押した時のみにする．)
        // if (itemPageUrl) {
        //     const itemInfo = await fetchItemInfo(itemPageUrl + '.json');
        //     console.log(itemInfo)
        // }

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
            // const mainTextSpan = customDownloadButton.querySelector('.bwi-main-text');
            const formatLabelElement = customDownloadButton.querySelector('.bwi-format-label');
            // const progressBarWrapper = customUiElement.querySelector('.bwi-progress-wrapper');

            // フォーマットラベル設定
            const formatLabelText = `${generateFileNameFormatLabel(settings)}.zip`;
            formatLabelElement.textContent = formatLabelText;

            customDownloadButton.setAttribute('title', formatLabelText);//ボタンをホバー表示した際に命名規則を表示

            const task = new DownloadTask({
                customFileName: customFileName,
                downloadUrl: downloadUrl,
                thumbnailUrl: thumbnailUrl,
                itemPageUrl: itemPageUrl,
                assetName: assetName,
                customUiElement: customUiElement
            });

            customDownloadButton.addEventListener('click', async () => { //
                await task.start();
            });

            // 既存のダウンロードリンクなどを内包するコンテナを探す
            const downloadActionsContainer = assetContainerElement.querySelector('.mt-8');
            if (downloadActionsContainer) {
                // このコンテナは既にflexコンテナなので、その子として追加すれば横に並ぶはず
                downloadActionsContainer.appendChild(customUiElement);
            } else {
                // フォールバック
                assetContainerElement.appendChild(customUiElement);
            }
        }
    }
}
main();