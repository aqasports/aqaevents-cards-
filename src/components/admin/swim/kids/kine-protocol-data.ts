import type { Locale } from "@/lib/i18n";

export type KineGuideSectionId =
  | "prep"
  | "step1"
  | "step2"
  | "step3"
  | "step4"
  | "step5"
  | "step6"
  | "redflags";

export interface KineThresholdChip {
  tone: "emerald" | "sky" | "amber" | "rose";
  label: string;
}

export interface KineTestGuide {
  id: string;
  title: string;
  formField: string;
  unit?: string;
  position: string;
  steps: string[];
  thresholds: KineThresholdChip[];
  pitfall: string;
}

export interface KineGuideSection {
  id: KineGuideSectionId;
  badge: string;
  title: string;
  subtitle: string;
  image?: string;
  intro: string;
  checklist?: string[];
  tests?: KineTestGuide[];
  beightonTable?: { criterion: string; side: string; points: string }[];
  redFlagMatrix?: {
    domain: string;
    optimal: string;
    watch: string;
    referral: string;
  }[];
  references?: string[];
}

export interface KineProtocolBook {
  modalTitle: string;
  modalSubtitle: string;
  searchPlaceholder: string;
  printBtn: string;
  closeBtn: string;
  noSearchResults: string;
  labelField: string;
  labelPosition: string;
  labelExecution: string;
  labelThresholds: string;
  labelPitfall: string;
  labelBeightonTitle: string;
  labelColCriterion: string;
  labelColSide: string;
  labelColPoints: string;
  labelMatrixDomain: string;
  labelMatrixOptimal: string;
  labelMatrixWatch: string;
  labelMatrixReferral: string;
  labelReferences: string;
  sections: KineGuideSection[];
}

