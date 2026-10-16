export interface SkillItem {
  key: string;
  label: string;
  labelFr: string;
  labelEn: string;
  labelAr: string;
  domainKey?: string;
  description?: string;
}

export interface MetricItem {
  key: string;
  label: string;
  labelFr: string;
  labelEn: string;
  labelAr: string;
  unit: string;
}

export interface BiomechanicalDomain {
  key: "water_comfort" | "freestyle" | "backstroke" | "breaststroke" | "butterfly_starts";
  order: number;
  label: string;
  labelFr: string;
  labelEn: string;
  labelAr: string;
  shortLabelFr: string;
  shortLabelEn: string;
  shortLabelAr: string;
  items: SkillItem[];
}

export interface CategorySkillCatalog {
  labelFr: string;
  labelEn: string;
  labelAr: string;
  skills: SkillItem[];
  metrics: MetricItem[];
  domains: BiomechanicalDomain[];
}

export interface AqaSuiviStage {
  key: "elephant" | "crocodile" | "dauphin" | "requin";
  order: number;
  label: string;
  labelFr: string;
  labelEn: string;
  labelAr: string;
  asset: string;
  assetName: string;
  descriptionFr: string;
  descriptionEn: string;
  descriptionAr: string;
  minAvgScore: number;
}

export interface SwimProgressionBadge {
  key: string;
  order: number;
  stageKey: "elephant" | "crocodile" | "dauphin" | "requin";
  label: string;
  labelFr: string;
  labelEn: string;
  labelAr: string;
  asset: string;
  assetName: string;
  minScore: number;
  minScoreAvg: number;
  criterionFr: string;
  criterionEn: string;
  criterionAr: string;
  description: string;
}

export interface SuiviReviewMeta {
  awardedBadgeKey: string | null;
  recommendedLevel: string | null;
  chrono25mFreestyle: number | null;
  chrono50mFreestyle: number | null;
  maxDistanceMeters: number | null;
}

export interface SwimmerSuiviProgressionResult {
  avgSkillScore: number;
  categoryAverages: Record<string, number>;
  badgeKey: string;
  badgeLabel: string;
  badgeLabelEn: string;
  badgeLabelAr: string;
  badgeAsset: string;
  stageKey: string;
  stageLabel: string;
  stageLabelEn: string;
  stageLabelAr: string;
  stageAsset: string;
  unlockedBadges: string[];
  meta: SuiviReviewMeta;
}

export const AQA_SUIVI_STAGES: AqaSuiviStage[] = [
  {
    key: "elephant",
    order: 1,
    label: "Stage 1 - Elephant",
    labelFr: "Palier 1 - Elephant (Immersion & Respiration)",
    labelEn: "Stage 1 - Elephant (Immersion & Breathing)",
    labelAr: "المرحلة 1 - الفيل (التأقلم والتنفس)",
    asset: "elephant.png",
    assetName: "elephant.png",
    descriptionFr:
      "Adaptation aquatique, immersion complete du visage et maitrise de l'expiration subaquatique.",
    descriptionEn:
      "Aquatic adaptation, full facial immersion, and controlled underwater exhalation.",
    descriptionAr:
      "التأقلم مع المحيط المائي، غمر الوجه بالكامل والتحكم في الزفير تحت الماء.",
    minAvgScore: 1.0,
  },
  {
    key: "crocodile",
    order: 2,
    label: "Stage 2 - Crocodile",
    labelFr: "Palier 2 - Crocodile (Flottaison & Glisse)",
    labelEn: "Stage 2 - Crocodile (Buoyancy & Streamline Glide)",
    labelAr: "المرحلة 2 - التمساح (الطفو والانزلاق)",
    asset: "Crocodile.png",
    assetName: "Crocodile.png",
    descriptionFr:
      "Equilibre ventral et dorsal autonome, coulees hydrodynamiques et propulsion de base.",
    descriptionEn:
      "Autonomous ventral and dorsal buoyancy, hydrodynamic glides, and foundational propulsion.",
    descriptionAr:
      "التوازن البطني والظهري المستقل، الانزلاق الانسيابي والدفع الأساسي.",
    minAvgScore: 2.0,
  },
  {
    key: "dauphin",
    order: 3,
    label: "Stage 3 - Dauphin",
    labelFr: "Palier 3 - Dauphin (Coordination & 4 Nages)",
    labelEn: "Stage 3 - Dolphin (Coordination & 4 Strokes)",
    labelAr: "المرحلة 3 - الدلفين (التناسق والسباحات الأربع)",
    asset: "dauphin.png",
    assetName: "dauphin.png",
    descriptionFr:
      "Ondulation subaquatique, coordination respiratoire en crawl, dos crawle et synchronisation de brasse.",
    descriptionEn:
      "Underwater dolphin kick, bilateral freestyle breathing, backstroke, and breaststroke timing.",
    descriptionAr:
      "التموج تحت الماء، تناسق التنفس في السباحة الحرة، سباحة الظهر وتوقيت سباحة الصدر.",
    minAvgScore: 3.0,
  },
  {
    key: "requin",
    order: 4,
    label: "Stage 4 - Requin",
    labelFr: "Palier 4 - Requin (Maitrise, Vitesse & Endurance)",
    labelEn: "Stage 4 - Shark (Mastery, Speed & Endurance)",
    labelAr: "المرحلة 4 - القرش (الإتقان والسرعة والتحمل)",
    asset: "requin.png",
    assetName: "requin.png",
    descriptionFr:
      "Maitrise technique des 4 nages, papillon, virages culbutes, departs plonges et performance chronometrique.",
    descriptionEn:
      "Full 4-stroke technical mastery, butterfly, flip turns, dive starts, and timed sprint performance.",
    descriptionAr:
      "الإتقان التقني للسباحات الأربع، الفراشة، الدوران، الانطلاق والأداء الزمني التنافسي.",
    minAvgScore: 4.0,
  },
];

