import { ImageSourcePropType } from "react-native";
import { Locale } from "../i18n/translations";

export const AQA_IMAGES = {
  coachLogo: require("../../assets/images/coach_logo.png") as ImageSourcePropType,
  defaultAvatar: require("../../assets/images/default_avatar.png") as ImageSourcePropType,
  oceanBg: require("../../assets/images/ocean_bg.jpg") as ImageSourcePropType,
};

export const AQA_BADGE_ASSETS: Record<string, ImageSourcePropType> = {
  "starter.png": require("../../assets/images/badges/starter.png"),
  "beginner.png": require("../../assets/images/badges/beginner.png"),
  "floater.png": require("../../assets/images/badges/floater.png"),
  "crawler.png": require("../../assets/images/badges/crawler.png"),
  "leaf.png": require("../../assets/images/badges/leaf.png"),
  "brasseur.png": require("../../assets/images/badges/brasseur.png"),
  "butterfly.png": require("../../assets/images/badges/butterfly.png"),
  "full_swimmer.png": require("../../assets/images/badges/full_swimmer.png"),
  "dolphin.png": require("../../assets/images/badges/dolphin.png"),
  "dauphin.png": require("../../assets/images/badges/dauphin.png"),
  "shark.png": require("../../assets/images/badges/shark.png"),
  "requin.png": require("../../assets/images/badges/requin.png"),
  "orca.png": require("../../assets/images/badges/orca.png"),
  "whale.png": require("../../assets/images/badges/whale.png"),
  "kraken.png": require("../../assets/images/badges/kraken.png"),
  "mosasaurus.png": require("../../assets/images/badges/mosasaurus.png"),
  "tsunami.png": require("../../assets/images/badges/tsunami.png"),
  "elephant.png": require("../../assets/images/badges/elephant.png"),
  "Crocodile.png": require("../../assets/images/badges/Crocodile.png"),
  "crocodile.png": require("../../assets/images/badges/Crocodile.png"),
};

export interface AqaBadgeDefinition {
  order: number;
  key: string;
  asset: string;
  stageKey: string;
  labelFr: string;
  labelEn: string;
  labelAr: string;
}

