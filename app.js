/* =========================================================
   Saison — suivi de séries TV
   Données stockées localement (localStorage), catalogue de séries via TVmaze
   (gratuit, sans clé ni compte).
   ========================================================= */
'use strict';

// Version de l'app : à changer à chaque publication (node scripts/bump.js le fait)
const APP_VERSION = '16';

/* ---------- Constantes ---------- */
const STORE_KEY = 'saison:data:v1';
const CATALOG_API = 'https://api.tvmaze.com';
const TMDB_IMG = 'https://image.tmdb.org/t/p/'; // anciennes données éventuelles
const DAY = 864e5;

const CATEGORIES = [
  { id: 'watching', label: 'En cours', color: 'var(--info)' },
  { id: 'planned', label: 'À regarder', color: 'var(--warn)' },
  { id: 'completed', label: 'Terminées', color: 'var(--ok)' },
  { id: 'paused', label: 'En pause', color: 'var(--muted)' },
  { id: 'dropped', label: 'Abandonnées', color: 'var(--danger)' },
];
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const AIR_STATUS = {
  airing: { label: 'En cours de diffusion', chip: 'accent' },
  ended: { label: 'Diffusion terminée', chip: 'muted' },
  unknown: { label: 'Statut inconnu', chip: 'muted' },
};

const DEFAULT_PLATFORMS = [
  { id: 'netflix', name: 'Netflix', color: '#E50914', fg: '#ffffff', mark: 'N', domain: 'netflix.com' },
  { id: 'prime', name: 'Prime Video', color: '#00A8E1', fg: '#ffffff', mark: 'prime', domain: 'primevideo.com' },
  { id: 'disney', name: 'Disney+', color: '#0E2A8C', fg: '#ffffff', mark: 'D+', domain: 'disneyplus.com' },
  { id: 'appletv', name: 'Apple TV+', color: '#1d1d1f', fg: '#ffffff', mark: 'tv+', domain: 'tv.apple.com' },
  { id: 'max', name: 'HBO Max', color: '#5B2BD0', fg: '#ffffff', mark: 'max', domain: 'max.com' },
  { id: 'paramount', name: 'Paramount+', color: '#0064FF', fg: '#ffffff', mark: 'P+', domain: 'paramountplus.com' },
  { id: 'crunchyroll', name: 'Crunchyroll', color: '#F47521', fg: '#ffffff', mark: 'CR', domain: 'crunchyroll.com' },
];
// Plateformes courantes proposées en un clic (logo récupéré depuis leur site officiel)
const SUGGESTED_PLATFORMS = [
  ['Canal+', 'canalplus.com', '#000000'], ['Auvio', 'auvio.rtbf.be', '#1d1d1b'], ['Streamz', 'streamz.be', '#e6007e'],
  ['VRT MAX', 'vrt.be', '#5dfc71'], ['RTL Play', 'rtlplay.be', '#e2001a'], ['france.tv', 'france.tv', '#2a2bd6'],
  ['Arte', 'arte.tv', '#fa481c'], ['TF1+', 'tf1.fr', '#0a3cc7'], ['M6+', 'm6.fr', '#8b2fc9'],
  ['SkyShowtime', 'skyshowtime.com', '#7a2fd0'], ['Hulu', 'hulu.com', '#1ce783'], ['Peacock', 'peacocktv.com', '#000000'],
  ['Pluto TV', 'pluto.tv', '#2e1a47'], ['ADN', 'animationdigitalnetwork.com', '#0096ff'], ['YouTube', 'youtube.com', '#ff0000'],
];

const REGIONS = [
  ['BE', 'Belgique'], ['FR', 'France'], ['LU', 'Luxembourg'], ['CH', 'Suisse'], ['CA', 'Canada'],
  ['US', 'États-Unis'], ['GB', 'Royaume-Uni'], ['DE', 'Allemagne'], ['NL', 'Pays-Bas'],
  ['ES', 'Espagne'], ['IT', 'Italie'], ['PT', 'Portugal'], ['IE', 'Irlande'], ['AU', 'Australie'],
];
const regionName = code => (REGIONS.find(r => r[0] === code) || [code, code || 'Toutes régions'])[1];

/* ---------- Icônes ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  library: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.4L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.4L20 16M20 20v-4h-4"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/>',
  upload: '<path d="M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5M5 19.5h14"/>',
  tv: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="m8.5 2.5 3.5 3.5 3.5-3.5"/>',
  listcheck: '<path d="m3.5 7 1.5 1.5L8 5.5M3.5 13l1.5 1.5L8 11.5M11 7h9.5M11 13h9.5M4 19h16.5"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.2"/>',
  sparkle: '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14.5 8.5l2 2"/>',
};
const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ---------- Utilitaires ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const pad = n => String(n).padStart(2, '0');
const epKey = e => `${e.season}x${e.number}`;
const epCode = e => `S${e.season} E${e.number}`;
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function dayDiff(a, b) { return Math.round((startOfDay(a) - startOfDay(b)) / DAY); }
function parseDay(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
const FMT = {
  long: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
  longY: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  short: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }),
  shortY: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
  full: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  time: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }),
};
function fmtDate(d, style = 'short') {
  if (!d) return 'Date à confirmer';
  const same = d.getFullYear() === new Date().getFullYear();
  if (style === 'long') return (same ? FMT.long : FMT.longY).format(d);
  return (same ? FMT.short : FMT.shortY).format(d);
}
function relDayLabel(d) {
  const n = dayDiff(d, new Date());
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return 'Demain';
  if (n === -1) return 'Hier';
  return null;
}
function fmtRuntime(min) {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60 ? pad(min % 60) : ''}`.trim();
}
function countdown(release, timed, now = new Date()) {
  const diff = release - now;
  if (timed) {
    if (diff <= 0) return { text: 'Disponible', cls: 'now' };
    const mins = Math.ceil(diff / 6e4);
    if (mins < 60) return { text: `dans ${mins} min`, cls: 'soon' };
    const h = Math.floor(mins / 60);
    if (h < 24) return { text: `dans ${h} h${mins % 60 ? ' ' + pad(mins % 60) : ''}`, cls: 'soon' };
    const d = Math.floor(h / 24);
    return { text: `dans ${d} j${h % 24 ? ' ' + (h % 24) + ' h' : ''}`, cls: d <= 2 ? 'soon' : '' };
  }
  const days = dayDiff(release, now);
  if (days <= 0) return { text: 'Disponible', cls: 'now' };
  if (days === 1) return { text: 'Demain', cls: 'soon' };
  return { text: `dans ${days} jours`, cls: days <= 2 ? 'soon' : '' };
}
function hueOf(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function imgUrl(path, size = 'w342') {
  if (!path) return '';
  if (/^https?:|^data:/.test(path)) return path;
  return TMDB_IMG + size + path;
}

/* ---------- État & persistance ---------- */
function guessRegion() {
  const m = (navigator.language || '').match(/-([A-Z]{2})$/i);
  const r = m ? m[1].toUpperCase() : 'BE';
  return REGIONS.some(x => x[0] === r) ? r : 'BE';
}
function defaultState() {
  return {
    version: 1,
    shows: [],
    platforms: DEFAULT_PLATFORMS.map(p => ({ ...p })),
    settings: { region: guessRegion(), theme: 'light', themeV: 2, notifications: false },
    notified: {},
  };
}
function normShow(s) {
  s.seasons = (s.seasons || []).map(se => ({
    ...se,
    episodes: (se.episodes || []).map(e => ({ ...e, season: se.number })).sort((a, b) => a.number - b.number),
  })).sort((a, b) => a.number - b.number);
  s.platforms = s.platforms || [];
  s.genres = s.genres || [];
  s.status = CAT[s.status] ? s.status : 'planned';
  s.airStatus = AIR_STATUS[s.airStatus] ? s.airStatus : 'unknown';
  return s;
}
function normalize(d) {
  const base = defaultState();
  const out = { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) }, notified: d.notified || {} };
  out.platforms = Array.isArray(d.platforms) ? d.platforms : base.platforms;
  const ids = new Set(out.platforms.map(p => p.id));
  for (const p of base.platforms) if (!ids.has(p.id)) out.platforms.push(p);
  for (const p of out.platforms) { const def = base.platforms.find(b => b.id === p.id); if (def && !p.domain) p.domain = def.domain; }
  if ((d.settings || {}).themeV !== 2) { out.settings.theme = 'light'; out.settings.themeV = 2; }
  out.dismissed = Array.isArray(d.dismissed) ? d.dismissed : [];
  out.daily = d.daily && typeof d.daily === 'object' ? d.daily : null;
  out.shows = (d.shows || []).map(normShow);
  return out;
}
const LAST_USER_KEY = 'saison:lastUser';
const GUEST_KEY = 'saison:guest';
const CLOUD_ON = !!(window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey);
let account = null;            // { uid, email, name, photo } une fois connecté
let authState = CLOUD_ON ? 'pending' : 'off';
let authTimer = 0;
const storeKey = () => (account ? `${STORE_KEY}:${account.uid}` : STORE_KEY);
function readStore(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch (err) {
    console.error(err);
    return null;
  }
}
function load() { return readStore(storeKey()) || defaultState(); }
function persistLocal() {
  try { localStorage.setItem(storeKey(), JSON.stringify(state)); } catch { /* signalé par save() */ }
}
let saveFailed = false;
function save() {
  if (account && window.cloud) window.cloud.queueSync();
  try {
    localStorage.setItem(storeKey(), JSON.stringify(state));
    saveFailed = false;
  } catch (err) {
    if (!saveFailed) toast("Impossible d'enregistrer : le stockage du navigateur est indisponible ou plein. Exportez une sauvegarde depuis les Réglages.", { type: 'error', timeout: 9000 });
    saveFailed = true;
  }
}

let state = load();
const ui = {
  route: { name: 'home' },
  lastRouteKey: '',
  lib: { cat: 'all', q: '', platform: '', genre: '', air: '', sort: 'recent' },
  cal: { range: 'week' },
  openSeasons: {},
  epView: 'grid',
  sync: 'ok',
  guest: (() => { try { return localStorage.getItem(GUEST_KEY) === '1'; } catch { return false; } })(),
  authMode: 'signup',
  authError: '',
  ob: null,
  expandOverview: false,
  add: null,
  draft: null,
};
const getShow = id => state.shows.find(s => s.id === id);
const getPlatform = id => state.platforms.find(p => p.id === id);

/* ---------- Logique épisodes ---------- */
const allEps = show => show.seasons.flatMap(s => s.episodes);

function epRelease(show, e) {
  const d = parseDay(e.airDate);
  if (!d) return null;
  const t = e.airTime || show.airTime;
  if (t && /^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}
const isTimed = (show, e) => !!(e.airTime || show.airTime);

/**
 * Calcule l'état de chaque épisode :
 *  watched   : regardé
 *  available : sorti, à regarder
 *  upcoming  : date de sortie future connue
 *  tba       : date inconnue (Date à confirmer)
 * Un épisode sans date est considéré comme sorti si la série est terminée
 * ou si un épisode suivant est déjà sorti / regardé.
 */
function computeStates(show, now = new Date()) {
  const list = allEps(show);
  const states = new Map();
  let laterAired = false;
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    const r = epRelease(show, e);
    let st;
    if (r) {
      const aired = r <= now;
      st = aired ? 'available' : 'upcoming';
      if (aired) laterAired = true;
    } else {
      st = show.airStatus === 'ended' || laterAired ? 'available' : 'tba';
    }
    if (e.watched) { st = 'watched'; laterAired = true; }
    states.set(e, st);
  }
  return states;
}

function stats(show, now = new Date()) {
  const states = computeStates(show, now);
  let total = 0, watched = 0, available = 0, upcoming = 0, tba = 0, minutes = 0;
  let next = null, nextUp = null, lastWatched = null;
  for (const e of allEps(show)) {
    total++;
    const st = states.get(e);
    if (st === 'watched') { watched++; minutes += e.runtime || show.runtime || 0; lastWatched = e; }
    else if (st === 'available') { available++; if (!next) next = e; }
    else if (st === 'upcoming') { upcoming++; if (!nextUp) nextUp = e; }
    else { tba++; if (!nextUp) nextUp = e; }
  }
  const pct = total ? Math.round((watched / total) * 100) : 0;
  const currentSeason = next ? next.season : nextUp ? nextUp.season : lastWatched ? lastWatched.season : (show.seasons[0]?.number ?? 1);
  return { states, total, watched, remaining: total - watched, available, upcoming, tba, minutes, next, nextUp, lastWatched, pct, currentSeason };
}

/* Collecte les sorties pour le calendrier et les notifications. */
function collectReleases(now = new Date()) {
  const today = startOfDay(now);
  const upcoming = [], fresh = [], tba = [];
  for (const show of state.shows) {
    if (show.status === 'dropped') continue;
    const states = computeStates(show, now);
    const added = startOfDay(new Date(show.addedAt || 0));
    let tbaGroup = null;
    for (const e of allEps(show)) {
      if (e.watched) continue;
      const r = epRelease(show, e);
      if (!r) {
        if (states.get(e) === 'tba') {
          if (!tbaGroup) { tbaGroup = { show, e, more: 0 }; tba.push(tbaGroup); } else tbaGroup.more++;
        }
        continue;
      }
      const entry = { show, e, r, timed: isTimed(show, e) };
      if (r >= today) upcoming.push(entry);
      else if (r >= added && now - r < 60 * DAY) fresh.push(entry);
    }
  }
  upcoming.sort((a, b) => a.r - b.r || a.show.title.localeCompare(b.show.title) || a.e.number - b.e.number);
  fresh.sort((a, b) => b.r - a.r);
  return { upcoming, fresh, tba };
}

