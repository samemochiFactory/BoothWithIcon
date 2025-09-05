import { DownloadTask } from './DownloadTask';

// async function fetchItemInfo(itemPageUrl) {
//     return new Promise((resolve, reject) => {
//         chrome.runtime.sendMessage(
//             {
//                 action: "fetchItemInfo", url: itemPageUrl
//             }, (response) => {
//                 if (response && response.data) {
//                     resolve(response.data);
//                 } else if (response && response.error) {
//                     reject(new Error(response.error));
//                 } else {
//                     reject(new Error("商品データの取得に失敗しました"));
//                     //ここ，商品ページが消えてると404返る
//                 }
//             });
//     });
// }

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

// async function processItemPage(settings) {
//     console.log("商品ページを処理します。");

//     // 無料商品か判定（「無料ダウンロード」ボタンの存在でチェック）
//     const freeDownloadButton = document.querySelector('.variation-cart a.add-cart.full-length');
//     if (!freeDownloadButton) {
//         console.log("無料ダウンロード対象の商品ではありません。");
//         return;
//     }

//     // --- 情報取得 ---
//     const productItemName = document.querySelector('header h2.font-bold')?.textContent.trim() || "unknownItemName";
//     const shopNameElement = document.querySelector('header a[href*=".booth.pm/"] span');
//     const shopName = shopNameElement ? shopNameElement.textContent.trim() : "unknownShopName";

//     // サムネイルは最初の1枚を使用
//     const firstImage = document.querySelector('img.market-item-detail-item-image');
//     const thumbnailUrl = firstImage?.dataset.origin || firstImage?.src || '';

//     const assetName = freeDownloadButton.getAttribute('title') || "unknownAsset";
//     const downloadUrl = freeDownloadButton.href;
//     const itemPageUrl = window.location.href;

//     // --- カスタムUIの生成と挿入 ---
//     const customFileName = generateCustomFileName(settings, shopName, productItemName, assetName);
//     const customUiElement = await loadUITemplate('src/item_page_ui_template.html');
//     if (!customUiElement) return;

//     // UI設定
//     const customDownloadButton = customUiElement.querySelector('.bwi-download-button');
//     const formatLabelElement = customUiElement.querySelector('.bwi-format-label');
//     const formatLabelText = `${generateFileNameFormatLabel(settings)}.zip`;
//     formatLabelElement.textContent = formatLabelText;
//     customDownloadButton.setAttribute('title', formatLabelText);

//     // DownloadTaskのインスタンス化
//     const task = new DownloadTask({
//         customFileName: customFileName,
//         downloadUrl: downloadUrl,
//         thumbnailUrl: thumbnailUrl,
//         itemPageUrl: itemPageUrl,
//         assetName: assetName,
//         customUiElement: customUiElement
//     });

//     customDownloadButton.addEventListener('click', () => task.start());

//     // 元のダウンロードボタンの親要素にカスタムUIを追加
//     const cartContainer = document.querySelector('.variation-cart');
//     if (cartContainer) {
//         cartContainer.style.display = 'flex';
//         cartContainer.appendChild(customUiElement);
//     }
// }

