import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sistemaponto/shared/providers/loader_provider.dart';
import 'package:sistemaponto/shared/widgets/global_loader.dart';

void main() {
  testWidgets('a espera mostra o círculo e o texto no centro', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [loaderProvider.overrideWith((ref) => true)],
        child: const MaterialApp(home: GlobalLoader(child: Text('tela'))),
      ),
    );

    expect(find.text('Carregando'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.text('tela'), findsOneWidget);

    final screen = tester.getCenter(find.byType(ColoredBox));
    final indicator = tester.getCenter(find.byType(CircularProgressIndicator));
    final label = tester.getCenter(find.text('Carregando'));
    expect(indicator.dx, closeTo(screen.dx, 1));
    expect(label.dx, closeTo(screen.dx, 1));
    expect((indicator.dy - screen.dy).abs(), lessThan(80));
    expect(label.dy, greaterThan(indicator.dy));
  });

  testWidgets('sem espera a barra e o círculo ficam fora da tela', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: GlobalLoader(child: Text('tela'))),
      ),
    );

    expect(find.text('Carregando'), findsNothing);
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.text('tela'), findsOneWidget);
  });
}
