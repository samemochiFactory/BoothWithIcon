chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "fetchItemInfo") {
    console.log("fetchItemInfo");
    console.log(msg.url);
    fetch(msg.url).then((response) => {
      if (!response.ok) {
        throw new Error(`response status : ${response.status}`);
      }
      return response.json();
    }).then((data) => {
      sendResponse({ data });
    }).catch((error) => {
      console.error("fetch error:", error);
      console.error("error url:", msg.url);
      sendResponse({ error: error.msg });
    });
    return true;
  }
  if (msg.action === "fetchItem") {
    const CHUNK_SIZE = 10 * 1024 * 1024;
    fetch(msg.url).then((response) => response.blob()).then(async (blob) => {
      const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);
      sendResponse({
        status: "start",
        totalChunks,
        totalSize: blob.size,
        type: blob.type
      });
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, blob.size);
        const chunkBlob = blob.slice(start, end);
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onloadend = () => {
            chrome.tabs.sendMessage(sender.tab.id, {
              action: "receiveChunk",
              chunkIndex,
              totalChunks,
              dataUrl: reader.result,
              progressBarId: msg.progressBarId
            });
            resolve();
          };
          reader.readAsDataURL(chunkBlob);
        });
      }
    }).catch((error) => {
      console.error("chunk sending error:", error);
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "downloadError",
        downloadId: msg.downloadId,
        error: error.toString()
      });
    });
    return true;
  }
  if (msg.action === "fetchThumbnail") {
    console.log("fetchThumbnail");
    console.log(msg.url);
    fetch(msg.url).then((response) => {
      if (!response.ok) {
        throw new Error(`response status: ${response.status}`);
      }
      return response.arrayBuffer();
    }).then((arrayBuffer) => {
      sendResponse({ data: Array.from(new Uint8Array(arrayBuffer)) });
    }).catch((error) => {
      console.error("fetch error", error);
      sendResponse({ error: error.msg, data: null });
    });
    return true;
  }
  if (msg.action === "downloadZip") {
    chrome.downloads.download({
      url: msg.blobUrl,
      filename: msg.filename,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("Download failed:", chrome.runtime.lastError);
      } else {
        console.log("Download started:", downloadId);
      }
    });
  }
});
//# sourceMappingURL=background.js.map
