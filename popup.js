// popup.js

// share state between functions (renderList and startDownload live at top-level)
let lastImages = [];
let lastTitle = '';

// Simple i18n mapping
const TRANSLATIONS = {
  'zh-TW': {
    run: '掃描並顯示可下載的圖片',
    selectAll: '全選',
    deselectAll: '取消全選',
    downloadSelected: '下載選取',
    downloadAll: '全部下載',
    searching: '搜尋中…',
    no_tab: '找不到當前分頁。',
    cannot_access: '無法存取此分頁的內容（例如 chrome:// 或未注入內容腳本）。',
    found_count: '已找到 ${count} 張符合條件的圖片，請從下方選擇或按全部下載',
    processing_error: '處理時發生錯誤: ${err}',
    start_download: '開始下載 ${total} 張圖片...',
    download_progress: '下載中：已完成 ${completed} / ${total}',
    download_done: '下載完成：共 ${completed} / ${total} 張（可能有失敗）。',
    no_response: '無法啟動下載（背景腳本沒有回應）',
    request_ack: '已向 background 發出 ${n} 張圖片的下載請求',
    request_error: '發生錯誤：${err}',
    select_one_alert: '請先選擇至少一張圖片'
    ,
    filter_summary: '過濾：${w}，${h}'
  },
  'en': {
    run: 'Scan and show downloadable images',
    selectAll: 'Select all',
    deselectAll: 'Deselect all',
    downloadSelected: 'Download selected',
    downloadAll: 'Download all',
    searching: 'Searching…',
    no_tab: 'Cannot find the active tab.',
    cannot_access: 'Cannot access this page (e.g. chrome:// or content script not injected).',
    found_count: 'Found ${count} images that match; please select or press Download All',
    processing_error: 'Error while processing: ${err}',
    start_download: 'Starting download of ${total} images...',
    download_progress: 'Downloading: ${completed} / ${total}',
    download_done: 'Download finished: ${completed} / ${total} images (some may have failed).',
    no_response: 'Unable to start downloads (no response from background)',
    request_ack: 'Sent download request for ${n} images to background',
    request_error: 'Error: ${err}',
    select_one_alert: 'Please select at least one image'
    ,
    filter_summary: 'Filter: ${w}, ${h}'
  }
};

let CURRENT_LANG = 'zh-TW';

// storage helpers: prefer chrome.storage.local when available, fallback to localStorage
function storageGet(key, defaultVal, cb) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && chrome.storage.local.get) {
      const o = {};
      o[key] = defaultVal;
      chrome.storage.local.get(o, prefs => {
        try { cb(prefs[key]); } catch (e) { cb(defaultVal); }
      });
      return;
    }
  } catch (e) {}
  // fallback
  try {
    const v = localStorage.getItem(key);
    if (v === null) return cb(defaultVal);
    try { cb(JSON.parse(v)); } catch (e) { cb(v); }
  } catch (e) { cb(defaultVal); }
}

function storageSet(key, val, cb) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && chrome.storage.local.set) {
      const o = {};
      o[key] = val;
      chrome.storage.local.set(o, () => { if (cb) cb(); });
      return;
    }
  } catch (e) {}
  try {
    localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    if (cb) cb();
  } catch (e) { if (cb) cb(); }
}

function t(key, vars = {}) {
  const map = TRANSLATIONS[CURRENT_LANG] || TRANSLATIONS['zh-TW'];
  let s = map[key] || '';
  Object.keys(vars).forEach(k => {
    // replace occurrences like ${key} with the provided variable
    s = s.replace(new RegExp('\\$\\{' + k + '\\}', 'g'), vars[k]);
  });
  return s;
}

