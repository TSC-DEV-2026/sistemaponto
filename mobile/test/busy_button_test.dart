import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sistemaponto/shared/widgets/busy_button.dart';

void main() {
  testWidgets('o botão troca o texto pelo spinner e não aceita outro toque', (tester) async {
    final gate = Completer<void>();
    var taps = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BusyButton(
            label: 'Entrar',
            onPressed: () {
              taps += 1;
              return gate.future;
            },
          ),
        ),
      ),
    );

    await tester.tap(find.text('Entrar'));
    await tester.pump();

    expect(find.text('Entrar'), findsNothing);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(taps, 1);

    await tester.tap(find.byType(FilledButton));
    await tester.pump();
    expect(taps, 1);

    gate.complete();
    await tester.pump();
    expect(find.text('Entrar'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsNothing);
  });
}
