import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/models/activity.dart';
import '../../core/models/client.dart';
import '../../core/theme/app_theme.dart';

class RedeemScreen extends ConsumerStatefulWidget {
  const RedeemScreen({super.key});
  @override
  ConsumerState<RedeemScreen> createState() => _RedeemScreenState();
}

class _RedeemScreenState extends ConsumerState<RedeemScreen> {
  final MobileScannerController _scanner = MobileScannerController(
    facing: CameraFacing.back,
  );

  bool _scanning = true;
  bool _loading = false;
  Client? _foundClient;
  List<Activity> _activities = [];
  Activity? _selectedActivity;
  ActivitySession? _selectedSession;
  String? _error;

  @override
  void dispose() {
    _scanner.dispose();
    super.dispose();
  }

  Future<void> _onBarcodeDetected(BarcodeCapture capture) async {
    if (!_scanning || _loading) return;
    final value = capture.barcodes.firstOrNull?.rawValue;
    if (value == null) return;

    // Extract token from QR URL or use raw value
    final uri = Uri.tryParse(value);
    final token = uri?.pathSegments.lastOrNull ?? value;

    setState(() {
      _scanning = false;
      _loading = true;
      _error = null;
    });
    await _scanner.stop();

    try {
      final api = ref.read(apiClientProvider);

      // Lookup card
      final res = await api.get(ApiConfig.cardsLookup, params: {'token': token});
      final data = res.data as Map<String, dynamic>;
      final clientData = data['client'] as Map<String, dynamic>?;
      if (clientData == null) {
        setState(() {
          _error = 'No client linked to this card.';
          _loading = false;
        });
        return;
      }
      final client = Client.fromJson(clientData);

      // Load active activities
      final actRes = await api.get(ApiConfig.activities, params: {'active': 'true'});
      final acts = (actRes.data as List<dynamic>)
          .map((e) => Activity.fromJson(e as Map<String, dynamic>))
          .where((a) => a.active)
          .toList();

      setState(() {
        _foundClient = client;
        _activities = acts;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Card not found or network error.';
        _loading = false;
      });
    }
  }

  Future<void> _redeem() async {
    if (_foundClient == null || _selectedActivity == null) return;
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post(ApiConfig.redemptions, data: {
        'clientId': _foundClient!.id,
        'activityId': _selectedActivity!.id,
        if (_selectedSession != null) 'sessionId': _selectedSession!.id,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Redeemed successfully'),
            backgroundColor: AppTheme.success,
          ),
        );
        _reset();
      }
    } catch (_) {
      setState(() {
        _error = 'Redemption failed. Check balance or try again.';
        _loading = false;
      });
    }
  }

  void _reset() {
    setState(() {
      _scanning = true;
      _loading = false;
      _foundClient = null;
      _activities = [];
      _selectedActivity = null;
      _selectedSession = null;
      _error = null;
    });
    _scanner.start();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Redeem'),
        actions: [
          if (!_scanning)
            TextButton.icon(
              onPressed: _reset,
              icon: const Icon(Icons.qr_code_scanner_rounded, size: 18),
              label: const Text('Scan Again'),
            ),
        ],
      ),
      body: _scanning ? _buildScanner() : _buildClientCard(),
    );
  }

  Widget _buildScanner() {
    return Stack(
      children: [
        MobileScanner(controller: _scanner, onDetect: _onBarcodeDetected),
        // Frame overlay
        Center(
          child: Container(
            width: 260,
            height: 260,
            decoration: BoxDecoration(
              border: Border.all(color: AppTheme.primary, width: 3),
              borderRadius: BorderRadius.circular(20),
            ),
          ),
        ),
        // Instruction label
        Positioned(
          bottom: 72,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.surface.withOpacity(0.88),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Point camera at client QR card',
                style: TextStyle(
                  color: AppTheme.foreground,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ),
        if (_loading)
          Container(
            color: AppTheme.background.withOpacity(0.7),
            child: const Center(
              child: CircularProgressIndicator(color: AppTheme.primary),
            ),
          ),
      ],
    );
  }

  Widget _buildClientCard() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primary));
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, color: AppTheme.danger, size: 52),
              const SizedBox(height: 16),
              Text(
                _error!,
                style: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w600),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton(onPressed: _reset, child: const Text('Try Again')),
            ],
          ),
        ),
      );
    }
    if (_foundClient == null) return const SizedBox.shrink();

    final initials = _foundClient!.fullName
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0].toUpperCase() : '')
        .join();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Client confirmation card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.surface2,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.primary.withOpacity(0.35)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: AppTheme.primaryLight,
                  child: Text(
                    initials,
                    style: const TextStyle(
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _foundClient!.fullName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppTheme.foreground,
                          fontSize: 16,
                        ),
                      ),
                      if (_foundClient!.phone != null)
                        Text(
                          _foundClient!.phone!,
                          style: const TextStyle(color: AppTheme.muted, fontSize: 13),
                        ),
                    ],
                  ),
                ),
                const Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 28),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Activity selector
          Text(
            'Select Activity',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: AppTheme.muted,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 10),
          if (_activities.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('No active activities available.',
                  style: TextStyle(color: AppTheme.muted)),
            )
          else
            ..._activities.map((act) {
              final isSel = _selectedActivity?.id == act.id;
              return GestureDetector(
                onTap: () => setState(() {
                  _selectedActivity = act;
                  _selectedSession = null;
                }),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isSel ? AppTheme.primaryLight : AppTheme.surface2,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSel ? AppTheme.primary : AppTheme.border,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.bolt_rounded,
                        color: isSel ? AppTheme.primary : AppTheme.muted,
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          act.name,
                          style: TextStyle(
                            color: isSel ? AppTheme.primary : AppTheme.foreground,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      Text(
                        '${act.creditCost} cr',
                        style: TextStyle(
                          color: isSel ? AppTheme.primary : AppTheme.muted,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),

          // Session selector
          if (_selectedActivity?.sessions?.isNotEmpty == true) ...[
            const SizedBox(height: 20),
            Text(
              'Select Session (optional)',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: AppTheme.muted,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 10),
            ..._selectedActivity!.sessions!.map((s) {
              final isSel = _selectedSession?.id == s.id;
              return GestureDetector(
                onTap: () => setState(
                  () => _selectedSession = isSel ? null : s,
                ),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isSel ? AppTheme.successBg : AppTheme.surface2,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSel ? AppTheme.success : AppTheme.border,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.event_rounded,
                        color: isSel ? AppTheme.success : AppTheme.muted,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${s.sessionDate.day}/${s.sessionDate.month}/${s.sessionDate.year}',
                        style: TextStyle(
                          color: isSel ? AppTheme.success : AppTheme.foreground,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      if (s.location != null) ...[
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            '- ${s.location}',
                            style: const TextStyle(
                              color: AppTheme.muted,
                              fontSize: 12,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            }),
          ],

          const SizedBox(height: 24),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                _error!,
                style: const TextStyle(color: AppTheme.danger),
                textAlign: TextAlign.center,
              ),
            ),

          SizedBox(
            height: 52,
            child: ElevatedButton.icon(
              onPressed:
                  (_selectedActivity != null && !_loading) ? _redeem : null,
              icon: const Icon(Icons.check_circle_rounded),
              label: const Text('Confirm Redemption'),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
