# Activer les comptes (Firebase)

Environ 10 minutes, gratuit (offre « Spark », sans carte bancaire).
Tant que ce n'est pas fait, Saison fonctionne sans compte, sur chaque appareil.

## 1. Créer le projet

1. Ouvrez https://console.firebase.google.com et connectez-vous avec votre compte Google.
2. **Créer un projet** › nom : `saison` › vous pouvez désactiver Google Analytics › **Créer**.

## 2. Ajouter l'application Web

1. Sur la page du projet, cliquez sur l'icône **Web** `</>`.
2. Surnom : `Saison` › **Enregistrer l'application** (pas besoin de Firebase Hosting).
3. Firebase affiche un bloc `const firebaseConfig = { ... }`. Gardez-le ouvert.

## 3. Activer la connexion

1. Menu **Créer › Authentication** › **Commencer**.
2. Onglet **Méthode de connexion** :
   - **Adresse e-mail/Mot de passe** › Activer › Enregistrer.
   - **Google** › Activer › choisissez votre e-mail d'assistance › Enregistrer.
3. Onglet **Paramètres › Domaines autorisés** › **Ajouter un domaine** : `camillestocq.github.io`
   (`localhost` est déjà autorisé pour les tests.)

## 4. Créer la base de données

1. Menu **Créer › Firestore Database** › **Créer une base de données**.
2. Emplacement : `eur3 (europe-west)` › **Suivant** › **Démarrer en mode production** › **Créer**.
3. Onglet **Règles** : remplacez tout le contenu par celui du fichier `firestore.rules` du dépôt › **Publier**.

## 5. Brancher Saison

Ouvrez `firebase-config.js` et recopiez les valeurs du bloc `firebaseConfig` :

```js
window.FIREBASE_CONFIG = {
  apiKey: 'AIza…',
  authDomain: 'saison-xxxx.firebaseapp.com',
  projectId: 'saison-xxxx',
  storageBucket: 'saison-xxxx.firebasestorage.app',
  messagingSenderId: '123…',
  appId: '1:123…:web:…',
};
```

Ces valeurs ne sont pas secrètes : elles identifient le projet. Ce sont les règles de l'étape 4 qui protègent les données.

Publiez (push) : au prochain chargement, Saison demande de se connecter ou de créer un compte.

## Ce que voit chaque personne

- Un écran de connexion : Google, ou e-mail et mot de passe, ou « Essayer sans compte ».
- Au premier passage, le questionnaire de goûts, puis ses recommandations.
- Ses séries, synchronisées sur tous ses appareils. Hors connexion, l'app continue de fonctionner et se synchronise au retour du réseau.
- Si quelqu'un avait déjà des séries sur l'appareil sans compte, elles sont envoyées dans son compte à la première connexion.

## Limites de l'offre gratuite

50 000 lectures et 20 000 écritures par jour, 1 Go de données : largement suffisant pour un groupe d'amis ou une famille.
