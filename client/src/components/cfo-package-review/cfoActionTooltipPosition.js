/** Keep a portal-rendered tooltip visible even next to sticky table columns. */
export function getCfoTooltipPosition({anchor, viewportWidth, viewportHeight, width, height}) {
  const margin = 12;
  const gap = 10;
  const tooltipWidth = Math.min(Math.max(0, width), Math.max(0, viewportWidth - margin * 2));
  const halfWidth = tooltipWidth / 2;
  const anchorCenter = anchor.left + anchor.width / 2;
  const centerX = Math.max(margin + halfWidth, Math.min(anchorCenter, viewportWidth - margin - halfWidth));
  const topSpace = anchor.top - margin;
  const bottomSpace = viewportHeight - anchor.bottom - margin;
  const below = topSpace < height + gap && bottomSpace >= topSpace;
  const top = below ? Math.min(anchor.bottom + gap, viewportHeight - margin - height) : Math.max(margin, anchor.top - gap - height);
  const arrowX = Math.max(12, Math.min(tooltipWidth - 12, anchorCenter - (centerX - halfWidth)));
  return {centerX, top, below, arrowX};
}
