import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/i18n/app_i18n.dart';
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
  String? _selectedSubstituteCoachId;
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
    final i18n = ref.read(i18nProvider);

    try {
      final response = await client.dio.post(
        ApiEndpoints.absences,
        data: {
          'startDate': _dateFormat.format(_startDate),
          'endDate': _dateFormat.format(_endDate),
          'reason': _reason,
          if (_selectedSubstituteCoachId != null && _selectedSubstituteCoachId!.isNotEmpty)
            'substituteCoachId': _selectedSubstituteCoachId,
          'notes': _notesController.text.trim(),
        },
      );

      if (response.statusCode == 200 && mounted) {
        final createdCount =
            (response.data is Map ? response.data['replacementsCreated'] : null) ?? 0;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AqaTheme.statusSuccess,
            content: Text(
              i18n.locale == 'ar'
                  ? 'تم تسجيل طلب الغياب بنجاح ($createdCount حصص تتطلب تغطية).'
                  : i18n.locale == 'en'
                      ? 'Absence declared successfully ($createdCount session(s) pending coverage).'
                      : 'Absence declaree avec succes ($createdCount seance(s) en demande de couverture).',
            ),
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
            content: Text('${i18n.t('common.error')}: $e'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bootstrapAsync = ref.watch(bootstrapProvider);
    final i18n = ref.watch(i18nProvider);
    final currentCoachId = bootstrapAsync.valueOrNull?.coach.coachId ?? '';
    final colleagues = (bootstrapAsync.valueOrNull?.allCoaches ?? [])
        .where((c) => c['id'] != currentCoachId && c['role'] != 'assistant')
        .toList();

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: Text(
          i18n.locale == 'ar'
              ? 'طلب غياب واستخلاف'
              : i18n.locale == 'en'
                  ? 'Declare Absence & Coverage'
                  : 'Declarer une Absence',
        ),
        actions: const [
          Padding(
            padding: EdgeInsets.symmetric(vertical: 14.0),
            child: LanguageSwitcherPill(compact: true),
          ),
          SizedBox(width: 8.0),
        ],
      ),
      body: AqaAmbientBackground(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AqaDoubleBezelCard(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AqaSectionHeader(
                      title: i18n.locale == 'ar'
                          ? 'فترة الغياب المطلوبة'
                          : i18n.locale == 'en'
                              ? 'Absence Date Range'
                              : 'Periode d\'Absence',
                      subtitle: i18n.locale == 'ar'
                          ? 'حدد تاريخ البداية والنهاية لحصصك'
                          : i18n.locale == 'en'
                              ? 'Select dates to be covered by other coaches'
                              : 'Selectionnez la plage de dates des seances',
                    ),
                    const SizedBox(height: 12.0),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                i18n.locale == 'ar' ? 'تاريخ البداية' : 'Date de Debut',
                                style: const TextStyle(color: AqaTheme.textLightMuted, fontSize: 11.5),
                              ),
                              const SizedBox(height: 6.0),
                              OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10.0,
                                    vertical: 12.0,
                                  ),
                                  side: const BorderSide(color: AqaTheme.borderSubtle),
                                ),
                                onPressed: _pickStartDate,
                                icon: const Icon(
                                  Icons.calendar_today_rounded,
                                  size: 16.0,
                                  color: AqaTheme.accentTeal,
                                ),
                                label: Text(
                                  _dateFormat.format(_startDate),
                                  style: const TextStyle(fontSize: 12.0, color: AqaTheme.textPrimary),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12.0),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                i18n.locale == 'ar' ? 'تاريخ النهاية' : 'Date de Fin',
                                style: const TextStyle(color: AqaTheme.textLightMuted, fontSize: 11.5),
                              ),
                              const SizedBox(height: 6.0),
                              OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10.0,
                                    vertical: 12.0,
                                  ),
                                  side: const BorderSide(color: AqaTheme.borderSubtle),
                                ),
                                onPressed: _pickEndDate,
                                icon: const Icon(
                                  Icons.calendar_today_rounded,
                                  size: 16.0,
                                  color: AqaTheme.accentTeal,
                                ),
                                label: Text(
                                  _dateFormat.format(_endDate),
                                  style: const TextStyle(fontSize: 12.0, color: AqaTheme.textPrimary),
                                ),
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

              // Substitute & Reason Section
              AqaDoubleBezelCard(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AqaSectionHeader(
                      title: i18n.locale == 'ar'
                          ? 'المدرب المستخلف المفضل'
                          : i18n.locale == 'en'
                              ? 'Preferred Substitute Coach'
                              : 'Coach Remplacant Souhaite',
                      subtitle: i18n.locale == 'ar'
                          ? 'اختر زميلاً أو اترك الطلب مفتوحاً للمشرف العام'
                          : i18n.locale == 'en'
                              ? 'Select a colleague or broadcast to all eligible coaches'
                              : 'Choisissez un collegue ou laissez en diffusion ouverte.',
                    ),
                    const SizedBox(height: 10.0),
                    DropdownButtonFormField<String?>(
                      initialValue: _selectedSubstituteCoachId,
                      dropdownColor: AqaTheme.surfaceSecondary,
                      style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                      decoration: const InputDecoration(
                        contentPadding: EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                      ),
                      items: [
                        DropdownMenuItem<String?>(
                          value: null,
                          child: Text(
                            i18n.locale == 'ar'
                                ? 'نشر مفتوح لكافة المدربين المؤهلين / Head Coach'
                                : 'Diffusion a tous les coachs eligibles / Head Coach',
                          ),
                        ),
                        ...colleagues.map(
                          (c) => DropdownMenuItem<String?>(
                            value: c['id'] as String?,
                            child: Text('${c['name']} (${(c['role'] ?? 'coach').toString().toUpperCase()})'),
                          ),
                        ),
                      ],
                      onChanged: (val) {
                        setState(() => _selectedSubstituteCoachId = val);
                      },
                    ),
                    const SizedBox(height: 16.0),
                    AqaSectionHeader(
                      title: i18n.t('replacements.reason_label'),
                    ),
                    const SizedBox(height: 10.0),
                    DropdownButtonFormField<String>(
                      initialValue: _reason,
                      dropdownColor: AqaTheme.surfaceSecondary,
                      style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                      decoration: const InputDecoration(
                        contentPadding: EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                      ),
                      items: [
                        DropdownMenuItem(
                          value: 'Personal',
                          child: Text(i18n.locale == 'ar' ? 'شخصي' : (i18n.locale == 'en' ? 'Personal' : 'Personnel')),
                        ),
                        DropdownMenuItem(
                          value: 'Sickness',
                          child: Text(i18n.locale == 'ar' ? 'صحي / عطلة مرضية' : (i18n.locale == 'en' ? 'Medical / Sickness' : 'Maladie / Medical')),
                        ),
                        DropdownMenuItem(
                          value: 'Competition',
                          child: Text(i18n.locale == 'ar' ? 'منافسة رسمية' : (i18n.locale == 'en' ? 'Official Competition' : 'Competition Officielle')),
                        ),
                        DropdownMenuItem(
                          value: 'Training / Seminar',
                          child: Text(i18n.locale == 'ar' ? 'تربص / دورة تكوينية AQA' : (i18n.locale == 'en' ? 'AQA Coaching Seminar' : 'Formation / Stage AQA')),
                        ),
                        DropdownMenuItem(
                          value: 'Other',
                          child: Text(i18n.locale == 'ar' ? 'سبب آخر' : (i18n.locale == 'en' ? 'Other Reason' : 'Autre motif')),
                        ),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _reason = val);
                      },
                    ),
                    const SizedBox(height: 16.0),
                    AqaSectionHeader(
                      title: i18n.t('replacements.notes_label'),
                    ),
                    const SizedBox(height: 8.0),
                    TextField(
                      controller: _notesController,
                      maxLines: 3,
                      style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0),
                      decoration: InputDecoration(
                        hintText: i18n.locale == 'ar'
                            ? 'البرنامج المخطط للأفواج، نقاط يجب الانتباه إليها...'
                            : (i18n.locale == 'en'
                                ? 'Planned session drills, swimmer special notes...'
                                : 'Programme prevu pour les groupes, points d\'attention sur certains nageurs...'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24.0),

              AqaIslandButton(
                label: i18n.t('replacements.submit_request'),
                icon: Icons.send_rounded,
                isLoading: _isSubmitting,
                onPressed: _isSubmitting ? null : _submit,
              ),
              const SizedBox(height: 24.0),
            ],
          ),
        ),
      ),
    );
  }
}