async function processItemPage(settings) {
    console.log("商品ページを処理します。");

    // --- ページ共通の情報を取得 ---
    const productItemName = document.querySelector('header h2.font-bold')?.textContent.trim() || "unknownItemName";
    const shopNameElement = document.querySelector('header a[href*=".booth.pm/"] span');
    const shopName = shopNameElement ? shopNameElement.textContent.trim() : "unknownShopName";
    const itemPageUrl = window.location.href;

    // --- サムネイルURLの取得 (動画スライドを考慮) ---
    let thumbnailUrl = '';
    const firstSlide = document.querySelector('.primary-image-area .slick-slide[data-slick-index="0"]');
    let imageElement = null;

    // 最初のスライドが動画(iframe)かどうかをチェック
    if (firstSlide && firstSlide.querySelector('iframe')) {
        // 動画の場合、2枚目のスライド(data-slick-index="1")をサムネイルとして使用
        console.log("動画を検知したため、2枚目の画像をサムネイルとします。");
        imageElement = document.querySelector('.primary-image-area .slick-slide[data-slick-index="1"] .market-item-detail-item-image');
    } else {
        // 動画でない場合、1枚目のスライドをサムネイルとして使用
        imageElement = document.querySelector('.primary-image-area .slick-slide[data-slick-index="0"] .market-item-detail-item-image');
    }

    // 取得した画像要素からURLを決定
    if (imageElement) {
        thumbnailUrl = imageElement.dataset.origin || imageElement.src;
    } else {
        // 上記のロジックで画像が見つからない場合のフォールバック
        const fallbackImage = document.querySelector('.market-item-detail-item-image');
        thumbnailUrl = fallbackImage?.dataset.origin || fallbackImage?.src || '';
    }

    // --- 無料ダウンロード可能な全項目を処理 ---
    const variationItems = document.querySelectorAll('.variation-item');
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.marginBottom = '16px';

    for (const item of variationItems) {
        const freeDownloadButton = item.querySelector('a.add-cart.full-length');
        const priceText = item.querySelector('.variation-price')?.textContent.trim();
        if (!freeDownloadButton || priceText !== '¥ 0') {
            continue;
        }

        // ★★★ 修正箇所: querySelectorAllを使い、item内の全ての無料ダウンロードボタンを取得 ★★★
        const freeDownloadButtons = item.querySelectorAll('.variation-cart a.add-cart.full-length');

        // ★★★ 修正箇所: 取得した各ボタンに対して処理を行うループを追加 ★★★
        for (const freeDownloadButton of freeDownloadButtons) {
            const assetName = freeDownloadButton.getAttribute('title') || "unknownAsset";
            const downloadUrl = freeDownloadButton.href;

            const customFileName = generateCustomFileName(settings, shopName, productItemName, assetName);
            const customUiElement = await loadUITemplate('src/item_page_ui_template.html');
            if (!customUiElement) continue;

            const customDownloadButton = customUiElement.querySelector('.bwi-download-button');
            const productNameLabel = customUiElement.querySelector('.bwi-product-name');
            const formatLabelElement = customUiElement.querySelector('.bwi-format-label');

            // 新しく追加した要素に「商品名」を設定
            if (productNameLabel) {
                productNameLabel.textContent = assetName; // ここではアセット名（ファイル名）を表示
            }

            // フォーマットラベルには命名規則の形式を表示
            if (formatLabelElement) {
                const formatLabelText = `( ${generateFileNameFormatLabel(settings)}.zip )`;
                formatLabelElement.textContent = formatLabelText;
            }
            customDownloadButton.setAttribute('title', `保存名: ${customFileName}.zip`);

            const task = new DownloadTask({
                customFileName,
                downloadUrl,
                thumbnailUrl,
                itemPageUrl,
                assetName,
                customUiElement
            });

            customDownloadButton.addEventListener('click', () => task.start());
            buttonsContainer.appendChild(customUiElement);
        }
    }

    // --- 生成したカスタムボタン群をページに挿入 ---
    if (buttonsContainer.hasChildNodes()) {
        const variationsList = document.getElementById('variations');
        if (variationsList) {
            variationsList.parentNode.insertBefore(buttonsContainer, variationsList);
        }
    } else {
        console.log("無料ダウンロード対象の商品が見つかりませんでした。");
    }
}

