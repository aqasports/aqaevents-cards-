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

export type AqaStageKey =
  | "basics"
  | "crawl"
  | "backstroke"
  | "breaststroke"
  | "butterfly"
  | "elite"
  | string;

export interface AqaSuiviStage {
  key: AqaStageKey;
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
  stageKey: AqaStageKey;
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

export type StrokeBarKey =
  | "basics"
  | "crawl"
  | "backstroke"
  | "breaststroke"
  | "butterfly";

export interface SwimmerStrokeBars {
  basics: number;
  crawl: number;
  backstroke: number;
  breaststroke: number;
  butterfly: number;
}

export interface StrokeBarDefinition {
  key: StrokeBarKey;
  order: number;
  labelFr: string;
  labelEn: string;
  labelAr: string;
  techHintFr: string;
  techHintEn: string;
  techHintAr: string;
  eliteHintFr: string;
  eliteHintEn: string;
  eliteHintAr: string;
}

export interface AqaHonorBadgeDefinition {
  key: "swimmer_of_the_month" | "swimmer_of_the_year";
  periodType: "month" | "year";
  label: string;
  labelFr: string;
  labelEn: string;
  labelAr: string;
  asset: string;
  descriptionFr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export interface SuiviReviewMeta {
  awardedBadgeKey: string | null;
  recommendedLevel: string | null;
  chrono25mFreestyle: number | null;
  chrono50mFreestyle: number | null;
  maxDistanceMeters: number | null;
  bars: SwimmerStrokeBars;
  lastTouchedBar: StrokeBarKey;
  sessionVolumeMeters: number | null;
  observation: string | null;
  record50m: number | null;
  recordApnea: number | null;
  weightKg: number | null;
  heightCm: number | null;
  wordFromCoach: string | null;
  honorRequestType: "swimmer_of_the_month" | "swimmer_of_the_year" | null;
}

export interface SwimmerCumulativeBilan {
  bars: SwimmerStrokeBars;
  lastTouchedBar: StrokeBarKey;
  totalDistanceMeters: number;
  lastSessionVolumeMeters: number | null;
  record50m: number | null;
  recordApnea: number | null;
  weightKg: number | null;
  heightCm: number | null;
  wordFromCoach: string | null;
  latestObservation: string | null;
}

export interface SwimmerSuiviProgressionResult {
  avgSkillScore: number;
  categoryAverages: Record<string, number>;
  bars: SwimmerStrokeBars;
  lastTouchedBar: StrokeBarKey;
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

export const AQA_STROKE_BAR_DEFS: StrokeBarDefinition[] = [
  {
    key: "basics",
    order: 1,
    labelFr: "1. Basics",
    labelEn: "1. Basics",
    labelAr: "1. الأساسيات (Basics)",
    techHintFr: "0-100% : Immersion, respiration aquatique, flottaison & glisse",
    techHintEn: "0-100%: Immersion, breathing, buoyancy & streamline glide",
    techHintAr: "0-100%: الغمر، التنفس المائي، الطفو والانزلاق",
    eliteHintFr: "100-200% : Maitrise subaquatique, gainage & hydrodynamisme elite",
    eliteHintEn: "100-200%: Underwater control, core stability & elite streamline",
    eliteHintAr: "100-200%: التحكم تحت الماء، ثبات الجذع والانسيابية العالية",
  },
  {
    key: "crawl",
    order: 2,
    labelFr: "2. Crawl",
    labelEn: "2. Crawl",
    labelAr: "2. السباحة الحرة (Crawl)",
    techHintFr: "0-100% : Alignement, battements, prise d'appui & respiration bilaterale",
    techHintEn: "0-100%: Body alignment, flutter kick, catch & bilateral breathing",
    techHintAr: "0-100%: الاستقامة، ضربات الأرجل، السحب والتنفس الجانبي",
    eliteHintFr: "100-200% : Endurance aerobie, vitesse sprint, force & virages culbutes",
    eliteHintEn: "100-200%: Endurance, sprint speed, strength & flip turns",
    eliteHintAr: "100-200%: التحمل، السرعة، القوة ودوران الشقلبة",
  },
  {
    key: "backstroke",
    order: 3,
    labelFr: "3. Back (Dos)",
    labelEn: "3. Back",
    labelAr: "3. سباحة الظهر (Back)",
    techHintFr: "0-100% : Posture dorsale, battements continus & roulis d'epaules",
    techHintEn: "0-100%: Dorsal posture, continuous kick & shoulder roll",
    techHintAr: "0-100%: وضعية الظهر، ضربات الأرجل المستمرة ودوران الكتفين",
    eliteHintFr: "100-200% : Coulee dorsale, cadence de course, vitesse & endurance",
    eliteHintEn: "100-200%: Underwater dolphin breakout, race tempo, speed & endurance",
    eliteHintAr: "100-200%: الانزلاق الخلفي، إيقاع السباق، السرعة والتحمل",
  },
  {
    key: "breaststroke",
    order: 4,
    labelFr: "4. Breast (Brasse)",
    labelEn: "4. Breast",
    labelAr: "4. سباحة الصدر (Breast)",
    techHintFr: "0-100% : Ciseau symetrique, traction simultanee & synchronisation glisse",
    techHintEn: "0-100%: Symmetrical whip kick, pull & glide coordination",
    techHintAr: "0-100%: ضربة الصدر المتماثلة، السحب والتناسق مع الانزلاق",
    eliteHintFr: "100-200% : Puissance de traction, coulee subaquatique & vitesse",
    eliteHintEn: "100-200%: Pull power, underwater pullout, strength & speed",
    eliteHintAr: "100-200%: قوة السحب، الشدة تحت الماء والسرعة التنافسية",
  },
  {
    key: "butterfly",
    order: 5,
    labelFr: "5. Butterfly (Papillon)",
    labelEn: "5. Butterfly",
    labelAr: "5. سباحة الفراشة (Butterfly)",
    techHintFr: "0-100% : Ondulation du bassin, retour aerien des bras & rythme 2 temps",
    techHintEn: "0-100%: Hip undulation, dual arm recovery & 2-beat rhythm",
    techHintAr: "0-100%: تموج الحوض، رجوع الذراعين المتزامن وإيقاع الضربتين",
    eliteHintFr: "100-200% : Puissance explosive, endurance papillon, vitesse & departs",
    eliteHintEn: "100-200%: Explosive power, butterfly endurance, speed & race starts",
    eliteHintAr: "100-200%: القوة الانفجارية، تحمل الفراشة، السرعة والانطلاقات",
  },
];

export const AQA_HONOR_BADGES: AqaHonorBadgeDefinition[] = [
  {
    key: "swimmer_of_the_month",
    periodType: "month",
    label: "Swimmer of the Month",
    labelFr: "Swimmer of the Month (Nageur du Mois)",
    labelEn: "Swimmer of the Month",
    labelAr: "سباح الشهر (Swimmer of the Month)",
    asset: "full_swimmer.png",
    descriptionFr:
      "Nomination officielle envoyee a l'ERP AQA pour elire le Nageur du Mois parmi les propositions des coachs.",
    descriptionEn:
      "Official nomination sent to AQA ERP to elect the Swimmer of the Month among coach proposals.",
    descriptionAr:
      "ترشيح رسمي يرسل إلى نظام AQA ERP لاختيار سباح الشهر بعد مقارنة مقترحات المدربين.",
  },
  {
    key: "swimmer_of_the_year",
    periodType: "year",
    label: "Swimmer of the Year",
    labelFr: "Swimmer of the Year (Nageur de l'Annee)",
    labelEn: "Swimmer of the Year",
    labelAr: "سباح السنة (Swimmer of the Year)",
    asset: "tsunami.png",
    descriptionFr:
      "Nomination officielle envoyee a l'ERP AQA pour elire le Nageur de l'Annee parmi les propositions des coachs.",
    descriptionEn:
      "Official nomination sent to AQA ERP to elect the Swimmer of the Year among coach proposals.",
    descriptionAr:
      "ترشيح رسمي يرسل إلى نظام AQA ERP لاختيار سباح السنة بعد مقارنة مقترحات المدربين.",
  },
];

export const AQA_SUIVI_STAGES: AqaSuiviStage[] = [
  {
    key: "basics",
    order: 1,
    label: "1. Basics",
    labelFr: "Palier 1 - Bases (Immersion & Flottaison)",
    labelEn: "Stage 1 - Basics (Immersion & Buoyancy)",
    labelAr: "المرحلة 1 - الأساسيات (التأقلم والطفو)",
    asset: "elephant.png",
    assetName: "elephant.png",
    descriptionFr:
      "Adaptation aquatique, immersion complete du visage, equilibre et flottaison autonome.",
    descriptionEn:
      "Aquatic adaptation, full facial immersion, balance, and autonomous buoyancy.",
    descriptionAr:
      "التأقلم مع المحيط المائي، غمر الوجه بالكامل، التوازن والطفو المستقل.",
    minAvgScore: 1.0,
  },
  {
    key: "crawl",
    order: 2,
    label: "2. Crawl",
    labelFr: "Palier 2 - Crawl (Propulsion & Respiration)",
    labelEn: "Stage 2 - Crawl (Propulsion & Breathing)",
    labelAr: "المرحلة 2 - السباحة الحرة كراول (الدفع والتنفس)",
    asset: "Crocodile.png",
    assetName: "Crocodile.png",
    descriptionFr:
      "Alignement horizontal, battements continus et coordination du crawl avec respiration laterale.",
    descriptionEn:
      "Horizontal streamline, continuous flutter kick, and front crawl with bilateral breathing.",
    descriptionAr:
      "الاستقامة الأفقية، ضربات الأرجل المستمرة وتناسق السباحة الحرة مع التنفس الجانبي.",
    minAvgScore: 1.75,
  },
  {
    key: "backstroke",
    order: 3,
    label: "3. Backstroke",
    labelFr: "Palier 3 - Dos Crole (Equilibre & Battements)",
    labelEn: "Stage 3 - Backstroke (Balance & Dorsal Flutter)",
    labelAr: "المرحلة 3 - سباحة الظهر (التوازن وضربات الظهر)",
    asset: "leaf.png",
    assetName: "leaf.png",
    descriptionFr:
      "Position dorsale haute, battements de dos continus, roulis des epaules et retour de bras tendu.",
    descriptionEn:
      "High backstroke body position, continuous kick, shoulder rotation, and straight arm recovery.",
    descriptionAr:
      "وضعية الظهر المرتفعة، ضربات أرجل الظهر، دوران الكتفين وتناسق حركة الذراعين.",
    minAvgScore: 2.0,
  },
  {
    key: "breaststroke",
    order: 4,
    label: "4. Breaststroke",
    labelFr: "Palier 4 - Brasse (Ciseau Symetrique & Coordination)",
    labelEn: "Stage 4 - Breaststroke (Whip Kick & Timing)",
    labelAr: "المرحلة 4 - سباحة الصدر (ضربة الأرجل والتناسق)",
    asset: "brasseur.png",
    assetName: "brasseur.png",
    descriptionFr:
      "Maitrise du ciseau symetrique et synchronisation fluide : traction - respiration - ciseau - glisse.",
    descriptionEn:
      "Symmetrical whip kick mastery and pull-breathe-kick-glide stroke timing.",
    descriptionAr:
      "إتقان ضربة الصدر المتماثلة والتناسق الانسيابي: شد الذراعين - التنفس - ضربة الأرجل - الانزلاق.",
    minAvgScore: 2.25,
  },
  {
    key: "butterfly",
    order: 5,
    label: "5. Butterfly",
    labelFr: "Palier 5 - Papillon (Ondulation & Puissance)",
    labelEn: "Stage 5 - Butterfly (Dolphin Kick & Power)",
    labelAr: "المرحلة 5 - سباحة الفراشة (التموج والقوة)",
    asset: "butterfly.png",
    assetName: "butterfly.png",
    descriptionFr:
      "Ondulation fluide initiee par le bassin, retour aerien rasant des deux bras et rythme 2 temps.",
    descriptionEn:
      "Hip-driven dolphin kick, low forward dual arm recovery, and rhythmic 2-kick stroke cycle.",
    descriptionAr:
      "التموج الانسيابي المنطلق من الحوض، الرجوع الهوائي المتزامن للذراعين وإيقاع الضربتين.",
    minAvgScore: 2.5,
  },
  {
    key: "elite",
    order: 6,
    label: "6. Elite",
    labelFr: "Palier 6 - Elite (4 Nages, Vitesse & Competition)",
    labelEn: "Stage 6 - Elite (4 Strokes, Speed & Competition)",
    labelAr: "المرحلة 6 - النخبة (السباحات الأربع، السرعة والمنافسة)",
    asset: "requin.png",
    assetName: "requin.png",
    descriptionFr:
      "Maitrise complete des 4 nages, virages culbutes, departs plonges, vitesse explosive et endurance.",
    descriptionEn:
      "Full 4-stroke competitive mastery, flip turns, dive starts, explosive velocity, and race endurance.",
    descriptionAr:
      "الإتقان الكامل للسباحات الأربع، دوران الشقلبة، الانطلاق، السرعة القصوى والتحمل التنافسي.",
    minAvgScore: 2.8,
  },
];

export const AQA_SUIVI_BADGES: SwimProgressionBadge[] = [
  {
    key: "starter",
    order: 1,
    stageKey: "basics",
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
    stageKey: "basics",
    label: "Beginner",
    labelFr: "Beginner",
    labelEn: "Beginner",
    labelAr: "مبتدئ مائي",
    asset: "beginner.png",
    assetName: "beginner.png",
    minScore: 1.25,
    minScoreAvg: 1.25,
    criterionFr: "Immersion complete du visage et expiration subaquatique active (bulles)",
    criterionEn: "Full face immersion and active underwater exhalation",
    criterionAr: "غمر الوجه بالكامل والزفير النشط تحت الماء",
    description: "Familiarisation, respiration de base et equilibre assiste",
  },
  {
    key: "floater",
    order: 3,
    stageKey: "basics",
    label: "Floater",
    labelFr: "Floater",
    labelEn: "Floater",
    labelAr: "الطفو المتوازن",
    asset: "floater.png",
    assetName: "floater.png",
    minScore: 1.5,
    minScoreAvg: 1.5,
    criterionFr: "Autonomie en flottaison ventrale et dorsale (etoile de mer 10s)",
    criterionEn: "Autonomous ventral and dorsal star float for 10 seconds",
    criterionAr: "الطفو البطني والظهري المستقل لمدة 10 ثوان",
    description: "Autonomie en flottaison ventrale et dorsale sans appui",
  },
  {
    key: "crawler",
    order: 4,
    stageKey: "crawl",
    label: "Crawler",
    labelFr: "Crawler",
    labelEn: "Crawler",
    labelAr: "سباح الكراول",
    asset: "crawler.png",
    assetName: "crawler.png",
    minScore: 1.75,
    minScoreAvg: 1.75,
    criterionFr: "Coordination complete du crawl sur 25m avec respiration laterale",
    criterionEn: "Complete 25m front crawl coordination with lateral breathing",
    criterionAr: "تناسق كامل للسباحة الحرة لمسافة 25م مع تنفس جانبي",
    description: "Coordination complete du crawl avec respiration laterale",
  },
  {
    key: "leaf",
    order: 5,
    stageKey: "backstroke",
    label: "Leaf",
    labelFr: "Leaf (Maitrise du Dos)",
    labelEn: "Leaf (Backstroke Master)",
    labelAr: "ليف (إتقان سباحة الظهر)",
    asset: "leaf.png",
    assetName: "leaf.png",
    minScore: 2.0,
    minScoreAvg: 2.0,
    criterionFr: "Coulee dorsale hydrodynamique et battements de dos continus sur 25m",
    criterionEn: "Streamlined back glide and continuous backstroke flutter kick over 25m",
    criterionAr: "الانزلاق الظهري الانسيابي وضربات أرجل الظهر المتواصلة لمسافة 25م",
    description: "Maitrise de la position dorsale et propulsion reguliere en dos",
  },
  {
    key: "brasseur",
    order: 6,
    stageKey: "breaststroke",
    label: "Brasseur",
    labelFr: "Brasseur",
    labelEn: "Breaststroker",
    labelAr: "سباح الصدر",
    asset: "brasseur.png",
    assetName: "brasseur.png",
    minScore: 2.25,
    minScoreAvg: 2.25,
    criterionFr: "Maitrise du ciseau symetrique et de la synchronisation de brasse sur 25m",
    criterionEn: "Symmetrical whip kick and breaststroke timing over 25m",
    criterionAr: "إتقان ضربة الصدر المتماثلة والتوقيت الحركي لمسافة 25م",
    description: "Maitrise du ciseau et de la synchronisation de brasse",
  },
  {
    key: "butterfly",
    order: 7,
    stageKey: "butterfly",
    label: "Butterfly",
    labelFr: "Butterfly",
    labelEn: "Butterfly",
    labelAr: "سباح الفراشة",
    asset: "butterfly.png",
    assetName: "butterfly.png",
    minScore: 2.5,
    minScoreAvg: 2.5,
    criterionFr: "Propulsion papillon coordonnee (2 ondulations par cycle) sur 15m a 25m",
    criterionEn: "Coordinated butterfly propulsion (2 kicks per cycle) over 15m to 25m",
    criterionAr: "سباحة الفراشة المتناسقة (ضربتان لكل دورة ذراعين) لمسافة 15م إلى 25م",
    description: "Propulsion papillon, puissance et rythme subaquatique",
  },
  {
    key: "full_swimmer",
    order: 8,
    stageKey: "elite",
    label: "Full Swimmer AQA Pro",
    labelFr: "Full Swimmer AQA Pro",
    labelEn: "Full Swimmer AQA Pro",
    labelAr: "السباح الكامل AQA Pro",
    asset: "full_swimmer.png",
    assetName: "full_swimmer.png",
    minScore: 2.8,
    minScoreAvg: 2.8,
    criterionFr: "Maitrise integrale des 4 nages et autonomie complete sur 100m 4 nages",
    criterionEn: "Complete 4-stroke mastery and full autonomy over 100m individual medley",
    criterionAr: "الإتقان الشامل للسباحات الأربع والاستقلالية التامة في 100م متنوعة",
    description: "Maitrise integrale des 4 nages et autonomie complete",
  },
  {
    key: "dolphin",
    order: 9,
    stageKey: "elite",
    label: "Dolphin",
    labelFr: "Dolphin",
    labelEn: "Dolphin",
    labelAr: "الدلفين",
    asset: "dolphin.png",
    assetName: "dolphin.png",
    minScore: 3.1,
    minScoreAvg: 3.1,
    criterionFr: "Glisse hydrodynamique, virages et coulées d'ondulation efficaces sur 25m+",
    criterionEn: "Hydrodynamic glide, turns, and effective dolphin kick breakouts over 25m+",
    criterionAr: "انزلاق هيدروديناميكي، دورانات وتموجات دلفينية فعالة لمسافة 25م+",
    description: "Glisse hydrodynamique et puissance de coulee",
  },
  {
    key: "shark",
    order: 10,
    stageKey: "elite",
    label: "Shark",
    labelFr: "Shark",
    labelEn: "Shark",
    labelAr: "القرش",
    asset: "shark.png",
    assetName: "shark.png",
    minScore: 3.4,
    minScoreAvg: 3.4,
    criterionFr: "Maitrise de 3 nages codifiees sur 50m avec depart plonge et virage",
    criterionEn: "Mastery of 3 competitive strokes over 50m with dive start and turn",
    criterionAr: "إتقان 3 سباحات قانونية لمسافة 50م مع انطلاقة الغطس والدوران",
    description: "Perfectionnement multi-nages, virages culbutes et vitesse",
  },
  {
    key: "orca",
    order: 11,
    stageKey: "elite",
    label: "Orca",
    labelFr: "Orca",
    labelEn: "Orca",
    labelAr: "الأوركا",
    asset: "orca.png",
    assetName: "orca.png",
    minScore: 3.7,
    minScoreAvg: 3.7,
    criterionFr: "Enchainement 100m 4 nages avec virages reglementaires et rythme soutenu",
    criterionEn: "Continuous 100m individual medley with legal stroke transitions and sustained pace",
    criterionAr: "إتمام 100م متنوعة فردي متواصلة مع التحولات القانونية وإيقاع قوي",
    description: "Excellence technique, endurance 4 nages et chrono",
  },
  {
    key: "whale",
    order: 12,
    stageKey: "elite",
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
    order: 13,
    stageKey: "elite",
    label: "Kraken Power",
    labelFr: "Kraken Power",
    labelEn: "Kraken Power",
    labelAr: "قوة الكراكن",
    asset: "kraken.png",
    assetName: "kraken.png",
    minScore: 4.3,
    minScoreAvg: 4.3,
    criterionFr: "Puissance explosive, coulee subaquatique 12m+ et sprint 25m haute vitesse",
    criterionEn: "Explosive power, 12m+ underwater breakout, and high-velocity 25m sprint",
    criterionAr: "قوة دفع عالية، انزلاق تحت الماء 12م+ وسرعة قصوى في 25م",
    description: "Puissance propulsive, coulees longues et sprint explosif",
  },
  {
    key: "mosasaurus",
    order: 14,
    stageKey: "elite",
    label: "Mosasaurus Elite",
    labelFr: "Mosasaurus Elite",
    labelEn: "Mosasaurus Elite",
    labelAr: "نخبة الموزاصور",
    asset: "mosasaurus.png",
    assetName: "mosasaurus.png",
    minScore: 4.6,
    minScoreAvg: 4.6,
    criterionFr: "Perfectionnement elite 4 nages, virages culbutes rapides et rythme de course",
    criterionEn: "Elite 4-stroke refinement, high-speed flip turns, and race pacing",
    criterionAr: "إتقان النخبة للسباحات الأربع، دوران سريع وتنظيم إيقاع السباق",
    description: "Perfectionnement elite 4 nages et virages haute vitesse",
  },
  {
    key: "tsunami",
    order: 15,
    stageKey: "elite",
    label: "Tsunami Master",
    labelFr: "Tsunami Master",
    labelEn: "Tsunami Master",
    labelAr: "سيد التسونامي",
    asset: "tsunami.png",
    assetName: "tsunami.png",
    minScore: 4.85,
    minScoreAvg: 4.85,
    criterionFr: "Performance chronometrique avancee sur 50m crawl et 200m 4 nages",
    criterionEn: "Advanced timed performance on 50m freestyle and 200m individual medley",
    criterionAr: "أداء زمني متقدم في سباق 50م حرة و200م متنوعة",
    description: "Performance chronometrique avancee et maitrise de course",
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

function clampBarPct(val: unknown, fallback = 0): number {
  if (val === null || val === undefined || val === "") return fallback;
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(200, Math.round(num)));
}

function normalizeStrokeBarKey(val: unknown): StrokeBarKey {
  const s = typeof val === "string" ? val.trim().toLowerCase() : "";
  if (s === "crawl" || s === "freestyle") return "crawl";
  if (s === "backstroke" || s === "back" || s === "dos") return "backstroke";
  if (s === "breaststroke" || s === "breast" || s === "brasse") return "breaststroke";
  if (s === "butterfly" || s === "butterfly_starts" || s === "papillon") return "butterfly";
  return "basics";
}

function barPctToFiveScale(pct: number): number {
  const clamped = Math.max(0, Math.min(200, pct));
  return Number((1.0 + (clamped / 200.0) * 4.0).toFixed(1));
}

function fiveScaleToBarPct(score: number): number {
  const clamped = Math.max(1, Math.min(5, score));
  return Math.round(((clamped - 1.0) / 4.0) * 200);
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

  const defaultBars: SwimmerStrokeBars = {
    basics: 0,
    crawl: 0,
    backstroke: 0,
    breaststroke: 0,
    butterfly: 0,
  };

  const meta: SuiviReviewMeta = {
    awardedBadgeKey: null,
    recommendedLevel: null,
    chrono25mFreestyle: null,
    chrono50mFreestyle: null,
    maxDistanceMeters: null,
    bars: { ...defaultBars },
    lastTouchedBar: "basics",
    sessionVolumeMeters: null,
    observation: null,
    record50m: null,
    recordApnea: null,
    weightKg: null,
    heightCm: null,
    wordFromCoach: null,
    honorRequestType: null,
  };

  let parsed: unknown = latestSkillsJson;
  if (typeof latestSkillsJson === "string" && latestSkillsJson.trim().length > 0) {
    try {
      parsed = JSON.parse(latestSkillsJson);
    } catch {
      parsed = null;
    }
  }

  let hasExplicitBars = false;

  const parseBarsObject = (rawBars: Record<string, unknown>) => {
    hasExplicitBars = true;
    meta.bars = {
      basics: clampBarPct(rawBars.basics ?? rawBars.water_comfort, 0),
      crawl: clampBarPct(rawBars.crawl ?? rawBars.freestyle, 0),
      backstroke: clampBarPct(rawBars.backstroke ?? rawBars.back, 0),
      breaststroke: clampBarPct(rawBars.breaststroke ?? rawBars.breast, 0),
      butterfly: clampBarPct(rawBars.butterfly ?? rawBars.butterfly_starts, 0),
    };
  };

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

    if (obj.bars && typeof obj.bars === "object" && !Array.isArray(obj.bars)) {
      parseBarsObject(obj.bars as Record<string, unknown>);
    }
    if (typeof obj.lastTouchedBar === "string") {
      meta.lastTouchedBar = normalizeStrokeBarKey(obj.lastTouchedBar);
    }

    if (obj._meta && typeof obj._meta === "object") {
      const m = obj._meta as Record<string, unknown>;
      if (m.bars && typeof m.bars === "object" && !Array.isArray(m.bars)) {
        parseBarsObject(m.bars as Record<string, unknown>);
      }
      if (typeof m.lastTouchedBar === "string") {
        meta.lastTouchedBar = normalizeStrokeBarKey(m.lastTouchedBar);
      }
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
        m.chrono50mFreestyle ?? m.record50m ?? m.time50mSec ?? m.time_50m_free
      );
      meta.maxDistanceMeters = toFiniteNumberOrNull(
        m.maxDistanceMeters ?? m.sessionVolumeMeters ?? m.maxDistanceM ?? m.continuous_distance
      );
      meta.sessionVolumeMeters = toFiniteNumberOrNull(
        m.sessionVolumeMeters ?? m.volume ?? m.maxDistanceMeters
      );
      meta.record50m = toFiniteNumberOrNull(
        m.record50m ?? m.chrono50mFreestyle ?? m.time50mSec
      );
      meta.recordApnea = toFiniteNumberOrNull(m.recordApnea ?? m.apneaRecord);
      meta.weightKg = toFiniteNumberOrNull(m.weightKg ?? m.weight);
      meta.heightCm = toFiniteNumberOrNull(m.heightCm ?? m.tall ?? m.height);
      if (typeof m.observation === "string" && m.observation.trim().length > 0) {
        meta.observation = m.observation.trim();
      }
      if (typeof m.wordFromCoach === "string" && m.wordFromCoach.trim().length > 0) {
        meta.wordFromCoach = m.wordFromCoach.trim();
      }
      if (
        m.honorRequestType === "swimmer_of_the_month" ||
        m.honorRequestType === "swimmer_of_the_year"
      ) {
        meta.honorRequestType = m.honorRequestType;
      }
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
        if (
          key === "_meta" ||
          key === "skills" ||
          key === "metrics" ||
          key === "bars" ||
          key === "lastTouchedBar"
        ) {
          continue;
        }
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

  const categoryAverages: Record<string, number> = { ...defaultDomainAverages };
  let avgSkillScore = 1.0;

  if (hasExplicitBars) {
    categoryAverages.water_comfort = barPctToFiveScale(meta.bars.basics);
    categoryAverages.freestyle = barPctToFiveScale(meta.bars.crawl);
    categoryAverages.backstroke = barPctToFiveScale(meta.bars.backstroke);
    categoryAverages.breaststroke = barPctToFiveScale(meta.bars.breaststroke);
    categoryAverages.butterfly_starts = barPctToFiveScale(meta.bars.butterfly);

    const barValues = [
      meta.bars.basics,
      meta.bars.crawl,
      meta.bars.backstroke,
      meta.bars.breaststroke,
      meta.bars.butterfly,
    ];
    const activeVals = barValues.filter((v) => v > 0);
    const meanPct =
      activeVals.length > 0
        ? activeVals.reduce((a, b) => a + b, 0) / 5.0
        : 0;
    avgSkillScore = barPctToFiveScale(meanPct);
  } else {
    const rawAvg =
      allScores.length > 0
        ? allScores.reduce((acc, v) => acc + v, 0) / allScores.length
        : reviewCount > 0
        ? 1.0
        : 0.0;
    avgSkillScore = Number(rawAvg.toFixed(1));

    for (const domain of AQA_BIOMECHANICAL_DOMAINS) {
      const arr = domainScores[domain.key];
      if (arr.length > 0) {
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        categoryAverages[domain.key] = Number(avg.toFixed(1));
      } else {
        categoryAverages[domain.key] = avgSkillScore > 0 ? avgSkillScore : 1.0;
      }
    }

    if (allScores.length > 0) {
      meta.bars = {
        basics: fiveScaleToBarPct(categoryAverages.water_comfort),
        crawl: fiveScaleToBarPct(categoryAverages.freestyle),
        backstroke: fiveScaleToBarPct(categoryAverages.backstroke),
        breaststroke: fiveScaleToBarPct(categoryAverages.breaststroke),
        butterfly: fiveScaleToBarPct(categoryAverages.butterfly_starts),
      };
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

  const explicitHonor = meta.awardedBadgeKey
    ? AQA_HONOR_BADGES.find(
        (h) => h.key.toLowerCase() === meta.awardedBadgeKey?.toLowerCase()
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

  if (hasExplicitBars) {
    const b = meta.bars;
    if (
      b.basics > 100 ||
      b.crawl > 100 ||
      b.backstroke > 100 ||
      b.breaststroke > 100 ||
      b.butterfly > 100
    ) {
      activeStage = AQA_SUIVI_STAGES[5]; // Elite
    } else if (b.butterfly > 0) {
      activeStage = AQA_SUIVI_STAGES[4]; // Butterfly
    } else if (b.breaststroke > 0) {
      activeStage = AQA_SUIVI_STAGES[3]; // Breaststroke
    } else if (b.backstroke > 0) {
      activeStage = AQA_SUIVI_STAGES[2]; // Backstroke
    } else if (b.crawl > 0) {
      activeStage = AQA_SUIVI_STAGES[1]; // Crawl
    } else {
      activeStage = AQA_SUIVI_STAGES[0]; // Basics
    }
  } else if (!explicitBadge && avgSkillScore > 0) {
    for (const st of AQA_SUIVI_STAGES) {
      if (avgSkillScore >= st.minAvgScore) {
        activeStage = st;
      }
    }
  }

  return {
    avgSkillScore,
    categoryAverages,
    bars: meta.bars,
    lastTouchedBar: meta.lastTouchedBar,
    badgeKey: explicitHonor ? explicitHonor.key : activeBadge.key,
    badgeLabel: explicitHonor ? explicitHonor.labelFr : activeBadge.labelFr,
    badgeLabelEn: explicitHonor ? explicitHonor.labelEn : activeBadge.labelEn,
    badgeLabelAr: explicitHonor ? explicitHonor.labelAr : activeBadge.labelAr,
    badgeAsset: explicitHonor ? explicitHonor.asset : activeBadge.asset,
    stageKey: activeStage.key,
    stageLabel: activeStage.labelFr,
    stageLabelEn: activeStage.labelEn,
    stageLabelAr: activeStage.labelAr,
    stageAsset: activeStage.asset,
    unlockedBadges,
    meta,
  };
}

/**
 * Aggregates cumulative volume (totalDistanceMeters) and persistent swimmer records/physical data
 * across all reviews (ordered newest first).
 */
export function aggregateSwimmerCumulativeBilan(
  reviewsNewestFirst: Array<{
    skills?: unknown;
    metrics?: unknown;
    strengths?: string | null;
  }>
): SwimmerCumulativeBilan {
  let totalDistanceMeters = 0;
  let lastSessionVolumeMeters: number | null = null;
  let record50m: number | null = null;
  let recordApnea: number | null = null;
  let weightKg: number | null = null;
  let heightCm: number | null = null;
  let wordFromCoach: string | null = null;
  let latestObservation: string | null = null;

  let latestBars: SwimmerStrokeBars = {
    basics: 0,
    crawl: 0,
    backstroke: 0,
    breaststroke: 0,
    butterfly: 0,
  };
  let latestLastTouchedBar: StrokeBarKey = "basics";
  let barsFound = false;

  for (let i = 0; i < reviewsNewestFirst.length; i++) {
    const rev = reviewsNewestFirst[i];
    const prog = computeSwimmerSuiviProgression(rev.skills as string | Record<string, unknown> | null, 1);

    if (!barsFound && (i === 0 || Object.values(prog.bars).some((v) => v > 0))) {
      latestBars = { ...prog.bars };
      latestLastTouchedBar = prog.lastTouchedBar;
      if (Object.values(prog.bars).some((v) => v > 0)) {
        barsFound = true;
      }
    }

    const vol = prog.meta.sessionVolumeMeters;
    if (vol && vol > 0) {
      totalDistanceMeters += Math.round(vol);
      if (lastSessionVolumeMeters === null) {
        lastSessionVolumeMeters = Math.round(vol);
      }
    }

    if (record50m === null && prog.meta.record50m !== null) {
      record50m = prog.meta.record50m;
    }
    if (recordApnea === null && prog.meta.recordApnea !== null) {
      recordApnea = prog.meta.recordApnea;
    }
    if (weightKg === null && prog.meta.weightKg !== null) {
      weightKg = prog.meta.weightKg;
    }
    if (heightCm === null && prog.meta.heightCm !== null) {
      heightCm = prog.meta.heightCm;
    }
    if (wordFromCoach === null && prog.meta.wordFromCoach !== null) {
      wordFromCoach = prog.meta.wordFromCoach;
    }
    if (latestObservation === null) {
      latestObservation = prog.meta.observation || rev.strengths || null;
    }
  }

  return {
    bars: latestBars,
    lastTouchedBar: latestLastTouchedBar,
    totalDistanceMeters,
    lastSessionVolumeMeters,
    record50m,
    recordApnea,
    weightKg,
    heightCm,
    wordFromCoach,
    latestObservation,
  };
}
