import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:uuid/uuid.dart';

import '../../../core/errors/api_exception.dart';
import '../../../data/network/device_api.dart';
import '../../../data/network/device_vault.dart';
import '../../../face/cosine_match.dart';
import '../../../face/face_pipeline.dart';
import '../../../face/mlkit_face_detector.dart';
import 'clock_store.dart';
import 'face_decision.dart';
import 'page_items.dart';

class DeviceFlow {
  DeviceFlow(this.api, this.vault, this.store);

  final DeviceApi api;
  final DeviceVault vault;
  final ClockStore store;
  final _uuid = const Uuid();

  Future<DeviceGrant> enroll(String code) async {
    final publicId = await vault.publicId();
    final data = await api.enroll(publicId, code.trim());
    final grant = DeviceGrant(tenantId: data['tenant_id'] as int, key: data['key'] as String);
    final current = await vault.grants();
    final next = [
      for (final item in current)
        if (item.tenantId != grant.tenantId) item,
      grant,
    ];
    await vault.saveGrants(next);
    await refresh();
    return grant;
  }

  Future<void> refresh() async {
    final publicId = await vault.publicId();
    final grants = await vault.grants();
    if (grants.isEmpty) {
      await vault.saveMethods(face: false, qr: false);
      await store.replaceFaces([]);
      return;
    }
    final keys = grants.map((item) => item.key).toList();
    final methods = await api.methods(publicId, keys);
    final allowed = ((methods['tenant_ids'] as List?) ?? []).map(_asInt).whereType<int>().toSet();
    final kept = grants.where((item) => allowed.contains(item.tenantId)).toList();
    if (kept.length != grants.length) {
      await vault.saveGrants(kept);
    }
    await vault.saveMethods(face: methods['face'] == true, qr: methods['qr'] == true);
    if (kept.isEmpty) {
      await store.replaceFaces([]);
      return;
    }
    final faces = <StoredFace>[];
    var page = 1;
    while (true) {
      final data = await api.embeddings(publicId, kept.map((item) => item.key).toList(), page);
      final items = pageItems(data);
      for (final item in items) {
        final raw = item['embedding'];
        final tenantId = _asInt(item['tenant_id']);
        final employeeId = _asInt(item['employee_id']);
        if (raw is! List || tenantId == null || employeeId == null) {
          continue;
        }
        faces.add(
          StoredFace(
            tenantId: tenantId,
            employeeId: employeeId,
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
    final publicId = await vault.publicId();
    final keys = (await vault.grants()).map((item) => item.key).toList();
    if (keys.isEmpty) {
      return 0;
    }
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
        await api.punchFace(
          publicId,
          keys,
          occurredAt: row.occurredAt,
          image: base64Encode(bytes),
          channel: 'offline',
          eventId: row.clientEventId,
        );
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

  Future<String> punchFace(String imagePath) async {
    final publicId = await vault.publicId();
    final keys = (await vault.grants()).map((item) => item.key).toList();
    final bytes = await _jpeg(await File(imagePath).readAsBytes());
    final occurred = DateTime.now().toUtc().toIso8601String();
    final eventId = _uuid.v4();
    try {
      await api.punchFace(publicId, keys, occurredAt: occurred, image: base64Encode(bytes), channel: 'online', eventId: eventId);
      return 'Marcação por rosto registrada.';
    } on ApiException catch (error) {
      if (error.statusCode != null) {
        rethrow;
      }
    }
    await _matchLocal(imagePath);
    final kept = await _keepPhoto(imagePath, eventId);
    await store.addPending(clientEventId: eventId, occurredAt: occurred, imagePath: kept);
    return 'Marcação guardada neste aparelho. Ela sobe quando a internet voltar.';
  }

  Future<void> punchQr({required String content, required Uint8List qrImage, required Uint8List selfie}) async {
    final publicId = await vault.publicId();
    final keys = (await vault.grants()).map((item) => item.key).toList();
    try {
      await api.punchQr(
        publicId,
        keys,
        occurredAt: DateTime.now().toUtc().toIso8601String(),
        content: content.trim(),
        qrImage: base64Encode(await _jpeg(qrImage)),
        selfieImage: base64Encode(await _jpeg(selfie)),
      );
    } on ApiException catch (error) {
      if (error.statusCode == null) {
        throw const ApiException('O QR Code só registra com internet.');
      }
      rethrow;
    }
  }

  Future<void> _matchLocal(String imagePath) async {
    final tenants = await store.tenantIds();
    if (tenants.isEmpty) {
      throw const ApiException('Reconhecimento offline indisponível.');
    }
    final List<double> vector;
    try {
      vector = await _embed(imagePath);
    } catch (_) {
      throw const ApiException('Reconhecimento offline indisponível.');
    }
    final threshold = await store.threshold();
    var hits = 0;
    for (final tenantId in tenants) {
      final matched = matchEmployee(query: vector, registry: await store.samples(tenantId), threshold: threshold);
      if (matched != null) {
        hits += 1;
      }
    }
    final block = offlineFaceBlock(hits);
    if (block != null) {
      throw ApiException(block);
    }
  }

  int? _asInt(Object? value) {
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
    return int.tryParse('$value');
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