async function processLibraryPage(settings) {
    const productItemElements = document.querySelectorAll('.mb-16');//get item container (e.g. contains thumbnail,assets)
    for (productItemElement of productItemElements) {
        //get author
        const shopNameElement = productItemElement.querySelector('.text-text-gray600');
        const shopName = shopNameElement ? shopNameElement.textContent.trim().replace(/\s+/g, ' ') : "unknownShopName";
        console.log("shopName:", shopName);
        //get title
        const itemNameElement = productItemElement.querySelector('.text-text-default');
        productItemName = itemNameElement ? itemNameElement.textContent.trim().replace(/\s+/g, ' ') : "unknownItemName";
        console.log("productItemName:", productItemName);
        //get item page url
        const itemPageUrlElement = productItemElement.querySelector('a[href*="/items/"]');
        const itemPageUrl = itemPageUrlElement ? itemPageUrlElement.href : '';
        // 取得できたか確認
        if (itemPageUrl) {
            console.log("取得した商品ページURL:", itemPageUrl);
        } else {
            console.warn("商品ページのURLが見つかりませんでした。");
        }
        //get thumbnailUrl
        const thumbnailUrl = productItemElement.querySelector('.l-library-item-thumbnail').src;
        //itemPage.jsonを取得する(今のとこ不要．ページロード時に一気に動かすとサーバーに負荷をかけるので，ボタンを押した時のみにする．)
        // if (itemPageUrl) {
        //     const itemInfo = await fetchItemInfo(itemPageUrl + '.json');
        //     console.log(itemInfo)
        // }
        const assetContainerElements = productItemElement.querySelector('.mt-16')?.children || [];//get assets containers (e.g. contains hoge.zip,downloadlink)
        for (assetContainerElement of assetContainerElements) {//assetContainerは一つだけダウンロードボタンを持つ
            // const assetName = assetContainerElement.querySelector('.typography-14')?.textContent.trim() || '';//file name
            const assetName = assetContainerElement.querySelector('.text-14')?.textContent.trim() || '';//file name
            const downloadUrl = assetContainerElement.querySelector('a')?.href || '';
            if (!assetName || !downloadUrl) continue;

            const customFileName = generateCustomFileName(settings, shopName, productItemName, assetName);
            const customUiElement = await loadUITemplate('src/ui_template.html');
            if (!customUiElement) {
                console.error('Failed to load UI template for asset, skipping:', assetName);
                continue; // テンプレート読み込み失敗時はスキップ
            }
            const customDownloadButton = customUiElement.querySelector('.bwi-download-button');// テンプレート内の各要素を取得
            const formatLabelElement = customDownloadButton.querySelector('.bwi-format-label');
            const formatLabelText = `${generateFileNameFormatLabel(settings)}.zip`;// フォーマットラベル設定
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

            customDownloadButton.addEventListener('click', async () => await task.start());

            const downloadActionsContainer = assetContainerElement.querySelector('.mt-8');// 既存のダウンロードリンクなどを内包するコンテナを探す
            if (downloadActionsContainer) {
                // console.log("ダウンロードコンテナ発見！");
                downloadActionsContainer.appendChild(customUiElement);// このコンテナは既にflexコンテナなので、その子として追加すれば横に並ぶはず
            } else {
                // console.log("ダウンロードコンテナが見つかりません！");
                assetContainerElement.appendChild(customUiElement);// フォールバック
            }
        }
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
    const settings = await new Promise((resolve) => {// 設定を読み込む
        chrome.storage.local.get(['namingRules'], resolve);
    });
    console.log(`namingRules is loaded > ${settings.namingRules}`);

    // URLに応じて処理を分岐
    const currentUrl = window.location.href;
    // const isItemPage = currentUrl.match(/https:\/\/booth\.pm\/[^/]+\/items\/\d+/);
    const isItemPage = currentUrl.match(/^https:\/\/(?:[a-zA-Z0-9-]+\.)?booth\.pm\/.*items\/\d+/);
    console.log(`isItemPage:${isItemPage}`);
    console.log(`currentUrl:${currentUrl}`);
    if (currentUrl.includes('accounts.booth.pm/library')) {
        console.log("processLibraryPage");
        await processLibraryPage(settings);
        // } else if (currentUrl.match(/booth\.pm\/(ja|en|ko)\/items\/\d+/)) {
    } else if (isItemPage) {
        console.log("processItemPage");
        await processItemPage(settings);
    }
}
main();