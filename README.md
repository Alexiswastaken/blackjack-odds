# Blackjack Odds

Calculatrice de probabilités **exactes** de blackjack, à partir de la composition
réelle du sabot restant — pas d'approximation type Hi-Lo, pas de comptage
heuristique. Chaque probabilité vient du dénombrement exact des cartes encore en
jeu, et chaque recommandation vient d'une comparaison d'espérances de gain (EV)
calculées sur ce sabot précis.

> Outil d'analyse personnel. Les cartes sont saisies **manuellement** : rien
> n'est connecté à une table réelle ou à un casino en ligne, et l'application ne
> joue à votre place à aucun moment.

---

## Sommaire

- [Ce que fait l'application](#ce-que-fait-lapplication)
- [Règles configurées](#règles-configurées)
- [Démarrage](#démarrage)
- [Tests](#tests)
- [Builds Mac et Windows](#builds-mac-et-windows)
- [Architecture](#architecture)
- [Les algorithmes](#les-algorithmes)
- [Le cache](#le-cache)
- [Validation du moteur](#validation-du-moteur)
- [Choix de modélisation et limites](#choix-de-modélisation-et-limites)

---

## Ce que fait l'application

### Onglet 1 — Suivi du sabot

Une grille de dix boutons (A, 2 … 9, 10/J/Q/K). Vous cliquez sur chaque carte qui
sort de table, quel qu'en soit le propriétaire. Le sabot restant est mis à jour
et l'application affiche, pour chaque valeur, le nombre de cartes restantes et sa
probabilité exacte de sortie (`R_v / R`).

Boutons : **Nouveau sabot** (après un mélange), **Annuler la dernière carte**,
sélecteur du nombre de jeux.

### Onglet 2 — Décision de jeu

Vous renseignez votre main et la carte visible du croupier. L'application
affiche, **sur le même sabot partagé** que l'onglet 1 :

- le total de votre main (avec indication *soft*) ;
- la probabilité exacte de buster en tirant une carte ;
- l'EV de chaque action disponible — Tirer, Rester, Doubler, Splitter ;
- la distribution complète des issues du croupier (17, 18, 19, 20, 21, bust) ;
- la recommandation, c'est-à-dire l'action d'EV maximale.

Un indicateur permanent en en-tête montre le nombre de cartes restantes sur le
total du sabot, et la pénétration atteinte.

---

## Règles configurées

Toutes ces règles changent réellement l'EV. Elles sont modifiables dans le
panneau **Règles de la table** ; les valeurs par défaut sont :

| Règle | Défaut | Effet |
|---|---|---|
| Soft 17 | **S17** — le croupier reste sur A+6 | H17 augmente son bust et l'avantage de la maison |
| Nombre de jeux | **6** | 1, 2, 6 ou 8 |
| Double autorisé | **Toutes les mains** | Restreignable à 9–11 ou 10–11 |
| Double après split (DAS) | **Oui** | Sans DAS, plusieurs paires ne se splittent plus |
| As splittés | **Une seule carte**, pas de tirage ensuite | Règle quasi universelle |
| Paiement du blackjack | **3:2** | 6:5 disponible |
| Le croupier vérifie son blackjack (*peek*) | **Oui** (règle US) | Décoché : règle européenne, la mise initiale est perdue face à un blackjack |
| Cascade du sabot entre mains splittées | **Oui** | Plus exact, nettement plus lent — voir plus bas |

Le re-split n'est pas modélisé : au plus deux mains par paire.

---

## Démarrage

```bash
npm install
```

```bash
npm run dev
```

L'application est alors sur `http://localhost:5173`.

Autres commandes :

```bash
npm run build
```

```bash
npm run preview
```

> **Note npm ≥ 11** — npm bloque désormais les scripts d'installation par
> défaut. Les paquets concernés (`esbuild`, `electron`, `fsevents`) sont déjà
> approuvés dans le champ `allowScripts` de `package.json`, donc `npm install`
> fonctionne sans intervention.

---

## Tests

```bash
npm test
```

```bash
npm run test:watch
```

Les tests couvrent le moteur seul, sans React ni DOM :

| Fichier | Ce qui est vérifié |
|---|---|
| `hypergeometric.test.ts` | Coefficients binomiaux, loi hypergéométrique univariée et multivariée, stabilité numérique sur 8 jeux |
| `hand.test.ts` | Totaux durs et *soft*, dégradation de l'as, indépendance à l'ordre des cartes |
| `shoe.test.ts` | Composition du sabot, tirage/annulation, canonicité des clés de cache |
| `dealer.test.ts` | Distributions du croupier contre les tables publiées, bascule S17/H17 |
| `basic-strategy.test.ts` | **Reproduction de la stratégie de base publiée**, cellule par cellule |
| `split.test.ts` | EV de split, cascade du sabot, règle des as splittés |
| `cache.test.ts` | Non-régression : résultats identiques avec et sans mémoïsation |

---

## Builds Mac et Windows

L'app web est empaquetée dans Electron.

```bash
npm run electron:build:mac
```

```bash
npm run electron:build:win
```

Les installeurs sortent dans `release/` : un `.dmg` par architecture macOS
(arm64 et x64) et un installeur NSIS `.exe` pour Windows x64.

> **La création d'un DMG a besoin d'un Python fonctionnel.** `electron-builder`
> exécute un `dmgbuild` Python vendorisé. Si le `python3` par défaut est cassé —
> c'est le cas d'un Homebrew Python 3.14 dont `pyexpat` est mal lié contre le
> `libexpat` du système — le build échoue sur `Command failed: which python`.
> Le script `electron:build:mac` force donc `/usr/bin/python3`, le Python
> système ; surchargez `PYTHON_PATH` pour en désigner un autre.

Pour un développement dans la fenêtre Electron, lancez `npm run dev` dans un
terminal puis :

```bash
npm run electron:dev
```

### Publier une release

Le workflow `.github/workflows/release.yml` construit les deux plateformes en
matrice (`macos-latest` + `windows-latest`), lance les tests du moteur avant
d'empaqueter, et attache les installeurs à la release GitHub. Il se déclenche sur
un tag :

```bash
git tag v1.0.0 && git push origin v1.0.0
```

**Les binaires ne sont pas signés** (pas de certificat Apple Developer ni
Authenticode). macOS affichera un avertissement Gatekeeper au premier lancement
et Windows un écran SmartScreen — voir `.github/RELEASE_NOTES.md` pour la
procédure de contournement.

---

## Architecture

```
src/
  engine/     moteur pur — aucune dépendance à React, aucun effet de bord
    types.ts            types stricts (rangs, sabot, main, règles)
    shoe.ts             composition du sabot, clé canonique de cache
    hand.ts             totaux durs/soft, blackjack, paires
    hypergeometric.ts   tirage sans remise
    dealer.ts           simulation exacte du jeu du croupier
    ev.ts               EV par action et recommandation finale
    context.ts          caches et compteurs
  worker/     Web Worker exposant le moteur de façon asynchrone
  store/      état partagé Zustand (sabot, règles, main) + persistance
  hooks/      pont React ↔ Worker
  components/ les deux vues
electron/     processus principal Electron
```

**Pourquoi ce découpage :**

- Le **moteur** n'importe rien de React. Il est testable en isolation, réutilisable
  côté Worker, et vérifiable indépendamment de l'interface.
- Le **Worker** isole les calculs lourds : une évaluation avec cascade de split
  prend plusieurs centaines de millisecondes, ce qui gèlerait l'interface si
  c'était fait sur le thread principal.
- Le **store Zustand** partage un unique sabot entre les deux onglets, sans
  *prop-drilling*. Il est persisté dans `localStorage` pour survivre à un
  rechargement accidentel — aucun backend, aucune donnée ne quitte la machine.

---

## Les algorithmes

**1 · Probabilité de la prochaine carte.** `R_v / R` — la brique de base de tout
le reste.

**2 · Loi hypergéométrique.** Probabilité d'obtenir exactement *k* cartes de
valeur *v* parmi les *m* prochaines, sans remise. Les calculs passent par les
logarithmes de factorielles : avec 8 jeux, `C(416, 20)` dépasse `Number.MAX_VALUE`
et un calcul direct renverrait `NaN`.

**3 · Simulation exacte du croupier.** Récursion sur chaque carte possible,
pondérée par sa probabilité exacte dans le sabot restant, jusqu'à ce que la règle
d'arrêt (S17 ou H17) s'applique. Le résultat est une distribution sur
{17, 18, 19, 20, 21, bust}. Le blackjack naturel est isolé : il ne se compare pas
comme un 21 ordinaire.

**4 · EV par action.**

- *Rester* : comparaison du total à la distribution du croupier.
- *Tirer* : récursion sur chaque carte possible ; à chaque nœud le joueur est
  supposé continuer optimalement (`max(rester, tirer)`).
- *Doubler* : une carte, mise doublée, aucun tirage ensuite.
- *Splitter* : deux sous-mains jouées récursivement, avec double après split si
  la règle l'autorise.

À chaque niveau, le sabot est décrémenté en cascade — c'est ce qui rend le calcul
composition-dépendant plutôt que basé sur des tables figées.

**5 · Recommandation.** L'action d'EV maximale parmi celles réellement
disponibles (le double est réservé aux deux premières cartes, le split aux
paires, etc.). Les actions indisponibles restent affichées avec la raison.

---

## Le cache

La mémoïsation n'est pas une optimisation optionnelle, c'est ce qui rend le
calcul faisable.

- **Clé canonique** : les dix compteurs du sabot dans l'ordre des rangs, plus
  l'état évalué (total, *soft*, carte visible). Deux sabots identiques produisent
  la même clé **quel que soit l'ordre de sortie des cartes** — c'est ce qui rend
  le cache réellement efficace, puisque les branches Hit et Double retombent en
  permanence sur les mêmes compositions.
- **Portée** : une `Map` par famille d'états, vivant dans le Worker, vidée à
  chaque nouveau sabot et à chaque changement de règles (les EV en dépendent).
- **Observabilité** : le panneau *Debug : cache* de l'onglet Décision affiche les
  *hits*, les *misses*, le taux de réutilisation, le nombre d'états mémorisés et
  le temps de calcul.

Ordre de grandeur mesuré : une évaluation de 16 contre 10 sur 6 jeux mémorise
~380 états en 4 ms ; une évaluation de 8,8 contre 10 avec cascade de split en
mémorise ~190 000 en ~500 ms.

---

## Validation du moteur

Le garde-fou principal est `basic-strategy.test.ts` : sur un **sabot neuf**, les
recommandations du moteur sont comparées cellule par cellule à la stratégie de
base publiée (6 jeux, S17, DAS). Si ce test passe, le moteur est correct sur le
cas où la réponse est connue — et on peut donc lui faire confiance sur un sabot
entamé, où aucune table publiée n'existe.

Les distributions du croupier sont elles aussi comparées aux valeurs publiées :

| Carte visible | Bust calculé (6 jeux) | Référence publiée |
|---|---|---|
| 2 | 35,35 % | 35,36 % |
| 4 | 39,58 % | 39,54 % |
| 5 | 41,84 % | 41,80 % |
| 6 | 42,28 % | 42,30 % |
| 7 | 26,19 % | 26,20 % |
| 9 | 22,92 % | 22,83 % |

### Un écart, volontaire

Le moteur recommande **de tirer sur un 12 composé de 10+2 contre un 4**, là où la
table publiée dit de rester. Ce n'est pas un bug : la stratégie de base est
*total-dépendante* alors que le moteur est *composition-dépendante*. Avoir un 10
dans son 12, c'est un 10 de moins dans le sabot — le croupier buste un peu moins,
et vous bustez un peu moins en tirant. Tirer repasse devant de très peu
(−0,2104 contre −0,2111). C'est un écart documenté depuis les travaux de Griffin,
et le test le vérifie explicitement : avec un 12 composé de 9+3, 8+4 ou 7+5, le
moteur recommande bien de rester.

C'est exactement ce que l'outil est censé apporter par rapport à une table
imprimée.

---

## Choix de modélisation et limites

Ces points sont énoncés explicitement parce que la justesse des probabilités en
dépend.

**Ce qui est exact :**

- Toutes les probabilités de tirage, sans remise, sur la composition réelle.
- La distribution des issues du croupier, y compris la carte cachée tirée du
  sabot restant.
- Les arbres Hit / Stand / Double, développés jusqu'à leurs feuilles.
- L'ordre des tirages n'introduit aucun biais : les cartes non vues sont
  échangeables, donc évaluer la distribution du croupier sur le sabot laissé
  après vos tirages est rigoureusement équivalent à la distribuer avant.

**Les approximations assumées :**

1. **Conditionnement du *peek*.** Quand le croupier vérifie son blackjack, vous
   apprenez « pas de blackjack » *avant* de jouer. Cette information modifie très
   légèrement la composition de ce que vous tirerez ensuite. Le moteur applique
   le conditionnement à la distribution du croupier mais pas à vos propres
   tirages. L'effet est du second ordre, et pratiquement tous les moteurs exacts
   font ce choix.

2. **Re-split non modélisé.** Une paire donne au plus deux mains. Splitter à
   nouveau une paire re-formée est un gain marginal que le moteur ignore, donc
   l'EV de split est très légèrement sous-estimée.

3. **Cascade entre mains splittées.** Avec l'option activée (défaut), la deuxième
   main est évaluée sur le sabot réellement laissé par la première, pondéré par
   la probabilité de chaque composition résiduelle. C'est exact, mais ~50× plus
   coûteux. Sans l'option, les deux mains sont évaluées sur le même sabot
   (2 × EV d'une main). L'écart mesuré est inférieur à 0,001 sur 6 jeux — il
   grandit quand le sabot rétrécit, ce que `split.test.ts` vérifie.

4. **Le croupier tire après vos deux mains splittées.** Chaque main est comparée
   à la distribution du croupier calculée sur le sabot au moment où *elle*
   s'arrête, et non sur le sabot final commun aux deux mains.

**Ce qui n'est pas implémenté du tout :** l'abandon (*surrender*), l'assurance,
et les paris annexes.

---

## Stack

TypeScript strict · Vite · React · Zustand · Tailwind CSS · Web Worker · Vitest ·
Electron. Aucun backend, aucune base de données : tout l'état est local et
éphémère.
