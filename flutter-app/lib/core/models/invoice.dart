class Invoice {
  final String id;
  final String invoiceCode;
  final int amount;
  final String currency;
  final String status;
  final DateTime createdAt;
  final String? clientId;
  final String? clientName;
  final String? category;
  final String? items;
  final String? notes;

  const Invoice({
    required this.id,
    required this.invoiceCode,
    required this.amount,
    required this.currency,
    required this.status,
    required this.createdAt,
    this.clientId,
    this.clientName,
    this.category,
    this.items,
    this.notes,
  });

  factory Invoice.fromJson(Map<String, dynamic> json) => Invoice(
        id: json['id'] as String,
        invoiceCode: json['invoiceCode'] as String? ?? json['id'] as String,
        amount: json['amount'] as int? ?? 0,
        currency: json['currency'] as String? ?? 'DA',
        status: json['status'] as String? ?? 'pending',
        createdAt: DateTime.parse(json['createdAt'] as String),
        clientId: json['clientId'] as String?,
        clientName: json['client']?['fullName'] as String?,
        category: json['category'] as String?,
        items: json['items'] as String?,
        notes: json['notes'] as String?,
      );

  bool get isPending => status == 'pending';

  String get formattedAmount {
    if (amount >= 1000000) return '${(amount / 1000000).toStringAsFixed(1)} M DA';
    if (amount >= 1000) return '${(amount / 1000).toStringAsFixed(amount % 1000 == 0 ? 0 : 1)} k DA';
    return '$amount DA';
  }
}
