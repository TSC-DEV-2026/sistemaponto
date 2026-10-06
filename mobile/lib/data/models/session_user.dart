import 'package:freezed_annotation/freezed_annotation.dart';

import 'tenant.dart';

part 'session_user.freezed.dart';
part 'session_user.g.dart';

@freezed
abstract class SessionUser with _$SessionUser {
  const factory SessionUser({
    @JsonKey(name: 'person_id') required int personId,
    @JsonKey(name: 'full_name') required String fullName,
    required String email,
    @JsonKey(name: 'email_verified') required bool emailVerified,
    String? role,
    @JsonKey(name: 'active_tenant') Tenant? activeTenant,
    required List<Tenant> tenants,
    @JsonKey(name: 'must_login') @Default(false) bool mustLogin,
  }) = _SessionUser;

  factory SessionUser.fromJson(Map<String, dynamic> json) => _$SessionUserFromJson(json);
}

class IssuedSession {
  const IssuedSession({
    required this.user,
    this.accessToken,
    this.refreshToken,
  });

  final SessionUser user;
  final String? accessToken;
  final String? refreshToken;

  factory IssuedSession.fromJson(Map<String, dynamic> json) {
    return IssuedSession(
      user: SessionUser.fromJson(json),
      accessToken: json['access_token'] as String?,
      refreshToken: json['refresh_token'] as String?,
    );
  }
}