document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');
  const btn = document.getElementById('run');
  const langSelect = document.getElementById('lang');
  const listEl = document.getElementById('list');
  const controls = document.getElementById('controls');
  const selectAllBtn = document.getElementById('selectAll');
  const deselectAllBtn = document.getElementById('deselectAll');
  const downloadSelectedBtn = document.getElementById('downloadSelected');
  const downloadAllBtn = document.getElementById('downloadAll');
  const minWidthEl = document.getElementById('minWidth');
  const maxWidthEl = document.getElementById('maxWidth');
  const minHeightEl = document.getElementById('minHeight');
  const maxHeightEl = document.getElementById('maxHeight');
  const filterSummaryEl = document.getElementById('filterSummary');

  // load language preference
  storageGet('lang', 'zh-TW', v => {
    CURRENT_LANG = v || 'zh-TW';
    if (langSelect) langSelect.value = CURRENT_LANG;
    applyTranslations();
  });

  // language change handler
  if (langSelect) {
    langSelect.addEventListener('change', () => {
  const v = langSelect.value || 'zh-TW';
  CURRENT_LANG = v;
  storageSet('lang', v);
  applyTranslations();
    });
  }

  // load last filter (restore UI)
  storageGet('lastFilter', {}, saved => {
    try {
      const f = saved || {};
      setFilterToUI(f);
      updateFilterSummary();
    } catch (e) { }
  });

  // sync number inputs and ranges
  function setFilterToUI(f) {
    if (!f) f = {};
    const setVal = (numEl, v) => {
      if (v === undefined || v === null) {
        if (numEl) numEl.value = '';
      } else {
        if (numEl) numEl.value = v;
      }
    };
    setVal(minWidthEl, f.minWidth);
    setVal(maxWidthEl, f.maxWidth);
    setVal(minHeightEl, f.minHeight);
    setVal(maxHeightEl, f.maxHeight);
  }

  function getFilterFromUI() {
    const parse = el => {
      if (!el) return undefined;
      const v = el.value;
      if (v === null || v === undefined || v === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    return {
      minWidth: parse(minWidthEl),
      maxWidth: parse(maxWidthEl),
      minHeight: parse(minHeightEl),
      maxHeight: parse(maxHeightEl)
    };
  }

  function updateFilterSummary() {
    const f = getFilterFromUI();
    const w = (f.minWidth === undefined && f.maxWidth === undefined) ? '寬：無' : `寬：${f.minWidth === undefined ? '' : f.minWidth}${(f.minWidth!==undefined && f.maxWidth!==undefined)?'~':''}${f.maxWidth===undefined?'':f.maxWidth}`;
    const h = (f.minHeight === undefined && f.maxHeight === undefined) ? '高：無' : `高：${f.minHeight === undefined ? '' : f.minHeight}${(f.minHeight!==undefined && f.maxHeight!==undefined)?'~':''}${f.maxHeight===undefined?'':f.maxHeight}`;
    if (filterSummaryEl) filterSummaryEl.textContent = t('filter_summary', {w, h});
  }

  // attach sync handlers to number inputs
  const syncAndSave = () => { updateFilterSummary(); storageSet('lastFilter', getFilterFromUI()); };
  [minWidthEl, maxWidthEl, minHeightEl, maxHeightEl].forEach(el => { if (el) el.addEventListener('input', syncAndSave); });

  btn.addEventListener('click', async () => {
    status.textContent = t('searching');

    // get active tab
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      const tab = tabs && tabs[0];
      if (!tab) {
        status.textContent = t('no_tab');
        return;
      }

      // build filter from inputs (allow empty)
      const parseNum = el => {
        if (!el) return undefined;
        const v = el.value;
        if (v === null || v === undefined || v === '') return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };
      const filter = {
        minWidth: parseNum(minWidthEl),
        maxWidth: parseNum(maxWidthEl),
        minHeight: parseNum(minHeightEl),
        maxHeight: parseNum(maxHeightEl)
      };

      // validate: if both min and max provided for width/height, ensure min <= max
      if (filter.minWidth !== undefined && filter.maxWidth !== undefined && filter.minWidth > filter.maxWidth) {
        alert('寬度的最小值不能大於最大值');
        status.textContent = '';
        return;
      }
      if (filter.minHeight !== undefined && filter.maxHeight !== undefined && filter.minHeight > filter.maxHeight) {
        alert('高度的最小值不能大於最大值');
        status.textContent = '';
        return;
      }

      chrome.tabs.sendMessage(tab.id, {action: 'collect_images', filter}, resp => {
        if (!resp) {
          // maybe content script not injected / page type not allowed
          status.textContent = t('cannot_access');
          return;
        }
        if (resp.ok) {
          status.textContent = t('found_count', {count: resp.count});
          lastImages = resp.images || [];
          lastTitle = resp.title || '';
          renderList(lastImages);
        } else {
          status.textContent = t('processing_error', {err: resp.error || '未知錯誤'});
        }
      });
    });
  });

  // Listen for background download progress messages
  chrome.runtime.onMessage.addListener(msg => {
    if (!msg || !msg.action) return;
    if (msg.action === 'download_started') {
      status.textContent = t('start_download', {total: msg.total});
      console.log('[popup] download_started', msg);
    } else if (msg.action === 'download_progress') {
      status.textContent = t('download_progress', {completed: msg.completed, total: msg.total});
      console.log('[popup] download_progress', msg);
    } else if (msg.action === 'download_done') {
      status.textContent = t('download_done', {completed: msg.completed, total: msg.total});
      console.log('[popup] download_done', msg);
    }
  });
});

