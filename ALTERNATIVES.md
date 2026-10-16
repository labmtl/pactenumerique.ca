# **Répertoire des infrastructures sociales numériques souveraines au Québec et au Canada (2024-2026)**

L'émancipation collective à l'égard des conglomérats technologiques américains représente un impératif de résilience civique, de protection démocratique et de conformité juridique1. Au Québec et au Canada, la période 2024-2026 marque un point de bascule : la consolidation de la Loi 25 québécoise et l'évolution des exigences fédérales de la LPRPDE (PIPEDA) rendent désormais précaire l'externalisation des interactions publiques et professionnelles vers des architectures fondées sur le capitalisme de surveillance3. Pour le projet Pacte Numérique Canada, le déploiement d'alternatives ne relève pas d'une simple substitution d'interfaces logicielles, mais de la réappropriation matérielle et légale des couches de communication5.  
Les plateformes répertoriées ci-dessous privilégient les protocoles ouverts et fédérés (ActivityPub, AT Protocol, Matrix) et les plateformes civiques indépendantes, garantissant l'absence de traçage publicitaire intrusif, la neutralité des flux algorithmiques et la territorialisation des bases de données en sol québécois et canadien8.

## **1\. Remplacement de X et Twitter : Microblogging fédéré**

L'espace du microblogging public décentralisé repose majoritairement sur le standard ActivityPub via le moteur Mastodon (et ses dérivés comme Hometown ou Akkoma), complété par l'émergence de serveurs de données personnelles (*Personal Data Servers* ou PDS) au sein de l'écosystème AT Protocol1. Contrairement aux flux dirigés par l'engagement conflictuel et l'optimisation publicitaire de X, ces nœuds régionaux s'engagent à offrir des fils strictement chronologiques, administrés sous gouvernance associative, coopérative ou bénévole vérifiée5.

### **Répertoire des instances de microblogging souveraines**

| Nom de l'instance | URL d'accès | Protocole / Moteur | Réseau(x) remplacé(s) | Localisation & Hébergement | Organisation / Gestionnaire | Statut d'inscription | Langue | Vocation spécifique & Modération |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Qlub** | https\://qlub.social | ActivityPub (Mastodon v4.4+) | X / Twitter | Québec (Centre de données québécois via FediHost) | Collectif d'entrepreneurs civiques québécois | Ouvert à tous | Français | Échanges régionaux, redécouverte de l'information locale sans algorithmes d'amplification2. |
| **Mastodon Québec** | https\://mastodon.quebec | ActivityPub (Mastodon) | X / Twitter | Canada (Stockage externe sécurisé et sauvegardes chiffrées) | Administrateur indépendant bénévole (Pascal Giguère) | Ouvert à tous | Français (bilinguisme accepté) | Serveur généraliste régional; adhésion formelle au Mastodon Server Covenant, modération proactive contre la haine5. |
| **CoSocial** | https\://cosocial.ca | ActivityPub (Mastodon) | X / Twitter | Canada (Centres de données canadiens) | CoSocial Community Service Co-operative | Adhésion coopérative ouverte | Bilingue (FR / EN) | Service d'utilité collective; gouvernance démocratique des membres (un membre, une voix)1. |
| **Jasette FACiLe** | https\://jasette.facil.services | ActivityPub (Mastodon) | X / Twitter | Québec (Serveurs de l'association, Lévis/Montréal) | FACiL (OBNL pour l'informatique libre) | Priorité aux adhérents / Ouvert | Français | Promotion des biens communs numériques, débats de société et souveraineté logicielle1. |
| **mstdn.ca** | https\://mstdn.ca | ActivityPub (Mastodon) | X / Twitter | Canada (Toronto, Montréal) | Collectif citoyen indépendant | Ouvert (avec filtrage anti-spam) | Bilingue (EN dominant, FR) | Grande agora pancanadienne; application stricte de règles de bienveillance et d'inclusion1. |
| **The Canadian** | https\://thecanadian.social | ActivityPub (Mastodon) | X / Twitter | Colombie-Britannique (Kelowna et Burnaby) | Opérateur système indépendant (Mike Fraser) | Ouvert aux résidents et alliés | Bilingue (EN / FR) | Matériel physique possédé en propre; exclusion contractuelle de tout moissonnage pour les modèles d'IA7. |
| **La Pataterie** | https\://pataterie.ca | ActivityPub (Mastodon) | X / Twitter | Montréal, Québec (Tiohtià:ke) | Collectif communautaire local montréalais | Ouvert sur demande / Modéré | Français / Bilingue | Espace culturel, militant, artistique et communautaire ancré dans la réalité montréalaise1. |
| **PDS Stockage Québec** | https\://pds.stockage.quebec | AT Protocol (Bluesky PDS) | X / Twitter (Bluesky centralisé) | Québec (Infrastructures locales indépendantes) | Opérateur de données québécois | Sur invitation / Direct | Français | Nœud personnel de données décentralisé hébergeant les référentiels d'identité hors des États-Unis20. |
| **Northsky Social** | https\://northskysocial.com | AT Protocol (PDS & Labeler) | X / Twitter (Bluesky centralisé) | Canada | Collectif de développement civique | Ouvert / Migration de compte | Bilingue (EN / FR) | Hébergement décentralisé de comptes ATProto; étiquetage et modération communautaire inclusive22. |
| **Gander Social** | https\://gandersocial.ca | AT Protocol (PDS / App) | X / Twitter (Bluesky centralisé) | Canada | Opérateur de télécommunications citoyen | Ouvert | Bilingue (EN / FR) | Fournisseur de service indépendant canadien assurant l'autonomie des données sous AT Protocol25. |

