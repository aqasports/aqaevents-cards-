import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aqa_events_admin/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const AqaEventsApp());
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
