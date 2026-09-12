import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sps_mobile/app.dart';

void main() {
  testWidgets('app boots to login or home shell', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: SpsMobileApp()));
    await tester.pump();
    // Auth bootstrap starts in unknown → eventually login brand appears if unauthenticated.
    expect(find.textContaining('Smart Prep'), findsWidgets);
  });
}
