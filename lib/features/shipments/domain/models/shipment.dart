enum ShipmentStatus {
  expected,
  received,
  inspection,
  waitingForFnsku,
  fnskuApplied,
  packing,
  waitingForBoxLabels,
  boxLabelsApplied,
  waitingForPayment,
  paymentVerified,
  readyToShip,
  shipped,
  completed,
  cancelled,
  unknown;

  static ShipmentStatus fromApi(String? value) {
    switch (value) {
      case 'EXPECTED':
        return ShipmentStatus.expected;
      case 'RECEIVED':
        return ShipmentStatus.received;
      case 'INSPECTION':
        return ShipmentStatus.inspection;
      case 'WAITING_FOR_FNSKU':
        return ShipmentStatus.waitingForFnsku;
      case 'FNSKU_APPLIED':
        return ShipmentStatus.fnskuApplied;
      case 'PACKING':
        return ShipmentStatus.packing;
      case 'WAITING_FOR_BOX_LABELS':
        return ShipmentStatus.waitingForBoxLabels;
      case 'BOX_LABELS_APPLIED':
        return ShipmentStatus.boxLabelsApplied;
      case 'WAITING_FOR_PAYMENT':
        return ShipmentStatus.waitingForPayment;
      case 'PAYMENT_VERIFIED':
        return ShipmentStatus.paymentVerified;
      case 'READY_TO_SHIP':
        return ShipmentStatus.readyToShip;
      case 'SHIPPED':
        return ShipmentStatus.shipped;
      case 'COMPLETED':
        return ShipmentStatus.completed;
      case 'CANCELLED':
        return ShipmentStatus.cancelled;
      default:
        return ShipmentStatus.unknown;
    }
  }

  String get apiValue {
    switch (this) {
      case ShipmentStatus.expected:
        return 'EXPECTED';
      case ShipmentStatus.received:
        return 'RECEIVED';
      case ShipmentStatus.inspection:
        return 'INSPECTION';
      case ShipmentStatus.waitingForFnsku:
        return 'WAITING_FOR_FNSKU';
      case ShipmentStatus.fnskuApplied:
        return 'FNSKU_APPLIED';
      case ShipmentStatus.packing:
        return 'PACKING';
      case ShipmentStatus.waitingForBoxLabels:
        return 'WAITING_FOR_BOX_LABELS';
      case ShipmentStatus.boxLabelsApplied:
        return 'BOX_LABELS_APPLIED';
      case ShipmentStatus.waitingForPayment:
        return 'WAITING_FOR_PAYMENT';
      case ShipmentStatus.paymentVerified:
        return 'PAYMENT_VERIFIED';
      case ShipmentStatus.readyToShip:
        return 'READY_TO_SHIP';
      case ShipmentStatus.shipped:
        return 'SHIPPED';
      case ShipmentStatus.completed:
        return 'COMPLETED';
      case ShipmentStatus.cancelled:
        return 'CANCELLED';
      case ShipmentStatus.unknown:
        return 'UNKNOWN';
    }
  }

  String get label => apiValue.replaceAll('_', ' ');
}

class ShipmentSummary {
  const ShipmentSummary({
    required this.id,
    required this.reference,
    required this.status,
    this.companyName,
    this.warehouseName,
    this.expectedArrivalAt,
    this.updatedAt,
    this.itemCount = 0,
  });

  final String id;
  final String reference;
  final ShipmentStatus status;
  final String? companyName;
  final String? warehouseName;
  final DateTime? expectedArrivalAt;
  final DateTime? updatedAt;
  final int itemCount;

  factory ShipmentSummary.fromJson(Map<String, dynamic> json) {
    final company = json['company'] as Map<String, dynamic>?;
    final warehouse = json['warehouse'] as Map<String, dynamic>?;
    final items = json['items'] as List?;
    final count = json['_count'] as Map<String, dynamic>?;

    return ShipmentSummary(
      id: json['id'] as String,
      reference: (json['reference'] as String?) ??
          (json['shipmentNumber'] as String?) ??
          json['id'] as String,
      status: ShipmentStatus.fromApi(json['status'] as String?),
      companyName: company?['name'] as String?,
      warehouseName: warehouse?['name'] as String?,
      expectedArrivalAt: _parseDate(json['expectedArrivalAt']),
      updatedAt: _parseDate(json['updatedAt']),
      itemCount: (count?['items'] as int?) ?? items?.length ?? 0,
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }
    return null;
  }
}

class ShipmentActivity {
  const ShipmentActivity({
    required this.id,
    required this.message,
    required this.createdAt,
    this.type,
  });

  final String id;
  final String message;
  final DateTime createdAt;
  final String? type;

  factory ShipmentActivity.fromJson(Map<String, dynamic> json) {
    return ShipmentActivity(
      id: json['id'] as String,
      message: (json['message'] as String?) ?? '',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      type: json['type'] as String?,
    );
  }
}

class ShipmentDetail extends ShipmentSummary {
  const ShipmentDetail({
    required super.id,
    required super.reference,
    required super.status,
    super.companyName,
    super.warehouseName,
    super.expectedArrivalAt,
    super.updatedAt,
    super.itemCount,
    this.notes,
    this.activities = const [],
    this.trackingNumber,
  });

  final String? notes;
  final List<ShipmentActivity> activities;
  final String? trackingNumber;

  factory ShipmentDetail.fromJson(Map<String, dynamic> json) {
    final base = ShipmentSummary.fromJson(json);
    final activities = (json['activities'] as List? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(ShipmentActivity.fromJson)
        .toList();

    return ShipmentDetail(
      id: base.id,
      reference: base.reference,
      status: base.status,
      companyName: base.companyName,
      warehouseName: base.warehouseName,
      expectedArrivalAt: base.expectedArrivalAt,
      updatedAt: base.updatedAt,
      itemCount: base.itemCount,
      notes: json['notes'] as String?,
      trackingNumber: json['trackingNumber'] as String?,
      activities: activities,
    );
  }
}
