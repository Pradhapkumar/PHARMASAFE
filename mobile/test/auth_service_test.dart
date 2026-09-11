import 'package:flutter_test/flutter_test.dart';
import 'package:pharmasafe_mobile/services/auth_service.dart';
import 'package:pharmasafe_mobile/services/api_service.dart';
import 'package:pharmasafe_mobile/core/constants.dart';

void main() {
  group('AuthNotifier and AuthState Tests', () {
    late ApiService apiService;
    late AuthNotifier authNotifier;

    setUp(() {
      apiService = ApiService();
      authNotifier = AuthNotifier(apiService);
    });

    test('Initial state is unauthenticated', () {
      expect(authNotifier.state.isAuthenticated, false);
      expect(authNotifier.state.isLoading, false);
      expect(authNotifier.state.token, isNull);
      expect(authNotifier.state.role, isNull);
    });

    test('Demo role preset activates authenticated state correctly', () {
      authNotifier.setDemoRole(AppConstants.rolePharmacy, email: 'pharma@test.com', orgName: 'Apollo City');
      expect(authNotifier.state.isAuthenticated, true);
      expect(authNotifier.state.role, 'PHARMACY');
      expect(authNotifier.state.email, 'pharma@test.com');
      expect(authNotifier.state.orgName, 'Apollo City');

      authNotifier.logout();
      expect(authNotifier.state.isAuthenticated, false);
      expect(authNotifier.state.token, isNull);
    });

    test('Role switching between Distributor, Disposal, and Admin', () {
      authNotifier.setDemoRole(AppConstants.roleDistributor);
      expect(authNotifier.state.role, 'DISTRIBUTOR');

      authNotifier.setDemoRole(AppConstants.roleDisposalFacility);
      expect(authNotifier.state.role, 'DISPOSAL_FACILITY');

      authNotifier.setDemoRole(AppConstants.roleAdmin);
      expect(authNotifier.state.role, 'ADMIN');
    });
  });
}
