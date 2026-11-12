import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../data/network/device_api.dart';
import '../../../data/network/device_vault.dart';
import '../data/clock_store.dart';
import '../data/device_flow.dart';

class DeviceState {
  const DeviceState({
    required this.ready,
    required this.publicId,
    required this.grants,
    required this.face,
    required this.qr,
  });

  final bool ready;
  final String publicId;
  final List<DeviceGrant> grants;
  final bool face;
  final bool qr;

  bool get paired => grants.isNotEmpty;

  DeviceState copyWith({bool? ready, String? publicId, List<DeviceGrant>? grants, bool? face, bool? qr}) {
    return DeviceState(
      ready: ready ?? this.ready,
      publicId: publicId ?? this.publicId,
      grants: grants ?? this.grants,
      face: face ?? this.face,
      qr: qr ?? this.qr,
    );
  }
}

final deviceApiProvider = Provider<DeviceApi>((ref) => DeviceApi());
final deviceVaultProvider = Provider<DeviceVault>((ref) => DeviceVault());
final clockStoreProvider = Provider<ClockStore>((ref) => ClockStore());

final deviceFlowProvider = Provider<DeviceFlow>((ref) {
  return DeviceFlow(ref.watch(deviceApiProvider), ref.watch(deviceVaultProvider), ref.watch(clockStoreProvider));
});

class DeviceController extends Notifier<DeviceState> {
  @override
  DeviceState build() {
    Future.microtask(load);
    return const DeviceState(ready: false, publicId: '', grants: [], face: false, qr: false);
  }

  DeviceFlow get _flow => ref.read(deviceFlowProvider);
  DeviceVault get _vault => ref.read(deviceVaultProvider);

  Future<void> load() async {
    final id = await _vault.publicId();
    final grants = await _vault.grants();
    final methods = await _vault.methods();
    state = DeviceState(ready: true, publicId: id, grants: grants, face: methods.face, qr: methods.qr);
  }

  Future<void> enroll(String code) async {
    await _flow.enroll(code);
    await load();
  }

  Future<void> sync() async {
    try {
      await _flow.syncPending();
      await _flow.refresh();
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        await _forget();
      }
    } finally {
      await load();
    }
  }

  Future<void> release() async {
    await _forget();
    await load();
  }

  Future<void> _forget() async {
    await _vault.saveGrants([]);
    await _vault.saveMethods(face: false, qr: false);
    await ref.read(clockStoreProvider).replaceFaces([]);
  }
}

final deviceProvider = NotifierProvider<DeviceController, DeviceState>(DeviceController.new);
