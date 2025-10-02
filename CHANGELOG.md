# Changelog

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Non publié]

### En cours de développement

- Améliorations de la documentation
- Préparation pour la publication publique

## [0.0.1] - 2024-10-02

### 🎉 Version initiale

Cette version initiale de **MapxAngular** inclut la bibliothèque **map-lib** avec les fonctionnalités suivantes :

### ✨ Ajouté

#### Composants de base
- **MapComponent** : Composant principal pour afficher les cartes interactives
- **LayerControlComponent** : Contrôle pour gérer l'affichage des couches
- **PlacesSearchComponent** : Recherche de lieux et d'adresses
- **PlusCodeCardComponent** : Gestion et affichage des codes Plus Code (OLC)
- **ClickedPointInfoComponent** : Affichage d'informations sur un point cliqué
- **ClickedPointPopupComponent** : Popup personnalisable pour les points cliqués
- **MapControlsComponent** : Contrôles de navigation sur la carte
- **ToastComponent** : Système de notifications toast

#### Services
- **MapService** : Service principal pour la gestion de la carte
- **IconService** : Création de marqueurs avec icônes personnalisées
- **PopupService** : Gestion des popups
- **PlacesService** : Service de recherche de lieux (Google Places API)
- **PlusCodeService** : Service pour les codes Open Location Code
- **ToastService** : Gestion des notifications toast
- **MapConfigService** : Configuration globale de la carte
- **PopupActionsService** : Gestion des actions dans les popups
- **AssetService** : Gestion des ressources

#### Fournisseurs de cartes
- **Leaflet Provider** : Support complet de Leaflet 1.9+
- **Mapbox Provider** : Support de Mapbox GL JS 3.2+
- **Factory Pattern** : Système de sélection dynamique du fournisseur

#### Fonctionnalités
- ✅ Support multi-fournisseurs (Leaflet/Mapbox)
- ✅ Système de couches avec gestion avancée
- ✅ Marqueurs personnalisés avec icônes Font Awesome
- ✅ Popups riches et personnalisables
- ✅ Recherche de lieux et adresses
- ✅ Support des Plus Codes (Open Location Code)
- ✅ Géolocalisation utilisateur
- ✅ Notifications toast élégantes
- ✅ Interface responsive
- ✅ TypeScript avec typage fort

#### Application de démonstration
- Application Angular standalone complète
- Exemples d'utilisation de toutes les fonctionnalités
- Interface utilisateur moderne et responsive

#### Documentation
- README principal avec présentation du projet
- README détaillé pour map-lib
- Guide de contribution (CONTRIBUTING.md)
- Licence MIT
- Structure de projet documentée

### 🛠️ Configuration

#### Dépendances principales
- Angular 18.2.0
- TypeScript 5.5.2
- Leaflet 1.9.4
- Mapbox GL JS 3.11.1
- Angular Material 18.2.13
- NGXS 19.0.0
- Font Awesome 6.7.2
- Phosphor Icons 2.1.2

#### Outils de développement
- Angular CLI 18.2.18
- Karma pour les tests
- ng-packagr pour la compilation de la bibliothèque

### 📝 Notes

#### Compatibilité
- Node.js 18+
- npm 9+
- Navigateurs modernes (Chrome, Firefox, Safari, Edge)

#### Fonctionnalités à venir
- Tests unitaires complets
- Tests E2E
- Thèmes personnalisables
- Plus d'exemples de fournisseurs de tuiles
- Mode hors ligne
- Support i18n

---

## Format des versions

Le versioning suit le format `MAJOR.MINOR.PATCH` :

- **MAJOR** : Changements incompatibles avec les versions précédentes
- **MINOR** : Ajout de fonctionnalités rétrocompatibles
- **PATCH** : Corrections de bugs rétrocompatibles

## Types de changements

- **✨ Ajouté** : Nouvelles fonctionnalités
- **🔄 Modifié** : Changements dans les fonctionnalités existantes
- **🗑️ Déprécié** : Fonctionnalités qui seront retirées prochainement
- **🔥 Retiré** : Fonctionnalités retirées
- **🐛 Corrigé** : Corrections de bugs
- **🔒 Sécurité** : Correctifs de sécurité

---

[Non publié]: https://github.com/nyawuwe/map-lib/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/nyawuwe/map-lib/releases/tag/v0.0.1
