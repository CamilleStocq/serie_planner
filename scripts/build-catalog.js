// Construit catalog.json : les séries les plus suivies du catalogue TVmaze,
// sous une forme compacte utilisée pour les recommandations.
// Usage : node scripts/build-catalog.js   (≈ 3 à 5 minutes)
// Données TVmaze sous licence CC BY-SA.
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'catalog.json');
const KEEP = 2200;
const PER_LANG = 150;
const EXTRA_LANGS = ['French', 'Korean', 'Japanese', 'Spanish', 'German']; // langues du questionnaire
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function page(n) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(`https://api.tvmaze.com/shows?page=${n}`);
    if (r.status === 404) return null;
    if (r.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
    if (!r.ok) throw new Error(`HTTP ${r.status} page ${n}`);
    return r.json();
  }
  throw new Error(`Trop de tentatives page ${n}`);
}
const domainOf = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

(async () => {
  const all = [];
  for (let n = 0; ; n++) {
    const shows = await page(n);
    if (!shows) break;
    for (const s of shows) {
      if (!['Scripted', 'Animation'].includes(s.type)) continue;
      if (!s.image?.medium || !s.genres?.length) continue;
      if ((s.weight || 0) < (s.language === 'English' ? 60 : 30)) continue;
      const o = s.webChannel || s.network;
      all.push({
        id: s.id,
        n: s.name,
        g: s.genres,
        l: s.language || '',
        y: +(s.premiered || '').slice(0, 4) || 0,
        st: s.status === 'Ended' ? 0 : 1,
        rt: s.averageRuntime || s.runtime || 0,
        r: s.rating?.average || 0,
        w: s.weight || 0,
        i: s.image.medium.replace('https://static.tvmaze.com/uploads/images/', ''),
        p: o ? o.name : '',
        c: s.network?.country?.code || s.webChannel?.country?.code || '',
        d: domainOf(o?.officialSite || ''),
        an: s.type === 'Animation' ? 1 : 0,
      });
    }
    process.stdout.write(`\rpage ${n} · ${all.length} séries retenues`);
    await sleep(550);
  }
  all.sort((a, b) => b.w - a.w || b.r - a.r);
  // Les plus suivies au total, plus les meilleures de chaque autre langue
  const picked = new Map(all.slice(0, KEEP).map(s => [s.id, s]));
  const byLang = {};
  for (const s of all) {
    if (!EXTRA_LANGS.includes(s.l)) continue;
    byLang[s.l] = (byLang[s.l] || 0) + 1;
    if (byLang[s.l] <= PER_LANG) picked.set(s.id, s);
  }
  const out = [...picked.values()].sort((a, b) => b.w - a.w || b.r - a.r);
  fs.writeFileSync(OUT, JSON.stringify({ v: 1, built: new Date().toISOString().slice(0, 10), shows: out }));
  console.log(`\n${out.length} séries écrites dans catalog.json (${Math.round(fs.statSync(OUT).size / 1024)} Ko)`);
})().catch(e => { console.error(e); process.exit(1); });
