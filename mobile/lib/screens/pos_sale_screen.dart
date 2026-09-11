import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';
import '../services/api_service.dart';

class PosSaleScreen extends ConsumerStatefulWidget {
  final String? initialBatchId;
  const PosSaleScreen({super.key, this.initialBatchId});

  @override
  ConsumerState<PosSaleScreen> createState() => _PosSaleScreenState();
}

class _PosSaleScreenState extends ConsumerState<PosSaleScreen> {
  final _batchCtrl = TextEditingController();
  final _qtyCtrl = TextEditingController(text: '1');
  final _refCtrl = TextEditingController(text: 'RX-DEMO-2026');

  bool _isChecking = false;
  bool _isDispensing = false;
  Map<String, dynamic>? _verifyResult;
  Map<String, dynamic>? _dispenseResult;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (widget.initialBatchId != null && widget.initialBatchId!.isNotEmpty) {
      _batchCtrl.text = widget.initialBatchId!;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _runVerification();
      });
    }
  }

  @override
  void dispose() {
    _batchCtrl.dispose();
    _qtyCtrl.dispose();
    _refCtrl.dispose();
    super.dispose();
  }

  Future<void> _runVerification() async {
    final batchId = _batchCtrl.text.trim();
    if (batchId.isEmpty) return;

    setState(() {
      _isChecking = true;
      _errorMessage = null;
      _verifyResult = null;
      _dispenseResult = null;
    });

    try {
      final qty = int.tryParse(_qtyCtrl.text.trim()) ?? 1;
      final res = await ref.read(apiServiceProvider).verifySaleEligibility(
        batchIdentifier: batchId,
        quantity: qty,
        customerReference: _refCtrl.text.trim(),
      );
      setState(() {
        _verifyResult = res;
        _isChecking = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Verification failed: ${e.toString().replaceAll('Exception: ', '')}';
        _isChecking = false;
      });
    }
  }

  Future<void> _executeDispensation() async {
    final batchId = _batchCtrl.text.trim();
    if (batchId.isEmpty || _verifyResult == null) return;

    setState(() {
      _isDispensing = true;
      _errorMessage = null;
    });

    try {
      final qty = int.tryParse(_qtyCtrl.text.trim()) ?? 1;
      final res = await ref.read(apiServiceProvider).executeSale(
        batchIdentifier: batchId,
        quantity: qty,
        customerReference: _refCtrl.text.trim(),
      );
      setState(() {
        _dispenseResult = res;
        _isDispensing = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Dispensation failed: ${e.toString().replaceAll('Exception: ', '')}';
        _isDispensing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgBase,
      appBar: AppBar(
        title: const Text('POINT-OF-SALE GATE'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.gavel_rounded, color: AppTheme.primary, size: 24),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Authoritative Point-of-Sale Verification Gate. Blocked batches cannot be dispensed.',
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 12, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Input fields
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: TextField(
                    controller: _batchCtrl,
                    decoration: InputDecoration(
                      labelText: 'Batch Number / Barcode',
                      hintText: 'e.g. B1001, LIVE-VALID-001',
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.qr_code_scanner, color: AppTheme.primary),
                        onPressed: () async {
                          context.push('/scanner');
                        },
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 1,
                  child: TextField(
                    controller: _qtyCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Qty'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _refCtrl,
              decoration: const InputDecoration(
                labelText: 'Prescription / Customer Reference',
                prefixIcon: Icon(Icons.receipt_long_outlined),
              ),
            ),
            const SizedBox(height: 16),

            ElevatedButton.icon(
              icon: _isChecking
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                    )
                  : const Icon(Icons.security),
              label: const Text('RUN SAFETY PRE-CHECK'),
              onPressed: _isChecking ? null : _runVerification,
            ),
            const SizedBox(height: 24),

            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(14),
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: AppTheme.danger.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppTheme.danger),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(_errorMessage!, style: const TextStyle(color: AppTheme.danger, fontSize: 13)),
                    ),
                  ],
                ),
              ),

            // Result Card
            if (_verifyResult != null) _buildResultCard(_verifyResult!),

            // Dispensation success card
            if (_dispenseResult != null) _buildDispensedCard(_dispenseResult!),
          ],
        ),
      ),
    );
  }

  Widget _buildResultCard(Map<String, dynamic> r) {
    final isEligible = r['is_eligible_for_sale'] == true;
    final verdict = r['verdict'] ?? (isEligible ? 'ALLOW_SALE' : 'BLOCK_SALE');
    final color = isEligible ? AppTheme.success : AppTheme.danger;
    final checks = (r['checks'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.4), width: 1.5),
        boxShadow: [
          BoxShadow(color: color.withValues(alpha: 0.1), blurRadius: 20),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: color.withValues(alpha: 0.4)),
                ),
                child: Text(
                  verdict,
                  style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1),
                ),
              ),
              const Spacer(),
              Icon(isEligible ? Icons.check_circle : Icons.dangerous, color: color, size: 28),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            r['medicine_name'] ?? 'Batch: ${_batchCtrl.text}',
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.w700),
          ),
          if (r['block_message'] != null) ...[
            const SizedBox(height: 8),
            Text(
              r['block_message'],
              style: const TextStyle(color: AppTheme.danger, fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ],
          const SizedBox(height: 16),
          const Text(
            '8-POINT SAFETY PIPELINE:',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.2),
          ),
          const SizedBox(height: 8),
          ...checks.map((c) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Icon(
                      c['passed'] == true ? Icons.check : Icons.close,
                      color: c['passed'] == true ? AppTheme.success : AppTheme.danger,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        c['name'] ?? '',
                        style: TextStyle(
                          color: c['passed'] == true ? AppTheme.textPrimary : AppTheme.danger,
                          fontSize: 12,
                          fontWeight: c['passed'] == true ? FontWeight.w400 : FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              )),
          const SizedBox(height: 20),

          // Action buttons
          if (isEligible)
            ElevatedButton.icon(
              icon: _isDispensing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                    )
                  : const Icon(Icons.local_pharmacy),
              label: const Text('EXECUTE DISPENSATION'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.success,
                foregroundColor: Colors.black,
              ),
              onPressed: _isDispensing ? null : _executeDispensation,
            )
          else
            Column(
              children: [
                OutlinedButton.icon(
                  icon: const Icon(Icons.assignment_return),
                  label: const Text('INITIATE REVERSE RETURN'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.warning,
                    side: const BorderSide(color: AppTheme.warning),
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                  ),
                  onPressed: () {
                    context.push('/return-create', extra: {
                      'batch_number': _batchCtrl.text.trim(),
                      'reason': 'EXPIRED_OR_RECALLED',
                    });
                  },
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildDispensedCard(Map<String, dynamic> d) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.success.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.success.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.verified, color: AppTheme.success, size: 24),
              SizedBox(width: 10),
              Text(
                'DISPENSATION RECORDED',
                style: TextStyle(color: AppTheme.success, fontSize: 14, fontWeight: FontWeight.w800),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Ledger Transaction ID: ${d['id'] ?? 'TXN-OK'}',
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 12, fontFamily: 'monospace'),
          ),
          const SizedBox(height: 4),
          Text(
            'Quantity Sold: ${d['quantity_sold'] ?? 1} units',
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
