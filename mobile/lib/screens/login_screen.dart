import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailCtrl = TextEditingController(text: 'pharmacy@pharmasafe.demo');
  final _passCtrl = TextEditingController(text: 'PharmaSafe2026!');
  final _hostCtrl = TextEditingController(text: AppConstants.activeHost);
  bool _showHostConfig = false;
  bool _obscurePass = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _hostCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final success = await ref.read(authStateProvider.notifier).login(
      _emailCtrl.text.trim(),
      _passCtrl.text,
    );
    if (success && mounted) {
      context.go('/');
    }
  }

  void _fillPreset(String email, String role) {
    _emailCtrl.text = email;
    _passCtrl.text = 'PharmaSafe2026!';
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);

    return Scaffold(
      backgroundColor: AppTheme.bgBase,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              // Brand Logo Header
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                    border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primary.withValues(alpha: 0.2),
                        blurRadius: 20,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.shield_outlined, color: AppTheme.primary, size: 38),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'PHARMASAFE FIELD OPS',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Secure Authentication',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Role-based gateway for Pharmacy, Logistics & Disposal',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 28),

              // Server Host Config Switcher
              Container(
                decoration: BoxDecoration(
                  color: AppTheme.bgCard,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Column(
                  children: [
                    InkWell(
                      onTap: () => setState(() => _showHostConfig = !_showHostConfig),
                      borderRadius: BorderRadius.circular(16),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          children: [
                            const Icon(Icons.dns_outlined, color: AppTheme.accent, size: 18),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Backend Host: ${AppConstants.activeHost}',
                                style: const TextStyle(
                                  color: AppTheme.textPrimary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            Icon(
                              _showHostConfig ? Icons.expand_less : Icons.expand_more,
                              color: AppTheme.textSecondary,
                              size: 20,
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (_showHostConfig)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            TextField(
                              controller: _hostCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Server IP / Host',
                                hintText: 'pharmasafe-2.onrender.com',
                                isDense: true,
                              ),
                              style: const TextStyle(fontSize: 13, fontFamily: 'monospace'),
                            ),
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 8,
                              children: [
                                ActionChip(
                                  label: const Text('☁️ Live Render Cloud', style: TextStyle(fontSize: 11)),
                                  onPressed: () {
                                    _hostCtrl.text = 'pharmasafe-2.onrender.com';
                                    ref.read(apiServiceProvider).updateHost('pharmasafe-2.onrender.com');
                                    setState(() => _showHostConfig = false);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Connected to Live Cloud Backend!')),
                                    );
                                  },
                                ),
                                ActionChip(
                                  label: const Text('💻 Local ADB', style: TextStyle(fontSize: 11)),
                                  onPressed: () {
                                    _hostCtrl.text = '127.0.0.1:8000';
                                    ref.read(apiServiceProvider).updateHost('127.0.0.1:8000');
                                    setState(() => _showHostConfig = false);
                                  },
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                TextButton(
                                  onPressed: () {
                                    final host = _hostCtrl.text.trim();
                                    if (host.isNotEmpty) {
                                      ref.read(apiServiceProvider).updateHost(host);
                                      setState(() => _showHostConfig = false);
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('Host updated to: $host')),
                                      );
                                    }
                                  },
                                  child: const Text('Apply Host', style: TextStyle(color: AppTheme.primary)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Error banner if any
              if (auth.errorMessage != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.danger.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.danger.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppTheme.danger, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          auth.errorMessage!,
                          style: const TextStyle(color: AppTheme.danger, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),

              // Form fields
              TextField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email Address',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _passCtrl,
                obscureText: _obscurePass,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePass ? Icons.visibility_off : Icons.visibility,
                      color: AppTheme.textSecondary,
                    ),
                    onPressed: () => setState(() => _obscurePass = !_obscurePass),
                  ),
                ),
              ),
              const SizedBox(height: 22),

              // Login Button
              ElevatedButton(
                onPressed: auth.isLoading ? null : _handleLogin,
                child: auth.isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                      )
                    : const Text('AUTHENTICATE & ENTER'),
              ),
              const SizedBox(height: 24),

              // Quick Role Presets Header
              const Row(
                children: [
                  Expanded(child: Divider(color: AppTheme.border)),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      'QUICK ROLE PRESETS',
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ),
                  Expanded(child: Divider(color: AppTheme.border)),
                ],
              ),
              const SizedBox(height: 14),

              // Role preset buttons
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _RoleButton(
                    label: 'Pharmacy',
                    icon: Icons.local_pharmacy_outlined,
                    color: AppTheme.primary,
                    onTap: () => _fillPreset('pharmacy@pharmasafe.demo', AppConstants.rolePharmacy),
                  ),
                  _RoleButton(
                    label: 'Distributor',
                    icon: Icons.local_shipping_outlined,
                    color: AppTheme.accent,
                    onTap: () => _fillPreset('distributor@pharmasafe.demo', AppConstants.roleDistributor),
                  ),
                  _RoleButton(
                    label: 'Disposal Hub',
                    icon: Icons.delete_sweep_outlined,
                    color: AppTheme.warning,
                    onTap: () => _fillPreset('disposal@pharmasafe.demo', AppConstants.roleDisposalFacility),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Skip / Guest Mode
              TextButton(
                onPressed: () => context.go('/'),
                child: const Text(
                  'Continue as Field Guest Scanner →',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _RoleButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }
}
