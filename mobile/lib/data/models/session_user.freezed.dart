// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'session_user.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$SessionUser {

@JsonKey(name: 'person_id') int get personId;@JsonKey(name: 'full_name') String get fullName; String get email;@JsonKey(name: 'email_verified') bool get emailVerified; String? get role;@JsonKey(name: 'active_tenant') Tenant? get activeTenant; List<Tenant> get tenants;@JsonKey(name: 'must_login') bool get mustLogin;
/// Create a copy of SessionUser
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SessionUserCopyWith<SessionUser> get copyWith => _$SessionUserCopyWithImpl<SessionUser>(this as SessionUser, _$identity);

  /// Serializes this SessionUser to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SessionUser&&(identical(other.personId, personId) || other.personId == personId)&&(identical(other.fullName, fullName) || other.fullName == fullName)&&(identical(other.email, email) || other.email == email)&&(identical(other.emailVerified, emailVerified) || other.emailVerified == emailVerified)&&(identical(other.role, role) || other.role == role)&&(identical(other.activeTenant, activeTenant) || other.activeTenant == activeTenant)&&const DeepCollectionEquality().equals(other.tenants, tenants)&&(identical(other.mustLogin, mustLogin) || other.mustLogin == mustLogin));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,personId,fullName,email,emailVerified,role,activeTenant,const DeepCollectionEquality().hash(tenants),mustLogin);

@override
String toString() {
  return 'SessionUser(personId: $personId, fullName: $fullName, email: $email, emailVerified: $emailVerified, role: $role, activeTenant: $activeTenant, tenants: $tenants, mustLogin: $mustLogin)';
}


}

/// @nodoc
abstract mixin class $SessionUserCopyWith<$Res>  {
  factory $SessionUserCopyWith(SessionUser value, $Res Function(SessionUser) _then) = _$SessionUserCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'person_id') int personId,@JsonKey(name: 'full_name') String fullName, String email,@JsonKey(name: 'email_verified') bool emailVerified, String? role,@JsonKey(name: 'active_tenant') Tenant? activeTenant, List<Tenant> tenants,@JsonKey(name: 'must_login') bool mustLogin
});


$TenantCopyWith<$Res>? get activeTenant;

}
/// @nodoc
class _$SessionUserCopyWithImpl<$Res>
    implements $SessionUserCopyWith<$Res> {
  _$SessionUserCopyWithImpl(this._self, this._then);

  final SessionUser _self;
  final $Res Function(SessionUser) _then;

/// Create a copy of SessionUser
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? personId = null,Object? fullName = null,Object? email = null,Object? emailVerified = null,Object? role = freezed,Object? activeTenant = freezed,Object? tenants = null,Object? mustLogin = null,}) {
  return _then(_self.copyWith(
personId: null == personId ? _self.personId : personId // ignore: cast_nullable_to_non_nullable
as int,fullName: null == fullName ? _self.fullName : fullName // ignore: cast_nullable_to_non_nullable
as String,email: null == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String,emailVerified: null == emailVerified ? _self.emailVerified : emailVerified // ignore: cast_nullable_to_non_nullable
as bool,role: freezed == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as String?,activeTenant: freezed == activeTenant ? _self.activeTenant : activeTenant // ignore: cast_nullable_to_non_nullable
as Tenant?,tenants: null == tenants ? _self.tenants : tenants // ignore: cast_nullable_to_non_nullable
as List<Tenant>,mustLogin: null == mustLogin ? _self.mustLogin : mustLogin // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}
/// Create a copy of SessionUser
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$TenantCopyWith<$Res>? get activeTenant {
    if (_self.activeTenant == null) {
    return null;
  }

  return $TenantCopyWith<$Res>(_self.activeTenant!, (value) {
    return _then(_self.copyWith(activeTenant: value));
  });
}
}


/// Adds pattern-matching-related methods to [SessionUser].
extension SessionUserPatterns on SessionUser {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SessionUser value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SessionUser() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SessionUser value)  $default,){
final _that = this;
switch (_that) {
case _SessionUser():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SessionUser value)?  $default,){
final _that = this;
switch (_that) {
case _SessionUser() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'person_id')  int personId, @JsonKey(name: 'full_name')  String fullName,  String email, @JsonKey(name: 'email_verified')  bool emailVerified,  String? role, @JsonKey(name: 'active_tenant')  Tenant? activeTenant,  List<Tenant> tenants, @JsonKey(name: 'must_login')  bool mustLogin)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SessionUser() when $default != null:
return $default(_that.personId,_that.fullName,_that.email,_that.emailVerified,_that.role,_that.activeTenant,_that.tenants,_that.mustLogin);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'person_id')  int personId, @JsonKey(name: 'full_name')  String fullName,  String email, @JsonKey(name: 'email_verified')  bool emailVerified,  String? role, @JsonKey(name: 'active_tenant')  Tenant? activeTenant,  List<Tenant> tenants, @JsonKey(name: 'must_login')  bool mustLogin)  $default,) {final _that = this;
switch (_that) {
case _SessionUser():
return $default(_that.personId,_that.fullName,_that.email,_that.emailVerified,_that.role,_that.activeTenant,_that.tenants,_that.mustLogin);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'person_id')  int personId, @JsonKey(name: 'full_name')  String fullName,  String email, @JsonKey(name: 'email_verified')  bool emailVerified,  String? role, @JsonKey(name: 'active_tenant')  Tenant? activeTenant,  List<Tenant> tenants, @JsonKey(name: 'must_login')  bool mustLogin)?  $default,) {final _that = this;
switch (_that) {
case _SessionUser() when $default != null:
return $default(_that.personId,_that.fullName,_that.email,_that.emailVerified,_that.role,_that.activeTenant,_that.tenants,_that.mustLogin);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SessionUser implements SessionUser {
  const _SessionUser({@JsonKey(name: 'person_id') required this.personId, @JsonKey(name: 'full_name') required this.fullName, required this.email, @JsonKey(name: 'email_verified') required this.emailVerified, this.role, @JsonKey(name: 'active_tenant') this.activeTenant, required final  List<Tenant> tenants, @JsonKey(name: 'must_login') this.mustLogin = false}): _tenants = tenants;
  factory _SessionUser.fromJson(Map<String, dynamic> json) => _$SessionUserFromJson(json);

@override@JsonKey(name: 'person_id') final  int personId;
@override@JsonKey(name: 'full_name') final  String fullName;
@override final  String email;
@override@JsonKey(name: 'email_verified') final  bool emailVerified;
@override final  String? role;
@override@JsonKey(name: 'active_tenant') final  Tenant? activeTenant;
 final  List<Tenant> _tenants;
@override List<Tenant> get tenants {
  if (_tenants is EqualUnmodifiableListView) return _tenants;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tenants);
}

@override@JsonKey(name: 'must_login') final  bool mustLogin;

/// Create a copy of SessionUser
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SessionUserCopyWith<_SessionUser> get copyWith => __$SessionUserCopyWithImpl<_SessionUser>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SessionUserToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SessionUser&&(identical(other.personId, personId) || other.personId == personId)&&(identical(other.fullName, fullName) || other.fullName == fullName)&&(identical(other.email, email) || other.email == email)&&(identical(other.emailVerified, emailVerified) || other.emailVerified == emailVerified)&&(identical(other.role, role) || other.role == role)&&(identical(other.activeTenant, activeTenant) || other.activeTenant == activeTenant)&&const DeepCollectionEquality().equals(other._tenants, _tenants)&&(identical(other.mustLogin, mustLogin) || other.mustLogin == mustLogin));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,personId,fullName,email,emailVerified,role,activeTenant,const DeepCollectionEquality().hash(_tenants),mustLogin);