function renderList(images) {
  const listEl = document.getElementById('list');
  const controls = document.getElementById('controls');
  listEl.innerHTML = '';
  if (!images || images.length === 0) {
    listEl.style.display = 'none';
    controls.style.display = 'none';
    return;
  }
  // restore grid layout for controls (was previously set to 'block' which breaks grid)
  controls.style.display = 'grid';
  listEl.style.display = 'block';

  images.forEach((it, idx) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.marginBottom = '6px';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.dataset.idx = idx;

    const thumb = document.createElement('img');
    thumb.src = it.src;
    thumb.style.width = '80px';
    thumb.style.height = '80px';
    thumb.style.objectFit = 'cover';
    thumb.style.margin = '0 8px';

    const info = document.createElement('div');
    info.style.flex = '1';
    info.textContent = `${it.type || ''} ${it.width || ''}x${it.height || ''}`;

    row.appendChild(cb);
    row.appendChild(thumb);
    row.appendChild(info);
    listEl.appendChild(row);
  });

  // control actions
  document.getElementById('selectAll').onclick = () => {
    Array.from(listEl.querySelectorAll('input[type=checkbox]')).forEach(c => c.checked = true);
  };
  document.getElementById('deselectAll').onclick = () => {
    Array.from(listEl.querySelectorAll('input[type=checkbox]')).forEach(c => c.checked = false);
  };

  document.getElementById('downloadSelected').onclick = () => {
    const chosen = Array.from(listEl.querySelectorAll('input[type=checkbox]'))
      .map(c => c.checked ? Number(c.dataset.idx) : -1)
      .filter(i => i >= 0)
      .map(i => lastImages[i]);
    if (!chosen || chosen.length === 0) {
      alert(t('select_one_alert'));
      return;
    }
    startDownload(chosen);
  };

  document.getElementById('downloadAll').onclick = () => {
    startDownload(lastImages);
  };
}

function sanitizeFolderName(name) {
  // remove problematic characters and trim
  return name.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 120);
}

function startDownload(images) {
  const status = document.getElementById('status');
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}`;
  let folderBase = lastTitle || (document.location && document.location.hostname) || 'downloads';
  folderBase = sanitizeFolderName(folderBase);
  const folder = `${folderBase}_${ts}`;

  // send to background to perform downloads
  chrome.runtime.sendMessage({action: 'download_images', images, folderName: folder}, resp => {
    console.log('[popup] sent download_images', {imagesCount: images.length, folder});
    if (!resp) {
      status.textContent = t('no_response');
      console.error('[popup] no response from background for download_images');
      return;
    }
    if (resp.ok) {
      status.textContent = t('request_ack', {n: resp.requested});
      console.log('[popup] background acknowledged download request', resp);
    } else {
      status.textContent = t('request_error', {err: resp.error || '未知'});
      console.error('[popup] background responded with error for download_images', resp);
    }
  });
}

function applyTranslations() {
  // update UI elements with translations
  try {
    const btn = document.getElementById('run');
    const selectAll = document.getElementById('selectAll');
    const deselectAll = document.getElementById('deselectAll');
    const downloadSelected = document.getElementById('downloadSelected');
    const downloadAll = document.getElementById('downloadAll');
    if (btn) btn.textContent = t('run');
    if (selectAll) selectAll.textContent = t('selectAll');
    if (deselectAll) deselectAll.textContent = t('deselectAll');
    if (downloadSelected) downloadSelected.textContent = t('downloadSelected');
    if (downloadAll) downloadAll.textContent = t('downloadAll');
  } catch (e) { console.error('applyTranslations error', e); }
}
