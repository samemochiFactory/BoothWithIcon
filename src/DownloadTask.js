import { fileTypeFromBlob } from 'file-type';
import { fetchItemBlob } from './FetchBlobModule';
import { fetchThumbnail } from './FetchBlobModule';
import { convertPngToIcon } from './FetchBlobModule';
import { createZipArchive } from './FetchBlobModule';

export class DownloadTask {
    constructor({ customFileName, downloadUrl, thumbnailUrl, itemPageUrl, assetName, customUiElement }) {
        this.customFileName = customFileName;
        this.downloadUrl = downloadUrl;
        this.thumbnailUrl = thumbnailUrl;
        this.itemPageUrl = itemPageUrl ? itemPageUrl : "https://booth.pm/";
        this.assetName = assetName;
        this.customUiElement = customUiElement;

        // customUiElement から必要なDOM要素を取得してプロパティとして保持
        this.progressBarWrapper = this.customUiElement.querySelector('.bwi-progress-wrapper');
        this.progressBar = this.progressBarWrapper ? this.progressBarWrapper.querySelector(".bwi-progress-bar") : null;
        this.customDownloadButton = this.customUiElement.querySelector('.bwi-download-button');
        this.mainTextSpan = this.customDownloadButton ? this.customDownloadButton.querySelector('.bwi-main-text') : null;

        this.progressBarId = crypto.randomUUID();
        this._listener = this._createProgressListener();
        chrome.runtime.onMessage.addListener(this._listener);

        this.InitialMainText = this.mainTextSpan.textContent;

        // 初期化時に要素の存在チェックを行う
        if (!this.progressBarWrapper) console.error("DownloadTask: .bwi-progress-wrapper not found in customUiElement");
        if (!this.progressBar) console.error("DownloadTask: .bwi-progress-bar not found in progressBarWrapper");
        if (!this.customDownloadButton) console.error("DownloadTask: .bwi-download-button not found in customUiElement");
        if (!this.mainTextSpan) console.error("DownloadTask: .bwi-main-text not found in customDownloadButton");
    }

    _createProgressListener() {
        return (message) => {
            if (message.action === "receiveChunk" && message.progressBarId === this.progressBarId) {
                const progress = Math.round(100 * ((message.chunkIndex + 1) / message.totalChunks));
                if (this.progressBar) {
                    this.progressBar.style.width = `${progress}%`;
                    this.progressBar.textContent = `${progress}%`;
                    this.progressBar.setAttribute("aria-valuenow", progress.toString());
                }
            }
        };
    }

    async start() {
        if (this.progressBarWrapper) {
            this.progressBarWrapper.style.visibility = 'visible'; // progressBarラッパーを表示
        }
        if (this.progressBar) {
            this.progressBar.style.width = `0%`;
            this.progressBar.textContent = `準備中...`; // 初期メッセージ
            this.progressBar.setAttribute("aria-valuenow", "0");
        }
        if (this.mainTextSpan) {
            this.mainTextSpan.textContent = "Loading..."; // ボタンのテキスト変更
        }
        if (this.customDownloadButton) {
            this.customDownloadButton.disabled = true; // ボタンを無効化
        }

        try {
            await this._downloadWithZip();
        } catch (e) {
            console.error("DownloadTask Error in start:", e);
            if (this.progressBar) {
                this.progressBar.textContent = `エラー発生`;
                this.progressBar.style.backgroundColor = 'red';
            }
            if (this.mainTextSpan) {
                this.mainTextSpan.textContent = "エラー";
            }
        } finally {
            chrome.runtime.onMessage.removeListener(this._listener);
            this._resetProgressBar(); // リセット処理はダウンロード完了後かエラー時に行う
        }
    }

