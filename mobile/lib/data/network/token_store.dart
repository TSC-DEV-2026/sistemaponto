import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/session_user.dart';
import 'stored_session.dart';

class TokenStore {
  TokenStore({FlutterSecureStorage? storage}) : _storage = storage ?? const FlutterSecureStorage();

  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';
  static const _sessionKey = 'session_user';
  static const _employeeKey = 'employee_snapshot';

  final FlutterSecureStorage _storage;
  String? access;
  String? refresh;

  Future<void> load() async {
    access = await _storage.read(key: _accessKey);
    refresh = await _storage.read(key: _refreshKey);
  }

  Future<void> save(String accessToken, String refreshToken) async {
    access = accessToken;
    refresh = refreshToken;
    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  Future<void> saveSession(SessionUser user) {
    return _storage.write(key: _sessionKey, value: jsonEncode(sessionCacheJson(user)));
  }

  Future<SessionUser?> readSession() async {
    final raw = await _storage.read(key: _sessionKey);
    if (raw == null || raw.isEmpty) {
      return null;
    }
    try {
      return sessionFromCache(jsonDecode(raw));
    } catch (_) {
      return null;
    }
  }

  Future<void> saveEmployee(int tenantId, Map<String, dynamic> employee) {
    final id = employee['id'];
    final snapshot = {
      'tenant_id': tenantId,
      'id': id is num ? id.toInt() : int.parse('$id'),
      'full_name': '${employee['full_name'] ?? ''}',
      'situation': '${employee['situation'] ?? ''}',
      'clock_method': '${employee['clock_method'] ?? 'simple'}',
      'journey_label': employee['journey_label'],
      'unit_label': employee['unit_label'],
      'hour_bank': employee['hour_bank'] == true,
    };
    return _storage.write(key: _employeeKey, value: jsonEncode(snapshot));
  }

  Future<Map<String, dynamic>?> readEmployee(int tenantId) async {
    final raw = await _storage.read(key: _employeeKey);
    if (raw == null || raw.isEmpty) {
      return null;
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map || decoded['tenant_id'] != tenantId) {
        return null;
      }
      return Map<String, dynamic>.from(decoded);
    } catch (_) {
      return null;
    }
  }

  Future<void> forgetEmployee() {
    return _storage.delete(key: _employeeKey);
  }

  Future<void> clear() async {
    access = null;
    refresh = null;
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _sessionKey);
    await _storage.delete(key: _employeeKey);
  }
}
