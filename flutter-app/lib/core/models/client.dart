class Client {
  final String id;
  final String fullName;
  final String? phone;
  final String? email;
  final String customerSegment;
  final String? leadSource;
  final String? favoriteActivity;
  final String? notes;
  final DateTime createdAt;
  final List<ClientCard>? cards;

  const Client({
    required this.id,
    required this.fullName,
    this.phone,
    this.email,
    required this.customerSegment,
    this.leadSource,
    this.favoriteActivity,
    this.notes,
    required this.createdAt,
    this.cards,
  });

  factory Client.fromJson(Map<String, dynamic> json) => Client(
        id: json['id'] as String,
        fullName: json['fullName'] as String,
        phone: json['phone'] as String?,
        email: json['email'] as String?,
        customerSegment: json['customerSegment'] as String? ?? 'Standard',
        leadSource: json['leadSource'] as String?,
        favoriteActivity: json['favoriteActivity'] as String?,
        notes: json['notes'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
        cards: (json['cards'] as List<dynamic>?)
            ?.map((e) => ClientCard.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class ClientCard {
  final String id;
  final String cardCode;
  final bool isActive;
  final String? qrToken;

  const ClientCard({
    required this.id,
    required this.cardCode,
    required this.isActive,
    this.qrToken,
  });

  factory ClientCard.fromJson(Map<String, dynamic> json) => ClientCard(
        id: json['id'] as String,
        cardCode: json['cardCode'] as String,
        isActive: json['isActive'] as bool? ?? (json['status'] == 'active'),
        qrToken: json['publicToken'] as String? ?? json['qrToken'] as String?,
      );
}
