import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/swim_session.dart';

class SessionReminderCandidate {
  final SwimSessionModel session;
  final int minutesUntilEnd;
  final bool isWithinTenMinWindow;
  final bool isOngoing;

  const SessionReminderCandidate({
    required this.session,
    required this.minutesUntilEnd,
    required this.isWithinTenMinWindow,
    required this.isOngoing,
  });

  String get bannerHeadline {
    if (isWithinTenMinWindow && minutesUntilEnd >= 0) {
      return 'Fin de seance dans $minutesUntilEnd min — Loggez les infos';
    }
    if (isWithinTenMinWindow && minutesUntilEnd < 0) {
      return 'Seance terminee il y a ${minutesUntilEnd.abs()} min — Cloture rapide';
    }
    if (isOngoing) {
      return 'Seance en cours (fin dans $minutesUntilEnd min)';
    }
    return 'Assistant Log Rapide (10 min avant fin de seance)';
  }
}

/// Purely local in-memory evaluator for the 10-minute pre-end session notification.
/// Makes ZERO network requests and ZERO server polling loops.
class SessionReminderService {
  const SessionReminderService._();

  static DateTime? _parseSessionDateTime(String dateStr, String timeStr) {
    if (dateStr.length < 10 || !timeStr.contains(':')) return null;
    final cleanDate = dateStr.substring(0, 10);
    final parts = cleanDate.split('-');
    if (parts.length != 3) return null;
    final year = int.tryParse(parts[0]);
    final month = int.tryParse(parts[1]);
    final day = int.tryParse(parts[2]);
    final tParts = timeStr.split(':');
    final hour = int.tryParse(tParts[0]);
    final minute = int.tryParse(tParts.length > 1 ? tParts[1] : '0');
    if (year == null || month == null || day == null || hour == null || minute == null) {
      return null;
    }
    return DateTime(year, month, day, hour, minute);
  }

  /// Evaluates loaded sessions against current local device clock.
  static SessionReminderCandidate? findPriorityReminder(
    List<SwimSessionModel> sessions, {
    Set<String> dismissedSessionIds = const {},
  }) {
    final now = DateTime.now();
    SessionReminderCandidate? bestTenMinMatch;
    SessionReminderCandidate? bestOngoingMatch;
    SessionReminderCandidate? nextPendingMatch;

    for (final s in sessions) {
      if (!s.canEdit || s.isCancelled || dismissedSessionIds.contains(s.id)) {
        continue;
      }

      final startDt = _parseSessionDateTime(s.sessionDate, s.startTime);
      final endDt = _parseSessionDateTime(s.sessionDate, s.endTime);

      if (startDt != null && endDt != null) {
        final diffToEndMin = endDt.difference(now).inMinutes;
        final diffFromStartMin = now.difference(startDt).inMinutes;

        // Window: 10 minutes before session ends up to 40 minutes after session ends
        if (!s.isCompleted && diffToEndMin <= 10 && diffToEndMin >= -40) {
          bestTenMinMatch = SessionReminderCandidate(
            session: s,
            minutesUntilEnd: diffToEndMin,
            isWithinTenMinWindow: true,
            isOngoing: diffToEndMin >= 0,
          );
          break;
        }

        // Ongoing session (started, more than 10 min left)
        if (!s.isCompleted && diffFromStartMin >= 0 && diffToEndMin > 10) {
          bestOngoingMatch ??= SessionReminderCandidate(
            session: s,
            minutesUntilEnd: diffToEndMin,
            isWithinTenMinWindow: false,
            isOngoing: true,
          );
        }
      }

      if (!s.isCompleted && nextPendingMatch == null) {
        nextPendingMatch = SessionReminderCandidate(
          session: s,
          minutesUntilEnd: 10,
          isWithinTenMinWindow: false,
          isOngoing: false,
        );
      }
    }

    return bestTenMinMatch ?? bestOngoingMatch ?? nextPendingMatch;
  }
}

class DismissedRemindersNotifier extends StateNotifier<Set<String>> {
  DismissedRemindersNotifier() : super(const {});

  void dismiss(String sessionId) {
    state = {...state, sessionId};
  }

  void reset() {
    state = const {};
  }
}

final dismissedRemindersProvider =
    StateNotifierProvider<DismissedRemindersNotifier, Set<String>>(
  (ref) => DismissedRemindersNotifier(),
);