/* ---------- Rendu : petits composants ---------- */
function posterHTML(show, size = 'w342') {
  const title = show.title || '?';
  const fb = `<div class="poster-fallback" style="--h:${hueOf(title)}">${icon('tv', 'lg')}<b>${esc(title)}</b></div>`;
  const src = imgUrl(show.poster, size);
  return `<div class="poster">${fb}${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>`;
}
// Icône officielle publiée par le site de la plateforme (via le service d'icônes de Google)
function logoUrl(p) {
  if (p.logo) return imgUrl(p.logo, 'w92');
  if (p.domain) return 'https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(p.domain);
  return '';
}
function domainOf(input) {
  const v = String(input || '').trim();
  if (!v) return '';
  try { return new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v).hostname.replace(/^www\./, ''); } catch { return ''; }
}
function pfBadge(p, cls = '') {
  if (!p) return '';
  const src = logoUrl(p);
  const img = src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onload="this.naturalWidth < 32 ? this.remove() : this.parentNode.classList.add('logo-ok')" onerror="this.remove()">` : '';
  return `<span class="pf ${src ? 'has-logo' : ''} ${cls}" style="--pc:${esc(p.color || '#333')};--pf:${esc(p.fg || '#fff')}" title="${esc(p.name)}" aria-label="${esc(p.name)}"><span class="pf-mark">${esc(p.mark || p.name.slice(0, 2))}</span>${img}</span>`;
}
function showPlatforms(show) { return show.platforms.map(x => ({ ...x, p: getPlatform(x.pid) })).filter(x => x.p); }
function catChip(id) { const c = CAT[id]; return `<span class="chip" style="color:${c.color};background:color-mix(in srgb, ${c.color} 16%, transparent)"><span class="dot"></span>${c.label}</span>`; }
function ringBadge(pct, done, cls = '') {
  const C = 2 * Math.PI * 15;
  return `<span class="ring-badge ${done ? 'done' : ''} ${cls}" role="img" aria-label="${pct} % vu"><svg viewBox="0 0 36 36"><circle class="t" cx="18" cy="18" r="15"/><circle class="v" cx="18" cy="18" r="15" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/></svg><b>${done ? icon('check', 'sm') : pct}</b></span>`;
}
function bar(pct, done) { return `<div class="bar ${done ? 'ok' : ''}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>`; }
const soonLabel = t => (/^dans /.test(t) ? 'Sort ' + t : t === 'Demain' ? 'Sort demain' : t);
function stateChip(st, show, e) {
  if (st === 'watched') return `<span class="chip ok">${icon('check', 'sm')}Regardé</span>`;
  if (st === 'available') return `<span class="chip accent">À regarder</span>`;
  if (st === 'upcoming') {
    const r = epRelease(show, e);
    return `<span class="chip info">${esc(soonLabel(countdown(r, isTimed(show, e)).text))}</span>`;
  }
  return `<span class="chip muted">Date à confirmer</span>`;
}
function emptyHTML({ ic = 'tv', title, text, actions = '' , sm = false }) {
  return `<div class="empty ${sm ? 'sm' : ''}">${icon(ic, 'lg')}<h3>${esc(title)}</h3>${text ? `<p>${text}</p>` : ''}${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
}
function showSubline(show, st) {
  if (st.next) return { text: `${epCode(st.next)} à voir${st.available > 1 ? `, ${st.available} dispo` : ''}`, hot: true };
  if (st.nextUp) {
    const r = epRelease(show, st.nextUp);
    return { text: r ? `Prochain : ${relDayLabel(r) || fmtDate(r)}` : 'Prochain : date à confirmer' };
  }
  if (st.total && st.watched === st.total) return { text: 'Tout vu' };
  if (!st.total) return { text: 'Aucun épisode référencé' };
  return { text: '' };
}

/* ---------- Navigation ---------- */
const NAV = [
  { id: 'home', label: 'Accueil', ic: 'home' },
  { id: 'library', label: 'Bibliothèque', ic: 'library' },
  { id: 'discover', label: 'Découvrir', ic: 'sparkle' },
  { id: 'calendar', label: 'Calendrier', ic: 'calendar' },
  { id: 'settings', label: 'Réglages', ic: 'settings' },
];
function avatarHTML(size = '') {
  const name = state.profile?.name || account?.name || '';
  if (account?.photo) return `<span class="avatar ${size}"><img src="${esc(account.photo)}" alt="" referrerpolicy="no-referrer"></span>`;
  return `<span class="avatar ${size}" style="--h:${hueOf(name || 'S')}">${esc((name || '?').slice(0, 1).toUpperCase())}</span>`;
}
function renderNav() {
  const active = ui.route.name === 'show' ? 'library' : ui.route.name;
  const fresh = collectReleases().fresh.length;
  const badge = id => (id === 'calendar' && fresh ? `<span class="nav-badge" title="${plural(fresh, 'nouvel épisode', 'nouveaux épisodes')}">${fresh}</span>` : '');
  $('#sideNav').innerHTML = NAV.map(n => `<a class="nav-link ${active === n.id ? 'active' : ''}" href="#/${n.id}" ${active === n.id ? 'aria-current="page"' : ''}>${icon(n.ic)}${n.label}${badge(n.id)}</a>`).join('');
  const items = NAV.filter(n => n.id !== 'settings').map(n => `<a class="bn-link ${active === n.id ? 'active' : ''}" href="#/${n.id}" ${active === n.id ? 'aria-current="page"' : ''}>${icon(n.ic)}${n.label}${badge(n.id)}</a>`);
  items.splice(2, 0, `<button class="bn-add" data-act="add-open" aria-label="Ajouter une série">${icon('plus')}</button>`);
  $('#bottomNav').innerHTML = items.join('');
  $('#topAvatar').innerHTML = `<a class="top-avatar ${active === 'settings' ? 'active' : ''}" href="#/settings" aria-label="Mon compte et réglages">${avatarHTML()}</a>`;
  const dark = document.documentElement.dataset.theme === 'dark';
  $('#themeToggle').innerHTML = `${icon(dark ? 'sun' : 'moon')}${dark ? 'Mode clair' : 'Mode sombre'}`;
}

function parseRoute() {
  const [name, id] = location.hash.replace(/^#\/?/, '').split('/');
  const valid = ['home', 'library', 'calendar', 'settings', 'show', 'discover', 'welcome', 'auth'];
  return { name: valid.includes(name) ? name : 'home', id: id ? decodeURIComponent(id) : null };
}

function render() {
  ui.route = parseRoute();
  const key = ui.route.name + '/' + (ui.route.id || '');
  const changed = key !== ui.lastRouteKey;
  if (changed) ui.expandOverview = false;
  ui.lastRouteKey = key;
  const v = $('#view');
  const y = window.scrollY;
  // Écrans plein écran : attente de connexion, connexion, questionnaire
  let full = null;
  if (authState === 'pending') full = splashHTML;
  else if (authState === 'out' && !ui.guest) full = viewAuth;
  else if (ui.route.name === 'welcome' || (!state.profile?.done && ui.route.name !== 'settings')) full = viewOnboarding;
  document.body.classList.toggle('fullscreen', !!full);
  if (full) {
    const y0 = window.scrollY;
    v.innerHTML = full();
    const fk = full.name + ':' + (ui.ob?.step ?? '');
    if (fk !== ui.lastFullKey) { window.scrollTo(0, 0); v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); }
    else { v.classList.remove('enter'); window.scrollTo(0, y0); }
    ui.lastFullKey = fk;
    v.dataset.full = full.name;
    return;
  }
  v.dataset.full = '';
  if (ui.lastFullKey) { ui.lastFullKey = ''; v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); window.scrollTo(0, 0); }
  if (ui.route.name === 'auth' || ui.route.name === 'welcome') { location.replace('#/home'); return; }
  const views = { home: viewHome, library: viewLibrary, calendar: viewCalendar, settings: viewSettings, discover: viewDiscover, show: () => viewShow(ui.route.id) };
  v.innerHTML = views[ui.route.name]();
  if (ui.route.name === 'library') renderLibGrid();
  renderNav();
  if (changed) {
    window.scrollTo(0, 0);
    v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
    document.title = { home: 'Saison', library: 'Bibliothèque · Saison', calendar: 'Calendrier · Saison', settings: 'Réglages · Saison', discover: 'Découvrir · Saison', show: (getShow(ui.route.id)?.title || 'Série') + ' · Saison' }[ui.route.name];
  } else {
    v.classList.remove('enter');
    window.scrollTo(0, y);
  }
}

/* ---------- Vue : Accueil ---------- */
function viewHome() {
  const h = new Date().getHours();
  const hello = h < 5 ? 'Bonne nuit' : h < 18 ? 'Bonjour' : 'Bonsoir';

  if (!state.shows.length) {
    return `<section class="welcome">
      ${tvIllustration()}
      <h1 class="page-title">Vos séries, sans rien oublier.</h1>
      <p class="welcome-text">Ajoutez ce que vous regardez, cochez les épisodes au fur et à mesure, et voyez d'un coup d'œil ce qui sort bientôt.</p>
      <div class="welcome-actions"><button class="btn primary lg" data-act="add-open">${icon('search')}Rechercher une série</button>
      <button class="btn ghost" data-act="add-open" data-tab="manual">Ajouter à la main</button></div>
      <p class="help">Titres en français ou en version originale, séries du monde entier.</p>
    </section>${recsSectionHTML(12)}`;
  }

  const now = new Date();
  const all = state.shows.map(s => ({ s, st: stats(s, now) }));
  const watching = all.filter(x => x.s.status === 'watching');
  const totalWatched = all.reduce((a, x) => a + x.st.watched, 0);
  const rel = collectReleases(now);

  const summary = [
    watching.length ? plural(watching.length, 'série en cours', 'séries en cours') : '',
    totalWatched ? plural(totalWatched, 'épisode vu', 'épisodes vus') : '',
  ].filter(Boolean).join(', ');
  const head = `<header class="page-head"><div><h1 class="page-title">${hello}</h1>${summary ? `<p class="page-sub">${summary}.</p>` : ''}</div>
    <button class="btn primary" data-act="add-open">${icon('plus')}Ajouter une série</button></header>${watchTimeCard()}`;

  const resume = all
    .filter(x => ['watching', 'paused'].includes(x.s.status) && x.st.next)
    .sort((a, b) => (b.s.lastWatchedAt || b.s.addedAt) - (a.s.lastWatchedAt || a.s.addedAt));
  const resumeHTML = resume.length
    ? featureCard(resume[0].s, resume[0].st) + (resume.length > 1 ? `<div class="prail">${resume.slice(1).map(({ s, st }) => posterCard(s, st)).join('')}</div>` : '')
    : emptyHTML({ sm: true, ic: 'play', title: watching.length ? 'Vous êtes à jour' : 'Rien en cours', text: watching.length ? 'Aucun nouvel épisode à regarder pour le moment.' : 'Commencez une série depuis votre bibliothèque pour la retrouver ici.' });

  const upcomingHTML = `<section class="section"><div class="section-head"><h2 class="section-title">Bientôt</h2><a class="section-link" href="#/calendar">Tout le calendrier ${icon('chevron', 'sm')}</a></div>
    ${rel.upcoming.length ? `<div class="rel-list">${rel.upcoming.slice(0, 4).map(relItem).join('')}</div>` : `<p class="muted">Aucune sortie datée pour vos séries.${rel.tba.length ? ` ${plural(rel.tba.length, 'série attend', 'séries attendent')} une date.` : ''}</p>`}</section>`;

  const planned = all.filter(x => x.s.status === 'planned').slice(0, 12);
  const plannedHTML = planned.length ? `<section class="section"><div class="section-head"><h2 class="section-title">À commencer</h2><a class="section-link" href="#/library" data-act="lib-goto" data-cat="planned">Tout voir ${icon('chevron', 'sm')}</a></div>
    <div class="grid">${planned.map(({ s, st }) => cardHTML(s, st, false)).join('')}</div></section>` : '';

  return head + weekStrip(rel) + `<section class="section"><div class="section-head"><h2 class="section-title">À regarder maintenant</h2></div>${resumeHTML}</section>` + recsSectionHTML(12) + upcomingHTML + plannedHTML;
}
function featureCard(s, st) {
  const e = st.next;
  const bg = imgUrl(s.backdrop, 'w780') || imgUrl(s.poster, 'w500');
  const pf = showPlatforms(s)[0];
  return `<article class="feature" data-card="${s.id}">
    <div class="feature-bg" style="${bg ? `background-image:url('${esc(bg)}')` : `background:linear-gradient(135deg,hsl(${hueOf(s.title)} 45% 45%),hsl(${hueOf(s.title) + 50} 45% 25%))`}"></div>
    <a class="feature-link" href="#/show/${s.id}" aria-label="Ouvrir ${esc(s.title)}"></a>
    <div class="feature-body">
      <span class="feature-kicker">${pf ? pfBadge(pf.p) : ''}Votre prochain épisode</span>
      <h3 class="feature-title">${esc(s.title)}</h3>
      <p class="feature-ep">${epCode(e)}${e.title ? ` – ${esc(e.title)}` : ''}${e.runtime ? ` · ${fmtRuntime(e.runtime)}` : ''}</p>
      <div class="feature-progress">${bar(st.pct)}<span>${st.watched} / ${st.total}</span></div>
    </div>
    <button class="big-check on-image" data-act="next-watch" data-show="${s.id}" aria-label="Marquer ${epCode(e)} de ${esc(s.title)} comme vu">${icon('check')}<span>Vu</span></button>
  </article>`;
}
function weekStrip(rel) {
  const today = startOfDay(new Date());
  const items = [...rel.upcoming];
  const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() + i * DAY);
    const list = items.filter(x => dayDiff(x.r, d) === 0);
    const shows = [...new Map(list.map(x => [x.show.id, x.show])).values()];
    const label = i === 0 ? "Aujourd'hui" : fmtDay.format(d).replace('.', '');
    return `<a class="day-tile ${i === 0 ? 'today' : ''} ${list.length ? 'has' : ''}" href="#/calendar" aria-label="${esc(fmtDate(d, 'long'))} : ${list.length ? plural(list.length, 'sortie', 'sorties') : 'aucune sortie'}">
      <span class="day-name">${esc(label)}</span><span class="day-num">${d.getDate()}</span>
      <span class="day-posters">${shows.slice(0, 3).map(sh => posterHTML(sh, 'w92')).join('')}</span>
      ${list.length ? `<span class="day-count">${plural(list.length, 'épisode', 'épisodes')}</span>` : '<span class="day-count empty-day">–</span>'}
    </a>`;
  }).join('');
  return `<section class="section first"><div class="section-head"><h2 class="section-title">Cette semaine</h2><a class="section-link" href="#/calendar">Calendrier ${icon('chevron', 'sm')}</a></div><div class="week">${days}</div></section>`;
}
function dateBadge(d) {
  const wd = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d).replace('.', '');
  return `<span class="date-badge ${dayDiff(d, new Date()) === 0 ? 'today' : ''}" aria-hidden="true"><span>${esc(wd)}</span><b>${d.getDate()}</b></span>`;
}
function seasonStrip(show) {
  return `<div class="season-strip" aria-label="Progression par saison">${show.seasons.map(se => {
    const n = se.episodes.length || 1;
    const w = se.episodes.filter(e => e.watched).length;
    const pct = Math.round((w / n) * 100);
    return `<span class="ss-seg ${pct === 100 ? 'done' : ''}" style="flex:${n}" title="Saison ${se.number} : ${w}/${se.episodes.length}"><span style="width:${pct}%"></span></span>`;
  }).join('')}</div><div class="season-strip-legend"><span>S${show.seasons[0].number}</span><span>S${show.seasons.at(-1).number}</span></div>`;
}
function tvIllustration() {
  return `<svg class="tv-illu" viewBox="0 0 200 150" aria-hidden="true">
    <path d="M78 22 98 40M122 22 102 40" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>
    <circle cx="76" cy="20" r="6" fill="var(--pop)"/><circle cx="124" cy="20" r="6" fill="var(--pop)"/>
    <rect x="22" y="40" width="156" height="98" rx="22" fill="var(--ink)"/>
    <rect x="34" y="52" width="108" height="74" rx="14" fill="var(--pop)"/>
    <path d="M78 74v30l26-15z" fill="var(--ink)"/>
    <circle cx="160" cy="70" r="7" fill="var(--surface)"/><circle cx="160" cy="92" r="7" fill="var(--surface)"/>
    <rect x="152" y="108" width="16" height="6" rx="3" fill="var(--surface)"/>
  </svg>`;
}
/* ---------- Temps passé devant les séries ---------- */
const DEFAULT_RUNTIME = 40; // minutes, si la durée d'un épisode est inconnue
function watchTime(now = new Date()) {
  const today = startOfDay(now);
  const days = Array.from({ length: 7 }, (_, i) => ({ d: new Date(today.getTime() - (6 - i) * DAY), min: 0 }));
  const weekStart = days[0].d.getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  let total = 0, week = 0, month = 0, guessed = 0, eps = 0;
  for (const show of state.shows) for (const e of allEps(show)) {
    if (!e.watched) continue;
    const known = e.runtime || show.runtime;
    const min = known || DEFAULT_RUNTIME;
    if (!known) guessed++;
    total += min; eps++;
    if (e.bulk || !e.watchedAt) continue;
    if (e.watchedAt >= monthStart) month += min;
    if (e.watchedAt >= weekStart) {
      week += min;
      const slot = days.find(x => dayDiff(new Date(e.watchedAt), x.d) === 0);
      if (slot) slot.min += min;
    }
  }
  return { total, week, month, days, guessed, eps };
}
function fmtDuration(min, long = false) {
  min = Math.round(min);
  if (min < 60) return `${min} min`;
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d) return long ? `${plural(d, 'jour', 'jours')}${h ? ' et ' + plural(h, 'heure', 'heures') : ''}` : `${d} j${h ? ' ' + h + ' h' : ''}`;
  return long ? `${plural(h, 'heure', 'heures')}${m ? ' ' + pad(m) : ''}` : `${h} h${m ? ' ' + pad(m) : ''}`;
}
function watchTimeCard() {
  const t = watchTime();
  if (!t.eps) return '';
  const max = Math.max(...t.days.map(x => x.min), 1);
  const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' });
  // Une comparaison parlante pour donner une idée de la durée
  const films = Math.round(t.total / 120);
  const days = Math.round(t.total / 1440 * 10) / 10;
  const compare = t.total >= 1440 ? `Soit ${days.toLocaleString('fr-FR')} ${days >= 2 ? 'journées entières' : 'journée entière'} non-stop` : films >= 2 ? `L'équivalent de ${films} films` : '';
  return `<section class="time-card" aria-label="Temps passé devant vos séries">
    <div class="time-main">
      <span class="time-icon" aria-hidden="true">${icon('clock')}</span>
      <div><b class="time-total">${t.guessed ? '≈ ' : ''}${fmtDuration(t.total)}</b>
      <span class="time-label">devant vos séries${compare ? ` · ${compare.toLowerCase()}` : ''}</span></div>
    </div>
    <div class="time-side">
      <div class="time-mini"><b>${fmtDuration(t.week)}</b><span>cette semaine</span></div>
      <div class="time-mini"><b>${fmtDuration(t.month)}</b><span>ce mois-ci</span></div>
      <div class="time-chart" role="img" aria-label="Temps de visionnage des 7 derniers jours">
        ${t.days.map((x, i) => `<span class="tc-day ${i === 6 ? 'today' : ''}" title="${esc(fmtDate(x.d, 'long'))} : ${x.min ? fmtDuration(x.min) : 'rien'}"><span class="tc-bar" style="height:${Math.max(x.min ? 12 : 4, Math.round((x.min / max) * 100))}%"></span><small>${esc(dayName.format(x.d))}</small></span>`).join('')}
      </div>
    </div>
  </section>`;
}
function posterCard(s, st) {
  const e = st.next;
  const pf = showPlatforms(s)[0];
  return `<article class="pcard" data-card="${s.id}">
    <a class="pcard-link" href="#/show/${s.id}">${posterHTML(s, 'w342')}<span class="pcard-shade"></span>
      <span class="pcard-info"><b>${esc(s.title)}</b><span>${epCode(e)}${st.available > 1 ? ` · +${st.available - 1}` : ''}</span></span></a>
    ${ringBadge(st.pct, false, 'pcard-ring')}
    ${pf ? `<span class="pcard-pf">${pfBadge(pf.p)}</span>` : ''}
    <button class="pcard-check" data-act="next-watch" data-show="${s.id}" aria-label="Marquer ${epCode(e)} de ${esc(s.title)} comme vu">${icon('check')}</button>
  </article>`;
}
function upRow(s, st) {
  const e = st.next;
  const pf = showPlatforms(s)[0];
  return `<li class="up-row" data-card="${s.id}">
    <a class="up-link" href="#/show/${s.id}">
      ${posterHTML(s, 'w154')}
      <span class="up-text">
        <span class="up-title">${esc(s.title)}</span>
        <span class="up-ep">${epCode(e)}${e.title ? ` – ${esc(e.title)}` : ''}</span>
        <span class="up-meta">${bar(st.pct)}<span>${st.available > 1 ? `${st.available} à voir` : 'Dernier dispo'}</span>${pf ? pfBadge(pf.p) : ''}</span>
      </span>
    </a>
    <button class="big-check" data-act="next-watch" data-show="${s.id}" aria-label="Marquer ${epCode(e)} de ${esc(s.title)} comme vu">${icon('check')}<span>Vu</span></button>
  </li>`;
}
function relItem({ show, e, r, timed }) {
  const cd = countdown(r, timed);
  const pfs = showPlatforms(show);
  const when = timed ? `${relDayLabel(r) || fmtDate(r, 'long')} · ${FMT.time.format(r)}` : (relDayLabel(r) || fmtDate(r, 'long'));
  const available = r <= new Date();
  return `<article class="rel ${available ? 'available' : ''}">
    <a href="#/show/${show.id}" aria-label="${esc(show.title)}">${posterHTML(show, 'w154')}</a>
    <div style="min-width:0"><a href="#/show/${show.id}" class="rel-show">${esc(show.title)}</a>
      <div class="rel-ep"><b>${epCode(e)}</b>${e.title ? ` – ${esc(e.title)}` : ''}</div>
      <div class="rel-meta">${icon('clock', 'sm')}<span>${esc(when)}</span>${pfs.map(x => pfBadge(x.p)).join('')}${pfs.length ? `<span>${esc(pfs.map(x => x.p.name).join(', '))}</span>` : ''}</div></div>
    <div class="rel-side"><span class="countdown ${cd.cls}" data-release="${r.getTime()}" data-timed="${timed ? 1 : 0}">${esc(cd.text)}</span>
      ${available ? `<button class="btn sm ok" data-act="ep-toggle" data-show="${show.id}" data-key="${epKey(e)}">${icon('check', 'sm')}Marquer vu</button>` : ''}</div>
  </article>`;
}

/* ---------- Vue : Bibliothèque ---------- */
function cardHTML(s, st, showCat) {
  const sub = showSubline(s, st);
  const pfs = showPlatforms(s).slice(0, 3);
  const done = st.total && st.watched === st.total;
  return `<div class="card" data-card="${s.id}">
    <div style="position:relative">${posterHTML(s)}
      <div class="card-pfs">${pfs.map(x => pfBadge(x.p)).join('')}</div>
      ${showCat ? `<span class="chip card-cat">${CAT[s.status].label}</span>` : ''}
      ${st.total && st.watched ? ringBadge(st.pct, done, 'on-poster') : ''}
      ${st.next ? `<button class="card-quick" data-act="next-watch" data-show="${s.id}" title="Marquer ${epCode(st.next)} comme vu" aria-label="Marquer ${epCode(st.next)} de ${esc(s.title)} comme vu">${icon('check')}</button>` : ''}
    </div>
    <a class="card-link" href="#/show/${s.id}" aria-label="${esc(s.title)}"></a>
    <div><div class="card-title">${esc(s.title)}</div><div class="card-sub ${sub.hot ? 'hot' : ''}">${esc(sub.text)}</div></div>
  </div>`;
}
function viewLibrary() {
  const L = ui.lib;
  const counts = Object.fromEntries(CATEGORIES.map(c => [c.id, state.shows.filter(s => s.status === c.id).length]));
  const genres = [...new Set(state.shows.flatMap(s => s.genres))].sort((a, b) => a.localeCompare(b, 'fr'));
  const usedPf = state.platforms.filter(p => state.shows.some(s => s.platforms.some(x => x.pid === p.id)));
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
  return `<header class="page-head"><div><h1 class="page-title">Bibliothèque</h1><p class="page-sub">${plural(state.shows.length, 'série', 'séries')}</p></div>
      <button class="btn primary" data-act="add-open">${icon('plus')}Ajouter</button></header>
    <div class="seg lib-tabs" role="tablist">
      <button role="tab" class="${L.cat === 'all' ? 'on' : ''}" data-act="lib-cat" data-cat="all" aria-selected="${L.cat === 'all'}">Toutes <span class="count">${state.shows.length}</span></button>
      ${CATEGORIES.map(c => `<button role="tab" class="${L.cat === c.id ? 'on' : ''}" data-act="lib-cat" data-cat="${c.id}" aria-selected="${L.cat === c.id}"><span class="tab-dot" style="background:${c.color}"></span>${c.label} <span class="count">${counts[c.id]}</span></button>`).join('')}
    </div>
    <div class="toolbar">
      <div class="search-box">${icon('search')}<label class="visually-hidden" for="libSearch">Rechercher dans la bibliothèque</label><input id="libSearch" class="input" type="search" placeholder="Rechercher une série…" value="${esc(L.q)}" data-input="lib-q" autocomplete="off"></div>
      <label class="visually-hidden" for="fPf">Plateforme</label>
      <select id="fPf" class="select" data-change="lib-filter" data-key="platform">${opt('', 'Toutes plateformes', L.platform)}${usedPf.map(p => opt(p.id, p.name, L.platform)).join('')}</select>
      <label class="visually-hidden" for="fGenre">Genre</label>
      <select id="fGenre" class="select" data-change="lib-filter" data-key="genre">${opt('', 'Tous genres', L.genre)}${genres.map(g => opt(g, g, L.genre)).join('')}</select>
      <label class="visually-hidden" for="fAir">Diffusion</label>
      <select id="fAir" class="select" data-change="lib-filter" data-key="air">${opt('', 'Toute diffusion', L.air)}${opt('airing', 'En cours de diffusion', L.air)}${opt('ended', 'Diffusion terminée', L.air)}${opt('new', 'Épisodes dispo', L.air)}</select>
      <label class="visually-hidden" for="fSort">Trier</label>
      <select id="fSort" class="select" data-change="lib-filter" data-key="sort">${opt('recent', 'Ajout récent', L.sort)}${opt('activity', 'Activité récente', L.sort)}${opt('title', 'Titre A→Z', L.sort)}${opt('progress', 'Progression', L.sort)}${opt('next', 'Prochaine sortie', L.sort)}${opt('rating', 'Ma note', L.sort)}</select>
    </div>
    <div id="libGrid"></div>`;
}
function renderLibGrid() {
  const el = $('#libGrid'); if (!el) return;
  const L = ui.lib, q = norm(L.q), now = new Date();
  let list = state.shows.map(s => ({ s, st: stats(s, now) })).filter(({ s, st }) => {
    if (L.cat !== 'all' && s.status !== L.cat) return false;
    if (q && !norm(s.title).includes(q) && !norm(s.originalTitle).includes(q)) return false;
    if (L.platform && !s.platforms.some(x => x.pid === L.platform)) return false;
    if (L.genre && !s.genres.includes(L.genre)) return false;
    if (L.air === 'new' && !st.available) return false;
    if ((L.air === 'airing' || L.air === 'ended') && s.airStatus !== L.air) return false;
    return true;
  });
  const nextTime = x => { const e = x.st.nextUp; const r = e && epRelease(x.s, e); return r ? r.getTime() : Infinity; };
  const sorters = {
    recent: (a, b) => b.s.addedAt - a.s.addedAt,
    activity: (a, b) => (b.s.lastWatchedAt || b.s.addedAt) - (a.s.lastWatchedAt || a.s.addedAt),
    title: (a, b) => a.s.title.localeCompare(b.s.title, 'fr'),
    progress: (a, b) => b.st.pct - a.st.pct,
    next: (a, b) => nextTime(a) - nextTime(b),
    rating: (a, b) => (b.s.rating || 0) - (a.s.rating || 0),
  };
  list.sort(sorters[L.sort] || sorters.recent);
  if (!state.shows.length) {
    el.innerHTML = emptyHTML({ title: 'Votre bibliothèque est vide', text: 'Recherchez une série ou ajoutez-la manuellement pour commencer.', actions: `<button class="btn primary" data-act="add-open">${icon('plus')}Ajouter une série</button>` });
  } else if (!list.length) {
    const filtered = L.q || L.platform || L.genre || L.air;
    el.innerHTML = emptyHTML({ ic: 'search', title: filtered ? 'Aucun résultat' : `Aucune série dans « ${CAT[L.cat]?.label} »`, text: filtered ? 'Aucune série ne correspond à ces filtres.' : 'Changez la catégorie d\'une série depuis sa fiche.', actions: filtered ? `<button class="btn" data-act="lib-reset">Effacer les filtres</button>` : '' });
  } else {
    el.innerHTML = `<div class="grid">${list.map(({ s, st }) => cardHTML(s, st, L.cat === 'all')).join('')}</div>`;
  }
}

/* ---------- Vue : Calendrier ---------- */
function viewCalendar() {
  const now = new Date();
  const today = startOfDay(now);
  const { upcoming, fresh, tba } = collectReleases(now);
  const ranges = {
    today: { label: "Aujourd'hui", end: new Date(today.getTime() + DAY) },
    week: { label: 'Cette semaine', end: new Date(today.getTime() + 7 * DAY) },
    month: { label: 'Ce mois-ci', end: new Date(today.getTime() + 30 * DAY) },
    all: { label: 'Tout', end: null },
  };
  const R = ranges[ui.cal.range] || ranges.week;
  const items = upcoming.filter(x => !R.end || x.r < R.end);
  const count = k => upcoming.filter(x => !ranges[k].end || x.r < ranges[k].end).length;

  const groups = [];
  for (const it of items) {
    const k = startOfDay(it.r).getTime();
    let g = groups[groups.length - 1];
    if (!g || g.k !== k) { g = { k, d: startOfDay(it.r), items: [] }; groups.push(g); }
    g.items.push(it);
  }
  const groupsHTML = groups.map(g => `<section class="day-group"><div class="day-head">${dateBadge(g.d)}<h3>${esc(relDayLabel(g.d) || fmtDate(g.d, 'long'))}</h3>${relDayLabel(g.d) ? `<span class="muted">${esc(fmtDate(g.d, 'long'))}</span>` : ''}<span class="muted">${plural(g.items.length, 'épisode', 'épisodes')}</span></div>
    <div class="rel-list">${g.items.map(relItem).join('')}</div></section>`).join('');

  const freshHTML = fresh.length ? `<section class="day-group"><div class="day-head"><h3>Disponibles maintenant</h3><span class="muted">Sortis récemment, pas encore vus</span></div>
    <div class="rel-list">${fresh.map(relItem).join('')}</div></section>` : '';

  const tbaHTML = (ui.cal.range === 'all' && tba.length) ? `<section class="day-group"><div class="day-head"><h3>Date à confirmer</h3><span class="muted">Annoncés sans date de sortie</span></div>
    <div class="rel-list">${tba.map(({ show, e, more }) => `<article class="rel"><a href="#/show/${show.id}">${posterHTML(show, 'w154')}</a>
      <div style="min-width:0"><a href="#/show/${show.id}" class="rel-show">${esc(show.title)}</a><div class="rel-ep"><b>${epCode(e)}</b>${e.title ? ` · ${esc(e.title)}` : ''}${more ? ` <span class="muted">et ${plural(more, 'autre épisode', 'autres épisodes')}</span>` : ''}</div>
      <div class="rel-meta">${showPlatforms(show).map(x => pfBadge(x.p)).join('')}</div></div>
      <div class="rel-side"><span class="chip muted">Date à confirmer</span></div></article>`).join('')}</div></section>` : '';

  const emptyText = { today: "Aucun épisode ne sort aujourd'hui.", week: 'Aucun épisode ne sort dans les 7 prochains jours.', month: 'Aucun épisode ne sort dans les 30 prochains jours.', all: 'Aucune sortie datée à venir pour vos séries.' }[ui.cal.range];

  return `<header class="page-head"><div><h1 class="page-title">Calendrier</h1><p class="page-sub">Les prochains épisodes de vos séries.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn sm ghost" data-act="ics-export" title="Exporter les sorties vers votre agenda (.ics)">${icon('download', 'sm')}Ajouter à mon agenda</button>
        ${notifButtonHTML()}
      </div></header>
    <div class="seg" role="tablist">${Object.entries(ranges).map(([k, v]) => `<button role="tab" class="${ui.cal.range === k ? 'on' : ''}" aria-selected="${ui.cal.range === k}" data-act="cal-range" data-range="${k}">${v.label} <span class="count">${count(k)}</span></button>`).join('')}</div>
    <p class="filters-note">${{ today: "Sorties d'aujourd'hui.", week: 'Les 7 prochains jours.', month: 'Les 30 prochains jours.', all: 'Toutes les sorties annoncées, y compris sans date.' }[ui.cal.range]}</p>
    ${freshHTML}
    ${groupsHTML || `<div style="margin-top:20px">${emptyHTML({ sm: true, ic: 'calendar', title: 'Rien de prévu', text: emptyText + (tba.length && ui.cal.range !== 'all' ? ` ${plural(tba.length, 'série a', 'séries ont')} des épisodes en « Date à confirmer » (onglet Tout).` : '') })}</div>`}
    ${tbaHTML}`;
}
function notifButtonHTML() {
  if (!('Notification' in window)) return '';
  const on = state.settings.notifications && Notification.permission === 'granted';
  return `<button class="btn sm ${on ? 'ok' : 'ghost'}" data-act="notif-toggle">${icon('bell', 'sm')}${on ? 'Rappels activés' : 'Activer les rappels'}</button>`;
}

/* ---------- Vue : Fiche série ---------- */
function viewShow(id) {
  const show = getShow(id);
  if (!show) return `<a class="back" href="#/library">${icon('back', 'sm')}Bibliothèque</a>${emptyHTML({ ic: 'search', title: 'Série introuvable', text: 'Elle a peut-être été supprimée.', actions: '<a class="btn" href="#/library">Retour à la bibliothèque</a>' })}`;
  const now = new Date();
  const st = stats(show, now);
  if (!ui.openSeasons[show.id]) ui.openSeasons[show.id] = new Set([st.currentSeason]);
  const open = ui.openSeasons[show.id];
  const pfs = showPlatforms(show);
  const nSeasons = show.seasons.length, nEps = st.total;
  const meta = [
    show.year && `<span>${esc(show.year)}</span>`,
    show.genres.length && `<span>${esc(show.genres.join(', '))}</span>`,
    `<span>${plural(nSeasons, 'saison', 'saisons')} · ${plural(nEps, 'épisode', 'épisodes')}</span>`,
    show.runtime && `<span>${fmtRuntime(show.runtime)} / ép.</span>`,
  ].filter(Boolean).join('<span class="sep"></span>');

  const stars = [1, 2, 3, 4, 5].map(n => `<button class="star ${show.rating >= n ? 'on' : ''}" data-act="show-rating" data-show="${show.id}" data-n="${n}" aria-label="Noter ${n} sur 5" aria-pressed="${show.rating >= n}">${icon('star', 'fill')}</button>`).join('');

  const banner = imgUrl(show.backdrop, 'w1280') || imgUrl(show.poster, 'w780');
  const hero = `<section class="detail-hero">
    <div class="detail-banner ${show.backdrop ? '' : 'from-poster'}" style="${banner ? `background-image:url('${esc(banner)}')` : `background:linear-gradient(135deg,hsl(${hueOf(show.title)} 50% 55%),hsl(${hueOf(show.title) + 60} 45% 30%))`}" aria-hidden="true"></div>
    ${posterHTML(show, 'w500')}
    <div class="detail-info">
      <div class="detail-head" style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">${catChip(show.status)}<span class="chip ${AIR_STATUS[show.airStatus].chip}">${AIR_STATUS[show.airStatus].label}</span></div>
        <h1 class="detail-title">${esc(show.title)}</h1>
        ${show.originalTitle && norm(show.originalTitle) !== norm(show.title) ? `<div class="detail-orig">${esc(show.originalTitle)}</div>` : ''}
        <div class="meta-line">${meta}</div>
      </div>
      <div class="overview-wrap">
        ${show.overview ? `<p class="overview ${ui.expandOverview ? '' : 'clamp'}">${esc(show.overview)}</p>${show.overview.length > 320 ? `<button class="link-btn" data-act="overview-toggle">${ui.expandOverview ? 'Réduire' : 'Lire la suite'}</button>` : ''}` : `<p class="overview muted">Aucun synopsis disponible.</p>`}
        <div class="pf-row" style="margin-top:14px">${pfs.length ? pfs.map(x => `<span class="pf-tag">${pfBadge(x.p)}${esc(x.p.name)}${x.region ? ` <small>${esc(x.region)}</small>` : ''}</span>`).join('') : `<span class="muted" style="font-size:14px">Plateforme non renseignée</span>`}</div>
      </div>
      ${st.next ? `<button class="btn primary next-now" data-act="ep-toggle" data-show="${show.id}" data-key="${epKey(st.next)}">${icon('check')}Marquer ${epCode(st.next)} comme vu</button>` : ''}
      <div class="detail-actions">
        <label class="visually-hidden" for="catSel">Catégorie</label>
        <select id="catSel" class="select" data-change="show-status" data-show="${show.id}">${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === show.status ? 'selected' : ''}>${c.label}</option>`).join('')}</select>
        <button class="btn" data-act="show-edit" data-show="${show.id}">${icon('edit')}Modifier</button>
        ${show.tvmazeId ? `<button class="icon-btn bordered" data-act="show-refresh" data-show="${show.id}" title="Mettre à jour les épisodes" aria-label="Mettre à jour les épisodes">${icon('refresh')}</button>` : ''}
        <button class="icon-btn bordered" data-act="show-delete" data-show="${show.id}" title="Supprimer la série" aria-label="Supprimer la série">${icon('trash')}</button>
      </div>
    </div>
  </section>`;

  const C = 2 * Math.PI * 40;
  const done = st.total && st.watched === st.total;
  let nextBlock;
  if (st.next) {
    nextBlock = `<div class="next-card"><span class="eyebrow">Prochain épisode à regarder</span>
      <div><div class="next-ep">${epCode(st.next)}${st.next.title ? ` – ${esc(st.next.title)}` : ''}</div>
      <div class="muted" style="font-size:13px">${st.next.airDate ? 'Sorti le ' + esc(FMT.full.format(parseDay(st.next.airDate))) : ''}${st.next.runtime ? ' · ' + fmtRuntime(st.next.runtime) : ''}</div></div>
      <button class="btn primary sm" data-act="ep-toggle" data-show="${show.id}" data-key="${epKey(st.next)}">${icon('check', 'sm')}Marquer comme vu</button></div>`;
  } else if (st.nextUp) {
    const r = epRelease(show, st.nextUp);
    nextBlock = `<div class="next-card calm"><span class="eyebrow">${st.watched ? 'À jour, prochain épisode' : 'Prochain épisode'}</span>
      <div class="next-ep">${epCode(st.nextUp)}${st.nextUp.title ? ` – ${esc(st.nextUp.title)}` : ''}</div>
      <div class="muted" style="font-size:13px">${r ? esc(fmtDate(r, 'long')) + (isTimed(show, st.nextUp) ? ' à ' + FMT.time.format(r) : '') + ' · ' + esc(countdown(r, isTimed(show, st.nextUp)).text) : 'Date à confirmer'}</div></div>`;
  } else if (done) {
    nextBlock = `<div class="next-card calm"><span class="eyebrow">Terminé</span><div>Vous avez vu tous les épisodes référencés.${show.airStatus === 'airing' ? ' De nouveaux épisodes apparaîtront dès leur annonce.' : ''}</div>
      ${show.status !== 'completed' ? `<button class="btn sm" data-act="set-status" data-show="${show.id}" data-status="completed">Classer en « Terminées »</button>` : ''}</div>`;
  } else nextBlock = '';

  const side = `<aside class="detail-side">
    <div class="panel"><div class="panel-title">Ma progression</div>
      <div class="progress-top">
        <div class="ring ${done ? 'done' : ''}"><svg viewBox="0 0 100 100">
          <circle class="track" cx="50" cy="50" r="40"/><circle class="val" cx="50" cy="50" r="40" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - st.pct / 100)}"/></svg>
          <div class="ring-label">${st.pct}%</div></div>
        <div><div style="font-weight:700;font-size:18px">${st.watched} / ${st.total}</div><div class="muted" style="font-size:13.5px">épisodes regardés</div>
          ${st.total ? `<div class="muted" style="font-size:13.5px;margin-top:4px">Saison actuelle : <b style="color:var(--ink)">${st.currentSeason}</b></div>` : ''}</div>
      </div>
      ${show.seasons.length > 1 ? seasonStrip(show) : ''}
      <div class="kv">
        <div><b>${st.remaining}</b><span>restants</span></div>
        <div><b>${st.available}</b><span>disponibles à voir</span></div>
        <div><b>${st.upcoming + st.tba}</b><span>à venir</span></div>
        <div><b>${st.minutes ? fmtRuntime(st.minutes) : '—'}</b><span>regardé</span></div>
      </div>
      ${nextBlock}
    </div>
    <div class="panel"><div class="panel-title">Ma note <span class="stars">${stars}</span></div>
      <label class="label" for="notes">Notes personnelles</label>
      <textarea id="notes" class="textarea notes-area" style="margin-top:6px" placeholder="Vos impressions, où vous en étiez, à qui la conseiller…" data-blur="show-notes" data-show="${show.id}">${esc(show.notes || '')}</textarea>
      <dl class="info-list" style="margin-top:16px">
        <div><dt>Ajoutée le</dt><dd>${esc(FMT.full.format(new Date(show.addedAt)))}</dd></div>
        ${show.airTime ? `<div><dt>Heure de diffusion</dt><dd>${esc(show.airTime)}</dd></div>` : ''}
        <div><dt>Source</dt><dd>${show.tvmazeId ? 'Catalogue TVmaze' : 'Ajout manuel'}</dd></div>
        ${show.lastSync ? `<div><dt>Mise à jour</dt><dd>${esc(fmtDate(new Date(show.lastSync)))}</dd></div>` : ''}
      </dl>
    </div>
  </aside>`;

  const seasonsHTML = show.seasons.length ? show.seasons.map(se => seasonHTML(show, se, st.states, open.has(se.number), st.next ? epKey(st.next) : '')).join('') :
    emptyHTML({ sm: true, ic: 'listcheck', title: 'Aucun épisode', text: show.tvmazeId ? "Aucun épisode n'est encore annoncé pour cette série." : 'Ajoutez une saison pour suivre vos épisodes.' });

  return `<a class="back" href="#/library">${icon('back', 'sm')}Bibliothèque</a>${hero}
    <div class="detail-grid"><div><div class="section-head" style="margin-bottom:10px"><h2 class="section-title">Épisodes</h2>
      <div class="view-toggle" role="group" aria-label="Affichage des épisodes">
        <button class="${ui.epView === 'grid' ? 'on' : ''}" data-act="ep-view" data-view="grid" aria-pressed="${ui.epView === 'grid'}" title="Grille">${icon('grid', 'sm')}<span>Grille</span></button>
        <button class="${ui.epView === 'list' ? 'on' : ''}" data-act="ep-view" data-view="list" aria-pressed="${ui.epView === 'list'}" title="Liste détaillée">${icon('list', 'sm')}<span>Liste</span></button>
      </div></div>
      ${show.seasons.length ? `<div class="ep-legend"><span class="lg watched">Vu</span><span class="lg available">À voir</span><span class="lg upcoming">Bientôt</span><span class="lg tba">Date inconnue</span></div>` : ''}
      ${seasonsHTML}
      <button class="btn sm ghost add-season" data-act="season-add" data-show="${show.id}">${icon('plus', 'sm')}Ajouter une saison</button></div>${side}</div>`;
}
function seasonHTML(show, se, states, isOpen, nextKey = '') {
  const eps = se.episodes;
  const w = eps.filter(e => e.watched).length;
  const markable = eps.filter(e => states.get(e) !== 'upcoming');
  const allDone = markable.length > 0 && markable.every(e => e.watched);
  const pct = eps.length ? Math.round((w / eps.length) * 100) : 0;
  const tileDate = d => `${d.getDate()}/${d.getMonth() + 1}`;
  const gridHTML = `<div class="ep-grid">${eps.map(e => {
    const st = states.get(e);
    const r = epRelease(show, e);
    const when = r ? (relDayLabel(r) || fmtDate(r)) : 'Date à confirmer';
    const label = `${epCode(e)}${e.title ? ' – ' + e.title : ''} (${st === 'watched' ? 'vu' : st === 'available' ? 'à voir' : st === 'upcoming' ? 'sort ' + when : 'date à confirmer'})`;
    return `<button class="ep-tile is-${st} ${epKey(e) === nextKey ? 'next' : ''}" data-ep="${epKey(e)}" data-act="ep-toggle" data-show="${show.id}" data-key="${epKey(e)}" aria-pressed="${e.watched}" ${st === 'upcoming' ? 'disabled' : ''} title="${esc(label)}" aria-label="${esc(label)}">
      <b>${e.number}</b>${st === 'watched' ? icon('check', 'sm') : st === 'upcoming' ? `<small>${tileDate(r)}</small>` : st === 'tba' ? '<small>?</small>' : ''}</button>`;
  }).join('')}</div>`;
  const epsHTML = !isOpen ? '' : ui.epView === 'grid' ? gridHTML + `<div class="season-foot"><button class="btn sm ghost" data-act="ep-add" data-show="${show.id}" data-season="${se.number}">${icon('plus', 'sm')}Ajouter un épisode</button></div>` : `<ol class="eps">${eps.map(e => {
    const s = states.get(e);
    const r = epRelease(show, e);
    const dateTxt = r ? (relDayLabel(r) || fmtDate(r)) + (isTimed(show, e) ? ' · ' + FMT.time.format(r) : '') : 'Date à confirmer';
    return `<li class="ep is-${s}" data-ep="${epKey(e)}">
      <button class="chk" data-act="ep-toggle" data-show="${show.id}" data-key="${epKey(e)}" aria-pressed="${e.watched}" ${s === 'upcoming' ? 'disabled title="Pas encore sorti"' : ''} aria-label="${e.watched ? 'Décocher' : 'Marquer comme vu'} ${epCode(e)}">${icon('check')}</button>
      <div style="min-width:0"><div class="ep-top"><span class="ep-code">${e.number}</span><span class="ep-title ${e.title ? '' : 'none'}">${esc(e.title || 'Titre non communiqué')}</span></div>
        <div class="ep-meta"><span>${esc(dateTxt)}</span>${e.runtime ? `<span>${fmtRuntime(e.runtime)}</span>` : ''}${stateChip(s, show, e)}</div></div>
      <div class="ep-actions">
        <button class="icon-btn sm" data-act="ep-prev" data-show="${show.id}" data-key="${epKey(e)}" title="Marquer cet épisode et tous les précédents comme vus" aria-label="Marquer cet épisode et tous les précédents comme vus">${icon('listcheck')}</button>
        <button class="icon-btn sm" data-act="ep-edit" data-show="${show.id}" data-key="${epKey(e)}" title="Modifier l'épisode" aria-label="Modifier l'épisode">${icon('edit')}</button>
      </div></li>`;
  }).join('')}</ol>
    <div class="season-foot"><button class="btn sm ghost" data-act="ep-add" data-show="${show.id}" data-season="${se.number}">${icon('plus', 'sm')}Ajouter un épisode</button>
    ${!show.tvmazeId ? `<button class="btn sm danger-ghost" data-act="season-delete" data-show="${show.id}" data-season="${se.number}">${icon('trash', 'sm')}Supprimer la saison</button>` : ''}</div>`;
  return `<section class="season ${isOpen ? 'open' : ''}">
    <div class="season-head">
      <button class="season-toggle" data-act="season-open" data-show="${show.id}" data-season="${se.number}" aria-expanded="${isOpen}">
        ${ringBadge(pct, pct === 100 && eps.length > 0, 'season-ring')}<span class="season-name">Saison ${se.number}</span><span class="season-count">${w} / ${eps.length} vus</span>${icon('chevron', 'chev')}
      </button>
      ${markable.length ? `<button class="btn sm ${allDone ? 'ghost' : 'soft'}" data-act="season-toggle" data-show="${show.id}" data-season="${se.number}">${allDone ? 'Décocher la saison' : `${icon('check', 'sm')}Marquer la saison vue`}</button>` : ''}
    </div>${epsHTML}</section>`;
}

/* ---------- Actions épisodes ---------- */
function snapshot(show) { return allEps(show).map(e => [epKey(e), e.watched, e.watchedAt]); }
function restore(showId, snap) {
  const show = getShow(showId); if (!show) return;
  const m = new Map(snap.map(x => [x[0], x]));
  for (const e of allEps(show)) { const x = m.get(epKey(e)); if (x) { e.watched = x[1]; e.watchedAt = x[2]; } }
  save(); render();
}
function findEp(show, key) { return allEps(show).find(e => epKey(e) === key); }

function afterWatch(show, snap, keys, msg) {
  show.updatedAt = Date.now();
  if (keys.some(k => findEp(show, k)?.watched)) show.lastWatchedAt = Date.now();
  let movedMsg = '';
  if (show.status === 'planned' && allEps(show).some(e => e.watched)) { show.status = 'watching'; movedMsg = ' · déplacée dans « En cours »'; }
  save();
  render();
  for (const k of keys) {
    const tile = $(`.ep-tile[data-ep="${k}"][aria-pressed="true"]`);
    if (tile) tile.classList.add('pop');
    const li = $(`.ep[data-ep="${k}"]`);
    const b = li?.querySelector('.chk');
    if (b && b.getAttribute('aria-pressed') === 'true') { b.classList.add('pop'); li.classList.add('flash'); }
  }
  const st = stats(show);
  if (st.total && st.watched === st.total && show.status !== 'completed' && show.airStatus === 'ended') {
    toast(`Vous avez terminé « ${show.title} » !`, { type: 'info', action: { label: 'Classer en Terminées', fn: () => { show.status = 'completed'; save(); render(); } }, timeout: 8000 });
  } else if (st.total && !st.available && st.watched && keys.length && show.airStatus !== 'ended' && findEp(show, keys[0])?.watched) {
    toast(`${msg}${movedMsg} · vous êtes à jour !`, { action: { label: 'Annuler', fn: () => restore(show.id, snap) } });
  } else {
    toast(msg + movedMsg, { action: { label: 'Annuler', fn: () => restore(show.id, snap) } });
  }
}
const buzz = () => { try { navigator.vibrate?.(12); } catch { /* non pris en charge */ } };
function toggleEpisode(show, key) {
  const e = findEp(show, key); if (!e) return;
  const st = computeStates(show).get(e);
  if (st === 'upcoming' && !e.watched) { toast("Cet épisode n'est pas encore sorti.", { type: 'info' }); return; }
  const snap = snapshot(show);
  e.watched = !e.watched;
  if (e.watched) buzz();
  e.watchedAt = e.watched ? Date.now() : null;
  delete e.bulk;
  afterWatch(show, snap, [key], `${epCode(e)} ${e.watched ? 'marqué comme vu' : 'marqué comme non vu'}`);
}
function markPrevious(show, key) {
  const target = findEp(show, key); if (!target) return;
  const states = computeStates(show);
  const snap = snapshot(show);
  const changed = [];
  for (const e of allEps(show)) {
    const before = e.season < target.season || (e.season === target.season && e.number <= target.number);
    if (before && !e.watched && states.get(e) !== 'upcoming') { e.watched = true; e.watchedAt = Date.now(); e.bulk = true; changed.push(epKey(e)); }
  }
  if (!changed.length) { toast('Tous les épisodes précédents sont déjà marqués comme vus.', { type: 'info' }); return; }
  afterWatch(show, snap, changed, `${plural(changed.length, 'épisode marqué', 'épisodes marqués')} comme vus jusqu'à ${epCode(target)}`);
}
function toggleSeason(show, num) {
  const se = show.seasons.find(s => s.number === num); if (!se) return;
  const states = computeStates(show);
  const markable = se.episodes.filter(e => states.get(e) !== 'upcoming');
  const allDone = markable.every(e => e.watched);
  const snap = snapshot(show);
  const changed = [];
  for (const e of markable) {
    if (e.watched === !allDone) continue;
    e.watched = !allDone; e.watchedAt = e.watched ? Date.now() : null; e.bulk = e.watched || undefined; changed.push(epKey(e));
  }
  const skipped = se.episodes.length - markable.length;
  afterWatch(show, snap, changed, allDone ? `Saison ${num} décochée` : `Saison ${num} marquée comme vue${skipped ? ` (${plural(skipped, 'épisode à venir ignoré', 'épisodes à venir ignorés')})` : ''}`);
}