export const AQA_SUIVI_BADGES: SwimProgressionBadge[] = [
  {
    key: "starter",
    order: 1,
    stageKey: "elephant",
    label: "Starter",
    labelFr: "Starter",
    labelEn: "Starter",
    labelAr: "المبتدئ الأول",
    asset: "starter.png",
    assetName: "starter.png",
    minScore: 1.0,
    minScoreAvg: 1.0,
    criterionFr: "Premiere immersion et decouverte confiante du milieu aquatique",
    criterionEn: "First water entry and confident adaptation to the pool environment",
    criterionAr: "الدخول الأول للماء والتأقلم الأولي بثقة داخل المسبح",
    description: "Premiere immersion et decouverte du milieu aquatique",
  },
  {
    key: "beginner",
    order: 2,
    stageKey: "elephant",
    label: "Beginner",
    labelFr: "Beginner",
    labelEn: "Beginner",
    labelAr: "مبتدئ مائي",
    asset: "beginner.png",
    assetName: "beginner.png",
    minScore: 1.3,
    minScoreAvg: 1.3,
    criterionFr: "Immersion complete du visage et expiration subaquatique active (bulles)",
    criterionEn: "Full face immersion and active underwater exhalation",
    criterionAr: "غمر الوجه بالكامل والزفير النشط تحت الماء",
    description: "Familiarisation, respiration de base et equilibre assiste",
  },
  {
    key: "floater",
    order: 3,
    stageKey: "elephant",
    label: "Floater",
    labelFr: "Floater",
    labelEn: "Floater",
    labelAr: "الطفو المتوازن",
    asset: "floater.png",
    assetName: "floater.png",
    minScore: 1.6,
    minScoreAvg: 1.6,
    criterionFr: "Autonomie en flottaison ventrale et dorsale (etoile de mer 10s)",
    criterionEn: "Autonomous ventral and dorsal star float for 10 seconds",
    criterionAr: "الطفو البطني والظهري المستقل لمدة 10 ثوان",
    description: "Autonomie en flottaison ventrale et dorsale sans appui",
  },
  {
    key: "leaf",
    order: 4,
    stageKey: "crocodile",
    label: "Leaf Glider",
    labelFr: "Leaf Glider",
    labelEn: "Leaf Glider",
    labelAr: "الانزلاق الانسيابي",
    asset: "leaf.png",
    assetName: "leaf.png",
    minScore: 1.9,
    minScoreAvg: 1.9,
    criterionFr: "Coulee ventrale et dorsale profilee avec poussee murale sur 5m",
    criterionEn: "Streamlined ventral and dorsal wall push-off and glide over 5m",
    criterionAr: "الانزلاق البطني والظهري الانسيابي مع الدفع من الحائط لمسافة 5م",
    description: "Coulee ventrale et dorsale profilee avec poussee murale",
  },
  {
    key: "dolphin",
    order: 5,
    stageKey: "crocodile",
    label: "Dolphin",
    labelFr: "Dolphin",
    labelEn: "Dolphin",
    labelAr: "الدلفين",
    asset: "dolphin.png",
    assetName: "dolphin.png",
    minScore: 2.2,
    minScoreAvg: 2.2,
    criterionFr: "Glisse hydrodynamique, battements continus et ondulations sur 15m",
    criterionEn: "Hydrodynamic glide, continuous flutter kick, and dolphin undulations over 15m",
    criterionAr: "انزلاق هيدروديناميكي، ضربات أرجل مستمرة وتموجات لمسافة 15م",
    description: "Glisse hydrodynamique, coulees et propulsion ondulation",
  },
  {
    key: "crawler",
    order: 6,
    stageKey: "crocodile",
    label: "Crawler",
    labelFr: "Crawler",
    labelEn: "Crawler",
    labelAr: "سباح الكراول",
    asset: "crawler.png",
    assetName: "crawler.png",
    minScore: 2.5,
    minScoreAvg: 2.5,
    criterionFr: "Coordination complete du crawl sur 25m avec respiration laterale",
    criterionEn: "Complete 25m front crawl coordination with lateral breathing",
    criterionAr: "تناسق كامل للسباحة الحرة لمسافة 25م مع تنفس جانبي",
    description: "Coordination complete du crawl avec respiration laterale",
  },
  {
    key: "brasseur",
    order: 7,
    stageKey: "dauphin",
    label: "Brasseur",
    labelFr: "Brasseur",
    labelEn: "Breaststroker",
    labelAr: "سباح الصدر",
    asset: "brasseur.png",
    assetName: "brasseur.png",
    minScore: 2.8,
    minScoreAvg: 2.8,
    criterionFr: "Maitrise du ciseau symetrique et de la synchronisation de brasse sur 25m",
    criterionEn: "Symmetrical whip kick and breaststroke timing over 25m",
    criterionAr: "إتقان ضربة الصدر المتماثلة والتوقيت الحركي لمسافة 25م",
    description: "Maitrise du ciseau et de la synchronisation de brasse",
  },
  {
    key: "butterfly",
    order: 8,
    stageKey: "dauphin",
    label: "Butterfly",
    labelFr: "Butterfly",
    labelEn: "Butterfly",
    labelAr: "سباح الفراشة",
    asset: "butterfly.png",
    assetName: "butterfly.png",
    minScore: 3.1,
    minScoreAvg: 3.1,
    criterionFr: "Propulsion papillon coordonnee (2 ondulations par cycle) sur 15m a 25m",
    criterionEn: "Coordinated butterfly propulsion (2 kicks per cycle) over 15m to 25m",
    criterionAr: "سباحة الفراشة المتناسقة (ضربتان لكل دورة ذراعين) لمسافة 15م إلى 25م",
    description: "Propulsion papillon, puissance et rythme subaquatique",
  },
  {
    key: "shark",
    order: 9,
    stageKey: "dauphin",
    label: "Shark",
    labelFr: "Shark",
    labelEn: "Shark",
    labelAr: "القرش",
    asset: "shark.png",
    assetName: "shark.png",
    minScore: 3.4,
    minScoreAvg: 3.4,
    criterionFr: "Maitrise de 3 nages codifiees sur 50m avec depart plonge",
    criterionEn: "Mastery of 3 competitive strokes over 50m with dive start",
    criterionAr: "إتقان 3 سباحات قانونية لمسافة 50م مع انطلاقة الغطس",
    description: "Perfectionnement multi-nages, virages culbutes et vitesse",
  },
  {
    key: "orca",
    order: 10,
    stageKey: "dauphin",
    label: "Orca",
    labelFr: "Orca",
    labelEn: "Orca",
    labelAr: "الأوركا",
    asset: "orca.png",
    assetName: "orca.png",
    minScore: 3.7,
    minScoreAvg: 3.7,
    criterionFr: "Enchainement 100m 4 nages avec virages reglementaires",
    criterionEn: "Continuous 100m individual medley with legal stroke transitions",
    criterionAr: "إتمام 100م متنوعة فردي متواصلة مع التحولات القانونية",
    description: "Excellence technique, endurance longue distance et chrono",
  },
  {
    key: "whale",
    order: 11,
    stageKey: "requin",
    label: "Whale Endurance",
    labelFr: "Whale Endurance",
    labelEn: "Whale Endurance",
    labelAr: "تحمل الحوت",
    asset: "whale.png",
    assetName: "whale.png",
    minScore: 4.0,
    minScoreAvg: 4.0,
    criterionFr: "Endurance aerobie continue de 200m a 400m avec amplitude stable",
    criterionEn: "Continuous 200m to 400m aerobic endurance with consistent stroke length",
    criterionAr: "تحمل هوائي متواصل لمسافة 200م إلى 400م مع ثبات طول الضربة",
    description: "Endurance aerobie longue distance et regularite technique",
  },
  {
    key: "kraken",
    order: 12,
    stageKey: "requin",
    label: "Kraken Power",
    labelFr: "Kraken Power",
    labelEn: "Kraken Power",
    labelAr: "قوة الكراكن",
    asset: "kraken.png",
    assetName: "kraken.png",
    minScore: 4.2,
    minScoreAvg: 4.2,
    criterionFr: "Puissance explosive, coulee subaquatique 12m+ et sprint 25m haute vitesse",
    criterionEn: "Explosive power, 12m+ underwater breakout, and high-velocity 25m sprint",
    criterionAr: "قوة دفع عالية، انزلاق تحت الماء 12م+ وسرعة قصوى في 25م",
    description: "Puissance propulsive, coulees longues et sprint explosif",
  },
  {
    key: "mosasaurus",
    order: 13,
    stageKey: "requin",
    label: "Mosasaurus Elite",
    labelFr: "Mosasaurus Elite",
    labelEn: "Mosasaurus Elite",
    labelAr: "نخبة الموزاصور",
    asset: "mosasaurus.png",
    assetName: "mosasaurus.png",
    minScore: 4.4,
    minScoreAvg: 4.4,
    criterionFr: "Perfectionnement elite 4 nages, virages culbutes rapides et rythme de course",
    criterionEn: "Elite 4-stroke refinement, high-speed flip turns, and race pacing",
    criterionAr: "إتقان النخبة للسباحات الأربع، دوران سريع وتنظيم إيقاع السباق",
    description: "Perfectionnement elite 4 nages et virages haute vitesse",
  },
  {
    key: "tsunami",
    order: 14,
    stageKey: "requin",
    label: "Tsunami Master",
    labelFr: "Tsunami Master",
    labelEn: "Tsunami Master",
    labelAr: "سيد التسونامي",
    asset: "tsunami.png",
    assetName: "tsunami.png",
    minScore: 4.7,
    minScoreAvg: 4.7,
    criterionFr: "Performance chronometrique avancee sur 50m crawl et 200m 4 nages",
    criterionEn: "Advanced timed performance on 50m freestyle and 200m individual medley",
    criterionAr: "أداء زمني متقدم في سباق 50م حرة و200م متنوعة",
    description: "Performance chronometrique avancee et maitrise de course",
  },
  {
    key: "full_swimmer",
    order: 15,
    stageKey: "requin",
    label: "Full Swimmer AQA Pro",
    labelFr: "Full Swimmer AQA Pro",
    labelEn: "Full Swimmer AQA Pro",
    labelAr: "السباح الكامل AQA Pro",
    asset: "full_swimmer.png",
    assetName: "full_swimmer.png",
    minScore: 4.9,
    minScoreAvg: 4.9,
    criterionFr: "Maitrise integrale des 4 nages et excellence haute performance AQA Sports",
    criterionEn: "Complete 4-stroke mastery and AQA Sports high-performance excellence",
    criterionAr: "الإتقان الشامل للسباحات الأربع والتميز العالي في أكاديمية AQA",
    description: "Maitrise integrale 4 nages et autonomie haute performance AQA",
  },
];

