import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../../../shared/widgets/brand_mark.dart';
import '../../providers/device_provider.dart';

class SetupScreen extends ConsumerStatefulWidget {
  const SetupScreen({required this.adding, super.key});

  final bool adding;

  @override
  ConsumerState<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends ConsumerState<SetupScreen> {
  final _code = TextEditingController();
  String _error = '';

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = '');
    ref.read(loaderProvider.notifier).state = true;
    try {
      await ref.read(deviceProvider.notifier).enroll(_code.text);
      if (mounted && widget.adding) {
        context.go('/');
      }
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final device = ref.watch(deviceProvider);
    final companies = device.grants.length;
    final companyLabel = companies == 1 ? '1 organização neste aparelho' : '$companies organizações neste aparelho';
    return Scaffold(
      appBar: widget.adding ? AppBar(title: const Text('Organização')) : null,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!widget.adding) const BrandMarkBanner(centered: true),
          Expanded(
            child: SafeArea(
              top: widget.adding,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(minHeight: constraints.maxHeight > 48 ? constraints.maxHeight - 48 : 0),
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 420),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              if (widget.adding) ...[
                                Text(companyLabel, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
                                const SizedBox(height: 8),
                              ],
                              Text(
                                widget.adding
                                    ? 'Digite o código gerado na outra conta. A organização que já está aqui permanece.'
                                    : 'Digite o código gerado no site. Ele mistura letras e números, vale uma vez e por poucos minutos.',
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                              if (device.publicId.isNotEmpty) ...[
                                const SizedBox(height: 16),
                                Text('Identificador deste aparelho', textAlign: TextAlign.center, style: Theme.of(context).textTheme.labelLarge),
                                const SizedBox(height: 4),
                                SelectableText(device.publicId, textAlign: TextAlign.center),
                              ],
                              const SizedBox(height: 24),
                              TextField(
                                controller: _code,
                                keyboardType: TextInputType.text,
                                textCapitalization: TextCapitalization.characters,
                                autocorrect: false,
                                enableSuggestions: false,
                                inputFormatters: [
                                  FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9 ]')),
                                  LengthLimitingTextInputFormatter(11),
                                ],
                                decoration: const InputDecoration(labelText: 'Código'),
                              ),
                              if (_error.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                Text(_error, textAlign: TextAlign.center, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                              ],
                              const SizedBox(height: 24),
                              FilledButton(onPressed: device.ready ? _submit : null, child: const Text('Liberar')),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
