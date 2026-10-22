import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeSidebarOpeningMode,
  loadSidebarOpeningMode,
  isSidebarExpanded,
  SIDEBAR_OPENING_MODE_STORAGE_KEY,
} from "../../src/layouts/sidebarOpeningMode.js";

const layout = readFileSync(new URL("../../src/layouts/DashboardLayout.jsx", import.meta.url), "utf8");

test("the default mode remains Hover and a saved Click preference loads", () => {
  assert.equal(normalizeSidebarOpeningMode(null), "hover");
  assert.equal(normalizeSidebarOpeningMode("click"), "click");
  assert.equal(normalizeSidebarOpeningMode("pin"), "hover");
  assert.equal(loadSidebarOpeningMode({ getItem: (key) =>
    key === SIDEBAR_OPENING_MODE_STORAGE_KEY ? "click" : null }), "click");
  assert.equal(loadSidebarOpeningMode({ getItem: () => null }), "hover");
});

test("storage failures fall back safely to Hover", () => {
  assert.equal(loadSidebarOpeningMode({ getItem() { throw new Error("Denied"); } }), "hover");
});

test("Hover mode follows hover; Click mode ignores hover", () => {
  assert.equal(isSidebarExpanded({ mode: "hover", hovered: true, clickOpen: false }), true);
  assert.equal(isSidebarExpanded({ mode: "hover", hovered: false, clickOpen: true }), false);
  assert.equal(isSidebarExpanded({ mode: "click", hovered: true, clickOpen: false }), false);
  assert.equal(isSidebarExpanded({ mode: "click", hovered: false, clickOpen: true }), true);
  assert.equal(isSidebarExpanded({ mode: "click", hovered: true, clickOpen: true }), true);
});

test("sidebar layout removes Pin control and pin state completely", () => {
  for (const legacy of [
    "sidebarPinned",
    "setSidebarPinned",
    "handleSidebarPinToggle",
    "aria-pressed={sidebarPinned}",
    "Pin sidebar",
    "Unpin sidebar",
    "<Pin",
    "  Pin,",
  ]) assert.equal(layout.includes(legacy), false, legacy);
});

test("saved mode and manual toggle remain wired and accessible", () => {
  for (const required of [
    "toggleSidebarOpeningMode",
    "toggleSidebarByClick",
    "SIDEBAR_OPENING_MODE_STORAGE_KEY",
    'onMouseEnter={() => setSidebarHovered(true)}',
    'onMouseLeave={() => setSidebarHovered(false)}',
    'sidebarOpeningMode === "click" && (',
    'aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}',
    'setSidebarClickOpen((wasOpen) => !wasOpen)',
    'setSidebarClickOpen(sidebarOpen)',
    'setSidebarClickOpen(false)',
  ]) assert.ok(layout.includes(required), required);
  assert.ok(layout.includes('aria-pressed={sidebarOpeningMode === "click"}'));
  assert.ok(layout.includes('window.localStorage.setItem(SIDEBAR_OPENING_MODE_STORAGE_KEY, sidebarOpeningMode)'));
});
