import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../features/shipments/domain/models/shipment.dart';

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status});

  final ShipmentStatus status;

  @override
  Widget build(BuildContext context) {
    final color = _colorFor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.35)),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2,
        ),
      ),
    );
  }

  Color _colorFor(ShipmentStatus status) {
    switch (status) {
      case ShipmentStatus.completed:
        return const Color(0xFF15803D);
      case ShipmentStatus.cancelled:
        return const Color(0xFFB91C1C);
      case ShipmentStatus.shipped:
      case ShipmentStatus.readyToShip:
        return AppTheme.amber;
      case ShipmentStatus.waitingForPayment:
      case ShipmentStatus.waitingForFnsku:
      case ShipmentStatus.waitingForBoxLabels:
        return const Color(0xFFB45309);
      default:
        return AppTheme.navy;
    }
  }
}