L'analyse de ces déploiements révèle une prise de conscience accrue des risques d'ingérence étrangère et de dépendance infrastructurelle. Les instances Mastodon québécoises ont structuré leur gouvernance pour éviter l'écueil de la fermeture abrupte en adhérant aux engagements du *Mastodon Server Covenant*, qui prescrit la présence d'au moins deux administrateurs avec accès d'urgence, des sauvegardes quotidiennes et un préavis minimal de trois mois en cas de cessation d'activité5.  
Du côté du protocole AT Protocol, l'exploitation de serveurs PDS canadiens tels que pds.stockage.quebec constitue une avancée technique majeure20. Alors que l'application Bluesky oriente par défaut les usagers vers les machines de son entreprise mère aux États-Unis, la migration vers un PDS hébergé localement assure la possession exclusive de la clé cryptographique de signature et des dépôts de messages, garantissant une immunité fonctionnelle contre les saisies extraterritoriales permises par le droit américain11.

## **2\. Remplacement d'Instagram : Partage d'images et photographie**

Le remplacement d'Instagram s'opère par le protocole ActivityPub à l'aide de la plateforme libre Pixelfed9. Cette technologie élimine les mécanismes d'assuétude psychologique (tels que le réordonnancement algorithmique des flux et les notifications d'incitation marchande) au profit d'une interface respectueuse de l'attention9. La présence du concepteur principal de Pixelfed, Daniel Supernault, en sol canadien a conféré au réseau une robustesse technique précoce au pays26.

### **Répertoire des instances photographiques souveraines**

| Nom de l'instance | URL d'accès | Protocole / Moteur | Réseau(x) remplacé(s) | Localisation & Hébergement | Organisation / Gestionnaire | Statut d'inscription | Langue | Vocation spécifique & Modération |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Pixelfed Canada** | https\://pixelfed.ca | ActivityPub (Pixelfed) | Instagram, VSCO | Québec / Canada (OVHcloud Beauharnois / Toronto) | Fedecan (Organisme pancanadien à but non lucratif) | Sur approbation | Bilingue (FR / EN) | Grande communauté générale de photographes; hébergée au Québec (Beauharnois), respect des licences créatives et décapage EXIF8. |
| **pxlfd.ca** | https\://pxlfd.ca | ActivityPub (Pixelfed) | Instagram, Flickr | Canada | Collectif photographique indépendant | Ouvert / Modéré | Bilingue (FR / EN) | Hub dédié à la photographie alternative, artistique et documentaire, sans pistage ni exploitation par l'IA. |

Sur le plan de la protection des créateurs, ces instances tranchent avec les conditions d'utilisation d'Instagram en refusant explicitement d'exploiter les œuvres téléversées pour l'entraînement de modèles d'intelligence artificielle générative ou le profilage commercial7. Les métadonnées géographiques sensibles (données EXIF GPS) sont décapées par défaut lors de la publication afin de préserver l'anonymat territorial des citoyens8.  
De surcroît, la nature fédérée d'ActivityPub autorise une interaction bidirectionnelle complète : les abonnés d'une instance Mastodon québécoise ou canadienne peuvent suivre directement un compte résidant sur pixelfed.ca ou pxlfd.ca, commenter ses clichés et partager ses œuvres sans jamais créer de profil sur un serveur dédié aux images, brisant le cloisonnement applicatif imposé par Meta9.

## **3\. Remplacement de Reddit et des Groupes Facebook : Forums et communautés d'intérêt**

La structuration des débats d'intérêt public, l'agrégation de liens d'actualité et l'entraide technique nécessitent des architectures asynchrones arborescentes33. Deux voies complémentaires s'offrent aux usagers : d'une part, les instances de forums fédérés ActivityPub (Lemmy, PieFed), qui reproduisent l'expérience de Reddit sans capitaux à risque ni monétisation de l'API; d'autre part, les forums citoyens propulsés par Discourse et administrés par la société civile québécoise33.

### **Répertoire des espaces de délibération et de forums souverains**

| Nom de l'instance | URL d'accès | Protocole / Moteur | Réseau(x) remplacé(s) | Localisation & Hébergement | Organisation / Gestionnaire | Statut d'inscription | Langue | Vocation spécifique & Modération |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Lemmy Canada** | https\://lemmy.ca | ActivityPub (Lemmy) | Reddit, Groupes Facebook | Canada | Fedecan (OBNL fédérale) | Ouvert à tous (courriel requis) | Bilingue (EN / FR) | Agrégation de liens, sous-communautés thématiques territoriales, actualités politiques et culturelles33. |
| **PieFed Canada** | https\://piefed.ca | ActivityPub (PieFed) | Reddit | Canada | Fedecan (OBNL fédérale) | Ouvert | Bilingue (EN / FR) | Alternative allégée axée sur la simplicité des flux et l'accessibilité multiplateforme33. |
| **Forums du libre du Québec** | https\://forumsdulibre.quebec | Discourse (Forum civique ouvert) | Reddit, Groupes d'entraide Facebook | Québec (Infrastructures FACiL, Lévis) | Association FACiL (OSBL québécois) | Ouvert avec validation anti-spam | Français | Délibération civique, promotion des politiques technologiques ouvertes, entraide sur les logiciels libres16. |

L'instance lemmy.ca s'est imposée comme le refuge principal des communautés canadiennes désireuses de quitter Reddit à la suite de la commercialisation agressive de son interface35. Elle héberge des espaces consacrés aux enjeux nationaux, aux droits numériques et à la vie municipale37. La décentralisation assure qu'aucune entité commerciale ne peut unilatéralement privatiser le contenu rédigé par les usagers ou exiger des tarifs d'accès prohibitifs33.  
En parallèle, forumsdulibre.quebec assure un rôle de mémoire institutionnelle et de vigie citoyenne pour le Québec16. Cet espace documente et débat des dossiers majeurs d'intérêt public : politiques d'approvisionnement en technologies de l'information, mise en place d'infonuagiques québécois indépendants, analyse critique de projets de loi sur la surveillance et adoption de la Loi 2540.

## **4\. Remplacement de YouTube et TikTok : Diffusion vidéo et médias audiovisuels**

Le remplacement de YouTube et de TikTok constitue le volet le plus exigeant sur le plan de la bande passante et des ressources matérielles42. Le logiciel libre PeerTube, soutenu par le protocole ActivityPub, résout cette contrainte par un modèle hybride combinant la diffusion directe et le partage pair-à-pair dans le navigateur web via WebTorrent et HLS43. Lorsqu'une vidéo locale fait l'objet d'une forte demande, les visionneurs contribuent à relayer des fragments de flux, ce qui allège la charge des serveurs québécois et canadiens43.

### **Répertoire des instances vidéo souveraines**

| Nom de l'instance | URL d'accès | Protocole / Moteur | Réseau(x) remplacé(s) | Localisation & Hébergement | Organisation / Gestionnaire | Statut d'inscription | Langue | Vocation spécifique & Modération |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Canal FACiLe** | https\://canal.facil.services | ActivityPub (PeerTube v6/v7) | YouTube, Vimeo | Québec (Montréal / Lévis) | Association FACiL | Accès de diffusion aux membres et partenaires civiques | Français | Conférences d'éducation civique, panels sur les droits numériques, tutoriels d'autonomie logicielle17. |
| **PeerTube DIRO** | https\://classe.iro.umontreal.ca | ActivityPub (PeerTube) | YouTube Éducation, Panopto | Montréal, Québec (Université de Montréal) | Département d'informatique et de recherche opérationnelle (DIRO) | Académique (consultation publique libre) | Français | Matériel pédagogique universitaire, recherche informatique, vulgarisation scientifique ouverte43. |
| **Canadian Civil Video** | https\://video.canadiancivil.com | ActivityPub (PeerTube) | YouTube | Canada (Montréal / Toronto) | Canadian Civil (Paige Saunders) | Diffusion sélective / Partenaires | Bilingue (EN / FR) | Analyse urbaine, démocratie délibérative, mobilité collective et transparence politique48. |
| **MyCrowd Video** | https\://video.mycrowd.ca | ActivityPub (PeerTube) | YouTube | Canada | Collectif indépendant citoyen | Inscription ouverte / Modérée | Bilingue (EN / FR) | Chaîne d'expression citoyenne, actualités locales et fédération avec le réseau mondial ouvert49. |

L'intérêt fondamental de ces nœuds vidéo réside dans l'éradication des boucles de rétroaction dopaminergiques et du traçage comportemental44. Les plateformes comme Canal FACiLe ou le serveur universitaire du DIRO diffusent les capsules sans coupure publicitaire ciblée, sans collecter les historiques de visionnement à des fins de monétisation et sans exposer les auditoires à des algorithmes de recommandation conçus pour radicaliser l'attention43.  
L'adoption de la version 7 de PeerTube procure une interface modernisée, un contrôle fin des permissions par chaîne et une compatibilité directe avec les applications mobiles libres, permettant aux organisations québécoises de maintenir une présence vidéo institutionnelle pérenne et auto-hébergée44.

## **5\. Remplacement de WhatsApp, Messenger, Discord et Slack : Messagerie instantanée et salons d'équipe**

Pour remplacer les messageries centralisées soumises à la surveillance corporative ou étatique étrangère (WhatsApp et Messenger de Meta, Slack de Salesforce, Discord), l'écosystème local s'appuie sur le protocole de chiffrement fédéré Matrix3. Matrix allie la flexibilité de salons textuels organisés en espaces thématiques à la robustesse cryptographique du protocole Olm/Megolm, assurant un chiffrement de bout en bout complet (E2EE) tant pour les dialogues en tête-à-tête que pour les salons de travail collectifs10.

### **Répertoire des serveurs et services Matrix souverains**

| Nom de l'instance | URL d'accès | Protocole / Moteur | Réseau(x) remplacé(s) | Localisation & Hébergement | Organisation / Gestionnaire | Statut d'inscription | Langue | Vocation spécifique & Modération |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Beluga Convo** | https\://beluga.quebec | Matrix (Synapse isolé) | Slack, Teams, WhatsApp | Québec (Serveurs dédiés *bare-metal* à Québec) | Beluga (Entreprise d'utilité collective québécoise) | Sur souscription institutionnelle et citoyenne | Français | Messagerie professionnelle chiffrée par défaut pour OBNL, coopératives et collectifs québécois; étanchéité Loi 253. |
| **Tuttle Supply Matrix** | https\://chat.tuttlesupply.ca | Matrix (Synapse) | Discord, WhatsApp, Telegram | Calgary, Alberta | Collectif d'ingénierie civique Tuttle Supply | Ouvert aux citoyens et communautés | Bilingue (EN / FR) | Salons publics et privés pour citoyens soucieux de leur vie privée, journalisation minimale documentée54. |
| **Infrastructure Matrix Koumbit** | https\://koumbit.org | Matrix (Synapse fédéré) | Discord, Slack | Montréal, Québec | Coopérative de solidarité Koumbit | Réservé aux collectifs hébergés et alliés | Français (bilingue) | Clavardage sécurisé et canaux de coordination pour la justice sociale, l'écologie et l'action civique. |
| **MapleDeploy Matrix Nodes** | https\://mapledeploy.ca | Matrix (Synapse automatisé) | Discord, Slack | Toronto, Ontario | Fournisseur de déploiement souverain canadien | Déploiement en 1-clic pour organisations | Bilingue (EN / FR) | Fourniture d'instances Synapse entièrement dédiées sur machines virtuelles canadiennes isolées55. |

