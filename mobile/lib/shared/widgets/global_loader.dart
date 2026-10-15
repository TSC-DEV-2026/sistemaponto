import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/loader_provider.dart';

class GlobalLoader extends ConsumerWidget {
  const GlobalLoader({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loading = ref.watch(loaderProvider);
    return Stack(
      children: [
        child,
        if (loading)
          const Positioned.fill(
            child: ColoredBox(
              color: Color(0xCCF8FAFC),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 12),
                    Text('Carregando'),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
