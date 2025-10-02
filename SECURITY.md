# Politique de Sécurité

## 🔒 Versions supportées

Nous publions des correctifs de sécurité pour les versions suivantes de MapxAngular :

| Version | Supportée          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

**Note :** Nous encourageons tous les utilisateurs à toujours utiliser la dernière version stable pour bénéficier des derniers correctifs de sécurité.

## 🐛 Signaler une vulnérabilité

La sécurité de MapxAngular est prise très au sérieux. Si vous découvrez une vulnérabilité de sécurité, merci de nous aider à la résoudre de manière responsable.

### ⚠️ NE PAS créer d'issue publique

**Important :** Pour des raisons de sécurité, **ne créez PAS d'issue publique** pour les vulnérabilités de sécurité.

### 📧 Comment signaler

1. **Email** : Envoyez un email détaillé à `security@votre-domaine.com` (à configurer)

2. **GitHub Security Advisories** : Utilisez la fonctionnalité [Security Advisories](https://github.com/nyawuwe/map-lib/security/advisories) de GitHub

3. **Informations à inclure** :
   - Type de vulnérabilité
   - Chemin complet du ou des fichiers source concernés
   - Emplacement du code affecté (tag/branche/commit ou URL directe)
   - Configuration spéciale requise pour reproduire le problème
   - Instructions étape par étape pour reproduire le problème
   - Preuve de concept ou code d'exploitation (si possible)
   - Impact de la vulnérabilité et comment un attaquant pourrait l'exploiter

### 📋 Processus de traitement

Lorsque vous signalez une vulnérabilité :

1. **Accusé de réception** : Vous recevrez un accusé de réception dans les 48 heures
2. **Évaluation** : Nous évaluerons la vulnérabilité et déterminerons son impact
3. **Communication** : Nous vous tiendrons informé de l'avancement de la résolution
4. **Correctif** : Nous développerons et testerons un correctif
5. **Publication** : Nous publierons le correctif et une advisory de sécurité
6. **Reconnaissance** : Si vous le souhaitez, nous vous mentionnerons dans les notes de version

**Délais attendus :**
- Réponse initiale : 48 heures
- Évaluation de l'impact : 1 semaine
- Publication du correctif : Selon la criticité (voir ci-dessous)

### 🎯 Niveaux de criticité

| Niveau | Description | Délai de correction |
|--------|-------------|-------------------|
| 🔴 **Critique** | Exploitation active, exposition de données sensibles | 24-48 heures |
| 🟠 **Élevé** | Vulnérabilité sérieuse nécessitant une action rapide | 1 semaine |
| 🟡 **Moyen** | Vulnérabilité avec impact limité | 2-4 semaines |
| 🟢 **Faible** | Problème de sécurité mineur | Prochaine version |

## 🛡️ Pratiques de sécurité

### Pour les développeurs

Si vous contribuez au projet, suivez ces pratiques de sécurité :

#### ✅ À faire

- **Validation des entrées** : Validez toutes les entrées utilisateur
- **Échappement des données** : Échappez correctement les données avant affichage
- **Gestion des secrets** : N'incluez jamais de clés API ou secrets dans le code
- **Dépendances** : Maintenez les dépendances à jour
- **HTTPS** : Utilisez toujours HTTPS pour les requêtes externes
- **CSP** : Implémentez une Content Security Policy appropriée
- **Authentification** : Utilisez des mécanismes d'authentification sécurisés

#### ❌ À éviter

- N'utilisez pas `eval()` ou fonctions similaires
- N'injectez pas de HTML non sanitisé
- Ne stockez pas de données sensibles dans localStorage sans chiffrement
- N'exposez pas d'endpoints API sans authentification appropriée
- Ne committez pas de fichiers `.env` ou contenant des secrets

### Pour les utilisateurs

#### Configuration sécurisée

1. **Clés API** : Stockez vos clés API de manière sécurisée
   ```typescript
   // ❌ Mauvais
   const apiKey = 'ma_cle_api_en_dur';

   // ✅ Bon
   const apiKey = process.env['GOOGLE_PLACES_API_KEY'];
   ```

2. **Variables d'environnement** : Utilisez des fichiers `.env` (jamais committés)
   ```bash
   # .env
   GOOGLE_PLACES_API_KEY=votre_cle
   MAPBOX_ACCESS_TOKEN=votre_token
   ```

3. **Restrictions d'API** : Configurez des restrictions sur vos clés API
   - Restrictions par domaine
   - Restrictions par adresse IP
   - Quotas d'utilisation

#### Mise à jour

- 🔄 Mettez régulièrement à jour vers la dernière version
- 📢 Surveillez les annonces de sécurité
- 🔍 Auditez vos dépendances avec `npm audit`

```bash
# Vérifier les vulnérabilités
npm audit

# Corriger automatiquement si possible
npm audit fix

# Forcer les corrections (attention aux breaking changes)
npm audit fix --force
```

## 🔐 Sécurité des dépendances

### Audit automatique

Nous utilisons plusieurs outils pour maintenir la sécurité :

- **npm audit** : Audit de sécurité des dépendances npm
- **Dependabot** : Mises à jour automatiques des dépendances
- **CodeQL** : Analyse de code statique (si activé)
- **Snyk** : Monitoring continu des vulnérabilités (si activé)

### Dépendances de confiance

Nous n'utilisons que des dépendances :
- ✅ Largement utilisées et maintenues
- ✅ Avec un bon historique de sécurité
- ✅ Régulièrement mises à jour
- ✅ Provenant de sources officielles

## 📜 Divulgation responsable

Nous suivons les principes de divulgation responsable :

1. **Confidentialité** : Les détails de la vulnérabilité restent confidentiels jusqu'au correctif
2. **Crédit** : Les chercheurs en sécurité sont crédités (s'ils le souhaitent)
3. **Timeline** : Publication coordonnée des informations
4. **Transparence** : Communication claire avec la communauté

### Hall of Fame

Nous reconnaissons et remercions les personnes qui nous aident à améliorer la sécurité :

<!-- Les contributeurs sécurité seront listés ici -->

## 🚨 Incidents de sécurité passés

| Date | Type | Sévérité | Status |
|------|------|----------|--------|
| - | - | - | - |

_Aucun incident à ce jour._

## 📚 Ressources

### Documentation de sécurité

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Angular Security Guide](https://angular.dev/best-practices/security)
- [npm Security Best Practices](https://docs.npmjs.com/security-best-practices)
- [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories)

### Outils de sécurité recommandés

- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [OWASP ZAP](https://www.zaproxy.org/)
- [SonarQube](https://www.sonarqube.org/)

## 🔄 Mises à jour de cette politique

Cette politique de sécurité peut être mise à jour. Les changements importants seront communiqués via :
- 📢 Les release notes
- 📧 La mailing list (si applicable)
- 🐦 Les réseaux sociaux du projet (si applicable)

Dernière mise à jour : Octobre 2024

## ❓ Questions

Pour toute question concernant cette politique de sécurité qui n'implique pas de vulnérabilité :
- Ouvrez une [issue](https://github.com/nyawuwe/map-lib/issues) avec le label `security`
- Consultez notre [documentation](README.md)

---

<div align="center">

**La sécurité est l'affaire de tous. Merci de nous aider à garder MapxAngular sûr ! 🛡️**

</div>