export const SWIM_PROGRESSION_BADGES: SwimProgressionBadge[] = AQA_SUIVI_BADGES;

export const AQA_BIOMECHANICAL_DOMAINS: BiomechanicalDomain[] = [
  {
    key: "water_comfort",
    order: 1,
    label: "Aisance & Equilibre",
    labelFr: "Aisance & Equilibre Aquatique",
    labelEn: "Water Comfort & Buoyancy",
    labelAr: "التأقلم والتوازن المائي",
    shortLabelFr: "AISANCE",
    shortLabelEn: "COMFORT",
    shortLabelAr: "التأقلم",
    items: [
      {
        key: "immersion_breathing",
        domainKey: "water_comfort",
        label: "Immersion & expiration subaquatique",
        labelFr: "Immersion & expiration subaquatique",
        labelEn: "Facial immersion & underwater exhale",
        labelAr: "غمر الوجه والزفير تحت الماء",
      },
      {
        key: "star_float",
        domainKey: "water_comfort",
        label: "Flottaison ventrale & dorsale (etoile)",
        labelFr: "Flottaison ventrale & dorsale (etoile)",
        labelEn: "Ventral & dorsal star buoyancy",
        labelAr: "الطفو البطني والظهري المتوازن",
      },
      {
        key: "streamline_glide",
        domainKey: "water_comfort",
        label: "Coulee ventrale hydrodynamique",
        labelFr: "Coulee ventrale hydrodynamique",
        labelEn: "Hydrodynamic streamline glide",
        labelAr: "الانزلاق الانسيابي تحت الماء",
      },
      {
        key: "deep_water_safety",
        domainKey: "water_comfort",
        label: "Entree, maintien & retour securise",
        labelFr: "Entree, maintien & retour securise",
        labelEn: "Safe entry, treading & wall return",
        labelAr: "الدخول الآمن والبقاء والعودة للحافة",
      },
    ],
  },
  {
    key: "freestyle",
    order: 2,
    label: "Crawl",
    labelFr: "Crawl (Nage Libre)",
    labelEn: "Freestyle (Front Crawl)",
    labelAr: "السباحة الحرة (كراول)",
    shortLabelFr: "CRAWL",
    shortLabelEn: "FREESTYLE",
    shortLabelAr: "الحرة",
    items: [
      {
        key: "freestyle_body_position",
        domainKey: "freestyle",
        label: "Alignement horizontal & gainage",
        labelFr: "Alignement horizontal & gainage",
        labelEn: "Horizontal body alignment & core",
        labelAr: "الاستقامة الأفقية وثبات الجذع",
      },
      {
        key: "freestyle_flutter_kick",
        domainKey: "freestyle",
        label: "Battements de jambes continus",
        labelFr: "Battements de jambes continus",
        labelEn: "Continuous rhythmic flutter kick",
        labelAr: "ضربات الأرجل المستمرة والمنتظمة",
      },
      {
        key: "freestyle_catch_pull",
        domainKey: "freestyle",
        label: "Prise d'appui & traction subaquatique",
        labelFr: "Prise d'appui & traction subaquatique",
        labelEn: "High-elbow catch & underwater pull",
        labelAr: "مسك الماء والدفع الفعال بالذراعين",
      },
      {
        key: "freestyle_bilateral_breathing",
        domainKey: "freestyle",
        label: "Respiration laterale bilaterale",
        labelFr: "Respiration laterale bilaterale",
        labelEn: "Bilateral side breathing rhythm",
        labelAr: "التنفس الجانبي الثنائي المتناسق",
      },
    ],
  },
  {
    key: "backstroke",
    order: 3,
    label: "Dos Crawle",
    labelFr: "Dos Crawle",
    labelEn: "Backstroke",
    labelAr: "سباحة الظهر",
    shortLabelFr: "DOS",
    shortLabelEn: "BACKSTROKE",
    shortLabelAr: "الظهر",
    items: [
      {
        key: "backstroke_head_spine",
        domainKey: "backstroke",
        label: "Posture tete fixe & bassin haut",
        labelFr: "Posture tete fixe & bassin haut",
        labelEn: "Steady head position & high hips",
        labelAr: "ثبات الرأس وارتفاع الحوض على السطح",
      },
      {
        key: "backstroke_kick",
        domainKey: "backstroke",
        label: "Battements reguliers en surface",
        labelFr: "Battements reguliers en surface",
        labelEn: "Consistent surface backstroke kick",
        labelAr: "ضربات أرجل منتظمة في سباحة الظهر",
      },
      {
        key: "backstroke_body_roll",
        domainKey: "backstroke",
        label: "Roulis des epaules & opposition",
        labelFr: "Roulis des epaules & opposition",
        labelEn: "Shoulder rotation & arm opposition",
        labelAr: "دوران الكتفين وتناوب حركة الذراعين",
      },
      {
        key: "backstroke_arm_recovery",
        domainKey: "backstroke",
        label: "Sortie pouce & entree petit doigt",
        labelFr: "Sortie pouce & entree petit doigt",
        labelEn: "Thumb-first exit & pinky-first entry",
        labelAr: "خروج الإبهام ودخول الخنصر بدقة",
      },
    ],
  },
  {
    key: "breaststroke",
    order: 4,
    label: "Brasse",
    labelFr: "Brasse",
    labelEn: "Breaststroke",
    labelAr: "سباحة الصدر",
    shortLabelFr: "BRASSE",
    shortLabelEn: "BREAST",
    shortLabelAr: "الصدر",
    items: [
      {
        key: "breaststroke_whip_kick",
        domainKey: "breaststroke",
        label: "Ciseau de brasse symetrique",
        labelFr: "Ciseau de brasse symetrique",
        labelEn: "Symmetrical dorsiflexed whip kick",
        labelAr: "ضربة رجل الصدر المتماثلة والدافعة",
      },
      {
        key: "breaststroke_scull_pull",
        domainKey: "breaststroke",
        label: "Traction simultanee & appuis",
        labelFr: "Traction simultanee & appuis",
        labelEn: "Simultaneous out-sweep & in-sweep pull",
        labelAr: "السحب المتزامن للذراعين والارتكاز",
      },
      {
        key: "breaststroke_timing",
        domainKey: "breaststroke",
        label: "Synchronisation Tirer-Respirer-Glisser",
        labelFr: "Synchronisation Tirer-Respirer-Glisser",
        labelEn: "Pull-Breathe-Kick-Glide timing",
        labelAr: "توقيت: سحب - تنفس - دفع - انزلاق",
      },
      {
        key: "breaststroke_underwater_pullout",
        domainKey: "breaststroke",
        label: "Coulee subaquatique de brasse",
        labelFr: "Coulee subaquatique de brasse",
        labelEn: "Underwater breaststroke pullout",
        labelAr: "الشدة الطويلة تحت الماء في الصدر",
      },
    ],
  },
  {
    key: "butterfly_starts",
    order: 5,
    label: "Papillon & Departs",
    labelFr: "Papillon, Departs & Virages",
    labelEn: "Butterfly, Starts & Turns",
    labelAr: "الفراشة والانطلاق والدوران",
    shortLabelFr: "PAP & VIRAGES",
    shortLabelEn: "FLY & TURNS",
    shortLabelAr: "الفراشة والدوران",
    items: [
      {
        key: "dolphin_undulation",
        domainKey: "butterfly_starts",
        label: "Ondulation dauphin fluide",
        labelFr: "Ondulation dauphin fluide",
        labelEn: "Fluid core-driven dolphin undulation",
        labelAr: "تموج الدلفين الانسيابي من الجذع",
      },
      {
        key: "butterfly_rhythm",
        domainKey: "butterfly_starts",
        label: "Coordination papillon 2 temps",
        labelFr: "Coordination papillon 2 temps",
        labelEn: "Two-beat butterfly stroke rhythm",
        labelAr: "تناسق سباحة الفراشة بإيقاع ضربتين",
      },
      {
        key: "dive_start_entry",
        domainKey: "butterfly_starts",
        label: "Plongeon de depart & entree",
        labelFr: "Plongeon de depart & entree",
        labelEn: "Block dive start & clean entry",
        labelAr: "قفزة الانطلاق والدخول النظيف للماء",
      },
      {
        key: "tumble_open_turns",
        domainKey: "butterfly_starts",
        label: "Virage culbute & reprise de nage",
        labelFr: "Virage culbute & reprise de nage",
        labelEn: "Flip/open turns & breakout",
        labelAr: "الدوران الشقلبي واستئناف السباحة",
      },
    ],
  },
];