L'exploitation de Matrix au sein d'infrastructures locales comble un angle mort majeur de la cybersécurité associative3. Des initiatives québécoises telles que Beluga exploitent des serveurs physiques dédiés situés exclusivement dans la région de Québec, administrés sous orchestrateur sécurisé sans recours aux géants du nuage américain3. Les données de communication, les annuaires d'organisations et les clés de session demeurent sous juridiction québécoise, éliminant le risque de saisie par des agences étrangères via le *Cloud Act*3.  
Pour le grand public, la fédération de serveurs comme celui de Tuttle Supply permet de rejoindre n'importe quel canal civique international tout en maintenant l'enregistrement de son compte et ses métadonnées de connexion sur un serveur canadien10.

## **6\. Remplacement de LinkedIn : Réseautage professionnel éthique et économie sociale**

Le remplacement de LinkedIn ne requiert pas la reproduction de ses travers commerciaux, tels que la commercialisation agressive des profils des travailleurs, le pistage publicitaire des carrières et l'obscurité des algorithmes de sélection40. La vision canadienne et québécoise s'incarne dans des plateformes de mise en commun de compétences, d'animation de communautés de pratique et de publication d'offres d'emploi dédiées à l'économie sociale, à l'action communautaire et aux technologies libres34.

### **Répertoire des plateformes de réseaux professionnels éthiques**

