import 'package:flutter_test/flutter_test.dart';
import 'package:aqa_coaches/core/models/coach_user.dart';
import 'package:aqa_coaches/core/models/swim_group.dart';
import 'package:aqa_coaches/core/models/swim_session.dart';
import 'package:aqa_coaches/core/models/swim_attendance.dart';
import 'package:aqa_coaches/core/models/tech_review.dart';
import 'package:aqa_coaches/core/models/replacement.dart';

void main() {
  group('AQA Coaches Domain Models Tests', () {
    test('CoachUser correctly parses roles and permissions', () {
      final headCoach = CoachUser.fromJson({
        'id': 'coach-1',
        'coachId': 'HC-001',
        'name': 'Head Coach Alex',
        'email': 'headcoach@aqasports.pro',
        'role': 'head_coach',
        'specialties': ['All'],
        'status': 'ACTIVE',
      });

      expect(headCoach.isHeadCoach, isTrue);
      expect(headCoach.isAssistant, isFalse);
      expect(headCoach.roleDisplay, 'Head Coach');

      final assistant = CoachUser.fromJson({
        'id': 'coach-2',
        'coachId': 'AS-002',
        'name': 'Assistant Sam',
        'email': 'assistant@aqasports.pro',
        'role': 'assistant',
        'specialties': [],
        'status': 'ACTIVE',
      });

      expect(assistant.isAssistant, isTrue);
      expect(assistant.isHeadCoach, isFalse);
      expect(assistant.roleDisplay, 'Assistant');
    });

    test('SwimGroupModel parses schedule days and edit permissions', () {
      final group = SwimGroupModel.fromJson({
        'id': 'grp-1',
        'name': 'Dauphins A',
        'category': 'enfants',
        'pool': 'Olympic Pool',
        'scheduleDays': ['LUNDI', 'MERCREDI'],
        'startTime': '16:00',
        'endTime': '17:00',
        'capacity': 15,
        'roleInGroup': 'coach',
        'isPrimary': true,
        'canEdit': true,
      });

      expect(group.name, 'Dauphins A');
      expect(group.scheduleDays.length, 2);
      expect(group.isViewOnly, isFalse);

      final assistantGroup = SwimGroupModel.fromJson({
        'id': 'grp-2',
        'name': 'Adultes B',
        'category': 'homme',
        'pool': 'Small Pool',
        'scheduleDays': 'MARDI, JEUDI',
        'startTime': '19:00',
        'endTime': '20:30',
        'capacity': 12,
        'roleInGroup': 'assistant',
        'isPrimary': false,
        'canEdit': false,
      });

      expect(assistantGroup.scheduleDays.length, 2);
      expect(assistantGroup.isViewOnly, isTrue);
    });

    test('SwimSessionModel parses session status and replacement flags', () {
      final session = SwimSessionModel.fromJson({
        'id': 'sess-1',
        'groupId': 'grp-1',
        'sessionDate': '2026-10-13T10:00:00.000Z',
        'startTime': '16:00',
        'endTime': '17:00',
        'status': 'SCHEDULED',
        'isReplacement': true,
        'group': {
          'id': 'grp-1',
          'name': 'Dauphins A',
          'category': 'enfants',
          'pool': 'Olympic Pool',
        },
      });

      expect(session.isCompleted, isFalse);
      expect(session.isReplacement, isTrue);
      expect(session.groupName, 'Dauphins A');
    });

    test('AttendanceRecordModel serializes and updates correctly', () {
      final rec = AttendanceRecordModel(
        memberId: 'm-1',
        memberName: 'Karim Bennani',
        status: 'PRESENT',
      );

      expect(rec.isPresent, isTrue);
      expect(rec.isAbsent, isFalse);

      rec.status = 'ABSENT';
      expect(rec.isAbsent, isTrue);
      expect(rec.isPresent, isFalse);

      final json = rec.toJson();
      expect(json['status'], 'ABSENT');
      expect(json['memberId'], 'm-1');
    });

    test('ReplacementModel checks pending status and incoming flags', () {
      final rep = ReplacementModel.fromJson(
        {
          'id': 'rep-1',
          'absenceId': 'abs-1',
          'status': 'REQUESTED',
          'replacementCoachId': 'target-coach-id',
          'originalCoachName': 'Coach Tariq',
          'replacementCoachName': 'Coach Youssef',
        },
        currentCoachId: 'target-coach-id',
      );

      expect(rep.isPending, isTrue);
      expect(rep.isIncomingRequest, isTrue);
      expect(rep.originalCoachName, 'Coach Tariq');
    });

    test('TechReviewModel parses skills and evaluator metadata', () {
      final review = TechReviewModel.fromJson({
        'id': 'rev-1',
        'memberId': 'mem-1',
        'overallLevel': 'INTERMEDIATE',
        'createdAt': '2026-10-13T10:00:00.000Z',
        'coachName': 'Coach Mehdi',
        'skills': {
          'flottabilite': 3,
          'respiration': 2,
        },
      });

      expect(review.overallLevel, 'INTERMEDIATE');
      expect(review.skills['flottabilite'], 3);
      expect(review.coachName, 'Coach Mehdi');
    });
  });
}
