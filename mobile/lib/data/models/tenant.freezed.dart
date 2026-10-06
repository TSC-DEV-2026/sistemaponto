// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'tenant.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Tenant {

 int get id; String get name; String get slug; String? get document;@JsonKey(name: 'trial_started_at') String get trialStartedAt;@JsonKey(name: 'trial_ends_at') String get trialEndsAt;@JsonKey(name: 'employee_capacity') int get employeeCapacity;
/// Create a copy of Tenant
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TenantCopyWith<Tenant> get copyWith => _$TenantCopyWithImpl<Tenant>(this as Tenant, _$identity);

  /// Serializes this Tenant to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Tenant&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.document, document) || other.document == document)&&(identical(other.trialStartedAt, trialStartedAt) || other.trialStartedAt == trialStartedAt)&&(identical(other.trialEndsAt, trialEndsAt) || other.trialEndsAt == trialEndsAt)&&(identical(other.employeeCapacity, employeeCapacity) || other.employeeCapacity == employeeCapacity));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,slug,document,trialStartedAt,trialEndsAt,employeeCapacity);

@override
String toString() {
  return 'Tenant(id: $id, name: $name, slug: $slug, document: $document, trialStartedAt: $trialStartedAt, trialEndsAt: $trialEndsAt, employeeCapacity: $employeeCapacity)';
}


}

/// @nodoc
abstract mixin class $TenantCopyWith<$Res>  {
  factory $TenantCopyWith(Tenant value, $Res Function(Tenant) _then) = _$TenantCopyWithImpl;
@useResult
$Res call({
 int id, String name, String slug, String? document,@JsonKey(name: 'trial_started_at') String trialStartedAt,@JsonKey(name: 'trial_ends_at') String trialEndsAt,@JsonKey(name: 'employee_capacity') int employeeCapacity
});




}
/// @nodoc
class _$TenantCopyWithImpl<$Res>
    implements $TenantCopyWith<$Res> {
  _$TenantCopyWithImpl(this._self, this._then);

  final Tenant _self;
  final $Res Function(Tenant) _then;

/// Create a copy of Tenant
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? slug = null,Object? document = freezed,Object? trialStartedAt = null,Object? trialEndsAt = null,Object? employeeCapacity = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,document: freezed == document ? _self.document : document // ignore: cast_nullable_to_non_nullable
as String?,trialStartedAt: null == trialStartedAt ? _self.trialStartedAt : trialStartedAt // ignore: cast_nullable_to_non_nullable
as String,trialEndsAt: null == trialEndsAt ? _self.trialEndsAt : trialEndsAt // ignore: cast_nullable_to_non_nullable
as String,employeeCapacity: null == employeeCapacity ? _self.employeeCapacity : employeeCapacity // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [Tenant].
extension TenantPatterns on Tenant {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Tenant value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Tenant() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Tenant value)  $default,){
final _that = this;
switch (_that) {
case _Tenant():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Tenant value)?  $default,){
final _that = this;
switch (_that) {
case _Tenant() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  String name,  String slug,  String? document, @JsonKey(name: 'trial_started_at')  String trialStartedAt, @JsonKey(name: 'trial_ends_at')  String trialEndsAt, @JsonKey(name: 'employee_capacity')  int employeeCapacity)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Tenant() when $default != null:
return $default(_that.id,_that.name,_that.slug,_that.document,_that.trialStartedAt,_that.trialEndsAt,_that.employeeCapacity);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  String name,  String slug,  String? document, @JsonKey(name: 'trial_started_at')  String trialStartedAt, @JsonKey(name: 'trial_ends_at')  String trialEndsAt, @JsonKey(name: 'employee_capacity')  int employeeCapacity)  $default,) {final _that = this;
switch (_that) {
case _Tenant():
return $default(_that.id,_that.name,_that.slug,_that.document,_that.trialStartedAt,_that.trialEndsAt,_that.employeeCapacity);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  String name,  String slug,  String? document, @JsonKey(name: 'trial_started_at')  String trialStartedAt, @JsonKey(name: 'trial_ends_at')  String trialEndsAt, @JsonKey(name: 'employee_capacity')  int employeeCapacity)?  $default,) {final _that = this;
switch (_that) {
case _Tenant() when $default != null:
return $default(_that.id,_that.name,_that.slug,_that.document,_that.trialStartedAt,_that.trialEndsAt,_that.employeeCapacity);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Tenant implements Tenant {
  const _Tenant({required this.id, required this.name, required this.slug, this.document, @JsonKey(name: 'trial_started_at') required this.trialStartedAt, @JsonKey(name: 'trial_ends_at') required this.trialEndsAt, @JsonKey(name: 'employee_capacity') required this.employeeCapacity});
  factory _Tenant.fromJson(Map<String, dynamic> json) => _$TenantFromJson(json);

@override final  int id;
@override final  String name;
@override final  String slug;
@override final  String? document;
@override@JsonKey(name: 'trial_started_at') final  String trialStartedAt;
@override@JsonKey(name: 'trial_ends_at') final  String trialEndsAt;
@override@JsonKey(name: 'employee_capacity') final  int employeeCapacity;

/// Create a copy of Tenant
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TenantCopyWith<_Tenant> get copyWith => __$TenantCopyWithImpl<_Tenant>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TenantToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Tenant&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.document, document) || other.document == document)&&(identical(other.trialStartedAt, trialStartedAt) || other.trialStartedAt == trialStartedAt)&&(identical(other.trialEndsAt, trialEndsAt) || other.trialEndsAt == trialEndsAt)&&(identical(other.employeeCapacity, employeeCapacity) || other.employeeCapacity == employeeCapacity));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,slug,document,trialStartedAt,trialEndsAt,employeeCapacity);

@override
String toString() {
  return 'Tenant(id: $id, name: $name, slug: $slug, document: $document, trialStartedAt: $trialStartedAt, trialEndsAt: $trialEndsAt, employeeCapacity: $employeeCapacity)';
}


}

/// @nodoc
abstract mixin class _$TenantCopyWith<$Res> implements $TenantCopyWith<$Res> {
  factory _$TenantCopyWith(_Tenant value, $Res Function(_Tenant) _then) = __$TenantCopyWithImpl;
@override @useResult
$Res call({
 int id, String name, String slug, String? document,@JsonKey(name: 'trial_started_at') String trialStartedAt,@JsonKey(name: 'trial_ends_at') String trialEndsAt,@JsonKey(name: 'employee_capacity') int employeeCapacity
});




}
/// @nodoc
class __$TenantCopyWithImpl<$Res>
    implements _$TenantCopyWith<$Res> {
  __$TenantCopyWithImpl(this._self, this._then);

  final _Tenant _self;
  final $Res Function(_Tenant) _then;

/// Create a copy of Tenant
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? slug = null,Object? document = freezed,Object? trialStartedAt = null,Object? trialEndsAt = null,Object? employeeCapacity = null,}) {
  return _then(_Tenant(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,document: freezed == document ? _self.document : document // ignore: cast_nullable_to_non_nullable
as String?,trialStartedAt: null == trialStartedAt ? _self.trialStartedAt : trialStartedAt // ignore: cast_nullable_to_non_nullable
as String,trialEndsAt: null == trialEndsAt ? _self.trialEndsAt : trialEndsAt // ignore: cast_nullable_to_non_nullable
as String,employeeCapacity: null == employeeCapacity ? _self.employeeCapacity : employeeCapacity // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
