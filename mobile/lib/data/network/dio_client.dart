import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../../core/errors/api_exception.dart';
import 'token_store.dart';

class ApiClient {
  ApiClient(this.store) {
    final base = dotenv.env['API_URL'] ?? '';
    dio = Dio(BaseOptions(baseUrl: base));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          options.headers['X-Client'] = 'mobile';
          final token = store.access;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final status = error.response?.statusCode;
          final path = error.requestOptions.path;
          final skipped = path.contains('/auth/login') ||
              path.contains('/auth/register') ||
              path.contains('/auth/refresh');
          if (status != 401 || skipped || error.requestOptions.extra['retried'] == true) {
            handler.next(error);
            return;
          }
          final refresh = store.refresh;
          if (refresh == null || refresh.isEmpty) {
            onSessionLost?.call();
            handler.next(error);
            return;
          }
          try {
            final fresh = Dio(BaseOptions(baseUrl: dio.options.baseUrl));
            final response = await fresh.post<Map<String, dynamic>>(
              '/api/v1/auth/refresh',
              data: {'refresh_token': refresh},
              options: Options(headers: {'X-Client': 'mobile'}),
            );
            final payload = response.data?['data'];
            if (payload is! Map) {
              throw const ApiException('Resposta inválida');
            }
            final access = payload['access_token'] as String;
            final nextRefresh = payload['refresh_token'] as String;
            await store.save(access, nextRefresh);
            final request = error.requestOptions;
            request.extra['retried'] = true;
            request.headers['Authorization'] = 'Bearer $access';
            final clone = await dio.fetch<dynamic>(request);
            handler.resolve(clone);
          } catch (_) {
            await store.clear();
            onSessionLost?.call();
            handler.next(error);
          }
        },
      ),
    );
  }

  final TokenStore store;
  late final Dio dio;
  void Function()? onSessionLost;

  Future<Map<String, dynamic>> get(String path) => _send(() => dio.get<dynamic>(path));

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) {
    return _send(() => dio.post<dynamic>(path, data: body));
  }

  Future<Map<String, dynamic>> _send(Future<Response<dynamic>> Function() call) async {
    try {
      final response = await call();
      return _read(response);
    } on DioException catch (error) {
      throw _asApi(error);
    }
  }

  Map<String, dynamic> _read(Response<dynamic> response) {
    final body = response.data;
    if (body is Map && body['data'] is Map) {
      return Map<String, dynamic>.from(body['data'] as Map);
    }
    if (body is Map && body['data'] == null && body['error'] == null) {
      return {};
    }
    throw const ApiException('Resposta inválida');
  }

  ApiException _asApi(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['error'] is Map) {
      final message = (data['error'] as Map)['message'];
      if (message is String && message.isNotEmpty) {
        return ApiException(message, statusCode: error.response?.statusCode);
      }
    }
    return ApiException('Não foi possível concluir.', statusCode: error.response?.statusCode);
  }
}
