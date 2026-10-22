import 'dart:convert';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

import '../../../face/cosine_match.dart';

class StoredFace {
  const StoredFace({required this.employeeId, required this.embedding, required this.threshold});

  final int employeeId;
  final List<double> embedding;
  final double threshold;
}

class PendingPunch {
  const PendingPunch({
    required this.id,
    required this.employeeId,
    required this.clientEventId,
    required this.occurredAt,
    required this.imagePath,
  });

  final int id;
  final int employeeId;
  final String clientEventId;
  final String occurredAt;
  final String imagePath;
}

class ClockStore {
  ClockStore._();
  static final ClockStore instance = ClockStore._();

  Database? _db;

  Future<Database> _database() async {
    final current = _db;
    if (current != null) {
      return current;
    }
    final dir = await getApplicationDocumentsDirectory();
    final opened = await openDatabase(
      p.join(dir.path, 'sistemaponto_clock.db'),
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE embeddings (
            employee_id INTEGER PRIMARY KEY,
            embedding TEXT NOT NULL,
            threshold REAL NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE pending_punches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
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
          'employee_id': face.employeeId,
          'embedding': jsonEncode(face.embedding),
          'threshold': face.threshold,
        });
      }
    });
  }

  Future<List<FaceSample>> samples() async {
    final db = await _database();
    final rows = await db.query('embeddings');
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

  Future<void> addPending({
    required int employeeId,
    required String clientEventId,
    required String occurredAt,
    required String imagePath,
  }) async {
    final db = await _database();
    await db.insert('pending_punches', {
      'employee_id': employeeId,
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
            employeeId: row['employee_id'] as int,
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