export const AQA_OFFICIAL_BADGES: AqaBadgeDefinition[] = [
  {
    order: 1,
    key: "starter",
    asset: "starter.png",
    stageKey: "basics",
    labelFr: "Starter",
    labelEn: "Starter",
    labelAr: "مبتدئ أولي (Starter)",
  },
  {
    order: 2,
    key: "beginner",
    asset: "beginner.png",
    stageKey: "basics",
    labelFr: "Beginner",
    labelEn: "Beginner",
    labelAr: "مبتدئ (Beginner)",
  },
  {
    order: 3,
    key: "floater",
    asset: "floater.png",
    stageKey: "basics",
    labelFr: "Floater",
    labelEn: "Floater",
    labelAr: "الطفو والتوازن (Floater)",
  },
  {
    order: 4,
    key: "crawler",
    asset: "crawler.png",
    stageKey: "crawl",
    labelFr: "Crawler",
    labelEn: "Crawler",
    labelAr: "سباح حر (Crawler)",
  },
  {
    order: 5,
    key: "leaf",
    asset: "leaf.png",
    stageKey: "backstroke",
    labelFr: "Backstroker",
    labelEn: "Backstroker",
    labelAr: "سباح الظهر (Backstroke)",
  },
  {
    order: 6,
    key: "brasseur",
    asset: "brasseur.png",
    stageKey: "breaststroke",
    labelFr: "Brasseur",
    labelEn: "Breaststroker",
    labelAr: "سباح الصدر (Brasseur)",
  },
  {
    order: 7,
    key: "butterfly",
    asset: "butterfly.png",
    stageKey: "butterfly",
    labelFr: "Butterfly",
    labelEn: "Butterfly",
    labelAr: "سباح الفراشة (Butterfly)",
  },
  {
    order: 8,
    key: "full_swimmer",
    asset: "full_swimmer.png",
    stageKey: "elite",
    labelFr: "Full Swimmer (4 Nages)",
    labelEn: "Full Swimmer (4 Strokes)",
    labelAr: "سباح متكامل (4 سباحات)",
  },
  {
    order: 9,
    key: "dolphin",
    asset: "dolphin.png",
    stageKey: "elite",
    labelFr: "Dolphin",
    labelEn: "Dolphin",
    labelAr: "الدلفين (Dolphin)",
  },
  {
    order: 10,
    key: "shark",
    asset: "shark.png",
    stageKey: "elite",
    labelFr: "Shark",
    labelEn: "Shark",
    labelAr: "القرش (Shark)",
  },
  {
    order: 11,
    key: "orca",
    asset: "orca.png",
    stageKey: "elite",
    labelFr: "Orca",
    labelEn: "Orca",
    labelAr: "الأوركا (Orca)",
  },
  {
    order: 12,
    key: "whale",
    asset: "whale.png",
    stageKey: "elite",
    labelFr: "Whale",
    labelEn: "Whale",
    labelAr: "الحوت (Whale)",
  },
  {
    order: 13,
    key: "kraken",
    asset: "kraken.png",
    stageKey: "elite",
    labelFr: "Kraken",
    labelEn: "Kraken",
    labelAr: "الكراكن (Kraken)",
  },
  {
    order: 14,
    key: "mosasaurus",
    asset: "mosasaurus.png",
    stageKey: "elite",
    labelFr: "Mosasaurus",
    labelEn: "Mosasaurus",
    labelAr: "الموزاصور (Mosasaurus)",
  },
  {
    order: 15,
    key: "tsunami",
    asset: "tsunami.png",
    stageKey: "elite",
    labelFr: "Tsunami",
    labelEn: "Tsunami",
    labelAr: "تسونامي (Tsunami)",
  },
];

export interface AqaStageDefinition {
  order: number;
  key: string;
  asset: string;
  labelFr: string;
  labelEn: string;
  labelAr: string;
}

export const AQA_PEDAGOGICAL_STAGES: AqaStageDefinition[] = [
  {
    order: 1,
    key: "basics",
    asset: "elephant.png",
    labelFr: "1. Basics",
    labelEn: "1. Basics",
    labelAr: "1. الأساسيات",
  },
  {
    order: 2,
    key: "crawl",
    asset: "crawler.png",
    labelFr: "2. Crawl",
    labelEn: "2. Front Crawl",
    labelAr: "2. السباحة الحرة",
  },
  {
    order: 3,
    key: "backstroke",
    asset: "leaf.png",
    labelFr: "3. Dos",
    labelEn: "3. Backstroke",
    labelAr: "3. سباحة الظهر",
  },
  {
    order: 4,
    key: "breaststroke",
    asset: "brasseur.png",
    labelFr: "4. Brasse",
    labelEn: "4. Breaststroke",
    labelAr: "4. سباحة الصدر",
  },
  {
    order: 5,
    key: "butterfly",
    asset: "butterfly.png",
    labelFr: "5. Papillon",
    labelEn: "5. Butterfly",
    labelAr: "5. الفراشة",
  },
  {
    order: 6,
    key: "elite",
    asset: "requin.png",
    labelFr: "6. Elite",
    labelEn: "6. Elite",
    labelAr: "6. النخبة",
  },
];

export interface AqaStrokeBarDefinition {
  key: "basics" | "crawl" | "backstroke" | "breaststroke" | "butterfly";
  shortFr: string;
  shortEn: string;
  shortAr: string;
  labelFr: string;
  labelEn: string;
  labelAr: string;
  asset: string;
}

