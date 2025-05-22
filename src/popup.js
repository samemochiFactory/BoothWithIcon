// console.log("Popup loaded!");

document.addEventListener('DOMContentLoaded', () => {
    // 設定を読み込む
    chrome.storage.local.get(['namingRules', 'includeIcon'], (result) => {
        const namingRules = result.namingRules || [];
        // const includeIcon = result.includeIcon ?? true;

        document.getElementById('namingRuleShopProduct').checked = namingRules.includes('ショップ名');
        document.getElementById('namingRuleProductName').checked = namingRules.includes('商品名');
        document.getElementById('namingRuleFileName').checked = namingRules.includes('ファイル名');
        // document.getElementById('includeIcon').checked = includeIcon;
    });

    // 変更イベントで保存
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const namingRules = [];
            if (document.getElementById('namingRuleShopProduct').checked) namingRules.push('ショップ名');
            if (document.getElementById('namingRuleProductName').checked) namingRules.push('商品名');
            if (document.getElementById('namingRuleFileName').checked) namingRules.push('ファイル名');
            // const includeIcon = document.getElementById('includeIcon').checked;

            chrome.storage.local.set({
                namingRules
                // ,
                // includeIcon
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