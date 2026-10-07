// The release zip has to contain everything the extension loads.
//
// v1.4.0 through v1.9.0 declared a toolbar popup in the manifest and shipped a
// zip without the popup/ folder. Nothing failed, because the manifest was only
// ever checked against the repo. tools/package.sh now runs the same check on
// the unpacked zip; these pin that the check notices what is missing (the page,
// the script that page loads, the module that script imports) rather than
// passing whatever directory it is pointed at.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CHECK = path.join(__dirname, '..', 'tools', 'check-manifest.mjs');

// The popup's whole chain, built the way the real one is: a page, its script,
// and a module that script imports from the shared scripts/ folder.
const COMPLETE = {
  'manifest.json': JSON.stringify({
    manifest_version: 3,
    name: 'Fixture',
    version: '1.0.0',
    action: { default_popup: 'popup/popup.html' }
  }),
  // The commented-out tag loads nothing, so it must not count as missing.
  'popup/popup.html': '<!-- <script src="old.js"></script> -->\n<script type="module" src="popup.js"></script>',
  'popup/popup.js': "import { PROVIDERS } from '../scripts/providers.js';",
  'scripts/providers.js': 'export const PROVIDERS = [];'
};

function without(...names) {
  return Object.fromEntries(Object.entries(COMPLETE).filter(([name]) => !names.includes(name)));
}

// Writes `files` as an unpacked package and runs the check on it. The package
// sits one level down in its temp folder, so a test can put a file beside it:
// outside the extension, but still on disk.
function checkPackage(t, files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'package-check-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const dir = path.join(tmp, 'extension');
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  const run = spawnSync(process.execPath, [CHECK, dir], { encoding: 'utf8' });
  return { status: run.status, output: run.stdout + run.stderr };
}

test('a package holding the popup, its script and its imports passes', (t) => {
  const { status, output } = checkPackage(t, COMPLETE);
  assert.equal(status, 0, output);
  // Three, not one: the check followed the page into its script and imports.
  assert.match(output, /all 3 files the extension loads are present/);
});

test('a package without popup/ fails on the manifest key that names it', (t) => {
  const { status, output } = checkPackage(t, without('popup/popup.html', 'popup/popup.js'));
  assert.equal(status, 1);
  assert.match(output, /manifest action\.default_popup points at a missing file: popup\/popup\.html/);
});

test('a popup page whose script was left out fails', (t) => {
  const { status, output } = checkPackage(t, without('popup/popup.js'));
  assert.equal(status, 1);
  assert.match(output, /popup\/popup\.html loads a missing file: popup\.js/);
});

test('a module the popup script imports has to be in the package too', (t) => {
  const { status, output } = checkPackage(t, without('scripts/providers.js'));
  assert.equal(status, 1);
  assert.match(output, /popup\/popup\.js imports a missing module: \.\.\/scripts\/providers\.js/);
});

test('a file beside the package does not count as inside it', (t) => {
  const { status, output } = checkPackage(t, {
    ...COMPLETE,
    'popup/popup.js': "import { PROVIDERS } from '../../providers.js';",
    '../providers.js': 'export const PROVIDERS = [];'
  });
  assert.equal(status, 1);
  assert.match(output, /popup\/popup\.js points outside the extension: \.\.\/\.\.\/providers\.js/);
});
