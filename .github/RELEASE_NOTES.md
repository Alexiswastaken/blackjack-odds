Calculatrice de probabilités exactes de blackjack, à partir de la composition réelle du sabot restant.

## Téléchargements

| Plateforme | Fichier |
|---|---|
| macOS (Apple Silicon) | `Blackjack Odds-<version>-mac-arm64.dmg` |
| macOS (Intel) | `Blackjack Odds-<version>-mac-x64.dmg` |
| Windows 10/11 (x64) | `Blackjack Odds-Setup-<version>-win-x64.exe` |

Les fichiers `.zip` et `latest*.yml` alimentent le client de mise à jour ; ils ne
sont pas destinés au téléchargement manuel.

## Les binaires ne sont pas signés

Aucun certificat Apple Developer ni Authenticode n'est utilisé, donc le système
affichera un avertissement au premier lancement.

- **macOS** : clic droit sur l'app → *Ouvrir* → *Ouvrir*. Si le message parle
  d'une app « endommagée », lancez
  `xattr -dr com.apple.quarantine "/Applications/Blackjack Odds.app"`.
- **Windows** : SmartScreen affiche *Windows a protégé votre ordinateur* →
  *Informations complémentaires* → *Exécuter quand même*.

## Mises à jour automatiques

L'onglet **Paramètres** vérifie les nouvelles versions publiées ici.

- **Windows** : téléchargement et installation depuis l'application.
- **macOS** : la vérification fonctionne, mais macOS refuse d'installer une mise
  à jour sur une application non signée. L'app propose alors d'ouvrir cette page
  pour télécharger le `.dmg` à la main.
- La vérification exige que le dépôt soit **public** : le client interroge l'API
  GitHub sans jeton.

## Règles par défaut

S17 · 6 jeux · double autorisé sur toute main · double après split autorisé ·
blackjack payé 3:2 · le croupier vérifie son blackjack. Tout est modifiable dans
le panneau « Règles de la table ».
