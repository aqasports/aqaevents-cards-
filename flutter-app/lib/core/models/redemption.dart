import 'activity.dart';

class Redemption {
  final String id;
  final String clientId;
  final String activityId;
  final String? sessionId;
  final double creditsUsed;
  final String? staffId;
  final DateTime redeemedAt;
  final String? notes;
  final Activity? activity;
  final ActivitySession? session;

  const Redemption({
    required this.id,
    required this.clientId,
    required this.activityId,
    this.sessionId,
    required this.creditsUsed,
    this.staffId,
    required this.redeemedAt,
    this.notes,
    this.activity,
    this.session,
  });

  factory Redemption.fromJson(Map<String, dynamic> json) => Redemption(
        id: json['id'] as String,
        clientId: json['clientId'] as String,
        activityId: json['activityId'] as String,
        sessionId: json['sessionId'] as String?,
        creditsUsed: (json['creditsUsed'] as num?)?.toDouble() ?? 1.0,
        staffId: json['staffId'] as String?,
        redeemedAt: DateTime.parse(json['redeemedAt'] as String),
        notes: json['notes'] as String?,
        activity: json['activity'] != null
            ? Activity.fromJson(json['activity'] as Map<String, dynamic>)
            : null,
        session: json['session'] != null
            ? ActivitySession.fromJson(json['session'] as Map<String, dynamic>)
            : null,
      );
}
