import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pharmasafe_mobile/main.dart';
import 'package:pharmasafe_mobile/core/constants.dart';

void main() {
  testWidgets('PharmaSafe app launches and initializes theme & router', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: PharmaSafeApp()));
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byType(MaterialApp), findsOneWidget);

    // Unmount to cleanly stop any infinite animations before test teardown
    await tester.pumpWidget(const SizedBox());
  });

  test('AppConstants network and role validation', () {
    expect(AppConstants.roleAdmin, 'ADMIN');
    expect(AppConstants.rolePharmacy, 'PHARMACY');
    expect(AppConstants.roleDistributor, 'DISTRIBUTOR');
    expect(AppConstants.roleDisposalFacility, 'DISPOSAL_FACILITY');

    expect(AppConstants.verdictAllowSale, 'ALLOW_SALE');
    expect(AppConstants.verdictBlockSale, 'BLOCK_SALE');

    // Dynamic host configuration test
    AppConstants.activeHost = '192.168.1.50:8000';
    expect(AppConstants.activeHost, '192.168.1.50:8000');
    expect(AppConstants.baseUrl, 'http://192.168.1.50:8000/api/v1');

    // Reset back
    AppConstants.activeHost = AppConstants.defaultHost;
  });
}