export const SWIM_SKILLS_CATALOG_V1: Record<string, CategorySkillCatalog> = {
  enfants: {
    labelFr: "Programme Enfants & Ecole de Nage",
    labelEn: "Youth & Swim School Program",
    labelAr: "برنامج الأطفال ومدرسة السباحة",
    domains: AQA_BIOMECHANICAL_DOMAINS,
    skills: [
      {
        key: "water_confidence",
        domainKey: "water_comfort",
        label: "Aisance aquatique et equilibre",
        labelFr: "Aisance aquatique et equilibre",
        labelEn: "Water confidence and balance",
        labelAr: "الثقة والتوازن المائي",
      },
      {
        key: "face_immersion",
        domainKey: "water_comfort",
        label: "Immersion du visage",
        labelFr: "Immersion du visage",
        labelEn: "Full face immersion",
        labelAr: "غمر الوجه في الماء",
      },
      {
        key: "underwater_exhale",
        domainKey: "water_comfort",
        label: "Expiration subaquatique continue",
        labelFr: "Expiration subaquatique continue",
        labelEn: "Continuous underwater exhalation",
        labelAr: "الزفير المستمر تحت الماء",
      },
      {
        key: "ventral_float",
        domainKey: "water_comfort",
        label: "Flottaison ventrale (etoile de mer)",
        labelFr: "Flottaison ventrale (etoile de mer)",
        labelEn: "Ventral star float",
        labelAr: "الطفو البطني (نجمة البحر)",
      },
      {
        key: "dorsal_float",
        domainKey: "backstroke",
        label: "Flottaison dorsale",
        labelFr: "Flottaison dorsale",
        labelEn: "Dorsal back float",
        labelAr: "الطفو الظهري",
      },
      {
        key: "ventral_glide",
        domainKey: "water_comfort",
        label: "Coulee ventrale avec propulsion",
        labelFr: "Coulee ventrale avec propulsion",
        labelEn: "Streamline ventral glide with kick",
        labelAr: "الانزلاق البطني مع الدفع",
      },
      {
        key: "flutter_kick",
        domainKey: "freestyle",
        label: "Battement de jambes efficace",
        labelFr: "Battement de jambes efficace",
        labelEn: "Effective flutter kick",
        labelAr: "ضربات الأرجل الفعالة",
      },
      {
        key: "freestyle_coord",
        domainKey: "freestyle",
        label: "Coordination bras / respiration crawl",
        labelFr: "Coordination bras / respiration crawl",
        labelEn: "Freestyle arm and breathing coordination",
        labelAr: "تناسق الذراعين والتنفس في السباحة الحرة",
      },
      {
        key: "backstroke_arms",
        domainKey: "backstroke",
        label: "Propulsion dos crawle",
        labelFr: "Propulsion dos crawle",
        labelEn: "Backstroke arm propulsion",
        labelAr: "الدفع في سباحة الظهر",
      },
      {
        key: "breaststroke_kick",
        domainKey: "breaststroke",
        label: "Ciseau de brasse",
        labelFr: "Ciseau de brasse",
        labelEn: "Breaststroke whip kick",
        labelAr: "ضربة رجل الصدر",
      },
      {
        key: "safe_entry",
        domainKey: "butterfly_starts",
        label: "Saut et entree securisee dans l'eau",
        labelFr: "Saut et entree securisee dans l'eau",
        labelEn: "Safe jump and water entry",
        labelAr: "القفز والدخول الآمن للماء",
      },
      {
        key: "safety_turn",
        domainKey: "butterfly_starts",
        label: "Retournement de securite et retour au bord",
        labelFr: "Retournement de securite et retour au bord",
        labelEn: "Safety rollover and return to wall",
        labelAr: "الانقلاب الآمن والعودة إلى الحافة",
      },
    ],
    metrics: [
      {
        key: "continuous_distance",
        label: "Distance continue",
        labelFr: "Distance continue",
        labelEn: "Continuous distance",
        labelAr: "المسافة المتواصلة",
        unit: "m",
      },
    ],
  },
  homme: {
    labelFr: "Programme Adultes Hommes",
    labelEn: "Adult Men Program",
    labelAr: "برنامج الرجال",
    domains: AQA_BIOMECHANICAL_DOMAINS,
    skills: [
      {
        key: "lateral_breathing",
        domainKey: "freestyle",
        label: "Respiration laterale crawl bilatérale",
        labelFr: "Respiration laterale crawl bilaterale",
        labelEn: "Bilateral freestyle lateral breathing",
        labelAr: "التنفس الجانبي الثنائي في السباحة الحرة",
      },
      {
        key: "freestyle_catch",
        domainKey: "freestyle",
        label: "Prise d'appui et traction crawl",
        labelFr: "Prise d'appui et traction crawl",
        labelEn: "Freestyle catch and underwater pull",
        labelAr: "مسك الماء والسحب في السباحة الحرة",
      },
      {
        key: "freestyle_kick",
        domainKey: "water_comfort",
        label: "Battement stabilise et horizontalite",
        labelFr: "Battement stabilise et horizontalite",
        labelEn: "Stabilized kick and horizontal trim",
        labelAr: "ثبات ضربات الأرجل والاستقامة الأفقية",
      },
      {
        key: "backstroke_roll",
        domainKey: "backstroke",
        label: "Roulis du corps en dos crawle",
        labelFr: "Roulis du corps en dos crawle",
        labelEn: "Backstroke body roll and alignment",
        labelAr: "دوران الجسم في سباحة الظهر",
      },
      {
        key: "breaststroke_glide",
        domainKey: "breaststroke",
        label: "Glisse et synchronisation brasse",
        labelFr: "Glisse et synchronisation brasse",
        labelEn: "Breaststroke glide and synchronization",
        labelAr: "الانزلاق والتناسق في سباحة الصدر",
      },
      {
        key: "butterfly_undulation",
        domainKey: "butterfly_starts",
        label: "Ondulation papillon",
        labelFr: "Ondulation papillon",
        labelEn: "Butterfly dolphin undulation",
        labelAr: "التموج في سباحة الفراشة",
      },
      {
        key: "tumble_turn",
        domainKey: "butterfly_starts",
        label: "Virage culbute crawl",
        labelFr: "Virage culbute crawl",
        labelEn: "Freestyle flip turn",
        labelAr: "الدوران الشقلبي في السباحة الحرة",
      },
      {
        key: "dive_start",
        domainKey: "butterfly_starts",
        label: "Plongeon depart plot",
        labelFr: "Plongeon depart plot",
        labelEn: "Starting block dive",
        labelAr: "قفزة الانطلاق من المنصة",
      },
      {
        key: "aerobic_endurance",
        domainKey: "water_comfort",
        label: "Endurance aerobie (series longues)",
        labelFr: "Endurance aerobie (series longues)",
        labelEn: "Aerobic endurance (long sets)",
        labelAr: "التحمل الهوائي (سلاسل طويلة)",
      },
    ],
    metrics: [
      {
        key: "time_50m_free",
        label: "Chrono 50m Crawl",
        labelFr: "Chrono 50m Crawl",
        labelEn: "50m Freestyle Time",
        labelAr: "توقيت 50م حرة",
        unit: "s",
      },
      {
        key: "time_100m_free",
        label: "Chrono 100m Crawl",
        labelFr: "Chrono 100m Crawl",
        labelEn: "100m Freestyle Time",
        labelAr: "توقيت 100م حرة",
        unit: "s",
      },
      {
        key: "continuous_distance",
        label: "Distance maximale continue",
        labelFr: "Distance maximale continue",
        labelEn: "Maximum continuous distance",
        labelAr: "أقصى مسافة متواصلة",
        unit: "m",
      },
    ],
  },
  femme: {
    labelFr: "Programme Adultes Femmes",
    labelEn: "Adult Women Program",
    labelAr: "برنامج السيدات",
    domains: AQA_BIOMECHANICAL_DOMAINS,
    skills: [
      {
        key: "lateral_breathing",
        domainKey: "freestyle",
        label: "Respiration laterale crawl bilatérale",
        labelFr: "Respiration laterale crawl bilaterale",
        labelEn: "Bilateral freestyle lateral breathing",
        labelAr: "التنفس الجانبي الثنائي في السباحة الحرة",
      },
      {
        key: "freestyle_catch",
        domainKey: "freestyle",
        label: "Prise d'appui et traction crawl",
        labelFr: "Prise d'appui et traction crawl",
        labelEn: "Freestyle catch and underwater pull",
        labelAr: "مسك الماء والسحب في السباحة الحرة",
      },
      {
        key: "freestyle_kick",
        domainKey: "water_comfort",
        label: "Battement stabilise et horizontalite",
        labelFr: "Battement stabilise et horizontalite",
        labelEn: "Stabilized kick and horizontal trim",
        labelAr: "ثبات ضربات الأرجل والاستقامة الأفقية",
      },
      {
        key: "backstroke_roll",
        domainKey: "backstroke",
        label: "Roulis du corps en dos crawle",
        labelFr: "Roulis du corps en dos crawle",
        labelEn: "Backstroke body roll and alignment",
        labelAr: "دوران الجسم في سباحة الظهر",
      },
      {
        key: "breaststroke_glide",
        domainKey: "breaststroke",
        label: "Glisse et synchronisation brasse",
        labelFr: "Glisse et synchronisation brasse",
        labelEn: "Breaststroke glide and synchronization",
        labelAr: "الانزلاق والتناسق في سباحة الصدر",
      },
      {
        key: "butterfly_undulation",
        domainKey: "butterfly_starts",
        label: "Ondulation papillon",
        labelFr: "Ondulation papillon",
        labelEn: "Butterfly dolphin undulation",
        labelAr: "التموج في سباحة الفراشة",
      },
      {
        key: "tumble_turn",
        domainKey: "butterfly_starts",
        label: "Virage culbute crawl",
        labelFr: "Virage culbute crawl",
        labelEn: "Freestyle flip turn",
        labelAr: "الدوران الشقلبي في السباحة الحرة",
      },
      {
        key: "dive_start",
        domainKey: "butterfly_starts",
        label: "Plongeon depart plot",
        labelFr: "Plongeon depart plot",
        labelEn: "Starting block dive",
        labelAr: "قفزة الانطلاق من المنصة",
      },
      {
        key: "aerobic_endurance",
        domainKey: "water_comfort",
        label: "Endurance aerobie (series longues)",
        labelFr: "Endurance aerobie (series longues)",
        labelEn: "Aerobic endurance (long sets)",
        labelAr: "التحمل الهوائي (سلاسل طويلة)",
      },
    ],
    metrics: [
      {
        key: "time_50m_free",
        label: "Chrono 50m Crawl",
        labelFr: "Chrono 50m Crawl",
        labelEn: "50m Freestyle Time",
        labelAr: "توقيت 50م حرة",
        unit: "s",
      },
      {
        key: "time_100m_free",
        label: "Chrono 100m Crawl",
        labelFr: "Chrono 100m Crawl",
        labelEn: "100m Freestyle Time",
        labelAr: "توقيت 100م حرة",
        unit: "s",
      },
      {
        key: "continuous_distance",
        label: "Distance maximale continue",
        labelFr: "Distance maximale continue",
        labelEn: "Maximum continuous distance",
        labelAr: "أقصى مسافة متواصلة",
        unit: "m",
      },
    ],
  },
  apnea: {
    labelFr: "Programme Apnee & Securite Subaquatique",
    labelEn: "Freediving & Underwater Safety Program",
    labelAr: "برنامج الغوص الحر والسلامة المائية",
    domains: AQA_BIOMECHANICAL_DOMAINS,
    skills: [
      {
        key: "relaxation_technique",
        domainKey: "water_comfort",
        label: "Relaxation pre-apnee et ventilation",
        labelFr: "Relaxation pre-apnee et ventilation",
        labelEn: "Pre-dive relaxation and breathing",
        labelAr: "الاسترخاء والتهوية قبل حبس النفس",
      },
      {
        key: "breathe_up",
        domainKey: "water_comfort",
        label: "Inspiration maximale controlee",
        labelFr: "Inspiration maximale controlee",
        labelEn: "Controlled full inhalation",
        labelAr: "الشهيق الكامل المتحكم فيه",
      },
      {
        key: "static_apnea",
        domainKey: "water_comfort",
        label: "Apnee statique (gestion du reflexe inspiratoire)",
        labelFr: "Apnee statique (gestion du reflexe inspiratoire)",
        labelEn: "Static apnea (contraction management)",
        labelAr: "حبس النفس الثابت",
      },
      {
        key: "dynamic_apnea",
        domainKey: "freestyle",
        label: "Apnee dynamique (palmage lent et fluide)",
        labelFr: "Apnee dynamique (palmage lent et fluide)",
        labelEn: "Dynamic apnea (fluid finning technique)",
        labelAr: "الغوص الديناميكي الانسيابي",
      },
      {
        key: "duck_dive",
        domainKey: "butterfly_starts",
        label: "Canard vertical et compensation",
        labelFr: "Canard vertical et compensation",
        labelEn: "Vertical duck dive and equalization",
        labelAr: "النزول العمودي ومعادلة الضغط",
      },
      {
        key: "equalization",
        domainKey: "breaststroke",
        label: "Compensation Frenzel / Valsalva",
        labelFr: "Compensation Frenzel / Valsalva",
        labelEn: "Frenzel / Valsalva equalization",
        labelAr: "معادلة الأذن بطريقة فرينزل أو فالسالفا",
      },
      {
        key: "buddy_safety",
        domainKey: "backstroke",
        label: "Securite binome et protocole de secours",
        labelFr: "Securite binome et protocole de secours",
        labelEn: "Buddy safety and rescue protocol",
        labelAr: "سلامة الثنائي وبروتوكول الإنقاذ",
      },
    ],
    metrics: [
      {
        key: "static_time",
        label: "Duree apnee statique",
        labelFr: "Duree apnee statique",
        labelEn: "Static apnea duration",
        labelAr: "مدة حبس النفس الثابت",
        unit: "s",
      },
      {
        key: "dynamic_distance",
        label: "Distance apnee dynamique",
        labelFr: "Distance apnee dynamique",
        labelEn: "Dynamic apnea distance",
        labelAr: "مسافة الغوص الديناميكي",
        unit: "m",
      },
    ],
  },
};

