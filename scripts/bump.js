// Passe à la version suivante avant une publication : node scripts/bump.js
// Met à jour, d'un coup : APP_VERSION (app.js), version.json, les ?v= de index.html
// et le nom du cache du service worker. Les téléphones détectent alors la nouvelle
// version et se mettent à jour tout seuls.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const file = name => path.join(root, name);

let app = fs.readFileSync(file('app.js'), 'utf8');
const current = +(app.match(/const APP_VERSION = '(\d+)'/) || [])[1];
if (!current) throw new Error('APP_VERSION introuvable dans app.js');
const next = String(current + 1);

app = app.replace(/const APP_VERSION = '\d+'/, `const APP_VERSION = '${next}'`);
fs.writeFileSync(file('app.js'), app);
fs.writeFileSync(file('version.json'), JSON.stringify({ v: next }) + '\n');
fs.writeFileSync(file('index.html'), fs.readFileSync(file('index.html'), 'utf8').replace(/\?v=\d+/g, `?v=${next}`));
fs.writeFileSync(file('sw.js'), fs.readFileSync(file('sw.js'), 'utf8').replace(/saison-app-v\d+/, `saison-app-v${next}`));
console.log(`Version ${current} → ${next}`);
