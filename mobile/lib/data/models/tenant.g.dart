// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tenant.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Tenant _$TenantFromJson(Map<String, dynamic> json) => _Tenant(
  id: (json['id'] as num).toInt(),
  name: json['name'] as String,
  slug: json['slug'] as String,
  document: json['document'] as String?,
  trialStartedAt: json['trial_started_at'] as String,
  trialEndsAt: json['trial_ends_at'] as String,
  employeeCapacity: (json['employee_capacity'] as num).toInt(),
);

Map<String, dynamic> _$TenantToJson(_Tenant instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'slug': instance.slug,
  'document': instance.document,
  'trial_started_at': instance.trialStartedAt,
  'trial_ends_at': instance.trialEndsAt,
  'employee_capacity': instance.employeeCapacity,
};