| Nom de l'instance / Plateforme | URL d'accès | Protocole / Moteur | Réseau(x) remplacé(s) | Localisation & Hébergement | Organisation / Gestionnaire | Statut d'inscription | Langue | Vocation spécifique & Modération |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Passerelles (En commun)** | https\://passerelles.encommun.io/ | Plateforme collaborative sociale (En commun / Outils civiques) | LinkedIn, Workplace (Meta), Groupes Facebook | Québec (Montréal) | Projet collectif & TIESS | Inscription ouverte aux intervenants et acteurs civiques | Français | Mise en réseau professionnelle civique, animation de communautés de pratique, maillage de projets pour la transition socio-écologique et l'économie sociale56. |
| **Babillard (En commun)** | https\://encommun.io/initiatives/babillard | Babillards et agendas partagés (En commun) | Facebook Événements, Meetup, Eventbrite | Québec (Montréal) | Projet collectif (OBNL) | Ouvert à tous | Français | Diffusion et découverte d'événements, d'activités citoyennes et d'appels à tous sans algorithmes marchands. |
| **Espace Carrières des Forums du libre** | https\://forumsdulibre.quebec/c/babillard/15 | Discourse (Fédérable) | LinkedIn Emplois | Québec (Lévis) | Association FACiL | Ouvert à la consultation et publication | Français | Offres d'emploi éthiques, mandats contractuels en logiciel libre, recrutement de spécialistes open-source34. |
| **CoSocial Pro** | https\://cosocial.ca | ActivityPub (Mastodon avec métadonnées professionnelles) | LinkedIn | Canada | CoSocial Community Service Co-operative | Membres de la coopérative | Bilingue (FR / EN) | Réseau d'affaires solidaire; validation d'identité professionnelle décentralisée via la vérification DNS1. |

