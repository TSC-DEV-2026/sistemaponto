import 'dart:math' as math;

import 'package:image/image.dart' as img;

import 'face_constants.dart';

/// Alinhamento ArcFace 112 (mesmos pontos de referência do InsightFace `face_align.arcface_dst`).
///
/// A detecção no mobile usa ML Kit; o backend usa `det_10g`. Para maximizar compatibilidade,
/// usamos transformação de **similaridade** estimada por Procrustes (5 pontos) + `warpAffine`
/// equivalente ao `cv2.warpAffine` (amostragem inversa, borda 0).
class ArcfaceAlignment {
  /// `srcPts`: 5 pontos (x,y) na imagem de entrada, mesma ordem do InsightFace:
  /// [olho esq, olho dir, nariz, boca esq, boca dir].
  static img.Image warp112({
    required img.Image inputRgb,
    required List<List<double>> srcPts,
  }) {
    assert(srcPts.length == 5);
    final dst = kArcfaceReference112;

    // Forward: input landmark (src) -> template (dst): dst ≈ s R src + t
    final est = _estimateSimilarity2dFromCorrespondences(src: srcPts, dst: dst);

    // OpenCV warpAffine: dstPixel -> srcPixel via M (2x3). Precisamos da inversa do forward.
    final inv = _invertAffine2x3(est.toAffine2x3ForwardColumn());
    return _warpAffineInverseRgb(inputRgb, inv, kArcfaceInputSize, kArcfaceInputSize);
  }

  static _SimilarityEstimate _estimateSimilarity2dFromCorrespondences({
    required List<List<double>> src,
    required List<List<double>> dst,
  }) {
    final n = src.length;
    double mx = 0, my = 0, ux = 0, uy = 0;
    for (var i = 0; i < n; i++) {
      mx += src[i][0];
      my += src[i][1];
      ux += dst[i][0];
      uy += dst[i][1];
    }
    mx /= n;
    my /= n;
    ux /= n;
    uy /= n;

    // Column vectors ps (2xn), pd (2xn)
    // Kabsch: H = sum_i outer(dst_i, src_i) com vetores centrados (2x2).
    double h00 = 0, h01 = 0, h10 = 0, h11 = 0;
    for (var i = 0; i < n; i++) {
      final sx = src[i][0] - mx;
      final sy = src[i][1] - my;
      final dx = dst[i][0] - ux;
      final dy = dst[i][1] - uy;
      h00 += dx * sx;
      h01 += dx * sy;
      h10 += dy * sx;
      h11 += dy * sy;
    }

    final h = _Mat22(h00, h01, h10, h11);
    final svd = _svd22(h);
    var r = _Mat22.mul(svd.v, _Mat22.transpose(svd.u));
    final det = r.a * r.d - r.b * r.c;
    if (det < 0) {
      // Corrige reflexão.
      final v2 = _Mat22(-svd.v.a, -svd.v.b, -svd.v.c, -svd.v.d);
      r = _Mat22.mul(v2, _Mat22.transpose(svd.u));
    }

    // scale s = trace(R^T H) / trace(P^T P)
    double ptp = 0;
    for (var i = 0; i < n; i++) {
      final sx = src[i][0] - mx;
      final sy = src[i][1] - my;
      ptp += sx * sx + sy * sy;
    }
    // escala ótima (similaridade): sum_i <pd_i, R ps_i> / sum_i ||ps_i||^2
    double num = 0;
    for (var i = 0; i < n; i++) {
      final sx = src[i][0] - mx;
      final sy = src[i][1] - my;
      final dx = dst[i][0] - ux;
      final dy = dst[i][1] - uy;
      final rx = r.a * sx + r.c * sy;
      final ry = r.b * sx + r.d * sy;
      num += dx * rx + dy * ry;
    }
    final s = ptp <= 1e-12 ? 1.0 : (num / ptp);

    // t = mu_dst - s R mu_src (forward coluna: dst = s R src + t)
    final rsx = s * (r.a * mx + r.c * my);
    final rsy = s * (r.b * mx + r.d * my);
    final tx = ux - rsx;
    final ty = uy - rsy;

    return _SimilarityEstimate(r: r, s: s, tx: tx, ty: ty);
  }

