import 'package:freezed_annotation/freezed_annotation.dart';

part 'tenant.freezed.dart';
part 'tenant.g.dart';

@freezed
abstract class Tenant with _$Tenant {
  const factory Tenant({
    required int id,
    required String name,
    required String slug,
    String? document,
    @JsonKey(name: 'trial_started_at') required String trialStartedAt,
    @JsonKey(name: 'trial_ends_at') required String trialEndsAt,
    @JsonKey(name: 'employee_capacity') required int employeeCapacity,
  }) = _Tenant;

  factory Tenant.fromJson(Map<String, dynamic> json) => _$TenantFromJson(json);
}
