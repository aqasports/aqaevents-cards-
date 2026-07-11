class Club {
  final String id;
  final String name;
  final bool isActive;
  final String? contactName;
  final String? contactEmail;
  final String? contactPhone;
  final DateTime createdAt;

  const Club({
    required this.id,
    required this.name,
    required this.isActive,
    this.contactName,
    this.contactEmail,
    this.contactPhone,
    required this.createdAt,
  });

  factory Club.fromJson(Map<String, dynamic> json) => Club(
        id: json['id'] as String,
        name: json['name'] as String,
        isActive: json['isActive'] as bool? ?? json['active'] as bool? ?? true,
        contactName: json['contactName'] as String?,
        contactEmail: json['contactEmail'] as String?,
        contactPhone: json['contactPhone'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

class CheckIn {
  final String id;
  final String clientId;
  final String status;
  final DateTime scannedAt;

  const CheckIn({
    required this.id,
    required this.clientId,
    required this.status,
    required this.scannedAt,
  });

  factory CheckIn.fromJson(Map<String, dynamic> json) => CheckIn(
        id: json['id'] as String,
        clientId: json['clientId'] as String,
        status: json['status'] as String? ?? 'SUCCESS',
        scannedAt: DateTime.parse(json['scannedAt'] as String? ?? json['createdAt'] as String),
      );
}
