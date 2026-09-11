import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';
import '../services/api_service.dart';

final allAlertsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return ref.read(apiServiceProvider).getAlerts(limit: 100);
});

class AlertsScreen extends ConsumerStatefulWidget {
  const AlertsScreen({super.key});

  @override
  ConsumerState<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends ConsumerState<AlertsScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _headerPulse;
  String _filter = 'ALL';

  @override
  void initState() {
    super.initState();
    _headerPulse = AnimationController(
      vsync: this, duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _headerPulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final alertsAsync = ref.watch(allAlertsProvider);
    return Scaffold(
      backgroundColor: AppTheme.bgBase,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          _buildHeader(),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                const SizedBox(height: 16),
                _buildFilterRow(),
                const SizedBox(height: 16),
                alertsAsync.when(
                  loading: _buildSkeleton,
                  error: (e, _) => _buildError(e.toString()),
                  data: (alerts) => _buildAlertsList(alerts),
                ),
                const SizedBox(height: 60),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  // ── Header ───────────────────────────────────────────────────────
  SliverAppBar _buildHeader() {
    return SliverAppBar(
      expandedHeight: 120,
      pinned: true,
      backgroundColor: AppTheme.bgBase,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () => context.pop(),
      ),
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          children: [
            // Danger glow
            AnimatedBuilder(
              animation: _headerPulse,
              builder: (_, __) => Positioned(
                top: -60, right: -40,
                child: Container(
                  width: 200, height: 200,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(colors: [
                      AppTheme.danger.withValues(alpha: 0.15 * _headerPulse.value),
                      Colors.transparent,
                    ]),
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: 16, left: 16,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(children: [
                    AnimatedBuilder(
                      animation: _headerPulse,
                      builder: (_, __) => Container(
                        width: 8, height: 8,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppTheme.danger,
                          boxShadow: [BoxShadow(
                            color: AppTheme.danger.withValues(alpha: _headerPulse.value),
                            blurRadius: 8, spreadRadius: 2,
                          )],
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text('LIVE THREAT FEED', style: TextStyle(
                      color: AppTheme.danger, fontSize: 10,
                      fontWeight: FontWeight.w700, letterSpacing: 1.5,
                    )),
                  ]),
                  const SizedBox(height: 4),
                  const Text('Security Alerts', style: TextStyle(
                    color: AppTheme.textPrimary, fontSize: 28,
                    fontWeight: FontWeight.w800, letterSpacing: -0.5,
                  )),
                ],
              ),
            ),
          ],
        ),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh, color: AppTheme.textPrimary),
          onPressed: () => ref.invalidate(allAlertsProvider),
        ),
      ],
    );
  }

  // ── Filter Row ───────────────────────────────────────────────────
  Widget _buildFilterRow() {
    final filters = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: filters.map((f) {
          final selected = _filter == f;
          final color = f == 'ALL' ? AppTheme.accent
              : f == 'CRITICAL' ? AppTheme.danger
              : f == 'HIGH' ? AppTheme.warning
              : AppTheme.textSecondary;
          return GestureDetector(
            onTap: () => setState(() => _filter = f),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: selected ? color.withValues(alpha: 0.15) : AppTheme.bgCard,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: selected ? color : AppTheme.border,
                ),
              ),
              child: Text(
                f,
                style: TextStyle(
                  color: selected ? color : AppTheme.textMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── Alerts List ──────────────────────────────────────────────────
  Widget _buildAlertsList(List<Map<String, dynamic>> alerts) {
    var filtered = _filter == 'ALL'
        ? alerts
        : alerts.where((a) =>
            (a['severity'] ?? '').toString().toUpperCase() == _filter).toList();

    if (filtered.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(40),
        child: const Column(
          children: [
            Icon(Icons.check_circle_outline, color: AppTheme.success, size: 48),
            SizedBox(height: 12),
            Text('No alerts found', style: TextStyle(
              color: AppTheme.textSecondary, fontSize: 16)),
          ],
        ),
      );
    }

    return Column(
      children: filtered.map((a) => _AlertCard(alert: a)).toList(),
    );
  }

  Widget _buildSkeleton() {
    return Column(
      children: List.generate(6, (_) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        height: 90,
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
      )),
    );
  }

  Widget _buildError(String msg) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.dangerGlow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
      ),
      child: Row(children: [
        const Icon(Icons.wifi_off, color: AppTheme.danger),
        const SizedBox(width: 12),
        Expanded(child: Text('Backend unreachable\n$msg',
          style: const TextStyle(color: AppTheme.danger, fontSize: 13))),
        IconButton(
          icon: const Icon(Icons.refresh, color: AppTheme.danger),
          onPressed: () => ref.invalidate(allAlertsProvider),
        ),
      ]),
    );
  }
}

