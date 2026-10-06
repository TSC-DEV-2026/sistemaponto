// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'session_user.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_SessionUser _$SessionUserFromJson(Map<String, dynamic> json) => _SessionUser(
  personId: (json['person_id'] as num).toInt(),
  fullName: json['full_name'] as String,
  email: json['email'] as String,
  emailVerified: json['email_verified'] as bool,
  role: json['role'] as String?,
  activeTenant: json['active_tenant'] == null
      ? null
      : Tenant.fromJson(json['active_tenant'] as Map<String, dynamic>),
  tenants: (json['tenants'] as List<dynamic>)
      .map((e) => Tenant.fromJson(e as Map<String, dynamic>))
      .toList(),
  mustLogin: json['must_login'] as bool? ?? false,
);

Map<String, dynamic> _$SessionUserToJson(_SessionUser instance) =>
    <String, dynamic>{
      'person_id': instance.personId,
      'full_name': instance.fullName,
      'email': instance.email,
      'email_verified': instance.emailVerified,
      'role': instance.role,
      'active_tenant': instance.activeTenant,
      'tenants': instance.tenants,
      'must_login': instance.mustLogin,
    };
