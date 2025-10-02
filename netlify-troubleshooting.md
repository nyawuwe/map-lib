# Netlify - Guide de Dépannage 🔧

Ce guide contient les solutions aux problèmes courants lors du déploiement sur Netlify.

## ⚠️ Problèmes connus et solutions

### 1. Erreur : "Publish directory is configured incorrectly"

**Message d'erreur :**
```
Error: Publish directory is configured incorrectly.
Please set it to "dist/map-lib".
```

**Cause :**
Le plugin `@netlify/angular-runtime` détecte automatiquement Angular et pense que vous déployez la bibliothèque map-lib au lieu de la démo.

**Solution :**
Le fichier `netlify.toml` a été mis à jour pour désactiver le plugin Angular :

```toml
[[plugins]]
  package = "@netlify/plugin-angular"
  [plugins.inputs]
    enabled = false
```

### 2. Erreur : "Header has invalid source pattern"

**Message d'erreur :**
```
Header at index 2 has invalid `source` pattern "/(.*)\.(?:css|js)".
```

**Cause :**
Netlify n'accepte pas les regex dans les headers `for`, seulement les patterns simples.

**Solution :**
Utiliser `*.css` et `*.js` au lieu de patterns regex :

```toml
[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 3. Erreur : Conflits de dépendances (ERESOLVE)

**Message d'erreur :**
```
npm ERR! ERESOLVE could not resolve
npm ERR! peer dependency conflicts
```

**Solution :**
Le fichier `.npmrc` avec `legacy-peer-deps=true` résout automatiquement ce problème.

Vérifiez que `.npmrc` existe à la racine du projet :
```
legacy-peer-deps=true
```

### 4. Build timeout

**Problème :**
Le build prend trop de temps et timeout.

**Solution :**
Augmentez le timeout dans les paramètres Netlify :
1. Site settings → Build & deploy → Continuous Deployment
2. Build timeout : 15 minutes (au lieu de 5)

### 5. Out of memory

**Message d'erreur :**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solution :**
Ajoutez une variable d'environnement dans Netlify :
- Key: `NODE_OPTIONS`
- Value: `--max_old_space_size=4096`

## ✅ Configuration correcte

### netlify.toml

```toml
[build]
  command = "npm run build:lib && npm run build:demo"
  publish = "dist/demo/browser"

  [build.environment]
    NODE_VERSION = "18"
    NPM_VERSION = "9"

[[plugins]]
  package = "@netlify/plugin-angular"
  [plugins.inputs]
    enabled = false
```

### .npmrc

```
legacy-peer-deps=true
```

### package.json - Scripts

```json
{
  "scripts": {
    "build:lib": "ng build map-lib --configuration production",
    "build:demo": "ng build demo --configuration production"
  }
}
```

## 🔍 Vérifications avant déploiement

- [ ] Le fichier `.npmrc` existe et contient `legacy-peer-deps=true`
- [ ] Le fichier `netlify.toml` est configuré correctement
- [ ] Le plugin Angular est désactivé dans `netlify.toml`
- [ ] Les patterns de headers n'utilisent pas de regex
- [ ] La commande de build inclut `npm run build:lib`
- [ ] Le publish directory est `dist/demo/browser`

## 🧪 Tester localement avant de déployer

```bash
# Nettoyer
rm -rf dist node_modules/.cache

# Installer
npm install

# Build complet
npm run build:lib && npm run build:demo

# Vérifier que dist/demo/browser existe
ls dist/demo/browser
```

Si le build local fonctionne, il devrait fonctionner sur Netlify.

## 📊 Logs de build

Pour voir les logs détaillés :
1. Allez dans Deploys
2. Cliquez sur le deploy en cours/échoué
3. Consultez les logs complets

Recherchez ces messages clés :
- ✅ `Installing npm packages using npm version 9.9.4`
- ✅ `Build script started`
- ✅ `Built Angular Package`
- ✅ `Output location: dist/demo/browser`

## 🆘 Si rien ne fonctionne

### Option 1 : Build local et déploiement manuel

```bash
# Build local
npm run build:lib && npm run build:demo

# Déployer manuellement
netlify deploy --prod --dir=dist/demo/browser
```

### Option 2 : Désactiver complètement les plugins Netlify

Dans l'interface Netlify :
1. Site settings → Build & deploy → Plugins
2. Désactivez tous les plugins Angular

### Option 3 : Utiliser Vercel à la place

Vercel a généralement moins de problèmes avec les projets Angular complexes :

```bash
vercel --prod
```

## 📝 Rapport de bug

Si vous rencontrez un problème non documenté :

1. Collectez les informations :
   - Logs de build complets
   - Version de Node/npm
   - Contenu de `netlify.toml`
   - Message d'erreur exact

2. Ouvrez une issue : [GitHub Issues](https://github.com/nyawuwe/map-lib/issues)

---

**Dernière mise à jour :** 2 octobre 2024
