import 'package:flutter/material.dart';

enum BusyButtonKind { filled, outlined, text }

class BusyButton extends StatefulWidget {
  const BusyButton({
    required this.onPressed,
    required this.label,
    this.icon,
    this.kind = BusyButtonKind.filled,
    super.key,
  });

  final Future<void> Function()? onPressed;
  final String label;
  final IconData? icon;
  final BusyButtonKind kind;

  @override
  State<BusyButton> createState() => _BusyButtonState();
}

class _BusyButtonState extends State<BusyButton> {
  bool _busy = false;

  Future<void> _run() async {
    final action = widget.onPressed;
    if (_busy || action == null) return;
    setState(() => _busy = true);
    try {
      await action();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final spinner = SizedBox(
      width: 18,
      height: 18,
      child: CircularProgressIndicator(
        strokeWidth: 2,
        color: widget.kind == BusyButtonKind.filled ? Theme.of(context).colorScheme.onPrimary : null,
      ),
    );
    final label = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.icon != null) ...[
          Icon(widget.icon),
          const SizedBox(width: 8),
        ],
        Text(widget.label),
      ],
    );
    final child = Stack(
      alignment: Alignment.center,
      children: [
        Visibility(visible: !_busy, maintainSize: true, maintainAnimation: true, maintainState: true, child: label),
        if (_busy) spinner,
      ],
    );
    final onPressed = widget.onPressed == null ? null : _run;
    final button = AbsorbPointer(
      absorbing: _busy,
      child: switch (widget.kind) {
        BusyButtonKind.filled => FilledButton(onPressed: onPressed, child: child),
        BusyButtonKind.outlined => OutlinedButton(onPressed: onPressed, child: child),
        BusyButtonKind.text => TextButton(onPressed: onPressed, child: child),
      },
    );
    return Semantics(button: true, label: _busy ? 'Carregando' : null, child: button);
  }
}
