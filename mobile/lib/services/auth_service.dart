import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_service.dart';

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final String? token;
  final String? role;
  final String? email;
  final String? fullName;
  final String? orgId;
  final String? orgName;
  final String? errorMessage;

  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.token,
    this.role,
    this.email,
    this.fullName,
    this.orgId,
    this.orgName,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    String? token,
    String? role,
    String? email,
    String? fullName,
    String? orgId,
    String? orgName,
    String? errorMessage,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      token: token ?? this.token,
      role: role ?? this.role,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      orgId: orgId ?? this.orgId,
      orgName: orgName ?? this.orgName,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _api;

  AuthNotifier(this._api) : super(const AuthState());

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _api.login(email, password);
      final token = res['access_token'] as String?;
      final user = res['user'] as Map<String, dynamic>?;

      if (token != null && user != null) {
        state = AuthState(
          isAuthenticated: true,
          isLoading: false,
          token: token,
          role: user['role']?.toString().toUpperCase(),
          email: user['email']?.toString(),
          fullName: user['full_name']?.toString(),
          orgId: user['organization_id']?.toString(),
          orgName: user['organization']?['name']?.toString() ?? user['organization_id']?.toString(),
        );
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Invalid login response from server',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Authentication failed: ${e.toString().replaceAll('Exception: ', '')}',
      );
      return false;
    }
  }

  void logout() {
    _api.setAuthToken(null);
    state = const AuthState();
  }

  void setDemoRole(String role, {String? email, String? orgName}) {
    state = AuthState(
      isAuthenticated: true,
      isLoading: false,
      token: 'demo_token_$role',
      role: role,
      email: email ?? '${role.toLowerCase()}@pharmasafe.demo',
      fullName: 'Field Operator (${role.replaceAll('_', ' ')})',
      orgId: 'org_${role.toLowerCase()}',
      orgName: orgName ?? '${role.replaceAll('_', ' ')} Hub',
    );
  }
}

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final api = ref.watch(apiServiceProvider);
  return AuthNotifier(api);
});
