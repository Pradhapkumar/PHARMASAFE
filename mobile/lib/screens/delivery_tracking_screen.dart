import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';
import '../services/api_service.dart';

final shipmentsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return ref.read(apiServiceProvider).getShipments();
});

class DeliveryTrackingScreen extends ConsumerStatefulWidget {
  const DeliveryTrackingScreen({super.key});

  @override
  ConsumerState<DeliveryTrackingScreen> createState() => _DeliveryTrackingScreenState();
}

class _DeliveryTrackingScreenState extends ConsumerState<DeliveryTrackingScreen> {
  final _expectedQtyCtrl = TextEditingController(text: '100');
  final _receivedQtyCtrl = TextEditingController(text: '100');
  final _notesCtrl = TextEditingController();

  String? _discrepancyMessage;
  bool? _isDiscrepancy;

  @override
  void dispose() {
    _expectedQtyCtrl.dispose();
    _receivedQtyCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  void _runReconciliation() {
    final expected = int.tryParse(_expectedQtyCtrl.text.trim()) ?? 0;
    final received = int.tryParse(_receivedQtyCtrl.text.trim()) ?? 0;

    if (expected == received) {
      setState(() {
        _isDiscrepancy = false;
        _discrepancyMessage = 'QUANTITY MATCH: $received units verified. Inventory intact.';
      });
    } else {
      final diff = (expected - received).abs();
      final type = received < expected ? 'SHORTAGE' : 'OVERAGE';
      setState(() {
        _isDiscrepancy = true;
        _discrepancyMessage =
            'QUANTITY DISCREPANCY DETECTED: $type of $diff units! (Expected $expected, Received $received). Discrepancy logged.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final shipmentsAsync = ref.watch(shipmentsProvider);

    return Scaffold(
      backgroundColor: AppTheme.bgBase,
      appBar: AppBar(
        title: const Text('DELIVERY & RECEIVING'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.accent.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.local_shipping_outlined, color: AppTheme.accent, size: 26),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Live Delivery Tracking & Inbound Quantity Discrepancy Reconciliation',
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Demonstration Shipment Card
            _buildActiveShipmentCard(),

            const SizedBox(height: 24),

            // Inbound Receiving Section
            const Text(
              'INBOUND SHIPMENT RECEIVING & RECONCILIATION',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2),
            ),
            const SizedBox(height: 12),

            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.bgCard,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _expectedQtyCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Expected Qty'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _receivedQtyCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Actual Received Qty'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _notesCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Receiving Inspector Notes',
                      hintText: 'Condition of seals, cold chain indicators...',
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.fact_check_outlined),
                    label: const Text('RECONCILE & VERIFY QUANTITY'),
                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accent),
                    onPressed: _runReconciliation,
                  ),
                ],
              ),
            ),

            if (_discrepancyMessage != null) ...[
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: (_isDiscrepancy == true ? AppTheme.danger : AppTheme.success).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: (_isDiscrepancy == true ? AppTheme.danger : AppTheme.success).withValues(alpha: 0.4),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      _isDiscrepancy == true ? Icons.warning_amber_rounded : Icons.check_circle_outline,
                      color: _isDiscrepancy == true ? AppTheme.danger : AppTheme.success,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _discrepancyMessage!,
                        style: TextStyle(
                          color: _isDiscrepancy == true ? AppTheme.danger : AppTheme.success,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Live Shipments from Server
            const Text(
              'SERVER SHIPMENT REGISTRY',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2),
            ),
            const SizedBox(height: 12),

            shipmentsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
              error: (e, _) => Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: AppTheme.bgCard, borderRadius: BorderRadius.circular(12)),
                child: Text('No active shipments or network error: $e', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
              ),
              data: (shipments) {
                if (shipments.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.bgCard,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: const Center(
                      child: Text(
                        'No active shipments recorded.',
                        style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                      ),
                    ),
                  );
                }
                return Column(
                  children: shipments.map((s) => _buildShipmentTile(s)).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveShipmentCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.borderGlow),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'SHIPMENT: SHP-2026-001',
                style: TextStyle(color: AppTheme.accent, fontSize: 14, fontWeight: FontWeight.w800, fontFamily: 'monospace'),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.warning.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('IN TRANSIT', style: TextStyle(color: AppTheme.warning, fontSize: 10, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text('Batch: B1001 • Quantity: 100 units • Destination: MedPlus Central', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
          const SizedBox(height: 18),
          // Timeline Steps
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _TimelineStep(label: 'CREATED', isDone: true),
              _TimelineLine(isDone: true),
              _TimelineStep(label: 'PICKED UP', isDone: true),
              _TimelineLine(isDone: true),
              _TimelineStep(label: 'IN TRANSIT', isCurrent: true),
              _TimelineLine(isDone: false),
              _TimelineStep(label: 'RECEIVED', isDone: false),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildShipmentTile(Map<String, dynamic> s) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.inventory_2_outlined, color: AppTheme.accent, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(s['tracking_code'] ?? s['id'] ?? 'Shipment', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w700)),
                Text('Batch: ${s['batch_number'] ?? s['batch_id'] ?? 'N/A'} • Status: ${s['status'] ?? 'IN_TRANSIT'}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineStep extends StatelessWidget {
  final String label;
  final bool isDone;
  final bool isCurrent;

  const _TimelineStep({required this.label, this.isDone = false, this.isCurrent = false});

  @override
  Widget build(BuildContext context) {
    final color = isDone
        ? AppTheme.success
        : isCurrent
            ? AppTheme.warning
            : AppTheme.textMuted;
    return Column(
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.2),
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 2),
          ),
          child: Center(
            child: Icon(
              isDone ? Icons.check : (isCurrent ? Icons.circle : Icons.circle_outlined),
              color: color,
              size: 12,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(color: color, fontSize: 8, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

class _TimelineLine extends StatelessWidget {
  final bool isDone;
  const _TimelineLine({required this.isDone});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 12),
        color: isDone ? AppTheme.success : AppTheme.border,
      ),
    );
  }
}
