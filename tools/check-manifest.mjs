// tools/check-manifest.mjs
//
// The cheap half of a release check: prove the manifest still points at files
// that exist, and that the two places recording a version agree. A renamed or
// deleted script is otherwise silent until the extension is loaded in Chrome,
// and a version that drifts between manifest.json and package.json produces a
// release zip whose name doesn't match what it installs as.
//
// Given a directory, it checks that directory as a built package instead of the
// repo. tools/package.sh points it at the unpacked release zip, so a source
// directory the zip leaves out fails the build: v1.4.0 through v1.9.0 declared
// a toolbar popup and shipped without popup/, and nothing noticed.
//
// Run: node tools/check-manifest.mjs [package-dir]

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

const PACKAGE_DIR = process.argv[2];
const ROOT = PACKAGE_DIR
    ? resolve(PACKAGE_DIR)
    : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

function readJson(relPath) {
    try {
        return JSON.parse(readFileSync(join(ROOT, relPath), 'utf8'));
    } catch (err) {
        problems.push(`${relPath} could not be parsed: ${err.message}`);
        return null;
    }
}

const manifest = readJson('manifest.json');
// package.json is repo tooling and never ships, so the version check below only
// runs against the repo.
const pkg = PACKAGE_DIR ? null : readJson('package.json');

// --- referenced files exist -------------------------------------------------

// Every manifest field that names a file, flattened to {field, path} pairs so a
// failure can say which key pointed at the missing file. Keys this manifest
// doesn't use yet are listed too, so adding a side panel or a locale later is
// checked without anyone remembering to come back here.
function manifestFileRefs(m) {
    const refs = [];
    const add = (field, value) => {
        if (typeof value === 'string' && value) refs.push({ field, path: value });
    };

    add('background.service_worker', m.background?.service_worker);
    add('options_page', m.options_page);
    add('options_ui.page', m.options_ui?.page);
    add('side_panel.default_path', m.side_panel?.default_path);
    add('devtools_page', m.devtools_page);
    for (const [page, path] of Object.entries(m.chrome_url_overrides || {})) {
        add(`chrome_url_overrides.${page}`, path);
    }
    (m.sandbox?.pages || []).forEach(p => add('sandbox.pages', p));
    if (m.default_locale) add('default_locale', `_locales/${m.default_locale}/messages.json`);

    for (const [size, path] of Object.entries(m.icons || {})) add(`icons.${size}`, path);
    add('action.default_popup', m.action?.default_popup);
    // default_icon may be a single path rather than a size map.
    const actionIcon = m.action?.default_icon;
    if (typeof actionIcon === 'string') {
        add('action.default_icon', actionIcon);
    } else {
        for (const [size, path] of Object.entries(actionIcon || {})) {
            add(`action.default_icon.${size}`, path);
        }
    }

    (m.content_scripts || []).forEach((entry, i) => {
        (entry.js || []).forEach(p => add(`content_scripts[${i}].js`, p));
        (entry.css || []).forEach(p => add(`content_scripts[${i}].css`, p));
    });

    (m.web_accessible_resources || []).forEach((entry, i) => {
        (entry.resources || []).forEach(p => {
            // Patterns are matched at runtime, not resolved as paths.
            if (!p.includes('*')) add(`web_accessible_resources[${i}].resources`, p);
        });
    });

    return refs;
}

// --- and so does everything they load ---------------------------------------

// The manifest names entry points; what those load is invisible to it. The
// popup page loads popup.js, which imports scripts/providers.js, which imports
// each provider's client, so a module renamed, or a directory left out of the
// package, fails nothing until that page or the service worker breaks in
// Chrome. Each file reached is therefore read for what it loads in turn (a
// page's <script>, <link> and <img>; a script's relative imports and its
// chrome.runtime.getURL('…') targets), and those have to exist too.
const PAGE_REFS = /<(?:script|link|img)\b[^>]*?\s(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const IMPORTS = /\bfrom\s+['"](\.[^'"]+)['"]|\bimport\s*\(?\s*['"](\.[^'"]+)['"]/g;
const GET_URL = /\bgetURL\(\s*['"]([^'"]+)['"]/g;

const reached = new Set();

// Resolve `ref` the way Chrome does, against `base` or, with a leading '/',
// against the extension root, and record a problem unless it names a file
// inside the root. Anything with a scheme (https:, data:, mailto:) or a bare
// fragment isn't a file in the package, and a query or fragment on a file
// doesn't change which file it is.
function need(from, ref, base, problem) {
    if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) return;
    const file = ref.replace(/[?#].*$/, '');
    const path = relative(ROOT, file.startsWith('/') ? join(ROOT, file) : resolve(base, file));
    if (path.startsWith('..') || isAbsolute(path)) {
        // Chrome won't load it, and in a package unpacked inside the repo it
        // could otherwise be "found" in the source tree.
        problems.push(`${from} points outside the extension: ${ref}`);
    } else if (!existsSync(join(ROOT, path))) {
        problems.push(`${from} ${problem}: ${ref}`);
    } else {
        follow(path);
    }
}

function follow(path) {
    if (reached.has(path)) return;
    reached.add(path);
    const abs = join(ROOT, path);
    if (path.endsWith('.html')) {
        // A commented-out tag loads nothing.
        const page = readFileSync(abs, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
        for (const [, ref] of page.matchAll(PAGE_REFS)) {
            need(path, ref, dirname(abs), 'loads a missing file');
        }
    } else if (path.endsWith('.js')) {
        const source = readFileSync(abs, 'utf8');
        for (const match of source.matchAll(IMPORTS)) {
            need(path, match[1] || match[2], dirname(abs), 'imports a missing module');
        }
        for (const [, ref] of source.matchAll(GET_URL)) {
            need(path, ref, ROOT, 'refers to a missing file');
        }
    }
}

if (manifest) {
    for (const { field, path } of manifestFileRefs(manifest)) {
        need(`manifest ${field}`, path, ROOT, 'points at a missing file');
    }
}

// --- versions agree ---------------------------------------------------------

// manifest.json allows 2-4 parts ("1.2"); package.json needs full semver. Pad
// both to three parts before comparing so "1.2" and "1.2.0" count as the same
// release rather than as a mismatch to chase.
function padVersion(v) {
    const parts = String(v ?? '').split('.');
    while (parts.length < 3) parts.push('0');
    return parts.slice(0, 3).join('.');
}

if (manifest && pkg) {
    if (!/^\d+(\.\d+){1,3}$/.test(String(manifest.version ?? ''))) {
        problems.push(`manifest version is not a valid extension version: ${manifest.version}`);
    } else if (padVersion(manifest.version) !== padVersion(pkg.version)) {
        problems.push(
            `version mismatch: manifest.json ${manifest.version} vs package.json ${pkg.version}`
        );
    }
}

// --- report -----------------------------------------------------------------

if (problems.length) {
    console.error(PACKAGE_DIR ? 'Package check failed:' : 'Manifest check failed:');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
}

console.log(PACKAGE_DIR
    ? `Package check passed: all ${reached.size} files the extension loads are present.`
    : `Manifest check passed (version ${manifest.version}).`);
