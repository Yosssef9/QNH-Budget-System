import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../../src/layouts/DashboardLayout.jsx", import.meta.url), "utf8");
const tooltip = readFileSync(new URL("../../src/layouts/SidebarIconTooltip.jsx", import.meta.url), "utf8");

test("all permission-filtered navigation buttons share an accessible sidebar tooltip", () => {
  assert.match(layout, /<SidebarIconTooltip key=\{item\.path\} label=\{item\.label\} disabled=\{sidebarOpen\}>/);
  assert.match(layout, /aria-label=\{item\.label\}/);
  assert.match(layout, /onClick=\{\(\) => safeNavigate\(item\.path\)\}/);
  assert.doesNotMatch(layout, /title=\{!sidebarOpen \? item\.label/);
});

test("sidebar top controls and logout provide specific labels in collapsed mode", () => {
  assert.match(layout, /Sidebar mode: Hover — switch to Click mode/);
  assert.match(layout, /Sidebar mode: Click — switch to Hover mode/);
  assert.match(layout, /label=\{sidebarOpen \? "Collapse sidebar" : "Expand sidebar"\}/);
  assert.match(layout, /<SidebarIconTooltip label="Logout" disabled=\{sidebarOpen\}>/);
  assert.match(layout, /aria-label="Logout"/);
});

test("tooltip supports delay, keyboard focus and escape to dismiss", () => {
  assert.match(tooltip, /HOVER_DELAY_MS = 240/);
  assert.match(tooltip, /onMouseEnter=\{showOnHover\}/);
  assert.match(tooltip, /onMouseLeave=\{hide\}/);
  assert.match(tooltip, /onFocusCapture=\{showOnFocus\}/);
  assert.match(tooltip, /onBlurCapture=/);
  assert.match(tooltip, /event\.key === "Escape"/);
  assert.match(tooltip, /aria-describedby/);
  assert.match(tooltip, /role="tooltip"/);
});

test("tooltips render outside scroll containers, reposition and animate", () => {
  assert.match(tooltip, /createPortal\(/);
  assert.match(tooltip, /document\.body/);
  assert.match(tooltip, /getBoundingClientRect\(/);
  assert.match(tooltip, /window\.addEventListener\("scroll", updatePosition, true\)/);
  assert.match(tooltip, /window\.addEventListener\("resize", updatePosition\)/);
  assert.match(tooltip, /<AnimatePresence>/);
  assert.match(tooltip, /exit=\{\{ opacity: 0, x: -4 \}\}/);
  assert.match(tooltip, /pointer-events-none fixed z-\[1100\]/);
});
