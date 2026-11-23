import 'package:flutter/material.dart';

class PanelSpinner extends StatelessWidget {
  const PanelSpinner({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 32),
      child: Center(child: CircularProgressIndicator()),
    );
  }
}
