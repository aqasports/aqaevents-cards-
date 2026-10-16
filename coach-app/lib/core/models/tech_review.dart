class SkillScoreItem {
  final String skillKey;
  final String label;
  final int score; // 1 to 4
  final String? notes;

  const SkillScoreItem({
    required this.skillKey,
    this.label = '',
    required this.score,
    this.notes,
  });

  factory SkillScoreItem.fromJson(Map<String, dynamic> json) {
    final k = json['key'] as String? ?? (json['skillKey'] as String? ?? '');
    return SkillScoreItem(
      skillKey: k,
      label: json['label'] as String? ?? k,
      score: (json['score'] as num?)?.toInt() ?? 1,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'key': skillKey,
      'skillKey': skillKey,
      if (label.isNotEmpty) 'label': label,
      'score': score,
      if (notes != null) 'notes': notes,
    };
  }
}

class MetricValueItem {
  final String key;
  final double value;
  final String unit;

  const MetricValueItem({
    required this.key,
    required this.value,
    required this.unit,
  });

  factory MetricValueItem.fromJson(Map<String, dynamic> json) {
    return MetricValueItem(
      key: json['key'] as String? ?? '',
      value: (json['value'] as num?)?.toDouble() ?? 0.0,
      unit: json['unit'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'key': key,
        'value': value,
        'unit': unit,
      };
}

class TechReviewModel {
  final String id;
  final String memberId;
  final String coachId;
  final String coachName;
  final String kind;
  final String overallLevel;
  final String? evaluatorNotes;
  final String? improvements;
  final String? nextGoals;
  final String createdAt;
  final Map<String, dynamic> skills;
  final List<SkillScoreItem> skillItems;
  final List<MetricValueItem> metrics;

  const TechReviewModel({
    required this.id,
    required this.memberId,
    required this.coachId,
    required this.coachName,
    this.kind = 'assessment',
    required this.overallLevel,
    this.evaluatorNotes,
    this.improvements,
    this.nextGoals,
    required this.createdAt,
    required this.skills,
    this.skillItems = const [],
    this.metrics = const [],
  });

  factory TechReviewModel.fromJson(Map<String, dynamic> json) {
    final coachData = json['coach'] as Map<String, dynamic>?;

    final Map<String, dynamic> parsedSkillsMap = {};
    final List<SkillScoreItem> parsedSkillItems = [];

    final rawSkills = json['skills'];
    if (rawSkills is List) {
      for (final item in rawSkills) {
        if (item is Map<String, dynamic>) {
          final s = SkillScoreItem.fromJson(item);
          parsedSkillItems.add(s);
          parsedSkillsMap[s.label.isNotEmpty ? s.label : s.skillKey] = s.score;
        }
      }
    } else if (rawSkills is Map<String, dynamic>) {
      rawSkills.forEach((k, v) {
        final scoreVal = v is Map ? ((v['score'] as num?)?.toInt() ?? 1) : ((v as num?)?.toInt() ?? 1);
        parsedSkillsMap[k] = scoreVal;
        parsedSkillItems.add(SkillScoreItem(skillKey: k, label: k, score: scoreVal));
      });
    }

    final List<MetricValueItem> parsedMetrics = [];
    final rawMetrics = json['metrics'];
    if (rawMetrics is List) {
      for (final m in rawMetrics) {
        if (m is Map<String, dynamic>) {
          parsedMetrics.add(MetricValueItem.fromJson(m));
        }
      }
    }

    return TechReviewModel(
      id: json['id'] as String? ?? '',
      memberId: json['memberId'] as String? ?? '',
      coachId: json['coachId'] as String? ?? (coachData?['id'] as String? ?? ''),
      coachName: coachData?['name'] as String? ?? (json['coachName'] as String? ?? 'Coach AQA'),
      kind: json['kind'] as String? ?? 'assessment',
      overallLevel: json['recommendedLevel'] as String? ??
          (json['overallLevel'] as String? ?? 'Starter'),
      evaluatorNotes: json['strengths'] as String? ?? (json['evaluatorNotes'] as String?),
      improvements: json['improvements'] as String?,
      nextGoals: json['nextGoals'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
      skills: parsedSkillsMap,
      skillItems: parsedSkillItems,
      metrics: parsedMetrics,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'memberId': memberId,
      'coachId': coachId,
      'coachName': coachName,
      'kind': kind,
      'overallLevel': overallLevel,
      'recommendedLevel': overallLevel,
      'evaluatorNotes': evaluatorNotes,
      'strengths': evaluatorNotes,
      'improvements': improvements,
      'nextGoals': nextGoals,
      'createdAt': createdAt,
      'skills': skillItems.map((s) => s.toJson()).toList(),
      'metrics': metrics.map((m) => m.toJson()).toList(),
    };
  }
}

