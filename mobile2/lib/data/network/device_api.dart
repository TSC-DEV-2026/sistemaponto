import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../../core/errors/api_exception.dart';

class DeviceApi {
  DeviceApi() {
    final base = dotenv.env['API_URL'] ?? '';
    dio = Dio(
      BaseOptions(
        baseUrl: base,
        connectTimeout: const Duration(seconds: 8),
        sendTimeout: const Duration(seconds: 45),
        receiveTimeout: const Duration(seconds: 45),
        headers: {'X-Client': 'mobile'},
      ),
    );
  }

  late final Dio dio;

  Future<Map<String, dynamic>> enroll(String publicId, String code) {
    return _send(() => dio.post<dynamic>('/api/v1/clock-devices', data: {'public_id': publicId, 'code': code}));
  }

  Future<Map<String, dynamic>> methods(String publicId, List<String> keys) {
    return _send(() => dio.get<dynamic>('/api/v1/clock-devices/methods', options: _device(publicId, keys)));
  }

  Future<Map<String, dynamic>> embeddings(String publicId, List<String> keys, int page) {
    return _send(
      () => dio.get<dynamic>(
        '/api/v1/clock-devices/face-embeddings',
        queryParameters: {'page': page, 'limit': 100},
        options: _device(publicId, keys),
      ),
    );
  }

  Future<Map<String, dynamic>> punchFace(
    String publicId,
    List<String> keys, {
    required String occurredAt,
    required String image,
    required String channel,
    required String eventId,
  }) {
    return _send(
      () => dio.post<dynamic>(
        '/api/v1/clock-devices/face-punches',
        data: {
          'occurred_at': occurredAt,
          'image': image,
          'channel': channel,
          'client_event_id': eventId,
        },
        options: _device(publicId, keys),
      ),
    );
  }

  Future<Map<String, dynamic>> punchQr(
    String publicId,
    List<String> keys, {
    required String occurredAt,
    required String content,
    required String qrImage,
    required String selfieImage,
  }) {
    return _send(
      () => dio.post<dynamic>(
        '/api/v1/clock-devices/qr-punches',
        data: {
          'occurred_at': occurredAt,
          'content': content,
          'qr_image': qrImage,
          'selfie_image': selfieImage,
        },
        options: _device(publicId, keys),
      ),
    );
  }

  Options _device(String publicId, List<String> keys) {
    return Options(headers: {'X-Device-Id': publicId, 'X-Device-Keys': keys.join(',')});
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
