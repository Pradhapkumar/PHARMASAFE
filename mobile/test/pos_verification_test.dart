import 'package:flutter_test/flutter_test.dart';
import 'package:pharmasafe_mobile/models/verification_result.dart';
import 'package:pharmasafe_mobile/core/constants.dart';

void main() {
  group('VerificationResult Safety Verdict Model Tests', () {
    test('Correctly parses AUTHENTIC batch from JSON', () {
      final json = {
        'verification_status': 'AUTHENTIC',
        'batch_number': 'B1001',
        'brand_name': 'Amoxicillin 500mg',
        'generic_name': 'Amoxicillin',
        'manufacturer_name': 'SafePharma Labs',
        'is_expired': false,
        'is_recalled': false,
        'is_dead_batch_reentry': false,
        'warning_message': null,
        'scan_id': 'scan_123',
      };

      final result = VerificationResult.fromJson(json);
      expect(result.verificationStatus, AppConstants.vsAuthentic);
      expect(result.batchNumber, 'B1001');
      expect(result.brandName, 'Amoxicillin 500mg');
      expect(result.isExpired, isFalse);
      expect(result.isRecalled, isFalse);
      expect(result.isDeadBatchReentry, isFalse);
      expect(result.scanId, 'scan_123');
    });

    test('Correctly identifies RECALLED / DEAD BATCH / EXPIRED status', () {
      final json = {
        'verification_status': 'DEAD_BATCH_REENTRY_DETECTED',
        'batch_number': 'DEAD-999',
        'brand_name': 'Paracetamol 650mg',
        'generic_name': 'Paracetamol',
        'manufacturer_name': 'EcoSafe Labs',
        'is_expired': true,
        'is_recalled': true,
        'is_dead_batch_reentry': true,
        'warning_message': 'CRITICAL: Dead batch re-entry detected. Certificate: CERT-001',
        'scan_id': 'scan_999',
      };

      final result = VerificationResult.fromJson(json);
      expect(result.verificationStatus, AppConstants.vsDeadBatch);
      expect(result.isExpired, isTrue);
      expect(result.isRecalled, isTrue);
      expect(result.isDeadBatchReentry, isTrue);
      expect(result.warningMessage, contains('Dead batch re-entry'));
    });
  });
}