  /// Inverte [x'; y'] = A * [x; y] + t  (forward mapeia entrada->saída em coords homogêneas 2D+1)
  /// para o formato OpenCV 2x3 que mapeia **pixel de saída -> pixel de entrada**:
  /// `src = M * [dst_x, dst_y, 1]`.
  static List<double> _invertAffine2x3(List<double> forward2x3) {
    // forward2x3 encodes: out = F * homog(in) with F = [[a,b,tx],[c,d,ty]]
    final a = forward2x3[0], b = forward2x3[1], tx = forward2x3[2];
    final c = forward2x3[3], d = forward2x3[4], ty = forward2x3[5];

    final det = a * d - b * c;
    if (det.abs() < 1e-12) {
      // fallback identidade (evita crash; resultado será ruim)
      return [1, 0, 0, 0, 1, 0];
    }
    final invDet = 1.0 / det;
    final ia = d * invDet;
    final ib = -b * invDet;
    final ic = -c * invDet;
    final id = a * invDet;

    // Inverse of [[a,b],[c,d]] * [x,y] + [tx,ty] mapping in->out:
    // out = A in + t  => in = A^-1 (out - t)
    // For warp: given out, in = invA*out - invA*t
    final itx = -(ia * tx + ib * ty);
    final ity = -(ic * tx + id * ty);

    // OpenCV expects src = M * [out_x, out_y, 1]:
    return [ia, ib, itx, ic, id, ity];
  }

  static img.Image _warpAffineInverseRgb(
    img.Image src,
    List<double> m2x3,
    int outW,
    int outH,
  ) {
    final out = img.Image(width: outW, height: outH, numChannels: 3, format: img.Format.uint8);
    final m0 = m2x3[0], m1 = m2x3[1], m2 = m2x3[2];
    final m3 = m2x3[3], m4 = m2x3[4], m5 = m2x3[5];

    for (var y = 0; y < outH; y++) {
      for (var x = 0; x < outW; x++) {
        final sx = m0 * x + m1 * y + m2;
        final sy = m3 * x + m4 * y + m5;
        final c = _bilinearRgb(src, sx, sy);
        out.setPixelRgb(x, y, c.r, c.g, c.b);
      }
    }
    return out;
  }

  static ({int r, int g, int b}) _bilinearRgb(img.Image src, double x, double y) {
    final xi = x.floor();
    final yi = y.floor();
    final xf = x - xi;
    final yf = y - yi;

    int clampX(int v) => v.clamp(0, src.width - 1);
    int clampY(int v) => v.clamp(0, src.height - 1);

    final x0 = clampX(xi);
    final x1 = clampX(xi + 1);
    final y0 = clampY(yi);
    final y1 = clampY(yi + 1);

    img.Pixel p00 = src.getPixel(x0, y0);
    img.Pixel p10 = src.getPixel(x1, y0);
    img.Pixel p01 = src.getPixel(x0, y1);
    img.Pixel p11 = src.getPixel(x1, y1);

    double lerpD(double a, double b, double t) => a + (b - a) * t;

    final r00 = p00.r.toDouble(), g00 = p00.g.toDouble(), b00 = p00.b.toDouble();
    final r10 = p10.r.toDouble(), g10 = p10.g.toDouble(), b10 = p10.b.toDouble();
    final r01 = p01.r.toDouble(), g01 = p01.g.toDouble(), b01 = p01.b.toDouble();
    final r11 = p11.r.toDouble(), g11 = p11.g.toDouble(), b11 = p11.b.toDouble();

    final r0 = lerpD(r00, r10, xf);
    final r1 = lerpD(r01, r11, xf);
    final g0 = lerpD(g00, g10, xf);
    final g1 = lerpD(g01, g11, xf);
    final b0 = lerpD(b00, b10, xf);
    final b1 = lerpD(b01, b11, xf);

    final r = lerpD(r0, r1, yf).round().clamp(0, 255);
    final g = lerpD(g0, g1, yf).round().clamp(0, 255);
    final b = lerpD(b0, b1, yf).round().clamp(0, 255);
    return (r: r, g: g, b: b);
  }
}

