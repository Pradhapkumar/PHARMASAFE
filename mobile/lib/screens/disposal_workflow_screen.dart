import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/api_service.dart';

class DisposalWorkflowScreen extends ConsumerStatefulWidget {
  const DisposalWorkflowScreen({super.key});

  @override
  ConsumerState<DisposalWorkflowScreen> createState() => _DisposalWorkflowScreenState();
}

class _DisposalWorkflowScreenState extends ConsumerState<DisposalWorkflowScreen> {
  final _returnIdCtrl = TextEditingController(text: 'ret_b1001_demo');
  final _qtyCtrl = TextEditingController(text: '50');
  final _weightCtrl = TextEditingController(text: '12.4');
  final _notesCtrl = TextEditingController(text: 'Witnessed by Certified Environmental Officer');

  String _selectedMethod = 'INCINERATION';
  bool _isSubmitting = false;
  Map<String, dynamic>? _receiptResult;
  Map<String, dynamic>? _completionResult;
  String? _errorMessage;

  @override
  void dispose() {
    _returnIdCtrl.dispose();
    _qtyCtrl.dispose();
    _weightCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleDisposal() async {
    final retId = _returnIdCtrl.text.trim();
    if (retId.isEmpty) {
      setState(() => _errorMessage = 'Please enter Return ID or Batch ID');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final qty = int.tryParse(_qtyCtrl.text.trim()) ?? 1;
      final weight = double.tryParse(_weightCtrl.text.trim()) ?? 1.0;

      // 1. Record receipt at disposal facility
      final receipt = await ref.read(apiServiceProvider).recordDisposalReceipt(
        returnId: retId,
        receivedQuantity: qty,
        verifiedWeightKg: weight,
        photoEvidenceUrl: 'https://pharmasafe.demo/evidence/disposal_scale_${DateTime.now().millisecondsSinceEpoch}.jpg',
        notes: _notesCtrl.text.trim(),
      );

      final disposalId = receipt['id'] ?? receipt['disposal_id'] ?? retId;

      // 2. Submit disposal method to complete disposal
      final completion = await ref.read(apiServiceProvider).completeDisposal(
        disposalId: disposalId,
        method: _selectedMethod,
        notes: _notesCtrl.text.trim(),
      );

      setState(() {
        _receiptResult = receipt;
        _completionResult = completion;
        _isSubmitting = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Disposal execution failed: ${e.toString().replaceAll('Exception: ', '')}';
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgBase,
      appBar: AppBar(
        title: const Text('DISPOSAL FACILITY WORKFLOW'),
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
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.danger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.delete_forever_outlined, color: AppTheme.danger, size: 26),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Authorized Hazardous Medicine Destruction & Disposal Gateway. Final state: DISPOSED.',
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 12, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            TextField(
              controller: _returnIdCtrl,
              decoration: const InputDecoration(
                labelText: 'Return ID or Batch Number',
                prefixIcon: Icon(Icons.qr_code_scanner),
              ),
            ),
            const SizedBox(height: 14),

            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _qtyCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Received Units'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _weightCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Scale Weight (kg)',
                      suffixText: 'kg',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            DropdownButtonFormField<String>(
              initialValue: _selectedMethod,
              decoration: const InputDecoration(
                labelText: 'Destruction / Disposal Protocol',
                prefixIcon: Icon(Icons.local_fire_department_outlined),
              ),
              dropdownColor: AppTheme.bgCard,
              items: AppConstants.disposalMethods
                  .map((m) => DropdownMenuItem(
                        value: m,
                        child: Text(m.replaceAll('_', ' ')),
                      ))
                  .toList(),
              onChanged: (val) {
                if (val != null) setState(() => _selectedMethod = val);
              },
            ),
            const SizedBox(height: 14),

            // Simulated Camera Evidence Box
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.bgCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppTheme.accent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.camera_alt_outlined, color: AppTheme.accent),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Weight Scale Evidence Photo', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                        Text('Captured from Mobile Lens (Attached)', style: TextStyle(color: AppTheme.success, fontSize: 11)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            TextField(
              controller: _notesCtrl,
              decoration: const InputDecoration(
                labelText: 'Environmental Certification Notes',
                prefixIcon: Icon(Icons.verified_outlined),
              ),
            ),
            const SizedBox(height: 22),

            ElevatedButton.icon(
              icon: _isSubmitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                    )
                  : const Icon(Icons.local_fire_department),
              label: const Text('EXECUTE & ATTEST DISPOSAL'),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger, foregroundColor: Colors.white),
              onPressed: _isSubmitting ? null : _handleDisposal,
            ),
            const SizedBox(height: 20),

            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.danger.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
                ),
                child: Text(_errorMessage!, style: const TextStyle(color: AppTheme.danger, fontSize: 13)),
              ),

            if (_receiptResult != null || _completionResult != null)
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppTheme.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppTheme.success.withValues(alpha: 0.4)),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.verified, color: AppTheme.success),
                        SizedBox(width: 8),
                        Text(
                          'DISPOSAL PROTOCOL COMPLETED',
                          style: TextStyle(color: AppTheme.success, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Batch status transitioned to DISPOSED. Minted in National Environmental Registry.',
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 12),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
