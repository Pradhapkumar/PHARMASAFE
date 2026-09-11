import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../widgets/animated_stat_card.dart';
import '../widgets/live_alert_tile.dart';
import '../widgets/glowing_scan_button.dart';
import '../widgets/section_header.dart';

// ── Providers ──────────────────────────────────────────────────────
final dashStatsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) {
  return ref.read(apiServiceProvider).getDashboardStats();
});

final recentAlertsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return ref.read(apiServiceProvider).getAlerts(limit: 5);
});

final recentBatchesProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return ref.read(apiServiceProvider).getRecentBatches(limit: 6);
});

// ── Screen ─────────────────────────────────────────────────────────
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _navIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgBase,
      body: _navIndex == 0
          ? _buildHome()
          : _navIndex == 1
              ? _buildScanLauncher()
              : _buildAlertsTease(),
      bottomNavigationBar: _buildNavBar(),
    );
  }

  // ── Main Home ───────────────────────────────────────────────────
  Widget _buildHome() {
    final auth = ref.watch(authStateProvider);

    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        _buildSliverHeader(auth),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              const SizedBox(height: 8),
              if (auth.isAuthenticated) _buildRoleOperationsBanner(auth),
              if (auth.isAuthenticated) const SizedBox(height: 16),
              _buildLiveStatsBanner(),
              const SizedBox(height: 24),
              // Primary scan CTA
              GlowingScanButton(
                onTap: () => context.push('/scanner'),
              ),
              const SizedBox(height: 28),
              // Quick actions row
              _buildQuickActions(auth),
              const SizedBox(height: 28),
              const SectionHeader(title: 'LIVE ALERTS', icon: Icons.bolt, color: AppTheme.danger),
              const SizedBox(height: 12),
              _buildAlertsPreview(),
              const SizedBox(height: 24),
              const SectionHeader(title: 'RECENT BATCHES', icon: Icons.inventory_2, color: AppTheme.accent),
              const SizedBox(height: 12),
              _buildRecentBatches(),
              const SizedBox(height: 100),
            ]),
          ),
        ),
      ],
    );
  }

  // ── Sliver Header ───────────────────────────────────────────────
  SliverAppBar _buildSliverHeader(AuthState auth) {
    return SliverAppBar(
      expandedHeight: 140,
      floating: false,
      pinned: true,
      backgroundColor: AppTheme.bgBase,
      surfaceTintColor: Colors.transparent,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF0A1628), Color(0xFF060C18)],
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                top: -40,
                right: -40,
                child: Container(
                  width: 180,
                  height: 180,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(colors: [
                      AppTheme.primary.withValues(alpha: 0.15),
                      Colors.transparent,
                    ]),
                  ),
                ),
              ),
              Positioned(
                bottom: 16,
                left: 16,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppTheme.success,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        auth.isAuthenticated
                            ? 'ROLE: ${auth.role ?? 'FIELD USER'}'
                            : 'LIVE MONITORING ACTIVE',
                        style: const TextStyle(
                          color: AppTheme.success,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ]),
                    const SizedBox(height: 4),
                    ShaderMask(
                      shaderCallback: (bounds) => const LinearGradient(
                        colors: [AppTheme.primary, AppTheme.accent],
                      ).createShader(bounds),
                      child: const Text(
                        'PharmaSafe',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: -1,
                        ),
                      ),
                    ),
                    Text(
                      auth.orgName != null ? 'Org: ${auth.orgName}' : 'Medicine Intelligence Network',
                      style: const TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        IconButton(
          icon: Icon(
            auth.isAuthenticated ? Icons.account_circle : Icons.login,
            color: auth.isAuthenticated ? AppTheme.primary : AppTheme.textPrimary,
          ),
          tooltip: auth.isAuthenticated ? 'Logout / Profile' : 'Login',
          onPressed: () {
            if (auth.isAuthenticated) {
              _showUserDialog(context, auth);
            } else {
              context.push('/login');
            }
          },
        ),
        IconButton(
          icon: Stack(
            children: [
              const Icon(Icons.notifications_outlined, color: AppTheme.textPrimary, size: 26),
              Positioned(
                right: 0,
                top: 0,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppTheme.danger,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          ),
          onPressed: () => context.push('/alerts'),
        ),
        IconButton(
          icon: const Icon(Icons.search, color: AppTheme.textPrimary),
          onPressed: () => context.push('/search'),
        ),
        const SizedBox(width: 4),
      ],
    );
  }

  void _showUserDialog(BuildContext context, AuthState auth) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        title: const Text('Operator Session', style: TextStyle(color: AppTheme.textPrimary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Operator: ${auth.fullName ?? auth.email}', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
            const SizedBox(height: 4),
            Text('Role: ${auth.role}', style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text('Facility: ${auth.orgName}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              ref.read(authStateProvider.notifier).logout();
              Navigator.pop(ctx);
            },
            child: const Text('Logout', style: TextStyle(color: AppTheme.danger)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  // ── Role Operations Banner ───────────────────────────────────────
  Widget _buildRoleOperationsBanner(AuthState auth) {
    final role = auth.role ?? '';
    if (role == AppConstants.rolePharmacy) {
      return _buildRoleCard(
        title: 'PHARMACY POINT-OF-SALE GATE',
        subtitle: 'Enforce 8-point medicine safety pre-check prior to dispensing',
        icon: Icons.gavel_rounded,
        color: AppTheme.primary,
        onTap: () => context.push('/pos-sale'),
      );
    } else if (role == AppConstants.roleDistributor) {
      return _buildRoleCard(
        title: 'DISTRIBUTOR INBOUND RECEIVING',
        subtitle: 'Track live shipments and reconcile quantity discrepancies',
        icon: Icons.local_shipping_outlined,
        color: AppTheme.accent,
        onTap: () => context.push('/delivery-tracking'),
      );
    } else if (role == AppConstants.roleDisposalFacility) {
      return _buildRoleCard(
        title: 'DISPOSAL & DESTRUCTION GATEWAY',
        subtitle: 'Record digital weight, attach evidence & attest destruction',
        icon: Icons.delete_forever_outlined,
        color: AppTheme.danger,
        onTap: () => context.push('/disposal-workflow'),
      );
    }
    return const SizedBox.shrink();
  }

  Widget _buildRoleCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w800)),
                  Text(subtitle, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, color: color, size: 14),
          ],
        ),
      ),
    );
  }

  // ── Live Stats Banner ────────────────────────────────────────────
  Widget _buildLiveStatsBanner() {
    final stats = ref.watch(dashStatsProvider);
    return stats.when(
      loading: () => _buildStatsSkeleton(),
      error: (_, __) => _buildStatsFallback(),
      data: (data) {
        final totalBatches = data['total_batches'] ?? data['batches_total'] ?? '—';
        final criticalAlerts = data['critical_alerts'] ?? data['alerts_critical'] ?? '—';
        final verified = data['verified_today'] ?? data['scans_today'] ?? '—';
        final recalled = data['recalled_batches'] ?? data['batches_recalled'] ?? '—';
        return Column(
          children: [
            Row(children: [
              Expanded(
                child: AnimatedStatCard(
                  label: 'BATCHES',
                  value: '$totalBatches',
                  icon: Icons.inventory_2_outlined,
                  color: AppTheme.accent,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: AnimatedStatCard(
                  label: 'CRITICAL',
                  value: '$criticalAlerts',
                  icon: Icons.warning_amber_rounded,
                  color: AppTheme.danger,
                ),
              ),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: AnimatedStatCard(
                  label: 'VERIFIED TODAY',
                  value: '$verified',
                  icon: Icons.verified_outlined,
                  color: AppTheme.success,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: AnimatedStatCard(
                  label: 'RECALLED',
                  value: '$recalled',
                  icon: Icons.block_outlined,
                  color: AppTheme.warning,
                ),
              ),
            ]),
          ],
        );
      },
    );
  }

  Widget _buildStatsSkeleton() {
    return Column(children: [
      Row(children: [
        Expanded(child: _skeletonBox(height: 90)),
        const SizedBox(width: 12),
        Expanded(child: _skeletonBox(height: 90)),
      ]),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: _skeletonBox(height: 90)),
        const SizedBox(width: 12),
        Expanded(child: _skeletonBox(height: 90)),
      ]),
    ]);
  }

  Widget _buildStatsFallback() {
    return const Row(children: [
      Expanded(
        child: AnimatedStatCard(
          label: 'BATCHES',
          value: '—',
          icon: Icons.inventory_2_outlined,
          color: AppTheme.accent,
        ),
      ),
      SizedBox(width: 12),
      Expanded(
        child: AnimatedStatCard(
          label: 'CRITICAL',
          value: '—',
          icon: Icons.warning_amber_rounded,
          color: AppTheme.danger,
        ),
      ),
    ]);
  }

  // ── Quick Actions Row ────────────────────────────────────────────
  Widget _buildQuickActions(AuthState auth) {
    final actions = [
      _QuickAction('TRACK\nBATCH', Icons.local_shipping_outlined, AppTheme.accent, () => context.push('/search')),
      _QuickAction('SUPPLY\nCHAIN', Icons.account_tree_outlined, AppTheme.purple, () => context.push('/supply-chain')),
      _QuickAction('DEAD\nREGISTRY', Icons.dangerous_outlined, AppTheme.danger, () => context.push('/dead-batches')),
      _QuickAction('LIVE\nALERTS', Icons.bolt, AppTheme.warning, () => context.push('/alerts')),
    ];
    return Row(
      children: actions
          .map((a) => Expanded(
                child: GestureDetector(
                  onTap: a.onTap,
                  child: Container(
                    margin: EdgeInsets.only(right: a == actions.last ? 0 : 10),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: AppTheme.bgCard,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Column(children: [
                      Icon(a.icon, color: a.color, size: 24),
                      const SizedBox(height: 6),
                      Text(
                        a.label,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: a.color,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                          height: 1.3,
                        ),
                      ),
                    ]),
                  ),
                ),
              ))
          .toList(),
    );
  }

  // ── Alerts Preview ───────────────────────────────────────────────
  Widget _buildAlertsPreview() {
    final alerts = ref.watch(recentAlertsProvider);
    return alerts.when(
      loading: () => Column(
        children: List.generate(
          3,
          (_) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _skeletonBox(height: 72),
          ),
        ),
      ),
      error: (_, __) => _emptyState('Could not load alerts', Icons.wifi_off),
      data: (list) {
        if (list.isEmpty) return _emptyState('No alerts', Icons.check_circle_outline);
        return Column(
          children: [
            ...list.take(4).map((a) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: LiveAlertTile(alert: a),
                )),
            TextButton(
              onPressed: () => context.push('/alerts'),
              child: const Text('View all alerts →',
                  style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600)),
            ),
          ],
        );
      },
    );
  }

  // ── Recent Batches ───────────────────────────────────────────────
  Widget _buildRecentBatches() {
    final batches = ref.watch(recentBatchesProvider);
    return batches.when(
      loading: () => Column(
        children: List.generate(
          3,
          (_) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _skeletonBox(height: 64),
          ),
        ),
      ),
      error: (_, __) => _emptyState('Could not load batches', Icons.wifi_off),
      data: (list) {
        if (list.isEmpty) return _emptyState('No batches yet', Icons.inventory_2_outlined);
        return Column(
          children: list.take(6).map((b) => _BatchTile(batch: b)).toList(),
        );
      },
    );
  }

  // ── Scan Launcher (tab 1) ────────────────────────────────────────
  Widget _buildScanLauncher() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.push('/scanner');
    });
    return const Center(
      child: CircularProgressIndicator(color: AppTheme.primary),
    );
  }

  // ── Alerts Tease (tab 2) ─────────────────────────────────────────
  Widget _buildAlertsTease() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.push('/alerts');
        setState(() => _navIndex = 0);
      }
    });
    return const Center(
      child: CircularProgressIndicator(color: AppTheme.danger),
    );
  }

  // ── Bottom Nav ───────────────────────────────────────────────────
  Widget _buildNavBar() {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.bgCard,
        border: Border(top: BorderSide(color: AppTheme.border)),
      ),
      child: BottomNavigationBar(
        currentIndex: _navIndex,
        onTap: (i) {
          if (i == 1) {
            context.push('/scanner');
          } else if (i == 2) {
            context.push('/alerts');
          } else {
            setState(() => _navIndex = i);
          }
        },
        backgroundColor: Colors.transparent,
        elevation: 0,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.qr_code_scanner),
            label: 'Scan',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.notifications_outlined),
            activeIcon: Icon(Icons.notifications),
            label: 'Alerts',
          ),
        ],
      ),
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────
  Widget _skeletonBox({required double height}) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
    );
  }

  Widget _emptyState(String msg, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(children: [
        Icon(icon, color: AppTheme.textMuted, size: 20),
        const SizedBox(width: 10),
        Text(msg, style: const TextStyle(color: AppTheme.textMuted)),
      ]),
    );
  }
}

