// Comptes et synchronisation (Firebase Auth + Firestore).
// Chargé en module ; ne fait rien tant que firebase-config.js est vide.
//
// Stockage par utilisateur :
//   users/{uid}               → réglages, plateformes, profil
//   users/{uid}/shows/{id}    → une série (avec ses épisodes)
const cfg = window.FIREBASE_CONFIG || {};
const App = window.SaisonApp;

if (cfg.apiKey && App) {
  const V = '10.14.1';
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);

  const app = initializeApp(cfg);
  const auth = A.getAuth(app);
  A.setPersistence(auth, A.browserLocalPersistence).catch(() => {});
  let db;
  try {
    db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  } catch {
    db = F.getFirestore(app);
  }

  const clean = v => JSON.parse(JSON.stringify(v)); // Firestore refuse les valeurs undefined
  // Firestore ne garde pas l'ordre des clés : on compare des JSON triés
  const sortKeys = v => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])) : v;
  const stable = v => JSON.stringify(sortKeys(clean(v)));
  const metaOf = s => clean({ settings: s.settings, platforms: s.platforms, profile: s.profile || null, dismissed: s.dismissed || [], version: s.version || 1 });

  let uid = null;
  let unsubs = [];
  let synced = new Map(); // id de série → JSON envoyé / reçu
  let syncedMeta = '';
  let timer = 0;
  let writing = false;

  function stop() { unsubs.forEach(u => u()); unsubs = []; synced = new Map(); syncedMeta = ''; clearTimeout(timer); }

  async function pushAll(state) {
    const ops = [['meta', null, metaOf(state)], ...state.shows.map(s => ['show', s.id, clean(s)])];
    for (let i = 0; i < ops.length; i += 400) {
      const batch = F.writeBatch(db);
      for (const [kind, id, data] of ops.slice(i, i + 400)) {
        batch.set(kind === 'meta' ? F.doc(db, 'users', uid) : F.doc(db, 'users', uid, 'shows', id), { ...data, _at: Date.now() });
      }
      await batch.commit();
    }
    syncedMeta = stable(metaOf(state));
    synced = new Map(state.shows.map(s => [s.id, stable(s)]));
  }

  async function start(user) {
    stop();
    uid = user.uid;
    const metaRef = F.doc(db, 'users', uid);
    const showsRef = F.collection(db, 'users', uid, 'shows');
    App.setSyncStatus('sync');
    try {
      const [metaSnap, showsSnap] = await Promise.all([F.getDoc(metaRef), F.getDocs(showsRef)]);
      if (!metaSnap.exists() && showsSnap.empty) {
        // Premier passage de ce compte : on envoie ce qui est sur l'appareil
        await pushAll(App.getState());
      } else {
        const strip = d => { const { _at, ...rest } = d; return rest; };
        const shows = showsSnap.docs.map(d => strip(d.data()));
        const meta = metaSnap.exists() ? strip(metaSnap.data()) : {};
        App.applyRemote({ ...meta, shows });
        const st = App.getState();
        syncedMeta = stable(metaOf(st));
        synced = new Map(st.shows.map(s => [s.id, stable(s)]));
      }
      App.setSyncStatus('ok');
    } catch (err) {
      console.error(err);
      App.setSyncStatus('error');
    }

    // Changements venant d'un autre appareil
    unsubs.push(F.onSnapshot(showsRef, snap => {
      if (snap.metadata.hasPendingWrites || writing) return;
      const upserts = [], removed = [];
      for (const ch of snap.docChanges()) {
        const { _at, ...data } = ch.doc.data();
        if (ch.type === 'removed') { if (synced.has(ch.doc.id)) { removed.push(ch.doc.id); synced.delete(ch.doc.id); } continue; }
        const json = stable(data);
        if (synced.get(ch.doc.id) === json) continue;
        synced.set(ch.doc.id, json);
        upserts.push(data);
      }
      if (upserts.length || removed.length) App.applyRemoteShows(upserts, removed);
    }, err => { console.error(err); App.setSyncStatus('error'); }));
    unsubs.push(F.onSnapshot(metaRef, snap => {
      if (!snap.exists() || snap.metadata.hasPendingWrites || writing) return;
      const { _at, ...meta } = snap.data();
      const json = stable(meta);
      if (json === syncedMeta) return;
      syncedMeta = json;
      App.applyRemoteMeta(meta);
    }));
  }

  // Envoie seulement ce qui a changé depuis la dernière synchro
  async function flush() {
    if (!uid) return;
    const state = App.getState();
    const batch = F.writeBatch(db);
    let n = 0;
    const meta = metaOf(state);
    const metaJson = stable(meta);
    if (metaJson !== syncedMeta) { batch.set(F.doc(db, 'users', uid), { ...meta, _at: Date.now() }); syncedMeta = metaJson; n++; }
    const ids = new Set();
    for (const s of state.shows) {
      ids.add(s.id);
      const data = clean(s);
      const json = stable(data);
      if (synced.get(s.id) === json) continue;
      batch.set(F.doc(db, 'users', uid, 'shows', s.id), { ...data, _at: Date.now() });
      synced.set(s.id, json);
      if (++n >= 450) break;
    }
    for (const id of [...synced.keys()]) {
      if (ids.has(id)) continue;
      batch.delete(F.doc(db, 'users', uid, 'shows', id));
      synced.delete(id);
      if (++n >= 450) break;
    }
    if (!n) return;
    writing = true;
    App.setSyncStatus('sync');
    try { await batch.commit(); App.setSyncStatus('ok'); }
    catch (err) { console.error(err); App.setSyncStatus('error'); synced = new Map(); syncedMeta = ''; }
    finally { writing = false; }
    if (n >= 450) flush();
  }

  const errorText = err => ({
    'auth/invalid-email': 'Cette adresse e-mail n\'est pas valide.',
    'auth/missing-password': 'Indiquez votre mot de passe.',
    'auth/weak-password': 'Choisissez un mot de passe d\'au moins 6 caractères.',
    'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse. Connectez-vous plutôt.',
    'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
    'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
    'auth/user-not-found': 'Aucun compte avec cette adresse. Créez-en un.',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
    'auth/network-request-failed': 'Pas de connexion internet. Vérifiez le réseau puis réessayez.',
    'auth/popup-closed-by-user': 'La fenêtre Google a été fermée avant la fin.',
    'auth/unauthorized-domain': 'Ce site n\'est pas encore autorisé dans Firebase (Authentication › Paramètres › Domaines autorisés).',
    'auth/operation-not-allowed': 'Ce mode de connexion n\'est pas activé dans Firebase (Authentication › Méthodes de connexion).',
  }[err?.code] || 'La connexion a échoué. Réessayez dans un instant.');

  window.cloud = {
    enabled: true,
    async signInGoogle() {
      const provider = new A.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try { await A.signInWithPopup(auth, provider); }
      catch (err) {
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') return A.signInWithRedirect(auth, provider);
        throw err;
      }
    },
    async signUp(email, password, name) {
      const cred = await A.createUserWithEmailAndPassword(auth, email, password);
      if (name) await A.updateProfile(cred.user, { displayName: name }).catch(() => {});
    },
    signIn: (email, password) => A.signInWithEmailAndPassword(auth, email, password),
    reset: email => A.sendPasswordResetEmail(auth, email),
    signOut: async () => { await flush().catch(() => {}); stop(); uid = null; await A.signOut(auth); },
    queueSync() { clearTimeout(timer); timer = setTimeout(flush, 900); },
    flush,
    errorText,
  };

  A.getRedirectResult(auth).catch(err => App.authError?.(errorText(err)));
  A.onAuthStateChanged(auth, user => {
    const u = user ? { uid: user.uid, email: user.email || '', name: user.displayName || '', photo: user.photoURL || '' } : null;
    App.onAuth(u);
    if (user) start(user); else stop();
  });
  window.addEventListener('pagehide', () => { if (uid) flush(); });
} else if (App) {
  App.onAuth(undefined); // pas de comptes configurés : mode local
}
