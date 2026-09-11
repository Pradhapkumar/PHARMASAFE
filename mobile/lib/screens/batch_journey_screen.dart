import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';
import '../services/api_service.dart';

final batchPassportProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, id) {
  return ref.read(apiServiceProvider).getBatchPassport(id);
});

final batchEventsProvider =
    FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, id) {
  return ref.read(apiServiceProvider).getBatchEvents(id);
});

class BatchJourneyScreen extends ConsumerWidget {
  final String batchId;
  const BatchJourneyScreen({super.key, required this.batchId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final passportAsync = ref.watch(batchPassportProvider(batchId));
    final eventsAsync   = ref.watch(batchEventsProvider(batchId));

    return Scaffold(
      backgroundColor: AppTheme.bgBase,
      body: passportAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (e, _) => _ErrorBody(batchId: batchId, error: e.toString()),
        data: (passport) => CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            _buildHeader(context, passport),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  const SizedBox(height: 16),
                  _buildPassportCard(passport),
                  const SizedBox(height: 24),
                  _buildJourneySection(eventsAsync),
                  const SizedBox(height: 60),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Sliver Header ────────────────────────────────────────────────
  SliverAppBar _buildHeader(BuildContext context, Map<String, dynamic> p) {
    final status = p['status'] ?? '';
    final color = _statusColor(status);
    return SliverAppBar(
      expandedHeight: 160,
      pinned: true,
      backgroundColor: AppTheme.bgBase,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () => context.pop(),
      ),
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft, end: Alignment.bottomRight,
              colors: [
                color.withValues(alpha: 0.12),
                AppTheme.bgBase,
              ],
            ),
          ),
          child: Stack(children: [
            // Glow
            Positioned(
              top: -50, left: -30,
              child: Container(
                width: 200, height: 200,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(colors: [
                    color.withValues(alpha: 0.15), Colors.transparent,
                  ]),
                ),
              ),
            ),
            Positioned(
              bottom: 16, left: 16,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('BATCH PASSPORT', style: TextStyle(
                    color: color, fontSize: 10,
                    fontWeight: FontWeight.w700, letterSpacing: 1.5,
                  )),
                  const SizedBox(height: 4),
                  Text(
                    p['batch_number'] ?? batchId,
                    style: const TextStyle(
                      color: AppTheme.textPrimary, fontSize: 26,
                      fontWeight: FontWeight.w800, letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  _StatusPill(status: status, color: color),
                ],
              ),
            ),
          ]),
        ),
      ),
    );
  }

  // ── Passport Card ────────────────────────────────────────────────
  Widget _buildPassportCard(Map<String, dynamic> p) {
    final med = p['medicine'] as Map<String, dynamic>? ?? {};
    final status = p['status'] ?? '';
    final color = _statusColor(status);

    final isRecalled  = p['is_recalled'] == true;
    final isDeadBatch = p['is_dead_batch'] == true;
    final riskLevel   = p['risk_level'];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(children: [
        // Medicine name
        Row(children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.medication_outlined, color: color, size: 26),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                med['brand_name'] ?? '—',
                style: const TextStyle(
                  color: AppTheme.textPrimary, fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(
                med['generic_name'] ?? '',
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
              ),
            ],
          )),
        ]),

        if (isRecalled || isDeadBatch) ...[
          const SizedBox(height: 12),
          _WarningBanner(
            text: isDeadBatch
                ? '☠ DEAD BATCH — PERMANENTLY DESTROYED'
                : '⚠ SAFETY RECALL ACTIVE: ${p['recall_reason'] ?? ''}',
            color: AppTheme.danger,
          ),
        ],

        const SizedBox(height: 16),
        const Divider(color: AppTheme.border, height: 1),
        const SizedBox(height: 16),

        // Key facts grid
        _FactsGrid(facts: [
          _Fact('MANUFACTURER', p['manufacturer_name'] ?? '—'),
          _Fact('CUSTODIAN', p['current_custodian_name'] ?? '—'),
          _Fact('MFG DATE', _formatDate(p['mfg_date'])),
          _Fact('EXPIRY DATE', _formatDate(p['expiry_date']),
            danger: _isExpired(p['expiry_date'])),
          _Fact('QUANTITY', '${p['current_quantity'] ?? '—'} ${med['dosage_form'] ?? ''}'),
          _Fact('GTIN', p['gtin_barcode'] ?? '—'),
        ]),

        if (riskLevel != null) ...[
          const SizedBox(height: 16),
          _RiskBadge(
            level: riskLevel,
            score: p['latest_risk_score'],
          ),
        ],
      ]),
    );
  }

  // ── Journey Timeline ─────────────────────────────────────────────
  Widget _buildJourneySection(AsyncValue<List<Map<String, dynamic>>> eventsAsync) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Row(children: [
        Icon(Icons.route_outlined, color: AppTheme.accent, size: 18),
        SizedBox(width: 8),
        Text('SUPPLY CHAIN JOURNEY', style: TextStyle(
          color: AppTheme.accent, fontSize: 11,
          fontWeight: FontWeight.w700, letterSpacing: 1.2,
        )),
      ]),
      const SizedBox(height: 16),
      eventsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.accent)),
        error: (_, __) => const Text('Could not load journey',
          style: TextStyle(color: AppTheme.textMuted)),
        data: (events) {
          if (events.isEmpty) {
            return const Text('No events recorded',
              style: TextStyle(color: AppTheme.textMuted));
          }
          return Column(
            children: events.asMap().entries.map((entry) {
              final i = entry.key;
              final e = entry.value;
              final isLast = i == events.length - 1;
              return _JourneyEvent(event: e, isLast: isLast);
            }).toList(),
          );
        },
      ),
    ]);
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

  String _formatDate(dynamic d) {
    if (d == null) return '—';
    try {
      final dt = DateTime.parse(d.toString());
      return '${dt.day.toString().padLeft(2, '0')} '
          '${_months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return d.toString();
    }
  }

  bool _isExpired(dynamic d) {
    if (d == null) return false;
    try {
      return DateTime.parse(d.toString()).isBefore(DateTime.now());
    } catch (_) { return false; }
  }

  static const _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
}

