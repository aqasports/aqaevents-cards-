class SkillScoreItem {
  final String skillKey;
  final int score; // 1 to 4
  final String? notes;

  const SkillScoreItem({
    required this.skillKey,
    required this.score,
    this.notes,
  });

  factory SkillScoreItem.fromJson(Map<String, dynamic> json) {
    return SkillScoreItem(
      skillKey: json['skillKey'] as String? ?? '',
      score: (json['score'] as num?)?.toInt() ?? 1,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'skillKey': skillKey,
      'score': score,
      if (notes != null) 'notes': notes,
    };
  }
}

class TechReviewModel {
  final String id;
  final String memberId;
  final String coachId;
  final String coachName;
  final String overallLevel; // BEGINNER | INTERMEDIATE | ADVANCED | ELITE
  final String? evaluatorNotes;
  final String createdAt;
  final Map<String, dynamic> skills;

  const TechReviewModel({
    required this.id,
    required this.memberId,
    required this.coachId,
    required this.coachName,
    required this.overallLevel,
    this.evaluatorNotes,
    required this.createdAt,
    required this.skills,
  });

  factory TechReviewModel.fromJson(Map<String, dynamic> json) {
    final coachData = json['coach'] as Map<String, dynamic>?;

    return TechReviewModel(
      id: json['id'] as String? ?? '',
      memberId: json['memberId'] as String? ?? '',
      coachId: json['coachId'] as String? ?? (coachData?['id'] as String? ?? ''),
      coachName: coachData?['name'] as String? ?? (json['coachName'] as String? ?? 'Coach'),
      overallLevel: json['overallLevel'] as String? ?? 'BEGINNER',
      evaluatorNotes: json['evaluatorNotes'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
      skills: (json['skills'] as Map<String, dynamic>?) ?? {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'memberId': memberId,
      'coachId': coachId,
      'coachName': coachName,
      'overallLevel': overallLevel,
      'evaluatorNotes': evaluatorNotes,
      'createdAt': createdAt,
      'skills': skills,
    };
  }
}
