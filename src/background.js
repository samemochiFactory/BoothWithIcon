
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'download') {
        //商品をDLするときに使われる
        console.log("filename:", message.filename);
        console.log("url:", message.url);
        chrome.downloads.download({
            url: message.url,
            filename: message.filename,
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('Download error:', chrome.runtime.lastError);
            } else {
                console.log('Download started:', downloadId);
            }
        });
    }
    if (message.action === "fetchItemInfo") {
        //商品ページ.jsonを取得するときに使われる
        console.log("fetchItemInfo");
        console.log(message.url);
        fetch(message.url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`レスポンスステータス: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                sendResponse({ data });
            })
            .catch(error => {
                console.error("フェッチエラー:", error);
                console.error("error url:", message.url)
                sendResponse({ error: error.message });
            });

        return true; // 非同期応答のためにtrueを返す
    }
    if (message.action === "fetchItem") {
        //商品データを取得するときに使われる
        console.log("fetchItem");
        console.log(message.url);
        fetch(message.url)
            .then(response => {
                console.log("レスポンスステータス:", response.status);
                if (!response.ok) {
                    throw new Error(`レスポンスステータス: ${response.status}`);
                }
                return response.arrayBuffer();
            })
            .then(arrayBuffer => {
                // if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                //     throw new Error('取得した商品データが空または無効です');
                // }
                // sendResponse({ data: Array.from(new Uint8Array(arrayBuffer)) });
                console.log("arrayBuffer:", arrayBuffer)
                if (!arrayBuffer) {
                    throw new Error('arrayBufferがnullまたはundefinedです');
                }
                if (arrayBuffer.byteLength === 0) {
                    throw new Error('取得した商品データが空です');
                }
                const byteArray = new Uint8Array(arrayBuffer);
                sendResponse({ data: Array.from(byteArray) });
            })
            .catch(error => {
                console.error("フェッチエラー:", error);
                sendResponse({ error: error.message, data: null });
            });

        return true; // 非同期応答のためにtrueを返す
    }
    if (message.action === "fetchThumbnail") {
        //サムネイル画像を取得するときに使われる
        console.log("fetchThumbnail");
        console.log(message.url);
        fetch(message.url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`レスポンスステータス: ${response.status}`);
                }
                return response.arrayBuffer();
            })
            .then(arrayBuffer => {
                sendResponse({ data: Array.from(new Uint8Array(arrayBuffer)) });
            })
            .catch(error => {
                console.error("フェッチエラー:", error);
                sendResponse({ error: error.message, data: null });
            });
        return true; // 非同期応答のためにtrueを返す
    }
});