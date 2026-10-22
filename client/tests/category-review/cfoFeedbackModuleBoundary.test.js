import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(testDir, '../..');
const read = (file) => fs.readFileSync(path.join(clientDir, file), 'utf8');

// Windows filesystems are generally case-insensitive. A lower-cased JS helper
// with the same basename as a JSX component is ambiguous for extensionless imports.
test('CFO feedback component and helper have unambiguous Windows-safe filenames', () => {
  const dir = path.join(clientDir, 'src/components/category-review');
  const entries = fs.readdirSync(dir).filter((entry) => /\.[cm]?[jt]sx?$/.test(entry));
  const stems = new Set();
  for (const entry of entries) {
    const lowerStem = path.parse(entry).name.toLowerCase();
    assert.equal(stems.has(lowerStem), false, `Ambiguous case-insensitive module stem: ${entry}`);
    stems.add(lowerStem);
  }
  assert.equal(fs.existsSync(path.join(dir, 'CfoRevisionFeedback.jsx')), true);
  assert.equal(fs.existsSync(path.join(dir, 'cfoRevisionFeedback.utils.js')), true);
  assert.equal(fs.existsSync(path.join(dir, 'cfoRevisionFeedback.js')), false);
});

test('CFO feedback component imports always specify the JSX extension', () => {
  const consumers = [
    'src/components/category-packages/CategoryPackageWorkbench.jsx',
    'src/components/category-review/DepartmentReviewStage.jsx',
    'src/pages/category-review/CategoryReviewPage.jsx',
  ];
  for (const consumer of consumers) {
    assert.match(read(consumer), /from ["'][^"']*\/CfoRevisionFeedback\.jsx["']/);
    assert.doesNotMatch(read(consumer), /from ["'][^"']*\/CfoRevisionFeedback["']/);
  }
});

test('CFO feedback helpers are imported from the renamed utility module', () => {
  const consumers = [
    'src/components/category-packages/CategoryPackageWorkbench.jsx',
    'src/components/category-review/DepartmentReviewStage.jsx',
    'src/components/category-review/CfoRevisionFeedback.jsx',
  ];
  for (const consumer of consumers) {
    assert.match(read(consumer), /cfoRevisionFeedback\.utils\.js/);
  }
  assert.match(read('src/components/category-review/CfoRevisionFeedback.jsx'), /export function CfoFeedbackNote\(/);
});