const FR_BOOK: KineProtocolBook = {
  modalTitle: "Manuel Clinique du Kinésithérapeute — AQA Kids",
  modalSubtitle:
    "Protocole détaillé de bilan physique pédiatrique, exécution des tests et règles de saisie du suivi",
  searchPlaceholder: "Rechercher un test, repère ou seuil (ex : Adams, ATR, C7, Jack, Beighton, DIM)...",
  printBtn: "Imprimer le manuel",
  closeBtn: "Fermer",
  noSearchResults: "Aucun test ou protocole ne correspond à votre recherche.",
  labelField: "Champ formulaire",
  labelPosition: "Position de départ",
  labelExecution: "Protocole d'exécution",
  labelThresholds: "Normes et seuils automatiques AQA",
  labelPitfall: "Vigilance et erreurs à éviter",
  labelBeightonTitle: "Grille de cotation Beighton (total sur 9 points)",
  labelColCriterion: "Test articulaire",
  labelColSide: "Côtés testés",
  labelColPoints: "Points",
  labelMatrixDomain: "Domaine",
  labelMatrixOptimal: "Optimal / Normal",
  labelMatrixWatch: "Surveillance (Watch)",
  labelMatrixReferral: "Orientation médicale (Referral)",
  labelReferences: "Références scientifiques et médicales du protocole",
  sections: [
    {
      id: "prep",
      badge: "00",
      title: "Préparation, Matériel et Flux de Saisie",
      subtitle: "Conditions d'examen standardisées (15 à 20 min par enfant) et utilisation du bureau admin",
      intro:
        "Le suivi physique AQA Kids est un bilan fonctionnel kinésithérapique de dépistage précoce. Il ne remplace pas un diagnostic médical radiologique, mais permet d'orienter rapidement vers un pédiatre ou un orthopédiste pédiatrique tout en adaptant le programme de natation corrective.",
      checklist: [
        "Salle calme, sol parfaitement plat et non glissant, éclairage homogène sans contre-jour, température 22 à 24 °C.",
        "Tenue d'examen : maillot de bain (ou short près du corps + dos découvert pour le rachis), strictement pieds nus.",
        "Présence d'un parent recommandée pour le consentement, la mise en confiance et l'interrogatoire sur les douleurs ou antécédents.",
        "Matériel obligatoire : toise murale (mm), balance calibrée (0.1 kg), mètre ruban souple (200 cm), fil à plomb, scoliomètre de Bunnell, règle rigide millimétrée, crayon dermographique, chronomètre, tapis ferme et banc d'assise.",
        "Fréquence : Bilan Initial T1 à l'inscription, puis tous les 6 mois en situation stable, ou tous les 3 à 4 mois en pic de croissance (>= 7.5 cm/an) ou en cas d'alerte.",
        "Workflow de saisie : remplir les 6 étapes dans l'ordre en vérifiant l'Aperçu Clinique en direct à droite (carte corporelle 8 zones, radar 6 axes, drapeaux et exercices aquatiques).",
        "Brouillon vs Publié : laisser décoché 'Publier sur le portail client' tant que le bilan n'est pas relu. Une fois validé, cocher la publication pour que les parents y accèdent depuis le profil public via le bouton Suivi Physique.",
      ],
    },
    {
      id: "step1",
      badge: "01",
      title: "Étape 1 : Profil Enfant et Anthropométrie (OMS 2007)",
      subtitle: "Croissance staturo-pondérale, Z-score IMC par sexe/âge, envergure et ampliation thoracique",
      intro:
        "La date de naissance et le sexe conditionnent le calcul automatique du Z-score IMC (tables LMS OMS 2007 de 4 à 16 ans) ainsi que la tolérance physiologique de l'âge pour le genu valgum (<= 6 ans) et le pied plat souple (<= 6 ans).",
      tests: [
        {
          id: "profile-meta",
          title: "Date de naissance, Sexe et Latéralité dominante",
          formField: "Date de naissance / Sexe / Latéralité",
          position: "Interrogatoire parent + observation spontanée (main d'écriture / pied d'appel).",
          steps: [
            "Vérifier la date de naissance exacte sur le dossier d'inscription.",
            "Sélectionner le sexe biologique (tables OMS garçons/filles distinctes).",
            "Noter la latéralité dominante et les antécédents médicaux/orthopédiques (port de semelles, entorses, asthme, douleurs de croissance).",
          ],
          thresholds: [
            { tone: "sky", label: "Obligatoire pour Z-score OMS exact" },
            { tone: "sky", label: "Ajuste seuils genoux/pieds <= 6 ans" },
          ],
          pitfall:
            "Sans date de naissance, le moteur ne peut ni calculer le Z-score IMC OMS ni distinguer un genu valgum/pied plat physiologique du jeune enfant.",
        },
        {
          id: "height-weight",
          title: "Taille debout, Poids et Vélocité de croissance",
          formField: "Taille (cm) / Poids (kg)",
          unit: "cm / kg",
          position: "Debout pieds nus, talons joints, fesses et occiput contre la toise, regard horizontal (plan de Francfort).",
          steps: [
            "Demander à l'enfant de se grandir et d'inspirer profondément sans décoller les talons.",
            "Descendre l'équerre à angle droit jusqu'au sommet du crâne et lire au 0.1 cm.",
            "Peser en maillot léger sur balance calibrée au 0.1 kg, si possible à la même tranche horaire entre deux bilans.",
          ],
          thresholds: [
            { tone: "emerald", label: "IMC Z-score : -2.0 à +1.0 (Normal)" },
            { tone: "amber", label: "Z < -2.0 (Maigreur) ou +1.0 à +2.0 (Surpoids)" },
            { tone: "rose", label: "Z < -3.0 ou Z > +2.0 (Orientation)" },
            { tone: "sky", label: "Vélocité >= 7.5 cm/an = Alerte pic de croissance" },
          ],
          pitfall:
            "Un pic de croissance >= 7.5 cm/an est la période de risque maximal d'aggravation rapide d'une scoliose idiopathique : raccourcir le délai du prochain bilan à 3-4 mois.",
        },
        {
          id: "armspan-sitting",
          title: "Envergure (Ape Index) et Taille assise",
          formField: "Envergure (cm) / Taille assise (cm)",
          unit: "cm",
          position: "Envergure : dos au mur, bras en croix à 90°, paumes vers l'avant. Taille assise : assis droit sur banc plat contre la toise.",
          steps: [
            "Mesurer l'envergure d'extrémité de majeur à extrémité de majeur en extension complète.",
            "Pour la taille assise, cuisses horizontales, dos plaqué contre la toise, déduire la hauteur exacte du banc.",
            "Comparer l'évolution de la taille assise entre deux bilans pour détecter le début de la poussée pubertaire du tronc.",
          ],
          thresholds: [
            { tone: "emerald", label: "Ape Index (Envergure - Taille) ~ 0 à +4 cm" },
            { tone: "sky", label: "Envergure/Taille > 1.05 + hyperlaxité : noter dans remarques" },
          ],
          pitfall:
            "Veiller à ce que l'enfant ne fléchisse pas les coudes et ne hausse pas les épaules lors de la mesure d'envergure.",
        },
        {
          id: "chest-expansion",
          title: "Ampliation thoracique",
          formField: "Ampliation thoracique (cm)",
          unit: "cm",
          position: "Debout, bras relâchés le long du corps.",
          steps: [
            "Placer le mètre ruban horizontalement au niveau du 4e espace intercostal (ligne mamelonnaire).",
            "Mesurer le périmètre en expiration forcée maximale (C1), puis en inspiration profonde maximale (C2).",
            "Saisir la différence (C2 - C1) en cm (ex : 68.5 - 63.5 = 5.0 cm).",
          ],
          thresholds: [
            { tone: "emerald", label: ">= 3.5 cm : Ampliation normale" },
            { tone: "amber", label: "< 3.5 cm : Hypo-ampliation (Surveillance + ventilation aquatique)" },
          ],
          pitfall:
            "Éviter que l'enfant ne contracte les grands dorsaux ou ne gonfle uniquement le ventre : guider une ouverture costale ample.",
        },
      ],
    },
    {
      id: "step2",
      badge: "02",
      title: "Étape 2 : Rachis Frontal — Dépistage Scoliose (SOSORT / SRS)",
      subtitle: "Inspection posturale de dos, test d'antéflexion d'Adams, scoliomètre de Bunnell et fil à plomb C7",
      image: "/image/kids-suivi/scoliosis-hologram.jpg",
      intro:
        "C'est le temps le plus stratégique du dépistage locomoteur pédiatrique. L'objectif est de distinguer une simple attitude scoliotique (sans rotation vertébrale) d'une scoliose structurale (présence d'une gibbosité et d'une rotation axiale ATR).",
      tests: [
        {
          id: "adams-test",
          title: "Test d'antéflexion d'Adams",
          formField: "Test d'Adams",
          position: "Debout pieds nus, talons joints, genoux strictement tendus, bras relâchés mains jointes paume contre paume.",
          steps: [
            "Demander à l'enfant de se pencher lentement vers l'avant en enroulant la tête puis le dos jusqu'à l'horizontale du tronc.",
            "Se placer exactement derrière l'enfant, yeux au niveau du dos (vue tangentielle), pour observer les régions thoracique haute, thoracique moyenne et lombaire.",
            "Compléter par une observation de face en vue tangentielle (particulièrement utile pour le rachis thoracique supérieur).",
            "Identifier toute voussure unilatérale fixe (gibbosité costale ou bourrelet lombaire).",
          ],
          thresholds: [
            { tone: "emerald", label: "Négatif : Dos parfaitement symétrique" },
            { tone: "amber", label: "Asymétrie posturale sans gibbosité : Surveillance" },
            { tone: "rose", label: "Gibbosité thoracique / lombaire / double : Orientation" },
          ],
          pitfall:
            "Une flexion même légère d'un seul genou crée une fausse asymétrie du bassin et du dos. Vérifier systématiquement l'extension bilatérale des genoux et l'égalité d'appui des pieds.",
        },
        {
          id: "scoliometer-atr",
          title: "Scoliomètre de Bunnell — Angle de Rotation du Tronc (ATR)",
          formField: "Scoliomètre ATR (deg)",
          unit: "deg",
          position: "Maintenir l'enfant en position d'Adams à l'angle de flexion où la gibbosité est la plus saillante.",
          steps: [
            "Poser doucement le scoliomètre perpendiculairement à l'axe du rachis, l'encoche centrale exactement au-dessus des apophyses épineuses.",
            "Faire glisser lentement le scoliomètre de T1 à L5 en adaptant le degré de flexion du tronc pour chaque étage.",
            "Lire l'inclinaison maximale de la bille en degrés (sans exercer de pression sur la peau) et saisir la valeur maximale relevée.",
          ],
          thresholds: [
            { tone: "emerald", label: "0 à 3° : Normal" },
            { tone: "amber", label: "4° : Attitude scoliotique (Surveillance)" },
            { tone: "amber", label: "5 à 6° : Seuil de vigilance SOSORT (recontrôle 4 mois)" },
            { tone: "rose", label: ">= 7° : Seuil d'orientation médicale / radio rachis entier" },
          ],
          pitfall:
            "Si l'enfant a une inégalité de longueur des membres inférieurs (ILMI > 10 mm), refaire le test d'Adams assis sur un banc horizontal pour éliminer une fausse gibbosité lombaire d'origine pelvienne.",
        },
        {
          id: "frontal-landmarks",
          title: "4 Repères statiques de dos (Épaules, Scapulas, Taille, Bassin)",
          formField: "Niveau épaules / Scapulas / Triangles taille / Bassin",
          position: "Debout relâché, bras pendants le long du corps, pieds légèrement écartés à largeur de bassin.",
          steps: [
            "Épaules : comparer la hauteur des deux acromions.",
            "Scapulas : vérifier la symétrie des pointes inférieures et détecter un décollement bilatéral (scapula alata).",
            "Triangles de la taille : comparer l'ouverture entre chaque flanc et le bras pendant (un triangle plus fermé/profond traduit une translation du tronc).",
            "Bassin : poser les deux pouces horizontalement sur le sommet des crêtes iliaques et vérifier l'horizontalité.",
          ],
          thresholds: [
            { tone: "emerald", label: "4 repères équilibrés : Optimal" },
            { tone: "amber", label: ">= 2 asymétries ou Scapula alata : Surveillance" },
          ],
          pitfall:
            "Laisser l'enfant se tenir naturellement pendant 10 secondes avant d'observer : beaucoup d'enfants se mettent au garde-à-vous au début et masquent leur posture habituelle.",
        },
        {
          id: "plumb-c7",
          title: "Déséquilibre frontal au fil à plomb (C7 -> Pli interfessier)",
          formField: "Fil à plomb frontal C7 (mm)",
          unit: "mm",
          position: "Debout naturel vu de dos.",
          steps: [
            "Repérer l'épineuse de C7 (la vertèbre la plus proéminente à la base du cou en flexion cervicale).",
            "Laisser pendre le fil à plomb verticalement depuis C7 jusqu'au pli interfessier.",
            "Mesurer l'écart horizontal en millimètres par rapport au pli interfessier (valeur négative si déviation à gauche, positive si à droite).",
          ],
          thresholds: [
            { tone: "emerald", label: "-11 à +11 mm : Équilibre frontal normal" },
            { tone: "amber", label: "|Déviation| >= 12 mm : Déséquilibre frontal (Surveillance)" },
          ],
          pitfall:
            "Attendre l'immobilisation complète du fil à plomb et ne pas laisser le fil frotter sur le maillot ou les fesses.",
        },
      ],
    },
    {
      id: "step3",
      badge: "03",
      title: "Étape 3 : Rachis Sagittal — Cyphose et Hyperlordose (Delmas / Stagnara)",
      subtitle: "Analyse de profil, flèches sagittales C7 / T6 / L3 et test de réductibilité dorsale",
      image: "/image/kids-suivi/sagittal-hologram.jpg",
      intro:
        "L'examen de profil dépiste les dos ronds posturaux (souvent liés aux écrans et au cartable), les hyperlordoses lombaires par faiblesse abdominale, et surtout les hypercyphoses rigides évoquant une maladie de Scheuermann.",
      tests: [
        {
          id: "head-posture",
          title: "Port de tête (Alignement cervico-céphalique)",
          formField: "Port de tête",
          position: "Debout de profil strict, regard horizontal vers un point fixe à hauteur des yeux.",
          steps: [
            "Tracer mentalement ou au fil à plomb la verticale passant par l'acromion et le grand trochanter.",
            "Vérifier si le tragus de l'oreille se projette dans cet axe ou nettement en avant.",
          ],
          thresholds: [
            { tone: "emerald", label: "Alignée : Tragus aligné avec l'acromion" },
            { tone: "sky", label: "Antéprojection légère : Information / surveillance douce" },
            { tone: "amber", label: "Antéprojection marquée : Surveillance + dos crawlé" },
          ],
          pitfall:
            "Ne pas demander 'tiens-toi droit' avant l'observation de profil : évaluer d'abord la posture spontanée.",
        },
        {
          id: "kyphosis-reducibility",
          title: "Cyphose thoracique et Test de réductibilité (Dépistage Scheuermann)",
          formField: "Cyphose thoracique / Réductibilité thoracique",
          position: "Vue de profil debout, puis test actif d'auto-agrandissement et test en décubitus ventral.",
          steps: [
            "Observer la courbure dorsale au repos : harmonieuse (normale), accentuée arrondie (dos rond postural), angulée (hypercyphose), ou effacée (dos plat).",
            "Demander à l'enfant de se redresser au maximum (auto-agrandissement + ouverture des épaules), puis observer en décubitus ventral sur tapis en extension douce du buste.",
            "Évaluer la réductibilité : Complète (la courbure s'efface totalement), Partielle, ou Rigide (une angulation dorsale fixe persiste).",
          ],
          thresholds: [
            { tone: "emerald", label: "Normale + Réductibilité complète" },
            { tone: "amber", label: "Dos rond postural / Hypercyphose réductible : Surveillance + dos crawlé" },
            { tone: "rose", label: "Hypercyphose rigide ou Réductibilité rigide : Orientation (bilan Scheuermann)" },
          ],
          pitfall:
            "Une cyphose angulaire rigide chez un pré-adolescent (10-15 ans), surtout si elle s'accompagne de dorsalgies d'effort, impose un avis médical orthopédique.",
        },
        {
          id: "sagittal-arrows",
          title: "Flèches sagittales au fil à plomb (C7, T6, L3)",
          formField: "Flèches C7 / T6 / L3 (mm)",
          unit: "mm",
          position: "Debout naturel de profil, pieds légèrement écartés.",
          steps: [
            "Placer le fil à plomb tangent au point le plus postérieur du rachis (habituellement l'apex thoracique T6-T7 et le sillon interfessier S2).",
            "Mesurer horizontalement avec la règle rigide la distance entre le fil et l'épineuse de C7 (flèche cervicale).",
            "Mesurer la distance au sommet dorsal T6 (normalement 0 mm au point de contact).",
            "Mesurer la distance au creux lombaire maximal L3 (flèche lombaire).",
          ],
          thresholds: [
            { tone: "emerald", label: "C7 : 20 à 35 mm | T6 : 0 mm | L3 : 25 à 40 mm" },
            { tone: "amber", label: "L3 > 45 mm : Hyperlordose lombaire (Surveillance + gainage)" },
            { tone: "amber", label: "C7 > 45 mm : Accentuation cyphotique / port de tête antérieur" },
          ],
          pitfall:
            "Si le fil à plomb ne touche pas simultanément T6 et S2, noter l'écart de T6 et vérifier un déséquilibre sagittal global (déjettement antérieur ou postérieur).",
        },
      ],
    },
    {
      id: "step4",
      badge: "04",
      title: "Étape 4 : Membres Inférieurs et Marche (Salenius & Vankka)",
      subtitle: "Axes frontaux des genoux (DIM / DIC), recurvatum, inégalité de longueur (ILMI) et marche",
      image: "/image/kids-suivi/knees-hologram.jpg",
      intro:
        "Chez l'enfant, l'axe des genoux évolue physiologiquement avec la croissance (Salenius & Vankka) : genu varum avant 2 ans, genu valgum physiologique entre 2 et 6 ans, puis alignement adulte vers 7-8 ans. Les seuils du moteur tiennent compte de l'âge.",
      tests: [
        {
          id: "knee-valgum-varum",
          title: "Alignement frontal des genoux — Mesures DIM et DIC",
          formField: "Alignement genoux / DIM (cm) / DIC (cm)",
          unit: "cm",
          position: "Debout pieds nus face au kiné, rotules strictement orientées droit devant (ni en dedans, ni en dehors).",
          steps: [
            "Pour le Genu Valgum (genoux en X) : amener doucement les condyles internes des genoux au contact sans forcer, puis mesurer avec la règle la Distance Inter-Malléolaire (DIM) entre les deux malléoles internes en cm.",
            "Pour le Genu Varum (jambes arquées) : joindre les deux malléoles internes, rotules droit devant, puis mesurer la Distance Inter-Condylienne (DIC) entre les deux condyles fémoraux internes en cm.",
            "Vérifier la stricte symétrie droite/gauche : toute déformation unilatérale se code 'Asymétrique'.",
          ],
          thresholds: [
            { tone: "emerald", label: "Normal : Genoux et malléoles alignés" },
            { tone: "sky", label: "Valgum <= 6 cm chez <= 6 ans : Physiologique (Info)" },
            { tone: "amber", label: "Valgum après 6 ans (<= 6 cm) ou Varum <= 5 cm : Surveillance" },
            { tone: "rose", label: "Valgum DIM > 6 cm (> 6 ans) ou > 8 cm | Varum DIC > 5 cm | Asymétrique : Orientation" },
          ],
          pitfall:
            "Erreur classique : une rotation interne des hanches (enfant qui louche des rotules) simule un faux genu valgum. Toujours aligner les rotules de face avant de mesurer la DIM.",
        },
        {
          id: "knee-sagittal",
          title: "Alignement sagittal du genou (Recurvatum / Flexum)",
          formField: "Genou sagittal",
          position: "Debout de profil, jambes tendues naturellement.",
          steps: [
            "Observer l'angle entre la cuisse et la jambe.",
            "Identifier un genu recurvatum (genou partant en hyperextension > 10° en arrière, souvent associé à l'hyperlaxité) ou un flexum (impossibilité d'extension complète).",
          ],
          thresholds: [
            { tone: "emerald", label: "Normal : Extension neutre 0°" },
            { tone: "amber", label: "Recurvatum ou Flexum : Surveillance + contrôle quadricipital" },
          ],
          pitfall:
            "En natation, un genu recurvatum marqué associé à un battement de jambes trop raide peut irriter le genou : privilégier un battement souple initié par la hanche.",
        },
        {
          id: "lld-ilmi",
          title: "Inégalité de longueur des membres inférieurs (ILMI)",
          formField: "Inégalité de longueur (mm)",
          unit: "mm",
          position: "Méthode fonctionnelle debout (cales) + contrôle couché (EIAS -> malléole interne).",
          steps: [
            "Debout de dos, genoux tendus, évaluer la bascule des crêtes iliaques.",
            "Glisser des planchettes/cales de 5 mm sous le pied du côté le plus bas jusqu'à horizontaliser parfaitement les crêtes iliaques : l'épaisseur totale donne l'ILMI fonctionnelle en mm.",
            "En cas de doute, confirmer couché sur le dos au mètre ruban (EIAS -> pointe de la malléole interne).",
          ],
          thresholds: [
            { tone: "emerald", label: "< 8 mm : Variation physiologique non significative" },
            { tone: "amber", label: "8 à 15 mm : Surveillance (recontrôler à 6 mois)" },
            { tone: "rose", label: "> 15 mm : Orientation médicale (bilan orthopédique)" },
          ],
          pitfall:
            "Toujours vérifier l'absence de flessum de genou ou d'effondrement unilatéral d'une arche plantaire (faux membre court) avant de conclure à une ILMI vraie.",
        },
        {
          id: "gait-eval",
          title: "Observation dynamique de la marche",
          formField: "Marche",
          position: "Couloir dégagé de 5 à 6 mètres, enfant marchant pieds nus à allure naturelle aller-retour.",
          steps: [
            "Observer l'angle du pas : normal, pieds en dedans (intoeing), ou pieds en dehors (outtoeing).",
            "Vérifier le déroulé talon-pointe : noter toute marche permanente sur la pointe des pieds (toe walking).",
            "Rechercher toute asymétrie d'appui, boiterie d'esquive ou bascule du bassin (signe de Trendelenburg).",
          ],
          thresholds: [
            { tone: "emerald", label: "Normale : Déroulé talon-pointe fluide et symétrique" },
            { tone: "amber", label: "Intoeing / Outtoeing / Pointe des pieds : Surveillance" },
            { tone: "rose", label: "Boiterie : Orientation médicale rapide" },
          ],
          pitfall:
            "Toute boiterie récente ou douloureuse chez l'enfant (hanche, genou, talon) contre-indique l'effort intensif jusqu'à avis médical.",
        },
      ],
    },
    {
      id: "step5",
      badge: "05",
      title: "Étape 5 : Pieds et Podologie (Staheli / Test de Jack)",
      subtitle: "Arche plantaire en charge, axe calcanéen, mécanisme du treuil (Jack) et montée sur pointes",
      image: "/image/kids-suivi/feet-hologram.jpg",
      intro:
        "Le pied plat souple et indolore est extrêmement fréquent et physiologique jusqu'à 6 ans grâce au coussinet adipeux plantaire et à la laxité ligamentaire. Les tests de Jack et de montée sur pointes permettent de confirmer en 10 secondes la souplesse et la réductibilité de l'arche.",
      tests: [
        {
          id: "foot-arch-heel",
          title: "Arche plantaire en charge et Alignement du talon (Valgus calcanéen)",
          formField: "Voûte plantaire / Alignement talon",
          position: "Debout pieds nus en appui bipodal symétrique (idéalement sur podoscope ou sol clair).",
          steps: [
            "Vue médiale : observer la hauteur de la voûte longitudinale interne (normale, affaissée = pied plat, ou excessivement creusée = pied creux).",
            "Vue postérieure : observer l'angle entre le tendon d'Achille et l'axe vertical du calcanéum (neutre, valgus léger <= 5°, valgus marqué > 10°, ou varus).",
          ],
          thresholds: [
            { tone: "emerald", label: "Voûte normale + Talon neutre" },
            { tone: "sky", label: "Pied plat souple <= 6 ans sans valgus marqué : Physiologique (Info)" },
            { tone: "amber", label: "Pied plat souple > 6 ans / Pied creux / Valgus marqué : Surveillance" },
            { tone: "rose", label: "Pied plat rigide ou Pied douloureux : Orientation" },
          ],
          pitfall:
            "Un pied creux évolutif ou asymétrique chez l'enfant doit toujours faire interroger sur les antécédents familiaux et orienter si raideur associée.",
        },
        {
          id: "jack-windlass",
          title: "Test de Jack (Mécanisme du treuil / Windlass)",
          formField: "Test de Jack",
          position: "Enfant debout en charge égale sur ses deux pieds, genoux tendus.",
          steps: [
            "Saisir doucement le gros orteil (hallux) et réaliser une dorsiflexion passive franche vers le haut (extension de l'articulation métatarso-phalangienne).",
            "Observer immédiatement la voûte interne : la mise en tension du fascia plantaire doit soulever et creuser l'arche médiale et entraîner une légère rotation externe du tibia.",
            "Coder 'Positif / Réductible' si l'arche se reforme, ou 'Négatif / Rigide' si l'arche reste totalement plate malgré l'extension de l'hallux.",
          ],
          thresholds: [
            { tone: "emerald", label: "Positif / Réductible : Pied plat souple bénin" },
            { tone: "rose", label: "Négatif / Rigide (avec pied plat) : Orientation (synostose tarsienne)" },
          ],
          pitfall:
            "Si l'enfant crispe les orteils ou soulève le talon du sol, le test est faussé : maintenir le talon bien à plat et détendre le pied avant de relever l'hallux.",
        },
        {
          id: "tiptoe-pain",
          title: "Test de montée sur pointes et Dépistage douleur / fatigabilité",
          formField: "Test sur pointes / Douleur ou fatigabilité plantaire",
          position: "Debout de dos face à un mur (appui léger des doigts autorisé pour l'équilibre).",
          steps: [
            "Demander à l'enfant de monter haut sur la pointe des deux pieds.",
            "Vérifier de dos que l'arche interne se creuse ET que le talon bascule du valgus vers un léger varus.",
            "Interroger l'enfant et le parent : douleurs sous le pied, au talon après le sport (apophysite de Sever), crampes de mollet ou fatigabilité rapide à la marche.",
          ],
          thresholds: [
            { tone: "emerald", label: "Arche se reforme + Indolore : Rassurant" },
            { tone: "rose", label: "Arche absente sur pointes OU Douleur plantaire + anomalie : Orientation" },
          ],
          pitfall:
            "En cas de pied plat souple indolore, recommander les exercices pieds nus sur tapis, le travail intrinsèque du pied et les battements en piscine (sans sur-prescrire de semelles orthopédiques inutiles avant 6 ans).",
        },
      ],
    },
    {
      id: "step6",
      badge: "06",
      title: "Étape 6 : Souplesse, Gainage, Neuromoteur et Synthèse",
      subtitle: "DDS, Schöber, Beighton (0-9), endurance gainage/extenseurs, équilibre, respiration et publication",
      intro:
        "Cette dernière étape évalue la capacité fonctionnelle globale de l'enfant (mobilité rachidienne, hyperlaxité, force posturale profonde et ventilation), puis permet de rédiger la synthèse parentale et de décider de la publication.",
      tests: [
        {
          id: "dds-schober",
          title: "Distance Doigts-Sol (DDS) et Test de Schöber lombaire",
          formField: "Distance Doigts-Sol (cm) / Test de Schöber (+cm)",
          unit: "cm",
          position: "Debout pieds joints, genoux strictement tendus.",
          steps: [
            "Pour le Schöber : debout droit, repérer au crayon dermographique le niveau de S1 (ligne des fossettes sacrées) et marquer un second point exactement 10.0 cm au-dessus.",
            "Demander à l'enfant de se pencher au maximum vers le sol sans plier les genoux.",
            "Mesurer la Distance Doigts-Sol : 0 cm si le bout des doigts touche le sol, valeur positive en cm s'il reste un espace au-dessus du sol, valeur négative si les paumes posent à plat.",
            "En flexion maximale, remesurer la distance entre les deux repères lombaires et saisir l'allongement gagné (ex : 14.5 cm - 10.0 cm = saisir 4.5).",
          ],
          thresholds: [
            { tone: "emerald", label: "DDS <= 12 cm et Schöber >= +4.0 cm : Normal" },
            { tone: "amber", label: "DDS > 12 cm : Raideur chaîne postérieure (ischio-jambiers)" },
            { tone: "amber", label: "Schöber < +4.0 cm : Raideur lombaire (Surveillance)" },
          ],
          pitfall:
            "Un enfant aux ischio-jambiers très raides (DDS 20 cm) peut avoir un Schöber normal (+5 cm) : les deux mesures sont complémentaires pour différencier raideur musculaire et raideur rachidienne.",
        },
        {
          id: "beighton-score",
          title: "Score de Beighton — Dépistage de l'hyperlaxité articulaire",
          formField: "Score de Beighton (0-9)",
          unit: "/ 9",
          position: "Enfant debout ou assis, testing passif doux sans jamais forcer ni déclencher de douleur.",
          steps: [
            "Évaluer chacun des 5 items de la grille ci-dessous (4 items bilatéraux = 8 pts + 1 item global = 1 pt, total 0 à 9).",
            "Saisir le score entier total (0 à 9).",
          ],
          thresholds: [
            { tone: "emerald", label: "0 à 5 / 9 : Mobilité articulaire habituelle" },
            { tone: "amber", label: ">= 6 / 9 : Hyperlaxité pédiatrique (Surveillance + proprioception)" },
          ],
          pitfall:
            "Chez l'enfant hyperlaxe (>= 6/9), déconseiller les étirements passifs extrêmes et privilégier le renforcement stabilisateur et le gainage en piscine.",
        },
        {
          id: "core-extensors-balance",
          title: "Endurance Gainage, Extenseurs dorsaux et Équilibre unipodal",
          formField: "Gainage (s) / Extenseurs (s) / Équilibre unipodal (s)",
          unit: "s",
          position: "Tapis de sol ferme pour gainage et extenseurs ; sol dur pieds nus pour l'équilibre.",
          steps: [
            "Gainage abdominal : planche frontale sur avant-bras et pointes de pieds, alignement tête-dos-bassin. Stopper le chrono dès que les hanches chutent ou montent excessivement.",
            "Extenseurs dorsaux (Superman / Sørensen adapté) : à plat ventre sur tapis, décoller légèrement le sternum du sol (mains le long du corps, menton rentré, pieds au sol), chronométrer la tenue propre.",
            "Équilibre unipodal : pieds nus yeux ouverts, mains sur les hanches, un pied levé sans toucher la jambe d'appui. Tester les 2 côtés et saisir le temps le plus faible (cible 20 à 30 s).",
          ],
          thresholds: [
            { tone: "amber", label: "Gainage < 20 s : Faiblesse du tronc (Surveillance)" },
            { tone: "emerald", label: "Gainage 20 à 44 s : Satisfaisant | >= 45 s : Bonus +6 pts" },
            { tone: "sky", label: "Cible pédiatrique équilibre unipodal : >= 20 s" },
          ],
          pitfall:
            "Surveiller la respiration pendant le gainage : rappeler à l'enfant de respirer calmement et de ne pas bloquer en apnée.",
        },
        {
          id: "shoulder-breathing-synthesis",
          title: "Mobilité épaules, Mode respiratoire, Synthèse et Publication",
          formField: "Mobilité épaules / Respiration / Synthèse / Conseils / Publier",
          position: "Dos au mur pour les épaules ; observation calme au repos pour la respiration.",
          steps: [
            "Épaules : dos, bassin et tête contre le mur, lever les deux bras tendus au-dessus de la tête sans décoller le bas du dos (optimal si les mains touchent le mur sans compensation lombaire).",
            "Respiration : observer au repos si la ventilation est diaphragmatique (ventre et basses côtes souples), thoracique haute, ou buccale chronique.",
            "Rédiger une Synthèse clinique claire et des Conseils aux parents concrets (cartable, posture assise, exercices ludiques, natation), fixer la date du Prochain contrôle (3, 4 ou 6 mois).",
            "Vérifier l'Aperçu en direct à droite puis cocher 'Publier sur le portail client' uniquement lorsque le bilan est complet et relu.",
          ],
          thresholds: [
            { tone: "emerald", label: "Épaules optimales + Respiration diaphragmatique" },
            { tone: "amber", label: "Restriction épaules ou Respiration buccale/thoracique : Programme adapté" },
          ],
          pitfall:
            "Éviter le jargon anxiogène dans 'Conseils aux parents' : privilégier un ton pédagogique et bienveillant (ex : 'À vérifier sereinement avec votre pédiatre lors d'une consultation de contrôle').",
        },
      ],
      beightonTable: [
        { criterion: "Extension passive du 5e doigt (auriculaire) > 90°", side: "Gauche + Droite", points: "2 pts (1 + 1)" },
        { criterion: "Apposition passive du pouce sur la face antérieure de l'avant-bras", side: "Gauche + Droite", points: "2 pts (1 + 1)" },
        { criterion: "Hyperextension du coude > 10°", side: "Gauche + Droite", points: "2 pts (1 + 1)" },
        { criterion: "Hyperextension du genou (recurvatum) > 10°", side: "Gauche + Droite", points: "2 pts (1 + 1)" },
        { criterion: "Paumes complètement à plat au sol, genoux strictement tendus", side: "Global", points: "1 pt" },
      ],
    },
    {
      id: "redflags",
      badge: "07",
      title: "Matrice des Drapeaux Rouges et Références Médicales",
      subtitle: "Synthèse de tous les seuils automatiques du moteur AQA et conduite à tenir",
      intro:
        "Le moteur clinique AQA Kids évalue en temps réel vos saisies et classe chaque enfant en Optimal, Surveillance ou Orientation médicale. Le tableau ci-dessous résume exactement chaque seuil de déclenchement.",
      redFlagMatrix: [
        {
          domain: "Croissance & IMC (OMS 2007)",
          optimal: "Z-score -2.0 à +1.0 | Ampliation >= 3.5 cm",
          watch: "Z-score -3 à -2 (maigreur) ou +1 à +2 (surpoids) | Ampliation < 3.5 cm | Pic >= 7.5 cm/an (info)",
          referral: "IMC Z-score < -3.0 (maigreur sévère) ou > +2.0 (obésité)",
        },
        {
          domain: "Scoliose / Frontal (SOSORT)",
          optimal: "Adams négatif | ATR 0-3° | C7 < 12 mm | Repères symétriques",
          watch: "Adams asymétrie posturale | ATR 4-6° | C7 >= 12 mm | >= 2 asymétries | Scapula alata",
          referral: "Gibbosité vraie à l'Adams OU Scoliomètre ATR >= 7°",
        },
        {
          domain: "Sagittal (Delmas / Stagnara)",
          optimal: "Tête alignée | C7 20-35 mm | T6 0 mm | L3 25-40 mm | Réductibilité complète",
          watch: "Dos rond postural / hypercyphose réductible | Hyperlordose ou L3 > 45 mm | Antéprojection marquée",
          referral: "Hypercyphose rigide OU Réductibilité thoracique rigide (bilan Scheuermann)",
        },
        {
          domain: "Genoux & Marche (Salenius)",
          optimal: "Axes alignés | ILMI < 8 mm | Marche normale | Valgum <= 6 cm si <= 6 ans (info)",
          watch: "Valgum après 6 ans (<= 6 cm) | Varum <= 5 cm | Recurvatum | ILMI 8-15 mm | Intoeing/Toe walking",
          referral: "Valgum DIM > 6 cm (> 6 ans) ou > 8 cm | Varum DIC > 5 cm | Genoux asymétriques | ILMI > 15 mm | Boiterie",
        },
        {
          domain: "Pieds & Podologie (Staheli / Jack)",
          optimal: "Voûte normale | Talon neutre | Jack positif | Pointes : arche se reforme | Indolore",
          watch: "Pied plat souple > 6 ans | Pied creux | Valgus calcanéen marqué",
          referral: "Pied plat rigide | Test de Jack négatif | Arche absente sur pointes | Douleur plantaire + anomalie",
        },
        {
          domain: "Souplesse & Gainage",
          optimal: "DDS <= 12 cm | Schöber >= 4 cm | Beighton <= 5/9 | Gainage >= 20 s",
          watch: "DDS > 12 cm | Schöber < 4 cm | Beighton >= 6/9 | Épaules restreintes | Gainage < 20 s",
          referral: "Cocher 'Orientation médicale' si douleur rachidienne nocturne, déficit neurologique ou doute clinique",
        },
      ],
      references: [
        "OMS / WHO (2006 & 2007) — Child Growth Standards & Growth Reference Data for 5-19 years (tables LMS IMC-pour-l'âge).",
        "SOSORT 2016 Guidelines (Negrini et al., Scoliosis and Spinal Disorders, 2018) & SRS (Scoliosis Research Society) — Dépistage scoliose, test d'Adams et scoliomètre de Bunnell.",
        "Bunnell WP (JBJS 1984 / Spine 1993) — Outcome of spinal screening et seuil ATR 5° / 7°.",
        "Stagnara P & Delmas A — Évaluation des courbures sagittales par flèches C7/T6/L3 et maladie de Scheuermann.",
        "Salenius P & Vankka E (JBJS Am, 1975) — Development of the tibiofemoral angle in children (évolution physiologique DIM/DIC).",
        "Staheli LT, Chew DE, Corbett M (JBJS Am, 1987) & Jack EA (JBJS Br, 1953) — Arche plantaire pédiatrique et test du treuil (Windlass).",
        "Beighton P, Solomon L, Soskolne CL (Ann Rheum Dis, 1973) & Schöber modifié — Cotation de l'hypermobilité articulaire et souplesse lombaire.",
      ],
    },
  ],
};

