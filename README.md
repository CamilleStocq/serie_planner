# Saison — suivi de séries TV

Application web sans installation ni dépendance : HTML, CSS et JavaScript.

## Lancer

```bash
node serve.js
```

Puis ouvrez http://localhost:5173. Ouvrir `index.html` directement marche aussi, mais les notifications ont besoin de `localhost`.

## Connecter TMDB (recommandé)

1. Créez un compte gratuit sur themoviedb.org.
2. Dans Paramètres › API, copiez la **clé d'API (v3)** ou le **jeton d'accès en lecture (v4)**.
3. Dans Saison, allez dans **Réglages › Connexion TMDB**, collez la clé, puis cliquez sur **Tester et enregistrer**.

Sans clé, l'ajout manuel fonctionne quand même.

## Données

- Tout est enregistré dans le navigateur (localStorage), sur cet appareil uniquement.
- Réglages › Données : export et import JSON pour sauvegarder ou changer de navigateur.
- Réglages › Agenda : export `.ics` des prochaines sorties, avec rappels, pour Google Agenda, Outlook ou Apple Calendrier.

## Fichiers

- `index.html` : structure
- `styles.css` : design (thèmes sombre et clair)
- `app.js` : logique (état, TMDB, épisodes, calendrier, rappels)
- `serve.js` : petit serveur local
