import '../../../data/models/session_user.dart';
import '../../../data/network/dio_client.dart';

class AuthService {
  AuthService(this._client);

  final ApiClient _client;

  Future<IssuedSession> register({
    required String fullName,
    required String cpf,
    required String email,
    required String companyName,
    required String password,
  }) async {
    final data = await _client.post('/api/v1/auth/register', {
      'full_name': fullName,
      'cpf': cpf,
      'email': email,
      'company_name': companyName,
      'password': password,
    });
    return IssuedSession.fromJson(data);
  }

  Future<IssuedSession> login(String cpf, String password) async {
    final data = await _client.post('/api/v1/auth/login', {
      'cpf': cpf,
      'password': password,
    });
    return IssuedSession.fromJson(data);
  }

  Future<SessionUser> me() async {
    final data = await _client.get('/api/v1/auth/me');
    return SessionUser.fromJson(data);
  }

  Future<IssuedSession> switchTenant(int tenantId) async {
    final data = await _client.post('/api/v1/auth/switch-tenant', {'tenant_id': tenantId});
    return IssuedSession.fromJson(data);
  }

  Future<void> logout() => _client.post('/api/v1/auth/logout', {});

  Future<String> forgotPassword(String email) async {
    final data = await _client.post('/api/v1/auth/forgot-password', {'email': email});
    final message = data['message'];
    return message is String ? message : 'Se o e-mail existir, enviaremos as instruções.';
  }

  Future<void> resetPassword(String token, String newPassword) {
    return _client.post('/api/v1/auth/reset-password', {
      'token': token,
      'new_password': newPassword,
    });
  }

  Future<void> changePassword(String currentPassword, String newPassword) {
    return _client.post('/api/v1/auth/change-password', {
      'current_password': currentPassword,
      'new_password': newPassword,
    });
  }
}