const AR_BOOK: KineProtocolBook = {
  modalTitle: "الدليل السريري لاخصائي العلاج الطبيعي — AQA Kids",
  modalSubtitle:
    "بروتوكول مفصل للتقييم البدني للاطفال، خطوات تنفيذ كل اختبار، ومعايير ملء استمارة المتابعة",
  searchPlaceholder: "ابحث عن اختبار او معيار (مثل: Adams، ATR، C7، Jack، Beighton، DIM)...",
  printBtn: "طباعة الدليل",
  closeBtn: "اغلاق",
  noSearchResults: "لا يوجد اختبار او بروتوكول مطابق لبحثك.",
  labelField: "الحقل في الاستمارة",
  labelPosition: "وضعية البداية",
  labelExecution: "خطوات تنفيذ الاختبار",
  labelThresholds: "القيم المرجعية وعتبات التقييم التلقائي AQA",
  labelPitfall: "نقاط الانتباه والاخطاء الشائعة",
  labelBeightonTitle: "جدول تقييم مقياس Beighton (المجموع من 9 نقاط)",
  labelColCriterion: "الاختبار المفصلي",
  labelColSide: "الجهة المختبرة",
  labelColPoints: "النقاط",
  labelMatrixDomain: "المحور",
  labelMatrixOptimal: "طبيعي / مثالي",
  labelMatrixWatch: "مراقبة (Watch)",
  labelMatrixReferral: "توجيه طبي (Referral)",
  labelReferences: "المراجع العلمية والطبية المعتمدة في البروتوكول",
  sections: [
    {
      id: "prep",
      badge: "00",
      title: "التحضير، المعدات ومسار ملء الاستمارة",
      subtitle: "شروط الفحص المعيارية (15 الى 20 دقيقة لكل طفل) وطريقة استخدام لوحة المتابعة",
      intro:
        "المتابعة البدنية AQA Kids هي فحص وظيفي مبكر يجريه اخصائي العلاج الطبيعي للكشف المبكر عن اضطرابات النمو والحركة وتكييف برنامج السباحة التصحيحية. لا يعوض التشخيص الطبي او الاشعاعي ولكنه يوجه الاهل بدقة في الوقت المناسب.",
      checklist: [
        "قاعة هادئة، ارضية مستوية وغير زلقة، اضاءة متجانسة، حرارة مريحة بين 22 و 24 درجة مئوية.",
        "لباس الفحص: لباس سباحة او شورت ملائم مع كشف الظهر لفحص العمود الفقري، والطفل حافي القدمين تماما.",
        "يفضل حضور احد الوالدين للموافقة وطمانة الطفل وجمع المعلومات حول الالام او السوابق الطبية.",
        "المعدات الضرورية: مقياس طول جداري (مم)، ميزان معاير (0.1 كغ)، شريط قياس مرن (200 سم)، خيط الشاقول السريري، مقياس الجنف Bunnell Scoliometer، مسطرة صلبة بالمليمتر، قلم جلدي طبي، كرونومتر، بساط رياضي ومقعد مستو.",
        "وتيرة الفحص: تقييم اولي T1 عند التسجيل، ثم كل 6 اشهر للحالات المستقرة، او كل 3 الى 4 اشهر اثناء طفرة النمو (>= 7.5 سم/سنة) او عند وجود تنبيه.",
        "مسار الادخال: املا المراحل ال 6 بالترتيب مع مراجعة المعاينة السريرية المباشرة على الجانب (خريطة الجسم، المخطط السداسي، التنبيهات والتوصيات المائية).",
        "مسودة مقابل منشور: اترك خيار 'نشر في بوابة العميل' غير مفعل اثناء المراجعة، ثم فعله بعد التدقيق ليظهر للوالدين في الملف العام عبر زر المتابعة البدنية.",
      ],
    },
    {
      id: "step1",
      badge: "01",
      title: "المرحلة 1 : ملف الطفل والقياسات الانثروبومترية (منظمة الصحة العالمية 2007)",
      subtitle: "النمو الطولي والوزني، مؤشر كتلة الجسم Z-score حسب الجنس والعمر، باع الذراعين وسعة الصدر",
      intro:
        "تاريخ الميلاد والجنس ضروريان لحساب Z-score لمؤشر كتلة الجسم بدقة (جداول LMS لمنظمة الصحة العالمية 2007 من 4 الى 16 سنة)، كما يضبط العمر العتبات الفيزيولوجية للركبة الروحاء (<= 6 سنوات) والقدم المسطحة المرنة (<= 6 سنوات).",
      tests: [
        {
          id: "profile-meta",
          title: "تاريخ الميلاد، الجنس والجانب المسيطر",
          formField: "تاريخ الميلاد / الجنس / الجانب المسيطر",
          position: "استجواب الولي وملاحظة اليد او القدم المستعملة تلقائيا.",
          steps: [
            "التحقق من تاريخ الميلاد الدقيق من ملف التسجيل.",
            "اختيار الجنس البيولوجي لان جداول النمو WHO تختلف بين الذكور والاناث.",
            "تدوين الجانب المسيطر والملاحظات الطبية (نعال طبية، ربو، التواءات سابقة، الام النمو).",
          ],
          thresholds: [
            { tone: "sky", label: "ضروري لحساب Z-score بدقة" },
            { tone: "sky", label: "يضبط الحدود الفيزيولوجية <= 6 سنوات" },
          ],
          pitfall:
            "بدون تاريخ الميلاد لا يمكن للمحرك حساب Z-score ولا التمييز بين الوضع الفيزيولوجي الطبيعي لصغار السن وبين الانحراف المرضي.",
        },
        {
          id: "height-weight",
          title: "الطول واقفا، الوزن وسرعة النمو السنوية",
          formField: "الطول (cm) / الوزن (kg)",
          unit: "cm / kg",
          position: "وقوف حافي القدمين، الكعبان متلاصقان، الارداف ومؤخرة الراس ملاصقة للجدار، النظر افقي.",
          steps: [
            "اطلب من الطفل الاستقامة واخذ نفس عميق دون رفع الكعبين عن الارض.",
            "انزل المثلث القائم بلطف على قمة الراس واقرا بدقة 0.1 سم.",
            "قياس الوزن بلباس خفيف على ميزان معاير بدقة 0.1 كغ.",
          ],
          thresholds: [
            { tone: "emerald", label: "Z-score طبيعي : من -2.0 الى +1.0" },
            { tone: "amber", label: "نحافة (-3 الى -2) او زيادة وزن (+1 الى +2) : مراقبة" },
            { tone: "rose", label: "Z < -3.0 او Z > +2.0 (سمنة) : توجيه طبي" },
            { tone: "sky", label: "سرعة النمو >= 7.5 سم/سنة : تنبيه طفرة نمو" },
          ],
          pitfall:
            "طفرة النمو السريعة (>= 7.5 سم/سنة) هي اخطر مرحلة لتطور الجنف؛ يجب تقليص مدة اعادة التقييم الى 3-4 اشهر.",
        },
        {
          id: "armspan-sitting",
          title: "باع الذراعين (Ape Index) والطول جالسا",
          formField: "باع الذراعين (cm) / الطول جالسا (cm)",
          unit: "cm",
          position: "باع الذراعين: ظهر ملاصق للجدار وذراعان ممدودتان افقيا بزاوية 90 درجة. الطول جالسا: جلوس مستقيم على مقعد مستو.",
          steps: [
            "قياس المسافة بين طرف الاصبع الاوسط الايمن والاصبع الاوسط الايسر.",
            "للطول جالسا: الفخذان افقيان والظهر مستقيم ثم طرح ارتفاع المقعد بدقة.",
          ],
          thresholds: [
            { tone: "emerald", label: "الفرق (الباع - الطول) عادة بين 0 و +4 سم" },
            { tone: "sky", label: "الطول جالسا يرصد بداية طفرة نمو الجذع" },
          ],
          pitfall:
            "تجنب ثني المرفقين او رفع الكتفين اثناء قياس باع الذراعين.",
        },
        {
          id: "chest-expansion",
          title: "سعة التمدد الصدري",
          formField: "سعة الصدر (cm)",
          unit: "cm",
          position: "وقوف مريح والذراعان مسترخيتان بجانب الجسم.",
          steps: [
            "وضع شريط القياس افقيا عند مستوى الخط الحلمي (الفراغ الوربي الرابع).",
            "قياس المحيط عند الزفير الاقصى ثم عند الشهيق الاقصى.",
            "ادخال الفرق بين القراءتين بالسنتيمتر (مثال: 4.5 سم).",
          ],
          thresholds: [
            { tone: "emerald", label: ">= 3.5 سم : سعة صدرية طبيعية" },
            { tone: "amber", label: "< 3.5 سم : نقص التمدد الصدري (مراقبة + تمارين تنفس مائي)" },
          ],
          pitfall:
            "توجيه الطفل لتوسيع القفص الصدري دون شد عضلات الظهر او الاكتفاء بنفخ البطن.",
        },
      ],
    },
    {
      id: "step2",
      badge: "02",
      title: "المرحلة 2 : العمود الفقري الامامي — كشف الجنف (SOSORT / SRS)",
      subtitle: "فحص التناظر الخلفي، اختبار Adams للانحناء الامامي، مقياس الجنف ATR وخيط الشاقول C7",
      image: "/image/kids-suivi/scoliosis-hologram.jpg",
      intro:
        "اهم مرحلة للكشف المبكر عن الجنف (Scoliose). الهدف هو التمييز بين الوضعية الجنفية الوظيفية (بدون دوران فقري) والجنف البنيوي الحقيقي (وجود حدبة ضلعية او قطنية مع دوران ATR).",
      tests: [
        {
          id: "adams-test",
          title: "اختبار الانحناء الامامي Adams",
          formField: "اختبار Adams",
          position: "وقوف حافي القدمين، الكعبان متلاصقان، الركبتان ممدودتان تماما، اليدان متلاصقتان ومتدليتان نحو القدمين.",
          steps: [
            "اطلب من الطفل الانحناء ببطء للامام مع ارخاء الراس والذراعين حتى يصبح الجذع افقيا.",
            "قف خلف الطفل تماما بعينين بمستوى سطح الظهر (رؤية مماسية) لملاحظة المنطقة الصدرية والقطنية.",
            "كرر الملاحظة من الامام خاصة للجزء الصدري العلوي.",
            "سجل وجود اي بروز احادي الجانب ثابت (حدبة صدرية، قطنية، او مزدوجة).",
          ],
          thresholds: [
            { tone: "emerald", label: "سلبي : ظهر متناظر تماما" },
            { tone: "amber", label: "عدم تناظر وضعي بدون حدبة : مراقبة" },
            { tone: "rose", label: "حدبة صدرية او قطنية او مزدوجة : توجيه طبي" },
          ],
          pitfall:
            "ثني طفيف في ركبة واحدة يخلق عدم تناظر كاذب في الحوض والظهر؛ تاكد دائما من استقامة الركبتين معا.",
        },
        {
          id: "scoliometer-atr",
          title: "مقياس الجنف Bunnell — زاوية دوران الجذع (ATR)",
          formField: "زاوية دوران الجذع ATR (deg)",
          unit: "deg",
          position: "اثناء وضعية اختبار Adams عند زاوية الانحناء التي يظهر فيها البروز بوضوح.",
          steps: [
            "ضع مقياس الجنف بلطف وبشكل عمودي على محور العمود الفقري مع محاذاة الفتحة المركزية فوق النتوءات الشوكية.",
            "مرر المقياس ببطء من T1 الى L5 دون ضغط على الجلد وسجل اعلى قراءة للكرة بالدرجات.",
          ],
          thresholds: [
            { tone: "emerald", label: "0 الى 3 درجات : طبيعي" },
            { tone: "amber", label: "4 درجات : وضعية جنفية (مراقبة)" },
            { tone: "amber", label: "5 الى 6 درجات : عتبة الحذر SOSORT (اعادة فحص خلال 4 اشهر)" },
            { tone: "rose", label: ">= 7 درجات : توجيه طبي وصورة اشعة شاملة للعمود الفقري" },
          ],
          pitfall:
            "عند وجود فرق طول في الطرفين السفليين (> 10 مم)، اعد اختبار Adams جالسا على مقعد مستو لاستبعاد ميلان الحوض.",
        },
        {
          id: "frontal-landmarks",
          title: "المعالم التناظرية ال 4 من الخلف (الكتفان، لوحا الكتف، مثلثا الخصر، الحوض)",
          formField: "مستوى الكتفين / لوحي الكتف / مثلثي الخصر / الحوض",
          position: "وقوف طبيعي مريح من الخلف مع تدلي الذراعين بحرية.",
          steps: [
            "الكتفان: مقارنة ارتفاع الاخرمين الايمن والايسر.",
            "لوحا الكتف: فحص التناظر ورصد بروز ثنائي الجانب (لوحا كتف مجنحان).",
            "مثلثا الخصر: مقارنة الفراغ بين الجذع والذراع المتدلية من الجانبين.",
            "الحوض: وضع الابهامين افقيا فوق قمتي العرف الحرقفي للتحقق من الاستواء.",
          ],
          thresholds: [
            { tone: "emerald", label: "4 معالم متوازنة : مثالي" },
            { tone: "amber", label: "2 او اكثر من علامات عدم التناظر او لوح مجنح : مراقبة" },
          ],
          pitfall:
            "اترك الطفل يقف بارتياح لمدة 10 ثوان قبل التقييم لتجنب الوقفة المتصلبة المصطنعة.",
        },
        {
          id: "plumb-c7",
          title: "خيط الشاقول الامامي (من C7 الى الشق الالوي)",
          formField: "انحراف خيط الشاقول C7 (mm)",
          unit: "mm",
          position: "وقوف طبيعي من الخلف.",
          steps: [
            "تحديد الفقرة الرقبية السابعة C7 وتدلية خيط الشاقول عموديا نحو الشق بين الارداف.",
            "قياس الانحراف الجانبي بالمليمتر (قيمة سالبة لليسار، موجبة لليمين).",
          ],
          thresholds: [
            { tone: "emerald", label: "اقل من 12 مم : توازن امامي طبيعي" },
            { tone: "amber", label: ">= 12 مم : انحراف محوري (مراقبة)" },
          ],
          pitfall:
            "انتظر ثبات الخيط تماما وتجنب ملامسته لملابس الطفل.",
        },
      ],
    },
    {
      id: "step3",
      badge: "03",
      title: "المرحلة 3 : العمود الفقري الجانبي — الحداب والقعس (Delmas / Stagnara)",
      subtitle: "التقييم الجانبي، الاسهم السهمية C7 / T6 / L3 واختبار مرونة الحداب الصدري",
      image: "/image/kids-suivi/sagittal-hologram.jpg",
      intro:
        "يكشف الفحص الجانبي الظهر المستدير الوضعي، فرط القعس القطني، وخاصة الحداب الصدري الصلب المشتبه به في داء Scheuermann.",
      tests: [
        {
          id: "head-posture",
          title: "وضعية الراس الجانبية",
          formField: "وضعية الراس",
          position: "وقوف جانبي مع نظر افقي طبيعي.",
          steps: [
            "مقارنة موقع وتدة الاذن بالنسبة للمحور العمودي المار بالكتف والورك.",
            "تحديد ما اذا كان الراس متوازنا ام متقدما للامام بدرجة خفيفة او ملحوظة.",
          ],
          thresholds: [
            { tone: "emerald", label: "متوازنة : الاذن على خط الكتف" },
            { tone: "sky", label: "تقدم خفيف : ملاحظة وقائية" },
            { tone: "amber", label: "تقدم ملحوظ : مراقبة + سباحة الظهر" },
          ],
          pitfall:
            "لا تطلب من الطفل تصحيح قامته قبل تسجيل الوضعية العفوية.",
        },
        {
          id: "kyphosis-reducibility",
          title: "الحداب الصدري واختبار القابلية للتصحيح (كشف Scheuermann)",
          formField: "الحداب الصدري / قابلية التصحيح",
          position: "من الجانب واقفا، ثم مع الاستقامة الارادية القصوى والاستلقاء على البطن.",
          steps: [
            "ملاحظة انحناء الظهر العلوي في الراحة.",
            "اطلب من الطفل الاستطالة للاعلى وفتح الكتفين، ثم اختبر التمدد الخفيف في وضعية الاستلقاء البطني.",
            "التفريق بين التصحيح الكامل (وضعي مرن) والجزئي والصلب (زاوية ظهرية ثابتة لا تزول).",
          ],
          thresholds: [
            { tone: "emerald", label: "طبيعي + مرونة كاملة" },
            { tone: "amber", label: "ظهر مستدير وضعي / حداب مرن : مراقبة + سباحة الظهر" },
            { tone: "rose", label: "حداب صلب او غير قابل للتصحيح : توجيه طبي (فحص Scheuermann)" },
          ],
          pitfall:
            "الحداب الزاوي الصلب بين 10 و 15 سنة خاصة مع الام الظهر يستوجب تقييما طبيا متخصصا.",
        },
        {
          id: "sagittal-arrows",
          title: "الاسهم السهمية بخيط الشاقول (C7، T6، L3)",
          formField: "اسهم C7 / T6 / L3 (mm)",
          unit: "mm",
          position: "وقوف طبيعي من الجانب.",
          steps: [
            "اجعل خيط الشاقول مماسا لاكثر نقطة خلفية في الظهر (عادة قمة T6 والشق العجزي S2).",
            "قس بالمسطرة المسافة الافقية بالمليمتر عند C7 ثم T6 ثم اعمق نقطة قطنية L3.",
          ],
          thresholds: [
            { tone: "emerald", label: "C7 : 20-35 مم | T6 : 0 مم | L3 : 25-40 مم" },
            { tone: "amber", label: "L3 > 45 مم : فرط قعس قطني (مراقبة + تقوية الجذع)" },
            { tone: "amber", label: "C7 > 45 مم : زيادة الحداب او تقدم الراس" },
          ],
          pitfall:
            "حافظ على المسطرة افقية تماما اثناء القياس ولا تلمس الظهر بقوة حتى لا يغير الطفل وضعيته.",
        },
      ],
    },
    {
      id: "step4",
      badge: "04",
      title: "المرحلة 4 : الاطراف السفلية والمشي (Salenius & Vankka)",
      subtitle: "محور الركبتين (DIM / DIC)، فرط بسط الركبة، فرق طول الطرفين (ILMI) وفحص المشي",
      image: "/image/kids-suivi/knees-hologram.jpg",
      intro:
        "يتطور محور الركبتين طبيعيا مع عمر الطفل: تباعد خفيف قبل سنتين، ركبة روحاء فيزيولوجية (X) بين 2 و 6 سنوات، ثم استقامة كاملة نحو 7-8 سنوات. يراعي المحرك عمر الطفل تلقائيا.",
      tests: [
        {
          id: "knee-valgum-varum",
          title: "محور الركبتين الامامي — قياس DIM و DIC",
          formField: "محور الركبتين / DIM (cm) / DIC (cm)",
          unit: "cm",
          position: "وقوف حافي القدمين مقابل الفاحص مع توجيه الرضفتين (صابونة الركبة) للامام تماما.",
          steps: [
            "للركبة الروحاء (Genu Valgum / X): تلامس الركبتين بلطف دون ضغط ثم قياس المسافة بين الكعبين الداخليين (DIM) بالسنتيمتر.",
            "للركبة الفحجاء (Genu Varum / O): ضم الكعبين الداخليين معا ثم قياس المسافة بين اللقمتين الداخليتين للركبتين (DIC) بالسنتيمتر.",
            "اي انحراف احادي الجانب يسجل كـ 'غير متناظر'.",
          ],
          thresholds: [
            { tone: "emerald", label: "طبيعي : استقامة الركبتين والكعبين" },
            { tone: "sky", label: "Valgum <= 6 سم بعمر <= 6 سنوات : فيزيولوجي (معلومة)" },
            { tone: "amber", label: "Valgum بعد 6 سنوات (<= 6 سم) او Varum <= 5 سم : مراقبة" },
            { tone: "rose", label: "DIM > 6 سم (> 6 سنوات) او > 8 سم | DIC > 5 سم | غير متناظر : توجيه" },
          ],
          pitfall:
            "الدوران الداخلي للوركين يعطي مظهرا كاذبا للركبة الروحاء؛ صحح اتجاه الرضفتين للامام قبل القياس.",
        },
        {
          id: "knee-sagittal",
          title: "محور الركبة الجانبي (Recurvatum / Flexum)",
          formField: "محور الركبة الجانبي",
          position: "وقوف جانبي بساقين ممدودتين.",
          steps: [
            "ملاحظة وجود فرط امتداد للخلف (> 10 درجات) او نقص امتداد امامي في الركبة.",
          ],
          thresholds: [
            { tone: "emerald", label: "طبيعي : امتداد محايد 0 درجة" },
            { tone: "amber", label: "Recurvatum او Flexum : مراقبة وتقوية متوازنة" },
          ],
          pitfall:
            "فرط بسط الركبة يترافق غالبا مع فرط المرونة المفصلية (Beighton).",
        },
        {
          id: "lld-ilmi",
          title: "فرق طول الطرفين السفليين (ILMI)",
          formField: "فرق الطول (mm)",
          unit: "mm",
          position: "وقوف من الخلف باستعمال قوالب معايرة (5 مم) مع التاكيد مستلقيا.",
          steps: [
            "ضع شرائح معايرة تحت القدم الاقصر حتى يستوي الحوض افقيا وسجل السمك الاجمالي بالمليمتر.",
            "عند الحاجة، قس بالشريط من الشوكة الحرقفية الامامية العلوية EIAS الى الكعب الداخلي مستلقيا.",
          ],
          thresholds: [
            { tone: "emerald", label: "< 8 مم : فرق فيزيولوجي بسيط" },
            { tone: "amber", label: "8 الى 15 مم : مراقبة دورية" },
            { tone: "rose", label: "> 15 مم : توجيه طبي لتقييم العظام" },
          ],
          pitfall:
            "تاكد من عدم وجود هبوط احادي لقوس القدم يسبب قصرا وظيفيا كاذبا.",
        },
        {
          id: "gait-eval",
          title: "التحليل الحركي للمشي",
          formField: "نمط المشي",
          position: "ممر مستو بطول 5 الى 6 امتار، المشي حافيا ذهابا وايابا.",
          steps: [
            "مراقبة اتجاه القدمين (للداخل، للخارج)، تتابع الكعب-المشط، او المشي الدائم على اطراف الاصابع.",
            "التاكد من غياب اي عرج او عدم تناظر في الخطوة.",
          ],
          thresholds: [
            { tone: "emerald", label: "مشي طبيعي متناظر وسلس" },
            { tone: "amber", label: "التفاف للداخل / للخارج / اطراف الاصابع : مراقبة" },
            { tone: "rose", label: "عرج (Limping) : توجيه طبي سريع" },
          ],
          pitfall:
            "اي عرج حديث او مصحوب بالم يمنع التمرين المكثف حتى التقييم الطبي.",
        },
      ],
    },
    {
      id: "step5",
      badge: "05",
      title: "المرحلة 5 : القدمين وطب الاقدام (Staheli / اختبار Jack)",
      subtitle: "قوس القدم اثناء التحميل، محور العقب، اختبار Jack واختبار الوقوف على اطراف الاصابع",
      image: "/image/kids-suivi/feet-hologram.jpg",
      intro:
        "القدم المسطحة المرنة وغير المؤلمة شائعة وفيزيولوجية حتى عمر 6 سنوات. يسمح اختبار Jack والوقوف على اطراف الاصابع بالتحقق فورا من مرونة القوس القدمي.",
      tests: [
        {
          id: "foot-arch-heel",
          title: "قوس القدم ومحور العقب (Valgus / Varus)",
          formField: "قوس القدم / محور العقب",
          position: "وقوف حافيا بوزن متساو على القدمين.",
          steps: [
            "فحص القوس الداخلي من الجانب الانسي (طبيعي، مسطح مرن، مسطح صلب، او مقوس عال).",
            "فحص محور وتر اخيل مع العقب من الخلف (محايد، انحراف خارجي خفيف او شديد، او داخلي).",
          ],
          thresholds: [
            { tone: "emerald", label: "قوس طبيعي + عقب محايد" },
            { tone: "sky", label: "قدم مسطحة مرنة <= 6 سنوات بدون انحراف شديد : فيزيولوجية" },
            { tone: "amber", label: "قدم مسطحة مرنة > 6 سنوات / قدم مقوسة / انحراف عقب شديد : مراقبة" },
            { tone: "rose", label: "قدم مسطحة صلبة او مؤلمة : توجيه طبي" },
          ],
          pitfall:
            "القدم المقوسة المتطورة او غير المتناظرة تتطلب متابعة دقيقة واحيانا فحصا عصبيا.",
        },
        {
          id: "jack-windlass",
          title: "اختبار Jack (الية الرافعة / Windlass)",
          formField: "اختبار Jack",
          position: "وقوف الطفل بتحميل متساو على القدمين.",
          steps: [
            "امسك اصبع القدم الكبير (الابهام) وارفعه للاعلى بلطف (ثني ظهري سلبي).",
            "راقب القوس الداخلي فورا: اذا تشكل القوس وارتفع فهذا يعني قدما مرنة حميدة (ايجابي / قابل للتصحيح)؛ واذا بقي مسطحا تماما فهو سلبي / صلب.",
          ],
          thresholds: [
            { tone: "emerald", label: "ايجابي / قابل للتصحيح : قدم مسطحة مرنة حميدة" },
            { tone: "rose", label: "سلبي / صلب (مع قدم مسطحة) : توجيه طبي" },
          ],
          pitfall:
            "تجنب رفع العقب عن الارض اثناء رفع الابهام لكي تبقى النتيجة دقيقة.",
        },
        {
          id: "tiptoe-pain",
          title: "اختبار الوقوف على اطراف الاصابع وتقصي الالم",
          formField: "اختبار اطراف الاصابع / الم او تعب القدم",
          position: "وقوف من الخلف مع امكانية لمس خفيف للجدار للتوازن.",
          steps: [
            "اطلب من الطفل الصعود عاليا على اطراف اصابع القدمين.",
            "تحقق من تشكل القوس الداخلي وانقلاب العقب قليلا للداخل.",
            "اسال عن اي الم في القدم او العقب بعد النشاط الرياضي او تعب سريع اثناء المشي.",
          ],
          thresholds: [
            { tone: "emerald", label: "تشكل القوس + بدون الم : مطمئن" },
            { tone: "rose", label: "عدم تشكل القوس او وجود الم مع تشوه : توجيه طبي" },
          ],
          pitfall:
            "لا ينصح بالنعال التقويمية للقدم المسطحة المرنة غير المؤلمة قبل سن 6 سنوات؛ يفضل التمرين الحافي وتقوية العضلات الداخلية للقدم.",
        },
      ],
    },
    {
      id: "step6",
      badge: "06",
      title: "المرحلة 6 : المرونة، ثبات الجذع، التوازن والخلاصة السريرية",
      subtitle: "DDS، اختبار Schöber، مقياس Beighton (0-9)، تحمل الجذع، التنفس والنشر",
      intro:
        "تقيم هذه المرحلة القدرة الوظيفية الشاملة للطفل وتنهي التقييم بكتابة الخلاصة التربوية ونصائح الوالدين وتحديد موعد الفحص القادم.",
      tests: [
        {
          id: "dds-schober",
          title: "مسافة الاصابع-الارض (DDS) واختبار Schöber القطني",
          formField: "DDS (cm) / اختبار Schöber (+cm)",
          unit: "cm",
          position: "وقوف بقدمين مضمومتين وركبتين ممدودتين تماما.",
          steps: [
            "لاختبار Schöber: ضع علامة عند مستوى الفقرة S1 ثم علامة ثانية اعلاها بمسافة 10.0 سم بالضبط.",
            "اطلب الانحناء الامامي الاقصى دون ثني الركبتين: قس مسافة الاصابع عن الارض (0 سم عند اللمس، سالب عند وضع الكفين، موجب للمسافة المتبقية).",
            "اعد قياس المسافة بين العلامتين القطنيتين وادخل الزيادة فقط (مثال: 15.0 - 10.0 = 5.0 سم).",
          ],
          thresholds: [
            { tone: "emerald", label: "DDS <= 12 سم و Schöber >= +4.0 سم : طبيعي" },
            { tone: "amber", label: "DDS > 12 سم : تيبس السلسلة الخلفية" },
            { tone: "amber", label: "Schöber < +4.0 سم : تيبس قطني (مراقبة)" },
          ],
          pitfall:
            "تيبس العضلات الخلفية للفخذ لا يعني بالضرورة تيبس الفقرات القطنية؛ الجمع بين القياسين يوضح السبب بدقة.",
        },
        {
          id: "beighton-score",
          title: "مقياس Beighton لفرط المرونة المفصلية",
          formField: "مقياس Beighton (0-9)",
          unit: "/ 9",
          position: "اختبار مفصلي لطيف دون اي قوة او الم.",
          steps: [
            "تقييم المعايير ال 5 في الجدول ادناه (مجموع من 0 الى 9 نقاط) وادخال الرقم الاجمالي.",
          ],
          thresholds: [
            { tone: "emerald", label: "0 الى 5 / 9 : مرونة عادية" },
            { tone: "amber", label: ">= 6 / 9 : فرط مرونة مفصلية (مراقبة + تقوية استقرار المفاصل)" },
          ],
          pitfall:
            "عند ارتفاع المقياس (>= 6/9)، تجنب التمدد السلبي المفرط وركز على تمارين الاستقرار المفصلي والتوازن.",
        },
        {
          id: "core-extensors-balance",
          title: "تحمل الجذع، الباسطات الظهرية والتوازن على قدم واحدة",
          formField: "تحمل الجذع (s) / الباسطات (s) / التوازن (s)",
          unit: "s",
          position: "بساط مستو لتمارين التحمل وارضية ثابتة للتوازن حافيا.",
          steps: [
            "تحمل الجذع (Plank): ارتكاز على الساعدين واطراف الاصابع مع استقامة الجسم؛ اوقف التوقيت فور هبوط الحوض.",
            "الباسطات الظهرية: استلقاء على البطن ورفع الصدر قليلا باستقرار الحوض وحساب زمن الثبات.",
            "التوازن الاحادي: وقوف على قدم واحدة بعينين مفتوحتين ويدين على الخصر؛ سجل الزمن الاقل بين الجهتين (الهدف 20-30 ثانية).",
          ],
          thresholds: [
            { tone: "amber", label: "تحمل الجذع < 20 ثانية : ضعف عضلات الجذع (مراقبة)" },
            { tone: "emerald", label: "20 الى 44 ثانية : جيد | >= 45 ثانية : مكافاة +6 نقاط" },
          ],
          pitfall:
            "ذكر الطفل بالتنفس الهادئ وعدم حبس النفس اثناء تمرين البلانك.",
        },
        {
          id: "shoulder-breathing-synthesis",
          title: "حركة الكتفين، نمط التنفس، الخلاصة والنشر",
          formField: "حركة الكتفين / التنفس / الخلاصة / النصائح / النشر",
          position: "الظهر ملاصق للجدار لاختبار الكتفين، وملاحظة التنفس في الراحة.",
          steps: [
            "رفع الذراعين ممدودتين فوق الراس والظهر ملاصق للجدار دون تقوس اسفل الظهر.",
            "ملاحظة التنفس في الراحة: حجابي متوازن، صدري سطحي، او تنفس فموي.",
            "كتابة خلاصة واضحة ومطمئنة ونصائح عملية للوالدين، تحديد موعد المراقبة القادم، ثم تفعيل النشر بعد المراجعة.",
          ],
          thresholds: [
            { tone: "emerald", label: "كتفان مرنان + تنفس حجابي متوازن" },
            { tone: "amber", label: "تحدد الكتفين او تنفس فموي/صدري : برنامج مائي مكيف" },
          ],
          pitfall:
            "استخدم لغة مطمئنة وواضحة للوالدين وتجنب العبارات المثيرة للقلق في حقل النصائح.",
        },
      ],
      beightonTable: [
        { criterion: "بسط الاصبع الخامس (الخنصر) للخلف اكثر من 90 درجة", side: "يسار + يمين", points: "2 نقاط (1 + 1)" },
        { criterion: "ملامسة الابهام للوجه الامامي للساعد", side: "يسار + يمين", points: "2 نقاط (1 + 1)" },
        { criterion: "فرط بسط المرفق اكثر من 10 درجات", side: "يسار + يمين", points: "2 نقاط (1 + 1)" },
        { criterion: "فرط بسط الركبة اكثر من 10 درجات", side: "يسار + يمين", points: "2 نقاط (1 + 1)" },
        { criterion: "وضع الكفين كاملتين على الارض مع ركبتين ممدودتين تماما", side: "شامل", points: "1 نقطة" },
      ],
    },
    {
      id: "redflags",
      badge: "07",
      title: "جدول العلامات الحمراء والمراجع الطبية",
      subtitle: "ملخص شامل لجميع عتبات التقييم التلقائي في نظام AQA Kids",
      intro:
        "يحسب المحرك السريري النتيجة فورا ويصنف كل طفل الى طبيعي، مراقبة، او توجيه طبي وفق العتبات المبينة ادناه.",
      redFlagMatrix: [
        {
          domain: "النمو ومؤشر كتلة الجسم (WHO 2007)",
          optimal: "Z-score من -2.0 الى +1.0 | سعة الصدر >= 3.5 سم",
          watch: "نحافة (-3 الى -2) او زيادة وزن (+1 الى +2) | سعة الصدر < 3.5 سم | طفرة >= 7.5 سم/سنة",
          referral: "Z-score < -3.0 (نحافة شديدة) او > +2.0 (سمنة)",
        },
        {
          domain: "الجنف / المستوى الامامي (SOSORT)",
          optimal: "Adams سلبي | ATR 0-3 درجات | C7 < 12 مم | تناظر تام",
          watch: "عدم تناظر وضعي | ATR 4-6 درجات | C7 >= 12 مم | >= 2 علامات عدم تناظر | لوح مجنح",
          referral: "حدبة حقيقية في Adams او زاوية ATR >= 7 درجات",
        },
        {
          domain: "المستوى الجانبي (Delmas / Stagnara)",
          optimal: "راس متوازن | C7 20-35 مم | T6 0 مم | L3 25-40 مم | مرونة كاملة",
          watch: "ظهر مستدير / حداب مرن | فرط قعس او L3 > 45 مم | تقدم راس ملحوظ",
          referral: "حداب صلب او عدم قابلية للتصحيح (استبعاد Scheuermann)",
        },
        {
          domain: "الركبتان والمشي (Salenius)",
          optimal: "محاور مستقيمة | ILMI < 8 مم | مشي طبيعي | Valgum <= 6 سم بعمر <= 6 سنوات",
          watch: "Valgum بعد 6 سنوات (<= 6 سم) | Varum <= 5 سم | Recurvatum | ILMI 8-15 مم",
          referral: "DIM > 6 سم (> 6 سنوات) او > 8 سم | DIC > 5 سم | عدم تناظر | ILMI > 15 مم | عرج",
        },
        {
          domain: "القدمان (Staheli / Jack)",
          optimal: "قوس طبيعي | عقب محايد | Jack ايجابي | تشكل القوس على الاصابع | بدون الم",
          watch: "قدم مسطحة مرنة > 6 سنوات | قدم مقوسة | انحراف عقب شديد",
          referral: "قدم مسطحة صلبة | Jack سلبي | غياب القوس على الاصابع | الم قدم مع تشوه",
        },
        {
          domain: "المرونة وتحمل الجذع",
          optimal: "DDS <= 12 سم | Schöber >= 4 سم | Beighton <= 5/9 | تحمل الجذع >= 20 ثانية",
          watch: "DDS > 12 سم | Schöber < 4 سم | Beighton >= 6/9 | تحدد الكتفين | تحمل < 20 ثانية",
          referral: "تفعيل التوجيه الطبي عند وجود الم ظهري ليلي او علامة عصبية او شك سريري",
        },
      ],
      references: [
        "منظمة الصحة العالمية WHO (2006 / 2007) — المعايير المرجعية لنمو الاطفال ومؤشر كتلة الجسم LMS (5-19 سنة).",
        "توصيات SOSORT 2016 وجمعية SRS — الكشف المبكر عن الجنف، اختبار Adams ومقياس Bunnell.",
        "Stagnara & Delmas — قياس الاسهم السهمية C7/T6/L3 وتشخيص داء Scheuermann.",
        "Salenius & Vankka (JBJS 1975) — التطور الفيزيولوجي لمحور الركبتين عند الاطفال (DIM / DIC).",
        "Staheli (JBJS 1987) & Jack (1953) — تقييم قوس القدم الطفولي واختبار الرافعة Windlass.",
        "Beighton (1973) & Modified Schöber — تقييم فرط المرونة المفصلية ومرونة الفقرات القطنية.",
      ],
    },
  ],
};