class _SimilarityEstimate {
  _SimilarityEstimate({required this.r, required this.s, required this.tx, required this.ty});

  final _Mat22 r;
  final double s;
  final double tx;
  final double ty;

  /// Forward column mapping: out = s * R * in + t, com `in`/`out` como [x,y].
  List<double> toAffine2x3ForwardColumn() {
    // Coluna: out = s * R * in + t, com R = [[r.a,r.c],[r.b,r.d]].
    final a = s * r.a;
    final b = s * r.c;
    final c = s * r.b;
    final d = s * r.d;
    return [a, b, tx, c, d, ty];
  }
}

class _Mat22 {
  const _Mat22(this.a, this.b, this.c, this.d);
  final double a, b, c, d;

  static _Mat22 transpose(_Mat22 m) => _Mat22(m.a, m.c, m.b, m.d);

  static _Mat22 mul(_Mat22 p, _Mat22 q) {
    return _Mat22(
      p.a * q.a + p.b * q.c,
      p.a * q.b + p.b * q.d,
      p.c * q.a + p.d * q.c,
      p.c * q.b + p.d * q.d,
    );
  }
}

class _Svd22 {
  const _Svd22({required this.u, required this.s, required this.v});
  final _Mat22 u;
  final _Mat22 s;
  final _Mat22 v;
}

/// SVD 2x2 estável o suficiente para Procrustes (H pequeno).
_Svd22 _svd22(_Mat22 m) {
  final mt = _Mat22.transpose(m);
  final a = _Mat22.mul(mt, m); // simétrica

  final tr = a.a + a.d;
  final det = a.a * a.d - a.b * a.c;
  final disc = math.max(0.0, tr * tr - 4 * det);
  final root = math.sqrt(disc);
  final l1 = (tr + root) / 2.0;
  final l2 = (tr - root) / 2.0;

  // autovetor para l1
  double vx, vy;
  if ((a.a - l1).abs() + a.b.abs() > 1e-12) {
    vx = -a.b;
    vy = a.a - l1;
  } else {
    vx = a.d - l1;
    vy = -a.c;
  }
  final n1 = math.sqrt(vx * vx + vy * vy);
  if (n1 < 1e-12) {
    vx = 1;
    vy = 0;
  } else {
    vx /= n1;
    vy /= n1;
  }

  // ortonormal
  final wx = -vy;
  final wy = vx;

  final vMat = _Mat22(vx, wx, vy, wy);

  // u = m v / sqrt(eig) aproximação: u = m * v * inv(s)
  final mv = _Mat22(
    m.a * vx + m.b * vy,
    m.a * wx + m.b * wy,
    m.c * vx + m.d * vy,
    m.c * wx + m.d * wy,
  );

  final s1 = math.sqrt(math.max(l1, 0.0));
  final s2 = math.sqrt(math.max(l2, 0.0));

  final u1a = s1 > 1e-12 ? mv.a / s1 : 1.0;
  final u1b = s1 > 1e-12 ? mv.c / s1 : 0.0;
  final u2a = s2 > 1e-12 ? mv.b / s2 : 0.0;
  final u2b = s2 > 1e-12 ? mv.d / s2 : 1.0;

  final uMat = _Mat22(u1a, u2a, u1b, u2b);
  final sMat = _Mat22(s1, 0, 0, s2);
  return _Svd22(u: uMat, s: sMat, v: vMat);
}
