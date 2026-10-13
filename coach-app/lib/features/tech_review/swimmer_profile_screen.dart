import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/tech_review.dart';
import '../../core/theme/aqa_theme.dart';

final swimmerProfileProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, memberId) async {
  final client = ref.watch(apiClientProvider);
  final response = await client.dio.get(ApiEndpoints.memberProfile(memberId));
  if (response.statusCode == 200 && response.data != null) {
    return response.data as Map<String, dynamic>;
  }
  throw Exception('Failed to load swimmer profile');
});

class SwimmerProfileScreen extends ConsumerWidget {
  final String memberId;

  const SwimmerProfileScreen({super.key, required this.memberId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(swimmerProfileProvider(memberId));

    return Scaffold(
      backgroundColor: AqaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Swimmer Follow-up'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(swimmerProfileProvider(memberId)),
          ),
        ],
      ),
      body: profileAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AqaTheme.accentTeal),
        ),
        error: (err, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: AqaTheme.statusDanger, size: 40.0),
              const SizedBox(height: 12.0),
              Text('Error: $err', style: const TextStyle(color: AqaTheme.textMuted)),
              const SizedBox(height: 16.0),
              ElevatedButton(
                onPressed: () => ref.invalidate(swimmerProfileProvider(memberId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (data) {
          final member = data['member'] as Map<String, dynamic>;
          final currentGroup = data['currentGroup'] as Map<String, dynamic>?;
          final reviewsRaw = (data['reviews'] as List<dynamic>?) ?? [];
          final reviews = reviewsRaw.map((r) => TechReviewModel.fromJson(r as Map<String, dynamic>)).toList();
          final canEdit = data['canEdit'] as bool? ?? false;

          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              // Swimmer Header Card
              Container(
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: AqaTheme.surfaceDark,
                  borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
                  border: Border.all(color: AqaTheme.borderSubtle),
                  boxShadow: AqaTheme.cardShadow,
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28.0,
                      backgroundColor: AqaTheme.surfaceSecondary,
                      child: Text(
                        (member['fullName'] as String? ?? 'S').substring(0, 1).toUpperCase(),
                        style: const TextStyle(color: AqaTheme.accentTeal, fontSize: 22.0, fontWeight: FontWeight.w700),
                      ),
                    ),
                    const SizedBox(width: 14.0),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            member['fullName'] as String? ?? 'Swimmer',
                            style: const TextStyle(
                              color: AqaTheme.textPrimary,
                              fontSize: 16.0,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2.0),
                          Text(
                            currentGroup != null ? 'Group: ${currentGroup['name']}' : 'No primary group',
                            style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                          ),
                          if (member['dateOfBirth'] != null) ...[
                            const SizedBox(height: 2.0),
                            Text(
                              'DOB: ${member['dateOfBirth'].toString().substring(0, 10)}',
                              style: const TextStyle(color: AqaTheme.textLightMuted, fontSize: 11.0),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16.0),

              // Action button for new review
              if (canEdit)
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14.0),
                  ),
                  onPressed: () {
                    context.push('/members/$memberId/review-form');
                  },
                  icon: const Icon(Icons.rate_review_outlined, size: 18.0),
                  label: const Text('New Technical Evaluation'),
                )
              else
                Container(
                  padding: const EdgeInsets.all(12.0),
                  decoration: BoxDecoration(
                    color: AqaTheme.surfaceSecondary,
                    borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.lock_outline, color: AqaTheme.textLightMuted, size: 16.0),
                      SizedBox(width: 8.0),
                      Expanded(
                        child: Text(
                          'Assistant view-only: Technical reviews can only be submitted by Coaches and Head Coaches.',
                          style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 20.0),

              // Reviews Section
              Text(
                'Evaluation History (${reviews.length})',
                style: const TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 15.0,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 10.0),

              if (reviews.isEmpty)
                Container(
                  padding: const EdgeInsets.all(32.0),
                  decoration: BoxDecoration(
                    color: AqaTheme.surfaceDark,
                    borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
                    border: Border.all(color: AqaTheme.borderSubtle),
                  ),
                  child: const Center(
                    child: Column(
                      children: [
                        Icon(Icons.assessment_outlined, color: AqaTheme.textLightMuted, size: 36.0),
                        SizedBox(height: 10.0),
                        Text(
                          'No technical evaluations recorded yet',
                          style: TextStyle(color: AqaTheme.textPrimary, fontSize: 13.0, fontWeight: FontWeight.w600),
                        ),
                        SizedBox(height: 4.0),
                        Text(
                          'Submit an evaluation to track swimming progress across core skills.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ...reviews.map((rev) => _buildReviewCard(rev)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildReviewCard(TechReviewModel rev) {
    final dateStr = rev.createdAt.length >= 10 ? rev.createdAt.substring(0, 10) : rev.createdAt;

    return Container(
      margin: const EdgeInsets.only(bottom: 12.0),
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: AqaTheme.surfaceDark,
        borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
        border: Border.all(color: AqaTheme.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                dateStr,
                style: const TextStyle(color: AqaTheme.accentTeal, fontSize: 13.0, fontWeight: FontWeight.w600),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                decoration: BoxDecoration(
                  color: AqaTheme.statusInfoBg,
                  borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                  border: Border.all(color: AqaTheme.primarySky),
                ),
                child: Text(
                  rev.overallLevel,
                  style: const TextStyle(color: AqaTheme.primarySky, fontSize: 10.0, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4.0),
          Text(
            'Evaluator: ${rev.coachName}',
            style: const TextStyle(color: AqaTheme.textMuted, fontSize: 12.0),
          ),
          if (rev.evaluatorNotes != null && rev.evaluatorNotes!.isNotEmpty) ...[
            const SizedBox(height: 8.0),
            Container(
              padding: const EdgeInsets.all(8.0),
              decoration: BoxDecoration(
                color: AqaTheme.surfaceSecondary,
                borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
              ),
              child: Text(
                rev.evaluatorNotes!,
                style: const TextStyle(color: AqaTheme.textPrimary, fontSize: 12.0, fontStyle: FontStyle.italic),
              ),
            ),
          ],
          const SizedBox(height: 12.0),
          const Divider(),
          const SizedBox(height: 8.0),
          // Skills grid
          Wrap(
            spacing: 8.0,
            runSpacing: 6.0,
            children: rev.skills.entries.map((entry) {
              final val = entry.value;
              final score = val is Map ? val['score'] : val;
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
                decoration: BoxDecoration(
                  color: AqaTheme.surfaceSecondary,
                  borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      entry.key,
                      style: const TextStyle(color: AqaTheme.textMuted, fontSize: 11.0),
                    ),
                    const SizedBox(width: 6.0),
                    Text(
                      '$score / 4',
                      style: const TextStyle(
                        color: AqaTheme.accentTeal,
                        fontSize: 11.0,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
