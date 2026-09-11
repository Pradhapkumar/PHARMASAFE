import 'package:flutter/material.dart';

class SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;

  const SectionHeader({
    super.key,
    required this.title,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Icon(icon, color: color, size: 16),
      const SizedBox(width: 8),
      Text(
        title,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.3,
        ),
      ),
      const SizedBox(width: 8),
      Expanded(child: Container(height: 1, color: color.withValues(alpha: 0.15))),
    ]);
  }
}
