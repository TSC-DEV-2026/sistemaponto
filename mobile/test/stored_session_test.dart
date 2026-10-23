import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:sistemaponto/data/models/session_user.dart';
import 'package:sistemaponto/data/models/tenant.dart';
import 'package:sistemaponto/data/network/stored_session.dart';

void main() {
  test('a sessão guardada volta com o mesmo vínculo', () {
    const user = SessionUser(
      personId: 10,
      fullName: 'Ana',
      email: 'ana@x.com',
      emailVerified: false,
      role: 'member',
      activeTenant: Tenant(
        id: 1,
        name: 'Oficina',
        slug: 'oficina',
        trialStartedAt: '2026-10-06T12:00:00Z',
        trialEndsAt: '2026-10-13T12:00:00Z',
        employeeCapacity: 10,
      ),
      tenants: [
        Tenant(
          id: 1,
          name: 'Oficina',
          slug: 'oficina',
          trialStartedAt: '2026-10-06T12:00:00Z',
          trialEndsAt: '2026-10-13T12:00:00Z',
          employeeCapacity: 10,
        ),
      ],
    );
    final restored = sessionFromCache(jsonDecode(jsonEncode(sessionCacheJson(user))));
    expect(restored?.personId, 10);
    expect(restored?.activeTenant?.id, 1);
    expect(restored?.tenants.single.name, 'Oficina');
  });

  test('só 401 e 403 apagam a sessão guardada', () {
    expect(sessionDroppedByStatus(null), isFalse);
    expect(sessionDroppedByStatus(500), isFalse);
    expect(sessionDroppedByStatus(401), isTrue);
    expect(sessionDroppedByStatus(403), isTrue);
  });
}