/* ---------- Toasts ---------- */
function toast(msg, { type = 'ok', action = null, timeout = 5000 } = {}) {
  const box = $('#toasts');
  while (box.children.length >= 3) box.firstChild.remove();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `${icon(type === 'error' ? 'info' : type === 'info' ? 'sparkle' : 'check')}<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 180); };
  if (action) el.querySelector('button').onclick = () => { action.fn(); close(); };
  box.appendChild(el);
  setTimeout(close, timeout);
}

/* ---------- Modales ---------- */
function openModal(html, size = '') {
  const m = $('#modal');
  m.className = `modal ${size}`;
  m.innerHTML = html;
  if (!m.open) m.showModal();
}
function closeModal() { const m = $('#modal'); if (m.open) m.close(); }
function confirmDialog({ title, body, confirm = 'Confirmer', danger = false }) {
  return new Promise(resolve => {
    const d = $('#confirm');
    let done = false;
    const finish = v => { if (done) return; done = true; if (d.open) d.close(); resolve(v); };
    d.innerHTML = `<div class="modal-inner"><h2 class="modal-title">${esc(title)}</h2><p class="muted">${body}</p>
      <div class="modal-foot"><button class="btn ghost" data-cf="0">Annuler</button><button class="btn ${danger ? 'danger' : 'primary'}" data-cf="1">${esc(confirm)}</button></div></div>`;
    d.onclick = e => { const b = e.target.closest('[data-cf]'); if (b) finish(b.dataset.cf === '1'); else if (e.target === d) finish(false); };
    d.onclose = () => finish(false);
    d.showModal();
    d.querySelector('[data-cf="1"]').focus();
  });
}

/* ---------- Catalogue TVmaze (gratuit, sans clé) ---------- */
class ApiError extends Error { constructor(code) { super(code); this.code = code; } }
async function api(path, tries = 2) {
  let r;
  try { r = await fetch(CATALOG_API + path, { headers: { accept: 'application/json' } }); } catch { throw new ApiError('NETWORK'); }
  if (r.status === 429 && tries > 0) { await new Promise(res => setTimeout(res, 1500)); return api(path, tries - 1); }
  if (r.status === 404) throw new ApiError('NOT_FOUND');
  if (r.status === 429) throw new ApiError('RATE');
  if (!r.ok) throw new ApiError('HTTP');
  return r.json();
}
function apiErrorText(err) {
  return {
    NETWORK: 'Impossible de joindre le catalogue de séries. Vérifiez votre connexion puis réessayez.',
    RATE: "Trop de recherches d'un coup. Réessayez dans quelques secondes.",
    NOT_FOUND: "Cette série n'est plus disponible dans le catalogue.",
  }[err?.code] || 'Le catalogue a renvoyé une erreur inattendue. Réessayez dans un instant.';
}
const mapAirStatus = s => (s === 'Ended' ? 'ended' : ['Running', 'In Development'].includes(s) ? 'airing' : 'unknown');
const GENRES_FR = {
  Drama: 'Drame', Comedy: 'Comédie', 'Science-Fiction': 'Science-fiction', Fantasy: 'Fantastique', Thriller: 'Thriller', Crime: 'Policier',
  Mystery: 'Mystère', Horror: 'Horreur', Romance: 'Romance', Action: 'Action', Adventure: 'Aventure', Anime: 'Animé', Family: 'Famille',
  History: 'Histoire', War: 'Guerre', Western: 'Western', Music: 'Musique', Sports: 'Sport', Supernatural: 'Surnaturel', Medical: 'Médical',
  Legal: 'Judiciaire', Espionage: 'Espionnage', Children: 'Jeunesse', Food: 'Cuisine', Nature: 'Nature', Travel: 'Voyage', DIY: 'Bricolage', Adult: 'Adulte',
};
// Analyse inerte (DOMParser) : aucun script ni image du résumé n'est chargé.
const stripHtml = html => (html ? (new DOMParser().parseFromString(html, 'text/html').body.textContent || '').trim() : '');
const cleanEpTitle = t => (!t || /^(é|e)pisode\s*\d+$/i.test(t.trim()) || /^TBA$/i.test(t.trim()) ? '' : t.trim());

// Date et heure locales d'un épisode. Sans heure de diffusion connue, on garde la date seule.
function localAir(ep) {
  if (ep.airtime && ep.airstamp) {
    const d = new Date(ep.airstamp);
    if (!isNaN(d)) return { airDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, airTime: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
  }
  return { airDate: ep.airdate || null, airTime: '' };
}
const PLATFORM_ALIASES = {
  netflix: ['netflix'], prime: ['prime video', 'amazon prime video', 'amazon', 'amazon freevee'], disney: ['disney+'],
  appletv: ['apple tv+', 'apple tv'], max: ['hbo', 'hbo max', 'max'], paramount: ['paramount+'], crunchyroll: ['crunchyroll'],
};
function platformForName(name) {
  const n = norm(name);
  return state.platforms.find(p => norm(p.name) === n || (PLATFORM_ALIASES[p.id] || []).includes(n) || (p.aliases || []).includes(n));
}
// Chaîne ou plateforme de diffusion d'origine (information fiable du catalogue).
function originsOf(d) {
  const out = [];
  for (const [o, kind] of [[d.webChannel, 'web'], [d.network, 'tv']]) {
    if (o && o.name) out.push({ name: o.name, country: o.country?.code || '', kind, domain: domainOf(o.officialSite) });
  }
  return out;
}
function frenchTitle(d) {
  const akas = d._embedded?.akas || [];
  const fr = akas.find(a => ['FR', 'BE', 'CA', 'CH'].includes(a.country?.code));
  return fr?.name || '';
}

async function fetchFullShow(id) {
  const d = await api(`/shows/${id}?embed[]=episodes&embed[]=akas&embed[]=images`);
  const bySeason = new Map();
  for (const e of d._embedded?.episodes || []) {
    if (e.number == null || e.season == null || (e.type && e.type !== 'regular')) continue;
    if (!bySeason.has(e.season)) bySeason.set(e.season, []);
    bySeason.get(e.season).push({
      season: e.season, number: e.number, title: cleanEpTitle(e.name), ...localAir(e),
      runtime: e.runtime || null, watched: false,
    });
  }
  const seasons = [...bySeason.entries()].sort((a, b) => a[0] - b[0]).map(([number, episodes]) => ({ number, episodes }));
  const images = d._embedded?.images || [];
  const bg = images.find(i => i.type === 'background' && i.main) || images.find(i => i.type === 'background');
  const backdrop = bg?.resolutions?.medium?.url || bg?.resolutions?.original?.url || '';
  return { d, seasons, backdrop };
}

function draftFromCatalog({ d, seasons, backdrop }, frFromSearch = '') {
  const providers = originsOf(d);
  const platforms = [];
  for (const o of providers) {
    const pl = platformForName(o.name);
    if (pl && !platforms.some(x => x.pid === pl.id)) platforms.push({ pid: pl.id, region: o.country, source: 'tvmaze' });
  }
  const fr = frFromSearch || frenchTitle(d);
  return {
    mode: 'new', source: 'tvmaze', tvmazeId: d.id,
    title: fr || d.name || '', originalTitle: d.name || '',
    poster: d.image?.original || d.image?.medium || '', backdrop,
    overview: stripHtml(d.summary), genres: (d.genres || []).map(g => GENRES_FR[g] || g),
    year: (d.premiered || '').slice(0, 4), airStatus: mapAirStatus(d.status),
    status: 'planned', platforms, providers, rating: 0, notes: '', airTime: '',
    runtime: d.averageRuntime || d.runtime || null, seasons, seen: { season: 0, episode: 0 },
  };
}
function mergeSeasons(oldShow, fresh) {
  const old = new Map(allEps(oldShow).map(e => [epKey(e), e]));
  const seen = new Set();
  for (const s of fresh) for (const e of s.episodes) {
    const k = epKey(e); seen.add(k);
    const o = old.get(k);
    if (!o) continue;
    e.watched = !!o.watched; e.watchedAt = o.watchedAt || null;
    if (o.custom) { e.custom = true; e.title = o.title || e.title; e.airDate = o.airDate || e.airDate; e.airTime = o.airTime || e.airTime || ''; e.runtime = o.runtime || e.runtime; }
  }
  // conserve les épisodes ajoutés à la main ou déjà regardés qui ne sont plus listés
  for (const [k, o] of old) {
    if (seen.has(k) || !(o.added || o.watched)) continue;
    let s = fresh.find(x => x.number === o.season);
    if (!s) { s = { number: o.season, episodes: [] }; fresh.push(s); }
    s.episodes.push({ ...o });
  }
  return fresh;
}
async function refreshShow(show, { silent = false } = {}) {
  if (!show.tvmazeId) return 0;
  const before = allEps(show).length;
  const beforeDates = allEps(show).filter(e => e.airDate).length;
  const { d, seasons, backdrop } = await fetchFullShow(show.tvmazeId);
  show.seasons = mergeSeasons(show, seasons);
  normShow(show);
  show.airStatus = mapAirStatus(d.status);
  if (!show.poster) show.poster = d.image?.original || d.image?.medium || '';
  if (!show.backdrop) show.backdrop = backdrop;
  show.runtime = show.runtime || d.averageRuntime || d.runtime || null;
  show.providers = originsOf(d);
  show.lastSync = Date.now();
  save();
  const added = allEps(show).length - before;
  const dated = allEps(show).filter(e => e.airDate).length - beforeDates;
  if (!silent) toast(added > 0 ? `${plural(added, 'nouvel épisode ajouté', 'nouveaux épisodes ajoutés')}` : dated > 0 ? `${plural(dated, 'nouvelle date de sortie', 'nouvelles dates de sortie')}` : 'Série à jour.');
  return Math.max(0, added) + Math.max(0, dated);
}
let bgSyncRunning = false;
async function backgroundSync() {
  if (bgSyncRunning) return;
  bgSyncRunning = true;
  let changes = 0;
  const stale = state.shows.filter(s => s.tvmazeId && s.airStatus !== 'ended' && s.status !== 'dropped' && Date.now() - (s.lastSync || 0) > 12 * 3600e3);
  for (const s of stale) {
    try { changes += await refreshShow(s, { silent: true }); } catch (err) { if (err.code === 'NETWORK') break; }
    await new Promise(r => setTimeout(r, 600));
  }
  bgSyncRunning = false;
  if (changes) {
    if (!document.activeElement || !document.activeElement.matches('input, textarea, select')) render();
    toast(`Calendrier mis à jour : ${plural(changes, 'nouveauté', 'nouveautés')} pour vos séries.`, { type: 'info' });
  }
}

/* ---------- Ajout de série ---------- */
function openAdd(tab = 'search') {
  ui.add = { tab, q: '', results: [], loading: false, error: null, step: 'search' };
  ui.draft = null;
  if (tab === 'manual') startManual(); else renderAdd();
}
function renderAdd() {
  const a = ui.add;
  if (a.step === 'form') { renderForm(); return; }
  const tabs = `<div class="seg" role="tablist"><button role="tab" class="on" aria-selected="true">${icon('search', 'sm')}Rechercher</button><button role="tab" data-act="add-manual" aria-selected="false">${icon('edit', 'sm')}Ajout manuel</button></div>`;
  const body = a.step === 'loading'
    ? `<div class="loading-block"><div class="spinner"></div>Récupération des saisons, épisodes et plateformes…</div>`
    : `${tabs}<div class="search-box" style="margin-top:14px">${icon('search')}<label class="visually-hidden" for="addQuery">Nom de la série</label>
        <input id="addQuery" class="input" type="search" placeholder="Nom de la série (ex. Severance, Lupin, Arcane…)" value="${esc(a.q)}" data-input="add-q" autocomplete="off"></div>
       <div id="addResults" class="results"></div>`;
  openModal(`<div class="modal-inner"><div class="modal-head"><h2 class="modal-title">Ajouter une série</h2><button class="icon-btn" data-act="modal-close" aria-label="Fermer">${icon('x')}</button></div>
    <div class="modal-body">${body}</div></div>`, 'modal-lg');
  if (a.step === 'search') { renderAddResults(); setTimeout(() => $('#addQuery')?.focus(), 30); }
}
function renderAddResults() {
  const el = $('#addResults'); if (!el) return;
  const a = ui.add;
  if (a.error) {
    el.innerHTML = `<div class="notice warn">${icon('info')}<div><p>${esc(apiErrorText(a.error))}</p><div class="actions"><button class="btn sm" data-act="add-retry">Réessayer</button><button class="btn sm soft" data-act="add-manual">Ajouter manuellement</button></div></div></div>`;
    return;
  }
  if (a.loading && !a.results.length) { el.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>'; return; }
  if (a.q.trim().length < 2) { el.innerHTML = `<p class="help" style="padding:8px 4px">Tapez au moins 2 lettres. Titre français ou original, séries du monde entier.</p>`; return; }
  if (!a.results.length) {
    el.innerHTML = `<div class="notice">${icon('search')}<div><p>Aucune série trouvée pour « ${esc(a.q)} ». Vérifiez l'orthographe, essayez le titre original, ou ajoutez-la à la main.</p><div class="actions"><button class="btn sm soft" data-act="add-manual">Ajouter « ${esc(a.q)} » manuellement</button></div></div></div>`;
    return;
  }
  el.innerHTML = a.results.map(r => {
    const owned = state.shows.find(s => s.tvmazeId === r.id);
    const year = (r.premiered || '').slice(0, 4);
    const origin = originsOf(r).map(o => o.name).join(' · ');
    const fr = a.frTitles?.[r.id];
    const shown = fr || r.name;
    return `<button class="result ${owned ? 'owned' : ''}" data-act="add-pick" data-id="${r.id}">
      ${posterHTML({ title: shown, poster: r.image?.medium || '' })}
      <div style="min-width:0"><div class="result-title">${esc(shown)}${year ? `<small>${year}</small>` : ''}</div>
        ${[fr && norm(fr) !== norm(r.name) ? r.name : '', origin].filter(Boolean).length ? `<div class="muted" style="font-size:13px">${esc([fr && norm(fr) !== norm(r.name) ? r.name : '', origin].filter(Boolean).join(' · '))}</div>` : ''}
        <div class="result-ov">${esc(stripHtml(r.summary) || 'Pas de résumé.')}</div></div>
      ${owned ? `<span class="chip ok">${icon('check', 'sm')}Dans ma bibliothèque</span>` : `<span class="chip accent">${icon('plus', 'sm')}Choisir</span>`}
    </button>`;
  }).join('') + `<p class="help" style="text-align:center;margin-top:6px">Pas dans la liste ? <button class="link-btn" data-act="add-manual">Ajouter manuellement</button></p>`;
}
let searchTimer = 0, searchSeq = 0;
function onAddQuery(v) {
  ui.add.q = v; ui.add.error = null;
  clearTimeout(searchTimer);
  if (v.trim().length < 2) { ui.add.results = []; ui.add.loading = false; renderAddResults(); return; }
  ui.add.loading = true; renderAddResults();
  searchTimer = setTimeout(() => runSearch(v), 320);
}
/*
 * Wikidata relie les titres français (et autres langues) aux fiches TVmaze
 * (propriété P8600). Gratuit, sans clé ; en cas d'échec on l'ignore.
 */