    async _downloadWithZip() {
        console.log("fetching ItemBlob");
        const productBlob = await fetchItemBlob(this.downloadUrl, this.progressBarId);
        const filetype = await fileTypeFromBlob(productBlob);
        const ext = filetype ? filetype.ext : 'bin';
        console.log("fetching Thumbnail");
        const thumbnailBlob = await fetchThumbnail(this.thumbnailUrl);
        if (!thumbnailBlob) throw new Error("Failed to fetch thumbnail.");
        const icoBlob = await convertPngToIcon(thumbnailBlob);
        if (!icoBlob) throw new Error("Failed to convert thumbnail to icon.");

        const fileMap = new Map();
        fileMap.set(`boothThumbnail.ico`, icoBlob);
        fileMap.set(`${this.assetName}.${ext}`, productBlob);

        // desktop.ini の内容を static/desktop.ini から読み込む
        const desktopIniContent = await this._loadStaticFileAsText("desktop.ini");
        // fileMap.set("desktop.ini", desktopIniContent !== null ? desktopIniContent : `[.ShellClassInfo]\nIconResource=boothThumbnail.ico,0\n[ViewState]\nMode=\nVid=\nFolderType=Generic`);
        if (desktopIniContent !== null) {
            console.log("loaded desktop.ini from static/");
            fileMap.set("desktop.ini", desktopIniContent);
        } else {
            // ファイル読み込み失敗時の処理 (例: エラーログ、デフォルト値の使用、処理の中断など)
            console.warn("Warning: static/desktop.ini could not be loaded. Check the file path and server configuration.");
            // 必要であれば、ここでフォールバックの値を設定することも可能です。
            fileMap.set("desktop.ini", `[.ShellClassInfo]\nIconResource=boothThumbnail.ico,0\n[ViewState]\nMode=\nVid=\nFolderType=Generic`);
        }

        // setIcon.bat の内容を static/setIcon.bat から読み込む
        const setIconBatContent = await this._loadStaticFileAsText("setIcon.bat");
        // fileMap.set("setIcon.bat", setIconBatContent !== null ? setIconBatContent : `@echo off\nsetlocal\nset "folder=%~dp0"\nset "folder=%folder:~0,-1%"\necho target folder: %folder%\nattrib +s +r "%folder%"\nattrib +h +s "%folder%\\desktop.ini"`);
        if (setIconBatContent !== null) {
            console.log("loaded setIcon.bat from static/");
            fileMap.set("setIcon.bat", setIconBatContent);
        } else {
            // ファイル読み込み失敗時の処理
            console.warn("Warning: static/setIcon.bat could not be loaded. Check the file path and server configuration.");
            // 必要であれば、ここでフォールバックの値を設定することも可能です。
            fileMap.set("setIcon.bat", `@echo off\nsetlocal\nset "folder=%~dp0"\nset "folder=%folder:~0,-1%"\necho target folder: %folder%\nattrib +s +r "%folder%"\nattrib +h +s "%folder%\\desktop.ini"`);
        }

        //load BoothLink.url and include to zip
        const itemPageLinkContent = await this._loadStaticFileAsText("BoothLink.url");
        if (itemPageLinkContent !== null) {
            console.log("loaded BoothLink.url from static/");
            fileMap.set("BoothLink.url", itemPageLinkContent.replace(/^URL=https:\/\/.*$/m, `URL=${this.itemPageUrl}`));
        } else {
            // ファイル読み込み失敗時の処理
            console.warn("Warning: static/setIcon.bat could not be loaded. Check the file path and server configuration.");
            // 必要であれば、ここでフォールバックの値を設定することも可能です。
            fileMap.set("BoothLink.url", `[{000214A0-0000-0000-C000-000000000046}]\nProp3=19,11\n[InternetShortcut]\nIDList=\nURL=${this.itemPageUrl}\n`);
        }

        const zipBlob = await createZipArchive(fileMap);
        if (!zipBlob) throw new Error("Failed to create zip archive.");
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
            return await response.text();
        } catch (error) {
            // ネットワークエラーやその他の予期せぬエラー
            console.error(`Failed to load file ${fileName}:`, error);
            return null;
        }
    }

    _resetProgressBar() {
        if (this.progressBar) {
            this.progressBar.style.width = "0%";
            this.progressBar.textContent = "";
            this.progressBar.setAttribute("aria-valuenow", "0");
            this.progressBar.style.backgroundColor = ''; // 背景色もリセット
        }
        if (this.progressBarWrapper) {
            this.progressBarWrapper.style.visibility = 'hidden';
        }
        if (this.mainTextSpan) {
            this.mainTextSpan.textContent = this.InitialMainText;
        }
        if (this.customDownloadButton) {
            this.customDownloadButton.disabled = false;
        }
    }
}