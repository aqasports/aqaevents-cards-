class Activity {
  final String id;
  final String name;
  final int creditCost;
  final String? description;
  final String? duration;
  final String? places;
  final String? imageUrl;
  final bool active;
  final List<ActivitySession>? sessions;

  const Activity({
    required this.id,
    required this.name,
    required this.creditCost,
    this.description,
    this.duration,
    this.places,
    this.imageUrl,
    required this.active,
    this.sessions,
  });

  factory Activity.fromJson(Map<String, dynamic> json) => Activity(
        id: json['id'] as String,
        name: json['name'] as String,
        creditCost: json['creditCost'] as int? ?? 0,
        description: json['description'] as String?,
        duration: json['duration'] as String?,
        places: json['places'] as String?,
        imageUrl: json['imageUrl'] as String?,
        active: json['active'] as bool? ?? true,
        sessions: (json['sessions'] as List<dynamic>?)
            ?.map((e) => ActivitySession.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class ActivitySession {
  final String id;
  final String activityId;
  final DateTime sessionDate;
  final String? location;
  final int? capacity;
  final String? activityName;

  const ActivitySession({
    required this.id,
    required this.activityId,
    required this.sessionDate,
    this.location,
    this.capacity,
    this.activityName,
  });

  factory ActivitySession.fromJson(Map<String, dynamic> json) => ActivitySession(
        id: json['id'] as String,
        activityId: json['activityId'] as String? ?? '',
        sessionDate: DateTime.parse(json['sessionDate'] as String),
        location: json['location'] as String?,
        capacity: json['capacity'] as int?,
        activityName: json['activityName'] as String?,
      );

  ActivitySession copyWith({
    String? id,
    String? activityId,
    DateTime? sessionDate,
    String? location,
    int? capacity,
    String? activityName,
  }) =>
      ActivitySession(
        id: id ?? this.id,
        activityId: activityId ?? this.activityId,
        sessionDate: sessionDate ?? this.sessionDate,
        location: location ?? this.location,
        capacity: capacity ?? this.capacity,
        activityName: activityName ?? this.activityName,
      );
}
