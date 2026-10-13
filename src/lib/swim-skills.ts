export interface SkillItem {
  key: string;
  label: string;
  description?: string;
}

export interface MetricItem {
  key: string;
  label: string;
  unit: string;
}

export interface CategorySkillCatalog {
  skills: SkillItem[];
  metrics: MetricItem[];
}

export const SWIM_SKILLS_CATALOG_V1: Record<string, CategorySkillCatalog> = {
  enfants: {
    skills: [
      { key: "water_confidence", label: "Aisance aquatique et equilibre" },
      { key: "face_immersion", label: "Immersion du visage" },
      { key: "underwater_exhale", label: "Expiration subaquatique continue" },
      { key: "ventral_float", label: "Flottaison ventrale (etoile de mer)" },
      { key: "dorsal_float", label: "Flottaison dorsale" },
      { key: "ventral_glide", label: "Coulee ventrale avec propulsion" },
      { key: "flutter_kick", label: "Battement de jambes efficace" },
      { key: "freestyle_coord", label: "Coordination bras / respiration crawl" },
      { key: "backstroke_arms", label: "Propulsion dos crawle" },
      { key: "breaststroke_kick", label: "Ciseau de brasse" },
      { key: "safe_entry", label: "Saut et entree securisee dans l'eau" },
      { key: "safety_turn", label: "Retournement de securite et retour au bord" },
    ],
    metrics: [
      { key: "continuous_distance", label: "Distance continue", unit: "m" },
    ],
  },
  homme: {
    skills: [
      { key: "lateral_breathing", label: "Respiration laterale crawl bilatérale" },
      { key: "freestyle_catch", label: "Prise d'appui et traction crawl" },
      { key: "freestyle_kick", label: "Battement stabilise et horizontalite" },
      { key: "backstroke_roll", label: "Roulis du corps en dos crawle" },
      { key: "breaststroke_glide", label: "Glisse et synchronisation brasse" },
      { key: "butterfly_undulation", label: "Ondulation papillon" },
      { key: "tumble_turn", label: "Virage culbute crawl" },
      { key: "dive_start", label: "Plongeon depart plot" },
      { key: "aerobic_endurance", label: "Endurance aerobie (series longues)" },
    ],
    metrics: [
      { key: "time_50m_free", label: "Chrono 50m Crawl", unit: "s" },
      { key: "time_100m_free", label: "Chrono 100m Crawl", unit: "s" },
      { key: "continuous_distance", label: "Distance maximale continue", unit: "m" },
    ],
  },
  femme: {
    skills: [
      { key: "lateral_breathing", label: "Respiration laterale crawl bilatérale" },
      { key: "freestyle_catch", label: "Prise d'appui et traction crawl" },
      { key: "freestyle_kick", label: "Battement stabilise et horizontalite" },
      { key: "backstroke_roll", label: "Roulis du corps en dos crawle" },
      { key: "breaststroke_glide", label: "Glisse et synchronisation brasse" },
      { key: "butterfly_undulation", label: "Ondulation papillon" },
      { key: "tumble_turn", label: "Virage culbute crawl" },
      { key: "dive_start", label: "Plongeon depart plot" },
      { key: "aerobic_endurance", label: "Endurance aerobie (series longues)" },
    ],
    metrics: [
      { key: "time_50m_free", label: "Chrono 50m Crawl", unit: "s" },
      { key: "time_100m_free", label: "Chrono 100m Crawl", unit: "s" },
      { key: "continuous_distance", label: "Distance maximale continue", unit: "m" },
    ],
  },
  apnea: {
    skills: [
      { key: "relaxation_technique", label: "Relaxation pre-apnee et ventilation" },
      { key: "breathe_up", label: "Inspiration maximale controlee" },
      { key: "static_apnea", label: "Apnee statique (gestion du reflexe inspiratoire)" },
      { key: "dynamic_apnea", label: "Apnee dynamique (palmage lent et fluide)" },
      { key: "duck_dive", label: "Canard vertical et compensation" },
      { key: "equalization", label: "Compensation Frenzel / Valsalva" },
      { key: "buddy_safety", label: "Securite binome et protocole de secours" },
    ],
    metrics: [
      { key: "static_time", label: "Duree apnee statique", unit: "s" },
      { key: "dynamic_distance", label: "Distance apnee dynamique", unit: "m" },
    ],
  },
};

export const SKILL_SCORE_LABELS: Record<number, string> = {
  1: "Non acquis",
  2: "En cours d'acquisition",
  3: "Acquis",
  4: "Maitrise",
};

export function getSkillsForCategory(category: string): CategorySkillCatalog {
  const normCat = category.toLowerCase().trim();
  return (
    SWIM_SKILLS_CATALOG_V1[normCat] || {
      skills: SWIM_SKILLS_CATALOG_V1.homme.skills,
      metrics: SWIM_SKILLS_CATALOG_V1.homme.metrics,
    }
  );
}
