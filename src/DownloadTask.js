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
                const bar = this.progressBarElement.querySelector(".progress-bar");
                bar.style.width = `${progress}%`;
                bar.textContent = `${progress}%`;
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
        fileMap.set("desktop.ini", `[.ShellClassInfo]\nIconResource=boothThumbnail.ico,0\n[ViewState]\nMode=\nVid=\nFolderType=Generic`);
        fileMap.set("setIcon.bat", `@echo off\nsetlocal\nset "folder=%~dp0"\nset "folder=%folder:~0,-1%"\necho target folder: %folder%\nattrib +s +r "%folder%"\nattrib +h +s "%folder%\\desktop.ini"`);

        const zipBlob = await createZipArchive(fileMap);
        chrome.runtime.sendMessage({
            action: 'downloadZip',
            blobUrl: URL.createObjectURL(zipBlob),
            filename: this.customFileName + '.zip'
        });
    }

    _resetProgressBar() {
        const bar = this.progressBarElement.querySelector(".progress-bar");
        bar.style.width = "0%";
        bar.textContent = "";
        this.progressBarElement.style.visibility = 'hidden';
    }
}