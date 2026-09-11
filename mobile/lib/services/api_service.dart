import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal() {
    _initDio();
  }

  late Dio _dio;
  String? _authToken;

  void _initDio() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      followRedirects: true,
      maxRedirects: 5,
      validateStatus: (status) => status != null && status < 500,
      headers: {
        'Content-Type': 'application/json',
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
      },
    ));
  }

  void updateHost(String newHost) {
    AppConstants.activeHost = newHost;
    _initDio();
  }

  void setAuthToken(String? token) {
    _authToken = token;
    _initDio();
  }

  String? get currentToken => _authToken;

  // ── Authentication ──────────────────────────────────────────────
  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _dio.post('/auth/login', data: {
      'email': email.trim(),
      'password': password,
    });
    if (res.statusCode != 200 && res.statusCode != 201) {
      final msg = res.data is Map ? (res.data['detail'] ?? res.data['error']?['message'] ?? 'Authentication failed') : 'Authentication failed (${res.statusCode})';
      throw Exception(msg);
    }
    final data = res.data as Map<String, dynamic>;
    if (data['access_token'] != null) {
      setAuthToken(data['access_token']);
    }
    return data;
  }

  Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final res = await _dio.get('/auth/me');
      return res.data as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  // ── Dashboard Stats ─────────────────────────────────────────────
  Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      final res = await _dio.get('/dashboard/stats');
      return res.data as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }

  // ── Live Alerts ─────────────────────────────────────────────────
  Future<List<Map<String, dynamic>>> getAlerts({
    int limit = 50,
    bool criticalOnly = false,
  }) async {
    try {
      final res = await _dio.get('/alerts', queryParameters: {
        'limit': limit,
        if (criticalOnly) 'severity': 'CRITICAL',
      });
      final data = res.data;
      if (data is List) return data.cast<Map<String, dynamic>>();
      if (data is Map && data['alerts'] != null) {
        return (data['alerts'] as List).cast<Map<String, dynamic>>();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  // ── Medicine Verification Scan ───────────────────────────────────
  Future<Map<String, dynamic>> scanVerify({
    required String scannedCode,
    double? latitude,
    double? longitude,
  }) async {
    final res = await _dio.post('/verify/scan', data: {
      'scanned_code': scannedCode,
      'code_type': 'QR_CODE',
      'latitude': latitude,
      'longitude': longitude,
      'device_info': 'PharmaSafe Mobile v2.0',
    });
    return res.data as Map<String, dynamic>;
  }

  // ── Point-of-Sale Gate (Authoritative Verification & Execution) ──
  Future<Map<String, dynamic>> verifySaleEligibility({
    required String batchIdentifier,
    int quantity = 1,
    String? customerReference,
  }) async {
    final res = await _dio.post('/sales/verify', data: {
      'batch_identifier': batchIdentifier.trim(),
      'quantity': quantity,
      'customer_reference': customerReference,
    });
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> executeSale({
    required String batchIdentifier,
    required int quantity,
    String? customerReference,
  }) async {
    final res = await _dio.post('/sales/record', data: {
      'batch_identifier': batchIdentifier.trim(),
      'quantity': quantity,
      'customer_reference': customerReference,
    });
    return res.data as Map<String, dynamic>;
  }

  // ── Reverse Logistics & Shipments ────────────────────────────────
  Future<List<Map<String, dynamic>>> getShipments({String? status}) async {
    try {
      final res = await _dio.get('/reverse-logistics/shipments', queryParameters: {
        if (status != null) 'status': status,
      });
      final data = res.data;
      if (data is List) return data.cast<Map<String, dynamic>>();
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<Map<String, dynamic>> updateShipmentStatus(String shipmentId, String newStatus) async {
    final res = await _dio.patch('/reverse-logistics/shipments/$shipmentId/status', data: {
      'status': newStatus,
    });
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createReturnRequest({
    required String batchNumber,
    required int quantity,
    required String reason,
    required String destinationFacilityId,
    String? carrierName,
    String? notes,
  }) async {
    final res = await _dio.post('/reverse-logistics', data: {
      'batch_number': batchNumber.trim(),
      'quantity': quantity,
      'reason': reason,
      'destination_facility_id': destinationFacilityId,
      'carrier_name': carrierName,
      'notes': notes,
    });
    return res.data as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> getReturns() async {
    try {
      final res = await _dio.get('/reverse-logistics/returns');
      final data = res.data;
      if (data is List) return data.cast<Map<String, dynamic>>();
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<Map<String, dynamic>> verifyQuantityDiscrepancy({
    required String returnId,
    required int receivedQuantity,
    String? notes,
  }) async {
    final res = await _dio.post('/reverse-logistics/$returnId/verify-quantity', data: {
      'received_quantity': receivedQuantity,
      'notes': notes,
    });
    return res.data as Map<String, dynamic>;
  }

  // ── Disposal Facility Workflow ───────────────────────────────────
  Future<List<Map<String, dynamic>>> getDisposalPendingReturns() async {
    try {
      final res = await _dio.get('/disposal/pending');
      final data = res.data;
      if (data is List) return data.cast<Map<String, dynamic>>();
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<Map<String, dynamic>> recordDisposalReceipt({
    required String returnId,
    required int receivedQuantity,
    required double verifiedWeightKg,
    String? photoEvidenceUrl,
    String? notes,
  }) async {
    final res = await _dio.post('/disposal/receive', data: {
      'return_id': returnId,
      'received_quantity': receivedQuantity,
      'verified_weight_kg': verifiedWeightKg,
      'photo_evidence_url': photoEvidenceUrl,
      'notes': notes,
    });
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> completeDisposal({
    required String disposalId,
    required String method,
    String? notes,
  }) async {
    final res = await _dio.post('/disposal/$disposalId/complete', data: {
      'method': method,
      'notes': notes,
    });
    return res.data as Map<String, dynamic>;
  }

  // ── Batch Passport ───────────────────────────────────────────────
  Future<Map<String, dynamic>> getBatchPassport(String batchId) async {
    final res = await _dio.get('/batches/$batchId/passport');
    return res.data as Map<String, dynamic>;
  }

  // ── Batch Events / Journey ───────────────────────────────────────
  Future<List<Map<String, dynamic>>> getBatchEvents(String batchId) async {
    final res = await _dio.get('/batches/$batchId/events');
    final data = res.data;
    if (data is List) return data.cast<Map<String, dynamic>>();
    return [];
  }

  // ── Batch Search ─────────────────────────────────────────────────
  Future<List<Map<String, dynamic>>> searchBatches(String query) async {
    try {
      final res = await _dio.get('/batches', queryParameters: {
        'search': query,
        'limit': 20,
      });
      final data = res.data;
      if (data is List) return data.cast<Map<String, dynamic>>();
      return [];
    } catch (_) {
      return [];
    }
  }

  // ── Recent Batches ───────────────────────────────────────────────
  Future<List<Map<String, dynamic>>> getRecentBatches({int limit = 10}) async {
    try {
      final res = await _dio.get('/batches', queryParameters: {'limit': limit});
      final data = res.data;
      if (data is List) return data.cast<Map<String, dynamic>>();
      return [];
    } catch (_) {
      return [];
    }
  }

  // ── Cross-Tier Stream (Live Supply Chain) ────────────────────────
  Future<Map<String, dynamic>> getCrossTierStream() async {
    try {
      final res = await _dio.get('/dashboard/cross-tier-stream');
      return res.data as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }

  // ── Dead Batch Registry ──────────────────────────────────────────
  Future<List<Map<String, dynamic>>> getDeadBatches({int limit = 20}) async {
    try {
      final res = await _dio.get('/dead-batches', queryParameters: {'limit': limit});
      final data = res.data;
      if (data is List) return data.cast<Map<String, dynamic>>();
      return [];
    } catch (_) {
      return [];
    }
  }
}

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());