const WIKIDATA = 'https://www.wikidata.org/w/api.php?format=json&origin=*&';
async function searchWikidata(q) {
  try {
    const s = await (await fetch(WIKIDATA + 'action=wbsearchentities&type=item&limit=8&language=fr&uselang=fr&search=' + encodeURIComponent(q))).json();
    const hits = s.search || [];
    if (!hits.length) return [];
    const e = await (await fetch(WIKIDATA + 'action=wbgetentities&props=claims&ids=' + hits.map(h => h.id).join('|'))).json();
    return hits.map(h => ({
      tvmazeId: +(e.entities?.[h.id]?.claims?.P8600?.[0]?.mainsnak?.datavalue?.value || 0),
      frTitle: h.match?.language === 'fr' || h.match?.language === 'mul' ? h.match.text : h.label,
    })).filter(h => h.tvmazeId);
  } catch { return []; }
}
async function runSearch(v) {
  const seq = ++searchSeq;
  const q = v.trim();
  try {
    const [r, wd] = await Promise.all([api('/search/shows?q=' + encodeURIComponent(q)), searchWikidata(q)]);
    if (seq !== searchSeq || !ui.add) return;
    const shows = (r || []).map(x => x.show).filter(Boolean);
    const known = new Set(shows.map(x => x.id));
    const extra = await Promise.all(wd.filter(h => !known.has(h.tvmazeId)).slice(0, 5).map(h => api('/shows/' + h.tvmazeId).catch(() => null)));
    if (seq !== searchSeq || !ui.add) return;
    ui.add.frTitles = Object.fromEntries(wd.map(h => [h.tvmazeId, h.frTitle]));
    const nq = norm(q);
    const rank = x => (norm(x.name) === nq || norm(ui.add.frTitles[x.id]) === nq ? 2 : ui.add.frTitles[x.id] ? 1 : 0);
    const seen = new Set();
    ui.add.results = [...shows, ...extra.filter(Boolean)]
      .filter(x => !seen.has(x.id) && seen.add(x.id))
      .map((x, i) => ({ x, i })).sort((a, b) => rank(b.x) - rank(a.x) || a.i - b.i).map(o => o.x).slice(0, 12);
    ui.add.error = null;
  } catch (err) {
    if (seq !== searchSeq || !ui.add) return;
    ui.add.error = err;
  }
  ui.add.loading = false;
  renderAddResults();
}
async function pickFromCatalog(id) {
  const existing = state.shows.find(s => s.tvmazeId === id);
  if (existing) { closeModal(); location.hash = '#/show/' + existing.id; toast('Cette série est déjà dans votre bibliothèque.', { type: 'info' }); return; }
  ui.add.step = 'loading'; renderAdd();
  try {
    const data = await fetchFullShow(id);
    if (!ui.add) return;
    ui.draft = draftFromCatalog(data, ui.add.frTitles?.[id]);
    ui.add.step = 'form'; renderAdd();
  } catch (err) {
    if (!ui.add) return;
    ui.add.step = 'search'; ui.add.error = err; renderAdd();
  }
}
function startManual() {
  if (!ui.add) ui.add = { tab: 'manual', q: '', results: [], step: 'form' };
  ui.add.step = 'form';
  ui.draft = {
    mode: 'new', source: 'manual', title: ui.add.q || '', originalTitle: '', poster: '', backdrop: '', overview: '', genres: [], year: '',
    airStatus: 'airing', status: 'planned', platforms: [], providers: null, rating: 0, notes: '', airTime: '', runtime: null,
    manualSeasons: [{ count: 10 }], seen: { season: 0, episode: 0 },
  };
  renderForm();
}
function openEditShow(show) {
  ui.add = { step: 'form' };
  ui.draft = {
    mode: 'edit', showId: show.id, source: show.tvmazeId ? 'tvmaze' : 'manual', tvmazeId: show.tvmazeId,
    title: show.title, originalTitle: show.originalTitle, poster: show.poster, backdrop: show.backdrop, overview: show.overview,
    genres: [...show.genres], year: show.year, airStatus: show.airStatus, status: show.status,
    platforms: show.platforms.map(x => ({ ...x })), providers: show.providers || null,
    rating: show.rating || 0, notes: show.notes || '', airTime: show.airTime || '', runtime: show.runtime || null,
  };
  renderForm();
}