// ── Journey Event Row ────────────────────────────────────────────────
class _JourneyEvent extends StatelessWidget {
  final Map<String, dynamic> event;
  final bool isLast;
  const _JourneyEvent({required this.event, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final type  = event['event_type'] ?? '';
    final color = _eventColor(type);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline column
          Column(children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
                border: Border.all(color: color.withValues(alpha: 0.4)),
              ),
              child: Icon(_eventIcon(type), color: color, size: 18),
            ),
            if (!isLast)
              Expanded(
                child: Container(
                  width: 2,
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter, end: Alignment.bottomCenter,
                      colors: [color.withValues(alpha: 0.4), Colors.transparent],
                    ),
                  ),
                ),
              ),
          ]),
          const SizedBox(width: 12),
          // Content
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.bgCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: color.withValues(alpha: 0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          _eventTitle(type),
                          style: TextStyle(
                            color: color, fontSize: 12,
                            fontWeight: FontWeight.w700, letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      Text(
                        _formatTs(event['timestamp']),
                        style: const TextStyle(
                          color: AppTheme.textMuted, fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    event['organization'] ?? event['actor'] ?? '',
                    style: const TextStyle(
                      color: AppTheme.textPrimary, fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (event['details'] != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      event['details'],
                      style: const TextStyle(
                        color: AppTheme.textSecondary, fontSize: 12, height: 1.4,
                      ),
                    ),
                  ],
                  if (event['quantity'] != null) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${event['quantity']} units',
                        style: TextStyle(
                          color: color, fontSize: 11, fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _eventColor(String t) {
    if (t.contains('MANUFACTURED')) return AppTheme.accent;
    if (t.contains('DISTRIBUTOR') || t.contains('DISTRIBUTION')) return AppTheme.primary;
    if (t.contains('PHARMACY')) return AppTheme.success;
    if (t.contains('RETURN')) return AppTheme.warning;
    if (t.contains('DESTROY') || t.contains('DEAD')) return AppTheme.danger;
    if (t.contains('DISPENSED') || t.contains('SALE')) return AppTheme.success;
    if (t.contains('RECALL')) return AppTheme.warning;
    if (t.contains('REENTRY')) return AppTheme.danger;
    return AppTheme.textSecondary;
  }

  IconData _eventIcon(String t) {
    if (t.contains('MANUFACTURED')) return Icons.precision_manufacturing_outlined;
    if (t.contains('DISTRIBUTOR')) return Icons.warehouse_outlined;
    if (t.contains('PHARMACY')) return Icons.local_pharmacy_outlined;
    if (t.contains('RETURN')) return Icons.keyboard_return_outlined;
    if (t.contains('DESTROY')) return Icons.local_fire_department_outlined;
    if (t.contains('DISPENSED')) return Icons.medication_outlined;
    if (t.contains('RECALL')) return Icons.warning_amber_rounded;
    if (t.contains('REENTRY')) return Icons.dangerous_outlined;
    return Icons.circle_outlined;
  }

  String _eventTitle(String t) => t.replaceAll('_', ' ');

  String _formatTs(dynamic ts) {
    if (ts == null) return '';
    try {
      final dt = DateTime.parse(ts.toString()).toLocal();
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) { return ''; }
  }
}

// ── Supporting widgets ───────────────────────────────────────────────
class _StatusPill extends StatelessWidget {
  final String status;
  final Color color;
  const _StatusPill({required this.status, required this.color});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: color.withValues(alpha: 0.4)),
    ),
    child: Text(status, style: TextStyle(
      color: color, fontSize: 11, fontWeight: FontWeight.w700,
    )),
  );
}

class _WarningBanner extends StatelessWidget {
  final String text;
  final Color color;
  const _WarningBanner({required this.text, required this.color});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: color.withValues(alpha: 0.4)),
    ),
    child: Row(children: [
      Icon(Icons.warning_amber_rounded, color: color, size: 16),
      const SizedBox(width: 8),
      Expanded(child: Text(text, style: TextStyle(
        color: color, fontSize: 12, fontWeight: FontWeight.w600,
      ))),
    ]),
  );
}

