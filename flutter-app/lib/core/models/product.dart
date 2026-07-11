class Product {
  final String id;
  final String name;
  final int price;
  final String? description;
  final String? imageUrl;
  final bool active;
  final bool advertised;

  const Product({
    required this.id,
    required this.name,
    required this.price,
    this.description,
    this.imageUrl,
    required this.active,
    required this.advertised,
  });

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        name: json['name'] as String,
        price: json['price'] as int,
        description: json['description'] as String?,
        imageUrl: json['imageUrl'] as String?,
        active: json['active'] as bool? ?? true,
        advertised: json['advertised'] as bool? ?? true,
      );

  String get formattedPrice {
    if (price >= 1000) return '${(price / 1000).toStringAsFixed(price % 1000 == 0 ? 0 : 1)} k DA';
    return '$price DA';
  }
}
