class SwimMemberModel {
  final String id;
  final String fullName;
  final String? dateOfBirth;
  final String? gender;
  final bool active;
  final String? currentLevel;
  final String? emergencyContact;
  final String? photoUrl;
  final int totalPresences;
  final int totalAbsences;

  const SwimMemberModel({
    required this.id,
    required this.fullName,
    this.dateOfBirth,
    this.gender,
    required this.active,
    this.currentLevel,
    this.emergencyContact,
    this.photoUrl,
    this.totalPresences = 0,
    this.totalAbsences = 0,
  });

  factory SwimMemberModel.fromJson(Map<String, dynamic> json) {
    return SwimMemberModel(
      id: json['id'] as String? ?? '',
      fullName: json['fullName'] as String? ?? 'Swimmer',
      dateOfBirth: json['dateOfBirth'] as String?,
      gender: json['gender'] as String?,
      active: json['active'] as bool? ?? true,
      currentLevel: json['currentLevel'] as String?,
      emergencyContact: json['emergencyContact'] as String?,
      photoUrl: json['photoUrl'] as String?,
      totalPresences: (json['totalPresences'] as num?)?.toInt() ?? 0,
      totalAbsences: (json['totalAbsences'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'dateOfBirth': dateOfBirth,
      'gender': gender,
      'active': active,
      'currentLevel': currentLevel,
      'emergencyContact': emergencyContact,
      'photoUrl': photoUrl,
      'totalPresences': totalPresences,
      'totalAbsences': totalAbsences,
    };
  }
}
