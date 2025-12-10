# 🌌 Portail Cosmique

Une expérience interactive de portail cosmique avec des effets de particules et une énigme stellaire. Ce projet a été entièrement modernisé avec une architecture plus robuste et des bonnes pratiques de développement web.

## 🚀 Fonctionnalités

- Effets de particules cosmiques performants
- Énigme stellaire interactive
- Interface utilisateur moderne et réactive
- Accessibilité améliorée (ARIA, navigation au clavier)
- Optimisation des performances
- Mode sombre/clair (basé sur les préférences système)
- Conception responsive

## 🛠️ Technologies utilisées

- HTML5, CSS3, JavaScript (ES6+)
- [Vite](https://vitejs.dev/) - Outil de build ultra-rapide
- [GSAP](https://greensock.com/gsap/) - Animation haute performance
- [ESLint](https://eslint.org/) & [Prettier](https://prettier.io/) - Linting et formatage de code
- [TypeScript](https://www.typescriptlang.org/) - Typage statique

## 🚀 Installation

1. **Cloner le dépôt**
   ```bash
   git clone [URL_DU_REPO]
   cd portail-cosmique
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Développement**
   ```bash
   npm run dev
   ```
   Le serveur de développement démarrera sur [http://localhost:5173](http://localhost:5173)

4. **Build pour la production**
   ```bash
   npm run build
   npm run preview
   ```

## 🎮 Comment jouer

1. Cliquez sur le bouton "🌌 Entrer dans le portail" pour activer les effets de particules
2. Cliquez sur "🔎 Énigme" pour résoudre le puzzle stellaire
3. Cliquez sur les étoiles dans le bon ordre pour déverrouiller le portail
4. Utilisez le mode facile si nécessaire pour afficher les indices

## 🏗️ Structure du projet

```
.
├── public/              # Fichiers statiques
├── src/
│   ├── assets/          # Images, polices, icônes
│   ├── components/      # Composants réutilisables
│   ├── styles/          # Fichiers SCSS/CSS
│   ├── utils/           # Utilitaires et helpers
│   ├── constants/       # Constantes de l'application
│   ├── types/           # Définitions TypeScript
│   └── main.ts          # Point d'entrée de l'application
├── index.html           # Point d'entrée HTML
├── vite.config.ts       # Configuration Vite
└── package.json         # Dépendances et scripts
```

## 🌟 Fonctionnalités avancées

- **Optimisation des performances** : Limitation dynamique des particules basée sur la mémoire disponible
- **Adaptation FPS** : Réduction automatique des effets en cas de baisse de performance
- **Mode hors-ligne** : Fonctionne même sans connexion Internet
- **PWA** : Installation sur l'écran d'accueil (sur les appareils compatibles)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus d'informations.

## 🙏 Remerciements

- Merci à tous les contributeurs
- Inspiré par divers effets de particules et jeux d'énigmes