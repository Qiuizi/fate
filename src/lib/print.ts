/**
 * 把一段完整 HTML 交给系统打印（用于“打印 / 另存 PDF”）。
 *
 * 以前用 window.open('', '_blank') 新开窗口：浏览器拦截弹窗时静默失败，
 * Electron 桌面版的 setWindowOpenHandler 又会拒绝 about:blank，导致按钮无反应。
 * 现在改为在页面内放一个不可见的 iframe 打印，浏览器与桌面版行为一致。
 */
export function printHTML(html: string, title = 'report') {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.title = title;
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(frame);

  let done = false;
  const cleanup = () => window.setTimeout(() => frame.remove(), 1000);
  const doPrint = () => {
    if (done) return;
    done = true;
    const w = frame.contentWindow;
    if (!w) {
      cleanup();
      return;
    }
    try {
      w.document.title = title;
      w.focus();
      w.addEventListener('afterprint', cleanup, { once: true });
      w.print();
    } catch {
      cleanup();
    }
    // 某些环境不触发 afterprint：兜底在一分钟后移除
    window.setTimeout(() => frame.remove(), 60000);
  };

  frame.onload = () => window.setTimeout(doPrint, 300);
  const doc = frame.contentWindow?.document;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(doPrint, 1200);
}
