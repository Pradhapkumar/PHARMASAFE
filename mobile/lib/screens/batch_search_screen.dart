import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';
import '../services/api_service.dart';

final searchQueryProvider = StateProvider<String>((ref) => '');
final batchSearchResultsProvider =
    FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, q) {
  if (q.trim().length < 2) return Future.value([]);
  return ref.read(apiServiceProvider).searchBatches(q);
});

class BatchSearchScreen extends ConsumerStatefulWidget {
  const BatchSearchScreen({super.key});

  @override
  ConsumerState<BatchSearchScreen> createState() => _BatchSearchScreenState();
}

class _BatchSearchScreenState extends ConsumerState<BatchSearchScreen> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final resultsAsync = ref.watch(batchSearchResultsProvider(_query));

    return Scaffold(
      backgroundColor: AppTheme.bgBase,
      appBar: AppBar(
        title: const Text('Track a Batch'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // ── Search Field ──────────────────────────────────────
            TextField(
              controller: _controller,
              autofocus: true,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16),
              decoration: InputDecoration(
                hintText: 'Batch number, medicine name, GTIN…',
                prefixIcon: const Icon(Icons.search, color: AppTheme.textSecondary),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: AppTheme.textMuted),
                        onPressed: () {
                          _controller.clear();
                          setState(() => _query = '');
                        },
                      )
                    : null,
              ),
              onChanged: (v) {
                setState(() => _query = v.trim());
              },
              onSubmitted: (v) {
                if (v.trim().isNotEmpty) {
                  context.push('/batch/${v.trim()}');
                }
              },
            ),
            const SizedBox(height: 8),

            // ── Quick scan shortcut ───────────────────────────────
            GestureDetector(
              onTap: () => context.push('/scanner'),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppTheme.primaryGlow,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.qr_code_scanner, color: AppTheme.primary, size: 18),
                    SizedBox(width: 8),
                    Text('Or scan QR code with camera',
                      style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // ── Results ───────────────────────────────────────────
            Expanded(
              child: _query.length < 2
                  ? _buildEmptyState()
                  : resultsAsync.when(
                      loading: () => const Center(
                        child: CircularProgressIndicator(color: AppTheme.primary)),
                      error: (_, __) => const Center(
                        child: Text('Search failed', style: TextStyle(color: AppTheme.textMuted))),
                      data: (batches) => batches.isEmpty
                          ? _buildNoResults()
                          : _buildResults(batches),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 80, height: 80,
          decoration: BoxDecoration(
            color: AppTheme.primaryGlow,
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(Icons.search, color: AppTheme.primary, size: 40),
        ),
        const SizedBox(height: 16),
        const Text('Search any medicine batch',
          style: TextStyle(color: AppTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text(
          'Enter batch number, brand name, or GTIN barcode to track the full supply chain journey',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.5),
        ),
      ],
    );
  }

  Widget _buildNoResults() => Center(
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      const Icon(Icons.search_off, color: AppTheme.textMuted, size: 48),
      const SizedBox(height: 12),
      Text('No results for "$_query"',
        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 15)),
      const SizedBox(height: 16),
      ElevatedButton(
        onPressed: () => context.push('/batch/$_query'),
        child: Text('Try batch ID "$_query" directly'),
      ),
    ]),
  );

  Widget _buildResults(List<Map<String, dynamic>> batches) {
    return ListView.builder(
      itemCount: batches.length,
      itemBuilder: (_, i) {
        final b = batches[i];
        final status = b['status'] ?? '';
        final color = _statusColor(status);
        final med = b['medicine'] as Map<String, dynamic>? ?? {};

        return GestureDetector(
          onTap: () => context.push('/batch/${b['id']}'),
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: color.withValues(alpha: 0.25)),
            ),
            child: Row(children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.medication_outlined, color: color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(b['batch_number'] ?? '—',
                    style: const TextStyle(color: AppTheme.textPrimary,
                      fontSize: 15, fontWeight: FontWeight.w700)),
                  Text(med['brand_name'] ?? '—',
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                ],
              )),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(status,
                    style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(height: 4),
                const Icon(Icons.chevron_right, color: AppTheme.textMuted, size: 16),
              ]),
            ]),
          ),
        );
      },
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'MANUFACTURED': return AppTheme.accent;
      case 'IN_DISTRIBUTION': return AppTheme.primary;
      case 'AT_PHARMACY': return AppTheme.success;
      case 'RECALLED': return AppTheme.warning;
      case 'DESTROYED': case 'DEAD_BATCH': return AppTheme.danger;
      default: return AppTheme.textSecondary;
    }
  }
}