const EN_BOOK: KineProtocolBook = {
  modalTitle: "Physiotherapist Clinical Manual — AQA Kids",
  modalSubtitle:
    "Step-by-step pediatric physical screening protocol, test execution guide, and form completion standards",
  searchPlaceholder: "Search a test, landmark, or cutoff (e.g. Adams, ATR, C7, Jack, Beighton, DIM)...",
  printBtn: "Print Manual",
  closeBtn: "Close",
  noSearchResults: "No test or protocol matches your search.",
  labelField: "Form field",
  labelPosition: "Starting position",
  labelExecution: "Execution protocol",
  labelThresholds: "Reference norms and AQA automatic cutoffs",
  labelPitfall: "Clinical caution and common pitfalls",
  labelBeightonTitle: "Beighton Hypermobility Scoring Table (0-9 points)",
  labelColCriterion: "Joint maneuver",
  labelColSide: "Sides tested",
  labelColPoints: "Points",
  labelMatrixDomain: "Domain",
  labelMatrixOptimal: "Optimal / Normal",
  labelMatrixWatch: "Watch / Monitoring",
  labelMatrixReferral: "Medical Referral",
  labelReferences: "Scientific and Medical References",
  sections: [
    {
      id: "prep",
      badge: "00",
      title: "Preparation, Equipment & Admin Workflow",
      subtitle: "Standardized assessment setup (15-20 min per child) and live clinical dashboard usage",
      intro:
        "The AQA Kids Suivi Physique is a functional pediatric physiotherapy screening protocol. It does not replace radiological medical diagnosis, but enables early referral to a pediatrician or pediatric orthopedist while tailoring corrective swimming drills.",
      checklist: [
        "Quiet room, level non-slip floor, even lighting without glare, comfortable 22-24 deg C temperature.",
        "Attire: swimwear (or fitted shorts with exposed back for spinal inspection), strictly barefoot.",
        "Parent presence recommended for consent, child comfort, and history of pain, insoles, or prior injuries.",
        "Required kit: wall stadiometer (mm), calibrated scale (0.1 kg), flexible tape measure (200 cm), plumb line, Bunnell scoliometer, rigid mm ruler, skin-marking pencil, stopwatch, firm mat, and flat sitting bench.",
        "Cadence: Baseline Bilan T1 at enrollment, every 6 months if stable, or every 3-4 months during growth spurts (>= 7.5 cm/yr) or Watch/Referral findings.",
        "Form workflow: complete Steps 1 to 6 while watching the Live Clinical Preview on the right (8-zone body map, 6-axis radar, automatic flags, corrective swimming plan).",
        "Draft vs Published: leave 'Publish to client portal' unchecked until reviewed. Once verified, enable publishing so parents can view the interactive report on /swim/profile/[swimId].",
      ],
    },
    {
      id: "step1",
      badge: "01",
      title: "Step 1: Child Profile & Growth Anthropometry (WHO 2007)",
      subtitle: "Height, weight, sex/age-specific BMI Z-score, arm span, sitting height, and chest expansion",
      intro:
        "Birth date and sex drive the WHO 2007 LMS BMI-for-age Z-score engine (ages 4-16) and adjust physiological age tolerances for genu valgum (<= 6 yrs) and flexible flatfoot (<= 6 yrs).",
      tests: [
        {
          id: "profile-meta",
          title: "Birth Date, Sex & Dominant Side",
          formField: "Birth date / Sex / Dominant side",
          position: "Parent confirmation plus spontaneous hand/foot dominance check.",
          steps: [
            "Confirm exact birth date from enrollment records.",
            "Select biological sex (distinct WHO boys/girls LMS tables).",
            "Record dominant side and relevant medical notes (orthotics, asthma, growing pains, sprains).",
          ],
          thresholds: [
            { tone: "sky", label: "Required for WHO BMI Z-score calculation" },
            { tone: "sky", label: "Sets physiological age rules for <= 6 yrs" },
          ],
          pitfall:
            "Without a birth date, the engine cannot compute WHO BMI Z-score or distinguish physiological valgum/flatfoot in young children.",
        },
        {
          id: "height-weight",
          title: "Standing Height, Weight & Growth Velocity",
          formField: "Height (cm) / Weight (kg)",
          unit: "cm / kg",
          position: "Barefoot against wall stadiometer, heels together, buttocks and occiput touching, Frankfort horizontal gaze.",
          steps: [
            "Ask the child to stand tall and inhale deeply without lifting heels.",
            "Lower headboard square to crown and read to nearest 0.1 cm.",
            "Weigh in light swimwear on calibrated scale to nearest 0.1 kg.",
          ],
          thresholds: [
            { tone: "emerald", label: "WHO BMI Z-score: -2.0 to +1.0 (Normal)" },
            { tone: "amber", label: "Z -3 to -2 (Thinness) or +1 to +2 (Overweight)" },
            { tone: "rose", label: "Z < -3.0 or Z > +2.0 (Referral)" },
            { tone: "sky", label: "Growth velocity >= 7.5 cm/yr = Rapid growth spurt alert" },
          ],
          pitfall:
            "A growth velocity >= 7.5 cm/yr marks the peak risk window for rapid scoliosis progression; shorten recheck interval to 3-4 months.",
        },
        {
          id: "armspan-sitting",
          title: "Arm Span (Ape Index) & Sitting Height",
          formField: "Arm span (cm) / Sitting height (cm)",
          unit: "cm",
          position: "Arm span: back to wall, arms abducted 90 deg, palms forward. Sitting height: upright on flat bench against wall.",
          steps: [
            "Measure middle-fingertip to middle-fingertip across the chest.",
            "For sitting height, thighs horizontal, back flush to wall, subtract exact bench height.",
          ],
          thresholds: [
            { tone: "emerald", label: "Ape Index (Arm span - Height) typically 0 to +4 cm" },
            { tone: "sky", label: "Sitting height tracks pubertal trunk growth spurt" },
          ],
          pitfall:
            "Prevent elbow bending or shoulder shrugging during arm span measurement.",
        },
        {
          id: "chest-expansion",
          title: "Thoracic Chest Expansion",
          formField: "Chest expansion (cm)",
          unit: "cm",
          position: "Standing relaxed, arms resting at sides.",
          steps: [
            "Wrap tape horizontally at the 4th intercostal space (nipple line).",
            "Record circumference at maximal forced expiration (C1) and maximal deep inspiration (C2).",
            "Enter the difference (C2 - C1) in cm.",
          ],
          thresholds: [
            { tone: "emerald", label: ">= 3.5 cm: Normal thoracic expansion" },
            { tone: "amber", label: "< 3.5 cm: Reduced expansion (Watch + aquatic ventilation plan)" },
          ],
          pitfall:
            "Coach full ribcage expansion rather than abdominal bulging or latissimus flaring.",
        },
      ],
    },
    {
      id: "step2",
      badge: "02",
      title: "Step 2: Frontal Spine — Scoliosis Screening (SOSORT / SRS)",
      subtitle: "Posterior landmarks, Adams forward bend test, Bunnell scoliometer ATR, and C7 plumb line",
      image: "/image/kids-suivi/scoliosis-hologram.jpg",
      intro:
        "Differentiating a functional scoliotic attitude (no vertebral rotation) from structural idiopathic scoliosis (fixed rib/lumbar hump with axial trunk rotation) is the centerpiece of pediatric screening.",
      tests: [
        {
          id: "adams-test",
          title: "Adams Forward Bend Test",
          formField: "Adams test",
          position: "Standing barefoot, heels together, knees strictly straight, palms together hanging toward feet.",
          steps: [
            "Ask the child to bend slowly forward until the trunk is horizontal.",
            "Sight tangentially at back level from behind (thoracic and lumbar regions) and then from the front (upper thoracic).",
            "Identify any unilateral fixed prominence (rib hump or lumbar paraspinal fullness).",
          ],
          thresholds: [
            { tone: "emerald", label: "Negative: Symmetric back contour" },
            { tone: "amber", label: "Postural asymmetry (no hump): Watch" },
            { tone: "rose", label: "Thoracic / lumbar / double rib hump: Referral" },
          ],
          pitfall:
            "Even slight flexion of one knee rotates the pelvis and creates a false lumbar asymmetry. Verify full bilateral knee extension.",
        },
        {
          id: "scoliometer-atr",
          title: "Bunnell Scoliometer — Angle of Trunk Rotation (ATR)",
          formField: "Scoliometer ATR (deg)",
          unit: "deg",
          position: "During Adams bend at the flexion angle where asymmetry peaks.",
          steps: [
            "Rest the scoliometer gently across the back with its central notch centered directly over the spinous processes.",
            "Glide slowly from T1 to L5, adjusting trunk bend depth per region, and record the highest angle in degrees.",
          ],
          thresholds: [
            { tone: "emerald", label: "0-3 deg: Normal" },
            { tone: "amber", label: "4 deg: Scoliotic attitude (Watch)" },
            { tone: "amber", label: "5-6 deg: SOSORT vigilance threshold (recheck 4 months)" },
            { tone: "rose", label: ">= 7 deg: Formal medical referral / standing spine X-ray" },
          ],
          pitfall:
            "If limb length discrepancy exceeds 10 mm, repeat the Adams test seated on a level bench to rule out pelvic tilt artifact.",
        },
        {
          id: "frontal-landmarks",
          title: "Four Posterior Static Landmarks (Shoulders, Scapulae, Waist, Pelvis)",
          formField: "Shoulders / Scapulae / Waist triangles / Pelvis",
          position: "Relaxed standing viewed from behind, arms hanging freely.",
          steps: [
            "Compare acromion heights (shoulders), scapular inferior angles and medial border winging, waist triangle symmetry, and iliac crest horizontality.",
          ],
          thresholds: [
            { tone: "emerald", label: "All 4 landmarks balanced: Optimal" },
            { tone: "amber", label: ">= 2 asymmetries or Bilateral winged scapulae: Watch" },
          ],
          pitfall:
            "Wait 10 seconds for the child to settle into natural posture before grading.",
        },
        {
          id: "plumb-c7",
          title: "C7 Frontal Plumb Line Deviation",
          formField: "C7 plumb line (mm)",
          unit: "mm",
          position: "Natural standing from behind.",
          steps: [
            "Drop plumb line from C7 spinous process to gluteal cleft and measure horizontal offset in mm (negative left, positive right).",
          ],
          thresholds: [
            { tone: "emerald", label: "-11 to +11 mm: Balanced coronal alignment" },
            { tone: "amber", label: "|Offset| >= 12 mm: Coronal shift (Watch)" },
          ],
          pitfall:
            "Ensure the plumb cord hangs completely clear of clothing.",
        },
      ],
    },
    {
      id: "step3",
      badge: "03",
      title: "Step 3: Sagittal Spine — Kyphosis & Hyperlordosis (Delmas / Stagnara)",
      subtitle: "Lateral posture profile, C7 / T6 / L3 sagittal plumb arrows, and kyphosis reducibility",
      image: "/image/kids-suivi/sagittal-hologram.jpg",
      intro:
        "Lateral assessment separates flexible postural round back from rigid hyperkyphosis (Scheuermann disease risk) and identifies lumbar hyperlordosis.",
      tests: [
        {
          id: "head-posture",
          title: "Head & Cervical Alignment",
          formField: "Head posture",
          position: "Lateral view, relaxed horizontal gaze.",
          steps: [
            "Assess ear tragus alignment over the acromion and greater trochanter vertical axis.",
          ],
          thresholds: [
            { tone: "emerald", label: "Aligned: Tragus over acromion" },
            { tone: "sky", label: "Mild forward head: Info" },
            { tone: "amber", label: "Marked forward head: Watch + backstroke cues" },
          ],
          pitfall:
            "Avoid cueing 'stand straight' before recording natural resting alignment.",
        },
        {
          id: "kyphosis-reducibility",
          title: "Thoracic Kyphosis & Reducibility Test (Scheuermann Check)",
          formField: "Thoracic kyphosis / Thoracic reducibility",
          position: "Lateral standing, followed by active axial self-elongation and prone trunk extension.",
          steps: [
            "Grade resting thoracic curve (normal, postural round back, reducible hyperkyphosis, rigid hyperkyphosis, flat back).",
            "Ask for active maximal straightening and check prone extension: classify as Full, Partial, or Rigid.",
          ],
          thresholds: [
            { tone: "emerald", label: "Normal curve + Full reducibility" },
            { tone: "amber", label: "Postural round back / Reducible hyperkyphosis: Watch + backstroke" },
            { tone: "rose", label: "Rigid hyperkyphosis or Rigid reducibility: Referral (Scheuermann workup)" },
          ],
          pitfall:
            "A sharp angular thoracic apex that remains rigid on extension in a 10-15 year old requires orthopedic evaluation.",
        },
        {
          id: "sagittal-arrows",
          title: "Delmas / Stagnara Sagittal Arrows (C7, T6, L3)",
          formField: "C7 / T6 / L3 arrows (mm)",
          unit: "mm",
          position: "Relaxed lateral standing.",
          steps: [
            "Hold plumb line tangent to the most posterior spinal apex (typically T6 and sacral cleft S2).",
            "Measure horizontal distance with rigid ruler from cord to C7, T6 (0 mm at contact), and deepest lumbar point L3.",
          ],
          thresholds: [
            { tone: "emerald", label: "C7: 20-35 mm | T6: 0 mm | L3: 25-40 mm" },
            { tone: "amber", label: "L3 > 45 mm: Lumbar hyperlordosis (Watch + core/pelvic control)" },
          ],
          pitfall:
            "Keep the ruler strictly horizontal and avoid pressing into the back.",
        },
      ],
    },
    {
      id: "step4",
      badge: "04",
      title: "Step 4: Lower Limbs & Gait (Salenius & Vankka)",
      subtitle: "Frontal knee alignment (DIM / DIC), sagittal knee, limb length discrepancy (ILMI), and gait",
      image: "/image/kids-suivi/knees-hologram.jpg",
      intro:
        "Pediatric knee alignment follows Salenius & Vankka physiology: mild genu valgum is physiological between ages 2 and 6 before straightening by age 7-8. Cutoffs adjust automatically by age.",
      tests: [
        {
          id: "knee-valgum-varum",
          title: "Frontal Knee Axis — DIM & DIC Measurements",
          formField: "Knee alignment / DIM (cm) / DIC (cm)",
          unit: "cm",
          position: "Standing barefoot facing examiner, patellae pointing strictly straight ahead.",
          steps: [
            "Genu Valgum (knock-knees): gently bring medial femoral condyles together without force; measure intermalleolar distance (DIM) in cm.",
            "Genu Varum (bow-legs): bring medial malleoli together; measure intercondylar distance (DIC) in cm.",
            "Code any unilateral deformity as 'Asymmetric'.",
          ],
          thresholds: [
            { tone: "emerald", label: "Normal: Aligned knees and ankles" },
            { tone: "sky", label: "Valgum <= 6 cm at age <= 6 yrs: Physiological (Info)" },
            { tone: "amber", label: "Valgum > 6 yrs (<= 6 cm) or Varum <= 5 cm: Watch" },
            { tone: "rose", label: "DIM > 6 cm (> 6 yrs) or > 8 cm | DIC > 5 cm | Asymmetric: Referral" },
          ],
          pitfall:
            "Internal hip rotation ('squinting patellae') mimics false genu valgum; align patellae straight forward before measuring.",
        },
        {
          id: "knee-sagittal",
          title: "Sagittal Knee Alignment (Recurvatum / Flexum)",
          formField: "Knee sagittal",
          position: "Lateral standing with relaxed straight legs.",
          steps: [
            "Identify knee hyperextension > 10 deg (genu recurvatum) or incomplete extension (genu flexum).",
          ],
          thresholds: [
            { tone: "emerald", label: "Normal: Neutral 0 deg extension" },
            { tone: "amber", label: "Recurvatum or Flexum: Watch" },
          ],
          pitfall:
            "Recurvatum often coexists with generalized Beighton hypermobility.",
        },
        {
          id: "lld-ilmi",
          title: "Limb Length Discrepancy (ILMI)",
          formField: "Limb length diff (mm)",
          unit: "mm",
          position: "Standing block leveling method + supine ASIS-to-medial-malleolus verification.",
          steps: [
            "Place calibrated 5 mm blocks under the shorter foot until iliac crests are strictly horizontal; record total thickness in mm.",
          ],
          thresholds: [
            { tone: "emerald", label: "< 8 mm: Normal physiological variance" },
            { tone: "amber", label: "8-15 mm: Watch (recheck in 6 months)" },
            { tone: "rose", label: "> 15 mm: Medical referral" },
          ],
          pitfall:
            "Rule out unilateral flatfoot collapse or knee flexion before attributing pelvic obliquity to true bone length difference.",
        },
        {
          id: "gait-eval",
          title: "Dynamic Gait Observation",
          formField: "Gait pattern",
          position: "5-6 meter clear walkway, barefoot natural walking back and forth.",
          steps: [
            "Grade foot progression angle (normal, intoeing, outtoeing), heel-toe strike (rule out persistent toe walking), and symmetry (rule out limping).",
          ],
          thresholds: [
            { tone: "emerald", label: "Normal smooth heel-toe gait" },
            { tone: "amber", label: "Intoeing / Outtoeing / Toe walking: Watch" },
            { tone: "rose", label: "Limping: Prompt medical referral" },
          ],
          pitfall:
            "Any acute or painful limp contraindicates high-intensity training until medically cleared.",
        },
      ],
    },
    {
      id: "step5",
      badge: "05",
      title: "Step 5: Foot & Podology (Staheli / Jack Windlass Test)",
      subtitle: "Weight-bearing medial arch, heel alignment, Jack hallux dorsiflexion, and tiptoe test",
      image: "/image/kids-suivi/feet-hologram.jpg",
      intro:
        "Flexible painless flatfoot is physiological up to age 6. Jack's test and tiptoe elevation quickly distinguish benign flexible flatfoot from rigid pathology requiring referral.",
      tests: [
        {
          id: "foot-arch-heel",
          title: "Weight-Bearing Medial Arch & Calcaneal Alignment",
          formField: "Foot arch / Heel alignment",
          position: "Standing barefoot with equal bilateral weight.",
          steps: [
            "Inspect medial longitudinal arch contour (normal, flexible flat, rigid flat, high arch / pes cavus).",
            "Inspect posterior Achilles-calcaneus axis (neutral, mild valgus, marked valgus, varus).",
          ],
          thresholds: [
            { tone: "emerald", label: "Normal arch + Neutral heel" },
            { tone: "sky", label: "Flexible flatfoot <= 6 yrs without marked valgus: Physiological (Info)" },
            { tone: "amber", label: "Flexible flatfoot > 6 yrs / High arch / Marked valgus: Watch" },
            { tone: "rose", label: "Rigid flatfoot or Painful arch anomaly: Referral" },
          ],
          pitfall:
            "Progressive or asymmetric pes cavus warrants orthopedic/neurological screening.",
        },
        {
          id: "jack-windlass",
          title: "Jack's Test (Windlass Mechanism)",
          formField: "Jack test",
          position: "Weight-bearing symmetrical standing, knees straight.",
          steps: [
            "Passively dorsiflex the hallux (big toe) firmly upward.",
            "Observe immediate reformation of the medial arch and slight external tibial rotation: Positive/Reducible = flexible; Negative/Rigid = flat arch persists.",
          ],
          thresholds: [
            { tone: "emerald", label: "Positive / Reducible: Benign flexible flatfoot" },
            { tone: "rose", label: "Negative / Rigid (with flatfoot): Referral (tarsal coalition check)" },
          ],
          pitfall:
            "Keep the heel flat on the floor and ask the child to relax their toes before lifting the hallux.",
        },
        {
          id: "tiptoe-pain",
          title: "Tiptoe Test & Foot Pain / Fatigue Screening",
          formField: "Tiptoe test / Foot pain or fatigue",
          position: "Standing facing wall with fingertip balance, viewed from behind.",
          steps: [
            "Have the child rise high onto both tiptoes and confirm arch elevation plus calcaneal inversion (varus shift).",
            "Ask parent and child about arch/heel pain (Sever apophysitis), calf cramps, or early walking fatigue.",
          ],
          thresholds: [
            { tone: "emerald", label: "Arch forms + Pain-free: Reassuring" },
            { tone: "rose", label: "Arch absent on tiptoes OR Painful foot deformity: Referral" },
          ],
          pitfall:
            "Avoid unnecessary rigid orthotics in painless flexible flatfoot under age 6; favor barefoot play and intrinsic foot drills.",
        },
      ],
    },
    {
      id: "step6",
      badge: "06",
      title: "Step 6: Flexibility, Core Endurance, Mobility & Synthesis",
      subtitle: "DDS, Schober, Beighton (0-9), core/extensor endurance, balance, breathing, and publishing",
      intro:
        "Evaluates global neuromuscular readiness, spinal mobility, and hypermobility before writing clear parent guidance and deciding portal publication.",
      tests: [
        {
          id: "dds-schober",
          title: "Finger-to-Floor Distance (DDS) & Modified Schober Test",
          formField: "DDS (cm) / Schober (+cm)",
          unit: "cm",
          position: "Standing feet together, knees fully straight.",
          steps: [
            "Mark S1 level (dimples of Venus) and a second mark exactly 10.0 cm superiorly.",
            "Ask for maximal forward bend without bending knees: record DDS (0 touches floor, negative past floor, positive above floor).",
            "Re-measure distance between lumbar marks at full flexion and enter the gain only (e.g. 15.0 - 10.0 = 5.0).",
          ],
          thresholds: [
            { tone: "emerald", label: "DDS <= 12 cm & Schober >= +4.0 cm: Normal" },
            { tone: "amber", label: "DDS > 12 cm: Posterior chain tightness (Watch)" },
            { tone: "amber", label: "Schober < +4.0 cm: Lumbar stiffness (Watch)" },
          ],
          pitfall:
            "Tight hamstrings (high DDS) can coexist with normal lumbar flexion (normal Schober); record both to isolate the limiting structure.",
        },
        {
          id: "beighton-score",
          title: "Beighton Joint Hypermobility Score",
          formField: "Beighton score (0-9)",
          unit: "/ 9",
          position: "Gentle passive joint testing without forcing end-range.",
          steps: [
            "Score all 5 items in the table below (4 bilateral = 8 pts + 1 trunk = 1 pt) and enter the total 0-9.",
          ],
          thresholds: [
            { tone: "emerald", label: "0-5 / 9: Typical pediatric mobility" },
            { tone: "amber", label: ">= 6 / 9: Pediatric hypermobility (Watch + joint stability plan)" },
          ],
          pitfall:
            "For children scoring >= 6/9, avoid extreme passive stretching and prioritize joint stabilization and aquatic proprioception.",
        },
        {
          id: "core-extensors-balance",
          title: "Core Plank, Back Extensors & Single-Leg Balance",
          formField: "Core (s) / Back extensors (s) / Balance (s)",
          unit: "s",
          position: "Firm mat for core/extensors; hard floor barefoot for balance.",
          steps: [
            "Forearm plank: aligned head-trunk-pelvis; stop clock on hip sag or piking.",
            "Back extensors (adapted prone hold): lift sternum slightly off mat with neutral neck and stable pelvis.",
            "Single-leg balance: barefoot, eyes open, hands on hips; test both legs and record the lower score (target 20-30 s).",
          ],
          thresholds: [
            { tone: "amber", label: "Core < 20 s: Trunk weakness (Watch)" },
            { tone: "emerald", label: "Core 20-44 s: Solid | >= 45 s: +6 pts bonus" },
          ],
          pitfall:
            "Remind the child to breathe smoothly rather than holding breath during plank testing.",
        },
        {
          id: "shoulder-breathing-synthesis",
          title: "Shoulder Mobility, Breathing Pattern, Synthesis & Publishing",
          formField: "Shoulders / Breathing / Summary / Parent advice / Publish",
          position: "Back flush to wall for overhead shoulder reach; quiet rest for breathing.",
          steps: [
            "Raise both straight arms overhead against wall without lumbar arching.",
            "Observe resting breathing: balanced diaphragmatic, shallow thoracic, or mouth breathing.",
            "Write concise clinical summary + reassuring parent advice, schedule next checkup (3-6 months), check Live Preview, and enable Publish when finalized.",
          ],
          thresholds: [
            { tone: "emerald", label: "Optimal shoulders + Diaphragmatic breathing" },
            { tone: "amber", label: "Restricted shoulders or Mouth/thoracic breathing: Tailored drills" },
          ],
          pitfall:
            "Use reassuring, non-alarmist language in Parent Advice — frame medical referrals as proactive pediatric checkups.",
        },
      ],
      beightonTable: [
        { criterion: "Passive 5th finger (pinky) dorsiflexion > 90 deg", side: "Left + Right", points: "2 pts (1 + 1)" },
        { criterion: "Passive thumb apposition to volar forearm", side: "Left + Right", points: "2 pts (1 + 1)" },
        { criterion: "Elbow hyperextension > 10 deg", side: "Left + Right", points: "2 pts (1 + 1)" },
        { criterion: "Knee hyperextension (recurvatum) > 10 deg", side: "Left + Right", points: "2 pts (1 + 1)" },
        { criterion: "Palms flat on floor with knees fully extended", side: "Global", points: "1 pt" },
      ],
    },
    {
      id: "redflags",
      badge: "07",
      title: "Red-Flag Escalation Matrix & Medical References",
      subtitle: "Complete summary of AQA automatic evaluation cutoffs and clinical guidelines",
      intro:
        "The AQA Kids clinical engine evaluates every input in real time into Optimal, Watch, or Medical Referral. Use this master table as a poolside quick reference.",
      redFlagMatrix: [
        {
          domain: "Growth & WHO BMI (2007)",
          optimal: "Z-score -2.0 to +1.0 | Chest expansion >= 3.5 cm",
          watch: "Z -3 to -2 or +1 to +2 | Chest < 3.5 cm | Growth spurt >= 7.5 cm/yr (info)",
          referral: "BMI Z-score < -3.0 (severe thinness) or > +2.0 (obesity)",
        },
        {
          domain: "Frontal Spine / Scoliosis (SOSORT)",
          optimal: "Adams negative | ATR 0-3 deg | C7 < 12 mm | Symmetric landmarks",
          watch: "Postural asymmetry | ATR 4-6 deg | C7 >= 12 mm | >= 2 asymmetries | Winged scapulae",
          referral: "True rib/lumbar hump on Adams OR Scoliometer ATR >= 7 deg",
        },
        {
          domain: "Sagittal Spine (Delmas / Stagnara)",
          optimal: "Aligned head | C7 20-35 mm | T6 0 mm | L3 25-40 mm | Full reducibility",
          watch: "Postural round back / reducible hyperkyphosis | Hyperlordosis or L3 > 45 mm | Forward head",
          referral: "Rigid hyperkyphosis OR Rigid reducibility (Scheuermann evaluation)",
        },
        {
          domain: "Lower Limbs & Gait (Salenius)",
          optimal: "Aligned knees | ILMI < 8 mm | Normal gait | Valgum <= 6 cm if <= 6 yrs (info)",
          watch: "Valgum > 6 yrs (<= 6 cm) | Varum <= 5 cm | Recurvatum | ILMI 8-15 mm | Intoeing/Toe walking",
          referral: "DIM > 6 cm (> 6 yrs) or > 8 cm | DIC > 5 cm | Asymmetric knees | ILMI > 15 mm | Limping",
        },
        {
          domain: "Feet & Podology (Staheli / Jack)",
          optimal: "Normal arch | Neutral heel | Jack positive | Tiptoe arch forms | Pain-free",
          watch: "Flexible flatfoot > 6 yrs | High arch | Marked calcaneal valgus",
          referral: "Rigid flatfoot | Jack negative | Arch absent on tiptoes | Painful arch deformity",
        },
        {
          domain: "Flexibility & Core",
          optimal: "DDS <= 12 cm | Schober >= 4 cm | Beighton <= 5/9 | Core >= 20 s",
          watch: "DDS > 12 cm | Schober < 4 cm | Beighton >= 6/9 | Restricted shoulders | Core < 20 s",
          referral: "Check manual Referral if nocturnal back pain, neurological sign, or clinical concern",
        },
      ],
      references: [
        "WHO (2006 & 2007) — Child Growth Standards & 5-19y BMI-for-Age LMS Reference Tables.",
        "SOSORT 2016 Guidelines (Negrini et al., 2018) & SRS — Adolescent Idiopathic Scoliosis screening, Adams test & Bunnell scoliometer.",
        "Bunnell WP (JBJS 1984 / Spine 1993) — Scoliosis screening ATR 5 deg / 7 deg thresholds.",
        "Stagnara P & Delmas A — Sagittal plumb arrows (C7/T6/L3) & Scheuermann kyphosis evaluation.",
        "Salenius P & Vankka E (JBJS Am, 1975) — Developmental tibiofemoral alignment in children (DIM/DIC).",
        "Staheli LT et al. (JBJS Am, 1987) & Jack EA (JBJS Br, 1953) — Pediatric longitudinal arch & Windlass test.",
        "Beighton P et al. (Ann Rheum Dis, 1973) & Modified Schober — Joint hypermobility & lumbar mobility scoring.",
      ],
    },
  ],
};

export const KINE_PROTOCOL_BOOKS: Record<Locale, KineProtocolBook> = {
  fr: FR_BOOK,
  ar: AR_BOOK,
  en: EN_BOOK,
};
