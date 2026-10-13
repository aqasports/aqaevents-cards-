import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../core/theme/aqa_theme.dart';

class RequestAbsenceScreen extends ConsumerStatefulWidget {
  const RequestAbsenceScreen({super.key});

  @override
  ConsumerState<RequestAbsenceScreen> createState() => _RequestAbsenceScreenState();
}

class _RequestAbsenceScreenState extends ConsumerState<RequestAbsenceScreen> {
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now().add(const Duration(days: 1));
  String _reason = 'Personal';
  final TextEditingController _notesController = TextEditingController();
  bool _isSubmitting = false;

  final DateFormat _dateFormat = DateFormat('yyyy-MM-dd');

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickStartDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 90)),
      builder: (context, child) => Theme(data: AqaTheme.darkTheme, child: child!),
    );
    if (picked != null) {
      setState(() {
        _startDate = picked;
        if (_endDate.isBefore(_startDate)) {
          _endDate = _startDate;
        }
      });
    }
  }

  Future<void> _pickEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate,
      firstDate: _startDate,
      lastDate: DateTime.now().add(const Duration(days: 90)),
      builder: (context, child) => Theme(data: AqaTheme.darkTheme, child: child!),
    );
    if (picked != null) {
      setState(() {
        _endDate = picked;
      });
    }
  }

  Future<void> _submit() async {
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);

    final client = ref.read(apiClientProvider);

    try {
      final response = await client.dio.post(
        ApiEndpoints.absences,
        data: {
          'startDate': _dateFormat.format(_startDate),
          'endDate': _dateFormat.format(_endDate),
          'reason': _reason,
          'notes': _notesController.text.trim(),
        },
      );

      if (response.statusCode == 200 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AqaTheme.statusSuccess,
            content: Text('Absence recorded. Eligible replacement candidates notified.'),
          ),
        );
        ref.invalidate(bootstrapProvider);
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AqaTheme.statusDanger,
            content: Text('Failed to declare absence: $e'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Declare Absence'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                color: AqaTheme.surfaceDark,
                borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
                border: Border.all(color: AqaTheme.borderSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Absence Schedule',
                    style: TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12.0),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Start Date', style: TextStyle(color: AqaTheme.textLightMuted, fontSize: 12.0)),
                            const SizedBox(height: 6.0),
                            OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 12.0),
                              ),
                              onPressed: _pickStartDate,
                              icon: const Icon(Icons.calendar_today, size: 16.0, color: AqaTheme.accentTeal),
                              label: Text(_dateFormat.format(_startDate), style: const TextStyle(fontSize: 12.0)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('End Date', style: TextStyle(color: AqaTheme.textLightMuted, fontSize: 12.0)),
                            const SizedBox(height: 6.0),
                            OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 12.0),
                              ),
                              onPressed: _pickEndDate,
                              icon: const Icon(Icons.calendar_today, size: 16.0, color: AqaTheme.accentTeal),
                              label: Text(_dateFormat.format(_endDate), style: const TextStyle(fontSize: 12.0)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16.0),

            // Reason Section
            Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                color: AqaTheme.surfaceDark,
                borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
                border: Border.all(color: AqaTheme.borderSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Reason for Absence',
                    style: TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12.0),
                  DropdownButtonFormField<String>(
                    initialValue: _reason,
                    dropdownColor: AqaTheme.surfaceSecondary,
                    style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0),
                    decoration: const InputDecoration(
                      contentPadding: EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                    ),
                    items: ['Personal', 'Sickness', 'Competition', 'Training / Seminar', 'Other']
                        .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _reason = val);
                    },
                  ),
                  const SizedBox(height: 16.0),
                  const Text(
                    'Additional Details',
                    style: TextStyle(color: AqaTheme.textPrimary, fontSize: 14.0, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8.0),
                  TextField(
                    controller: _notesController,
                    maxLines: 3,
                    style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                    decoration: const InputDecoration(
                      hintText: 'Notes for administration or replacement coaches...',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24.0),

            ElevatedButton(
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14.0),
              ),
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20.0,
                      width: 20.0,
                      child: CircularProgressIndicator(strokeWidth: 2.0, color: Colors.white),
                    )
                  : const Text('Submit Absence & Request Coverage'),
            ),
          ],
        ),
      ),
    );
  }
}
