// background.js (service worker)
// Receives image lists from the content script and downloads them.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.action !== 'download_images') return;
  console.log('[background] download_images message received', {msg, sender});

  const images = Array.isArray(msg.images) ? msg.images : [];
  const total = images.length;
  if (total === 0) {
    sendResponse({ok: true, requested: 0});
    return;
  }

  // Track state
  let started = 0;
  let completed = 0;
  const active = new Set();

  // Notify popup (if open) that downloads are starting
  chrome.runtime.sendMessage({action: 'download_started', total});

  const onChanged = delta => {
    if (!delta || !delta.state) return;
    const id = delta.id;
    const state = delta.state.current;
    if (state === 'complete' || state === 'interrupted') {
      if (active.has(id)) {
        active.delete(id);
        completed++;
        chrome.runtime.sendMessage({action: 'download_progress', total, completed});
        if (active.size === 0 && started === total) {
          // All done
          chrome.runtime.sendMessage({action: 'download_done', total, completed});
          try { chrome.downloads.onChanged.removeListener(onChanged); } catch (e) {}
        }
      }
    }
  };

  chrome.downloads.onChanged.addListener(onChanged);

  chrome.downloads.onChanged.addListener(delta => {
    // extra debug logging for any change
    try {
      console.log('[background] downloads.onChanged', delta);
    } catch (e) { }
  });

  const folderName = (msg.folderName || '').replace(/^\/+|\/+$/g, '');
  images.forEach((img, idx) => {
    try {
      const url = img.src;
      if (!url) {
        started++;
        // If everything attempted and no active downloads, signal done
        if (started === total && active.size === 0) {
          chrome.runtime.sendMessage({action: 'download_done', total, completed});
          try { chrome.downloads.onChanged.removeListener(onChanged); } catch (e) {}
        }
        return;
      }

      // filename decision
      let ext = '';
      try {
        const u = new URL(url);
        const m = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(?:$|\?)/i.exec(u.pathname);
        if (m && m[1]) ext = '.' + m[1];
      } catch (e) {}
      if (!ext) ext = '.jpg';

      const baseName = `large_image_${Date.now()}_${idx}${ext}`;
      const filename = folderName ? `${folderName}/${baseName}` : baseName;

      chrome.downloads.download({url, filename, conflictAction: 'uniquify'}, id => {
        if (chrome.runtime.lastError || !id) {
          console.warn('[background] Download request failed for', url, chrome.runtime.lastError && chrome.runtime.lastError.message, {filename, id});
          // Fallback: try to fetch the resource in the service worker and download a blob URL
          (async () => {
            try {
              console.log('[background] attempting fetch-fallback for', url);
              const resp = await fetch(url, {credentials: 'include'});
              if (!resp.ok) throw new Error('fetch failed: ' + resp.status + ' ' + resp.statusText);
              const blob = await resp.blob();
              const objectUrl = URL.createObjectURL(blob);
              // Try download with object URL
              chrome.downloads.download({url: objectUrl, filename, conflictAction: 'uniquify'}, id2 => {
                if (chrome.runtime.lastError || !id2) {
                  console.error('[background] fallback download also failed for', url, chrome.runtime.lastError && chrome.runtime.lastError.message, {filename, id2});
                } else {
                  console.log('[background] fallback download requested', {url, filename, id2});
                  active.add(id2);
                  // revoke object URL later
                  setTimeout(() => {
                    try { URL.revokeObjectURL(objectUrl); } catch (e) {}
                  }, 60000);
                }
              });
            } catch (err) {
              console.error('[background] fetch-fallback failed for', url, err && err.message);
            }
          })();
        } else {
          console.log('[background] download requested', {url, filename, id});
          active.add(id);
        }
        started++;
        // if all downloads were attempted but none became active (e.g., blocked), finish
        if (started === total && active.size === 0) {
          chrome.runtime.sendMessage({action: 'download_done', total, completed});
          try { chrome.downloads.onChanged.removeListener(onChanged); } catch (e) {}
        }
      });
    } catch (err) {
      console.warn('Error while requesting download', err && err.message);
      started++;
      if (started === total && active.size === 0) {
        chrome.runtime.sendMessage({action: 'download_done', total, completed});
        try { chrome.downloads.onChanged.removeListener(onChanged); } catch (e) {}
      }
    }
  });

  // respond immediately that requests were accepted; progress is sent via runtime messages
  sendResponse({ok: true, requested: total});
  return true; // keep channel open
});