export const SKILL_SCORE_LABELS: Record<number, string> = {
  1: "Non acquis",
  2: "En cours d'acquisition",
  3: "Acquis",
  4: "Maitrise",
  5: "Excellence AQA",
};

const SKILL_TO_DOMAIN_MAP: Record<string, BiomechanicalDomain["key"]> = (() => {
  const map: Record<string, BiomechanicalDomain["key"]> = {
    water_comfort: "water_comfort",
    freestyle: "freestyle",
    backstroke: "backstroke",
    breaststroke: "breaststroke",
    butterfly_starts: "butterfly_starts",
    breathing: "water_comfort",
    floating: "water_comfort",
    kicking: "freestyle",
  };
  for (const domain of AQA_BIOMECHANICAL_DOMAINS) {
    for (const item of domain.items) {
      map[item.key] = domain.key;
    }
  }
  for (const cat of Object.values(SWIM_SKILLS_CATALOG_V1)) {
    for (const skill of cat.skills) {
      if (skill.domainKey) {
        map[skill.key] = skill.domainKey as BiomechanicalDomain["key"];
      }
    }
  }
  return map;
})();

export function getSkillsForCategory(category: string): CategorySkillCatalog {
  const normCat = category.toLowerCase().trim();
  return (
    SWIM_SKILLS_CATALOG_V1[normCat] || {
      labelFr: SWIM_SKILLS_CATALOG_V1.homme.labelFr,
      labelEn: SWIM_SKILLS_CATALOG_V1.homme.labelEn,
      labelAr: SWIM_SKILLS_CATALOG_V1.homme.labelAr,
      domains: AQA_BIOMECHANICAL_DOMAINS,
      skills: SWIM_SKILLS_CATALOG_V1.homme.skills,
      metrics: SWIM_SKILLS_CATALOG_V1.homme.metrics,
    }
  );
}

