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
  final String status; // REQUESTED | ACCEPTED | DECLINED | CANCELLED
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

  bool get isPending => status == 'REQUESTED';
  bool get isAccepted => status == 'ACCEPTED';
  bool get isDeclined => status == 'DECLINED';

  factory ReplacementModel.fromJson(Map<String, dynamic> json, {String? currentCoachId}) {
    final sessionData = json['session'] as Map<String, dynamic>?;
    final groupData = sessionData?['group'] as Map<String, dynamic>?;
    final origCoachData = json['originalCoach'] as Map<String, dynamic>?;
    final repCoachData = json['replacementCoach'] as Map<String, dynamic>?;

    final repCoachId = json['replacementCoachId'] as String? ?? (repCoachData?['id'] as String? ?? '');

    return ReplacementModel(
      id: json['id'] as String? ?? '',
      absenceId: json['absenceId'] as String? ?? '',
      sessionId: json['sessionId'] as String? ?? (sessionData?['id'] as String? ?? ''),
      sessionDate: sessionData?['sessionDate'] as String? ?? (json['sessionDate'] as String? ?? ''),
      startTime: sessionData?['startTime'] as String? ?? (groupData?['startTime'] as String? ?? ''),
      endTime: sessionData?['endTime'] as String? ?? (groupData?['endTime'] as String? ?? ''),
      groupName: groupData?['name'] as String? ?? (json['groupName'] as String? ?? 'Group'),
      category: groupData?['category'] as String? ?? (json['category'] as String? ?? ''),
      pool: groupData?['pool'] as String? ?? (json['pool'] as String? ?? ''),
      originalCoachId: json['originalCoachId'] as String? ?? (origCoachData?['id'] as String? ?? ''),
      originalCoachName: origCoachData?['name'] as String? ?? (json['originalCoachName'] as String? ?? 'Coach'),
      replacementCoachId: repCoachId,
      replacementCoachName: repCoachData?['name'] as String? ?? (json['replacementCoachName'] as String? ?? 'Coach'),
      status: json['status'] as String? ?? 'REQUESTED',
      reason: json['reason'] as String?,
      declineReason: json['declineReason'] as String?,
      isIncomingRequest: currentCoachId != null && repCoachId == currentCoachId,
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
