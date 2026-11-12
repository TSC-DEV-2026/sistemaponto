List<Map<String, dynamic>> pageItems(Map<String, dynamic> page) {
  final raw = page['items'];
  if (raw is! List) {
    return [];
  }
  return raw.map((item) {
    if (item is Map<String, dynamic>) {
      return item;
    }
    if (item is Map) {
      return Map<String, dynamic>.from(item);
    }
    return <String, dynamic>{};
  }).toList();
}
