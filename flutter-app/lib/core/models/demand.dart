class CardDemand {
  final String id;
  final String name;
  final String phone;
  final String status;
  final String creditType;
  final int price;
  final String? cardCode;
  final DateTime createdAt;

  const CardDemand({
    required this.id,
    required this.name,
    required this.phone,
    required this.status,
    required this.creditType,
    required this.price,
    this.cardCode,
    required this.createdAt,
  });

  factory CardDemand.fromJson(Map<String, dynamic> json) => CardDemand(
        id: json['id'] as String,
        name: json['name'] as String? ?? json['fullName'] as String? ?? 'Unknown',
        phone: json['phone'] as String? ?? '',
        status: json['status'] as String? ?? 'pending',
        creditType: json['creditType'] as String? ?? json['type'] as String? ?? '',
        price: json['price'] as int? ?? 0,
        cardCode: json['cardCode'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  bool get isPending => status == 'pending';
}

class ActivityProposal {
  final String id;
  final String title;
  final String description;
  final String status;
  final String userName;
  final String userPhone;
  final DateTime createdAt;

  const ActivityProposal({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.userName,
    required this.userPhone,
    required this.createdAt,
  });

  factory ActivityProposal.fromJson(Map<String, dynamic> json) => ActivityProposal(
        id: json['id'] as String,
        title: json['title'] as String? ?? json['activityName'] as String? ?? 'Untitled',
        description: json['description'] as String? ?? '',
        status: json['status'] as String? ?? 'pending',
        userName: json['name'] as String? ?? json['user']?['name'] as String? ?? 'Unknown',
        userPhone: json['phone'] as String? ?? json['user']?['phone'] as String? ?? '',
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  bool get isPending => status == 'pending';
}
