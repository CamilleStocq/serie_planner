# Saison — suivi de séries TV

Application web sans installation ni dépendance : HTML, CSS et JavaScript.

En ligne : https://camillestocq.github.io/serie_planner/

## Sur le téléphone

Saison est pensée d'abord pour le téléphone et s'installe comme une app :

- **iPhone** : ouvrez le site dans Safari, touchez Partager, puis « Sur l'écran d'accueil ».
- **Android** : ouvrez le site dans Chrome, puis « Installer l'application » (ou Réglages › Installer dans Saison).

Une fois installée, elle s'ouvre en plein écran et fonctionne même avec une connexion faible.

## Lancer en local

```bash
node serve.js
```

Puis ouvrez http://localhost:5173.

## Catalogue de séries

Aucune clé ni compte n'est nécessaire.

- **TVmaze** fournit les séries du monde entier : affiches, images, saisons, épisodes, dates et heures de diffusion (converties dans votre fuseau), chaîne ou plateforme d'origine.
- **Wikidata** permet de chercher par titre français (« La Servante écarlate », « Les Simpson »…) et retrouve la bonne fiche.

Les résumés fournis par TVmaze sont souvent en anglais ; ils sont modifiables sur chaque fiche. Les séries en diffusion sont mises à jour automatiquement toutes les 12 h.

Une série absente du catalogue peut être ajoutée manuellement.

## Données

- Tout est enregistré dans le navigateur (localStorage), sur cet appareil uniquement.
- Réglages › Données : export et import JSON pour sauvegarder ou changer de navigateur.
- Réglages › Agenda : export `.ics` des prochaines sorties, avec rappels.

## Fichiers

- `index.html` : structure
- `styles.css` : design (thèmes sombre et clair)
- `app.js` : logique (état, catalogue, épisodes, calendrier, rappels)
- `sw.js` : mise en cache pour l'usage hors connexion
- `manifest.webmanifest`, `icons/` : installation sur l'écran d'accueil
- `serve.js` : petit serveur local

Données des séries : TVmaze (CC BY-SA) et Wikidata (CC0).
