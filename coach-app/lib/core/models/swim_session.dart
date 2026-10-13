class SwimSessionModel {
  final String id;
  final String groupId;
  final String groupName;
  final String category;
  final String pool;
  final String sessionDate;
  final String startTime;
  final String endTime;
  final String status;
  final int attendanceCount;
  final int totalMembers;
  final bool isReplacement;
  final bool canEdit;

  const SwimSessionModel({
    required this.id,
    required this.groupId,
    required this.groupName,
    required this.category,
    required this.pool,
    required this.sessionDate,
    required this.startTime,
    required this.endTime,
    required this.status,
    this.attendanceCount = 0,
    this.totalMembers = 0,
    this.isReplacement = false,
    this.canEdit = true,
  });

  bool get isCompleted => status == 'COMPLETED';
  bool get isCancelled => status == 'CANCELLED';

  factory SwimSessionModel.fromJson(Map<String, dynamic> json) {
    final groupData = json['group'] as Map<String, dynamic>?;

    return SwimSessionModel(
      id: json['id'] as String? ?? '',
      groupId: json['groupId'] as String? ?? (groupData?['id'] as String? ?? ''),
      groupName: groupData?['name'] as String? ?? (json['groupName'] as String? ?? 'Group'),
      category: groupData?['category'] as String? ?? (json['category'] as String? ?? ''),
      pool: groupData?['pool'] as String? ?? (json['pool'] as String? ?? ''),
      sessionDate: json['sessionDate'] as String? ?? '',
      startTime: json['startTime'] as String? ?? (groupData?['startTime'] as String? ?? ''),
      endTime: json['endTime'] as String? ?? (groupData?['endTime'] as String? ?? ''),
      status: json['status'] as String? ?? 'SCHEDULED',
      attendanceCount: (json['attendanceCount'] as num?)?.toInt() ??
          (json['_count'] != null && json['_count']['attendance'] != null
              ? (json['_count']['attendance'] as num).toInt()
              : 0),
      totalMembers: (json['totalMembers'] as num?)?.toInt() ?? 0,
      isReplacement: json['isReplacement'] as bool? ?? false,
      canEdit: json['canEdit'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'groupId': groupId,
      'groupName': groupName,
      'category': category,
      'pool': pool,
      'sessionDate': sessionDate,
      'startTime': startTime,
      'endTime': endTime,
      'status': status,
      'attendanceCount': attendanceCount,
      'totalMembers': totalMembers,
      'isReplacement': isReplacement,
      'canEdit': canEdit,
    };
  }
}
