import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';
import '../services/api_service.dart';

final crossTierStreamProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) {
  return ref.read(apiServiceProvider).getCrossTierStream();
});

class SupplyChainScreen extends ConsumerWidget {
  const SupplyChainScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final streamAsync = ref.watch(crossTierStreamProvider);
    return Scaffold(
      backgroundColor: AppTheme.bgBase,
      appBar: AppBar(
        title: const Text('Supply Chain'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(crossTierStreamProvider),
          ),
        ],
      ),
      body: streamAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (e, _) => _buildOffline(ref),
        data: (data) => _buildContent(context, data),
      ),
    );
  }

  Widget _buildContent(BuildContext context, Map<String, dynamic> data) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Title ─────────────────────────────────────────────
          const Text('LIVE SUPPLY CHAIN', style: TextStyle(
            color: AppTheme.textMuted, fontSize: 11,
            fontWeight: FontWeight.w700, letterSpacing: 1.5,
          )),
          const SizedBox(height: 4),
          const Text('3-Tier National Network', style: TextStyle(
            color: AppTheme.textPrimary, fontSize: 22,
            fontWeight: FontWeight.w800,
          )),
          const SizedBox(height: 24),

          // ── Tier Cards ────────────────────────────────────────
          _TierCard(
            tier: 1,
            title: 'MANUFACTURER',
            subtitle: 'Production & Batch Inscription',
            icon: Icons.precision_manufacturing_outlined,
            color: AppTheme.accent,
            stats: _extractTier(data, 'manufacturer'),
          ),

          _tierConnector(AppTheme.accent, AppTheme.primary),

          _TierCard(
            tier: 2,
            title: 'DISTRIBUTOR',
            subtitle: 'Warehouse & Dispatch Hub',
            icon: Icons.warehouse_outlined,
            color: AppTheme.primary,
            stats: _extractTier(data, 'distributor'),
          ),

          _tierConnector(AppTheme.primary, AppTheme.success),

          _TierCard(
            tier: 3,
            title: 'PHARMACY',
            subtitle: 'Point of Care & Patient Dispense',
            icon: Icons.local_pharmacy_outlined,
            color: AppTheme.success,
            stats: _extractTier(data, 'pharmacy'),
          ),

          const SizedBox(height: 24),

          // ── Summary Stats ────────────────────────────────────
          _buildSummaryRow(data),

          const SizedBox(height: 24),

          // ── CTA ──────────────────────────────────────────────
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.qr_code_scanner),
              label: const Text('SCAN MEDICINE NOW'),
              onPressed: () => context.push('/scanner'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tierConnector(Color from, Color to) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 28, vertical: 0),
      height: 32,
      child: CustomPaint(
        painter: _ConnectorPainter(from: from, to: to),
      ),
    );
  }

  Map<String, dynamic> _extractTier(Map<String, dynamic> data, String key) {
    if (data[key] != null) return data[key] as Map<String, dynamic>;
    // Try alternate keys
    for (final k in data.keys) {
      if (k.toLowerCase().contains(key.toLowerCase())) {
        final v = data[k];
        if (v is Map) return v.cast<String, dynamic>();
      }
    }
    return {};
  }

  Widget _buildSummaryRow(Map<String, dynamic> data) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0A1628), Color(0xFF060C18)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _SummaryItem(
            label: 'TOTAL BATCHES',
            value: '${data['total_batches'] ?? data['batches_total'] ?? '—'}',
            color: AppTheme.accent,
          ),
          Container(width: 1, height: 40, color: AppTheme.border),
          _SummaryItem(
            label: 'AT PHARMACIES',
            value: '${data['at_pharmacy'] ?? data['pharmacy_count'] ?? '—'}',
            color: AppTheme.success,
          ),
          Container(width: 1, height: 40, color: AppTheme.border),
          _SummaryItem(
            label: 'CRITICAL ALERTS',
            value: '${data['critical_alerts'] ?? data['alerts_critical'] ?? '—'}',
            color: AppTheme.danger,
          ),
        ],
      ),
    );
  }

  Widget _buildOffline(WidgetRef ref) {
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.wifi_off, color: AppTheme.textMuted, size: 64),
        const SizedBox(height: 16),
        const Text('Backend offline', style: TextStyle(
          color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Make sure the PharmaSafe server is running',
          style: TextStyle(color: AppTheme.textSecondary)),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: () => ref.invalidate(crossTierStreamProvider),
          child: const Text('RETRY'),
        ),
      ]),
    );
  }
}

// ── Tier Card ────────────────────────────────────────────────────────
class _TierCard extends StatelessWidget {
  final int tier;
  final String title, subtitle;
  final IconData icon;
  final Color color;
  final Map<String, dynamic> stats;

  const _TierCard({
    required this.tier,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.stats,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.08),
            blurRadius: 20, offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Tier number + icon
          Column(children: [
            Container(
              width: 52, height: 52,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: color.withValues(alpha: 0.3)),
              ),
              child: Icon(icon, color: color, size: 26),
            ),
            const SizedBox(height: 4),
            Text('TIER $tier', style: TextStyle(
              color: color, fontSize: 9,
              fontWeight: FontWeight.w700, letterSpacing: 0.8,
            )),
          ]),
          const SizedBox(width: 14),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(
                color: color, fontSize: 13,
                fontWeight: FontWeight.w800, letterSpacing: 0.5,
              )),
              Text(subtitle, style: const TextStyle(
                color: AppTheme.textSecondary, fontSize: 12,
              )),
              if (stats.isNotEmpty) ...[
                const SizedBox(height: 10),
                Wrap(spacing: 8, runSpacing: 6, children: stats.entries
                  .take(3).map((e) => _MiniStat(
                    label: e.key.toUpperCase().replaceAll('_', ' '),
                    value: '${e.value}',
                    color: color,
                  )).toList(),
                ),
              ],
            ],
          )),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label, value;
  final Color color;
  const _MiniStat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(6),
    ),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Text(value, style: TextStyle(
        color: color, fontSize: 13, fontWeight: FontWeight.w700)),
      Text(label, style: const TextStyle(
        color: AppTheme.textMuted, fontSize: 8, letterSpacing: 0.5)),
    ]),
  );
}

class _SummaryItem extends StatelessWidget {
  final String label, value;
  final Color color;
  const _SummaryItem({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(value, style: TextStyle(
        color: color, fontSize: 22, fontWeight: FontWeight.w800)),
      const SizedBox(height: 2),
      Text(label, style: const TextStyle(
        color: AppTheme.textMuted, fontSize: 9,
        fontWeight: FontWeight.w600, letterSpacing: 0.8)),
    ],
  );
}

class _ConnectorPainter extends CustomPainter {
  final Color from, to;
  _ConnectorPainter({required this.from, required this.to});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter, end: Alignment.bottomCenter,
        colors: [from.withValues(alpha: 0.5), to.withValues(alpha: 0.5)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();
    path.moveTo(size.width / 2, 0);
    path.lineTo(size.width / 2, size.height);
    canvas.drawPath(path, paint);

    // Arrow
    final arrowPaint = Paint()
      ..color = to.withValues(alpha: 0.6)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawLine(
      Offset(size.width / 2 - 6, size.height - 10),
      Offset(size.width / 2, size.height),
      arrowPaint,
    );
    canvas.drawLine(
      Offset(size.width / 2 + 6, size.height - 10),
      Offset(size.width / 2, size.height),
      arrowPaint,
    );
  }

  @override
  bool shouldRepaint(_) => false;
}