@override
String toString() {
  return 'SessionUser(personId: $personId, fullName: $fullName, email: $email, emailVerified: $emailVerified, role: $role, activeTenant: $activeTenant, tenants: $tenants, mustLogin: $mustLogin)';
}


}

/// @nodoc
abstract mixin class _$SessionUserCopyWith<$Res> implements $SessionUserCopyWith<$Res> {
  factory _$SessionUserCopyWith(_SessionUser value, $Res Function(_SessionUser) _then) = __$SessionUserCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'person_id') int personId,@JsonKey(name: 'full_name') String fullName, String email,@JsonKey(name: 'email_verified') bool emailVerified, String? role,@JsonKey(name: 'active_tenant') Tenant? activeTenant, List<Tenant> tenants,@JsonKey(name: 'must_login') bool mustLogin
});


@override $TenantCopyWith<$Res>? get activeTenant;

}
/// @nodoc
class __$SessionUserCopyWithImpl<$Res>
    implements _$SessionUserCopyWith<$Res> {
  __$SessionUserCopyWithImpl(this._self, this._then);

  final _SessionUser _self;
  final $Res Function(_SessionUser) _then;

/// Create a copy of SessionUser
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? personId = null,Object? fullName = null,Object? email = null,Object? emailVerified = null,Object? role = freezed,Object? activeTenant = freezed,Object? tenants = null,Object? mustLogin = null,}) {
  return _then(_SessionUser(
personId: null == personId ? _self.personId : personId // ignore: cast_nullable_to_non_nullable
as int,fullName: null == fullName ? _self.fullName : fullName // ignore: cast_nullable_to_non_nullable
as String,email: null == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String,emailVerified: null == emailVerified ? _self.emailVerified : emailVerified // ignore: cast_nullable_to_non_nullable
as bool,role: freezed == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as String?,activeTenant: freezed == activeTenant ? _self.activeTenant : activeTenant // ignore: cast_nullable_to_non_nullable
as Tenant?,tenants: null == tenants ? _self._tenants : tenants // ignore: cast_nullable_to_non_nullable
as List<Tenant>,mustLogin: null == mustLogin ? _self.mustLogin : mustLogin // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

/// Create a copy of SessionUser
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$TenantCopyWith<$Res>? get activeTenant {
    if (_self.activeTenant == null) {
    return null;
  }

  return $TenantCopyWith<$Res>(_self.activeTenant!, (value) {
    return _then(_self.copyWith(activeTenant: value));
  });
}
}

// dart format on
