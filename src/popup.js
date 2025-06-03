document.addEventListener('DOMContentLoaded', async () => {
    // 設定を読み込む
    chrome.storage.local.get(['namingRules', 'includeIcon'], (result) => {
        const namingRules = result.namingRules || [];
        if (namingRules.length === 0) {
            namingRules = ['ファイル名']; // デフォルトで「ファイル名」を設定
            // このデフォルト値をストレージにも保存する（任意だが、次回読み込み時の一貫性のため推奨）
            chrome.storage.local.set({ namingRules });
        }
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
            if (namingRules.length === 0) {
                namingRules.push('ファイル名');
                document.getElementById('namingRuleFileName').checked = true; // UIにも反映
            }
            chrome.storage.local.set({
                namingRules
            });
        });
    });
    // // フォルダ名表示
    // const folderDisplay = document.getElementById('selectedFolderName');
    // const handleIdbKey = 'folderHandle'; // 保存キー

    // const folderName = await getFolderNameFromStorage();
    // folderDisplay.textContent = folderName ? `📁 ${folderName}` : '（未選択）';
});
document.getElementById('applySettingsBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.reload(tabs[0].id); // アクティブなタブをリロード
        }
    });
});

// let selectedDirectoryHandle = null;

// document.addEventListener('DOMContentLoaded', () => {
//     const folderPickerBtn = document.getElementById('folderPicker');
//     const folderNameDisplay = document.getElementById('selectedFolderName');
//     const fetchIconBtn = document.getElementById('fetchIconBtn');

//     folderPickerBtn.addEventListener('click', async () => {
//         try {
//             // showDirectoryPicker は File System Access API（新しいAPI）
//             selectedDirectoryHandle = await window.showDirectoryPicker();

//             // フォルダ名を画面に表示
//             folderNameDisplay.textContent = `選択されたフォルダ: ${selectedDirectoryHandle.name}`;

//             // ボタンを有効化
//             fetchIconBtn.disabled = false;

//         } catch (err) {
//             if (err.name === 'AbortError') {
//                 console.log("フォルダ選択がキャンセルされました");
//                 console.log(err);
//             } else {
//                 console.error("フォルダ選択エラー:", err);
//                 folderNameDisplay.textContent = '❌ フォルダ選択に失敗しました';
//                 fetchIconBtn.disabled = true;
//             }
//         }
//     });

//     //fetchIconBtn のクリック処理
//     fetchIconBtn.addEventListener('click', async () => {
//         const urlInput = document.getElementById('shopUrl').value.trim();
//         if (!urlInput || !selectedDirectoryHandle) {
//             alert("URLとフォルダを選択してください");
//             return;
//         }
//         try {
//             const thumbnailBlob = await fetchThumbnail(urlInput);
//             const icoBlob = await convertPngToIcon(thumbnailBlob);

//             const desktopIniContent = await loadLocalFile('desktop.ini');
//             const batContent = await loadLocalFile('setIcon.bat');

//             await saveToFolder(selectedDirectoryHandle, "boothThumbnail.ico", icoBlob);
//             await saveToFolder(selectedDirectoryHandle, "desktop.ini", new Blob([desktopIniContent], { type: 'text/plain' }));
//             await saveToFolder(selectedDirectoryHandle, "setIcon.bat", new Blob([batContent], { type: 'text/plain' }));

//             alert("フォルダに3ファイルを保存しました！");
//         } catch (err) {
//             console.error("保存中にエラー:", err);
//             alert("保存に失敗しました");
//         }
//     });
// });

// async function loadLocalFile(filename) {
//     const url = chrome.runtime.getURL(`static/${filename}`);
//     const response = await fetch(url);
//     if (!response.ok) throw new Error(`${filename} の読み込みに失敗しました`);
//     return await response.text();
// }

// async function getFolderNameFromStorage() {
//     const stored = await chrome.storage.local.get('folderHandle');
//     if (!stored.folderHandle) return null;

//     try {
//         const handle = await window.showDirectoryPicker({ startIn: stored.folderHandle });
//         return handle.name;
//     } catch (e) {
//         return null;
//     }
// }

// async function fetchThumbnail(thumbnailUrl) {
//     return new Promise((resolve, reject) => {
//         chrome.runtime.sendMessage(
//             {
//                 action: "fetchThumbnail",
//                 url: thumbnailUrl
//             },
//             (response) => {
//                 if (response && response.data) {
//                     // ArrayBuffer を受け取った前提で Blob に変換
//                     const byteArray = new Uint8Array(response.data);
//                     const blob = new Blob([byteArray]);
//                     resolve(blob);
//                 } else {
//                     reject(new Error("商品データの取得に失敗しました"));
//                 }
//             }
//         );
//     });
// }

// async function convertPngToIcon(thumbnailBlob) {
//     try {
//         // PNG画像をCanvasに描画
//         const canvas = document.createElement('canvas');
//         const ctx = canvas.getContext('2d');
//         const size = 256; // ICO最大サイズ
//         canvas.width = size;
//         canvas.height = size;

//         // 画像の読み込みと描画を待機
//         await new Promise((resolve, reject) => {
//             const img = new Image();
//             img.onload = () => {
//                 ctx.drawImage(img, 0, 0, size, size);
//                 // メモリリークを防止
//                 URL.revokeObjectURL(img.src);
//                 resolve();
//             };
//             img.onerror = (e) => reject(new Error(`failed to load thumbnail : ${e}`));
//             img.src = URL.createObjectURL(thumbnailBlob);
//         });

//         // CanvasからPNG Blobを生成
//         const pngBlob = await new Promise((resolve, reject) => {
//             canvas.toBlob((blob) => {
//                 if (!blob) reject(new Error("failed to generate PNG blob"));
//                 else resolve(blob);
//             }, 'image/png');
//         });

//         // PNG BlobをICO形式に変換
//         const converter = new PngIcoConverter();
//         const icoBlob = await converter.convertToBlobAsync([{ png: pngBlob }]);

//         return icoBlob;
//     } catch (error) {
//         console.error("failed to converting .ico : ", error);
//         throw error;
//     }
// }