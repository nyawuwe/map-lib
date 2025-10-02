# Guide de Contribution 🤝

Merci de votre intérêt pour contribuer à **MapxAngular** ! Ce document fournit des lignes directrices pour contribuer au projet.

## 📋 Table des matières

- [Code de Conduite](#-code-de-conduite)
- [Comment contribuer](#-comment-contribuer)
- [Configuration de l'environnement de développement](#️-configuration-de-lenvironnement-de-développement)
- [Standards de code](#-standards-de-code)
- [Processus de Pull Request](#-processus-de-pull-request)
- [Processus de signalement de bugs](#-processus-de-signalement-de-bugs)
- [Proposer de nouvelles fonctionnalités](#-proposer-de-nouvelles-fonctionnalités)
- [Documentation](#-documentation)

## 📜 Code de Conduite

En participant à ce projet, vous acceptez de respecter notre code de conduite :

- Soyez respectueux et inclusif
- Acceptez les critiques constructives
- Concentrez-vous sur ce qui est meilleur pour la communauté
- Faites preuve d'empathie envers les autres membres de la communauté

## 🚀 Comment contribuer

Il existe plusieurs façons de contribuer au projet :

### 1. Signaler des bugs 🐛

Si vous trouvez un bug, veuillez [ouvrir une issue](https://github.com/nyawuwe/map-lib/issues/new) en incluant :

- Une description claire du problème
- Les étapes pour reproduire le bug
- Le comportement attendu vs le comportement actuel
- Des captures d'écran si applicable
- Votre environnement (OS, navigateur, versions)

### 2. Suggérer des améliorations 💡

Pour proposer une nouvelle fonctionnalité :

- Vérifiez d'abord qu'elle n'a pas déjà été proposée
- Ouvrez une issue avec le label "enhancement"
- Décrivez clairement la fonctionnalité et son utilité
- Expliquez comment elle s'intègre dans le projet

### 3. Soumettre du code 💻

- Fork le repository
- Créez une branche pour votre fonctionnalité
- Codez en suivant les standards du projet
- Testez votre code
- Soumettez une Pull Request

## 🛠️ Configuration de l'environnement de développement

### Prérequis

- **Node.js** : version 18 ou supérieure
- **npm** : version 9 ou supérieure
- **Angular CLI** : version 18 ou supérieure
- **Git** : dernière version

### Installation

1. **Forker et cloner le repository**

```bash
git clone https://github.com/nyawuwe/map-lib.git
cd MapxAngular
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Installer Angular CLI globalement (si nécessaire)**

```bash
npm install -g @angular/cli@18
```

4. **Compiler la bibliothèque map-lib**

```bash
npm run build map-lib
```

5. **Lancer l'application de démonstration**

```bash
npm start
```

L'application sera accessible sur `http://localhost:4200/`

### Structure du projet

```
MapxAngular/
├── projects/
│   ├── map-lib/          # Bibliothèque principale
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── components/
│   │   │   │   ├── services/
│   │   │   │   ├── models/
│   │   │   │   └── providers/
│   │   │   └── public-api.ts
│   │   └── package.json
│   │
│   └── demo/             # Application de démonstration
│       └── src/
│           └── app/
│               └── map-demo/
│
├── dist/                 # Builds
├── .github/             # Configuration GitHub
└── ...
```

## 📏 Standards de code

### TypeScript

- Utilisez TypeScript strict mode
- Respectez les règles ESLint configurées
- Documentez les fonctions publiques avec JSDoc
- Utilisez des noms de variables explicites
- Préférez les arrow functions pour les callbacks

**Exemple :**

```typescript
/**
 * Crée un marqueur avec une icône personnalisée
 * @param coordinates - Coordonnées [latitude, longitude]
 * @param options - Options de configuration de l'icône
 * @returns Un marqueur Leaflet configuré
 */
public createMarkerWithIcon(
  coordinates: [number, number],
  options: IconOptions
): L.Marker {
  // Implementation
}
```

### HTML/Templates

- Utilisez des noms de classes sémantiques
- Suivez les conventions Angular pour les templates
- Évitez la logique complexe dans les templates
- Utilisez `trackBy` pour les `*ngFor`

### CSS/SCSS

- Utilisez BEM ou une méthodologie similaire
- Préférez les variables CSS pour les couleurs et espacements
- Évitez les sélecteurs trop spécifiques
- Rendez les composants réutilisables

**Exemple :**

```css
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-container__controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
}
```

### Commits

Suivez la convention [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types de commits :**

- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Modification de la documentation
- `style`: Changements de formatage (pas de changement de code)
- `refactor`: Refactoring du code
- `test`: Ajout ou modification de tests
- `chore`: Tâches de maintenance

**Exemples :**

```bash
feat(map): add zoom control component
fix(popup): correct popup positioning on mobile
docs(readme): update installation instructions
refactor(services): simplify map service initialization
```

## 🔄 Processus de Pull Request

### Avant de soumettre

1. **Mettez à jour votre branche** avec la dernière version de `main`

```bash
git checkout main
git pull origin main
git checkout votre-branche
git rebase main
```

2. **Testez votre code**

```bash
npm test
npm run build
```

3. **Vérifiez le linting**

```bash
npm run lint
```

4. **Mettez à jour la documentation** si nécessaire

### Soumettre la PR

1. **Pushez votre branche**

```bash
git push origin votre-branche
```

2. **Créez la Pull Request** sur GitHub

3. **Remplissez le template de PR** avec :
   - Description des changements
   - Issue(s) associée(s)
   - Type de changement (bug fix, feature, etc.)
   - Captures d'écran si applicable
   - Checklist des tests effectués

### Template de PR

```markdown
## Description
[Décrivez vos changements]

## Type de changement
- [ ] Bug fix
- [ ] Nouvelle fonctionnalité
- [ ] Breaking change
- [ ] Documentation

## Issues liées
Closes #[numéro]

## Checklist
- [ ] Mon code suit les standards du projet
- [ ] J'ai effectué une auto-review
- [ ] J'ai commenté les parties complexes
- [ ] J'ai mis à jour la documentation
- [ ] Mes changements ne génèrent pas de warnings
- [ ] J'ai ajouté des tests
- [ ] Les tests passent localement
```

## 🐛 Processus de signalement de bugs

### Template d'issue pour bug

```markdown
## Description du bug
[Description claire et concise]

## Étapes pour reproduire
1. Aller à '...'
2. Cliquer sur '...'
3. Scroller jusqu'à '...'
4. Voir l'erreur

## Comportement attendu
[Ce qui devrait se passer]

## Comportement actuel
[Ce qui se passe réellement]

## Captures d'écran
[Si applicable]

## Environnement
- OS: [ex. Windows 10]
- Navigateur: [ex. Chrome 120]
- Version Angular: [ex. 18.2.0]
- Version de map-lib: [ex. 0.0.1]

## Contexte additionnel
[Toute autre information pertinente]
```

## 💡 Proposer de nouvelles fonctionnalités

### Template d'issue pour feature

```markdown
## Problème à résoudre
[Décrivez le problème que cette fonctionnalité résoudrait]

## Solution proposée
[Décrivez votre solution]

## Alternatives considérées
[Décrivez les alternatives que vous avez envisagées]

## Bénéfices
[Comment cela améliorerait le projet]

## Exemples d'utilisation
```typescript
// Code exemple
```

## Impacts potentiels
[Breaking changes, dépendances, etc.]
```

## 📖 Documentation

### Documentation du code

- Utilisez JSDoc pour documenter les fonctions publiques
- Expliquez le "pourquoi" pas seulement le "quoi"
- Mettez à jour le README.md si nécessaire
- Ajoutez des exemples d'utilisation

### Documentation utilisateur

- Mettez à jour le README principal si vous ajoutez des fonctionnalités
- Mettez à jour le README de map-lib pour les changements d'API
- Ajoutez des exemples dans l'application de démonstration
- Créez des guides si nécessaire

## 🧪 Tests

### Tests unitaires

```bash
# Exécuter tous les tests
npm test

# Exécuter les tests avec couverture
npm run test:coverage

# Exécuter les tests en mode watch
npm run test:watch
```

### Tests E2E

```bash
# Exécuter les tests E2E
npm run e2e
```

### Écrire des tests

- Testez les cas normaux et les cas limites
- Utilisez des noms de tests descriptifs
- Moquez les dépendances externes
- Visez une couverture > 80%

**Exemple :**

```typescript
describe('MapService', () => {
  it('should create a map instance with correct center', () => {
    const center: [number, number] = [48.8566, 2.3522];
    const map = service.createMap(center, 13);

    expect(map.getCenter().lat).toBe(48.8566);
    expect(map.getCenter().lng).toBe(2.3522);
  });

  it('should handle invalid coordinates gracefully', () => {
    expect(() => service.createMap([91, 0], 13)).toThrow();
  });
});
```

## ⚡ Workflow de développement

### 1. Créer une branche

```bash
git checkout -b feature/nom-de-la-feature
# ou
git checkout -b fix/nom-du-bug
```

### 2. Développer et tester

```bash
# Compiler la lib en mode watch
npm run build map-lib -- --watch

# Dans un autre terminal, lancer la démo
npm start
```

### 3. Commit et push

```bash
git add .
git commit -m "feat(map): add new feature"
git push origin feature/nom-de-la-feature
```

### 4. Créer la PR

Créez la Pull Request sur GitHub et attendez la review.

## 🎯 Bonnes pratiques

### Code

- ✅ Écrivez du code propre et maintenable
- ✅ Suivez le principe DRY (Don't Repeat Yourself)
- ✅ Utilisez des noms explicites
- ✅ Gardez les fonctions courtes et focalisées
- ✅ Commentez le code complexe

### Git

- ✅ Faites des commits atomiques
- ✅ Écrivez des messages de commit clairs
- ✅ Rebasez avant de merger
- ✅ Gardez votre branche à jour

### Communication

- ✅ Soyez respectueux et professionnel
- ✅ Expliquez clairement vos changements
- ✅ Répondez aux commentaires de review
- ✅ Demandez de l'aide si nécessaire

## 🏆 Reconnaissance

Tous les contributeurs seront ajoutés au fichier CONTRIBUTORS.md et mentionnés dans les release notes.

## ❓ Questions

Si vous avez des questions :

1. Consultez la [documentation](README.md)
2. Cherchez dans les [issues existantes](https://github.com/nyawuwe/map-lib/issues)
3. Ouvrez une [nouvelle issue](https://github.com/nyawuwe/map-lib/issues/new) avec le label "question"

---

## 📞 Contact

Pour toute question ou suggestion concernant ce guide de contribution, n'hésitez pas à ouvrir une issue.

**Merci de contribuer à MapxAngular ! 🎉**

---

<div align="center">

[⬆ Retour en haut](#guide-de-contribution-)

</div>
