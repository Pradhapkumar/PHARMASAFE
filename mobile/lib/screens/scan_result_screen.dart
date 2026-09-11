import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';
import '../core/constants.dart';

class ScanResultScreen extends StatefulWidget {
  final Map<String, dynamic> result;
  const ScanResultScreen({super.key, required this.result});

  @override
  State<ScanResultScreen> createState() => _ScanResultScreenState();
}

class _ScanResultScreenState extends State<ScanResultScreen>
    with TickerProviderStateMixin {
  late AnimationController _slideController;
  late AnimationController _pulseController;
  late Animation<Offset> _slideAnim;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _slideController, curve: Curves.easeOutCubic));

    _pulseAnim = Tween<double>(begin: 0.95, end: 1.05).animate(_pulseController);

    _slideController.forward();

    // Haptic feedback based on result
    final status = widget.result['verification_status'] ?? '';
    if (status == AppConstants.vsAuthentic) {
      HapticFeedback.lightImpact();
    } else if (status == AppConstants.vsDeadBatch || status == AppConstants.vsRecalled) {
      HapticFeedback.heavyImpact();
    } else {
      HapticFeedback.mediumImpact();
    }
  }

  @override
  void dispose() {
    _slideController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.result;
    final status = r['verification_status'] ?? 'UNKNOWN_NOT_FOUND';
    final config = _getConfig(status);

    return Scaffold(
      backgroundColor: config.bgColor,
      body: Stack(
        children: [
          // Background glow
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _pulseAnim,
              builder: (_, __) => Container(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment.topCenter,
                    radius: _pulseAnim.value * 1.5,
                    colors: [
                      config.accentColor.withValues(alpha: 0.15),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),

          SafeArea(
            child: SlideTransition(
              position: _slideAnim,
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const SizedBox(height: 16),

                    // ── Result Icon ───────────────────────────────
                    AnimatedBuilder(
                      animation: _pulseAnim,
                      builder: (_, child) => Transform.scale(
                        scale: _pulseAnim.value,
                        child: child,
                      ),
                      child: Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: config.accentColor.withValues(alpha: 0.12),
                          border: Border.all(
                            color: config.accentColor.withValues(alpha: 0.4),
                            width: 2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: config.accentColor.withValues(alpha: 0.3),
                              blurRadius: 40,
                              spreadRadius: 8,
                            ),
                          ],
                        ),
                        child: Icon(config.icon, color: config.accentColor, size: 56),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // ── Status Label ──────────────────────────────
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      decoration: BoxDecoration(
                        color: config.accentColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: config.accentColor.withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        config.statusLabel,
                        style: TextStyle(
                          color: config.accentColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // ── Main title ────────────────────────────────
                    Text(
                      config.title,
                      style: TextStyle(
                        color: config.accentColor,
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),

                    // ── Warning/Reason ────────────────────────────
                    if (r['warning_message'] != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Text(
                          r['warning_message'],
                          style: TextStyle(
                            color: config.accentColor.withValues(alpha: 0.7),
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            height: 1.5,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),

                    const SizedBox(height: 32),

                    // ── Detail Card ───────────────────────────────
                    _buildDetailCard(r, config),

                    const SizedBox(height: 24),

                    // ── CTA Buttons ───────────────────────────────
                    _buildActions(r, status, config, context),

                    const SizedBox(height: 16),

                    TextButton(
                      onPressed: () => context.go('/'),
                      child: const Text(
                        '← Back to Home',
                        style: TextStyle(color: AppTheme.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailCard(Map<String, dynamic> r, _ResultConfig config) {
    final rows = <_DetailRow>[];

    if (r['batch_number'] != null) {
      rows.add(_DetailRow('Batch Number', r['batch_number']));
    }
    if (r['brand_name'] != null) {
      rows.add(_DetailRow('Medicine', r['brand_name']));
    }
    if (r['generic_name'] != null) {
      rows.add(_DetailRow('Generic', r['generic_name']));
    }
    if (r['manufacturer_name'] != null) {
      rows.add(_DetailRow('Manufacturer', r['manufacturer_name']));
    }
    if (r['expiry_date'] != null) {
      rows.add(_DetailRow('Expiry Date', r['expiry_date'], warn: r['is_expired'] == true));
    }
    if (r['is_recalled'] == true) {
      rows.add(const _DetailRow('Recall Status', '⚠️ RECALLED', danger: true));
    }
    if (r['is_dead_batch_reentry'] == true) {
      rows.add(const _DetailRow('Registry', '☠️ DEAD BATCH — DESTROYED', danger: true));
    }

    if (rows.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: config.accentColor.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: rows
            .map((row) => Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: Text(
                          row.label,
                          style: const TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 3,
                        child: Text(
                          row.value,
                          style: TextStyle(
                            color: row.danger
                                ? AppTheme.danger
                                : row.warn
                                    ? AppTheme.warning
                                    : AppTheme.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                          textAlign: TextAlign.right,
                        ),
                      ),
                    ],
                  ),
                ))
            .toList(),
      ),
    );
  }

  Widget _buildActions(
      Map<String, dynamic> r, String status, _ResultConfig config, BuildContext ctx) {
    final batchId = r['batch_id'] ?? r['batch_number'];

    if (status == AppConstants.vsAuthentic) {
      return Column(children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.gavel_rounded),
            label: const Text('DISPENSE AT PHARMACY (POS GATE)'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.black,
            ),
            onPressed: batchId != null
                ? () => ctx.push('/pos-sale?batchId=$batchId')
                : null,
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            icon: const Icon(Icons.route_outlined),
            label: const Text('VIEW BATCH PASSPORT'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppTheme.success,
              side: const BorderSide(color: AppTheme.success),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            onPressed: batchId != null ? () => ctx.push('/batch/$batchId') : null,
          ),
        ),
      ]);
    }

    if (status == AppConstants.vsDeadBatch ||
        status == AppConstants.vsRecalled ||
        status == AppConstants.vsExpired) {
      return Column(children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.assignment_return),
            label: const Text('INITIATE REVERSE RETURN'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.warning,
              foregroundColor: Colors.black,
            ),
            onPressed: () {
              ctx.push('/return-create', extra: {
                'batch_number': batchId,
                'reason': status == AppConstants.vsExpired ? 'EXPIRED' : 'RECALLED_OR_DEAD',
              });
            },
          ),
        ),
        const SizedBox(height: 10),
        if (batchId != null)
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              icon: const Icon(Icons.warning_amber_rounded),
              label: const Text('VIEW INCIDENT PASSPORT'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.danger,
                side: const BorderSide(color: AppTheme.danger),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: () => ctx.push('/batch/$batchId'),
            ),
          ),
      ]);
    }

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        icon: const Icon(Icons.qr_code_scanner),
        label: const Text('SCAN ANOTHER'),
        onPressed: () => ctx.push('/scanner'),
      ),
    );
  }

  _ResultConfig _getConfig(String status) {
    switch (status) {
      case AppConstants.vsAuthentic:
        return const _ResultConfig(
          accentColor: AppTheme.success,
          bgColor: Color(0xFF03120C),
          icon: Icons.verified_rounded,
          title: 'Medicine Verified',
          statusLabel: '✓ AUTHENTIC',
        );
      case AppConstants.vsExpired:
        return const _ResultConfig(
          accentColor: AppTheme.warning,
          bgColor: Color(0xFF130E02),
          icon: Icons.timer_off_outlined,
          title: 'SALE BLOCKED',
          statusLabel: '⚠ EXPIRED',
        );
      case AppConstants.vsRecalled:
        return const _ResultConfig(
          accentColor: AppTheme.danger,
          bgColor: Color(0xFF130204),
          icon: Icons.block_outlined,
          title: 'SALE BLOCKED',
          statusLabel: '✕ RECALLED',
        );
      case AppConstants.vsDeadBatch:
        return const _ResultConfig(
          accentColor: AppTheme.danger,
          bgColor: Color(0xFF130204),
          icon: Icons.dangerous_outlined,
          title: 'CRITICAL DANGER',
          statusLabel: '☠ DESTROYED BATCH',
        );
      case AppConstants.vsFlagged:
        return const _ResultConfig(
          accentColor: AppTheme.warning,
          bgColor: Color(0xFF130E02),
          icon: Icons.flag_outlined,
          title: 'Under Review',
          statusLabel: '⚑ FLAGGED SUSPICIOUS',
        );
      default:
        return const _ResultConfig(
          accentColor: AppTheme.textSecondary,
          bgColor: AppTheme.bgBase,
          icon: Icons.help_outline,
          title: 'Not Found',
          statusLabel: '? UNKNOWN',
        );
    }
  }
}

class _ResultConfig {
  final Color accentColor;
  final Color bgColor;
  final IconData icon;
  final String title;
  final String statusLabel;
  const _ResultConfig({
    required this.accentColor,
    required this.bgColor,
    required this.icon,
    required this.title,
    required this.statusLabel,
  });
}

class _DetailRow {
  final String label;
  final String value;
  final bool warn;
  final bool danger;
  const _DetailRow(this.label, this.value, {this.warn = false, this.danger = false});
}
