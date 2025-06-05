document.addEventListener('DOMContentLoaded', async () => {
    // --- popup.htmlでのみ実行される処理 ---
    if (document.body.id === 'popup-page') {
        const namingRuleCheckboxes = document.querySelectorAll('.form-check-input[id^="namingRule"]');
        // 設定を読み込む
        chrome.storage.local.get(['namingRules'], (result) => {
            const namingRules = result.namingRules || [];
            // if (namingRules.length === 0) {
            //     namingRules = ['ファイル名']; // デフォルトで「ファイル名」を設定
            //     chrome.storage.local.set({ namingRules });// このデフォルト値をストレージにも保存する（任意だが、次回読み込み時の一貫性のため推奨）
            // }
            // UIに反映
            document.getElementById('namingRuleShopProduct').checked = namingRules.includes('ショップ名');
            document.getElementById('namingRuleProductName').checked = namingRules.includes('商品名');
            document.getElementById('namingRuleFileName').checked = namingRules.includes('ファイル名');
        });

        // ファイル命名規則の変更イベントで保存
        // document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        namingRuleCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                let namingRules = [];
                if (document.getElementById('namingRuleShopProduct').checked) namingRules.push('ショップ名');
                if (document.getElementById('namingRuleProductName').checked) namingRules.push('商品名');
                if (document.getElementById('namingRuleFileName').checked) namingRules.push('ファイル名');
                if (namingRules.length === 0) {
                    namingRules.push('ファイル名');
                    document.getElementById('namingRuleFileName').checked = true; // UIにも反映
                }
                chrome.storage.local.set({ namingRules });
            });
        });
    }
    // --- options.htmlでのみ実行される処理 ---
    if (document.body.id === 'options-page') {
        const includeItemPageLinkCheckbox = document.getElementById('includeItemPageLink');

        // 設定を読み込む
        chrome.storage.local.get(['includeItemPageLink'], (result) => {
            // 未設定(undefined)の場合はtrue（チェックを入れる）として扱う
            includeItemPageLinkCheckbox.checked = result.includeItemPageLink !== false;
        });

        // 変更イベントで保存
        includeItemPageLinkCheckbox.addEventListener('change', () => {
            chrome.storage.local.set({ includeItemPageLink: includeItemPageLinkCheckbox.checked });
        });
    }
    // --- 共通の処理 ---
    const applyBtn = document.getElementById('applySettingsBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.reload(tabs[0].id); // アクティブなタブをリロード
                }
            });
        });
    }
});
// document.getElementById('applySettingsBtn').addEventListener('click', () => {
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//         if (tabs[0]?.id) {
//             chrome.tabs.reload(tabs[0].id); // アクティブなタブをリロード
//         }
//     });
// });