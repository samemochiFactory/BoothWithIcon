import $ from 'jquery'

console.log("Popup loaded!");
// document.getElementById('fetchIconBtn').addEventListener('click',function () {
//     const url = document.getElementById('shopUrl').value.trim();
//     if (!url) {
//         alert("URLを入力してください");
//         return;
//     }

//     // TODO: URLを元にアイコンを取得してzip生成など
//     console.log("Fetching icon for:", url);
// });

// localStorageから設定を読み込む関数
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('settings') || '{"namingRules": [], "includeIcon": true}');
    $('#namingRuleShopProduct').prop('checked', settings.namingRules.includes('ショップ名'));
    $('#namingRuleProductName').prop('checked', settings.namingRules.includes('商品名'));
    $('#namingRuleFileName').prop('checked', settings.namingRules.includes('ファイル名'));
    $('#includeIcon').prop('checked', settings.includeIcon);
}

// 設定を保存する関数
function saveSettings() {
    const namingRules = [];
    $('input[type="checkbox"][id^="namingRule"]:checked').each(function () {
        namingRules.push($(this).val());
    });
    const includeIcon = $('#includeIcon').prop('checked');

    localStorage.setItem('settings', JSON.stringify({
        "namingRules": namingRules,
        "includeIcon": includeIcon
    }));
}

// ページロード時に設定を読み込む
loadSettings();

// チェックボックスの状態が変更されたときに設定を保存する
$('input[type="checkbox"]').on('change', saveSettings);