function renderForm() {
  const dr = ui.draft;
  const isNew = dr.mode === 'new';
  const opt = (v, l, cur) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`;
  const nEps = dr.seasons ? dr.seasons.reduce((a, s) => a + s.episodes.length, 0) : 0;
  const nUp = dr.seasons ? dr.seasons.flatMap(s => s.episodes).filter(e => !e.airDate || parseDay(e.airDate) > new Date()).length : 0;
  const posterUrl = /^https?:/.test(dr.poster || '') ? dr.poster : '';
  const html = `<div class="modal-inner">
    <div class="modal-head">
      ${isNew && dr.source === 'tvmaze' ? `<button class="icon-btn" data-act="add-back" aria-label="Retour aux résultats">${icon('back')}</button>` : ''}
      <h2 class="modal-title">${isNew ? (dr.source === 'tvmaze' ? 'Vérifier et ajouter' : 'Ajout manuel') : 'Modifier la série'}</h2>
      <button class="icon-btn" data-act="modal-close" aria-label="Fermer">${icon('x')}</button></div>
    <form id="showForm" novalidate style="display:contents">
    <div class="modal-body">
      ${isNew && dr.source === 'manual' && !ui.add.fromSearch ? `<div class="seg" role="tablist" style="margin-bottom:18px"><button type="button" role="tab" data-act="add-search-tab" aria-selected="false">${icon('search', 'sm')}Rechercher</button><button type="button" role="tab" class="on" aria-selected="true">${icon('edit', 'sm')}Ajout manuel</button></div>` : ''}
      <div class="form-grid">
        <div class="form-poster">${posterHTML({ title: dr.title || 'Nouvelle série', poster: dr.poster }, 'w342')}
          ${dr.source === 'tvmaze' ? `<p class="help">Informations récupérées du catalogue TVmaze. Vous pouvez les corriger${dr.overview ? ', par exemple traduire le résumé (souvent en anglais)' : ''}.</p>` : ''}</div>
        <div class="form-fields">
          <div class="field"><label for="fTitle">Titre</label><input id="fTitle" name="title" class="input" required value="${esc(dr.title)}" data-input="draft-title" autocomplete="off">
            <p class="dup-warn" id="dupWarn" ${dupOf(dr) ? '' : 'hidden'}>${icon('info', 'sm')}Une série du même nom est déjà dans votre bibliothèque.</p></div>
          <div class="row-3">
            <div class="field"><label for="fYear">Année</label><input id="fYear" name="year" class="input" inputmode="numeric" maxlength="4" placeholder="2024" value="${esc(dr.year)}"></div>
            <div class="field" style="grid-column:span 2"><label for="fAir">Diffusion</label><select id="fAir" name="airStatus" class="select">${opt('airing', 'En cours de diffusion', dr.airStatus)}${opt('ended', 'Terminée', dr.airStatus)}${opt('unknown', 'Inconnue', dr.airStatus)}</select></div>
          </div>
          <div class="field"><label for="fGenres">Genres</label><input id="fGenres" name="genres" class="input" placeholder="Drame, Science-fiction" value="${esc(dr.genres.join(', '))}"><p class="help">Séparés par des virgules.</p></div>
          <div class="field"><label for="fOverview">Synopsis</label><textarea id="fOverview" name="overview" class="textarea">${esc(dr.overview)}</textarea></div>
          ${dr.source === 'manual' || !isNew ? `<div class="field"><label for="fPoster">Affiche (URL d'image)</label><input id="fPoster" name="poster" class="input" type="url" placeholder="${dr.poster && !posterUrl ? 'Affiche actuelle conservée' : 'https://…'}" value="${esc(posterUrl)}"></div>` : ''}

          <div class="form-section"><span class="label">Ma liste</span>
            <div class="cat-pick">${CATEGORIES.map(c => `<label style="--c:${c.color}"><input type="radio" name="status" value="${c.id}" ${dr.status === c.id ? 'checked' : ''}><span>${c.label}</span></label>`).join('')}</div></div>

          <div class="form-section" id="pfSection">${pfSectionHTML(dr)}</div>

          ${isNew && dr.source === 'manual' ? `<div class="form-section" id="sbSection">${seasonBuilderHTML(dr)}</div>` : ''}
          ${isNew && dr.source === 'tvmaze' ? `<div class="form-section"><span class="label">Épisodes</span>
            <p class="help" style="font-size:14px">${dr.seasons.length ? `${plural(dr.seasons.length, 'saison', 'saisons')} · ${plural(nEps, 'épisode', 'épisodes')} récupérés${nUp ? ` (dont ${nUp} à venir ou sans date)` : ''}.` : "Aucun épisode n'est encore annoncé pour cette série."}</p></div>` : ''}
          ${isNew && (dr.source === 'tvmaze' ? dr.seasons.length : true) ? `<div class="form-section" id="seenSection">${seenHTML(dr)}</div>` : ''}

          <div class="form-section">
            <div class="row">
              <div class="field"><label for="fTime">Heure de diffusion habituelle</label><input id="fTime" name="airTime" type="time" class="input" value="${esc(dr.airTime)}"><p class="help">Facultatif, pour un compte à rebours précis.</p></div>
              <div class="field"><label for="fRuntime">Durée d'un épisode (min)</label><input id="fRuntime" name="runtime" type="number" min="1" max="600" class="input" value="${esc(dr.runtime || '')}"></div>
            </div>
            <div class="field"><span class="label">Ma note</span><div class="stars" id="draftStars">${draftStarsHTML(dr)}</div></div>
            <div class="field"><label for="fNotes">Notes personnelles</label><textarea id="fNotes" name="notes" class="textarea" placeholder="Facultatif">${esc(dr.notes)}</textarea></div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-foot"><button type="button" class="btn ghost" data-act="modal-close">Annuler</button>
      <button type="submit" class="btn primary">${icon('check')}${isNew ? 'Ajouter à ma bibliothèque' : 'Enregistrer les modifications'}</button></div>
    </form></div>`;
  openModal(html, 'modal-lg');
  if (dr.source === 'manual' && isNew) setTimeout(() => $('#fTitle')?.focus(), 30);
}
function dupOf(dr) {
  const t = norm(dr.title);
  if (!t) return null;
  return state.shows.find(s => s.id !== dr.showId && (dr.tvmazeId ? s.tvmazeId === dr.tvmazeId : norm(s.title) === t));
}
function draftStarsHTML(dr) {
  return [1, 2, 3, 4, 5].map(n => `<button type="button" class="star ${dr.rating >= n ? 'on' : ''}" data-act="draft-star" data-n="${n}" aria-label="Noter ${n} sur 5" aria-pressed="${dr.rating >= n}">${icon('star', 'fill')}</button>`).join('');
}
function pfSectionHTML(dr) {
  const sel = new Map(dr.platforms.map(x => [x.pid, x]));
  let detected = '';
  if (dr.providers && dr.providers.length) {
    const name = (o, i) => {
      const pl = platformForName(o.name);
      const where = o.country ? ` (${esc(regionName(o.country))})` : o.kind === 'web' ? ' (international)' : '';
      return `<b>${esc(o.name)}</b>${where}${pl ? '' : ` <button type="button" class="link-btn" data-act="form-pf-origin" data-i="${i}">+ ajouter comme plateforme</button>`}`;
    };
    detected = `<div class="notice">${icon('globe')}<div><p>Diffusion d'origine : ${dr.providers.map(name).join(', ')}.</p>
      <p class="help" style="margin-top:6px">La disponibilité peut varier selon le pays. Ajoutez une autre plateforme seulement si vous savez qu'elle propose la série chez vous.</p></div></div>`;
  } else if (dr.source === 'tvmaze') {
    detected = `<p class="help">Plateforme d'origine inconnue. Indiquez-la seulement si vous la connaissez.</p>`;
  }
  const regionOpts = cur => [['', 'Toutes régions'], ...REGIONS].map(([c, n]) => `<option value="${c}" ${c === cur ? 'selected' : ''}>${esc(n)}</option>`).join('');
  return `<span class="label">Plateformes</span>${detected}
    <div class="pf-chips">${state.platforms.map(p => `<button type="button" class="pf-chip ${sel.has(p.id) ? 'on' : ''}" data-act="form-pf" data-pid="${p.id}" aria-pressed="${sel.has(p.id)}">${pfBadge(p)}${esc(p.name)}</button>`).join('')}</div>
    ${dr.platforms.length ? `<div class="pf-selected">${dr.platforms.map(x => { const p = getPlatform(x.pid); if (!p) return ''; return `<div class="pf-sel-row">${pfBadge(p)}<span class="name">${esc(p.name)} ${x.source === 'tvmaze' ? '<span class="chip ok" style="height:22px;font-size:11.5px">Plateforme d\'origine</span>' : ''}</span>
        <label class="visually-hidden" for="rg-${p.id}">Région pour ${esc(p.name)}</label><select id="rg-${p.id}" class="select sm" data-change="form-pf-region" data-pid="${p.id}">${regionOpts(x.region)}</select></div>`; }).join('')}</div>` : ''}
    <p class="help">Une autre plateforme ? Ajoutez-la dans Réglages › Plateformes.</p>`;
}
function seasonBuilderHTML(dr) {
  return `<span class="label">Saisons et épisodes</span>
    <div class="season-builder">${dr.manualSeasons.map((s, i) => `<div class="sb-row"><span class="label">Saison ${i + 1}</span>
      <label class="visually-hidden" for="sb${i}">Nombre d'épisodes de la saison ${i + 1}</label>
      <input id="sb${i}" class="input sm" type="number" min="0" max="500" value="${s.count}" data-input="sb-count" data-i="${i}"><span class="muted" style="font-size:13px">épisodes</span>
      ${dr.manualSeasons.length > 1 ? `<button type="button" class="icon-btn sm" data-act="sb-remove" data-i="${i}" aria-label="Retirer la saison ${i + 1}">${icon('x')}</button>` : ''}</div>`).join('')}
    </div><div><button type="button" class="btn sm ghost" data-act="sb-add">${icon('plus', 'sm')}Ajouter une saison</button></div>
    <p class="help">Les titres et dates des épisodes se complètent ensuite depuis la fiche de la série.</p>`;
}
function draftSeasonCounts(dr) {
  return dr.source === 'tvmaze' ? dr.seasons.map(s => ({ n: s.number, c: s.episodes.length })) : dr.manualSeasons.map((s, i) => ({ n: i + 1, c: +s.count || 0 }));
}
function seenHTML(dr) {
  const seasons = draftSeasonCounts(dr).filter(s => s.c > 0);
  const cur = seasons.find(s => s.n === dr.seen.season);
  return `<span class="label">Déjà regardé jusqu'à…</span>
    <div class="row"><div class="field"><label class="visually-hidden" for="seenS">Saison</label><select id="seenS" class="select" data-change="seen-season"><option value="0">Rien regardé</option>${seasons.map(s => `<option value="${s.n}" ${s.n === dr.seen.season ? 'selected' : ''}>Saison ${s.n}</option>`).join('')}</select></div>
    ${cur ? `<div class="field"><label class="visually-hidden" for="seenE">Épisode</label><select id="seenE" class="select" data-change="seen-episode">${Array.from({ length: cur.c }, (_, i) => `<option value="${i + 1}" ${i + 1 === dr.seen.episode ? 'selected' : ''}>Épisode ${i + 1}${i + 1 === cur.c ? ' (fin de saison)' : ''}</option>`).join('')}</select></div>` : ''}</div>
    <p class="help">Les épisodes jusqu'à celui-ci seront cochés (hors épisodes pas encore sortis).</p>`;
}
function submitShowForm(form) {
  const dr = ui.draft; if (!dr) return;
  const fd = new FormData(form);
  const title = String(fd.get('title') || '').trim();
  if (!title) { const t = $('#fTitle'); t.focus(); t.setCustomValidity('Indiquez le titre de la série.'); t.reportValidity(); return; }
  if (dr.mode === 'new' && dr.tvmazeId && state.shows.some(s => s.tvmazeId === dr.tvmazeId)) { toast('Cette série est déjà dans votre bibliothèque.', { type: 'info' }); return; }
  const posterInput = String(fd.get('poster') || '').trim();
  const data = {
    title,
    year: String(fd.get('year') || '').trim(),
    genres: String(fd.get('genres') || '').split(',').map(s => s.trim()).filter(Boolean),
    overview: String(fd.get('overview') || '').trim(),
    airStatus: fd.get('airStatus') || 'unknown',
    status: fd.get('status') || 'planned',
    airTime: fd.get('airTime') || '',
    runtime: +fd.get('runtime') || null,
    notes: String(fd.get('notes') || '').trim(),
    poster: posterInput || (/^https?:/.test(dr.poster || '') ? '' : dr.poster) || '',
    rating: dr.rating || 0,
    platforms: dr.platforms.filter(x => getPlatform(x.pid)),
  };
  if (dr.mode === 'edit') {
    const s = getShow(dr.showId); if (!s) return;
    Object.assign(s, data, { updatedAt: Date.now() });
    save(); closeModal(); render(); toast('Modifications enregistrées.');
    return;
  }
  const seasons = dr.source === 'tvmaze' ? dr.seasons : dr.manualSeasons.map((s, i) => ({
    number: i + 1,
    episodes: Array.from({ length: Math.max(0, Math.min(500, +s.count || 0)) }, (_, k) => ({ season: i + 1, number: k + 1, title: '', airDate: null, runtime: null, watched: false })),
  })).filter(s => s.episodes.length);
  const show = normShow({
    id: uid(), tvmazeId: dr.tvmazeId || null, originalTitle: dr.originalTitle || '', backdrop: dr.backdrop || '',
    providers: dr.providers || null, ...data, seasons,
    addedAt: Date.now(), updatedAt: Date.now(), lastSync: dr.source === 'tvmaze' ? Date.now() : null,
  });
  if (dr.seen.season) {
    const states = computeStates(show);
    for (const e of allEps(show)) {
      const before = e.season < dr.seen.season || (e.season === dr.seen.season && e.number <= dr.seen.episode);
      if (before && states.get(e) !== 'upcoming') { e.watched = true; e.watchedAt = Date.now(); e.bulk = true; }
    }
    show.lastWatchedAt = Date.now();
    if (show.status === 'planned' && allEps(show).some(e => e.watched)) show.status = 'watching';
  }
  state.shows.unshift(show);
  save(); closeModal();
  location.hash = '#/show/' + show.id;
  render();
  toast(`« ${title} » ajoutée à « ${CAT[show.status].label} ».`);
}

/* ---------- Édition d'épisode ---------- */
function openEpisodeEditor(show, key, isNewSeason) {
  const e = key ? findEp(show, key) : null;
  const seasonNum = e ? e.season : isNewSeason;
  const html = `<div class="modal-inner"><div class="modal-head"><h2 class="modal-title">${e ? `Modifier ${epCode(e)}` : `Nouvel épisode · saison ${seasonNum}`}</h2><button class="icon-btn" data-act="modal-close" aria-label="Fermer">${icon('x')}</button></div>
    <form id="epForm" data-show="${show.id}" data-key="${key || ''}" data-season="${seasonNum}" style="display:contents">
    <div class="modal-body"><div class="form-fields">
      <div class="field"><label for="eTitle">Titre</label><input id="eTitle" name="title" class="input" value="${esc(e?.title || '')}" placeholder="Titre non communiqué"></div>
      <div class="row"><div class="field"><label for="eDate">Date de diffusion</label><input id="eDate" name="airDate" type="date" class="input" value="${esc(e?.airDate || '')}"><p class="help">Vide = « Date à confirmer ».</p></div>
        <div class="field"><label for="eTime">Heure</label><input id="eTime" name="airTime" type="time" class="input" value="${esc(e?.airTime || '')}"><p class="help">Vide = heure de la série${show.airTime ? ` (${esc(show.airTime)})` : ''}.</p></div></div>
      <div class="field"><label for="eRuntime">Durée (minutes)</label><input id="eRuntime" name="runtime" type="number" min="1" max="600" class="input" value="${esc(e?.runtime || '')}"></div>
      ${show.tvmazeId && e ? `<p class="help">Vos modifications seront conservées lors des mises à jour du catalogue.</p>` : ''}
    </div></div>
    <div class="modal-foot">${e && (!show.tvmazeId || e.added) ? `<button type="button" class="btn danger-ghost" data-act="ep-delete" data-show="${show.id}" data-key="${key}" style="margin-right:auto">${icon('trash', 'sm')}Supprimer</button>` : ''}
      <button type="button" class="btn ghost" data-act="modal-close">Annuler</button><button type="submit" class="btn primary">${e ? 'Enregistrer' : "Ajouter l'épisode"}</button></div>
    </form></div>`;
  openModal(html);
}
function submitEpisodeForm(form) {
  const show = getShow(form.dataset.show); if (!show) return;
  const fd = new FormData(form);
  const vals = { title: String(fd.get('title') || '').trim(), airDate: fd.get('airDate') || null, airTime: fd.get('airTime') || '', runtime: +fd.get('runtime') || null };
  if (form.dataset.key) {
    const e = findEp(show, form.dataset.key);
    Object.assign(e, vals, { custom: true });
  } else {
    const num = +form.dataset.season;
    const se = show.seasons.find(s => s.number === num);
    const n = se.episodes.reduce((m, e) => Math.max(m, e.number), 0) + 1;
    se.episodes.push({ season: num, number: n, ...vals, watched: false, custom: true, added: true });
  }
  save(); closeModal(); render(); toast('Épisode enregistré.');
}

/* ---------- Rappels & agenda ---------- */
function notify(title, body, tag) {
  try { new Notification(title, { body, tag, icon: $('link[rel=icon]').href }); } catch { /* ignoré */ }
}
function checkNotifications() {
  if (!state.settings.notifications || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const { upcoming, fresh } = collectReleases(now);
  let changed = false;
  for (const { show, e, r, timed } of [...upcoming, ...fresh]) {
    const k = `${show.id}:${epKey(e)}`;
    const label = `${show.title} · ${epCode(e)}`;
    if (r > now && dayDiff(r, now) <= 1 && !state.notified[k + ':soon']) {
      notify(`Bientôt : ${label}`, `Sortie ${relDayLabel(r)?.toLowerCase() || fmtDate(r)}${timed ? ' à ' + FMT.time.format(r) : ''}${e.title ? ' — ' + e.title : ''}`, k + ':soon');
      state.notified[k + ':soon'] = Date.now(); changed = true;
    }
    if (r <= now && now - r < DAY && !state.notified[k + ':out']) {
      notify('Nouvel épisode disponible', label + (e.title ? ' — ' + e.title : ''), k + ':out');
      state.notified[k + ':out'] = Date.now(); changed = true;
    }
  }
  for (const [k, t] of Object.entries(state.notified)) if (Date.now() - t > 30 * DAY) { delete state.notified[k]; changed = true; }
  if (changed) save();
}
async function toggleNotifications() {
  if (!('Notification' in window)) { toast('Votre navigateur ne gère pas les notifications. Utilisez l\'export agenda (.ics).', { type: 'error' }); return; }
  if (state.settings.notifications && Notification.permission === 'granted') {
    state.settings.notifications = false; save(); render(); toast('Rappels désactivés.'); return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast('Notifications refusées par le navigateur. Vous pouvez les autoriser dans les paramètres du site.', { type: 'error', timeout: 8000 }); return; }
  // ne pas notifier rétroactivement tout ce qui est déjà sorti
  const { fresh } = collectReleases();
  for (const { show, e } of fresh) state.notified[`${show.id}:${epKey(e)}:out`] = Date.now();
  state.settings.notifications = true; save(); render();
  toast("Rappels activés : vous serez prévenu la veille et le jour de chaque sortie, tant que Saison est ouvert.", { timeout: 7000 });
  checkNotifications();
}
function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }
function icsDate(d, withTime) {
  const s = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  return withTime ? `${s}T${pad(d.getHours())}${pad(d.getMinutes())}00` : s;
}
function exportICS() {
  const { upcoming } = collectReleases();
  if (!upcoming.length) { toast('Aucune sortie datée à exporter.', { type: 'info' }); return; }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Saison//Suivi de series//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Saison — sorties'];
  for (const { show, e, r, timed } of upcoming) {
    const pfs = showPlatforms(show).map(x => x.p.name).join(', ');
    lines.push('BEGIN:VEVENT', `UID:${show.id}-${epKey(e)}@saison`, `DTSTAMP:${stamp}`);
    if (timed) {
      const end = new Date(r.getTime() + (e.runtime || show.runtime || 45) * 6e4);
      lines.push(`DTSTART:${icsDate(r, true)}`, `DTEND:${icsDate(end, true)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(r)}`, `DTEND;VALUE=DATE:${icsDate(new Date(r.getTime() + DAY + 3600e3))}`);
    }
    lines.push(`SUMMARY:${icsEscape(`${show.title} · S${pad(e.season)}E${pad(e.number)}${e.title ? ' — ' + e.title : ''}`)}`);
    if (pfs) lines.push(`DESCRIPTION:${icsEscape('Disponible sur ' + pfs)}`);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(show.title + ' sort aujourd\'hui')}`, timed ? 'TRIGGER:-PT30M' : 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  download('saison-sorties.ics', lines.join('\r\n'), 'text/calendar');
  toast(`${plural(upcoming.length, 'sortie exportée', 'sorties exportées')}. Ouvrez le fichier pour l'ajouter à votre agenda.`);
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Installation sur le téléphone ---------- */
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let installEvent = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; if (ui.route.name === 'settings') render(); });
window.addEventListener('appinstalled', () => { installEvent = null; toast('Saison est installée sur votre écran d\'accueil.'); render(); });
function installPanelHTML() {
  let body;
  if (isStandalone()) body = `<p class="status-line ok">${icon('check', 'sm')}Saison est installée sur cet appareil.</p>`;
  else if (installEvent) body = `<div class="set-row"><div><div class="label">Ajouter à l'écran d'accueil</div><p>Saison s'ouvre alors comme une vraie app, en plein écran, même avec une connexion faible.</p></div><button class="btn primary" data-act="install">${icon('download')}Installer</button></div>`;
  else if (isIOS()) body = `<p class="help" style="font-size:15px">Pour l'avoir comme une vraie app sur votre iPhone :</p>
      <ol class="install-steps"><li>Ouvrez ce site dans <b>Safari</b>.</li><li>Touchez le bouton <b>Partager</b> (le carré avec une flèche vers le haut).</li><li>Choisissez <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b>.</li></ol>`;
  else body = `<p class="help" style="font-size:15px">Sur votre téléphone, ouvrez ce site puis choisissez <b>Ajouter à l'écran d'accueil</b> (ou <b>Installer l'application</b>) dans le menu du navigateur.</p>`;
  return `<section class="panel"><div class="panel-title">Installer sur le téléphone</div>${body}</section>`;
}

