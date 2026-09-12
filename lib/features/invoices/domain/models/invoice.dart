class InvoiceSummary {
  const InvoiceSummary({
    required this.id,
    required this.number,
    required this.status,
    required this.total,
    this.shipmentReference,
    this.issuedAt,
  });

  final String id;
  final String number;
  final String status;
  final double total;
  final String? shipmentReference;
  final DateTime? issuedAt;

  factory InvoiceSummary.fromJson(Map<String, dynamic> json) {
    final shipment = json['shipment'] as Map<String, dynamic>?;
    final totalRaw = json['total'] ?? json['totalAmount'] ?? 0;
    return InvoiceSummary(
      id: json['id'] as String,
      number: (json['number'] as String?) ??
          (json['invoiceNumber'] as String?) ??
          json['id'] as String,
      status: (json['status'] as String?) ?? 'DRAFT',
      total: totalRaw is num ? totalRaw.toDouble() : double.tryParse('$totalRaw') ?? 0,
      shipmentReference: shipment?['reference'] as String? ??
          shipment?['shipmentNumber'] as String?,
      issuedAt: DateTime.tryParse(
        (json['issuedAt'] as String?) ?? (json['createdAt'] as String?) ?? '',
      ),
    );
  }
}
