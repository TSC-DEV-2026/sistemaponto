import 'dart:convert';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

import '../../../face/cosine_match.dart';

class StoredFace {
  const StoredFace({
    required this.tenantId,
    required this.employeeId,
    required this.embedding,
    required this.threshold,
  });

  final int tenantId;
  final int employeeId;
  final List<double> embedding;
  final double threshold;
}

class PendingPunch {
  const PendingPunch({
    required this.id,
    required this.clientEventId,
    required this.occurredAt,
    required this.imagePath,
  });

  final int id;
  final String clientEventId;
  final String occurredAt;
  final String imagePath;
}

class ClockStore {
  ClockStore();

  Database? _db;

  Future<Database> _database() async {
    final current = _db;
    if (current != null) {
      return current;
    }
    final dir = await getApplicationDocumentsDirectory();
    final opened = await openDatabase(
      p.join(dir.path, 'sistemaponto_relogio.db'),
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE embeddings (
            tenant_id INTEGER NOT NULL,
            employee_id INTEGER NOT NULL,
            embedding TEXT NOT NULL,
            threshold REAL NOT NULL,
            PRIMARY KEY (tenant_id, employee_id)
          )
        ''');
        await db.execute('''
          CREATE TABLE pending_punches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_event_id TEXT NOT NULL UNIQUE,
            occurred_at TEXT NOT NULL,
            image_path TEXT NOT NULL
          )
        ''');
      },
    );
    _db = opened;
    return opened;
  }

  Future<void> replaceFaces(List<StoredFace> faces) async {
    final db = await _database();
    await db.transaction((txn) async {
      await txn.delete('embeddings');
      for (final face in faces) {
        await txn.insert('embeddings', {
          'tenant_id': face.tenantId,
          'employee_id': face.employeeId,
          'embedding': jsonEncode(face.embedding),
          'threshold': face.threshold,
        });
      }
    });
  }

  Future<List<int>> tenantIds() async {
    final db = await _database();
    final rows = await db.rawQuery('SELECT DISTINCT tenant_id FROM embeddings ORDER BY tenant_id');
    return rows.map((row) => row['tenant_id'] as int).toList();
  }

  Future<List<FaceSample>> samples(int tenantId) async {
    final db = await _database();
    final rows = await db.query('embeddings', where: 'tenant_id = ?', whereArgs: [tenantId]);
    return rows.map((row) {
      final raw = jsonDecode('${row['embedding']}') as List<dynamic>;
      return FaceSample(
        employeeId: row['employee_id'] as int,
        embedding: raw.map((item) => (item as num).toDouble()).toList(),
      );
    }).toList();
  }

  Future<double> threshold() async {
    final db = await _database();
    final rows = await db.query('embeddings', columns: ['threshold'], limit: 1);
    if (rows.isEmpty) {
      return 0.40;
    }
    return (rows.first['threshold'] as num).toDouble();
  }

  Future<void> addPending({required String clientEventId, required String occurredAt, required String imagePath}) async {
    final db = await _database();
    await db.insert('pending_punches', {
      'client_event_id': clientEventId,
      'occurred_at': occurredAt,
      'image_path': imagePath,
    });
  }

  Future<List<PendingPunch>> pending() async {
    final db = await _database();
    final rows = await db.query('pending_punches', orderBy: 'id');
    return rows
        .map(
          (row) => PendingPunch(
            id: row['id'] as int,
            clientEventId: '${row['client_event_id']}',
            occurredAt: '${row['occurred_at']}',
            imagePath: '${row['image_path']}',
          ),
        )
        .toList();
  }

  Future<void> dropPending(int id) async {
    final db = await _database();
    await db.delete('pending_punches', where: 'id = ?', whereArgs: [id]);
  }
}
