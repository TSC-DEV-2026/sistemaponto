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
    final onPressed = widget.onPressed == null || _busy ? null : _run;
    final spinner = SizedBox(
      width: 18,
      height: 18,
      child: CircularProgressIndicator(
        strokeWidth: 2,
        color: widget.kind == BusyButtonKind.filled ? Theme.of(context).colorScheme.onPrimary : null,
      ),
    );
    final Widget button;
    if (!_busy && widget.icon != null) {
      final icon = Icon(widget.icon);
      final label = Text(widget.label);
      button = switch (widget.kind) {
        BusyButtonKind.filled => FilledButton.icon(onPressed: onPressed, icon: icon, label: label),
        BusyButtonKind.outlined => OutlinedButton.icon(onPressed: onPressed, icon: icon, label: label),
        BusyButtonKind.text => TextButton.icon(onPressed: onPressed, icon: icon, label: label),
      };
    } else {
      final child = _busy ? spinner : Text(widget.label);
      button = switch (widget.kind) {
        BusyButtonKind.filled => FilledButton(onPressed: onPressed, child: child),
        BusyButtonKind.outlined => OutlinedButton(onPressed: onPressed, child: child),
        BusyButtonKind.text => TextButton(onPressed: onPressed, child: child),
      };
    }
    return Semantics(button: true, label: _busy ? 'Carregando' : null, child: button);
  }
}
