// document.getElementById('selectFolderBtn').addEventListener('click', async () => {
//     try {
//         const folderHandle = await window.showDirectoryPicker();

//         // 永続化トークンを保存（serialize 不可なので IDB APIでラップ必要）
//         const granted = await verifyPermission(folderHandle);
//         if (!granted) {
//             alert("フォルダへのアクセス権限が許可されませんでした。");
//             return;
//         }

//         // 保存
//         await chrome.storage.local.set({ folderHandle });
//         document.getElementById('folderResult').textContent = `✅ 選択済み: ${folderHandle.name}`;
//     } catch (err) {
//         console.error("フォルダ選択に失敗:", err);
//         document.getElementById('folderResult').textContent = '❌ 選択失敗';
//     }
// });

// async function verifyPermission(handle) {
//     const options = { mode: 'readwrite' };
//     if ((await handle.queryPermission(options)) === 'granted') return true;
//     if ((await handle.requestPermission(options)) === 'granted') return true;
//     return false;
// }
document.getElementById('selectFolderBtn').addEventListener('click', async () => {
    try {
        const folderHandle = await window.showDirectoryPicker();

        // 永続化トークンを保存（serialize 不可なので IDB APIでラップ必要）
        const granted = await verifyPermission(folderHandle);
        if (!granted) {
            alert("フォルダへのアクセス権限が許可されませんでした。");
            return;
        }

        // フォルダ名のみを保存（ハンドルオブジェクトではなく）
        const folderInfo = {
            name: folderHandle.name,
            timestamp: Date.now()
        };

        await chrome.storage.local.set({ folderInfo });

        // グローバル変数としてハンドルを保持
        window.currentFolderHandle = folderHandle;

        document.getElementById('folderResult').textContent = `✅ 選択済み: ${folderHandle.name}`;

        // 実行ボタンを有効化
        document.getElementById('executeBtn').disabled = false;

    } catch (err) {
        if (err.name === 'AbortError') {
            // ユーザーがキャンセルした場合
            console.log("フォルダ選択がキャンセルされました");
            document.getElementById('folderResult').textContent = '📁 未選択（キャンセルされました）';
        } else {
            // その他のエラー
            console.error("フォルダ選択に失敗:", err);
            document.getElementById('folderResult').textContent = '❌ 選択失敗: ' + err.message;
        }
    }
});

// ページ読み込み時に保存された情報を復元
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const result = await chrome.storage.local.get(['folderInfo']);
        if (result.folderInfo) {
            document.getElementById('folderResult').textContent =
                `📁 前回選択: ${result.folderInfo.name} (※再選択が必要)`;
        }
    } catch (err) {
        console.error("保存データの読み込みに失敗:", err);
    }
});

async function verifyPermission(handle) {
    const options = { mode: 'readwrite' };
    if ((await handle.queryPermission(options)) === 'granted') return true;
    if ((await handle.requestPermission(options)) === 'granted') return true;
    return false;
}