document.addEventListener("DOMContentLoaded", async () => {
  chrome.storage.local.get(["namingRules", "includeIcon"], (result) => {
    const namingRules = result.namingRules || [];
    if (namingRules.length === 0) {
      namingRules = ["ファイル名"];
      chrome.storage.local.set({ namingRules });
    }
    document.getElementById("namingRuleShopProduct").checked = namingRules.includes("ショップ名");
    document.getElementById("namingRuleProductName").checked = namingRules.includes("商品名");
    document.getElementById("namingRuleFileName").checked = namingRules.includes("ファイル名");
  });
  document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const namingRules = [];
      if (document.getElementById("namingRuleShopProduct").checked) namingRules.push("ショップ名");
      if (document.getElementById("namingRuleProductName").checked) namingRules.push("商品名");
      if (document.getElementById("namingRuleFileName").checked) namingRules.push("ファイル名");
      if (namingRules.length === 0) {
        namingRules.push("ファイル名");
        document.getElementById("namingRuleFileName").checked = true;
      }
      chrome.storage.local.set({
        namingRules
      });
    });
  });
});
document.getElementById("applySettingsBtn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    var _a;
    if ((_a = tabs[0]) == null ? void 0 : _a.id) {
      chrome.tabs.reload(tabs[0].id);
    }
  });
});
//# sourceMappingURL=popup.js.map
