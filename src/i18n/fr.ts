/**
 * Français — dictionnaire de référence.
 *
 * Les autres langues sont typées `Record<keyof typeof fr, string>` : ajouter une
 * clé ici casse la compilation tant que la traduction anglaise n'existe pas.
 * Les clés suffixées `_one` / `_other` sont des formes de pluriel.
 */
export const fr = {
  'app.name': 'Blackjack Odds',
  'app.subtitle': 'Probabilités exactes sur le sabot réel · {decks} · {soft17} · {das}',
  'app.das.on': 'DAS',
  'app.das.off': 'sans DAS',
  'app.footer':
    "Outil d'analyse personnel. Les cartes doivent être saisies manuellement : rien n'est connecté à une table de jeu. Le sabot est partagé entre toutes les vues et conservé localement.",

  'nav.shoe': 'Suivi du sabot',
  'nav.decision': 'Décision de jeu',
  'nav.multi': 'Multi-joueurs',
  'nav.settings': 'Paramètres',
  'nav.rules.show': 'Règles de la table',
  'nav.rules.hide': 'Masquer les règles',

  'unit.deck_one': '{count} jeu',
  'unit.deck_other': '{count} jeux',
  'unit.card_one': '{count} carte',
  'unit.card_other': '{count} cartes',
  'unit.player_one': '{count} joueur',
  'unit.player_other': '{count} joueurs',

  'meter.seen': '{dealt} vues · {percent} du sabot',

  'shoe.out.title': 'Carte sortie',
  'shoe.out.help': "Cliquez sur chaque carte qui sort, quel qu'en soit le propriétaire.",
  'shoe.undo': 'Annuler la dernière carte',
  'shoe.new': 'Nouveau sabot',
  'shoe.new.confirm': 'Réinitialiser le sabot après un mélange ?',
  'shoe.recent': 'Dernières cartes vues',
  'shoe.history.title': 'Mémoire du sabot',
  'shoe.history.help':
    "Toutes les cartes vues depuis le mélange, dans l'ordre. C'est cette mémoire qui rend les probabilités exactes plutôt qu'approchées.",
  'shoe.history.empty': 'Aucune carte vue depuis le dernier mélange.',
  'shoe.history.count': '{count} sur {total}',
  'shoe.history.collapse': 'Replier',
  'shoe.history.expand': 'Tout afficher',
  'shoe.probs.title': 'Probabilité de la prochaine carte',
  'shoe.probs.help': 'Calcul exact : cartes restantes du rang ÷ cartes restantes du sabot.',
  'shoe.probs.rank': 'Rang',
  'shoe.probs.remaining': 'Reste',
  'shoe.probs.probability': 'Proba',
  'shoe.exhausted': 'Sabot épuisé. Lancez un nouveau sabot.',

  'origin.shoe': 'Vue à la table',
  'origin.solo.player': 'Votre main',
  'origin.solo.dealer': 'Carte visible du croupier',
  'origin.multi.seat': 'Joueur {seat}',
  'origin.multi.me': 'Votre main',
  'origin.multi.dealer': 'Carte visible du croupier',

  'card.sub.ten': 'J Q K',
  'card.sub.ace': '1 / 11',
  'card.exhausted': 'Plus aucun {rank} dans le sabot',

  'decision.dealer.title': 'Main du croupier',
  'decision.dealer.help.empty': 'Commencez par la carte retournée : c\'est elle qui porte la décision.',
  'decision.dealer.help.more':
    'Ajoutez la carte cachée puis chacun de ses tirages : elles sortent du sabot comme les autres.',
  'decision.dealer.value': 'Croupier : {total}',
  'decision.hand.title': 'Ma main',
  'decision.hands.title': 'Mes mains',
  'decision.hand.help':
    'Chaque carte cliquée sort du sabot partagé, y compris celles que vous piochez.',
  'decision.hand.label': 'Main {index}',
  'decision.soft': '(soft)',
  'decision.splitBadge': 'issue d\'un split',
  'decision.split.action': 'Splitter la paire',
  'decision.split.help': 'Les deux mains sont ensuite suivies et conseillées séparément.',
  'decision.nextHand': 'Main suivante',
  'decision.nextHand.note':
    '« Main suivante » vide la main mais laisse les cartes hors du sabot : elles ont réellement été distribuées.',
  'decision.incomplete':
    'Renseignez au moins deux cartes en main et la carte retournée du croupier pour lancer le calcul.',
  'decision.settled.title': 'Tour réglé',
  'decision.settled.win': 'Gagné',
  'decision.settled.lose': 'Perdu',
  'decision.settled.push': 'Égalité',
  'decision.settled.detail': 'Vous {player} · Croupier {dealer}',
  'decision.settled.payout': 'Gain net : {payout}',
  'decision.settled.playerBust': 'Vous avez dépassé 21.',
  'decision.settled.dealerBust': 'Le croupier a dépassé 21.',
  'decision.settled.playerBlackjack': 'Blackjack !',
  'decision.settled.dealerBlackjack': 'Blackjack du croupier.',
  'outcome.title': 'Chances',
  'outcome.win': 'gagner',
  'outcome.push': 'égalité',
  'outcome.lose': 'perdre',
  'outcome.summary': '{win} gagner · {push} égalité · {lose} perdre',
  'outcome.splitNote':
    'Chances données par main splittée : les deux mains se règlent séparément.',
  'outcome.evNote':
    "L'EV mesure ce que rapporte l'action, ces pourcentages sa fréquence de réussite. Doubler rapporte plus sans gagner plus souvent : c'est la mise qui change.",
  'decision.error': 'Échec du calcul : {message}',
  'decision.recommended': 'Décision recommandée',
  'decision.computing': 'Calcul en cours…',
  'decision.blackjack': 'Blackjack !',
  'decision.summary': 'Total {total}{soft} · EV {ev}',
  'decision.bust.title': 'Probabilité de buster en tirant',
  'decision.dealerOutcomes.title': 'Issues du croupier',
  'decision.dealerOutcomes.help':
    "Conditionnées à l'absence de blackjack. Probabilité de blackjack : {probability}",
  'decision.outcome.bust': 'Bust',
  'decision.debug.title': 'Debug : cache',
  'decision.debug.hits': 'Cache hits',
  'decision.debug.misses': 'Cache misses',
  'decision.debug.ratio': 'Taux de réutilisation',
  'decision.debug.states': 'États mémorisés',
  'decision.debug.time': 'Temps de calcul',

  'action.hit': 'Tirer',
  'action.stand': 'Rester',
  'action.double': 'Doubler',
  'action.split': 'Splitter',
  'action.recommendedTag': 'recommandé',
  'action.unavailable.busted': 'Main déjà bustée',
  'action.unavailable.blackjack': 'Blackjack naturel',
  'action.unavailable.total21': 'Total de 21',
  'action.unavailable.doubleTwoCards': 'Double réservé aux deux premières cartes',
  'action.unavailable.doubleAfterSplit': 'Double après split interdit',
  'action.unavailable.doubleLimited': 'Double limité aux totaux {rule}',
  'action.unavailable.notPair': 'Pas une paire',
  'action.unavailable.resplit': 'Re-split non modélisé',

  'multi.title': 'Table',
  'multi.help':
    "Saisissez les cartes de tous les joueurs : chacune sort du sabot et affine les probabilités de votre propre main.",
  'multi.playerCount': 'Nombre de joueurs',
  'multi.seat': 'Joueur {seat}',
  'multi.me': 'Moi',
  'multi.mySeat': 'Ma place',
  'multi.setMySeat': 'Définir comme ma place',
  'multi.dealer': 'Croupier',
  'multi.dealerHelp': 'Carte retournée, puis carte cachée et tirages.',
  'multi.activeHelp': 'Les cartes cliquées vont dans : {target}',
  'multi.cardGrid': 'Distribuer une carte',
  'multi.newRound': 'Nouveau tour',
  'multi.newRound.note':
    '« Nouveau tour » vide les mains de la table mais laisse les cartes hors du sabot.',
  'multi.empty': 'aucune carte',
  'multi.myHandIncomplete':
    'Donnez au moins deux cartes à votre place et une carte visible au croupier pour lancer le calcul.',
  'multi.othersSeen': '{count} chez les autres joueurs',

  'settings.title': 'Paramètres',
  'settings.appearance': 'Apparence',
  'settings.language': 'Langue',
  'settings.language.fr': 'Français',
  'settings.language.en': 'English',
  'settings.theme': 'Thème',
  'settings.theme.dark': 'Sombre',
  'settings.theme.light': 'Clair',
  'settings.theme.system': 'Système',
  'settings.theme.help': "« Système » suit le réglage clair/sombre de votre ordinateur.",

  'settings.updates.title': 'Mises à jour',
  'settings.updates.current': 'Version installée : {version}',
  'settings.updates.check': 'Vérifier les mises à jour',
  'settings.updates.checking': 'Vérification…',
  'settings.updates.upToDate': "Vous avez déjà la dernière version.",
  'settings.updates.available': 'Version {version} disponible.',
  'settings.updates.download': 'Télécharger',
  'settings.updates.downloading': 'Téléchargement… {percent}',
  'settings.updates.ready': 'Version {version} téléchargée, prête à être installée.',
  'settings.updates.restart': 'Redémarrer et installer',
  'settings.updates.error': 'Échec de la vérification : {message}',
  'settings.updates.webOnly':
    "Les mises à jour automatiques n'existent que dans l'application de bureau. Sur le web, rechargez la page.",
  'settings.updates.macUnsigned':
    "Cette version macOS n'est pas signée : macOS refuse d'installer une mise à jour automatique. Le téléchargement doit se faire manuellement.",
  'settings.updates.openReleases': 'Ouvrir la page des releases',

  'settings.data.title': 'Données locales',
  'settings.data.help':
    "Le sabot, les règles et ces préférences sont stockés dans ce navigateur ou cette application. Rien n'est envoyé sur un serveur.",
  'settings.data.reset': 'Tout réinitialiser',
  'settings.data.resetConfirm':
    'Effacer le sabot, les règles et les préférences, puis repartir de zéro ?',

  'rules.title': 'Règles de la table',
  'rules.decks': 'Nombre de jeux',
  'rules.decks.help': 'Change de sabot et réinitialise le suivi.',
  'rules.decks.confirm': 'Changer le nombre de jeux réinitialise le sabot. Continuer ?',
  'rules.decks.custom': 'Autre',
  'rules.decks.total': '{cards} au total',
  'rules.soft17': 'Soft 17',
  'rules.soft17.help': 'S17 : le croupier reste sur A+6. H17 : il tire.',
  'rules.doubleOn': 'Double autorisé sur',
  'rules.doubleOn.any': 'Tout',
  'rules.doubleOn.9-11': '9–11',
  'rules.doubleOn.10-11': '10–11',
  'rules.payout': 'Paiement du blackjack',
  'rules.das': 'Double après split (DAS)',
  'rules.splitAces': 'Une seule carte sur les as splittés',
  'rules.peek': 'Le croupier vérifie son blackjack (peek)',
  'rules.peek.help':
    'Décoché : règle européenne, la mise initiale est perdue face à un blackjack.',
  'rules.cascade': 'Cascade du sabot entre les mains splittées',
  'rules.cascade.help': "Plus exact, nettement plus lent. L'écart typique est inférieur à 0,001.",
} as const;

export type TranslationKey = keyof typeof fr;
