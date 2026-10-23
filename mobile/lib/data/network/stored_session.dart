import '../models/session_user.dart';

Map<String, dynamic> sessionCacheJson(SessionUser user) {
  return {
    'person_id': user.personId,
    'full_name': user.fullName,
    'email': user.email,
    'email_verified': user.emailVerified,
    'role': user.role,
    'active_tenant': user.activeTenant?.toJson(),
    'tenants': user.tenants.map((item) => item.toJson()).toList(),
    'must_login': user.mustLogin,
  };
}

SessionUser? sessionFromCache(Object? decoded) {
  if (decoded is! Map) {
    return null;
  }
  try {
    return SessionUser.fromJson(Map<String, dynamic>.from(decoded));
  } catch (_) {
    return null;
  }
}

bool sessionDroppedByStatus(int? statusCode) => statusCode == 401 || statusCode == 403;