function accountPanelHTML() {
  if (account) {
    return `<section class="panel account"><div class="account-row">${avatarHTML('lg')}<div class="account-id"><b>${esc(state.profile?.name || account.name || 'Mon compte')}</b><span>${esc(account.email)}</span></div></div>
      <div class="set-row"><div><div class="label">Synchronisation</div><p>Vos séries sont enregistrées dans votre compte et sur cet appareil.</p></div>${syncBadge()}</div>
      <div class="set-row"><div><div class="label">Changer d'appareil</div><p>Connectez-vous avec le même compte : tout est déjà là.</p></div><button class="btn" data-act="sign-out">Se déconnecter</button></div></section>`;
  }
  if (CLOUD_ON) {
    return `<section class="panel account"><div class="panel-title">Mon compte</div>
      <div class="set-row"><div><div class="label">Vous utilisez Saison sans compte</div><p>Créez un compte pour retrouver vos séries sur tous vos appareils. Ce qui est déjà ici sera conservé.</p></div><button class="btn primary" data-act="auth-open">Créer un compte</button></div></section>`;
  }
  return '';
}
function tastePanelHTML() {
  const p = state.profile || {};
  const chips = (p.genres || []).map(g => `<span class="chip">${esc((TASTE_GENRES.find(t => t[0] === g) || [, ''])[1])} ${esc(genreFr(g))}</span>`).join('');
  return `<section class="panel"><div class="panel-title">Mes goûts</div>
    ${p.done && !p.skipped ? `<div class="taste"><span class="ob-badge sm">${esc(personaOf(p))}</span><div class="taste-chips">${chips}</div></div>` : '<p class="help" style="font-size:15px">Répondez à quelques questions pour recevoir des recommandations sur mesure.</p>'}
    <p class="label" style="margin:18px 0 8px">Ne jamais me proposer</p>
    <div class="no-chips">${TASTE_GENRES.map(([g, e]) => `<button class="no-chip ${(p.dislikes || []).includes(g) ? 'off' : ''}" data-act="taste-dislike" data-v="${esc(g)}" aria-pressed="${(p.dislikes || []).includes(g)}">${e} ${esc(genreFr(g))}</button>`).join('')}</div>
    <p class="help" style="margin-top:8px">Touchez un genre pour qu'il n'apparaisse plus dans Découvrir.</p>
    <div style="margin-top:14px"><button class="btn" data-act="ob-start">${icon('sparkle')}${p.done && !p.skipped ? 'Refaire le questionnaire' : 'Répondre au questionnaire'}</button></div></section>`;
}

/* ---------- Vue : Réglages ---------- */
function viewSettings() {
  const S = state.settings;
  const used = id => state.shows.filter(s => s.platforms.some(x => x.pid === id)).length;
  return `<header class="page-head"><div><h1 class="page-title">Réglages</h1><p class="page-sub">Vos données restent dans ce navigateur.</p></div></header>
  <div class="settings">
    ${accountPanelHTML()}
    ${tastePanelHTML()}
    ${isStandalone() ? '' : installPanelHTML()}
    <section class="panel"><div class="panel-title">Catalogue de séries</div>
      <p class="status-line ok">${icon('check', 'sm')}Connecté au catalogue TVmaze : aucune clé ni compte nécessaire.</p>
      <p class="help" style="font-size:14px;margin-top:8px">Plus de 80 000 séries du monde entier, avec affiches, saisons, épisodes, dates et heures de diffusion. Les résumés sont souvent en anglais : vous pouvez les modifier sur chaque fiche.</p>
      <div class="set-row" style="margin-top:8px"><div><div class="label">Pays / région</div><p>Région proposée par défaut quand vous associez une plateforme à une série.</p></div>
        <select class="select" data-change="set-region">${REGIONS.map(([c, n]) => `<option value="${c}" ${c === S.region ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
      ${state.shows.some(s => s.tvmazeId) ? `<div class="set-row"><div><div class="label">Mettre à jour toutes les séries</div><p>Nouveaux épisodes et dates. Fait automatiquement toutes les 12 h pour les séries en diffusion.</p></div><button class="btn" data-act="sync-all">${icon('refresh')}Actualiser</button></div>` : ''}
    </section>

    <section class="panel"><div class="panel-title">Apparence et rappels</div>
      <div class="set-row"><div><div class="label">Thème</div></div>
        <div class="seg">${[['dark', 'Sombre'], ['light', 'Clair'], ['system', 'Système']].map(([v, l]) => `<button class="${S.theme === v ? 'on' : ''}" data-act="set-theme" data-theme="${v}">${l}</button>`).join('')}</div></div>
      <div class="set-row"><div><div class="label">Rappels de sortie</div><p>Notification la veille et le jour de la sortie, lorsque l'application est ouverte. Pour des rappels permanents, exportez vers votre agenda.</p></div>
        ${'Notification' in window ? `<label class="switch"><input type="checkbox" data-act="notif-toggle" aria-label="Rappels de sortie" ${S.notifications && Notification.permission === 'granted' ? 'checked' : ''}><span></span></label>` : '<span class="muted">Non pris en charge</span>'}</div>
      <div class="set-row"><div><div class="label">Agenda</div><p>Fichier .ics compatible Google Agenda, Outlook, Apple Calendrier.</p></div><button class="btn" data-act="ics-export">${icon('download')}Exporter les sorties</button></div>
    </section>

    <section class="panel"><div class="panel-title">Plateformes</div>
      <div class="pf-manage">${state.platforms.map(p => `<div class="pf-manage-row">${pfBadge(p, 'lg')}<span class="name">${esc(p.name)} <small>· ${plural(used(p.id), 'série', 'séries')}</small></span>
        ${p.custom || !DEFAULT_PLATFORMS.some(d => d.id === p.id) ? `<button class="icon-btn sm" data-act="pf-delete" data-pid="${p.id}" aria-label="Supprimer ${esc(p.name)}" title="Supprimer">${icon('trash')}</button>` : ''}</div>`).join('')}</div>
      ${(() => {
        const sugg = SUGGESTED_PLATFORMS.filter(([n, d]) => !state.platforms.some(p => norm(p.name) === norm(n) || p.domain === d));
        return sugg.length ? `<p class="label" style="margin:18px 0 8px">Ajouter en un clic</p><div class="pf-suggest">${sugg.map(([n, d, c], i) => `<button class="pf-chip" data-act="pf-suggest" data-i="${SUGGESTED_PLATFORMS.findIndex(x => x[0] === n)}">${pfBadge({ name: n, domain: d, color: c, mark: n.slice(0, 2) })}${esc(n)}</button>`).join('')}</div>` : '';
      })()}
      <form id="pfForm" class="pf-add" style="margin-top:18px">
        <div class="field"><label for="pfName">Autre plateforme</label><input id="pfName" name="name" class="input" placeholder="ex. Proximus Pickx" required maxlength="40"></div>
        <div class="field"><label for="pfSite">Site web</label><input id="pfSite" name="site" class="input" inputmode="url" autocapitalize="off" placeholder="pickx.be"></div>
        <button class="btn" type="submit">${icon('plus')}Ajouter</button>
      </form>
      <p class="help" style="margin-top:8px">Le logo est récupéré automatiquement à partir du site web.</p>
    </section>

    <section class="panel"><div class="panel-title">Données</div>
      <div class="set-row"><div><div class="label">Sauvegarder</div><p>Exporte toute votre bibliothèque (JSON).</p></div><button class="btn" data-act="data-export">${icon('download')}Exporter</button></div>
      <div class="set-row"><div><div class="label">Restaurer</div><p>Remplace la bibliothèque actuelle par un fichier exporté.</p></div><button class="btn" data-act="data-import">${icon('upload')}Importer</button></div>
      <div class="set-row"><div><div class="label">Tout effacer</div><p>Supprime définitivement toutes les séries de ce navigateur.</p></div><button class="btn danger-ghost" data-act="data-reset">${icon('trash')}Effacer</button></div>
    </section>
    <div class="version-row"><span class="help">Saison · version ${APP_VERSION}</span><button class="btn sm" data-act="check-update">${icon('refresh', 'sm')}Rechercher une mise à jour</button></div>
    <p class="help">Données des séries fournies par TVmaze (tvmaze.com), sous licence CC BY-SA.</p>
  </div>`;
}

/* ---------- Thème ---------- */
const mq = window.matchMedia('(prefers-color-scheme: light)');
function applyTheme() {
  const t = state.settings.theme === 'system' ? (mq.matches ? 'light' : 'dark') : state.settings.theme;
  document.documentElement.dataset.theme = t;
  $('meta[name=theme-color]').content = t === 'light' ? '#f6f6f9' : '#15141d';
}
mq.addEventListener?.('change', () => { if (state.settings.theme === 'system') { applyTheme(); renderNav(); } });

/* ---------- Actions (délégation) ---------- */
const ACTIONS = {
  'add-open': el => openAdd(el.dataset.tab || 'search'),
  'add-manual': () => { if (ui.add) ui.add.fromSearch = false; startManual(); },
  'add-search-tab': () => { ui.add.step = 'search'; ui.draft = null; renderAdd(); },
  'add-pick': el => pickFromCatalog(+el.dataset.id),
  'add-back': () => { ui.add.step = 'search'; ui.draft = null; renderAdd(); },
  'add-retry': () => { ui.add.error = null; onAddQuery(ui.add.q); },
  'modal-close': () => closeModal(),
  'draft-star': el => { const n = +el.dataset.n; ui.draft.rating = ui.draft.rating === n ? 0 : n; $('#draftStars').innerHTML = draftStarsHTML(ui.draft); },
  'form-pf': el => {
    const dr = ui.draft, pid = el.dataset.pid;
    const i = dr.platforms.findIndex(x => x.pid === pid);
    if (i >= 0) dr.platforms.splice(i, 1);
    else {
      const p = getPlatform(pid);
      const origin = (dr.providers || []).find(o => platformForName(o.name) === p);
      dr.platforms.push(origin ? { pid, region: origin.country, source: 'tvmaze' } : { pid, region: state.settings.region, source: 'manual' });
    }
    $('#pfSection').innerHTML = pfSectionHTML(dr);
  },
  'form-pf-origin': el => {
    const o = (ui.draft.providers || [])[+el.dataset.i]; if (!o) return;
    let p = platformForName(o.name);
    if (!p) {
      p = { id: 'c-' + uid(), name: o.name, color: `hsl(${hueOf(o.name)} 45% 35%)`, fg: '#fff', mark: o.name.replace(/[^\p{L}\p{N}+]/gu, '').slice(0, 3), domain: o.domain || '', custom: true };
      state.platforms.push(p); save();
    }
    if (!ui.draft.platforms.some(x => x.pid === p.id)) ui.draft.platforms.push({ pid: p.id, region: o.country, source: 'tvmaze' });
    $('#pfSection').innerHTML = pfSectionHTML(ui.draft);
  },
  'sb-add': () => { ui.draft.manualSeasons.push({ count: ui.draft.manualSeasons.at(-1)?.count || 10 }); $('#sbSection').innerHTML = seasonBuilderHTML(ui.draft); $('#seenSection').innerHTML = seenHTML(ui.draft); },
  'sb-remove': el => { ui.draft.manualSeasons.splice(+el.dataset.i, 1); if (ui.draft.seen.season > ui.draft.manualSeasons.length) ui.draft.seen = { season: 0, episode: 0 }; $('#sbSection').innerHTML = seasonBuilderHTML(ui.draft); $('#seenSection').innerHTML = seenHTML(ui.draft); },

  'pf-suggest': el => {
    const [name, domain, color] = SUGGESTED_PLATFORMS[+el.dataset.i] || [];
    if (!name || state.platforms.some(p => p.domain === domain)) return;
    state.platforms.push({ id: 'c-' + uid(), name, color, fg: '#fff', mark: name.slice(0, 2), domain, custom: true });
    save(); render(); toast(`${name} ajoutée.`);
  },
  install: async () => { if (!installEvent) return; installEvent.prompt(); await installEvent.userChoice.catch(() => null); installEvent = null; render(); },
  'ep-view': el => { ui.epView = el.dataset.view; render(); saveView(); },
  'ep-toggle': el => { const s = getShow(el.dataset.show); if (s) toggleEpisode(s, el.dataset.key); },
  'ep-prev': el => { const s = getShow(el.dataset.show); if (s) markPrevious(s, el.dataset.key); },
  'ep-edit': el => { const s = getShow(el.dataset.show); if (s) openEpisodeEditor(s, el.dataset.key); },
  'ep-add': el => { const s = getShow(el.dataset.show); if (s) openEpisodeEditor(s, null, +el.dataset.season); },
  'ep-delete': async el => {
    const s = getShow(el.dataset.show); const e = s && findEp(s, el.dataset.key); if (!e) return;
    closeModal();
    if (!await confirmDialog({ title: `Supprimer ${epCode(e)} ?`, body: 'Cet épisode sera retiré de la saison.', confirm: "Supprimer l'épisode", danger: true })) return;
    const se = s.seasons.find(x => x.number === e.season);
    se.episodes = se.episodes.filter(x => x !== e);
    save(); render();
  },
  'next-watch': el => { const s = getShow(el.dataset.show); const st = s && stats(s); if (st?.next) toggleEpisode(s, epKey(st.next)); },
  'season-open': el => {
    const set = ui.openSeasons[el.dataset.show] || (ui.openSeasons[el.dataset.show] = new Set());
    const n = +el.dataset.season;
    set.has(n) ? set.delete(n) : set.add(n);
    render();
  },
  'season-toggle': el => { const s = getShow(el.dataset.show); if (s) toggleSeason(s, +el.dataset.season); },
  'season-add': el => {
    const s = getShow(el.dataset.show); if (!s) return;
    const n = s.seasons.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    s.seasons.push({ number: n, episodes: [] });
    (ui.openSeasons[s.id] ||= new Set()).add(n);
    save(); render();
    openEpisodeEditor(s, null, n);
  },
  'season-delete': async el => {
    const s = getShow(el.dataset.show); const n = +el.dataset.season;
    if (!await confirmDialog({ title: `Supprimer la saison ${n} ?`, body: 'Tous ses épisodes et votre progression sur cette saison seront supprimés.', confirm: 'Supprimer la saison', danger: true })) return;
    s.seasons = s.seasons.filter(x => x.number !== n); save(); render();
  },
  'show-edit': el => { const s = getShow(el.dataset.show); if (s) openEditShow(s); },
  'show-refresh': async el => {
    const s = getShow(el.dataset.show); if (!s) return;
    el.disabled = true; el.innerHTML = '<span class="spinner" style="width:16px;height:16px"></span>';
    try { await refreshShow(s); } catch (err) { toast(apiErrorText(err), { type: 'error' }); }
    render();
  },
  'show-delete': async el => {
    const s = getShow(el.dataset.show); if (!s) return;
    if (!await confirmDialog({ title: `Supprimer « ${s.title} » ?`, body: 'La série et toute votre progression seront supprimées de votre bibliothèque.', confirm: 'Supprimer la série', danger: true })) return;
    const idx = state.shows.indexOf(s);
    state.shows.splice(idx, 1); save();
    location.hash = '#/library';
    toast(`« ${s.title} » supprimée.`, { action: { label: 'Annuler', fn: () => { state.shows.splice(idx, 0, s); save(); location.hash = '#/show/' + s.id; } } });
  },
  'show-rating': el => { const s = getShow(el.dataset.show); const n = +el.dataset.n; s.rating = s.rating === n ? 0 : n; save(); render(); },
  'set-status': el => { const s = getShow(el.dataset.show); s.status = el.dataset.status; save(); render(); toast(`Classée dans « ${CAT[s.status].label} ».`); },
  'overview-toggle': () => { ui.expandOverview = !ui.expandOverview; render(); },
  'lib-cat': el => { ui.lib.cat = el.dataset.cat; render(); saveView(); },
  'lib-goto': el => { ui.lib = { ...ui.lib, cat: el.dataset.cat, q: '', platform: '', genre: '', air: '' }; },
  'lib-reset': () => { ui.lib = { ...ui.lib, q: '', platform: '', genre: '', air: '' }; render(); },
  'cal-range': el => { ui.cal.range = el.dataset.range; render(); saveView(); },
  'ics-export': () => exportICS(),
  'notif-toggle': (el, ev) => { if (el.type === 'checkbox') ev.preventDefault(); toggleNotifications(); },
  'theme-toggle': () => { state.settings.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); render(); },
  'set-theme': el => { state.settings.theme = el.dataset.theme; save(); applyTheme(); render(); },
  'sync-all': async el => {
    el.disabled = true; el.innerHTML = '<span class="spinner" style="width:16px;height:16px"></span>Mise à jour…';
    let n = 0, failed = null;
    for (const s of state.shows.filter(x => x.tvmazeId)) { try { n += await refreshShow(s, { silent: true }); } catch (err) { failed = err; if (err.code === 'NETWORK') break; } await new Promise(r => setTimeout(r, 400)); }
    render();
    toast(failed ? apiErrorText(failed) : n ? `${plural(n, 'nouveauté récupérée', 'nouveautés récupérées')}.` : 'Toutes vos séries sont à jour.', { type: failed ? 'error' : 'ok' });
  },
  'pf-delete': async el => {
    const p = getPlatform(el.dataset.pid);
    if (!await confirmDialog({ title: `Supprimer ${p.name} ?`, body: 'La plateforme sera retirée de toutes vos séries.', confirm: 'Supprimer la plateforme', danger: true })) return;
    state.platforms = state.platforms.filter(x => x.id !== p.id);
    for (const s of state.shows) s.platforms = s.platforms.filter(x => x.pid !== p.id);
    save(); render();
  },
  'data-export': () => download(`saison-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json'),
  'data-import': () => $('#importFile').click(),
  'data-reset': async () => {
    if (!await confirmDialog({ title: 'Effacer toute la bibliothèque ?', body: `${plural(state.shows.length, 'série', 'séries')} et toute votre progression seront supprimées de ce navigateur. Pensez à exporter une sauvegarde avant.`, confirm: 'Tout effacer', danger: true })) return;
    state.shows = []; state.notified = {}; save(); render(); toast('Bibliothèque effacée.');
  },
};
const CHANGES = {
  'show-status': el => { const s = getShow(el.dataset.show); s.status = el.value; save(); render(); toast(`Classée dans « ${CAT[s.status].label} ».`); },
  'lib-filter': el => { ui.lib[el.dataset.key] = el.value; renderLibGrid(); saveView(); },
  'form-pf-region': el => { const x = ui.draft.platforms.find(p => p.pid === el.dataset.pid); if (x) x.region = el.value; },
  'seen-season': el => { ui.draft.seen = { season: +el.value, episode: +el.value ? (draftSeasonCounts(ui.draft).find(s => s.n === +el.value)?.c || 1) : 0 }; $('#seenSection').innerHTML = seenHTML(ui.draft); },
  'seen-episode': el => { ui.draft.seen.episode = +el.value; },
  'set-region': el => { state.settings.region = el.value; save(); render(); },
};
const INPUTS = {
  'lib-q': el => { ui.lib.q = el.value; renderLibGrid(); },
  'add-q': el => onAddQuery(el.value),
  'draft-title': el => { ui.draft.title = el.value; el.setCustomValidity(''); const w = $('#dupWarn'); if (w) w.hidden = !dupOf(ui.draft); },
  'sb-count': el => { ui.draft.manualSeasons[+el.dataset.i].count = Math.max(0, Math.min(500, +el.value || 0)); $('#seenSection').innerHTML = seenHTML(ui.draft); },
};

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'BUTTON' || el.type === 'checkbox') ev.stopPropagation();
  fn(el, ev);
});
document.addEventListener('change', ev => { const el = ev.target.closest('[data-change]'); if (el) CHANGES[el.dataset.change]?.(el, ev); });
document.addEventListener('input', ev => { const el = ev.target.closest('[data-input]'); if (el) INPUTS[el.dataset.input]?.(el, ev); });
let notesTimer = 0;
function saveNotesField(el) {
  const s = getShow(el.dataset.show);
  if (s && (s.notes || '') !== el.value) { s.notes = el.value; s.updatedAt = Date.now(); save(); return true; }
  return false;
}
document.addEventListener('input', ev => {
  const el = ev.target.closest('[data-blur="show-notes"]');
  if (!el) return;
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => saveNotesField(el), 400);
});
document.addEventListener('focusout', ev => {
  const el = ev.target.closest('[data-blur="show-notes"]');
  if (!el) return;
  clearTimeout(notesTimer);
  saveNotesField(el);
});
document.addEventListener('submit', ev => {
  const f = ev.target;
  if (f.id === 'showForm') { ev.preventDefault(); submitShowForm(f); }
  else if (f.id === 'epForm') { ev.preventDefault(); submitEpisodeForm(f); }
  else if (f.id === 'pfForm') {
    ev.preventDefault();
    const name = f.name.value.trim(); if (!name) return;
    if (state.platforms.some(p => norm(p.name) === norm(name))) { toast('Cette plateforme existe déjà.', { type: 'info' }); return; }
    state.platforms.push({ id: 'c-' + uid(), name, color: `hsl(${hueOf(name)} 45% 35%)`, fg: '#fff', mark: name.replace(/[^\p{L}\p{N}+]/gu, '').slice(0, 3), domain: domainOf(f.site.value), custom: true });
    save(); render(); toast(`${name} ajoutée.`);
  }
});
$('#importFile').addEventListener('change', async ev => {
  const file = ev.target.files[0]; ev.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.shows)) throw new Error('format');
    if (!await confirmDialog({ title: 'Restaurer cette sauvegarde ?', body: `Votre bibliothèque actuelle (${plural(state.shows.length, 'série', 'séries')}) sera remplacée par celle du fichier (${plural(data.shows.length, 'série', 'séries')}).`, confirm: 'Remplacer ma bibliothèque', danger: true })) return;
    state = normalize(data);
    save(); applyTheme(); render(); toast('Sauvegarde restaurée.');
  } catch {
    toast("Ce fichier n'est pas une sauvegarde Saison valide.", { type: 'error' });
  }
});

const modal = $('#modal');
let downOnBackdrop = false;
modal.addEventListener('mousedown', e => { downOnBackdrop = e.target === modal; });
modal.addEventListener('click', e => { if (e.target === modal && downOnBackdrop) closeModal(); });
modal.addEventListener('close', () => { ui.add = null; ui.draft = null; modal.innerHTML = ''; });

document.addEventListener('keydown', e => {
  if (e.key === '/' && !e.target.closest('input, textarea, select') && !modal.open) {
    const s = $('#libSearch'); if (s) { e.preventDefault(); s.focus(); }
  }
});

/* =========================================================
   Comptes, questionnaire et recommandations
   ========================================================= */

