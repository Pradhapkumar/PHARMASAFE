class AppConstants {
  // Default server URLs:
  // - 127.0.0.1:8000 for ADB reverse tcp:8000 tcp:8000
  // - 10.0.2.2:8000 for standard Android Emulator
  // - Or physical device local network IP (e.g. 192.168.x.x:8000)
  static const String defaultHost = '127.0.0.1:8000';
  static String activeHost = defaultHost;
  static String get baseUrl => 'http://$activeHost/api/v1';

  // Role definitions
  static const String rolePharmacy          = 'PHARMACY';
  static const String roleDistributor       = 'DISTRIBUTOR';
  static const String roleDisposalFacility  = 'DISPOSAL_FACILITY';
  static const String roleManufacturer      = 'MANUFACTURER';
  static const String roleRegulator         = 'REGULATOR';
  static const String roleAdmin             = 'ADMIN';

  // Alert severities from backend
  static const String sevCritical = 'CRITICAL';
  static const String sevHigh     = 'HIGH';
  static const String sevMedium   = 'MEDIUM';
  static const String sevLow      = 'LOW';

  // Verification statuses
  static const String vsAuthentic         = 'AUTHENTIC';
  static const String vsExpired           = 'EXPIRED';
  static const String vsRecalled          = 'RECALLED';
  static const String vsFlagged           = 'FLAGGED_SUSPICIOUS';
  static const String vsDeadBatch         = 'DEAD_BATCH_REENTRY_DETECTED';
  static const String vsUnknown           = 'UNKNOWN_NOT_FOUND';

  // Batch statuses
  static const String bsManufactured      = 'MANUFACTURED';
  static const String bsInDistribution    = 'IN_DISTRIBUTION';
  static const String bsAtPharmacy        = 'AT_PHARMACY';
  static const String bsRecalled          = 'RECALLED';
  static const String bsDestroyed         = 'DESTROYED';
  static const String bsDeadBatch         = 'DEAD_BATCH';

  // Point of sale verdicts
  static const String verdictAllowSale    = 'ALLOW_SALE';
  static const String verdictBlockSale    = 'BLOCK_SALE';

  // Disposal methods
  static const List<String> disposalMethods = [
    'INCINERATION',
    'HIGH_TEMP_AUTOCLAVING',
    'CHEMICAL_NEUTRALIZATION',
    'DEEP_ENCAPSULATION',
  ];
}
