(() => {
  "use strict";

  const STYLE_ID = "lorhil-stamp-layout-fix-v21";
  const FIX_CSS = `
    .signature-area{
      position:relative !important;
      display:grid !important;
      grid-template-columns:minmax(0,44mm) 28mm !important;
      grid-template-rows:20mm auto !important;
      column-gap:4mm !important;
      justify-content:center !important;
      align-items:end !important;
      height:29mm !important;
      margin-top:1mm !important;
      box-sizing:border-box !important;
    }

    .signature-img{
      position:static !important;
      grid-column:1 !important;
      grid-row:1 !important;
      justify-self:center !important;
      align-self:end !important;
      width:42mm !important;
      height:19mm !important;
      max-width:100% !important;
      max-height:none !important;
      object-fit:contain !important;
      object-position:center bottom !important;
      transform:none !important;
      z-index:auto !important;
    }

    .stamp-img{
      position:static !important;
      grid-column:2 !important;
      grid-row:1 / 3 !important;
      justify-self:center !important;
      align-self:center !important;
      width:26mm !important;
      height:26mm !important;
      max-width:26mm !important;
      max-height:26mm !important;
      object-fit:contain !important;
      object-position:center !important;
      transform:none !important;
      z-index:auto !important;
    }

    .signer{
      position:static !important;
      grid-column:1 !important;
      grid-row:2 !important;
      align-self:start !important;
      width:100% !important;
      box-sizing:border-box !important;
      border-top:1px solid #4d626c !important;
      padding-top:1.3mm !important;
      text-align:center !important;
      z-index:auto !important;
    }

    .signer strong{
      display:block !important;
      font-size:7.8pt !important;
      line-height:1.15 !important;
    }

    .signer span{
      display:block !important;
      margin-top:.5mm !important;
      font-size:6.8pt !important;
      line-height:1.15 !important;
    }
  `;

  function installStyle(targetWindow) {
    try {
      if (!targetWindow || targetWindow.closed) return false;

      const doc = targetWindow.document;
      if (!doc) return false;

      if (!doc.getElementById(STYLE_ID)) {
        const style = doc.createElement("style");
        style.id = STYLE_ID;
        style.textContent = FIX_CSS;
        (doc.head || doc.documentElement).appendChild(style);
      }

      if (doc.querySelector(".signature-area")) {
        if (typeof targetWindow.fit === "function") {
          targetWindow.setTimeout(() => targetWindow.fit(), 0);
        }
        return true;
      }
    } catch (error) {
      // Abaikan jendela lintas domain. Invoice LORHIL tetap satu origin.
    }

    return false;
  }

  function watchWindow(targetWindow) {
    if (!targetWindow) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const applied = installStyle(targetWindow);

      if (applied || targetWindow.closed || attempts >= 200) {
        window.clearInterval(timer);
      }
    }, 50);

    try {
      targetWindow.addEventListener("load", () => installStyle(targetWindow));
    } catch (error) {
      // Tidak perlu tindakan tambahan.
    }
  }

  const originalOpen = window.open.bind(window);

  window.open = function patchedWindowOpen(...args) {
    const openedWindow = originalOpen(...args);
    watchWindow(openedWindow);
    return openedWindow;
  };

  installStyle(window);

  const observer = new MutationObserver(() => installStyle(window));
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