/* ---------- Pont avec cloud.js ---------- */
window.SaisonApp = {
  getState: () => state,
  applyRemote(data) {
    state = normalize({ ...data, notified: state.notified });
    persistLocal(); applyTheme(); safeRender();
  },
  applyRemoteShows(upserts, removed) {
    for (const raw of upserts) {
      const s = normShow(raw);
      const i = state.shows.findIndex(x => x.id === s.id);
      if (i >= 0) state.shows[i] = s; else state.shows.unshift(s);
    }
    if (removed.length) state.shows = state.shows.filter(s => !removed.includes(s.id));
    persistLocal(); safeRender();
  },
  applyRemoteMeta(meta) {
    state = normalize({ ...state, ...meta, shows: state.shows, notified: state.notified });
    persistLocal(); applyTheme(); safeRender();
  },
  onAuth(u) {
    clearTimeout(authTimer);
    if (u === undefined) { authState = 'off'; safeRender(true); return; }
    if (u === null) { account = null; authState = 'out'; safeRender(true); return; }
    const switching = !account || account.uid !== u.uid;
    account = u;
    authState = 'in';
    try { localStorage.setItem(LAST_USER_KEY, JSON.stringify(u)); } catch { /* stockage indisponible */ }
    if (switching) {
      const cached = readStore(storeKey());
      if (cached) state = cached; // sinon : on garde les données de l'appareil, envoyées au premier passage
      if (u.name && !state.profile?.name) state.profile = { ...(state.profile || {}), name: u.name.split(' ')[0] };
      persistLocal(); applyTheme();
    }
    if (ui.route.name === 'auth' || location.hash === '#/auth') location.hash = '#/home';
    safeRender(true);
  },
  setSyncStatus(s) { ui.sync = s; const el = $('#syncState'); if (el) el.outerHTML = syncBadge(); },
  authError(msg) { ui.authError = msg; safeRender(true); },
};
function safeRender(force = false) {
  if (!force && (modal.open || document.activeElement?.matches('input, textarea, select'))) return;
  render();
}
function syncBadge() {
  const map = { ok: ['ok', 'Synchronisé'], sync: ['info', 'Synchronisation…'], error: ['warn', 'Hors ligne : synchronisation en attente'] };
  const [cls, txt] = map[ui.sync] || map.ok;
  return `<span id="syncState" class="chip ${cls}"><span class="dot"></span>${txt}</span>`;
}

/* ---------- Écran de connexion ---------- */
function viewAuth() {
  const signup = ui.authMode !== 'signin';
  const posters = (catalogCache || []).slice(0, 18);
  if (!catalogCache) loadCatalog().then(() => { if (ui.route.name === 'auth' || authState === 'out') safeRender(); });
  return `<section class="auth">
    <div class="auth-wall" aria-hidden="true">${posters.map((c, i) => `<img src="${CATALOG_IMG}${esc(c.i)}" alt="" style="--d:${(i % 6) * 0.6}s" loading="lazy">`).join('')}</div>
    <div class="auth-card">
      <span class="brand-mark big" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 7v10l8-5z"/></svg></span>
      <h1 class="auth-title">Toutes vos séries, au même endroit.</h1>
      <p class="auth-sub">${signup ? 'Créez votre compte pour retrouver vos séries sur tous vos appareils.' : 'Content de vous revoir.'}</p>
      ${ui.authError ? `<p class="auth-error" role="alert">${icon('info', 'sm')}${esc(ui.authError)}</p>` : ''}
      <button class="btn google lg" data-act="auth-google">${googleIcon()}Continuer avec Google</button>
      <div class="or"><span>ou avec votre e-mail</span></div>
      <form id="authForm" class="auth-form" novalidate>
        ${signup ? `<div class="field"><label for="aName">Prénom</label><input id="aName" name="name" class="input" autocomplete="given-name" placeholder="Camille"></div>` : ''}
        <div class="field"><label for="aEmail">E-mail</label><input id="aEmail" name="email" type="email" class="input" autocomplete="email" inputmode="email" required></div>
        <div class="field"><label for="aPass">Mot de passe</label><input id="aPass" name="password" type="password" class="input" autocomplete="${signup ? 'new-password' : 'current-password'}" required minlength="6">${signup ? '<p class="help">6 caractères minimum.</p>' : ''}</div>
        <button class="btn primary lg" type="submit">${signup ? 'Créer mon compte' : 'Me connecter'}</button>
      </form>
      <p class="auth-switch">${signup ? 'Déjà un compte ?' : 'Pas encore de compte ?'} <button class="link-btn" data-act="auth-mode">${signup ? 'Se connecter' : 'Créer un compte'}</button></p>
      ${signup ? '' : '<button class="link-btn" data-act="auth-reset">Mot de passe oublié ?</button>'}
      <button class="btn ghost" data-act="auth-guest">Essayer sans compte</button>
    </div>
  </section>`;
}
function googleIcon() {
  return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" style="stroke:none"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.5l-3.3-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3 7.5l3.4 2.6C7.2 7.8 9.4 6 12 6z"/></svg>';
}
function splashHTML() {
  return `<section class="splash"><span class="brand-mark big" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 7v10l8-5z"/></svg></span><div class="spinner"></div></section>`;
}

/* ---------- Catalogue pour les recommandations ---------- */
const CATALOG_IMG = 'https://static.tvmaze.com/uploads/images/';
let catalogCache = null, catalogPromise = null;
function loadCatalog() {
  if (catalogCache) return Promise.resolve(catalogCache);
  catalogPromise ||= fetch('catalog.json').then(r => r.json()).then(d => (catalogCache = d.shows || [])).catch(() => (catalogCache = []));
  return catalogPromise;
}
const GENRE_EN = Object.fromEntries(Object.entries(GENRES_FR).map(([en, fr]) => [norm(fr), en]));
const genreFr = g => GENRES_FR[g] || g;

const TASTE_GENRES = [
  ['Drama', '🎭'], ['Comedy', '😂'], ['Thriller', '🔪'], ['Crime', '🕵️'], ['Science-Fiction', '🚀'], ['Fantasy', '🐉'],
  ['Horror', '👻'], ['Action', '💥'], ['Romance', '💘'], ['Mystery', '🔍'], ['History', '🏰'], ['Anime', '🍥'],
  ['Family', '👨‍👩‍👧'], ['Supernatural', '🔮'], ['Medical', '🏥'], ['Legal', '⚖️'], ['Espionage', '🕶️'], ['War', '🎖️'],
];
const MOODS = [
  ['light', '😌', 'Léger et feel-good', 'Pour décompresser après la journée', ['Comedy', 'Family', 'Romance', 'Music']],
  ['intense', '🔥', 'Intense et haletant', 'Impossible de s\'arrêter', ['Thriller', 'Crime', 'Horror', 'Action', 'Espionage', 'War']],
  ['think', '🤯', 'Qui fait réfléchir', 'Des histoires qui restent en tête', ['Drama', 'Science-Fiction', 'Mystery', 'History', 'Legal']],
  ['mix', '🎲', 'Un peu de tout', 'Selon l\'humeur du moment', []],
];
const LANGS = [
  ['English', '🇺🇸', 'Anglais'], ['French', '🇫🇷', 'Français'], ['Korean', '🇰🇷', 'Coréen'],
  ['Japanese', '🇯🇵', 'Japonais'], ['Spanish', '🇪🇸', 'Espagnol'], ['German', '🇩🇪', 'Allemand'],
];
const PERSONAS = {
  Drama: 'Team émotions', Comedy: 'Team fous rires', Thriller: 'Team suspense', Crime: 'Team enquêtes', 'Science-Fiction': 'Team futur',
  Fantasy: 'Team évasion', Horror: 'Team frissons', Action: 'Team adrénaline', Romance: 'Team cœur d\'artichaut', Mystery: 'Team mystères',
  History: 'Team voyage dans le temps', Anime: 'Team animé', Family: 'Team cocooning', Supernatural: 'Team surnaturel', Medical: 'Team blouses blanches',
  Legal: 'Team plaidoiries', Espionage: 'Team agents secrets', War: 'Team stratèges',
};
function personaOf(p) {
  const g = (p?.genres || [])[0];
  if (!g) return 'Team curiosité';
  return PERSONAS[g] || 'Team curiosité';
}

/* Score de chaque série du catalogue selon le profil et la bibliothèque. */
function recommend(limit = 24) {
  const cat = catalogCache || [];
  if (!cat.length) return [];
  const p = state.profile || {};
  const prefs = new Set(p.genres || []);
  const mood = MOODS.find(m => m[0] === p.mood);
  const moodGenres = new Set(mood ? mood[4] : []);
  const langs = new Set(p.langs || []);
  const myPlatforms = state.platforms.filter(pl => (p.platforms || []).includes(pl.id));
  const owned = new Set(state.shows.map(s => s.tvmazeId).filter(Boolean));
  const dismissed = new Set(state.dismissed || []);
  const banned = new Set(p.dislikes || []);
  const favs = p.favs || [];
  favs.forEach(f => owned.add(f.id));

  // Goûts appris de la bibliothèque : genres des séries suivies, pondérés
  const libTaste = new Map();
  const libRefs = [];
  for (const s of state.shows) {
    const w = s.status === 'dropped' ? -1.5 : s.status === 'completed' ? 2 : s.status === 'watching' ? 1.5 : 0.6;
    const bonus = (s.rating || 0) >= 4 ? 1 : 0;
    const gs = s.genres.map(g => GENRE_EN[norm(g)] || g);
    for (const g of gs) libTaste.set(g, (libTaste.get(g) || 0) + w + bonus);
    if (w > 0) libRefs.push({ title: s.title, g: new Set(gs), w: w + bonus });
  }
  for (const f of favs) libRefs.push({ title: f.n, g: new Set(f.g || []), w: 3 });

  const out = [];
  for (const c of cat) {
    if (owned.has(c.id) || dismissed.has(c.id)) continue;
    if (c.g.some(g => banned.has(g)) || (c.an && banned.has('Anime'))) continue;
    const gs = c.an && !c.g.includes('Anime') ? [...c.g, 'Anime'] : c.g;
    let score = 0;
    const reasons = [];
    let gPref = 0;
    for (const g of gs) {
      if (prefs.has(g)) { score += 3; gPref++; if (!reasons.some(r => r.k === 'g')) reasons.push({ k: 'g', w: 3, t: `Vous aimez le genre ${genreFr(g).toLowerCase()}` }); }
      if (moodGenres.has(g)) score += 1.2;
      score += Math.max(-3, Math.min(4, (libTaste.get(g) || 0) * 0.5));
    }
    let best = null;
    for (const ref of libRefs) {
      let common = 0;
      for (const g of gs) if (ref.g.has(g)) common++;
      if (common >= 2 && (!best || common * ref.w > best.v)) best = { v: common * ref.w, t: ref.title };
    }
    if (best) { score += 2 + Math.min(best.v, 8) * 0.25; reasons.push({ k: 'like', w: 4 + best.v, t: `Comme ${best.t}` }); }
    if (langs.size && !langs.has('any')) { if (langs.has(c.l)) score += 2.5; else score -= 5; }
    const pf = myPlatforms.find(pl => (c.d && pl.domain && c.d.endsWith(pl.domain.replace(/^tv\./, ''))) || norm(pl.name) === norm(c.p) || (PLATFORM_ALIASES[pl.id] || []).includes(norm(c.p)));
    if (pf) { score += 2.5; reasons.push({ k: 'pf', w: 2.5, t: `Sur ${pf.name}` }); }
    if (p.length === 'short' && c.rt && c.rt <= 35) score += 1.5;
    if (p.length === 'long' && c.rt >= 40) score += 1;
    if (p.format === 'mini' && !c.st) score += 0.8;
    if (p.format === 'long' && c.st) score += 0.8;
    score += (c.r || 6.5) * 0.7 + Math.log10(c.w) * 1.5;
    if (c.y >= new Date().getFullYear() - 3) score += 0.8;
    if (prefs.size && !gPref && !best) score -= 3;
    if (!reasons.length) reasons.push({ k: 'pop', w: 0, t: c.r >= 8 ? 'Très bien notée' : 'Très populaire' });
    reasons.sort((a, b) => b.w - a.w);
    out.push({ c, score, reasons, reason: reasons[0].t });
  }
  out.sort((a, b) => b.score - a.score);
  // Un peu de variété : pas plus de 3 séries d'affilée avec le même genre principal
  const res = [], streak = { g: '', n: 0 }, held = [];
  for (const r of out) {
    const g = r.c.g[0];
    if (g === streak.g && streak.n >= 3) { held.push(r); continue; }
    streak.n = g === streak.g ? streak.n + 1 : 1; streak.g = g;
    res.push(r);
    if (res.length >= limit) break;
  }
  // Raisons variées : une même raison au plus deux fois d'affilée dans la liste
  const final = res.concat(held).slice(0, limit);
  const used = new Map();
  for (const r of final) {
    const pick = r.reasons.find(x => (used.get(x.t) || 0) < 2) || r.reasons[0];
    r.reason = pick.t;
    used.set(pick.t, (used.get(pick.t) || 0) + 1);
  }
  return final;
}

function recCard(r) {
  const c = r.c;
  return `<article class="rcard" data-rec="${c.id}">
    <button class="rcard-open" data-act="rec-open" data-id="${c.id}" aria-label="Voir ${esc(c.n)}">
      ${posterHTML({ title: c.n, poster: CATALOG_IMG + c.i })}<span class="pcard-shade"></span>
      <span class="rcard-info"><b>${esc(c.n)}</b><span>${[c.y || '', c.r ? `★ ${c.r.toFixed(1)}` : ''].filter(Boolean).join('  ')}</span></span>
    </button>
    <span class="rcard-reason">${esc(r.reason)}</span>
    <div class="rcard-actions">
      <button class="rc-btn no" data-act="rec-dismiss" data-id="${c.id}" aria-label="Pas pour moi : ${esc(c.n)}" title="Pas pour moi">${icon('x')}</button>
      <button class="rc-btn yes" data-act="rec-add" data-id="${c.id}" aria-label="Ajouter ${esc(c.n)} à ma liste" title="Ajouter à « À regarder »">${icon('plus')}</button>
    </div>
  </article>`;
}
/* ---------- Sélection du jour ----------
   Chaque jour, une nouvelle liste tirée des meilleures recommandations,
   sans reprendre les séries déjà proposées les jours précédents.
   Elle reste la même toute la journée, et se recalcule si les goûts changent. */