// ── Alert Card ──────────────────────────────────────────────────────
class _AlertCard extends StatefulWidget {
  final Map<String, dynamic> alert;
  const _AlertCard({required this.alert});

  @override
  State<_AlertCard> createState() => _AlertCardState();
}

class _AlertCardState extends State<_AlertCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _shimmer;
  bool _expanded = false;

  @override
  void initState() {
    super.initState();
    _shimmer = AnimationController(
      vsync: this, duration: const Duration(seconds: 3),
    );
    final sev = (widget.alert['severity'] ?? '').toString().toUpperCase();
    if (sev == 'CRITICAL') _shimmer.repeat();
  }

  @override
  void dispose() {
    _shimmer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.alert;
    final sev = (a['severity'] ?? '').toString().toUpperCase();
    final color = _sevColor(sev);
    final isCrit = sev == 'CRITICAL';

    return GestureDetector(
      onTap: () => setState(() => _expanded = !_expanded),
      child: AnimatedBuilder(
        animation: _shimmer,
        builder: (_, child) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isCrit
                  ? color.withValues(alpha: (0.4 + 0.3 * _shimmer.value).clamp(0.0, 1.0))
                  : color.withValues(alpha: 0.25),
              width: isCrit ? 1.5 : 1,
            ),
            gradient: isCrit
                ? LinearGradient(
                    begin: Alignment.topLeft, end: Alignment.bottomRight,
                    colors: [
                      color.withValues(alpha: 0.08),
                      AppTheme.bgCard,
                    ],
                  )
                : null,
            color: isCrit ? null : AppTheme.bgCard,
            boxShadow: isCrit ? [BoxShadow(
              color: color.withValues(alpha: (0.15 * _shimmer.value).clamp(0.0, 1.0)),
              blurRadius: 16, spreadRadius: 0,
            )] : null,
          ),
          child: child,
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Severity badge
                  Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(_sevIcon(sev), color: color, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(sev,
                              style: TextStyle(
                                color: color, fontSize: 9,
                                fontWeight: FontWeight.w800, letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              _formatTime(a['created_at'] ?? a['timestamp']),
                              style: const TextStyle(
                                color: AppTheme.textMuted, fontSize: 11,
                              ),
                              textAlign: TextAlign.right,
                            ),
                          ),
                        ]),
                        const SizedBox(height: 4),
                        Text(
                          a['title'] ?? a['alert_type'] ?? 'Alert',
                          style: const TextStyle(
                            color: AppTheme.textPrimary, fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: _expanded ? null : 1,
                          overflow: _expanded ? null : TextOverflow.ellipsis,
                        ),
                        if (!_expanded && a['message'] != null)
                          Text(
                            a['message'],
                            style: const TextStyle(
                              color: AppTheme.textSecondary, fontSize: 12,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                  ),
                  Icon(
                    _expanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                    color: AppTheme.textMuted, size: 18,
                  ),
                ],
              ),
              if (_expanded && a['message'] != null) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.bgElevated,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Text(
                    a['message'],
                    style: const TextStyle(
                      color: AppTheme.textSecondary, fontSize: 13, height: 1.5,
                    ),
                  ),
                ),
                if (a['entity_type'] == 'BATCH' && a['entity_id'] != null) ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.route_outlined, size: 16),
                      label: const Text('VIEW BATCH JOURNEY'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: color,
                        side: BorderSide(color: color.withValues(alpha: 0.5)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      onPressed: () => context.push('/batch/${a['entity_id']}'),
                    ),
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }

  Color _sevColor(String s) {
    switch (s) {
      case 'CRITICAL': return AppTheme.danger;
      case 'HIGH': return AppTheme.warning;
      case 'MEDIUM': return AppTheme.accent;
      default: return AppTheme.textSecondary;
    }
  }

  IconData _sevIcon(String s) {
    switch (s) {
      case 'CRITICAL': return Icons.dangerous_outlined;
      case 'HIGH': return Icons.warning_amber_rounded;
      case 'MEDIUM': return Icons.info_outline;
      default: return Icons.notifications_outlined;
    }
  }

  String _formatTime(dynamic ts) {
    if (ts == null) return '';
    try {
      final dt = DateTime.parse(ts.toString()).toLocal();
      final now = DateTime.now();
      final diff = now.difference(dt);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${diff.inDays}d ago';
    } catch (_) {
      return '';
    }
  }
}