function toFiniteNumberOrNull(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function computeSwimmerSuiviProgression(
  latestSkillsJson: Record<string, unknown> | Array<unknown> | string | null | undefined,
  reviewCount = 0
): SwimmerSuiviProgressionResult {
  const defaultDomainAverages: Record<string, number> = {
    water_comfort: 1.0,
    freestyle: 1.0,
    backstroke: 1.0,
    breaststroke: 1.0,
    butterfly_starts: 1.0,
  };

  const meta: SuiviReviewMeta = {
    awardedBadgeKey: null,
    recommendedLevel: null,
    chrono25mFreestyle: null,
    chrono50mFreestyle: null,
    maxDistanceMeters: null,
  };

  let parsed: unknown = latestSkillsJson;
  if (typeof latestSkillsJson === "string" && latestSkillsJson.trim().length > 0) {
    try {
      parsed = JSON.parse(latestSkillsJson);
    } catch {
      parsed = null;
    }
  }

  const domainScores: Record<BiomechanicalDomain["key"], number[]> = {
    water_comfort: [],
    freestyle: [],
    backstroke: [],
    breaststroke: [],
    butterfly_starts: [],
  };
  const allScores: number[] = [];

  const pushScore = (skillKey: string, rawScore: unknown) => {
    const num = Number(rawScore);
    if (!Number.isFinite(num) || num <= 0) return;
    const clamped = Math.max(1, Math.min(5, num));
    allScores.push(clamped);
    const domain = SKILL_TO_DOMAIN_MAP[skillKey] || "water_comfort";
    domainScores[domain].push(clamped);
  };

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (item && typeof item === "object") {
        const rec = item as Record<string, unknown>;
        const k = String(rec.key || rec.skillKey || "water_comfort");
        if (k === "_meta") continue;
        pushScore(k, rec.score);
      }
    }
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (obj._meta && typeof obj._meta === "object") {
      const m = obj._meta as Record<string, unknown>;
      if (typeof m.awardedBadgeKey === "string" && m.awardedBadgeKey.trim().length > 0) {
        meta.awardedBadgeKey = m.awardedBadgeKey.trim().toLowerCase();
      }
      if (typeof m.recommendedLevel === "string" && m.recommendedLevel.trim().length > 0) {
        meta.recommendedLevel = m.recommendedLevel.trim();
      }
      meta.chrono25mFreestyle = toFiniteNumberOrNull(
        m.chrono25mFreestyle ?? m.time25mSec ?? m.time_25m_free
      );
      meta.chrono50mFreestyle = toFiniteNumberOrNull(
        m.chrono50mFreestyle ?? m.time50mSec ?? m.time_50m_free
      );
      meta.maxDistanceMeters = toFiniteNumberOrNull(
        m.maxDistanceMeters ?? m.maxDistanceM ?? m.continuous_distance
      );
    }

    if (Array.isArray(obj.skills)) {
      for (const item of obj.skills) {
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          const k = String(rec.key || rec.skillKey || "water_comfort");
          pushScore(k, rec.score);
        }
      }
    } else {
      for (const [key, value] of Object.entries(obj)) {
        if (key === "_meta" || key === "skills" || key === "metrics") continue;
        if (typeof value === "number" || typeof value === "string") {
          pushScore(key, value);
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
          const nested = value as Record<string, unknown>;
          if ("score" in nested && (typeof nested.score === "number" || typeof nested.score === "string")) {
            pushScore(key, nested.score);
          } else {
            for (const [subKey, subVal] of Object.entries(nested)) {
              const num = Number(subVal);
              if (Number.isFinite(num) && num > 0) {
                const clamped = Math.max(1, Math.min(5, num));
                allScores.push(clamped);
                const targetDomain = (
                  key in domainScores ? key : SKILL_TO_DOMAIN_MAP[subKey] || "water_comfort"
                ) as BiomechanicalDomain["key"];
                domainScores[targetDomain].push(clamped);
              }
            }
          }
        }
      }
    }
  }

  const rawAvg =
    allScores.length > 0
      ? allScores.reduce((acc, v) => acc + v, 0) / allScores.length
      : reviewCount > 0
      ? 1.0
      : 0.0;
  const avgSkillScore = Number(rawAvg.toFixed(1));

  const categoryAverages: Record<string, number> = { ...defaultDomainAverages };
  for (const domain of AQA_BIOMECHANICAL_DOMAINS) {
    const arr = domainScores[domain.key];
    if (arr.length > 0) {
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      categoryAverages[domain.key] = Number(avg.toFixed(1));
    } else {
      categoryAverages[domain.key] = avgSkillScore > 0 ? avgSkillScore : 1.0;
    }
  }

  let autoBadge = AQA_SUIVI_BADGES[0];
  if (avgSkillScore > 0) {
    for (const b of AQA_SUIVI_BADGES) {
      if (avgSkillScore >= b.minScore) {
        autoBadge = b;
      }
    }
  }

  const explicitBadge = meta.awardedBadgeKey
    ? AQA_SUIVI_BADGES.find(
        (b) =>
          b.key.toLowerCase() === meta.awardedBadgeKey?.toLowerCase() ||
          b.label.toLowerCase() === meta.awardedBadgeKey?.toLowerCase()
      )
    : undefined;

  const activeBadge = explicitBadge || autoBadge;
  const maxUnlockedOrder = Math.max(autoBadge.order, activeBadge.order);

  const unlockedBadges = AQA_SUIVI_BADGES.filter(
    (b) => b.order <= maxUnlockedOrder || (avgSkillScore > 0 && avgSkillScore >= b.minScore)
  ).map((b) => b.key);
  if (!unlockedBadges.includes("starter")) {
    unlockedBadges.unshift("starter");
  }

  let activeStage =
    AQA_SUIVI_STAGES.find((s) => s.key === activeBadge.stageKey) || AQA_SUIVI_STAGES[0];
  if (!explicitBadge && avgSkillScore > 0) {
    for (const st of AQA_SUIVI_STAGES) {
      if (avgSkillScore >= st.minAvgScore) {
        activeStage = st;
      }
    }
  }

  return {
    avgSkillScore,
    categoryAverages,
    badgeKey: activeBadge.key,
    badgeLabel: activeBadge.labelFr,
    badgeLabelEn: activeBadge.labelEn,
    badgeLabelAr: activeBadge.labelAr,
    badgeAsset: activeBadge.asset,
    stageKey: activeStage.key,
    stageLabel: activeStage.labelFr,
    stageLabelEn: activeStage.labelEn,
    stageLabelAr: activeStage.labelAr,
    stageAsset: activeStage.asset,
    unlockedBadges,
    meta,
  };
}
