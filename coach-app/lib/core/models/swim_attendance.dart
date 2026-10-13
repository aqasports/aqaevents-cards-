class AttendanceRecordModel {
  final String? id;
  final String memberId;
  final String memberName;
  final String? dateOfBirth;
  final String? photoUrl;
  String status; // PRESENT | ABSENT | LATE | EXCUSED
  String? notes;
  bool isGuest;
  String? guestGroupId;

  AttendanceRecordModel({
    this.id,
    required this.memberId,
    required this.memberName,
    this.dateOfBirth,
    this.photoUrl,
    this.status = 'PRESENT',
    this.notes,
    this.isGuest = false,
    this.guestGroupId,
  });

  bool get isPresent => status == 'PRESENT';
  bool get isAbsent => status == 'ABSENT';
  bool get isLate => status == 'LATE';
  bool get isExcused => status == 'EXCUSED';

  factory AttendanceRecordModel.fromJson(Map<String, dynamic> json) {
    final memberData = json['member'] as Map<String, dynamic>?;

    return AttendanceRecordModel(
      id: json['id'] as String?,
      memberId: json['memberId'] as String? ?? (memberData?['id'] as String? ?? ''),
      memberName: memberData?['fullName'] as String? ?? (json['memberName'] as String? ?? 'Swimmer'),
      dateOfBirth: memberData?['dateOfBirth'] as String? ?? (json['dateOfBirth'] as String?),
      photoUrl: memberData?['photoUrl'] as String? ?? (json['photoUrl'] as String?),
      status: json['status'] as String? ?? 'PRESENT',
      notes: json['notes'] as String?,
      isGuest: json['isGuest'] as bool? ?? false,
      guestGroupId: json['guestGroupId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'memberId': memberId,
      'status': status,
      'notes': notes,
      'isGuest': isGuest,
      if (guestGroupId != null) 'guestGroupId': guestGroupId,
    };
  }
}
