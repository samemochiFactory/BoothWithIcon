(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
document.getElementById("selectFolderBtn").addEventListener("click", async () => {
  try {
    const folderHandle = await window.showDirectoryPicker();
    const granted = await verifyPermission(folderHandle);
    if (!granted) {
      alert("フォルダへのアクセス権限が許可されませんでした。");
      return;
    }
    const folderInfo = {
      name: folderHandle.name,
      timestamp: Date.now()
    };
    await chrome.storage.local.set({ folderInfo });
    window.currentFolderHandle = folderHandle;
    document.getElementById("folderResult").textContent = `✅ 選択済み: ${folderHandle.name}`;
    document.getElementById("executeBtn").disabled = false;
  } catch (err) {
    if (err.name === "AbortError") {
      console.log("フォルダ選択がキャンセルされました");
      document.getElementById("folderResult").textContent = "📁 未選択（キャンセルされました）";
    } else {
      console.error("フォルダ選択に失敗:", err);
      document.getElementById("folderResult").textContent = "❌ 選択失敗: " + err.message;
    }
  }
});
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const result = await chrome.storage.local.get(["folderInfo"]);
    if (result.folderInfo) {
      document.getElementById("folderResult").textContent = `📁 前回選択: ${result.folderInfo.name} (※再選択が必要)`;
    }
  } catch (err) {
    console.error("保存データの読み込みに失敗:", err);
  }
});
async function verifyPermission(handle) {
  const options = { mode: "readwrite" };
  if (await handle.queryPermission(options) === "granted") return true;
  if (await handle.requestPermission(options) === "granted") return true;
  return false;
}
//# sourceMappingURL=options.js.map
