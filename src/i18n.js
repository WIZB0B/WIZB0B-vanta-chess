// Interface languages. The app's markup is written in English; `translateTree` swaps exact
// English strings (text, placeholders, labels, titles) for the chosen language and keeps
// the originals, so switching back restores them. Anything not in the dictionary (names,
// numbers, chess notation) stays as it is. Arabic switches the page to right-to-left; the
// board itself always stays left-to-right (a1 bottom-left for White).
//
// Each language lives in its own file, src/locales/<code>.js (ROWS and PATTERNS), and is
// downloaded only when it is chosen: English visitors download no dictionary at all.

export const LANGUAGES = {
  en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', it: 'Italiano', pt: 'Português', tr: 'Türkçe',
  ru: 'Русский', ar: 'العربية', hi: 'हिन्दी', zh: '简体中文', ja: '日本語',
};
export const RTL = new Set(['ar']);
export const LANG_KEY = 'vch.lang';

// One explicit import() per language (not a template string), so Vite builds each file as its
// own chunk and the browser fetches only the one asked for.
const LOADERS = {
  de: () => import('./locales/de.js'),
  es: () => import('./locales/es.js'),
  fr: () => import('./locales/fr.js'),
  it: () => import('./locales/it.js'),
  pt: () => import('./locales/pt.js'),
  tr: () => import('./locales/tr.js'),
  ru: () => import('./locales/ru.js'),
  ar: () => import('./locales/ar.js'),
  hi: () => import('./locales/hi.js'),
  zh: () => import('./locales/zh.js'),
  ja: () => import('./locales/ja.js'),
};
// English -> translation, per language; filled when the language's file arrives.
export const DICTIONARY = Object.fromEntries(Object.keys(LOADERS).map(lang => [lang, new Map()]));
const PATTERNS = Object.fromEntries(Object.keys(LOADERS).map(lang => [lang, []]));
const LOADING = new Map();

export function detectLanguage(saved, navigatorLanguages = []) {
  if (saved && LANGUAGES[saved]) return saved;
  for (const tag of navigatorLanguages) {
    const value = String(tag || '').toLowerCase();
    if (/^zh-(tw|hk|mo|hant)/.test(value)) continue; // Traditional Chinese readers: not Simplified
    const base = value.split('-')[0];
    if (LANGUAGES[base]) return base;
  }
  return 'en';
}

// Registers rows ([English, translation] pairs, or an {English: translation} object) and
// patterns ([English pattern, translation]) for one language.
export function addTranslations(lang, rows = [], patterns = []) {
  const dict = DICTIONARY[lang];
  if (!dict) return;
  for (const [en, out] of Array.isArray(rows) ? rows : Object.entries(rows)) if (out && !dict.has(en)) dict.set(en, out);
  for (const [source, out] of patterns) if (out) PATTERNS[lang].push({ re: new RegExp(source), out });
}

// Downloads and registers one language (once). Resolves true when its rows are in place,
// false for English or an unknown code; a failed download can be tried again later.
export function loadLanguage(lang) {
  const load = LOADERS[lang];
  if (!load) return Promise.resolve(false);
  if (!LOADING.has(lang)) {
    LOADING.set(lang, load().then(m => { addTranslations(lang, m.ROWS, m.PATTERNS); return true; }, error => { LOADING.delete(lang); throw error; }));
  }
  return LOADING.get(lang);
}
export const loadedLanguages = () => [...LOADING.keys()];

// &1 puts back a comma-separated list ("queen, rook, pawn") with each item translated when it
// can be, joined the way the language writes lists.
const LIST_SEPARATOR = { ar: '، ', zh: '、', ja: '、' };
const listOf = (v, lang) => v.split(', ').map(item => translateText(item, lang) || item).join(LIST_SEPARATOR[lang] || ', ');
// A pattern that gives back the text unchanged ("%1 $2" on a name and a number) has translated
// nothing, so the next pattern gets its turn and, failing that, the text counts as untranslated.
function fromPattern(text, lang) {
  for (const p of PATTERNS[lang]) {
    const m = p.re.exec(text);
    if (!m) continue;
    const out = p.out.replace(/([$%&])(\d)/g, (_, kind, i) => { const v = m[Number(i)] ?? ''; return kind === '%' ? translateText(v, lang) || v : kind === '&' ? listOf(v, lang) : v; });
    if (out !== text) return out;
  }
  return null;
}
const exact = (text, lang) => DICTIONARY[lang].get(text) || fromPattern(text, lang);
export function translateText(text, lang) {
  if (lang === 'en' || !DICTIONARY[lang]) return null;
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  const whole = exact(trimmed, lang);
  if (whole) return whole;
  // "You won · by checkmate": translate each part that can be, keep the rest (names, scores).
  if (trimmed.includes(' · ')) {
    const parts = trimmed.split(' · '), done = parts.map(x => exact(x.trim(), lang));
    if (done.some(Boolean)) return parts.map((x, i) => done[i] || x).join(' · ');
  }
  return null;
}

// Text node -> {src: its English source, out: the text we last wrote}; element -> {attr: {src, out}}.
const ORIGINAL = new WeakMap();
const ATTRS = ['placeholder', 'aria-label', 'title'];
// The English source of a value we may have translated before: if it still holds exactly what
// we wrote, its source is unchanged (whatever language we wrote it in); otherwise the app has
// written a new value since, and that value is the source. (Comparing against a translation
// into the *new* language was the bug that kept French on screen after switching to English
// or to another language.)
function sourceOf(saved, current) {
  if (!saved) return current;
  return current === saved.out ? saved.src : current;
}
// Translates a subtree in place (or restores English when lang is 'en').
export function translateTree(root, lang) {
  if (!root) return;
  const doc = root.ownerDocument || root;
  const walker = doc.createTreeWalker(root, 4 /* SHOW_TEXT */);
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,textarea,[data-no-i18n]')) continue;
    const source = sourceOf(ORIGINAL.get(node), node.nodeValue);
    const out = translateText(source, lang);
    const next = out ? source.match(/^\s*/)[0] + out + source.match(/\s*$/)[0] : source;
    ORIGINAL.set(node, { src: source, out: next });
    if (node.nodeValue !== next) node.nodeValue = next;
  }
  const elements = root.querySelectorAll ? [root, ...root.querySelectorAll('[placeholder],[aria-label],[title]')] : [];
  for (const el of elements) {
    if (!el.getAttribute) continue;
    const saved = ORIGINAL.get(el) || {};
    for (const attr of ATTRS) {
      if (!el.hasAttribute(attr)) continue;
      const source = sourceOf(saved[attr], el.getAttribute(attr));
      const next = translateText(source, lang) || source;
      saved[attr] = { src: source, out: next };
      if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
    }
    ORIGINAL.set(el, saved);
  }
}

// Start downloading the visitor's language as soon as this module is evaluated, while the
// rest of the page is still being built, so it is usually ready by the first paint.
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const lang = detectLanguage(window.localStorage.getItem(LANG_KEY), navigator.languages || [navigator.language]);
    if (lang !== 'en') loadLanguage(lang).catch(() => {});
  }
} catch { /* storage blocked: main.js applies the language later */ }
