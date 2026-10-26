/* ===================================================================
   LMC FRONT PAGE BUILDER (bookmarklet)
   Run from any page inside a Canvas course. It reads the course's
   modules through the Canvas API (using the instructor's existing
   login session), lets the instructor choose which modules become
   buttons, and generates Canvas-safe HTML (inline styles only) to
   paste into the Rich Content Editor's HTML view.
   Colors: LMC Red #A6192E / Graves Gray #54585A / White #FFFFFF
   =================================================================== */
(async function () {
  'use strict';

  const VERSION = '1.1.0';
  const HOST_ID = 'lmc-front-page-builder';
  const existing = document.getElementById(HOST_ID);
  if (existing) { existing.remove(); }

  const match = location.pathname.match(/\/courses\/(\d+)/);
  if (!match) {
    alert('LMC Front Page Builder: open any page inside a Canvas course first.\n' +
          '(The address should contain /courses/ followed by a number.)');
    return;
  }
  const courseId = match[1];

  const COLORS = { primary: '#A6192E', secondary: '#54585A' };
  // Module names that usually hold course support material get the gray style by default
  const SECONDARY_RE = /admin|orientation|resource|lab|q\s*&\s*a|question|wrap|clos|support|help/i;

  /* --- Canvas API ---------------------------------------------------- */
  async function getJSON(url) {
    const res = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!res.ok) { throw new Error('Canvas returned ' + res.status + ' for ' + url); }
    const text = await res.text();
    return { data: JSON.parse(text.replace(/^while\(1\);/, '')), link: res.headers.get('Link') || '' };
  }

  async function getAllPages(url) {
    let out = [];
    let next = url;
    while (next) {
      const page = await getJSON(next);
      out = out.concat(page.data);
      const m = page.link.match(/<([^>]+)>;\s*rel="next"/);
      // Request the next page from this same site (a vanity domain may differ from the Link host)
      next = m ? (() => { const u = new URL(m[1], location.href); return u.pathname + u.search; })() : null;
    }
    return out;
  }

  /* --- Helpers ------------------------------------------------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  /* --- Overlay (shadow DOM so Canvas styles do not leak in) ---------- */
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });

  root.innerHTML = `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; }
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex;
    align-items: flex-start; justify-content: center; overflow-y: auto; padding: 2rem 1rem;
    font-family: "Lato", "Helvetica Neue", Arial, sans-serif; color: #262626; line-height: 1.4; }
  .dialog { background: #fff; width: 100%; max-width: 980px; border-radius: 10px;
    box-shadow: 0 10px 40px rgba(0,0,0,.35); }
  header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem;
    border-bottom: 4px solid #A6192E; }
  h1 { font-size: 1.3rem; margin: 0; color: #A6192E; }
  h2 { font-size: 1.05rem; margin: 1.5rem 0 .5rem; color: #262626; }
  .body { padding: 0 1.25rem 1.25rem; }
  label { display: block; font-weight: 700; font-size: .9rem; margin: .75rem 0 .25rem; }
  input[type=text], input[type=number], textarea, select { font: inherit; font-size: .95rem;
    padding: .4rem .5rem; border: 1px solid #8a8d8f; border-radius: 4px; width: 100%; color: #262626; background: #fff; }
  textarea { min-height: 5rem; resize: vertical; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
  @media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }
  .hint { font-size: .85rem; color: #54585A; margin: .25rem 0 0; }
  .count { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
  .count input { width: 6rem; }
  .row { display: grid; grid-template-columns: auto 1fr 9rem auto; gap: .5rem; align-items: center;
    padding: .5rem; border: 1px solid #ddd; border-radius: 6px; margin-bottom: .4rem; }
  .row.off { background: #f4f4f4; opacity: .7; }
  .row .orig { grid-column: 2 / -1; font-size: .8rem; color: #54585A; margin-top: -.25rem; }
  .row input[type=checkbox] { width: 1.2rem; height: 1.2rem; accent-color: #A6192E; }
  .badge { display: inline-block; font-size: .7rem; font-weight: 700; background: #FFF1C2; color: #5c4400;
    border-radius: 3px; padding: 0 .35rem; margin-left: .35rem; }
  .move { display: flex; gap: .25rem; }
  button { font: inherit; font-size: .9rem; font-weight: 700; cursor: pointer; border-radius: 6px;
    border: 2px solid #54585A; background: #fff; color: #262626; padding: .35rem .7rem; }
  button.primary { background: #A6192E; border-color: #A6192E; color: #fff; }
  button:hover { filter: brightness(.92); }
  button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
    outline: 3px solid #262626; outline-offset: 2px; }
  button:disabled { opacity: .4; cursor: default; }
  .preview { border: 1px dashed #8a8d8f; border-radius: 6px; padding: 1rem; }
  .actions { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; margin-top: .5rem; }
  .status { font-size: .9rem; color: #1d6b2f; font-weight: 700; }
  .error { color: #A6192E; font-weight: 700; }
  code { font-size: .85rem; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
<div class="backdrop">
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="lmc-title">
    <header>
      <h1 id="lmc-title">LMC Front Page Builder <span style="font-size:.8rem;color:#54585A;font-weight:400">v${VERSION}</span></h1>
      <button type="button" id="close" aria-label="Close builder">Close</button>
    </header>
    <div class="body" id="content"><p>Loading modules for course ${esc(courseId)}…</p></div>
  </div>
</div>`;

  const $ = (sel) => root.querySelector(sel);
  function close() {
    host.remove();
    document.removeEventListener('keydown', onKey, true);
  }
  function onKey(e) { if (e.key === 'Escape') { close(); } }
  document.addEventListener('keydown', onKey, true);
  $('#close').addEventListener('click', close);
  $('#close').focus();

  /* --- Load course data --------------------------------------------- */
  let course, modules;
  try {
    [course, modules] = await Promise.all([
      getJSON('/api/v1/courses/' + courseId + '?include[]=term').then((r) => r.data),
      getAllPages('/api/v1/courses/' + courseId + '/modules?per_page=100')
    ]);
  } catch (err) {
    $('#content').innerHTML = '<p class="error">Could not read this course\'s modules.</p>' +
      '<p>' + esc(err.message) + '</p><p>Make sure you are logged in to Canvas and have instructor or designer access to this course.</p>';
    return;
  }

  if (!modules.length) {
    $('#content').innerHTML = '<p class="error">This course has no modules yet.</p><p>Create your modules first, then run the builder again.</p>';
    return;
  }

  const userName = (window.ENV && ENV.current_user && ENV.current_user.display_name) || '';
  const termName = course.term && course.term.name && !/default term/i.test(course.term.name) ? course.term.name : '';

  const state = {
    title: course.name || '',
    subtitle: [termName, userName].filter(Boolean).join(' · '),
    intro: '',
    navHeading: 'Course Navigation',
    mods: modules
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        id: m.id,
        name: m.name,
        label: m.name,
        style: SECONDARY_RE.test(m.name) ? 'secondary' : 'primary',
        include: true,
        published: m.published !== false
      }))
  };

  /* --- Code generation (inline styles only: Canvas strips <style>) --- */
  function buttonStyle(kind) {
    return 'flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; ' +
      'min-height: 64px; padding: 0.9rem 1rem; background-color: ' + COLORS[kind] + '; color: #FFFFFF; ' +
      'font-weight: bold; font-size: 1rem; text-decoration: none; border-radius: 8px; ' +
      'box-sizing: border-box; min-width: 0; overflow-wrap: break-word;';
  }

  function buildHTML() {
    const out = [];
    out.push('<!' + '-- Made with LMC Front Page Builder v' + VERSION + ' --' + '>');  // split so it can be embedded in index.html
    out.push('<div style="max-width: 900px; margin: 0 auto; color: #262626; line-height: 1.5; overflow-wrap: break-word;">');
    if (state.title.trim()) {
      out.push('  <h2 style="color: #A6192E; font-size: 1.9rem; margin-bottom: 0.25rem;">' + esc(state.title.trim()) + '</h2>');
    }
    if (state.subtitle.trim()) {
      out.push('  <p style="color: #54585A; font-size: 1.1rem; margin-top: 0; margin-bottom: 1.5rem;">' + esc(state.subtitle.trim()) + '</p>');
    }
    const paras = state.intro.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (paras.length) {
      out.push('  <div style="background-color: #F4F4F4; border-left: 6px solid #A6192E; padding: 1rem 1.25rem; margin-bottom: 2rem; border-radius: 4px;">');
      paras.forEach((p, i) => {
        const margin = i === paras.length - 1 ? '0' : '0 0 0.75rem 0';
        out.push('    <p style="margin: ' + margin + ';">' + esc(p).replace(/\n/g, '<br>') + '</p>');
      });
      out.push('  </div>');
    }
    const chosen = state.mods.filter((m) => m.include);
    if (chosen.length) {
      if (state.navHeading.trim()) {
        out.push('  <h3 style="font-size: 1.3rem; border-bottom: 2px solid #54585A; padding-bottom: 0.4rem; margin-bottom: 1.25rem;">' + esc(state.navHeading.trim()) + '</h3>');
      }
      // 4 / 2 / 1 layout with inline flexbox only (the Canvas mobile apps ignore theme CSS and
      // media queries cannot be inline). Buttons are grouped in pairs: pairs sit side by side
      // when there is room for four buttons (desktop), stack when there is room for two
      // (tablet), and each pair splits into single full-width buttons on phones.
      // No negative margins, which made the page slide sideways in the iPhone app.
      out.push('  <div role="list" style="display: flex; flex-wrap: wrap; margin: 0 0 2rem 0; padding: 0;">');
      for (let i = 0; i < chosen.length; i += 2) {
        out.push('    <div style="display: flex; flex-wrap: wrap; flex: 1 1 420px; min-width: 0; box-sizing: border-box;">');
        chosen.slice(i, i + 2).forEach((m) => {
          out.push('      <div role="listitem" style="display: flex; flex: 1 1 210px; min-width: 0; padding: 0.375rem; box-sizing: border-box;">');
          out.push('        <a style="' + buttonStyle(m.style) + '" href="/courses/' + courseId + '/modules/' + m.id + '">' + esc(m.label.trim() || m.name) + '</a>');
          out.push('      </div>');
        });
        if (i + 1 === chosen.length) {
          // Empty half keeps a lone last button the same width as the others; zero height on phones
          out.push('      <div aria-hidden="true" style="flex: 1 1 210px; min-width: 0; padding: 0 0.375rem; box-sizing: border-box;"></div>');
        }
        out.push('    </div>');
      }
      out.push('  </div>');
    }
    out.push('</div>');
    return out.join('\n');
  }

  /* --- Builder UI ----------------------------------------------------- */
  $('#content').innerHTML = `
    <div class="grid2">
      <div><label for="f-title">Course title</label><input type="text" id="f-title"></div>
      <div><label for="f-sub">Subtitle (term / instructor)</label><input type="text" id="f-sub"></div>
    </div>
    <label for="f-intro">Welcome / intro text</label>
    <textarea id="f-intro" placeholder="Leave a blank line between paragraphs. Leave empty to skip the intro box."></textarea>
    <label for="f-nav">Navigation heading</label>
    <input type="text" id="f-nav">

    <h2>Buttons</h2>
    <div class="count">
      <label for="f-count" style="margin:0">How many buttons?</label>
      <input type="number" id="f-count" min="0" max="${state.mods.length}">
      <span class="hint">Found ${state.mods.length} module${state.mods.length === 1 ? '' : 's'}. Setting a number keeps the first that many in the list below.</span>
    </div>
    <p class="hint">Check the modules you want, edit the button text, choose red (course content) or gray (course support), and reorder with the arrows.</p>
    <div id="rows" style="margin-top:.75rem"></div>

    <h2>Preview</h2>
    <div class="preview" id="preview"></div>

    <h2>Code to paste</h2>
    <p class="hint">In Canvas, edit the page, open the HTML editor (the <code>&lt;/&gt;</code> button), and paste this in place of the existing code.</p>
    <textarea id="code" readonly rows="10" style="font-family: Consolas, monospace; font-size: .8rem;"></textarea>
    <div class="actions">
      <button type="button" class="primary" id="copy">Copy code</button>
      <span class="status" id="status" role="status" aria-live="polite"></span>
    </div>`;

  $('#f-title').value = state.title;
  $('#f-sub').value = state.subtitle;
  $('#f-nav').value = state.navHeading;

  function renderRows() {
    $('#rows').innerHTML = state.mods.map((m, i) => `
      <div class="row${m.include ? '' : ' off'}" data-i="${i}">
        <input type="checkbox" data-act="include" ${m.include ? 'checked' : ''} aria-label="Include ${esc(m.name)}">
        <input type="text" data-act="label" value="${esc(m.label)}" aria-label="Button text for ${esc(m.name)}">
        <select data-act="style" aria-label="Button color for ${esc(m.name)}">
          <option value="primary" ${m.style === 'primary' ? 'selected' : ''}>Red (content)</option>
          <option value="secondary" ${m.style === 'secondary' ? 'selected' : ''}>Gray (support)</option>
        </select>
        <span class="move">
          <button type="button" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(m.name)} up">▲</button>
          <button type="button" data-act="down" ${i === state.mods.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(m.name)} down">▼</button>
        </span>
        <span class="orig">Module: ${esc(m.name)} (ID ${esc(m.id)})${m.published ? '' : '<span class="badge">Unpublished</span>'}</span>
      </div>`).join('');
  }

  function update() {
    const html = buildHTML();
    $('#code').value = html;
    $('#preview').innerHTML = html;
    $('#f-count').value = state.mods.filter((m) => m.include).length;
    $('#status').textContent = '';
  }

  // Keep preview links from navigating away while the builder is open
  $('#preview').addEventListener('click', (e) => { if (e.target.closest('a')) { e.preventDefault(); } });

  $('#f-title').addEventListener('input', (e) => { state.title = e.target.value; update(); });
  $('#f-sub').addEventListener('input', (e) => { state.subtitle = e.target.value; update(); });
  $('#f-intro').addEventListener('input', (e) => { state.intro = e.target.value; update(); });
  $('#f-nav').addEventListener('input', (e) => { state.navHeading = e.target.value; update(); });

  $('#f-count').addEventListener('change', (e) => {
    const n = Math.max(0, Math.min(state.mods.length, parseInt(e.target.value, 10) || 0));
    state.mods.forEach((m, i) => { m.include = i < n; });
    renderRows();
    update();
  });

  $('#rows').addEventListener('input', (e) => {
    const row = e.target.closest('.row');
    if (!row) { return; }
    const m = state.mods[+row.dataset.i];
    const act = e.target.dataset.act;
    if (act === 'label') { m.label = e.target.value; }
    if (act === 'style') { m.style = e.target.value; }
    if (act === 'include') { m.include = e.target.checked; row.classList.toggle('off', !m.include); }
    update();
  });

  $('#rows').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) { return; }
    const i = +btn.closest('.row').dataset.i;
    const j = btn.dataset.act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= state.mods.length) { return; }
    [state.mods[i], state.mods[j]] = [state.mods[j], state.mods[i]];
    renderRows();
    update();
    // Keep keyboard focus on the same arrow of the moved row
    const moved = root.querySelector('.row[data-i="' + j + '"] [data-act="' + btn.dataset.act + '"]');
    (moved && !moved.disabled ? moved : root.querySelector('.row[data-i="' + j + '"] [data-act="label"]')).focus();
  });

  $('#copy').addEventListener('click', async () => {
    const text = $('#code').value;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      $('#code').select();
      document.execCommand('copy');
    }
    $('#status').textContent = 'Copied! Paste it into the page\'s HTML editor.';
  });

  renderRows();
  update();
  $('#f-title').focus();
})();