// ── Batch Tile ──────────────────────────────────────────────────────
class _BatchTile extends StatelessWidget {
  final Map<String, dynamic> batch;
  const _BatchTile({required this.batch});

  @override
  Widget build(BuildContext context) {
    final status = batch['status'] ?? '';
    final color = _statusColor(status);
    return GestureDetector(
      onTap: () => context.push('/batch/${batch['id']}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(children: [
          Container(
            width: 4,
            height: 40,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  batch['batch_number'] ?? 'Unknown',
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  batch['medicine']?['brand_name'] ?? '—',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: color.withValues(alpha: 0.3)),
            ),
            child: Text(
              status,
              style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(width: 6),
          const Icon(Icons.chevron_right, color: AppTheme.textMuted, size: 18),
        ]),
      ),
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'MANUFACTURED':
        return AppTheme.accent;
      case 'IN_DISTRIBUTION':
        return AppTheme.primary;
      case 'AT_PHARMACY':
        return AppTheme.success;
      case 'RECALLED':
        return AppTheme.warning;
      case 'DESTROYED':
      case 'DEAD_BATCH':
        return AppTheme.danger;
      default:
        return AppTheme.textMuted;
    }
  }
}

class _QuickAction {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  _QuickAction(this.label, this.icon, this.color, this.onTap);
}
