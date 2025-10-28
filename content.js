// content.js
// Listens for a message to collect images >= 300x300 and sends them to the background for download.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.action !== 'collect_images') return;

  // accept an optional filter object: {minWidth, maxWidth, minHeight, maxHeight}
  const filter = (msg && msg.filter) || {};
  const parse = v => (v === undefined || v === null || v === '' ? undefined : Number(v));
  const f = {
    minWidth: parse(filter.minWidth),
    maxWidth: parse(filter.maxWidth),
    minHeight: parse(filter.minHeight),
    maxHeight: parse(filter.maxHeight)
  };

  const meets = (w, h) => {
    if (f.minWidth !== undefined && w < f.minWidth) return false;
    if (f.maxWidth !== undefined && w > f.maxWidth) return false;
    if (f.minHeight !== undefined && h < f.minHeight) return false;
    if (f.maxHeight !== undefined && h > f.maxHeight) return false;
    return true;
  };

  try {
    const images = [];

    // Helper to normalize url
    const normalize = src => {
      try { return new URL(src, location.href).href; } catch (e) { return src; }
    };

    // Collect <img> elements
    const imgEls = Array.from(document.images || []);
    imgEls.forEach(img => {
      const w = img.naturalWidth || img.width || img.clientWidth;
      const h = img.naturalHeight || img.height || img.clientHeight;
      if (meets(w, h)) {
        images.push({src: normalize(img.currentSrc || img.src || img.getAttribute('src')), width: w, height: h, type: 'img'});
      }
    });

    // Collect background images
    const all = Array.from(document.querySelectorAll('*'));
    all.forEach(el => {
      const style = window.getComputedStyle(el);
      const bg = style && style.backgroundImage;
      if (bg && bg !== 'none') {
        // extract url(...) from background-image
        const m = /url\((?:"|')?(.*?)(?:"|')?\)/.exec(bg);
        if (m && m[1]) {
          const rect = el.getBoundingClientRect();
          const w = Math.round(rect.width);
          const h = Math.round(rect.height);
          if (meets(w, h)) {
            images.push({src: normalize(m[1]), width: w, height: h, type: 'background'});
          }
        }
      }
    });

    // Remove duplicates by src
    const unique = [];
    const seen = new Set();
    images.forEach(it => {
      if (!it.src) return;
      if (seen.has(it.src)) return;
      seen.add(it.src);
      unique.push(it);
    });

    // Return the list to the caller (popup) so the user can select which to download.
    // Include the page title so the popup can build a folder name.
    sendResponse({ok: true, count: unique.length, images: unique, title: document.title});
  } catch (err) {
    sendResponse({ok: false, error: err && err.message});
  }

  // keep channel open for async response if needed
  return true;
});
