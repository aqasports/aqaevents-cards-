class SessionRatingModel {
  final int rating; // 1 to 5
  final String? intensity;
  final String? focus;
  final int? discipline;
  final double? waterTempC;
  final String? summary;
  final String? coachName;
  final String? ratedAt;

  const SessionRatingModel({
    required this.rating,
    this.intensity,
    this.focus,
    this.discipline,
    this.waterTempC,
    this.summary,
    this.coachName,
    this.ratedAt,
  });

  factory SessionRatingModel.fromJson(Map<String, dynamic> json) {
    return SessionRatingModel(
      rating: (json['rating'] as num?)?.toInt() ?? 5,
      intensity: json['intensity'] as String?,
      focus: json['focus'] as String?,
      discipline: (json['discipline'] as num?)?.toInt(),
      waterTempC: (json['waterTempC'] as num?)?.toDouble(),
      summary: json['summary'] as String?,
      coachName: json['coachName'] as String?,
      ratedAt: json['ratedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'rating': rating,
      if (intensity != null) 'intensity': intensity,
      if (focus != null) 'focus': focus,
      if (discipline != null) 'discipline': discipline,
      if (waterTempC != null) 'waterTempC': waterTempC,
      if (summary != null) 'summary': summary,
    };
  }
}

class SwimSessionModel {
  final String id;
  final String groupId;
  final String groupName;
  final String category;
  final String level;
  final String pool;
  final String sessionDate;
  final String startTime;
  final String endTime;
  final String status;
  final int attendanceCount;
  final int absentCount;
  final int markedCount;
  final int totalMembers;
  final bool isReplacement;
  final bool canEdit;
  final SessionRatingModel? sessionRating;

  const SwimSessionModel({
    required this.id,
    required this.groupId,
    required this.groupName,
    required this.category,
    this.level = '',
    required this.pool,
    required this.sessionDate,
    required this.startTime,
    required this.endTime,
    required this.status,
    this.attendanceCount = 0,
    this.absentCount = 0,
    this.markedCount = 0,
    this.totalMembers = 0,
    this.isReplacement = false,
    this.canEdit = true,
    this.sessionRating,
  });

  bool get isCompleted {
    final s = status.toUpperCase();
    return s == 'COMPLETED' || s == 'HELD' || markedCount > 0;
  }

  bool get isCancelled => status.toUpperCase() == 'CANCELLED';

  static String _computeEndTime(String start) {
    if (!start.contains(':')) return '19:00';
    final parts = start.split(':');
    final h = int.tryParse(parts[0]) ?? 18;
    final m = int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0;
    final total = h * 60 + m + 60;
    final eh = (total ~/ 60) % 24;
    final em = total % 60;
    return '${eh.toString().padLeft(2, '0')}:${em.toString().padLeft(2, '0')}';
  }

  factory SwimSessionModel.fromJson(Map<String, dynamic> json) {
    final groupData = json['group'] as Map<String, dynamic>?;
    final stats = json['attendanceStats'] as Map<String, dynamic>?;
    final ratingJson = json['sessionRating'] as Map<String, dynamic>?;

    final startStr = json['startTime'] as String? ??
        (groupData?['startTime'] as String? ?? '18:00');
    final endStr = (json['endTime'] as String?)?.isNotEmpty == true
        ? json['endTime'] as String
        : ((groupData?['endTime'] as String?)?.isNotEmpty == true
            ? groupData!['endTime'] as String
            : _computeEndTime(startStr));

    final poolStr = (json['pool'] as String?)?.isNotEmpty == true
        ? json['pool'] as String
        : ((json['location'] as String?)?.isNotEmpty == true
            ? json['location'] as String
            : (groupData?['pool'] as String? ?? 'Piscine AQA'));

    final presentCnt = (json['attendanceCount'] as num?)?.toInt() ??
        (stats?['present'] as num?)?.toInt() ??
        (json['_count'] != null && json['_count']['attendance'] != null
            ? (json['_count']['attendance'] as num).toInt()
            : 0);

    final absentCnt = (stats?['absent'] as num?)?.toInt() ?? 0;
    final markedCnt = (stats?['marked'] as num?)?.toInt() ?? presentCnt;
    final totalMem = (json['totalMembers'] as num?)?.toInt() ??
        (stats?['total'] as num?)?.toInt() ??
        0;

    return SwimSessionModel(
      id: json['id'] as String? ?? '',
      groupId: json['groupId'] as String? ?? (groupData?['id'] as String? ?? ''),
      groupName: groupData?['name'] as String? ??
          (json['groupName'] as String? ?? 'Groupe AQA'),
      category: groupData?['category'] as String? ??
          (json['category'] as String? ?? ''),
      level: groupData?['level'] as String? ?? (json['level'] as String? ?? ''),
      pool: poolStr,
      sessionDate: json['sessionDate'] as String? ?? '',
      startTime: startStr,
      endTime: endStr,
      status: json['status'] as String? ?? 'scheduled',
      attendanceCount: presentCnt,
      absentCount: absentCnt,
      markedCount: markedCnt,
      totalMembers: totalMem,
      isReplacement: json['isReplacement'] as bool? ?? false,
      canEdit: json['canEdit'] as bool? ?? true,
      sessionRating: ratingJson != null
          ? SessionRatingModel.fromJson(ratingJson)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'groupId': groupId,
      'groupName': groupName,
      'category': category,
      'level': level,
      'pool': pool,
      'sessionDate': sessionDate,
      'startTime': startTime,
      'endTime': endTime,
      'status': status,
      'attendanceCount': attendanceCount,
      'absentCount': absentCount,
      'markedCount': markedCount,
      'totalMembers': totalMembers,
      'isReplacement': isReplacement,
      'canEdit': canEdit,
      if (sessionRating != null) 'sessionRating': sessionRating!.toJson(),
    };
  }
}

