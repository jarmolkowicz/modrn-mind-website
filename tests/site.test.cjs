const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function page({ consent = null, blocked = false, hostname = 'modrnmind.com', copyFails = false } = {}) {
    const scripts = [], copied = [], choices = [], timers = [];
    const button = (dataset = {}) => ({
        dataset, disabled: false, attributes: {},
        addEventListener(name, callback) { this[name] = callback; },
        setAttribute(name, value) { this.attributes[name] = value; }
    });
    const accept = button({ consent: 'accepted' });
    const decline = button({ consent: 'declined' });
    const banner = { hidden: true, querySelectorAll: () => [accept, decline] };
    const status = { textContent: '' };
    const copy = button();
    copy.closest = () => ({
        querySelector: (selector) => ({ textContent: selector === 'p' ? 'Prompt with citation instruction.' : 'Professional judgment' })
    });
    let selected = false;
    const context = {
        location: { hostname },
        localStorage: {
            getItem() { if (blocked) throw Error('blocked'); return consent; },
            setItem(key, value) { if (blocked) throw Error('blocked'); choices.push(value); }
        },
        navigator: { clipboard: { async writeText(text) {
            if (copyFails) throw Error('denied');
            copied.push(text);
        } } },
        document: {
            getElementById: (id) => id === 'cookieBanner' ? banner : status,
            querySelectorAll: () => [copy],
            createElement: () => ({}),
            head: { appendChild: (element) => scripts.push(element) },
            createRange: () => ({ selectNodeContents() { selected = true; } })
        },
        getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
        setTimeout: (callback) => { timers.push(callback); return timers.length; },
        clearTimeout() {}
    };
    context.window = context;
    vm.runInNewContext(source, context);
    return { scripts, banner, accept, decline, copy, copied, choices, status, timers, selected: () => selected };
}

test('analytics requires consent and loads only once on production', () => {
    const p = page();
    assert.equal(p.scripts.length, 0);
    assert.equal(p.banner.hidden, false);
    p.accept.click();
    p.accept.click();
    assert.equal(p.scripts.length, 1);
    assert.equal(p.banner.hidden, true);
    assert.equal(page({ consent: 'accepted' }).scripts.length, 1);
    assert.equal(page({ consent: 'declined' }).scripts.length, 0);
    assert.equal(page({ consent: 'accepted', hostname: '127.0.0.1' }).scripts.length, 0);
});

test('declining and unavailable storage do not break consent or prompt controls', async () => {
    const p = page({ blocked: true });
    p.decline.click();
    assert.equal(p.banner.hidden, true);
    assert.equal(p.scripts.length, 0);
    await p.copy.click();
    assert.equal(p.copied.length, 1);
});

test('copy provides feedback and restores its button', async () => {
    const p = page();
    await p.copy.click();
    assert.deepEqual(p.copied, ['Prompt with citation instruction.']);
    assert.equal(p.copy.disabled, false);
    assert.equal(p.copy.dataset.copied, 'true');
    assert.match(p.status.textContent, /Copied prompt/);
    p.timers[0]();
    assert.equal(p.copy.dataset.copied, undefined);
    assert.equal(p.copy.attributes['aria-label'], 'Copy prompt: Professional judgment');
});

test('copy rejection selects text for manual copying and leaves a retry available', async () => {
    const p = page({ copyFails: true });
    await p.copy.click();
    assert.equal(p.selected(), true);
    assert.equal(p.copy.disabled, false);
    assert.match(p.status.textContent, /Could not copy/);
    assert.equal(p.copy.dataset.copied, undefined);
});

test('page assets, anchors, structured data and prompt instructions are valid', () => {
    assert.doesNotMatch(html, /\s(?:onclick|style)=/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), target);
    for (const [, asset] of html.matchAll(/(?:src|href)="\/([^"#?]+)"/g)) {
        assert.ok(fs.existsSync(path.join(root, asset)), asset);
    }
    const structured = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(JSON.parse(structured[1])['@graph']);
    assert.equal((html.match(/data-copy-prompt/g) || []).length, 3);
    assert.equal((html.match(/Cite sources from the pack and distinguish findings from interpretation\./g) || []).length, 3);
});

test('count sync detects stale hero values and updates all five metrics', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'modrn-mind-audit-'));
    try {
        fs.mkdirSync(path.join(temp, 'scripts'));
        fs.copyFileSync(path.join(root, 'scripts/sync-kb-counts.ps1'), path.join(temp, 'scripts/sync-kb-counts.ps1'));
        fs.writeFileSync(path.join(temp, 'index.html'), html);
        fs.copyFileSync(path.join(root, 'sitemap.xml'), path.join(temp, 'sitemap.xml'));
        const index = path.join(temp, 'kb-index.md');
        fs.writeFileSync(index, '**Total entries:** 400 (180 sources, 90 concepts, 30 methods, 100 practices)\nGenerated 2026-10-01.');
        const args = ['-NoProfile', '-File', path.join(temp, 'scripts/sync-kb-counts.ps1'), '-KbIndexPath', index];
        const run = (check = false) => spawnSync('pwsh', [...args, ...(check ? ['-Check'] : [])], { encoding: 'utf8' });
        assert.notEqual(run(true).status, 0);
        const update = run();
        assert.equal(update.status, 0, update.stderr);
        const updated = fs.readFileSync(path.join(temp, 'index.html'), 'utf8');
        for (const [label, value] of Object.entries({ entries: 400, sources: 180, concepts: 90, methods: 30, practices: 100 })) {
            assert.ok(updated.includes('data-kb-count="' + label + '">' + value), label);
        }
        assert.ok(updated.includes('400 entries: 90 concepts, 30 methods, 100 practices, and 180 sources.'));
        assert.ok(updated.includes('containing 400 entries (concepts, methods, practices, sources)'));
        assert.ok(updated.includes('"dateModified": "2026-10-01"'));
        assert.equal(run(true).status, 0);
        fs.writeFileSync(path.join(temp, 'index.html'), updated.replace('data-kb-count="entries">400', 'data-kb-count="entries">399'));
        assert.notEqual(run(true).status, 0, 'Hero-only drift must fail');
        fs.writeFileSync(path.join(temp, 'index.html'), updated.replace('data-kb-count="practices">100', 'data-kb-count="practices">99'));
        assert.notEqual(run(true).status, 0, 'Practice-only drift must fail');
    } finally {
        // Only the isolated test directory created above is removed.
        fs.rmSync(temp, { recursive: true, force: true });
    }
});