class _Fact {
  final String label, value;
  final bool danger;
  const _Fact(this.label, this.value, {this.danger = false});
}

class _FactsGrid extends StatelessWidget {
  final List<_Fact> facts;
  const _FactsGrid({required this.facts});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12, runSpacing: 12,
      children: facts.map((f) => SizedBox(
        width: (MediaQuery.of(context).size.width - 80) / 2,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(f.label, style: const TextStyle(
            color: AppTheme.textMuted, fontSize: 10,
            fontWeight: FontWeight.w600, letterSpacing: 0.8,
          )),
          const SizedBox(height: 2),
          Text(f.value, style: TextStyle(
            color: f.danger ? AppTheme.danger : AppTheme.textPrimary,
            fontSize: 13, fontWeight: FontWeight.w600,
          )),
        ]),
      )).toList(),
    );
  }
}

class _RiskBadge extends StatelessWidget {
  final String level;
  final dynamic score;
  const _RiskBadge({required this.level, this.score});

  @override
  Widget build(BuildContext context) {
    final color = level == 'CRITICAL' ? AppTheme.danger
        : level == 'HIGH' ? AppTheme.warning
        : level == 'MEDIUM' ? AppTheme.accent
        : AppTheme.success;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(children: [
        Icon(Icons.analytics_outlined, color: color, size: 18),
        const SizedBox(width: 10),
        Text('AI RISK SCORE', style: TextStyle(
          color: color, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8,
        )),
        const Spacer(),
        Text(level, style: TextStyle(
          color: color, fontSize: 13, fontWeight: FontWeight.w800,
        )),
        if (score != null) ...[
          const SizedBox(width: 8),
          Text('${(score * 100).toStringAsFixed(0)}%',
            style: TextStyle(color: color.withValues(alpha: 0.7), fontSize: 12)),
        ],
      ]),
    );
  }
}

class _ErrorBody extends StatelessWidget {
  final String batchId, error;
  const _ErrorBody({required this.batchId, required this.error});

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.search_off, color: AppTheme.danger, size: 64),
        const SizedBox(height: 16),
        Text('Batch "$batchId" not found',
          style: const TextStyle(color: AppTheme.textPrimary, fontSize: 18,
            fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Text(error, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
          textAlign: TextAlign.center),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: () => context.pop(),
          child: const Text('GO BACK'),
        ),
      ]),
    ),
  );
}
