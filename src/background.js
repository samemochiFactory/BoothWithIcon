
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    //TODO:fetch系の関数は共通化して，responseの処理方法をフロント側で変えるとかする．
    if (msg.action === "fetchItemInfo") {
        //商品ページ.jsonを取得するときに使われる
        console.log("fetchItemInfo");
        console.log(msg.url);
        fetch(msg.url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`response status : ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                sendResponse({ data });
            })
            .catch(error => {
                console.error("fetch error:", error);
                console.error("error url:", msg.url)
                sendResponse({ error: error.message });
            });

        return true; // 非同期応答のためにtrueを返す
    }
    //チャンク送信
    if (msg.action === "fetchItem") {
        const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB チャンクサイズ

        fetch(msg.url)
            .then(response => response.blob())
            .then(async blob => {//クソデカblob
                // console.log("send blobtype : ", blob.type);
                const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);

                // 最初のレスポンスでメタデータを送信
                sendResponse({
                    status: "start",
                    totalChunks: totalChunks,
                    totalSize: blob.size,
                    type: blob.type
                });
                // console.log("sending progress to id : ", msg.progressBarId);
                // チャンクごとに処理
                for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                    const start = chunkIndex * CHUNK_SIZE;
                    const end = Math.min(start + CHUNK_SIZE, blob.size);
                    const chunkBlob = blob.slice(start, end);

                    // チャンクをBase64に変換
                    const reader = new FileReader();

                    // Promiseでラップして同期的に処理
                    await new Promise(resolve => {
                        reader.onloadend = () => {
                            // チャンクデータをcontent.jsに送信
                            chrome.tabs.sendMessage(sender.tab.id, {
                                action: "receiveChunk",
                                chunkIndex: chunkIndex,
                                totalChunks: totalChunks,
                                dataUrl: reader.result,
                                progressBarId: msg.progressBarId
                            });
                            resolve();
                        };
                        reader.readAsDataURL(chunkBlob);
                    });
                }
            })
            .catch(error => {
                console.error("chunk sending error:", error);
                chrome.tabs.sendMessage(sender.tab.id, {
                    action: "downloadError",
                    downloadId: msg.downloadId,
                    error: error.toString()
                });
            });

        // 非同期処理を行うため、sendResponseを後で呼び出すことを示す
        return true;
    }
    if (msg.action === "fetchThumbnail") {
        //サムネイル画像を取得するときに使われる
        console.log("fetchThumbnail");
        console.log(msg.url);
        fetch(msg.url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`response status: ${response.status}`);
                }
                return response.arrayBuffer();
            })
            .then(arrayBuffer => {
                sendResponse({ data: Array.from(new Uint8Array(arrayBuffer)) });
            })
            .catch(error => {
                console.error("fetch error", error);
                sendResponse({ error: error.message, data: null });
            });
        return true; // 非同期応答のためにtrueを返す
    }
    if (msg.action === 'downloadZip') {

        chrome.downloads.download({
            url: msg.blobUrl,
            filename: msg.filename,
            // saveAs: true
            saveAs: msg.enableSaveAs//urlがbrobUrlなので必ずTrueになってしまう
        }, downloadId => {
            if (chrome.runtime.lastError) {
                console.error('Download failed:', chrome.runtime.lastError);
            } else {
                console.log('Download started:', downloadId);
            }
        });
    }
});