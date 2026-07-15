export function downloadBlobAttachment({ blob, fileName = "attachment" }) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function viewBlobAttachment({ blob, fileName = "attachment" }) {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");

  if (!opened) {
    downloadBlobAttachment({ blob, fileName });
    URL.revokeObjectURL(url);
    return;
  }

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function openAttachmentPreviewWindow(fileName = "attachment") {
  const opened = window.open("", "_blank", "noopener,noreferrer");

  if (!opened) return null;

  opened.document.title = fileName;
  opened.document.body.innerHTML = `
    <main style="font-family: system-ui, sans-serif; padding: 24px; color: #334155;">
      <h1 style="font-size: 18px; margin: 0 0 8px;">Loading attachment...</h1>
      <p style="font-size: 14px; margin: 0;">The document will open in this tab.</p>
    </main>
  `;

  return opened;
}

export function viewBlobAttachmentInWindow({
  blob,
  fileName = "attachment",
  targetWindow,
}) {
  if (!targetWindow || targetWindow.closed) {
    viewBlobAttachment({ blob, fileName });
    return;
  }

  const url = URL.createObjectURL(blob);
  targetWindow.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
