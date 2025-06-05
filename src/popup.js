document.addEventListener('DOMContentLoaded', async () => {
    // 設定を読み込む
    chrome.storage.local.get(['namingRules'], (result) => {
        const namingRules = result.namingRules || [];
        if (namingRules.length === 0) {
            namingRules = ['ファイル名']; // デフォルトで「ファイル名」を設定
            // このデフォルト値をストレージにも保存する（任意だが、次回読み込み時の一貫性のため推奨）
            chrome.storage.local.set({ namingRules });
        }
        document.getElementById('namingRuleShopProduct').checked = namingRules.includes('ショップ名');
        document.getElementById('namingRuleProductName').checked = namingRules.includes('商品名');
        document.getElementById('namingRuleFileName').checked = namingRules.includes('ファイル名');
    });

    // 変更イベントで保存
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const namingRules = [];
            if (document.getElementById('namingRuleShopProduct').checked) namingRules.push('ショップ名');
            if (document.getElementById('namingRuleProductName').checked) namingRules.push('商品名');
            if (document.getElementById('namingRuleFileName').checked) namingRules.push('ファイル名');
            if (namingRules.length === 0) {
                namingRules.push('ファイル名');
                document.getElementById('namingRuleFileName').checked = true; // UIにも反映
            }
            chrome.storage.local.set({
                namingRules
            });
        });
    });
});
document.getElementById('applySettingsBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.reload(tabs[0].id); // アクティブなタブをリロード
        }
    });
});