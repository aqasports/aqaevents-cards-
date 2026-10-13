class SwimGroupModel {
  final String id;
  final String name;
  final String category;
  final String pool;
  final List<String> scheduleDays;
  final String startTime;
  final String endTime;
  final int capacity;
  final String? coachName;
  final String roleInGroup; // head_coach | coach | assistant
  final bool isPrimary;
  final bool canEdit;
  final int activeMembersCount;

  const SwimGroupModel({
    required this.id,
    required this.name,
    required this.category,
    required this.pool,
    required this.scheduleDays,
    required this.startTime,
    required this.endTime,
    required this.capacity,
    this.coachName,
    required this.roleInGroup,
    required this.isPrimary,
    required this.canEdit,
    this.activeMembersCount = 0,
  });

  bool get isViewOnly => !canEdit;

  factory SwimGroupModel.fromJson(Map<String, dynamic> json) {
    List<String> days = [];
    if (json['scheduleDays'] is List) {
      days = (json['scheduleDays'] as List).map((e) => e.toString()).toList();
    } else if (json['scheduleDays'] is String) {
      days = (json['scheduleDays'] as String).split(',').map((s) => s.trim()).toList();
    }

    return SwimGroupModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      category: json['category'] as String? ?? '',
      pool: json['pool'] as String? ?? '',
      scheduleDays: days,
      startTime: json['startTime'] as String? ?? '',
      endTime: json['endTime'] as String? ?? '',
      capacity: (json['capacity'] as num?)?.toInt() ?? 0,
      coachName: json['coachName'] as String?,
      roleInGroup: json['roleInGroup'] as String? ?? 'coach',
      isPrimary: json['isPrimary'] as bool? ?? false,
      canEdit: json['canEdit'] as bool? ?? true,
      activeMembersCount: (json['activeMembersCount'] as num?)?.toInt() ??
          (json['_count'] != null && json['_count']['members'] != null
              ? (json['_count']['members'] as num).toInt()
              : 0),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'pool': pool,
      'scheduleDays': scheduleDays,
      'startTime': startTime,
      'endTime': endTime,
      'capacity': capacity,
      'coachName': coachName,
      'roleInGroup': roleInGroup,
      'isPrimary': isPrimary,
      'canEdit': canEdit,
      'activeMembersCount': activeMembersCount,
    };
  }
}