La plateforme passerelles.encommun.io démontre la viabilité d'un réseau professionnel entièrement dédié à la transformation sociétale et à l'innovation sociale57. Développée dans le cadre de l'écosystème québécois *En commun* par le Projet collectif et le TIESS, elle relie des milliers de praticiens du développement régional, d'entrepreneurs coopératifs, de chercheurs universitaires et de cadres municipaux56. L'espace évite la compétition marchande de visibilité en articulant les interactions autour de cercles de travail collaboratifs thématiques, d'outils de codéveloppement et de répertoires documentaires partagés56.  
De son côté, l'initiative *Babillard* (https://encommun.io/initiatives/babillard) complète ce dispositif en offrant une alternative souveraine aux événements Facebook et aux plateformes de billetterie privées, permettant la diffusion d'agendas et d'appels à tous ancrés dans la réalité des collectivités territoriales.  
Parallèlement, au sein du Fédiverse, des structures comme CoSocial permettent aux professionnels indépendants et aux coopératives d'établir leur crédibilité sans abonnement corporatif payant : la possession de leur propre nom de domaine validé cryptographiquement certifie leur identité dans le réseau ouvert, instaurant un réseau d'affaires décentralisé, portable et affranchi des plateformes marchandes1.

## **7\. Organisations phares et écosystème d'appui aux infrastructures souveraines**

La durabilité des réseaux décentralisés québécois et canadiens dépend d'organismes de gouvernance collective, de coopératives technologiques et d'infrastructures d'hébergement matériel qui forment le socle opérationnel de cette indépendance3.

### **Organisations institutionnelles et associations de la société civile**

FACiL (Pour l'appropriation collective de l'informatique libre) agit depuis 2003 comme le défenseur historique des libertés numériques au Québec17. Constituée en OSBL et administrée depuis Lévis et Montréal, elle maintient l'ensemble de services ouverts facil.services, offrant aux citoyens québécois des outils libres allant du microblogging (jasette.facil.services) aux plateformes de consultation publique et formulaires éthiques (liberaforms)1. L'association intervient également sur le plan législatif pour contraindre l'appareil gouvernemental à prioriser les standards ouverts et la souveraineté des données16.  
Fedecan (Federated Media Canada) constitue l'épine dorsale de l'infrastructure fédérée à l'échelle fédérale8. En tant qu'organisme sans but lucratif, Fedecan assume les coûts d'infrastructure et l'administration de serveurs de grande capacité tels que lemmy.ca et pixelfed.ca, assurant la pérennité financière d'outils qui seraient autrement vulnérables au désengagement d'administrateurs bénévoles isolés8.  
CoSocial Community Service Co-operative incarne une rupture méthodologique en adoptant une structure d'entreprise d'utilité collective1. Ses usagers détiennent une part sociale et exercent un pouvoir décisionnel direct sur les orientations d'hébergement, les budgets d'exploitation et les protocoles de modération, immunisant la plateforme contre tout rachat hostile1.  
L'Autorité canadienne pour les enregistrements Internet (CIRA / ACEI) injecte des capitaux stratégiques via son programme d'investissement communautaire pour développer les infrastructures locales du Web indépendant, subventionner les logiciels ouverts et sécuriser le réseau contre les cybermenaces.  
Le Lab Parallèle mène des travaux d'ingénierie et de recherche-action au Québec sur la découvrabilité numérique des œuvres culturelles, plaidant pour le déploiement d'écosystèmes ouverts face à la vassalisation algorithmique des industries créatives par les diffuseurs étrangers.

### **Coopératives d'hébergement et infrastructures matérielles locales**

