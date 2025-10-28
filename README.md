##ICE-imagedownload_chrome_extension (使用說明 — 中文)

這個 Chrome 擴充功能可以掃描目前分頁中符合條件的大圖（包含 `<img>` 與 CSS background-image），並把選取的圖片下載到本機。主要特色：

- 可自訂寬度與高度範圍（可輸入或使用滑桿）
- 掃描後在 popup 顯示縮圖，可勾選單張或全部下載
- 下載會放到子資料夾，資料夾名稱會用「網頁標題_YYYY-MM-DD-HH」格式
- 支援中文／英文介面（可由 popup 切換，會記住語言設定）
- 會記住上次的尺寸篩選設定，下一次開 popup 會自動復原

如何安裝（開發者模式）
1. 開啟 Chrome，前往 chrome://extensions
2. 開啟右上角「Developer mode」
3. 按「Load unpacked」，選取 `chrome_dl` 資料夾（含 `manifest.json` 的資料夾）
4. 開啟任何有圖片的網頁（非 chrome:// 或 Chrome 商店頁面），點擊工具列的擴充功能圖示

使用說明（快速）
1. 在 popup 中可以選擇語言（右側）與設定寬/高的最小/最大值，你可以只輸入其中一個條件（例如只設定寬度最小值）。
2. 也可以使用滑桿快速調整範圍，修改會自動儲存為下次預設。
3. 按「掃描並顯示可下載的圖片」後，popup 會列出符合篩選條件的圖片縮圖。
4. 勾選欲下載的圖片後按「下載選取」，或按「全部下載」一次下載全部。
5. 下載會放到你的 Chrome 下載資料夾中，並在該目錄下建立子資料夾（名稱範例：巴哈姆特_2025-10-27-14）。

進階與注意事項
- 無法在特殊頁面（如 chrome://、擴充功能頁、Chrome Web Store）運行內容腳本。
- 部分網站可能使用防盜鏈或需要驗證，若直接下載失敗，擴充會嘗試透過 fetch 取得資源再下載；若仍失敗，可能是伺服器限制或跨域問題。

Debug / 測試
- 若下載有問題，打開 chrome://extensions 找到擴充功能，點「Service worker (Inspect)」可檢視 background 的 console 訊息；popup 也可右鍵 Inspect 查看即時訊息。





