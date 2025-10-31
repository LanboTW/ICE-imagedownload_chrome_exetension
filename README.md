# ICE_Imagedownload_Chrome_Extension — 使用說明 (繁體中文)

此 Chrome 擴充功能會掃描當前分頁中的大圖（包含 `<img>` 與 CSS background-image），並可將選取的圖片下載到本機下載資料夾內的子資料夾。

主要功能

- 可設定寬度/高度的最小與最大值（可只設定部分條件）
- 在 popup 顯示符合條件的圖片縮圖，支援逐張勾選或一次全部下載
- 下載會放到 Chrome 的下載資料夾，並建立子資料夾，名稱格式為：`頁面標題_YYYY-MM-DD-HH`
- 支援中文與英文介面，語言設定會儲存
- 會記住上次的尺寸篩選設定並在下次開啟時恢復

安裝（開發者模式）

1. 開啟 Chrome，前往 chrome://extensions
2. 啟用右上角的「Developer mode」
3. 按「Load unpacked」，選取包含 `manifest.json` 的資料夾（此專案資料夾）
4. 在一般網站（非 chrome:// 或 Chrome 線上商店頁面）開啟，點擊工具列上的擴充功能圖示以打開 popup

快速使用

1. 在 popup 選擇語言與設定寬/高的最小/最大值（可只輸入部分條件）
2. 按「掃描並顯示可下載的圖片」列出符合條件的圖片縮圖
3. 勾選欲下載的圖片後按「下載選取」，或按「全部下載」一次下載全部
4. 下載結果會保存在 Chrome 的下載資料夾下的子資料夾

注意事項

- 內容腳本無法注入到特殊頁面（例如 chrome://、擴充功能頁面、或 Chrome 線上商店）。
- 若直接以 `chrome.downloads.download` 下載失敗，擴充會嘗試以 fetch 讀取資源後再下載；若仍失敗，可能因伺服器限制或跨域保護所致。

除錯

- 若下載或行為異常，打開 chrome://extensions，找到本擴充功能，點選「Service worker (Inspect)」檢視 background 的 console；popup 也可右鍵選擇 Inspect 檢視即時錯誤或日誌。

---

# ICE_Imagedownload_Chrome_Extension — Usage (English)

This Chrome extension scans the current tab for large images (both `<img>` elements and CSS background-images) and lets you download selected images into a subfolder under the browser's downloads directory.

Features

- Set minimum/maximum width and height filters (you may leave some values empty)
- Popup displays thumbnails of matching images; select individual images or download all
- Downloads are saved into a subfolder named `PageTitle_YYYY-MM-DD-HH` inside the Chrome downloads directory
- Supports Traditional Chinese and English UI; selected language is persisted
- Last-used filter values are persisted and restored on next popup open

Installation (developer mode)

1. Open Chrome and go to chrome://extensions
2. Enable "Developer mode" (top-right)
3. Click "Load unpacked" and select the extension folder containing `manifest.json`
4. Open a regular website (not chrome:// or Chrome Web Store) and open the extension popup from the toolbar

Quick usage

1. Choose language and set min/max width and height (you can leave fields empty)
2. Click "Scan and show downloadable images" to list thumbnails matching the filters
3. Select images and click "Download selected", or click "Download all" to download everything
4. Downloads are stored in a subfolder under the browser's downloads directory

Limitations

- Content scripts cannot run on special pages (chrome://, extension pages, Chrome Web Store)
- If direct download fails, the extension attempts a fetch -> blob fallback; failures after that are usually due to server-side restrictions or CORS

Debugging

- To inspect background logs: open chrome://extensions, locate the extension, click "Service worker (Inspect)" to open the service worker console
- To inspect popup logs: open the popup and right-click -> Inspect

