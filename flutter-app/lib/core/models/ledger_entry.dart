class LedgerEntry {
  final String id;
  final String clientId;
  final String type;
  final double delta;
  final String? reason;
  final DateTime createdAt;

  const LedgerEntry({
    required this.id,
    required this.clientId,
    required this.type,
    required this.delta,
    this.reason,
    required this.createdAt,
  });

  factory LedgerEntry.fromJson(Map<String, dynamic> json) => LedgerEntry(
        id: json['id'] as String,
        clientId: json['clientId'] as String,
        type: json['type'] as String? ?? 'UNKNOWN',
        delta: (json['delta'] as num?)?.toDouble() ?? 0.0,
        reason: json['reason'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  bool get isCredit => delta > 0;
}
