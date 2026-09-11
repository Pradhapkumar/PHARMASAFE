import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';

/// Compact alert tile for the home screen feed
class LiveAlertTile extends StatelessWidget {
  final Map<String, dynamic> alert;
  const LiveAlertTile({super.key, required this.alert});

  @override
  Widget build(BuildContext context) {
    final sev   = (alert['severity'] ?? '').toString().toUpperCase();
    final color = _sevColor(sev);
    final isCrit = sev == 'CRITICAL';

    return GestureDetector(
      onTap: () {
        if (alert['entity_id'] != null) {
          context.push('/batch/${alert['entity_id']}');
        } else {
          context.push('/alerts');
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isCrit ? color.withValues(alpha: 0.07) : AppTheme.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isCrit ? color.withValues(alpha: 0.3) : AppTheme.border,
          ),
        ),
        child: Row(children: [
          // Color bar
          Container(
            width: 3, height: 40,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          Icon(_sevIcon(sev), color: color, size: 18),
          const SizedBox(width: 10),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                alert['title'] ?? alert['alert_type'] ?? 'Alert',
                style: const TextStyle(
                  color: AppTheme.textPrimary, fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                _formatTime(alert['created_at'] ?? alert['timestamp']),
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
              ),
            ],
          )),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(sev, style: TextStyle(
              color: color, fontSize: 9, fontWeight: FontWeight.w700,
            )),
          ),
        ]),
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
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${diff.inDays}d ago';
    } catch (_) { return ''; }
  }
}
