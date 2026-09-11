import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';
import '../services/api_service.dart';

class ReturnCreateScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic>? initialData;
  const ReturnCreateScreen({super.key, this.initialData});

  @override
  ConsumerState<ReturnCreateScreen> createState() => _ReturnCreateScreenState();
}

class _ReturnCreateScreenState extends ConsumerState<ReturnCreateScreen> {
  final _batchCtrl = TextEditingController();
  final _qtyCtrl = TextEditingController(text: '10');
  final _carrierCtrl = TextEditingController(text: 'PharmaSafe Logistics Express');
  final _facilityCtrl = TextEditingController(text: 'org_disposal_01');
  final _notesCtrl = TextEditingController();

  String _reason = 'EXPIRED_OR_RECALLED';
  bool _isSubmitting = false;
  Map<String, dynamic>? _result;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (widget.initialData != null) {
      if (widget.initialData!['batch_number'] != null) {
        _batchCtrl.text = widget.initialData!['batch_number'];
      }
      if (widget.initialData!['reason'] != null) {
        _reason = widget.initialData!['reason'];
      }
    }
  }

  @override
  void dispose() {
    _batchCtrl.dispose();
    _qtyCtrl.dispose();
    _carrierCtrl.dispose();
    _facilityCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _submitReturn() async {
    final batchNum = _batchCtrl.text.trim();
    if (batchNum.isEmpty) {
      setState(() => _errorMessage = 'Please enter a Batch Number');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
      _result = null;
    });

    try {
      final qty = int.tryParse(_qtyCtrl.text.trim()) ?? 1;
      final res = await ref.read(apiServiceProvider).createReturnRequest(
        batchNumber: batchNum,
        quantity: qty,
        reason: _reason,
        destinationFacilityId: _facilityCtrl.text.trim(),
        carrierName: _carrierCtrl.text.trim(),
        notes: _notesCtrl.text.trim(),
      );
      setState(() {
        _result = res;
        _isSubmitting = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Return creation failed: ${e.toString().replaceAll('Exception: ', '')}';
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgBase,
      appBar: AppBar(
        title: const Text('INITIATE REVERSE RETURN'),
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
                color: AppTheme.warning.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.warning.withValues(alpha: 0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.assignment_return_outlined, color: AppTheme.warning, size: 24),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Quarantine & Reverse Logistics Handover. Locks batch from sale and mints chain of custody manifest.',
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 12, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            TextField(
              controller: _batchCtrl,
              decoration: const InputDecoration(
                labelText: 'Batch Number',
                hintText: 'e.g. B1001 or LIVE-EXP-001',
                prefixIcon: Icon(Icons.inventory_2_outlined),
              ),
            ),
            const SizedBox(height: 14),

            TextField(
              controller: _qtyCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Return Quantity',
                prefixIcon: Icon(Icons.pin_outlined),
              ),
            ),
            const SizedBox(height: 14),

            DropdownButtonFormField<String>(
              initialValue: _reason,
              decoration: const InputDecoration(
                labelText: 'Return Reason',
                prefixIcon: Icon(Icons.report_problem_outlined),
              ),
              dropdownColor: AppTheme.bgCard,
              items: const [
                DropdownMenuItem(value: 'EXPIRED_OR_RECALLED', child: Text('Expired or Mandatory Recall')),
                DropdownMenuItem(value: 'DAMAGED_IN_TRANSIT', child: Text('Damaged / Broken Seal')),
                DropdownMenuItem(value: 'SUSPECTED_COUNTERFEIT', child: Text('Suspected Counterfeit')),
                DropdownMenuItem(value: 'OVERSTOCK_RETURN', child: Text('Excess / Overstock Return')),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _reason = val);
              },
            ),
            const SizedBox(height: 14),

            TextField(
              controller: _facilityCtrl,
              decoration: const InputDecoration(
                labelText: 'Destination Facility ID',
                prefixIcon: Icon(Icons.business_outlined),
              ),
            ),
            const SizedBox(height: 14),

            TextField(
              controller: _carrierCtrl,
              decoration: const InputDecoration(
                labelText: 'Carrier / Logistics Provider',
                prefixIcon: Icon(Icons.local_shipping_outlined),
              ),
            ),
            const SizedBox(height: 14),

            TextField(
              controller: _notesCtrl,
              decoration: const InputDecoration(
                labelText: 'Inspector Notes',
                prefixIcon: Icon(Icons.notes_outlined),
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
                  : const Icon(Icons.send_rounded),
              label: const Text('SUBMIT REVERSE RETURN MANIFEST'),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.warning, foregroundColor: Colors.black),
              onPressed: _isSubmitting ? null : _submitReturn,
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

            if (_result != null)
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppTheme.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppTheme.success.withValues(alpha: 0.4)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.check_circle, color: AppTheme.success),
                        SizedBox(width: 8),
                        Text(
                          'RETURN MANIFEST MINTED',
                          style: TextStyle(color: AppTheme.success, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Tracking Code: ${_result!['tracking_code'] ?? 'TRK-OK'}',
                      style: const TextStyle(color: AppTheme.textPrimary, fontFamily: 'monospace', fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Manifest Hash: ${(_result!['manifest_hash'] ?? '').toString().substring(0, 20)}...',
                      style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11, fontFamily: 'monospace'),
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
