class CoachUser {
  final String id;
  final String coachId;
  final String name;
  final String email;
  final String? phone;
  final String role; // head_coach | coach | assistant
  final List<String> specialties;
  final String? primaryPool;
  final String status;

  const CoachUser({
    required this.id,
    required this.coachId,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
    required this.specialties,
    this.primaryPool,
    required this.status,
  });

  bool get isHeadCoach => role == 'head_coach';
  bool get isCoach => role == 'coach';
  bool get isAssistant => role == 'assistant';

  String get roleDisplay {
    switch (role) {
      case 'head_coach':
        return 'Head Coach';
      case 'coach':
        return 'Coach';
      case 'assistant':
        return 'Assistant';
      default:
        return role;
    }
  }

  factory CoachUser.fromJson(Map<String, dynamic> json) {
    return CoachUser(
      id: json['id'] as String? ?? '',
      coachId: json['coachId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      role: json['role'] as String? ?? 'coach',
      specialties: (json['specialties'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      primaryPool: json['primaryPool'] as String?,
      status: json['status'] as String? ?? 'ACTIVE',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'coachId': coachId,
      'name': name,
      'email': email,
      'phone': phone,
      'role': role,
      'specialties': specialties,
      'primaryPool': primaryPool,
      'status': status,
    };
  }
}
