import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../screens/home_screen.dart';
import '../screens/login_screen.dart';
import '../screens/scanner_screen.dart';
import '../screens/scan_result_screen.dart';
import '../screens/alerts_screen.dart';
import '../screens/batch_journey_screen.dart';
import '../screens/batch_search_screen.dart';
import '../screens/supply_chain_screen.dart';
import '../screens/pos_sale_screen.dart';
import '../screens/delivery_tracking_screen.dart';
import '../screens/return_create_screen.dart';
import '../screens/disposal_workflow_screen.dart';
import '../screens/dead_batches_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/scanner',
        builder: (context, state) => const ScannerScreen(),
      ),
      GoRoute(
        path: '/scan-result',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return ScanResultScreen(result: extra);
        },
      ),
      GoRoute(
        path: '/alerts',
        builder: (context, state) => const AlertsScreen(),
      ),
      GoRoute(
        path: '/batch/:id',
        builder: (context, state) =>
            BatchJourneyScreen(batchId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/search',
        builder: (context, state) => const BatchSearchScreen(),
      ),
      GoRoute(
        path: '/supply-chain',
        builder: (context, state) => const SupplyChainScreen(),
      ),
      GoRoute(
        path: '/pos-sale',
        builder: (context, state) {
          final batchId = state.uri.queryParameters['batchId'];
          return PosSaleScreen(initialBatchId: batchId);
        },
      ),
      GoRoute(
        path: '/delivery-tracking',
        builder: (context, state) => const DeliveryTrackingScreen(),
      ),
      GoRoute(
        path: '/return-create',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return ReturnCreateScreen(initialData: extra);
        },
      ),
      GoRoute(
        path: '/disposal-workflow',
        builder: (context, state) => const DisposalWorkflowScreen(),
      ),
      GoRoute(
        path: '/dead-batches',
        builder: (context, state) => const DeadBatchesScreen(),
      ),
    ],
  );
});
