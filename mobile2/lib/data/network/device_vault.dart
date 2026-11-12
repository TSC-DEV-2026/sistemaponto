import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

class DeviceGrant {
  const DeviceGrant({required this.tenantId, required this.key});

  final int tenantId;
  final String key;

  Map<String, dynamic> toJson() => {'tenant_id': tenantId, 'key': key};

  static DeviceGrant fromJson(Map<String, dynamic> json) {
    return DeviceGrant(tenantId: json['tenant_id'] as int, key: json['key'] as String);
  }
}

class DeviceVault {
  DeviceVault({FlutterSecureStorage? storage}) : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  static const _idKey = 'device_public_id';
  static const _grantsKey = 'device_grants';
  static const _methodsKey = 'device_methods';

  Future<String> publicId() async {
    final current = await _storage.read(key: _idKey);
    if (current != null && current.isNotEmpty) {
      return current;
    }
    final created = const Uuid().v4();
    await _storage.write(key: _idKey, value: created);
    return created;
  }

  Future<List<DeviceGrant>> grants() async {
    final raw = await _storage.read(key: _grantsKey);
    if (raw == null || raw.isEmpty) {
      return [];
    }
    final decoded = jsonDecode(raw);
    if (decoded is! List) {
      return [];
    }
    return decoded.whereType<Map>().map((item) => DeviceGrant.fromJson(Map<String, dynamic>.from(item))).toList();
  }

  Future<void> saveGrants(List<DeviceGrant> grants) async {
    await _storage.write(key: _grantsKey, value: jsonEncode(grants.map((item) => item.toJson()).toList()));
  }

  Future<({bool face, bool qr})> methods() async {
    final raw = await _storage.read(key: _methodsKey);
    if (raw == null || raw.isEmpty) {
      return (face: false, qr: false);
    }
    final decoded = jsonDecode(raw);
    if (decoded is! Map) {
      return (face: false, qr: false);
    }
    return (face: decoded['face'] == true, qr: decoded['qr'] == true);
  }

  Future<void> saveMethods({required bool face, required bool qr}) async {
    await _storage.write(key: _methodsKey, value: jsonEncode({'face': face, 'qr': qr}));
  }
}