const DAILY_SIZE = 48;
const todayKey = () => dayStr(new Date());
function dayStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function seeded(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
function tasteSig() {
  const p = state.profile || {};
  return JSON.stringify([p.genres, p.dislikes, p.mood, p.format, p.length, p.langs, p.platforms, (p.favs || []).map(f => f.id)]);
}
function dailyPicks() {
  if (!catalogCache?.length) return [];
  const day = todayKey();
  const sig = tasteSig();
  let d = state.daily;
  const ranked = recommend(400);
  const byId = new Map(ranked.map(r => [r.c.id, r]));
  if (!d || d.day !== day || d.sig !== sig) {
    const seen = new Set(d?.seen || []);
    if (d && d.day !== day) (d.ids || []).forEach(id => seen.add(id)); // la liste d'hier rejoint l'historique
    let pool = ranked.filter(r => !seen.has(r.c.id));
    if (pool.length < DAILY_SIZE) pool = ranked; // tout a déjà été proposé : on recommence
    // Les meilleures d'abord, avec un peu de hasard propre au jour pour varier
    const ids = pool
      .map((r, i) => ({ id: r.c.id, k: r.score - i * 0.02 + seeded(day + ':' + r.c.id) * 4 }))
      .sort((a, b) => b.k - a.k).slice(0, DAILY_SIZE).map(x => x.id);
    d = state.daily = { day, sig, ids, seen: [...seen].slice(-800) };
    save();
  }
  const owned = new Set(state.shows.map(sh => sh.tvmazeId).filter(Boolean));
  const dismissed = new Set(state.dismissed || []);
  const list = d.ids.map(id => byId.get(id)).filter(r => r && !owned.has(r.c.id) && !dismissed.has(r.c.id));
  // Une série ajoutée ou écartée est remplacée pour garder une liste complète
  if (list.length < DAILY_SIZE) {
    const taken = new Set([...d.ids, ...d.seen]);
    for (const r of ranked) {
      if (list.length >= DAILY_SIZE) break;
      if (!taken.has(r.c.id)) { list.push(r); d.ids.push(r.c.id); taken.add(r.c.id); }
    }
  }
  return list;
}

function recsSectionHTML(limit = 12) {
  if (!catalogCache) { loadCatalog().then(() => safeRender()); return ''; }
  const recs = dailyPicks().slice(0, limit);
  if (!recs.length) return '';
  return `<section class="section"><div class="section-head"><h2 class="section-title">Pour vous aujourd'hui</h2><a class="section-link" href="#/discover">Tout voir ${icon('chevron', 'sm')}</a></div>
    <div class="rrail">${recs.map(recCard).join('')}</div></section>`;
}
function viewDiscover() {
  if (!catalogCache) { loadCatalog().then(() => safeRender()); return `<div class="loading-block"><div class="spinner"></div>Préparation de vos recommandations…</div>`; }
  const p = state.profile || {};
  const recs = dailyPicks();
  return `<header class="page-head"><div><h1 class="page-title">Découvrir</h1><p class="page-sub">${p.done && !p.skipped ? `${esc(personaOf(p))} · choisies selon vos goûts et votre bibliothèque.` : 'Des séries populaires. Répondez au questionnaire pour des suggestions sur mesure.'}</p></div></header>
    ${!p.done || p.skipped ? `<div class="notice" style="margin:12px 0 18px">${icon('sparkle')}<div><p>Dites-nous ce que vous aimez en 1 minute pour des recommandations personnalisées.</p><div class="actions"><button class="btn sm primary" data-act="ob-start">Répondre au questionnaire</button></div></div></div>` : ''}
    ${recs.length ? `<div class="rgrid">${recs.map(recCard).join('')}</div>` : emptyHTML({ ic: 'sparkle', title: 'Vous avez tout vu !', text: 'Plus aucune suggestion pour le moment. Revenez après avoir ajouté quelques séries.' })}
    <p class="help" style="margin-top:20px">Touchez une affiche pour voir le résumé. ✕ pour l'écarter, + pour l'ajouter à « À regarder ».</p>`;
}

/* Ajout rapide depuis une recommandation ou un coup de cœur */
async function quickAdd(id, status = 'planned', frTitle = '') {
  if (state.shows.some(s => s.tvmazeId === id)) return null;
  const data = await fetchFullShow(id);
  const dr = draftFromCatalog(data, frTitle);
  const show = normShow({
    id: uid(), tvmazeId: dr.tvmazeId, title: dr.title, originalTitle: dr.originalTitle, poster: dr.poster, backdrop: dr.backdrop,
    overview: dr.overview, genres: dr.genres, year: dr.year, airStatus: dr.airStatus, status, platforms: dr.platforms,
    providers: dr.providers, rating: 0, notes: '', airTime: '', runtime: dr.runtime, seasons: dr.seasons,
    addedAt: Date.now(), updatedAt: Date.now(), lastSync: Date.now(),
  });
  if (status === 'completed') {
    const states = computeStates(show);
    for (const e of allEps(show)) if (states.get(e) !== 'upcoming') { e.watched = true; e.watchedAt = Date.now(); e.bulk = true; }
  }
  state.shows.unshift(show);
  save();
  return show;
}

/* ---------- Questionnaire de la première ouverture ---------- */
const OB_STEPS = ['hello', 'genres', 'dislikes', 'mood', 'format', 'langs', 'platforms', 'favs', 'done'];
const OB_DRAFT_KEY = 'saison:onboarding';
function saveObDraft() {
  if (!ui.ob) return;
  const d = ui.ob.d;
  try {
    localStorage.setItem(OB_DRAFT_KEY, JSON.stringify({ step: ui.ob.step, d: { ...d, genres: [...d.genres], dislikes: [...d.dislikes], langs: [...d.langs], platforms: [...d.platforms] } }));
  } catch { /* stockage indisponible */ }
}
function readObDraft() {
  try {
    const x = JSON.parse(localStorage.getItem(OB_DRAFT_KEY) || 'null');
    if (!x || !x.d) return null;
    return { step: x.step || 0, q: '', results: [], searching: false, d: { ...x.d, genres: new Set(x.d.genres), dislikes: new Set(x.d.dislikes || []), langs: new Set(x.d.langs), platforms: new Set(x.d.platforms) } };
  } catch { return null; }
}
const clearObDraft = () => { try { localStorage.removeItem(OB_DRAFT_KEY); } catch { /* */ } };
// Prépare le questionnaire (reprend le brouillon si demandé), sans rien afficher
function initOnboarding(resume = false) {
  const p = state.profile || {};
  const draft = resume ? readObDraft() : null;
  loadCatalog();
  if (draft) { ui.ob = draft; return; }
  clearObDraft();
  ui.ob = {
    step: 0, q: '', results: [], searching: false,
    d: {
      name: p.name || account?.name?.split(' ')[0] || '',
      genres: new Set(p.genres || []), dislikes: new Set(p.dislikes || []), mood: p.mood || '', format: p.format || 'any', length: p.length || 'any',
      langs: new Set(p.langs || []), platforms: new Set(p.platforms || state.shows.flatMap(s => s.platforms.map(x => x.pid))),
      favs: [...(p.favs || [])], addFavs: false,
    },
  };
}
function startOnboarding() {
  initOnboarding(false);
  location.hash = '#/welcome';
  render();
}
function viewOnboarding() {
  if (!ui.ob) initOnboarding(true);
  saveObDraft();
  const o = ui.ob, d = o.d, step = OB_STEPS[o.step];
  const total = OB_STEPS.length - 1;
  const tile = (act, val, on, emoji, label, sub = '') => `<button class="ob-tile ${on ? 'on' : ''}" data-act="${act}" data-v="${esc(val)}" aria-pressed="${on}"><span class="ob-emoji" aria-hidden="true">${emoji}</span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
  let body = '', canNext = true;
  if (step === 'hello') {
    body = `<div class="ob-hero">${tvIllustration()}</div>
      <h1 class="ob-title">Bienvenue${d.name ? ' ' + esc(d.name) : ''} !</h1>
      <p class="ob-sub">Quelques questions rapides pour vous proposer des séries qui vous ressemblent. Ça prend une minute.</p>
      <div class="field ob-field"><label for="obName">Votre prénom</label><input id="obName" class="input" value="${esc(d.name)}" data-input="ob-name" autocomplete="given-name" placeholder="Camille"></div>`;
  } else if (step === 'genres') {
    body = `<h1 class="ob-title">Vous aimez quels genres ?</h1><p class="ob-sub">Choisissez-en autant que vous voulez.</p>
      <div class="ob-grid">${TASTE_GENRES.map(([g, e]) => tile('ob-genre', g, d.genres.has(g), e, genreFr(g))).join('')}</div>`;
    canNext = d.genres.size > 0;
  } else if (step === 'dislikes') {
    const options = TASTE_GENRES.filter(([g]) => !d.genres.has(g));
    body = `<h1 class="ob-title">Et ce que vous n'aimez pas ?</h1><p class="ob-sub">Ces genres ne vous seront jamais proposés. Facultatif.</p>
      <div class="ob-grid">${options.map(([g, e]) => `<button class="ob-tile no-tile ${d.dislikes.has(g) ? 'off' : ''}" data-act="ob-dislike" data-v="${esc(g)}" aria-pressed="${d.dislikes.has(g)}"><span class="ob-emoji" aria-hidden="true">${e}</span><b>${esc(genreFr(g))}</b></button>`).join('')}</div>`;
  } else if (step === 'mood') {
    body = `<h1 class="ob-title">Le soir, vous avez plutôt envie de…</h1>
      <div class="ob-list">${MOODS.map(([v, e, l, s]) => tile('ob-mood', v, d.mood === v, e, l, s)).join('')}</div>`;
    canNext = !!d.mood;
  } else if (step === 'format') {
    body = `<h1 class="ob-title">Plutôt quel format ?</h1>
      <p class="ob-q">La durée de la série</p>
      <div class="ob-row">${[['mini', '⚡', 'Courtes', 'Une ou deux saisons'], ['long', '📺', 'Longues', 'À suivre sur des années'], ['any', '🤷', 'Peu importe', '']].map(([v, e, l, s]) => tile('ob-format', v, d.format === v, e, l, s)).join('')}</div>
      <p class="ob-q">La durée d'un épisode</p>
      <div class="ob-row">${[['short', '☕', 'Courts', '≈ 25 min'], ['long', '🍿', 'Longs', '≈ 50 min'], ['any', '🤷', 'Peu importe', '']].map(([v, e, l, s]) => tile('ob-length', v, d.length === v, e, l, s)).join('')}</div>`;
  } else if (step === 'langs') {
    body = `<h1 class="ob-title">Vous regardez des séries en quelle langue ?</h1><p class="ob-sub">En version originale, avec ou sans sous-titres.</p>
      <div class="ob-grid">${LANGS.map(([v, e, l]) => tile('ob-lang', v, d.langs.has(v), e, l)).join('')}${tile('ob-lang', 'any', d.langs.has('any'), '🌍', 'Toutes')}</div>`;
    canNext = d.langs.size > 0;
  } else if (step === 'platforms') {
    const all = [...state.platforms, ...SUGGESTED_PLATFORMS.filter(([n, dm]) => !state.platforms.some(p => p.domain === dm)).map(([n, dm, c]) => ({ id: 'sugg:' + dm, name: n, domain: dm, color: c, mark: n.slice(0, 2) }))];
    body = `<h1 class="ob-title">Vous avez quelles plateformes ?</h1><p class="ob-sub">Pour vous proposer d'abord ce que vous pouvez regarder.</p>
      <div class="ob-grid pf-grid">${all.map(p => `<button class="ob-tile pf-tile ${d.platforms.has(p.id) ? 'on' : ''}" data-act="ob-pf" data-v="${esc(p.id)}" aria-pressed="${d.platforms.has(p.id)}">${pfBadge(p, 'xl')}<b>${esc(p.name)}</b></button>`).join('')}</div>`;
  } else if (step === 'favs') {
    const picks = (catalogCache || []).filter(c => !d.favs.some(f => f.id === c.id) && !c.g.some(g => d.dislikes.has(g)) && (!d.genres.size || c.g.some(g => d.genres.has(g)))).slice(0, 18);
    body = `<h1 class="ob-title">Vos coups de cœur ?</h1><p class="ob-sub">Touchez les séries que vous avez adorées (jusqu'à 8). Elles guideront nos suggestions.</p>
      ${d.favs.length ? `<div class="ob-favs">${d.favs.map(f => `<button class="ob-fav" data-act="ob-unfav" data-v="${f.id}" aria-label="Retirer ${esc(f.n)}">${posterHTML({ title: f.n, poster: f.img })}<span class="ob-fav-x">${icon('x', 'sm')}</span></button>`).join('')}</div>` : ''}
      <div class="search-box ob-search">${icon('search')}<label class="visually-hidden" for="obSearch">Rechercher une série</label><input id="obSearch" class="input" type="search" placeholder="Rechercher une série…" value="${esc(o.q)}" data-input="ob-q" autocomplete="off"></div>
      <div id="obResults" class="ob-picks">${obPicksHTML(o.q.trim().length >= 2 ? o.results : picks.map(c => ({ id: c.id, n: c.n, img: CATALOG_IMG + c.i, g: c.g })))}</div>
      ${d.favs.length ? `<label class="ob-check"><input type="checkbox" data-change="ob-addfavs" ${d.addFavs ? 'checked' : ''}> Les ajouter à ma bibliothèque comme « Terminées »</label>` : ''}`;
  } else {
    const prof = obProfile();
    const saved = state.profile; state.profile = prof;
    const recs = recommend(6);
    state.profile = saved;
    body = `<div class="ob-result"><span class="ob-badge">${esc(personaOf(prof))}</span>
      <h1 class="ob-title">C'est noté${d.name ? ', ' + esc(d.name) : ''} !</h1>
      <div class="ob-summary">${[...d.genres].map(g => `<span class="chip">${(TASTE_GENRES.find(t => t[0] === g) || [, ''])[1]} ${esc(genreFr(g))}</span>`).join('')}${d.mood ? `<span class="chip accent">${MOODS.find(m => m[0] === d.mood)[1]} ${esc(MOODS.find(m => m[0] === d.mood)[2])}</span>` : ''}${[...d.dislikes].map(g => `<span class="chip no">🚫 ${esc(genreFr(g))}</span>`).join('')}</div>
      <p class="ob-sub">Voici de quoi commencer :</p>
      <div class="ob-recs">${recs.map(r => `<div class="ob-rec">${posterHTML({ title: r.c.n, poster: CATALOG_IMG + r.c.i })}<b>${esc(r.c.n)}</b><small>${esc(r.reason)}</small></div>`).join('')}</div></div>`;
  }
  const last = o.step === total;
  return `<section class="ob">
    <div class="ob-top">
      ${o.step > 0 ? `<button class="icon-btn" data-act="ob-back" aria-label="Question précédente">${icon('back')}</button>` : '<span></span>'}
      <div class="ob-progress" role="progressbar" aria-valuenow="${o.step}" aria-valuemax="${total}"><span style="width:${(o.step / total) * 100}%"></span></div>
      ${last ? '<span></span>' : `<button class="link-btn" data-act="ob-skip">Passer</button>`}
    </div>
    <div class="ob-body">${body}</div>
    <div class="ob-foot">
      <button class="btn primary lg ob-next" data-act="${last ? 'ob-finish' : 'ob-next'}" ${canNext ? '' : 'disabled'}>${last ? 'Découvrir mes séries' : o.step === 0 ? 'Commencer' : 'Continuer'}${icon('chevron')}</button>
      ${!canNext ? '<p class="help ob-hint">Choisissez au moins une réponse pour continuer.</p>' : ''}
    </div>
  </section>`;
}
function obPicksHTML(list) {
  const d = ui.ob.d;
  if (ui.ob.searching) return '<div class="loading-block" style="padding:24px"><div class="spinner"></div></div>';
  if (!list.length) return `<p class="help" style="grid-column:1/-1">${ui.ob.q.trim().length >= 2 ? 'Aucune série trouvée.' : ''}</p>`;
  return list.map(c => `<button class="ob-pick ${d.favs.some(f => f.id === c.id) ? 'on' : ''}" data-act="ob-fav" data-v="${c.id}" aria-pressed="${d.favs.some(f => f.id === c.id)}">${posterHTML({ title: c.n, poster: c.img })}<span class="ob-pick-check">${icon('check', 'sm')}</span><b>${esc(c.n)}</b></button>`).join('');
}
function obProfile() {
  const d = ui.ob.d;
  return {
    name: d.name.trim(), genres: [...d.genres], dislikes: [...d.dislikes], mood: d.mood, format: d.format, length: d.length,
    langs: [...d.langs], platforms: [...d.platforms].filter(id => !id.startsWith('sugg:')), favs: d.favs, done: true, at: Date.now(),
  };
}
let obSearchTimer = 0;
function obSearch(q) {
  ui.ob.q = q;
  clearTimeout(obSearchTimer);
  const el = $('#obResults');
  if (q.trim().length < 2) { ui.ob.results = []; ui.ob.searching = false; render(); const i = $('#obSearch'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } return; }
  ui.ob.searching = true; if (el) el.innerHTML = obPicksHTML([]);
  obSearchTimer = setTimeout(async () => {
    try {
      const r = await api('/search/shows?q=' + encodeURIComponent(q.trim()));
      ui.ob.results = (r || []).map(x => x.show).filter(s => s?.image).slice(0, 12).map(s => ({ id: s.id, n: s.name, img: s.image.medium, g: s.genres }));
    } catch { ui.ob.results = []; }
    ui.ob.searching = false;
    const box = $('#obResults'); if (box) box.innerHTML = obPicksHTML(ui.ob.results);
  }, 350);
}
async function finishOnboarding(skipped = false) {
  const o = ui.ob;
  if (skipped) state.profile = { ...(state.profile || {}), done: true, skipped: true, at: Date.now() };
  else {
    state.profile = obProfile();
    // Les plateformes suggérées choisies rejoignent la liste
    for (const id of o.d.platforms) {
      if (!id.startsWith('sugg:')) continue;
      const s = SUGGESTED_PLATFORMS.find(x => x[1] === id.slice(5));
      if (s && !state.platforms.some(p => p.domain === s[1])) {
        const p = { id: 'c-' + uid(), name: s[0], domain: s[1], color: s[2], fg: '#fff', mark: s[0].slice(0, 2), custom: true };
        state.platforms.push(p); state.profile.platforms.push(p.id);
      }
    }
  }
  save();
  const favs = !skipped && o.d.addFavs ? [...o.d.favs] : [];
  ui.ob = null;
  clearObDraft();
  location.hash = '#/home';
  render();
  if (favs.length) {
    toast(`Ajout de vos ${favs.length} coups de cœur…`, { type: 'info' });
    let n = 0;
    for (const f of favs) { try { if (await quickAdd(f.id, 'completed')) n++; } catch { /* on passe */ } }
    render();
    toast(`${plural(n, 'série ajoutée', 'séries ajoutées')} à « Terminées ».`);
  }
}

/* ---------- Actions ---------- */
Object.assign(ACTIONS, {
  'auth-google': async () => { ui.authError = ''; try { await window.cloud.signInGoogle(); } catch (err) { ui.authError = window.cloud.errorText(err); render(); } },
  'auth-mode': () => { ui.authMode = ui.authMode === 'signin' ? 'signup' : 'signin'; ui.authError = ''; render(); },
  'auth-reset': async () => {
    const email = $('#aEmail')?.value.trim();
    if (!email) { ui.authError = 'Indiquez votre e-mail ci-dessus, puis touchez « Mot de passe oublié ? ».'; render(); return; }
    try { await window.cloud.reset(email); toast('E-mail de réinitialisation envoyé. Vérifiez votre boîte de réception.'); }
    catch (err) { ui.authError = window.cloud.errorText(err); render(); }
  },
  'auth-guest': () => { ui.guest = true; try { localStorage.setItem(GUEST_KEY, '1'); } catch { /* */ } location.hash = '#/home'; render(); },
  'auth-open': () => { ui.guest = false; ui.authMode = 'signup'; try { localStorage.removeItem(GUEST_KEY); } catch { /* */ } location.hash = '#/auth'; render(); },
  'sign-out': async () => {
    if (!await confirmDialog({ title: 'Se déconnecter ?', body: 'Vos séries restent enregistrées dans votre compte. Vous les retrouverez en vous reconnectant.', confirm: 'Me déconnecter' })) return;
    await window.cloud.signOut();
    state = defaultState(); ui.guest = false;
    try { localStorage.removeItem(LAST_USER_KEY); } catch { /* */ }
    location.hash = '#/auth'; render();
  },
  'ob-start': () => startOnboarding(),
  'ob-next': () => { ui.ob.step = Math.min(OB_STEPS.length - 1, ui.ob.step + 1); render(); },
  'ob-back': () => { ui.ob.step = Math.max(0, ui.ob.step - 1); render(); },
  'ob-skip': () => { if (state.profile?.done) { ui.ob = null; clearObDraft(); location.hash = '#/settings'; render(); } else finishOnboarding(true); },
  'ob-finish': () => finishOnboarding(false),
  'ob-genre': el => { const s = ui.ob.d.genres, v = el.dataset.v; s.has(v) ? s.delete(v) : (s.add(v), ui.ob.d.dislikes.delete(v)); render(); },
  'ob-dislike': el => { const s = ui.ob.d.dislikes, v = el.dataset.v; s.has(v) ? s.delete(v) : s.add(v); render(); },
  'taste-dislike': el => {
    const p = state.profile || (state.profile = {});
    const set = new Set(p.dislikes || []), v = el.dataset.v;
    if (set.has(v)) set.delete(v); else { set.add(v); p.genres = (p.genres || []).filter(g => g !== v); }
    p.dislikes = [...set];
    save(); render();
  },
  'ob-mood': el => { ui.ob.d.mood = el.dataset.v; render(); },
  'ob-format': el => { ui.ob.d.format = el.dataset.v; render(); },
  'ob-length': el => { ui.ob.d.length = el.dataset.v; render(); },
  'ob-lang': el => {
    const s = ui.ob.d.langs, v = el.dataset.v;
    if (v === 'any') { s.clear(); s.add('any'); } else { s.delete('any'); s.has(v) ? s.delete(v) : s.add(v); }
    render();
  },
  'ob-pf': el => { const s = ui.ob.d.platforms, v = el.dataset.v; s.has(v) ? s.delete(v) : s.add(v); render(); },
  'ob-fav': el => {
    const id = +el.dataset.v, d = ui.ob.d;
    const i = d.favs.findIndex(f => f.id === id);
    if (i >= 0) d.favs.splice(i, 1);
    else if (d.favs.length < 8) {
      const c = (catalogCache || []).find(x => x.id === id) || null;
      const r = ui.ob.results.find(x => x.id === id);
      d.favs.push(c ? { id, n: c.n, img: CATALOG_IMG + c.i, g: c.g } : { id, n: r?.n || '', img: r?.img || '', g: r?.g || [] });
    } else { toast('8 coups de cœur maximum.', { type: 'info' }); return; }
    buzz(); render();
  },
  'ob-unfav': el => { ui.ob.d.favs = ui.ob.d.favs.filter(f => f.id !== +el.dataset.v); render(); },
  'rec-open': el => { openAdd(); pickFromCatalog(+el.dataset.id); },
  'rec-add': async el => {
    const id = +el.dataset.id;
    const card = el.closest('.rcard'); card?.classList.add('busy');
    try {
      const s = await quickAdd(id, 'planned');
      if (s) { buzz(); toast(`« ${s.title} » ajoutée à « À regarder ».`, { action: { label: 'Voir', fn: () => { location.hash = '#/show/' + s.id; } } }); }
    } catch (err) { toast(apiErrorText(err), { type: 'error' }); }
    render();
  },
  'rec-dismiss': el => {
    const id = +el.dataset.id;
    state.dismissed = [...new Set([...(state.dismissed || []), id])].slice(-500);
    save();
    const card = el.closest('.rcard');
    if (card) { card.classList.add('gone'); setTimeout(render, 220); } else render();
    toast('Suggestion écartée.', { action: { label: 'Annuler', fn: () => { state.dismissed = state.dismissed.filter(x => x !== id); save(); render(); } } });
  },
});
Object.assign(INPUTS, {
  'ob-name': el => { ui.ob.d.name = el.value; saveObDraft(); },
  'ob-q': el => obSearch(el.value),
});
Object.assign(CHANGES, {
  'ob-addfavs': el => { ui.ob.d.addFavs = el.checked; saveObDraft(); },
});
document.addEventListener('submit', async ev => {
  if (ev.target.id !== 'authForm') return;
  ev.preventDefault();
  const f = ev.target;
  const email = f.email.value.trim(), password = f.password.value, name = f.name?.value.trim() || '';
  if (!email || !password) { ui.authError = 'Indiquez votre e-mail et votre mot de passe.'; render(); return; }
  const btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-top-color:currentColor"></span>';
  ui.authError = '';
  try {
    if (ui.authMode === 'signin') await window.cloud.signIn(email, password);
    else { await window.cloud.signUp(email, password, name); if (name) state.profile = { ...(state.profile || {}), name }; }
  } catch (err) { ui.authError = window.cloud.errorText(err); render(); }
});

/* ---------- Reprise à l'identique ---------- */
const VIEW_KEY = 'saison:view';
function saveView() {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify({ lib: ui.lib, cal: ui.cal, epView: ui.epView }));
  } catch { /* stockage indisponible */ }
}
function restoreView() {
  try {
    const v = JSON.parse(localStorage.getItem(VIEW_KEY) || '{}');
    if (v.lib) ui.lib = { ...ui.lib, ...v.lib, q: '' };
    if (v.cal) ui.cal = { ...ui.cal, ...v.cal };
    if (v.epView) ui.epView = v.epView;
  } catch { /* */ }
}
// Juste avant que l'app soit mise en arrière-plan ou fermée : tout est écrit
function flushAll() {
  const notes = document.activeElement?.closest?.('[data-blur="show-notes"]');
  if (notes) { clearTimeout(notesTimer); saveNotesField(notes); }
  saveObDraft();
  saveView();
  persistLocal();
  if (account && window.cloud) window.cloud.flush?.();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAll(); });
window.addEventListener('pagehide', flushAll);
// Demande au navigateur de ne pas effacer les données de Saison pour faire de la place
if (navigator.storage?.persist) navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(() => {});

/* ---------- Mises à jour de l'app ---------- */
// Sur téléphone, rouvrir l'app reprend souvent la page restée en mémoire, sans la recharger.
// On vérifie donc la version publiée à l'ouverture et à chaque retour dans l'app.
let lastUpdateCheck = 0;
async function checkForUpdate({ manual = false, fresh = false } = {}) {
  if (!/^https?:$/.test(location.protocol)) return;
  if (!manual && Date.now() - lastUpdateCheck < 60e3) return;
  lastUpdateCheck = Date.now();
  let remote = null;
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) remote = String((await r.json()).v || '');
  } catch { /* hors connexion : on réessaiera */ }
  if (!remote) { if (manual) toast('Impossible de vérifier pour le moment : pas de connexion.', { type: 'error' }); return; }
  if (remote === APP_VERSION) { if (manual) toast(`Saison est à jour (version ${APP_VERSION}).`); return; }
  try { (await navigator.serviceWorker?.getRegistration())?.update(); } catch { /* */ }
  flushAll();
  // Une seule tentative automatique par version, pour ne jamais boucler si le serveur sert encore l'ancien fichier
  let tried = '';
  try { tried = sessionStorage.getItem('saison:reloadedFor') || ''; } catch { /* */ }
  const busy = modal.open || document.activeElement?.matches('input, textarea, select') || ui.ob;
  if ((manual || ((fresh || !busy) && tried !== remote))) {
    try { sessionStorage.setItem('saison:reloadedFor', remote); } catch { /* */ }
    location.reload();
    return;
  }
  toast('Une nouvelle version de Saison est disponible.', { type: 'info', timeout: 15000, action: { label: 'Mettre à jour', fn: () => location.reload() } });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate({ fresh: true }); });
window.addEventListener('pageshow', e => { if (e.persisted) checkForUpdate({ fresh: true }); });
setTimeout(() => checkForUpdate(), 3000);
ACTIONS['check-update'] = () => checkForUpdate({ manual: true });
let shownDay = todayKey();
setInterval(() => {
  if (todayKey() !== shownDay) { shownDay = todayKey(); if (['home', 'discover'].includes(ui.route.name)) safeRender(); }
}, 60e3);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && todayKey() !== shownDay) { shownDay = todayKey(); safeRender(); } });

/* ---------- Démarrage ---------- */
window.addEventListener('hashchange', () => { render(); saveView(); });
window.addEventListener('storage', e => { if (e.key === storeKey()) { state = load(); render(); } });
if (CLOUD_ON) {
  // Hors connexion au démarrage : on rouvre le dernier compte avec ses données locales
  authTimer = setTimeout(() => {
    if (authState !== 'pending') return;
    let last = null;
    try { last = JSON.parse(localStorage.getItem(LAST_USER_KEY) || 'null'); } catch { /* */ }
    if (last) { account = last; authState = 'in'; state = readStore(storeKey()) || state; }
    else authState = 'out';
    render();
  }, 6000);
}
applyTheme();
// À l'ouverture, l'app démarre toujours sur l'Accueil ; onglets, filtres et vue des épisodes sont retrouvés
restoreView();
if (!location.hash) history.replaceState(null, '', '#/home');
render();

// Comptes à rebours en direct + passage automatique « à venir » → « disponible »
let lastMinuteKey = '';
setInterval(() => {
  const now = new Date();
  for (const el of $$('[data-release]')) {
    const cd = countdown(new Date(+el.dataset.release), el.dataset.timed === '1', now);
    el.textContent = cd.text; el.className = `countdown ${cd.cls}`;
  }
  const k = `${now.getHours()}:${now.getMinutes()}`;
  if (k !== lastMinuteKey) {
    lastMinuteKey = k;
    checkNotifications();
    if (now.getMinutes() % 5 === 0 && !modal.open && !document.activeElement?.matches('input, textarea, select')) render();
  }
}, 15000);
checkNotifications();
setTimeout(backgroundSync, 1500);
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* hors ligne indisponible */ }));
}
// Revenir sur l'app (téléphone déverrouillé, onglet repris) : rafraîchir dates et comptes à rebours
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !modal.open && !document.activeElement?.matches('input, textarea, select')) { render(); backgroundSync(); }
});
