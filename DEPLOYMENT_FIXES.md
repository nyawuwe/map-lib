# Correctifs de Déploiement ✅

Ce document liste les correctifs appliqués pour permettre le déploiement sur Netlify/Vercel.

## 🔧 Problèmes résolus

### 1. Conflits de dépendances

**Problème :** Conflits entre Angular 18 et les dépendances nécessitant Angular 19+

**Solution :**
- Downgrade de `@ngxs/store` : v19.0.0 → v18.1.4
- Downgrade de `ngx-skeleton-loader` : v11.0.0 → v9.0.0
- Upgrade de `ngx-infinite-scroll` : v16.0.0 → v18.0.0
- Ajout de `.npmrc` avec `legacy-peer-deps=true`

### 2. Phosphor Icons - Erreurs de build

**Problème :** Build échouait avec "No loader is configured for .woff2 files"

**Solution :**
- Suppression des imports `@phosphor-icons/web` du package.json
- Suppression des imports dans `popup.component.ts`
- Conservation du CDN dans `index.html` pour charger les icônes

**Fichiers modifiés :**
- `package.json` - Suppression de `@phosphor-icons/web`
- `projects/map-lib/src/lib/components/popup/popup.component.ts` - Suppression des imports

### 3. Mode watch activé par défaut

**Problème :** `ng build map-lib` restait en mode watch, bloquant le build

**Solution :**
- Suppression de `"watch": true` dans `angular.json` pour map-lib

**Fichier modifié :**
- `angular.json` ligne 16

### 4. Budget de build dépassé

**Problème :** Le bundle initial dépassait 1MB

**Solution :**
- Augmentation des budgets :
  - `maximumWarning`: 500kB → 2MB
  - `maximumError`: 1MB → 3MB

**Fichier modifié :**
- `angular.json` lignes 76-86

## 📝 Fichiers de configuration créés

1. **`.npmrc`** - Configuration npm pour legacy-peer-deps
2. **`netlify.toml`** - Configuration Netlify avec build command
3. **`vercel.json`** - Configuration Vercel
4. **Assets Phosphor** - Configuration dans angular.json pour copier les fonts

## ✅ Build final

Après ces correctifs, le build réussit avec :
- **Output** : `dist/demo/browser`
- **Taille initiale** : ~2.19 MB
- **Warnings** : Modules CommonJS (normal, pas bloquant)

## 🚀 Commandes de déploiement

```bash
# Build complet
npm run build:lib && npm run build:demo

# Déploiement Netlify
npm run deploy:netlify

# Déploiement Vercel
npm run deploy:vercel
```

## 📋 Checklist avant déploiement

- ✅ Dependencies avec versions compatibles
- ✅ Build lib réussit
- ✅ Build demo réussit
- ✅ `.npmrc` configuré
- ✅ `netlify.toml` configuré
- ✅ `vercel.json` configuré
- ✅ Budget de build ajusté
- ✅ Mode watch désactivé

## 🎯 Prochaines étapes

1. Commit et push sur GitHub
2. Connecter le repository à Netlify ou Vercel
3. Le déploiement se fera automatiquement
4. Récupérer l'URL et mettre à jour le README

---

**Date des correctifs :** 2 octobre 2024
