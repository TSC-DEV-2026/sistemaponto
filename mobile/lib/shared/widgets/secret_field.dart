import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class SecretField extends StatefulWidget {
  const SecretField({required this.controller, required this.label, super.key});

  final TextEditingController controller;
  final String label;

  @override
  State<SecretField> createState() => _SecretFieldState();
}

class _SecretFieldState extends State<SecretField> {
  bool _visible = false;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: widget.controller,
      obscureText: !_visible,
      decoration: InputDecoration(
        labelText: widget.label,
        suffixIcon: IconButton(
          tooltip: _visible ? 'Ocultar senha' : 'Mostrar senha',
          onPressed: () => setState(() => _visible = !_visible),
          icon: Icon(_visible ? LucideIcons.eyeOff : LucideIcons.eye),
        ),
      ),
    );
  }
}