La Coopérative de solidarité Koumbit, fondée à Montréal en 2004, exploite une salle de serveurs gérée selon les principes de l'autogestion ouvrière. Koumbit fournit l'infrastructure matérielle, l'hébergement mutualisé et le soutien technique de centaines d'associations, d'initiatives féministes, syndicales et citoyennes, en appliquant une stricte politique de non-collaboration avec les structures de profilage de données.  
FediHost se spécialise dans l'infogérance et l'ingénierie des instances du Fédiverse au Québec6. En hébergeant des plateformes telles que qlub.social sur des serveurs physiques situés sur le territoire québécois, cet opérateur offre un cadre d'exploitation professionnel garantissant une haute disponibilité technique et une pleine conformité à la Loi 256.  
La territorialisation des centres de données constitue la condition matérielle sine qua non de la souveraineté3. Les serveurs de ce répertoire privilégient les centres de données implantés au Québec (à l'instar du complexe d'OVHcloud à Beauharnois, alimenté par l'hydroélectricité locale, et des points de présence neutres de Montréal) ainsi qu'en Colombie-Britannique (installations de niveau 1 à Kelowna et Burnaby)5. Le trafic transite par les points d'échange Internet locaux, notamment le QIX à Montréal, le TORIX à Toronto et le VANIX à Vancouver, ce qui évite le déroutement inutile des paquets IP par les dorsales de télécommunication des États-Unis et protège les communications citoyennes des dispositifs de surveillance extraterritoriaux.

## **8\. Synthèse stratégique pour l'action citoyenne**

L'observation des initiatives déployées entre 2024 et 2026 permet de dégager trois axes structurants pour guider la stratégie du Pacte Numérique Canada dans l'accompagnement des citoyens :  
Premièrement, la professionnalisation juridique et coopérative de la gouvernance écarte le spectre de la fragilité des premières années du Fédiverse1. L'adhésion formelle au *Mastodon Server Covenant*, l'émergence d'OBNL d'infrastructure (Fedecan, FACiL) et de coopératives de services (CoSocial) garantissent aux usagers la continuité de service, la mise en œuvre de copies de sécurité régulières et une protection contre la fermeture soudaine des serveurs1.  
Deuxièmement, la stricte territorialité des données confère un avantage juridique tangible5. En vertu des dispositions rigoureuses de la Loi 25 au Québec, les organisations, entreprises de l'économie sociale et institutions d'enseignement ont l'obligation légale de s'assurer que les données personnelles de leurs membres ne sont pas exposées à des régimes juridictionnels étrangers permissifs3. L'utilisation de serveurs Matrix ou ActivityPub hébergés au Québec et au Canada neutralise les risques inhérents aux transferts transfrontaliers de données3.  
Troisièmement, le maillage entre protocoles ouverts réalise le décloisonnement complet des communications9. Au lieu d'enfermer les citoyens dans des silos propriétaires incompatibles, un citoyen inscrit sur une plateforme québécoise comme qlub.social ou mastodon.quebec conserve la liberté technique d'interagir avec des forums sur lemmy.ca, de commenter les productions universitaires de classe.iro.umontreal.ca et de partager des photographies sur pxlfd.ca ou pixelfed.ca6. Cette interopérabilité garantit un écosystème numérique unifié, souverain, démocratique et pérenne9.

#### **Works cited**

> 1. TheSocialWeb.ca – Find Social Web and Fediverse communities in, [https\://thesocialweb.ca/](https://thesocialweb.ca/)  
> 2. QLUB: A Quebec alternative to web giants \- Reddit, [https\://www\.reddit.com/r/Quebec/comments/1ik0spn/qlub\_une\_alternative\_qu%C3%A9b%C3%A9coise\_aux\_g%C3%A9ants\_du\_web/?tl=en](https://www.reddit.com/r/Quebec/comments/1ik0spn/qlub_une_alternative_qu%C3%A9b%C3%A9coise_aux_g%C3%A9ants_du_web/?tl=en)  
> 3. About \- Béluga, [https\://beluga.quebec/en/about/](https://beluga.quebec/en/about/)  
> 4. Custom business software in Canada: 4 ways to get it \- Synapse DEV, [https\://synapsedev.ca/en/guides/custom-business-software-canada](https://synapsedev.ca/en/guides/custom-business-software-canada)  
> 5. À propos \- Mastodon Québec, [https\://mastodon.quebec/](https://mastodon.quebec/)  
> 6. À propos \- qlub.social, [https\://qlub.social/about](https://qlub.social/about)  
> 7. About \- TheCanadian.Social, [https\://thecanadian.social/about](https://thecanadian.social/about)  
> 8. pixelfed.ca \- Servers, [https\://pixelfed.org/servers/163/pixelfed.ca](https://pixelfed.org/servers/163/pixelfed.ca)  
> 9. Pixelfed \- Decentralized social media, [https\://pixelfed.org/](https://pixelfed.org/)  
> 10. Radar Matrix Chat – Federated & Decentralised Rooms on Android, [https\://www\.radar-chat.app/matrix.html](https://www.radar-chat.app/matrix.html)  
> 11. Serverless Statusphere: a walk through building serverless ATProto, [https\://blog.cloudflare.com/serverless-atproto/](https://blog.cloudflare.com/serverless-atproto/)  
> 12. Relre Relay, [https\://rel.re/](https://rel.re/)  
> 13. qlub.social, [https\://qlub.social/](https://qlub.social/)  
> 14. Pascal Giguère \- mastodon.quebec, [https\://mastodon.quebec/@pascal](https://mastodon.quebec/@pascal)  
> 15. Maj \- CoSocial.ca, [https\://cosocial.ca/@maj/117339820531311123](https://cosocial.ca/@maj/117339820531311123)  
> 16. Sujets Récents sur Organisme: FACiL \- Forums du libre du Québec, [https\://forumsdulibre.quebec/c/facil/8](https://forumsdulibre.quebec/c/facil/8)  
> 17. Conditions générales d'utilisation (CGU) \- Services FACiLes, [https\://facil.services/cgu/](https://facil.services/cgu/)  
> 18. Mastodon – TheSocialWeb.ca, [https\://thesocialweb.ca/category/platform-type/mastodon/](https://thesocialweb.ca/category/platform-type/mastodon/)  
> 19. Instances \- Mastodon Help, [https\://mastodon.help/instances/en?lang=0\&desc=canada\&minu=1\&maxu=30000\&minau=1\&minki=500\&black=0\&creg=1\&appr=0\&lcok=0\&ord=rand\&advc=1\&p=1](https://mastodon.help/instances/en?lang=0&desc=canada&minu=1&maxu=30000&minau=1&minki=500&black=0&creg=1&appr=0&lcok=0&ord=rand&advc=1&p=1)  
> 20. Personal Data Server AT Protocol: pds.stockage.quebec, [https\://pds.stockage.quebec/](https://pds.stockage.quebec/)  
> 21. Git scraping of AT Protocol/Bluesky instances · GitHub, [https\://github.com/mary-ext/atproto-scraping](https://github.com/mary-ext/atproto-scraping)  
> 22. What happened to Bluesky being decentralized? : r/BlueskySocial, [https\://www\.reddit.com/r/BlueskySocial/comments/1nmhcfl/what\_happened\_to\_bluesky\_being\_decentralized/](https://www.reddit.com/r/BlueskySocial/comments/1nmhcfl/what_happened_to_bluesky_being_decentralized/)  
> 23. BlueSky-alternative Northsky announced, promises to have queer, [https\://famiboards.com/threads/bluesky-alternative-northsky-announced-promises-to-have-queer-focused-moderation-and-be-based-out-of-canada.12958/](https://famiboards.com/threads/bluesky-alternative-northsky-announced-promises-to-have-queer-focused-moderation-and-be-based-out-of-canada.12958/)  
> 24. Migrating PDS Account with \`goat\` | bryan newbold | WhiteWind blog, [https\://whtwnd.com/bnewbold.net/entries/Migrating%20PDS%20Account%20with%20%60goat%60](https://whtwnd.com/bnewbold.net/entries/Migrating%20PDS%20Account%20with%20%60goat%60)  
> 25. Post by @gandersocial.ca — Bluesky, [https\://bsky.app/profile/gandersocial.ca/post/3mpjvzu2zkx2f/quotes](https://bsky.app/profile/gandersocial.ca/post/3mpjvzu2zkx2f/quotes)  
> 26. pixelfed.social \- Servers, [https\://pixelfed.org/servers/1/pixelfed.social](https://pixelfed.org/servers/1/pixelfed.social)  
> 27. Pixelfed ‒ Applis sur Google Play, [https\://play.google.com/store/apps/details?id=com.pixelfed\&hl=fr\_CA](https://play.google.com/store/apps/details?id=com.pixelfed&hl=fr_CA)  
> 28. Pix Québec \- TheSocialWeb.ca, [https\://thesocialweb.ca/pix-quebec/](https://thesocialweb.ca/pix-quebec/)  
> 29. Provinces and Territories \- TheSocialWeb.ca, [https\://thesocialweb.ca/category/regional/provinces-territories/](https://thesocialweb.ca/category/regional/provinces-territories/)  
> 30. Pixelfed.ca, [https\://pixelfed.ca/](https://pixelfed.ca/)  
> 31. Pixelfed Server Directory, [https\://pixelfed.org/servers](https://pixelfed.org/servers)  
> 32. @MostlyHarmless@thecanadian.social on Mastodon \- Facebook, [https\://www\.facebook.com/EDGEfbpage/posts/mostlyharmlessthecanadiansocialon-mastodon/1719198646874535/](https://www.facebook.com/EDGEfbpage/posts/mostlyharmlessthecanadiansocialon-mastodon/1719198646874535/)  
> 33. Welcome to the Fediverse | Fedecan, [https\://fedecan.ca/en/guide/get-started](https://fedecan.ca/en/guide/get-started)  
> 34. Forums du libre du Québec \- Forums du libre, [https\://forumsdulibre.quebec/](https://forumsdulibre.quebec/)  
> 35. Welcome new users to piefed.ca and lemmy.ca\!, [https\://lemmy.ca/post/59551095](https://lemmy.ca/post/59551095)  
> 36. Utiliser ce forum de façon indépendante ? \- Services FACiLes, [https\://forumsdulibre.quebec/t/utiliser-ce-forum-de-facon-independante/296](https://forumsdulibre.quebec/t/utiliser-ce-forum-de-facon-independante/296)  
> 37. Browse servers \- Lemmy, [https\://join-lemmy.org/instances](https://join-lemmy.org/instances)  
> 38. Canada \- Lemmy.ca, [https\://lemmy.ca/c/canada](https://lemmy.ca/c/canada)  
> 39. Confidentialité \- Forums du libre du Québec, [https\://forumsdulibre.quebec/privacy](https://forumsdulibre.quebec/privacy)  
> 40. Sujets Récents sur Logiciel libre \- Forums du libre du Québec, [https\://forumsdulibre.quebec/c/logiciel-libre/7](https://forumsdulibre.quebec/c/logiciel-libre/7)  
> 41. Sujets Récents sur Archives \- Forums du libre du Québec, [https\://forumsdulibre.quebec/c/archives/32](https://forumsdulibre.quebec/c/archives/32)  
> 42. PeerTube Made My YouTube Better, [https\://www\.youtube.com/watch?v=EK6SWvtYnww](https://www.youtube.com/watch?v=EK6SWvtYnww)  
> 43. Login \- Peertube du DIRO, [https\://classe.iro.umontreal.ca/login](https://classe.iro.umontreal.ca/login)  
> 44. PeerTube \- App Store \- Apple, [https\://apps.apple.com/ca/app/peertube/id6737834858](https://apps.apple.com/ca/app/peertube/id6737834858)  
> 45. Canal FACiLe: Recently added, [https\://canal.facil.services/](https://canal.facil.services/)  
> 46. Services FACiLes, [https\://facil.services/](https://facil.services/)  
> 47. Peertube du DIRO: Recently added, [https\://classe.iro.umontreal.ca/](https://classe.iro.umontreal.ca/)  
> 48. PAIGE\! (@paige@canadiancivil.com) \- Canadian Civil Mastodon, [https\://masto.canadiancivil.com/@paige](https://masto.canadiancivil.com/@paige)  
> 49. MyCrowd Video: Discover videos, [https\://video.mycrowd.ca/](https://video.mycrowd.ca/)  
> 50. PeerTube – Apps on Google Play, [https\://play.google.com/store/apps/details?id=org.framasoft.peertube\&hl=en\_SG](https://play.google.com/store/apps/details?id=org.framasoft.peertube&hl=en_SG)  
> 51. PeerTube v7: offer a complete makeover to your video platform\!, [https\://framablog.org/2024/12/17/peertube-v7-offer-a-complete-makeover-to-your-video-platform/](https://framablog.org/2024/12/17/peertube-v7-offer-a-complete-makeover-to-your-video-platform/)  
> 52. Building a serverless, post-quantum Matrix homeserver, [https\://blog.cloudflare.com/serverless-matrix-homeserver-workers/](https://blog.cloudflare.com/serverless-matrix-homeserver-workers/)  
> 53. Tesseract (Matrix) : téléchargement et installation gratuits sous, [https\://apps.microsoft.com/detail/9nz8v8tcnvjw?hl=fr-CA\&gl=CA](https://apps.microsoft.com/detail/9nz8v8tcnvjw?hl=fr-CA&gl=CA)  
> 54. Matrix privacy · Tuttle Supply, [https\://tuttlesupply.ca/matrix-privacy](https://tuttlesupply.ca/matrix-privacy)  
> 55. Self-Host 300+ Open Source Apps in Canada \- MapleDeploy, [https\://mapledeploy.ca/one-click-services](https://mapledeploy.ca/one-click-services)  
> 56. L'ESS au défi de la gouvernance des données \- OpenEdition Journals, [https\://journals.openedition.org/terminal/11936](https://journals.openedition.org/terminal/11936)  
> 57. Outils régionaux en développement social \- RDS-GÎM, [https\://rdsgim.ca/outils-regionaux/](https://rdsgim.ca/outils-regionaux/)  
> 58. Zoom sur la coopération au Québec \- Alpesolidaires, [https\://alpesolidaires.org/zoom-sur-la-cooperation-au-quebec/](https://alpesolidaires.org/zoom-sur-la-cooperation-au-quebec/)  
> 59. Soutenir l'innovation sociale pour répondre aux enjeux de société :, [https\://tiess.ca/download/documents/TIESS-HP-Memoire-SQRI.pdf](https://tiess.ca/download/documents/TIESS-HP-Memoire-SQRI.pdf)  
> 60. Université du Québec en Outaouais \- Dépôt institutionnel de l'UQO, [https\://di.uqo.ca/id/eprint/1619/1/Roy-Beauregard\_Sarah-Jane\_2024\_memoire\_b.pdf](https://di.uqo.ca/id/eprint/1619/1/Roy-Beauregard_Sarah-Jane_2024_memoire_b.pdf)  
> 61. RAPPORT ANNUEL 2017-2018 \- TIESS, [https\://tiess.ca/medias/documents/TIESS\_RA-2017-2018.pdf](https://tiess.ca/medias/documents/TIESS_RA-2017-2018.pdf)  
> 62. Creating A PeerTube Instance on Managed Hosting \- YouTube, [https\://www\.youtube.com/watch?v=8xlcmoVcP6E](https://www.youtube.com/watch?v=8xlcmoVcP6E)  
> 63. Formulaire FACiLe \= Liberaforms \- Forums du libre du Québec, [https\://forumsdulibre.quebec/t/formulaire-facile-liberaforms/2220](https://forumsdulibre.quebec/t/formulaire-facile-liberaforms/2220)