export const AQA_STROKE_BARS: AqaStrokeBarDefinition[] = [
  {
    key: "basics",
    shortFr: "BASICS",
    shortEn: "BASICS",
    shortAr: "الأساسيات",
    labelFr: "1 - Basics (Immersion & Flottaison)",
    labelEn: "1 - Basics (Immersion & Float)",
    labelAr: "1 - الأساسيات (الغمر والطفو)",
    asset: "elephant.png",
  },
  {
    key: "crawl",
    shortFr: "CRAWL",
    shortEn: "CRAWL",
    shortAr: "حرة",
    labelFr: "2 - Crawl (Nage Libre)",
    labelEn: "2 - Crawl (Freestyle)",
    labelAr: "2 - السباحة الحرة (Crawl)",
    asset: "crawler.png",
  },
  {
    key: "backstroke",
    shortFr: "DOS",
    shortEn: "BACK",
    shortAr: "ظهر",
    labelFr: "3 - Backstroke (Dos Crawle)",
    labelEn: "3 - Backstroke",
    labelAr: "3 - سباحة الظهر (Backstroke)",
    asset: "leaf.png",
  },
  {
    key: "breaststroke",
    shortFr: "BRASSE",
    shortEn: "BREAST",
    shortAr: "صدر",
    labelFr: "4 - Breaststroke (Brasse)",
    labelEn: "4 - Breaststroke (Brasse)",
    labelAr: "4 - سباحة الصدر (Brasse)",
    asset: "brasseur.png",
  },
  {
    key: "butterfly",
    shortFr: "PAPILLON",
    shortEn: "FLY",
    shortAr: "فراشة",
    labelFr: "5 - Butterfly (Papillon)",
    labelEn: "5 - Butterfly",
    labelAr: "5 - سباحة الفراشة (Butterfly)",
    asset: "butterfly.png",
  },
];

export function getBadgeLabel(badge: AqaBadgeDefinition, locale: Locale): string {
  if (locale === "ar") return badge.labelAr;
  if (locale === "en") return badge.labelEn;
  return badge.labelFr;
}

export function getStageLabel(stage: AqaStageDefinition, locale: Locale): string {
  if (locale === "ar") return stage.labelAr;
  if (locale === "en") return stage.labelEn;
  return stage.labelFr;
}

export function getStrokeBarLabel(bar: AqaStrokeBarDefinition, locale: Locale): string {
  if (locale === "ar") return bar.labelAr;
  if (locale === "en") return bar.labelEn;
  return bar.labelFr;
}

export function getStrokeBarShortLabel(bar: AqaStrokeBarDefinition, locale: Locale): string {
  if (locale === "ar") return bar.shortAr;
  if (locale === "en") return bar.shortEn;
  return bar.shortFr;
}

export function getBadgeImageSource(assetOrKey?: string | null): ImageSourcePropType {
  if (!assetOrKey) return AQA_BADGE_ASSETS["starter.png"];
  const trimmed = assetOrKey.trim();
  const baseName = trimmed.includes("/") ? trimmed.split("/").pop() ?? trimmed : trimmed;
  if (AQA_BADGE_ASSETS[baseName]) {
    return AQA_BADGE_ASSETS[baseName];
  }
  const pngKey = baseName.endsWith(".png") ? baseName : `${baseName}.png`;
  if (AQA_BADGE_ASSETS[pngKey]) {
    return AQA_BADGE_ASSETS[pngKey];
  }
  const foundBadge = AQA_OFFICIAL_BADGES.find((b) => b.key === baseName.toLowerCase());
  if (foundBadge && AQA_BADGE_ASSETS[foundBadge.asset]) {
    return AQA_BADGE_ASSETS[foundBadge.asset];
  }
  const foundStage = AQA_PEDAGOGICAL_STAGES.find((s) => s.key === baseName.toLowerCase());
  if (foundStage && AQA_BADGE_ASSETS[foundStage.asset]) {
    return AQA_BADGE_ASSETS[foundStage.asset];
  }
  return AQA_BADGE_ASSETS["starter.png"];
}
