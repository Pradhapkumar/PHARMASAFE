// This file is superseded by lib/screens/scan_result_screen.dart
// Kept for reference only.

class VerificationResult {
  final String verificationStatus;
  final String? batchNumber;
  final String? brandName;
  final String? genericName;
  final String? manufacturerName;
  final bool isExpired;
  final bool isRecalled;
  final bool isDeadBatchReentry;
  final String? warningMessage;
  final String? scanId;

  VerificationResult({
    required this.verificationStatus,
    this.batchNumber,
    this.brandName,
    this.genericName,
    this.manufacturerName,
    required this.isExpired,
    required this.isRecalled,
    required this.isDeadBatchReentry,
    this.warningMessage,
    this.scanId,
  });

  factory VerificationResult.fromJson(Map<String, dynamic> json) {
    return VerificationResult(
      verificationStatus: json['verification_status'] ?? 'UNKNOWN_NOT_FOUND',
      batchNumber: json['batch_number'],
      brandName: json['brand_name'],
      genericName: json['generic_name'],
      manufacturerName: json['manufacturer_name'],
      isExpired: json['is_expired'] == true,
      isRecalled: json['is_recalled'] == true,
      isDeadBatchReentry: json['is_dead_batch_reentry'] == true,
      warningMessage: json['warning_message'],
      scanId: json['scan_id'],
    );
  }
}
