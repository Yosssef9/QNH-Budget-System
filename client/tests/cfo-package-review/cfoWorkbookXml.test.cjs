/** Regression checks for the CFO XLSX OOXML written by the actual browser exporter.
 * No browser, third-party libraries, or database required. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const exporterPath = path.resolve(__dirname, '../../src/utils/budgetExcelExport.js');
const pagePath = path.resolve(__dirname, '../../src/pages/cfo-package-review/CfoPackageReviewPage.jsx');

async function generatedCfoWorkbookParts() {
  const original = fs.readFileSync(exporterPath, 'utf8');
  // The exporter's own OOXML writer is executed as-is. Stub only its external
  // save/zip/browser dependencies so the test can inspect its actual output.
  const executable = original
    .replace(/^import .*;\s*$/gm, '')
    .replace(/^export async function /gm, 'async function ')
    .replace(/import\.meta\.env\.BASE_URL/g, '"/"');
  const result = { files: null, logoFetchCount: 0 };
  const context = {
    TextEncoder, Blob, Uint8Array,
    strToU8: value => new TextEncoder().encode(value),
    zipSync: files => { result.files = files; return Uint8Array.of(1); },
    saveAs: () => {},
    buildApprovedDistribution: () => [],
    // Pretend the QNH logo exists: CFO must explicitly skip loading it.
    fetch: async () => {
      result.logoFetchCount += 1;
      return { ok: true, arrayBuffer: async () => Uint8Array.from([137,80,78,71,13,10,26,10]).buffer };
    },
  };
  vm.runInNewContext(executable, context, { filename: exporterPath });
  await context.exportBudgetTableViewToExcel({
    title: 'CFO Report — Department & Category', subtitle: 'FY 2027',
    columns: [{key:'department',label:'Department',type:'text',width:30},
      {key:'approved',label:'Approved Qty',type:'quantity',width:14},
      {key:'value',label:'Allocated Value',type:'currency',width:22}],
    rows: [{department:'Finance & Accounting\u000B\nDepartment',approved:8,value:120000},
      {department:'Cath Lab',approved:4,value:45000}],
    totals: {approved:12,value:165000},
    filters: ['Category: All','Status: All'], fileName:'CFO_By_Department.xlsx',
  });
  assert.ok(result.files, 'OOXML parts were produced');
  return {
    ...Object.fromEntries(Object.entries(result.files).map(([name, bytes]) =>
      [name, new TextDecoder().decode(bytes)])),
    __logoFetchCount: result.logoFetchCount,
  };
}

test('CFO workbook keeps autoFilter before mergeCells in the worksheet schema', async () => {
  const worksheet = (await generatedCfoWorkbookParts())['xl/worksheets/sheet1.xml'];
  const autoFilter = worksheet.indexOf('<autoFilter ');
  const merged = worksheet.indexOf('<mergeCells ');
  assert.ok(autoFilter >= 0 && merged >= 0, 'both AutoFilter and merged headings exist');
  assert.ok(autoFilter < merged, 'OOXML requires autoFilter before mergeCells');
  assert.match(worksheet, /<autoFilter ref="A5:C7"\/>/);
});

test('CFO workbook escapes data and rejects invalid XML 1.0 characters', async () => {
  const worksheet = (await generatedCfoWorkbookParts())['xl/worksheets/sheet1.xml'];
  assert.ok(worksheet.includes('Finance &amp; Accounting'));
  assert.equal(worksheet.includes('\u000B'), false, 'invalid U+000B stripped');
  assert.ok(worksheet.includes('>120000</v>'), 'Excel amount is numeric');
  assert.ok(worksheet.includes('>165000</v>'), 'Excel total is numeric');
});

test('CFO Export button does not depend on optional comparison request success', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  const disabled = page.match(/const exportDisabled = ([\s\S]*?);/);
  assert.ok(disabled, 'export disabled expression found');
  assert.doesNotMatch(disabled[1], /comparisonQueries|optionalComparisonsUnavailable/);
  assert.match(page, /optionalComparisonsUnavailable/);
  assert.match(page, /comparisons were unavailable/);
});


test('CFO export scrolls normally: no frozen row or column panes', async () => {
  const worksheet = (await generatedCfoWorkbookParts())['xl/worksheets/sheet1.xml'];
  assert.match(worksheet, /<sheetView workbookViewId="0" showGridLines="0">/);
  assert.doesNotMatch(worksheet, /<pane\b|state="frozen"|<selection pane=/);
  // AutoFilter remains enabled: ordinary Excel filter dropdowns are unaffected.
  assert.match(worksheet, /<autoFilter ref="A5:C7"\/>/);
});

test('CFO export excludes logo media/drawings even when logo is available', async () => {
  const parts = await generatedCfoWorkbookParts();
  assert.equal(parts.__logoFetchCount, 0, 'CFO export should not request a logo');
  assert.ok(Object.keys(parts).every(name => !/xl\/(drawings|media)\//.test(name)));
  assert.ok(Object.keys(parts).every(name => !/worksheets\/_rels\//.test(name)));
  assert.doesNotMatch(parts['xl/worksheets/sheet1.xml'], /<drawing\b/);
  assert.doesNotMatch(parts['[Content_Types].xml'], /drawing\d+|image\/png/);
});

test('regular department and category exports still retain their existing freeze and logo defaults', () => {
  const source = fs.readFileSync(exporterPath, 'utf8');
  assert.match(source, /freeze:\s*\{\s*xSplit:\s*frozenColumnCount/);
  assert.match(source, /async function buildWorkbookBlob\(sheets, \{ includeLogo = true \} = \{\}\)/);
  assert.match(source, /buildWorkbookBlob\(\[sheet\], \{ includeLogo: false \}\)/);
});
