class AttendanceRecordModel {
  final String? id;
  final String memberId;
  final String swimId;
  final String memberName;
  final String? level;
  final String? dateOfBirth;
  final String? photoUrl;
  String status; // PRESENT | ABSENT | LATE | EXCUSED
  String? notes;
  bool isGuest;
  String? guestGroupId;

  AttendanceRecordModel({
    this.id,
    required this.memberId,
    this.swimId = '',
    required this.memberName,
    this.level,
    this.dateOfBirth,
    this.photoUrl,
    this.status = 'PRESENT',
    this.notes,
    this.isGuest = false,
    this.guestGroupId,
  });

  bool get isPresent => status.toUpperCase() == 'PRESENT';
  bool get isAbsent => status.toUpperCase() == 'ABSENT';
  bool get isLate => status.toUpperCase() == 'LATE';
  bool get isExcused => status.toUpperCase() == 'EXCUSED';

  factory AttendanceRecordModel.fromJson(Map<String, dynamic> json) {
    final memberData = json['member'] as Map<String, dynamic>?;
    final rawStatus = (json['status'] as String? ?? 'PRESENT').trim().toUpperCase();
    final normalizedStatus = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].contains(rawStatus)
        ? rawStatus
        : 'PRESENT';

    return AttendanceRecordModel(
      id: json['id'] as String?,
      memberId: json['memberId'] as String? ??
          (memberData?['id'] as String? ?? (json['id'] as String? ?? '')),
      swimId: json['swimId'] as String? ?? (memberData?['swimId'] as String? ?? ''),
      memberName: memberData?['fullName'] as String? ??
          (json['fullName'] as String? ?? (json['memberName'] as String? ?? 'Swimmer')),
      level: json['level'] as String? ?? (memberData?['level'] as String?),
      dateOfBirth: memberData?['dateOfBirth'] as String? ?? (json['dateOfBirth'] as String?),
      photoUrl: memberData?['photoUrl'] as String? ?? (json['photoUrl'] as String?),
      status: normalizedStatus,
      notes: json['note'] as String? ?? (json['notes'] as String?),
      isGuest: json['isGuest'] as bool? ?? false,
      guestGroupId: json['guestGroupId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'memberId': memberId,
      'status': status.toUpperCase(),
      'method': 'manual',
      'note': notes,
      'notes': notes,
      'isGuest': isGuest,
      'guestName': isGuest ? memberName : null,
      if (guestGroupId != null) 'guestGroupId': guestGroupId,
    };
  }
}

