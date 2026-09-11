import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';
import '../services/api_service.dart';

final deadBatchesListProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return ref.read(apiServiceProvider).getDeadBatches(limit: 50);
});

class DeadBatchesScreen extends ConsumerWidget {
  const DeadBatchesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final deadBatchesAsync = ref.watch(deadBatchesListProvider);

    return Scaffold(
      backgroundColor: AppTheme.bgBase,
      appBar: AppBar(
        title: const Text('DEAD BATCH REGISTRY'),
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
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.danger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.dangerous_outlined, color: AppTheme.danger, size: 28),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'National Dead Batch Registry (Officially Destroyed Lots). Any attempt to sell or dispense these lots triggers an instant CRITICAL ALERT and hard sale block.',
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 12, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            deadBatchesAsync.when(
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(color: AppTheme.danger),
                ),
              ),
              error: (e, _) => Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.bgCard,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  'Unable to load Dead Batch Registry: $e',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                ),
              ),
              data: (batches) {
                if (batches.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppTheme.bgCard,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: const Center(
                      child: Text(
                        'No dead batches currently logged in the registry.',
                        style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                      ),
                    ),
                  );
                }

                return Column(
                  children: batches.map((b) => _buildDeadBatchCard(context, b)).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDeadBatchCard(BuildContext context, Map<String, dynamic> b) {
    final batchNum = b['batch_number'] ?? b['id'] ?? 'UNKNOWN';
    final certHash = b['destruction_cert_hash'] ?? b['certificate_hash'] ?? 'CERT-HASH-PENDING';
    final reentryAttempts = b['reentry_attempts_count'] ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'BATCH $batchNum',
                style: const TextStyle(
                  color: AppTheme.danger,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'monospace',
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.danger.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('DESTROYED', style: TextStyle(color: AppTheme.danger, fontSize: 9, fontWeight: FontWeight.w800)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Manufacturer: ${b['manufacturer_name'] ?? 'Authorized Manufacturer'}',
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 12),
          ),
          const SizedBox(height: 4),
          Text(
            'Destruction Hash: ${certHash.toString().length > 20 ? certHash.toString().substring(0, 20) : certHash}...',
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 10, fontFamily: 'monospace'),
          ),
          if (reentryAttempts > 0) ...[
            const SizedBox(height: 6),
            Text(
              '⚠️ $reentryAttempts Re-entry Violation Attempt(s) Logged',
              style: const TextStyle(color: AppTheme.warning, fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton.icon(
                icon: const Icon(Icons.route_outlined, size: 14),
                label: const Text('View Passport', style: TextStyle(fontSize: 12)),
                style: TextButton.styleFrom(foregroundColor: AppTheme.accent),
                onPressed: () => context.push('/batch/$batchNum'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
