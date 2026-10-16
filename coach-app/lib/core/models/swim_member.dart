class SwimMemberModel {
  final String id;
  final String swimId;
  final String fullName;
  final String? phone;
  final String category;
  final String? dateOfBirth;
  final String? gender;
  final bool active;
  final String? currentLevel;
  final String? formula;
  final String? cardCode;
  final String? paymentStatus;
  final String? emergencyContact;
  final String? photoUrl;
  final int totalPresences;
  final int totalAbsences;
  final int attendanceRate;
  final int reviewCount;
  final double avgSkillScore;
  final String badgeKey;
  final String badgeLabel;
  final String badgeAsset;

  const SwimMemberModel({
    required this.id,
    this.swimId = '',
    required this.fullName,
    this.phone,
    this.category = 'homme',
    this.dateOfBirth,
    this.gender,
    required this.active,
    this.currentLevel,
    this.formula,
    this.cardCode,
    this.paymentStatus,
    this.emergencyContact,
    this.photoUrl,
    this.totalPresences = 0,
    this.totalAbsences = 0,
    this.attendanceRate = 100,
    this.reviewCount = 0,
    this.avgSkillScore = 0.0,
    this.badgeKey = 'starter',
    this.badgeLabel = 'Starter',
    this.badgeAsset = 'starter.png',
  });

  factory SwimMemberModel.fromJson(Map<String, dynamic> json) {
    return SwimMemberModel(
      id: json['id'] as String? ?? (json['memberId'] as String? ?? ''),
      swimId: json['swimId'] as String? ?? '',
      fullName: json['fullName'] as String? ?? 'Swimmer',
      phone: json['phone'] as String?,
      category: json['category'] as String? ?? 'homme',
      dateOfBirth: json['dateOfBirth'] as String?,
      gender: json['gender'] as String?,
      active: json['active'] as bool? ?? true,
      currentLevel: json['currentLevel'] as String? ?? (json['level'] as String?),
      formula: json['formula'] as String?,
      cardCode: json['cardCode'] as String?,
      paymentStatus: json['paymentStatus'] as String?,
      emergencyContact: json['emergencyContact'] as String?,
      photoUrl: json['photoUrl'] as String?,
      totalPresences: (json['totalPresences'] as num?)?.toInt() ?? 0,
      totalAbsences: (json['totalAbsences'] as num?)?.toInt() ?? 0,
      attendanceRate: (json['attendanceRate'] as num?)?.toInt() ?? 100,
      reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
      avgSkillScore: (json['avgSkillScore'] as num?)?.toDouble() ?? 0.0,
      badgeKey: json['badgeKey'] as String? ?? 'starter',
      badgeLabel: json['badgeLabel'] as String? ?? 'Starter',
      badgeAsset: json['badgeAsset'] as String? ?? 'starter.png',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'swimId': swimId,
      'fullName': fullName,
      'phone': phone,
      'category': category,
      'dateOfBirth': dateOfBirth,
      'gender': gender,
      'active': active,
      'currentLevel': currentLevel,
      'formula': formula,
      'cardCode': cardCode,
      'paymentStatus': paymentStatus,
      'emergencyContact': emergencyContact,
      'photoUrl': photoUrl,
      'totalPresences': totalPresences,
      'totalAbsences': totalAbsences,
      'attendanceRate': attendanceRate,
      'reviewCount': reviewCount,
      'avgSkillScore': avgSkillScore,
      'badgeKey': badgeKey,
      'badgeLabel': badgeLabel,
      'badgeAsset': badgeAsset,
    };
  }
}

