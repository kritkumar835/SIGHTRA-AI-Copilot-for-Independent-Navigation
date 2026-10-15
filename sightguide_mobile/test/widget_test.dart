import 'package:flutter_test/flutter_test.dart';
import 'package:sightguide_mobile/main.dart';

void main() {
  testWidgets('SightGuide initial smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const SightGuideApp());
    expect(find.text('SightGuide'), findsWidgets);
  });
}
