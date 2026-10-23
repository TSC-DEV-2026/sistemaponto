import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../data/models/session_user.dart';
import '../../../data/network/dio_client.dart';
import '../../../data/network/token_store.dart';
import '../../../data/network/stored_session.dart';
import '../data/auth_service.dart';

class AuthState {
  const AuthState({
    this.ready = false,
    this.accessToken,
    this.user,
  });

  final bool ready;
  final String? accessToken;
  final SessionUser? user;

  bool get isAuthenticated => accessToken != null && accessToken!.isNotEmpty;
}

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());

final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient(ref.watch(tokenStoreProvider));
  client.onSessionLost = () {
    ref.read(authProvider.notifier).sessionLost();
  };
  return client;
});

final authServiceProvider = Provider<AuthService>((ref) => AuthService(ref.watch(apiClientProvider)));

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future.microtask(hydrate);
    return const AuthState();
  }

  AuthService get _service => ref.read(authServiceProvider);

  TokenStore get _store => ref.read(tokenStoreProvider);

  Future<void> hydrate() async {
    await _store.load();
    if (_store.access == null || _store.access!.isEmpty) {
      state = const AuthState(ready: true);
      return;
    }
    final cached = await _store.readSession();
    if (cached != null) {
      state = AuthState(ready: true, accessToken: _store.access, user: cached);
      unawaited(_refreshSession());
      return;
    }
    try {
      final user = await _service.me();
      await _store.saveSession(user);
      state = AuthState(ready: true, accessToken: _store.access, user: user);
    } on ApiException catch (error) {
      if (sessionDroppedByStatus(error.statusCode)) {
        await _store.clear();
        state = const AuthState(ready: true);
        return;
      }
      state = AuthState(ready: true, accessToken: _store.access);
    } catch (_) {
      state = AuthState(ready: true, accessToken: _store.access);
    }
  }

  Future<void> _refreshSession() async {
    try {
      final user = await _service.me();
      if (!state.isAuthenticated) {
        return;
      }
      await _store.saveSession(user);
      state = AuthState(ready: true, accessToken: _store.access, user: user);
    } on ApiException catch (error) {
      if (!sessionDroppedByStatus(error.statusCode) || !state.isAuthenticated) {
        return;
      }
      await _store.clear();
      state = const AuthState(ready: true);
    }
  }

  Future<void> adopt(IssuedSession issued) async {
    final access = issued.accessToken;
    final refresh = issued.refreshToken;
    if (access == null || refresh == null) {
      state = AuthState(ready: true, user: issued.user);
      return;
    }
    await _store.save(access, refresh);
    await _store.saveSession(issued.user);
    state = AuthState(ready: true, accessToken: access, user: issued.user);
  }

  Future<void> logout() async {
    try {
      await _service.logout();
    } catch (_) {
      // A tela encerra a sessão mesmo se a API não responder.
    }
    await _store.clear();
    state = const AuthState(ready: true);
  }

  Future<void> sessionLost() async {
    await _store.clear();
    state = const AuthState(ready: true);
  }
}
