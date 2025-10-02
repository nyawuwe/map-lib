# Guide de Déploiement 🚀

Ce guide vous explique comment déployer l'application de démonstration **MapxAngular** sur Netlify ou Vercel.

## 📋 Table des matières

- [Préparation](#-préparation)
- [Déploiement sur Netlify](#-déploiement-sur-netlify)
- [Déploiement sur Vercel](#-déploiement-sur-vercel)
- [Configuration des variables d'environnement](#-configuration-des-variables-denvironnement)
- [Déploiement continu (CI/CD)](#-déploiement-continu-cicd)
- [Dépannage](#-dépannage)

## 🛠️ Préparation

### Prérequis

- Node.js 18+
- npm 9+
- Un compte GitHub
- Un compte Netlify OU Vercel

### 1. Tester le build localement

Avant de déployer, assurez-vous que le build fonctionne localement :

```bash
# Compiler la bibliothèque
npm run build:map-lib

# Compiler l'application de démonstration
npm run build:demo
```

Le build de production sera dans `dist/demo/browser/`

### 2. Pousser le code sur GitHub

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

## 🌐 Déploiement sur Netlify

### Option 1 : Déploiement via l'interface Netlify (Recommandé)

#### Étape 1 : Connexion

1. Allez sur [netlify.com](https://www.netlify.com/)
2. Connectez-vous avec votre compte GitHub
3. Cliquez sur **"Add new site"** > **"Import an existing project"**

#### Étape 2 : Configuration

1. Sélectionnez **GitHub** comme fournisseur
2. Autorisez Netlify à accéder à votre repository
3. Sélectionnez le repository `map-lib`

#### Étape 3 : Paramètres de build

Netlify détectera automatiquement le fichier `netlify.toml`, mais vérifiez :

```
Build command: npm run build:demo
Publish directory: dist/demo/browser
```

#### Étape 4 : Déployer

1. Cliquez sur **"Deploy site"**
2. Attendez que le build se termine (environ 2-5 minutes)
3. Votre site est en ligne ! 🎉

### Option 2 : Déploiement via CLI Netlify

#### Installation de Netlify CLI

```bash
npm install -g netlify-cli
```

#### Connexion et déploiement

```bash
# Se connecter à Netlify
netlify login

# Initialiser le site
netlify init

# Déployer
npm run deploy:netlify
```

### Configuration Netlify

Le fichier `netlify.toml` est déjà configuré avec :

- ✅ Redirection pour le routing Angular
- ✅ Headers de sécurité
- ✅ Optimisation du cache
- ✅ Compression des assets

## ▲ Déploiement sur Vercel

### Option 1 : Déploiement via l'interface Vercel (Recommandé)

#### Étape 1 : Connexion

1. Allez sur [vercel.com](https://vercel.com/)
2. Connectez-vous avec votre compte GitHub
3. Cliquez sur **"Add New..."** > **"Project"**

#### Étape 2 : Importation

1. Sélectionnez le repository `map-lib`
2. Cliquez sur **"Import"**

#### Étape 3 : Configuration

Vercel détectera automatiquement Angular, mais configurez :

**Framework Preset:** `Angular`

**Build Command:**
```
npm run build:demo
```

**Output Directory:**
```
dist/demo/browser
```

**Install Command:**
```
npm install
```

#### Étape 4 : Déployer

1. Cliquez sur **"Deploy"**
2. Attendez que le build se termine (environ 2-5 minutes)
3. Votre site est en ligne ! 🎉

### Option 2 : Déploiement via CLI Vercel

#### Installation de Vercel CLI

```bash
npm install -g vercel
```

#### Connexion et déploiement

```bash
# Se connecter à Vercel
vercel login

# Déployer
npm run deploy:vercel
```

Lors du premier déploiement, répondez aux questions :

```
? Set up and deploy "~/MapxAngular"? [Y/n] y
? Which scope do you want to deploy to? Your Name
? Link to existing project? [y/N] n
? What's your project's name? map-lib
? In which directory is your code located? ./
```

### Configuration Vercel

Le fichier `vercel.json` est déjà configuré avec :

- ✅ Redirection pour le routing Angular
- ✅ Headers de sécurité
- ✅ Optimisation du cache
- ✅ Région européenne (cdg1 - Paris)

## 🔐 Configuration des variables d'environnement

### Pour les clés API (optionnel)

Si vous utilisez des API comme Google Places ou Mapbox :

#### Sur Netlify

1. Allez dans **Site settings** > **Environment variables**
2. Ajoutez vos variables :
   - `GOOGLE_PLACES_API_KEY`
   - `MAPBOX_ACCESS_TOKEN`

#### Sur Vercel

1. Allez dans **Settings** > **Environment Variables**
2. Ajoutez vos variables :
   - `GOOGLE_PLACES_API_KEY`
   - `MAPBOX_ACCESS_TOKEN`

### Fichier .env (développement local)

Créez un fichier `.env` à la racine (déjà dans `.gitignore`) :

```env
GOOGLE_PLACES_API_KEY=votre_cle_google
MAPBOX_ACCESS_TOKEN=votre_token_mapbox
```

**⚠️ Important :** Ne committez JAMAIS ce fichier !

## 🔄 Déploiement continu (CI/CD)

### Configuration automatique

Une fois votre site connecté à GitHub :

#### Sur Netlify

- ✅ Déploiement automatique à chaque push sur `main`
- ✅ Preview deployments pour les Pull Requests
- ✅ Rollback facile vers les versions précédentes

#### Sur Vercel

- ✅ Déploiement automatique à chaque push sur `main`
- ✅ Preview deployments pour les Pull Requests
- ✅ Rollback facile vers les versions précédentes

### Branches de déploiement

Par défaut, seule la branche `main` déclenche un déploiement en production.

Pour ajouter d'autres branches :

**Netlify :** Site settings > Build & deploy > Deploy contexts

**Vercel :** Settings > Git > Production Branch

## 🐛 Dépannage

### Erreur : "Command not found: ng"

**Solution :** Assurez-vous que `@angular/cli` est dans les devDependencies

```bash
npm install --save-dev @angular/cli
```

### Erreur : "Module not found"

**Solution :** Vérifiez que toutes les dépendances sont installées

```bash
npm install
```

### Build réussit localement mais échoue en production

**Vérifications :**

1. Version de Node.js (doit être 18+)
2. Chemin de build : `dist/demo/browser`
3. Commande de build : `npm run build:demo`

### Page blanche après déploiement

**Causes possibles :**

1. **Routing Angular :** Vérifiez que les redirects sont configurés
   - Netlify : Vérifiez `netlify.toml`
   - Vercel : Vérifiez `vercel.json`

2. **Chemins absolus :** Dans `angular.json`, vérifiez :
   ```json
   "outputPath": "dist/demo/browser"
   ```

3. **Console du navigateur :** Ouvrez la console (F12) pour voir les erreurs

### Images ou assets ne chargent pas

**Solution :** Vérifiez dans `angular.json` :

```json
"assets": [
  {
    "glob": "**/*",
    "input": "projects/demo/public"
  }
]
```

## 📊 Performance et optimisation

### Budgets de build

Le projet est configuré avec des budgets dans `angular.json` :

```json
"budgets": [
  {
    "type": "initial",
    "maximumWarning": "500kB",
    "maximumError": "1MB"
  }
]
```

Si vous dépassez ces limites :

1. Activez le tree-shaking
2. Utilisez le lazy loading pour les modules
3. Optimisez les images
4. Réduisez les dépendances

### Lighthouse Score

Après déploiement, testez avec Lighthouse :

1. Ouvrez DevTools (F12)
2. Allez dans l'onglet **Lighthouse**
3. Lancez l'audit

**Objectifs :**
- Performance : 90+
- Accessibility : 90+
- Best Practices : 90+
- SEO : 90+

## 🔗 Domaines personnalisés

### Sur Netlify

1. Allez dans **Domain settings**
2. Cliquez sur **Add custom domain**
3. Suivez les instructions pour configurer le DNS

### Sur Vercel

1. Allez dans **Settings** > **Domains**
2. Ajoutez votre domaine
3. Suivez les instructions pour configurer le DNS

## 📈 Analytics (optionnel)

### Netlify Analytics

1. Allez dans **Analytics** dans le menu
2. Activez Netlify Analytics (4€/mois par site)

### Vercel Analytics

1. Allez dans **Analytics** dans le menu
2. Activez Vercel Analytics (gratuit pour les projets hobby)

## 🎉 Félicitations !

Votre application est maintenant déployée ! Partagez l'URL avec le monde ! 🌍

## 📚 Ressources

### Documentation Netlify

- [Netlify Docs](https://docs.netlify.com/)
- [Angular on Netlify](https://docs.netlify.com/integrations/frameworks/angular/)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/)

### Documentation Vercel

- [Vercel Docs](https://vercel.com/docs)
- [Angular on Vercel](https://vercel.com/docs/frameworks/angular)
- [Vercel CLI](https://vercel.com/docs/cli)

---

<div align="center">

**Besoin d'aide ?** Ouvrez une [issue](https://github.com/nyawuwe/map-lib/issues) !

[⬆ Retour en haut](#guide-de-déploiement-)

</div>
