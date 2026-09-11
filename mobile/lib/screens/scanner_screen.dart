import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';
import '../services/api_service.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen>
    with TickerProviderStateMixin {
  final MobileScannerController _controller = MobileScannerController();
  late AnimationController _scanlineController;
  late AnimationController _cornerController;
  bool _isProcessing = false;
  bool _torchOn = false;

  @override
  void initState() {
    super.initState();
    _scanlineController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _cornerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    _scanlineController.dispose();
    _cornerController.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null || code.isEmpty) return;

    setState(() => _isProcessing = true);
    await _controller.stop();

    try {
      final result = await ApiService().scanVerify(scannedCode: code);
      if (mounted) {
        context.pushReplacement('/scan-result', extra: result);
      }
    } catch (e) {
      if (mounted) {
        context.pushReplacement('/scan-result', extra: {
          'verification_status': 'ERROR',
          'warning_message': 'Connection error: $e',
          'scanned_code': code,
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // ── Camera feed ──────────────────────────────────────────
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
          ),

          // ── Dark vignette overlay ────────────────────────────────
          Container(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.center,
                radius: 0.7,
                colors: [Colors.transparent, Colors.black87],
              ),
            ),
          ),

          // ── Scan frame ───────────────────────────────────────────
          Center(
            child: SizedBox(
              width: 260, height: 260,
              child: Stack(
                children: [
                  // Animated scan line
                  AnimatedBuilder(
                    animation: _scanlineController,
                    builder: (_, __) => Positioned(
                      top: _scanlineController.value * 250,
                      left: 0, right: 0,
                      child: Container(
                        height: 2,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Colors.transparent, AppTheme.primary, Colors.transparent],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primary.withValues(alpha: 0.8),
                              blurRadius: 8, spreadRadius: 2,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Corner decorators
                  const _Corner(top: 0, left: 0, corners: [true, false, false, false]),
                  const _Corner(top: 0, right: 0, corners: [false, true, false, false]),
                  const _Corner(bottom: 0, left: 0, corners: [false, false, true, false]),
                  const _Corner(bottom: 0, right: 0, corners: [false, false, false, true]),
                ],
              ),
            ),
          ),

          // ── Top bar ──────────────────────────────────────────────
          Positioned(
            top: 0, left: 0, right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    GestureDetector(
                      onTap: () => context.pop(),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white12),
                        ),
                        child: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
                      ),
                    ),
                    // Title
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.4)),
                      ),
                      child: const Row(children: [
                        Icon(Icons.qr_code_scanner, color: AppTheme.primary, size: 16),
                        SizedBox(width: 6),
                        Text('SCAN MEDICINE', style: TextStyle(
                          color: AppTheme.primary, fontSize: 12,
                          fontWeight: FontWeight.w700, letterSpacing: 1,
                        )),
                      ]),
                    ),
                    // Torch
                    GestureDetector(
                      onTap: () async {
                        await _controller.toggleTorch();
                        setState(() => _torchOn = !_torchOn);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: _torchOn ? AppTheme.primary.withValues(alpha: 0.2) : Colors.black54,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _torchOn ? AppTheme.primary : Colors.white12,
                          ),
                        ),
                        child: Icon(
                          _torchOn ? Icons.flash_on : Icons.flash_off,
                          color: _torchOn ? AppTheme.primary : Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── Bottom instruction ────────────────────────────────────
          Positioned(
            bottom: 0, left: 0, right: 0,
            child: Container(
              padding: const EdgeInsets.all(32),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter, end: Alignment.topCenter,
                  colors: [Colors.black87, Colors.transparent],
                ),
              ),
              child: Column(
                children: [
                  if (_isProcessing)
                    const Column(children: [
                      SizedBox(
                        width: 36, height: 36,
                        child: CircularProgressIndicator(
                          color: AppTheme.primary, strokeWidth: 2,
                        ),
                      ),
                      SizedBox(height: 12),
                      Text('Verifying with PharmaSafe Registry…',
                        style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600),
                        textAlign: TextAlign.center,
                      ),
                    ])
                  else
                    Column(children: [
                      const Text(
                        'Align QR code or barcode within frame',
                        style: TextStyle(
                          color: Colors.white70, fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      // Manual entry option
                      GestureDetector(
                        onTap: () => _showManualEntry(),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.white24),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Row(mainAxisSize: MainAxisSize.min, children: [
                            Icon(Icons.keyboard_alt_outlined, color: Colors.white60, size: 16),
                            SizedBox(width: 6),
                            Text('Enter Batch ID manually',
                              style: TextStyle(color: Colors.white60, fontSize: 13)),
                          ]),
                        ),
                      ),
                    ]),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showManualEntry() {
    final controller = TextEditingController();
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgCard,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          left: 24, right: 24, top: 24,
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 40, height: 4,
            decoration: BoxDecoration(
              color: AppTheme.border, borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          const Text('Enter Batch ID or QR Code',
            style: TextStyle(color: AppTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          TextField(
            controller: controller,
            autofocus: true,
            style: const TextStyle(color: AppTheme.textPrimary),
            decoration: const InputDecoration(
              hintText: 'e.g. B1001 or PHARMASAFE:B1001:...',
              prefixIcon: Icon(Icons.qr_code),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                final code = controller.text.trim();
                if (code.isEmpty) {
                  return;
                }
                Navigator.pop(context);
                setState(() => _isProcessing = true);
                try {
                  final result = await ApiService().scanVerify(scannedCode: code);
                  if (mounted) {
                    context.pushReplacement('/scan-result', extra: result);
                  }
                } catch (e) {
                  if (mounted) {
                    context.pushReplacement('/scan-result', extra: {
                      'verification_status': 'ERROR',
                      'warning_message': 'Error: $e',
                    });
                  }
                }
              },
              child: const Text('VERIFY NOW'),
            ),
          ),
        ]),
      ),
    );
  }
}

// ── Corner Decorator ────────────────────────────────────────────────
class _Corner extends StatelessWidget {
  final double? top, left, right, bottom;
  final List<bool> corners; // TL, TR, BL, BR

  const _Corner({
    this.top, this.left, this.right, this.bottom,
    required this.corners,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: top, left: left, right: right, bottom: bottom,
      child: SizedBox(
        width: 28, height: 28,
        child: CustomPaint(painter: _CornerPainter(corners)),
      ),
    );
  }
}

class _CornerPainter extends CustomPainter {
  final List<bool> corners;
  _CornerPainter(this.corners);

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = AppTheme.primary
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final w = size.width; final h = size.height;
    const l = 20.0;

    if (corners[0]) { // TL
      canvas.drawLine(const Offset(0, l), Offset.zero, p);
      canvas.drawLine(Offset.zero, const Offset(l, 0), p);
    }
    if (corners[1]) { // TR
      canvas.drawLine(Offset(w - l, 0), Offset(w, 0), p);
      canvas.drawLine(Offset(w, 0), Offset(w, l), p);
    }
    if (corners[2]) { // BL
      canvas.drawLine(Offset(0, h - l), Offset(0, h), p);
      canvas.drawLine(Offset(0, h), Offset(l, h), p);
    }
    if (corners[3]) { // BR
      canvas.drawLine(Offset(w - l, h), Offset(w, h), p);
      canvas.drawLine(Offset(w, h), Offset(w, h - l), p);
    }
  }

  @override
  bool shouldRepaint(_) => false;
}
