class ReplacementModel {
  final String id;
  final String absenceId;
  final String sessionId;
  final String sessionDate;
  final String startTime;
  final String endTime;
  final String groupName;
  final String category;
  final String pool;
  final String originalCoachId;
  final String originalCoachName;
  final String replacementCoachId;
  final String replacementCoachName;
  final String status; // PROPOSED | REQUESTED | ACCEPTED | DECLINED | ASSIGNED
  final String? reason;
  final String? declineReason;
  final bool isIncomingRequest;

  const ReplacementModel({
    required this.id,
    required this.absenceId,
    required this.sessionId,
    required this.sessionDate,
    required this.startTime,
    required this.endTime,
    required this.groupName,
    required this.category,
    required this.pool,
    required this.originalCoachId,
    required this.originalCoachName,
    required this.replacementCoachId,
    required this.replacementCoachName,
    required this.status,
    this.reason,
    this.declineReason,
    this.isIncomingRequest = false,
  });

  bool get isPending =>
      status == 'REQUESTED' || status == 'PROPOSED' || status == 'PENDING';
  bool get isAccepted => status == 'ACCEPTED' || status == 'ASSIGNED';
  bool get isDeclined => status == 'DECLINED';

  factory ReplacementModel.fromJson(Map<String, dynamic> json, {String? currentCoachId}) {
    final sessionData = json['session'] as Map<String, dynamic>?;
    final groupData = sessionData?['group'] as Map<String, dynamic>?;
    final origCoachData = json['originalCoach'] as Map<String, dynamic>?;
    final repCoachData = (json['substituteCoach'] ?? json['replacementCoach']) as Map<String, dynamic>?;

    final repCoachId = json['substituteCoachId'] as String? ??
        (json['replacementCoachId'] as String? ?? (repCoachData?['id'] as String? ?? ''));

    final startStr = json['startTime'] as String? ??
        (sessionData?['startTime'] as String? ?? (groupData?['startTime'] as String? ?? '18:00'));
    final endStr = json['endTime'] as String? ??
        (sessionData?['endTime'] as String? ?? (groupData?['endTime'] as String? ?? '19:00'));
    final poolStr = json['pool'] as String? ??
        (json['location'] as String? ??
            (sessionData?['location'] as String? ?? (groupData?['pool'] as String? ?? 'Piscine AQA')));

    final rawStatus = (json['status'] as String? ?? 'PROPOSED').toUpperCase();

    return ReplacementModel(
      id: json['id'] as String? ?? '',
      absenceId: json['absenceId'] as String? ?? '',
      sessionId: json['sessionId'] as String? ?? (sessionData?['id'] as String? ?? ''),
      sessionDate: json['sessionDate'] as String? ?? (sessionData?['sessionDate'] as String? ?? ''),
      startTime: startStr,
      endTime: endStr,
      groupName: json['groupName'] as String? ?? (groupData?['name'] as String? ?? 'Groupe AQA'),
      category: json['category'] as String? ?? (groupData?['category'] as String? ?? ''),
      pool: poolStr,
      originalCoachId: json['originalCoachId'] as String? ?? (origCoachData?['id'] as String? ?? ''),
      originalCoachName: json['originalCoachName'] as String? ??
          (origCoachData?['name'] as String? ?? 'Coach AQA'),
      replacementCoachId: repCoachId,
      replacementCoachName: json['substituteCoachName'] as String? ??
          (json['replacementCoachName'] as String? ?? (repCoachData?['name'] as String? ?? 'Equipe AQA')),
      status: rawStatus,
      reason: json['note'] as String? ?? (json['reason'] as String?),
      declineReason: json['declineReason'] as String?,
      isIncomingRequest: (json['isIncomingForMe'] as bool?) ??
          (currentCoachId != null && (repCoachId.isEmpty || repCoachId == currentCoachId)),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'absenceId': absenceId,
      'sessionId': sessionId,
      'sessionDate': sessionDate,
      'startTime': startTime,
      'endTime': endTime,
      'groupName': groupName,
      'category': category,
      'pool': pool,
      'originalCoachId': originalCoachId,
      'originalCoachName': originalCoachName,
      'replacementCoachId': replacementCoachId,
      'replacementCoachName': replacementCoachName,
      'status': status,
      'reason': reason,
      'declineReason': declineReason,
    };
  }
}

