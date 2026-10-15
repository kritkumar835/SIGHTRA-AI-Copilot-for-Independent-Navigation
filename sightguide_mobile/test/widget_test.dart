import 'package:flutter_test/flutter_test.dart';
import 'package:sightguide_mobile/main.dart';

void main() {
  testWidgets('DRISHTI-AI initial smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const DrishtiAiApp());
    expect(find.text('DRISHTI-AI'), findsWidgets);
  });
}
