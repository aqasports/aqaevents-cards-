class Package {
  final String id;
  final String name;
  final int creditAmount;
  final int bonusCredits;
  final int totalCredits;
  final int price;
  final bool active;

  const Package({
    required this.id,
    required this.name,
    required this.creditAmount,
    required this.bonusCredits,
    required this.totalCredits,
    required this.price,
    required this.active,
  });

  factory Package.fromJson(Map<String, dynamic> json) => Package(
        id: json['id'] as String,
        name: json['name'] as String,
        creditAmount: json['creditAmount'] as int? ?? 0,
        bonusCredits: json['bonusCredits'] as int? ?? 0,
        totalCredits: json['totalCredits'] as int? ?? 0,
        price: json['price'] as int? ?? 0,
        active: json['active'] as bool? ?? true,
      );

  String get formattedPrice {
    if (price >= 1000000) return '${(price / 1000000).toStringAsFixed(1)} M DA';
    if (price >= 1000) return '${(price / 1000).toStringAsFixed(price % 1000 == 0 ? 0 : 1)} k DA';
    return '$price DA';
  }
}
