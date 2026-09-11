import 'package:flutter/material.dart';
import '../core/theme.dart';

/// Large glowing primary scan CTA button
class GlowingScanButton extends StatefulWidget {
  final VoidCallback onTap;
  const GlowingScanButton({super.key, required this.onTap});

  @override
  State<GlowingScanButton> createState() => _GlowingScanButtonState();
}

class _GlowingScanButtonState extends State<GlowingScanButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulse;
  late Animation<double> _glowSize;
  bool _pressed = false;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this, duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _glowSize = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _pulse, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        widget.onTap();
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedBuilder(
        animation: _glowSize,
        builder: (_, child) => AnimatedScale(
          scale: _pressed ? 0.95 : 1.0,
          duration: const Duration(milliseconds: 100),
          child: Container(
            height: 72,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.primary, Color(0xFF00A88C)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primary.withValues(alpha: (0.4 * _glowSize.value).clamp(0.0, 1.0)),
                  blurRadius: 24 * _glowSize.value,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: child,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 16),
            const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SCAN MEDICINE',
                  style: TextStyle(
                    color: Colors.black,
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
                Text(
                  'Verify authenticity instantly',
                  style: TextStyle(
                    color: Colors.black54,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const Spacer(),
            const Padding(
              padding: EdgeInsets.only(right: 20),
              child: Icon(Icons.arrow_forward, color: Colors.black, size: 22),
            ),
          ],
        ),
      ),
    );
  }
}
