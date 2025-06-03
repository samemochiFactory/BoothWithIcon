import { fileTypeFromBlob } from 'file-type';
import { fetchItemBlob } from './FetchBlobModule';
import { fetchThumbnail } from './FetchBlobModule';
import { convertPngToIcon } from './FetchBlobModule';
import { createZipArchive } from './FetchBlobModule';

export class DownloadTask {
    constructor({ customFileName, downloadUrl, thumbnailUrl, assetName, progressBarElement }) {
        this.customFileName = customFileName;
        this.downloadUrl = downloadUrl;
        this.thumbnailUrl = thumbnailUrl;
        this.assetName = assetName;
        this.progressBarElement = progressBarElement;
        this.progressBarId = crypto.randomUUID();
        this._listener = this._createProgressListener();
        chrome.runtime.onMessage.addListener(this._listener);
    }

    _createProgressListener() {
        return (message) => {
            if (message.action === "receiveChunk" && message.progressBarId === this.progressBarId) {
                const progress = Math.round(100 * ((message.chunkIndex + 1) / message.totalChunks));
                const bar = this.progressBarElement.querySelector(".bwi-progress-bar");
                if (bar) {
                    bar.style.width = `${progress}%`;
                    bar.textContent = `${progress}%`;
                    bar.setAttribute("aria-valuenow", progress.toString()); // aria-valuenowも更新
                }
            }
        };
    }

    async start() {
        this.progressBarElement.style.visibility = 'visible';//show progressBar
        try {
            await this._downloadWithZip();
        } catch (e) {
            console.error(e);
        } finally {
            chrome.runtime.onMessage.removeListener(this._listener);
            this._resetProgressBar();
        }
    }

    async _downloadWithZip() {
        const productBlob = await fetchItemBlob(this.downloadUrl, this.progressBarId);
        const filetype = await fileTypeFromBlob(productBlob);
        const ext = filetype.ext;
        const thumbnailBlob = await fetchThumbnail(this.thumbnailUrl);
        const icoBlob = await convertPngToIcon(thumbnailBlob);

        const fileMap = new Map();
        fileMap.set(`boothThumbnail.ico`, icoBlob);
        fileMap.set(this.assetName, productBlob);

        // desktop.ini の内容を static/desktop.ini から読み込む
        const desktopIniContent = await this._loadStaticFileAsText("desktop.ini");
        if (desktopIniContent !== null) {
            fileMap.set("desktop.ini", desktopIniContent);
        } else {
            // ファイル読み込み失敗時の処理 (例: エラーログ、デフォルト値の使用、処理の中断など)
            console.warn("Warning: static/desktop.ini could not be loaded. Check the file path and server configuration.");
            // 必要であれば、ここでフォールバックの値を設定することも可能です。
            fileMap.set("desktop.ini", `[.ShellClassInfo]\nIconResource=boothThumbnail.ico,0\n[ViewState]\nMode=\nVid=\nFolderType=Generic`);
        }

        // setIcon.bat の内容を static/setIcon.bat から読み込む
        const setIconBatContent = await this._loadStaticFileAsText("setIcon.bat");
        if (setIconBatContent !== null) {
            fileMap.set("setIcon.bat", setIconBatContent);
        } else {
            // ファイル読み込み失敗時の処理
            console.warn("Warning: static/setIcon.bat could not be loaded. Check the file path and server configuration.");
            // 必要であれば、ここでフォールバックの値を設定することも可能です。
            fileMap.set("setIcon.bat", `@echo off\nsetlocal\nset "folder=%~dp0"\nset "folder=%folder:~0,-1%"\necho target folder: %folder%\nattrib +s +r "%folder%"\nattrib +h +s "%folder%\\desktop.ini"`);
        }

        const zipBlob = await createZipArchive(fileMap);
        chrome.runtime.sendMessage({
            action: 'downloadZip',
            blobUrl: URL.createObjectURL(zipBlob),
            filename: this.customFileName + '.zip'
        });
    }
    /**
 * staticディレクトリから指定されたファイルの内容を非同期でテキストとして読み込みます。
 * @param {string} fileName - 読み込むファイル名 (例: "desktop.ini")
 * @returns {Promise<string|null>} ファイルの内容の文字列。読み込み失敗時はnull。
 */
    async _loadStaticFileAsText(fileName) {
        try {
            // 'static/' フォルダからの相対パスでファイルを指定
            const fileURL = chrome.runtime.getURL(`static/${fileName}`);
            // const response = await fetch(`static/${fileName}`);
            const response = await fetch(fileURL);

            if (!response.ok) {
                console.error(`Error fetching ${fileName}: ${response.status} ${response.statusText}`);
                // HTTPステータスがエラーを示している場合 (例: 404 Not Found)
                return null;
            }

            // レスポンスボディをテキストとして取得
            const textContent = await response.text();
            return textContent;
        } catch (error) {
            // ネットワークエラーやその他の予期せぬエラー
            console.error(`Failed to load file ${fileName}:`, error);
            return null;
        }
    }

    _resetProgressBar() {
        const bar = this.progressBarElement.querySelector(".bwi-progress-bar");
        if (bar) { // barが存在するか確認
            bar.style.width = "0%";
            bar.textContent = ""; // "0%" ではなく空にする
            bar.setAttribute("aria-valuenow", "0"); // WAI-ARIA属性もリセット
        }
        this.progressBarElement.style.visibility = 'hidden';
    }
}