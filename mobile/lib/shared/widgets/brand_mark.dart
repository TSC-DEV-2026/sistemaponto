import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Marca no estilo da sidebar do site: fundo escuro, "sistema" branco, "ponto" claro.
class BrandMarkBanner extends StatelessWidget {
  const BrandMarkBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).textTheme.titleMedium?.copyWith(
      color: BrandColors.white,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.3,
    );
    return ColoredBox(
      color: BrandColors.markPanel,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 20),
          child: Text.rich(
            TextSpan(
              text: 'sistema',
              style: base,
              children: [
                TextSpan(text: 'ponto', style: base?.copyWith(color: BrandColors.wordmarkOnDark)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
