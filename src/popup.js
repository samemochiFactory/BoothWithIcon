console.log("Popup loaded!");
document.getElementById('fetchIconBtn').addEventListener('click', () => {
    const url = document.getElementById('shopUrl').value.trim();
    if (!url) {
        alert("URLを入力してください");
        return;
    }

    // TODO: URLを元にアイコンを取得してzip生成など
    console.log("Fetching icon for:", url);
});