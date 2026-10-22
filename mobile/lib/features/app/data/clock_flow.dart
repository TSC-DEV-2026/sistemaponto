import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:uuid/uuid.dart';

import '../../../core/errors/api_exception.dart';
import '../../../data/network/dio_client.dart';
import '../../../face/cosine_match.dart';
import '../../../face/face_pipeline.dart';
import '../../../face/mlkit_face_detector.dart';
import 'page_items.dart';
import 'clock_store.dart';

class ClockFlow {
  ClockFlow(this.client, {ClockStore? store}) : store = store ?? ClockStore.instance;

  final ApiClient client;
  final ClockStore store;
  final _uuid = const Uuid();

  Future<void> refreshFaces() async {
    final faces = <StoredFace>[];
    var page = 1;
    while (true) {
      final data = await client.get('/api/v1/face-embeddings', query: {'page': page, 'limit': 100});
      final items = pageItems(data);
      for (final item in items) {
        final raw = item['embedding'];
        if (raw is! List) {
          continue;
        }
        faces.add(
          StoredFace(
            employeeId: item['employee_id'] as int,
            embedding: raw.map((value) => (value as num).toDouble()).toList(),
            threshold: (item['threshold'] as num?)?.toDouble() ?? 0.40,
          ),
        );
      }
      final total = data['total'] as int? ?? items.length;
      if (items.isEmpty || page * 100 >= total) {
        break;
      }
      page += 1;
    }
    await store.replaceFaces(faces);
  }

  Future<int> syncPending() async {
    final rows = await store.pending();
    var sent = 0;
    for (final row in rows) {
      final file = File(row.imagePath);
      if (!await file.exists()) {
        await store.dropPending(row.id);
        continue;
      }
      try {
        final bytes = await _jpeg(await file.readAsBytes());
        await client.post('/api/v1/punches/faces', {
          'employee_id': row.employeeId,
          'occurred_at': row.occurredAt,
          'image': base64Encode(bytes),
          'channel': 'offline',
          'client_event_id': row.clientEventId,
          'note': null,
        });
        await store.dropPending(row.id);
        sent += 1;
      } on ApiException catch (error) {
        if (error.statusCode == null) {
          break;
        }
        await store.dropPending(row.id);
      }
    }
    return sent;
  }

  Future<void> punchQr({
    required int employeeId,
    required String content,
    required Uint8List qrImage,
    required Uint8List selfie,
  }) async {
    final expected = await client.get('/api/v1/punch-codes', query: {'employee_id': employeeId});
    if ('${expected['content'] ?? ''}' != content.trim()) {
      throw const ApiException('O QR Code não foi aceito.');
    }
    await client.post('/api/v1/punches/qr-selfies', {
      'employee_id': employeeId,
      'occurred_at': DateTime.now().toUtc().toIso8601String(),
      'content': content.trim(),
      'qr_image': base64Encode(await _jpeg(qrImage)),
      'selfie_image': base64Encode(await _jpeg(selfie)),
      'note': null,
    });
  }

  Future<String> punchFace({required int employeeId, required String imagePath}) async {
    final bytes = await _jpeg(await File(imagePath).readAsBytes());
    final occurred = DateTime.now().toUtc().toIso8601String();
    final eventId = _uuid.v4();
    try {
      await client.post('/api/v1/punches/faces', {
        'employee_id': employeeId,
        'occurred_at': occurred,
        'image': base64Encode(bytes),
        'channel': 'online',
        'client_event_id': eventId,
        'note': null,
      });
      return 'Marcação por rosto registrada.';
    } on ApiException catch (error) {
      if (error.statusCode != null) {
        rethrow;
      }
    }
    final employee = await _matchLocal(employeeId, imagePath);
    if (employee != employeeId) {
      throw const ApiException('O rosto não foi reconhecido.');
    }
    final kept = await _keepPhoto(imagePath, eventId);
    await store.addPending(
      employeeId: employeeId,
      clientEventId: eventId,
      occurredAt: occurred,
      imagePath: kept,
    );
    return 'Marcação guardada neste aparelho. Ela sobe quando a internet voltar.';
  }

  Future<int?> _matchLocal(int employeeId, String imagePath) async {
    final registry = await store.samples();
    if (registry.isEmpty) {
      throw const ApiException('Reconhecimento offline indisponível.');
    }
    final List<double> vector;
    try {
      vector = await _embed(imagePath);
    } catch (_) {
      throw const ApiException('Reconhecimento offline indisponível.');
    }
    final matched = matchEmployee(
      query: vector,
      registry: registry,
      threshold: await store.threshold(),
    );
    if (matched != employeeId) {
      return null;
    }
    return matched;
  }

  Future<List<double>> _embed(String imagePath) async {
    final detector = MlKitFaceLandmarks.create();
    try {
      return await FaceEmbeddingPipeline(detector: detector).embedFromFile(imagePath);
    } finally {
      await detector.close();
    }
  }

  Future<String> _keepPhoto(String source, String eventId) async {
    final file = File(source);
    final target = File('${file.parent.path}/face_$eventId.jpg');
    await target.writeAsBytes(await _jpeg(await file.readAsBytes()));
    return target.path;
  }

  Future<Uint8List> _jpeg(List<int> raw) async {
    final bytes = Uint8List.fromList(raw);
    final jpeg = bytes.length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF;
    final png = bytes.length >= 8 && bytes[0] == 0x89 && bytes[1] == 0x50;
    if ((jpeg || png) && bytes.length <= 2 * 1024 * 1024) {
      return bytes;
    }
    final decoded = img.decodeImage(bytes);
    if (decoded == null) {
      throw const ApiException('A foto não foi aceita.');
    }
    return Uint8List.fromList(img.encodeJpg(decoded, quality: 70));
  }
}
