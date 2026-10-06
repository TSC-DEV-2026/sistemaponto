import 'package:flutter_test/flutter_test.dart';
import 'package:sistemaponto/data/models/session_user.dart';

void main() {
  test('sessão ignora token e lê o vínculo', () {
    final issued = IssuedSession.fromJson({
      'person_id': 10,
      'full_name': 'Ana',
      'email': 'ana@x.com',
      'email_verified': false,
      'role': 'admin',
      'active_tenant': {
        'id': 1,
        'name': 'Oficina',
        'slug': 'oficina',
        'document': null,
        'trial_started_at': '2026-10-06T12:00:00Z',
        'trial_ends_at': '2026-10-13T12:00:00Z',
        'employee_capacity': 10,
      },
      'tenants': [
        {
          'id': 1,
          'name': 'Oficina',
          'slug': 'oficina',
          'document': null,
          'trial_started_at': '2026-10-06T12:00:00Z',
          'trial_ends_at': '2026-10-13T12:00:00Z',
          'employee_capacity': 10,
        },
      ],
      'must_login': false,
      'access_token': 'nao-entra-no-usuario',
      'refresh_token': 'nao-entra-no-usuario',
    });
    expect(issued.user.fullName, 'Ana');
    expect(issued.user.activeTenant?.employeeCapacity, 10);
    expect(issued.accessToken, 'nao-entra-no-usuario');
    expect(issued.user.mustLogin, isFalse);
  });
}
