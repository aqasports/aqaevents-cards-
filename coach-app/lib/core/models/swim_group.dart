class SwimGroupModel {
  final String id;
  final String name;
  final String category;
  final String level;
  final String schedule;
  final String pool;
  final List<String> scheduleDays;
  final String startTime;
  final String endTime;
  final int capacity;
  final String? coachName;
  final String roleInGroup; // head_coach | coach | lead | assistant
  final bool isPrimary;
  final bool canEdit;
  final int activeMembersCount;

  const SwimGroupModel({
    required this.id,
    required this.name,
    required this.category,
    this.level = '',
    this.schedule = '',
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

  bool get isViewOnly => !canEdit || roleInGroup == 'assistant';

  factory SwimGroupModel.fromJson(Map<String, dynamic> json) {
    List<String> days = [];
    if (json['scheduleDays'] is List) {
      days = (json['scheduleDays'] as List).map((e) => e.toString()).toList();
    } else if (json['scheduleDays'] is String && (json['scheduleDays'] as String).isNotEmpty) {
      days = (json['scheduleDays'] as String).split(',').map((s) => s.trim()).toList();
    }

    final rawSchedule = json['schedule'] as String? ?? '';
    final parsedPool = (json['pool'] as String?)?.isNotEmpty == true
        ? json['pool'] as String
        : (rawSchedule.contains('•') ? rawSchedule.split('•').last.trim() : 'Piscine AQA');

    final count = (json['activeMembersCount'] as num?)?.toInt() ??
        (json['swimmerCount'] as num?)?.toInt() ??
        (json['_count'] != null && json['_count']['swimmers'] != null
            ? (json['_count']['swimmers'] as num).toInt()
            : (json['_count'] != null && json['_count']['members'] != null
                ? (json['_count']['members'] as num).toInt()
                : 0));

    final roleStr = json['roleInGroup'] as String? ?? 'coach';
    final canEditVal = json['canEdit'] as bool? ?? (roleStr != 'assistant');

    return SwimGroupModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      category: json['category'] as String? ?? '',
      level: json['level'] as String? ?? '',
      schedule: rawSchedule,
      pool: parsedPool,
      scheduleDays: days,
      startTime: json['startTime'] as String? ?? '18:00',
      endTime: json['endTime'] as String? ?? '19:00',
      capacity: (json['capacity'] as num?)?.toInt() ?? 20,
      coachName: json['coachName'] as String?,
      roleInGroup: roleStr,
      isPrimary: json['isPrimary'] as bool? ?? true,
      canEdit: canEditVal,
      activeMembersCount: count,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'level': level,
      'schedule': schedule,
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

