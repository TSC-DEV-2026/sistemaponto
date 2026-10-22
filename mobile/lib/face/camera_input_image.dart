import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

/// Converte [CameraImage] → [InputImage] para o ML Kit (Android/iOS).
InputImage? inputImageFromCameraImage({
  required CameraImage image,
  required CameraDescription camera,
  required DeviceOrientation deviceOrientation,
}) {
  final rotation = _rotation(camera, deviceOrientation);
  if (rotation == null) return null;

  final format = InputImageFormatValue.fromRawValue(image.format.raw);
  if (format == null) return null;

  // NV21 (Android) e bgra8888 (iOS) são os formatos estáveis com um único plano / cópia linear.
  if (Platform.isAndroid && format != InputImageFormat.nv21) {
    // Muitos devices entregam yuv420; montamos NV21.
    final bytes = _yuv420ToNv21(image);
    return InputImage.fromBytes(
      bytes: bytes,
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: rotation,
        format: InputImageFormat.nv21,
        bytesPerRow: image.width,
      ),
    );
  }

  if (Platform.isIOS && format != InputImageFormat.bgra8888) {
    return null;
  }

  final WriteBuffer buffer = WriteBuffer();
  for (final plane in image.planes) {
    buffer.putUint8List(plane.bytes);
  }
  final bytes = buffer.done().buffer.asUint8List();

  final plane = image.planes.first;
  return InputImage.fromBytes(
    bytes: bytes,
    metadata: InputImageMetadata(
      size: Size(image.width.toDouble(), image.height.toDouble()),
      rotation: rotation,
      format: format,
      bytesPerRow: plane.bytesPerRow,
    ),
  );
}

InputImageRotation? _rotation(CameraDescription camera, DeviceOrientation orientation) {
  final sensor = camera.sensorOrientation;
  final isFront = camera.lensDirection == CameraLensDirection.front;

  int rotationCompensation;
  switch (orientation) {
    case DeviceOrientation.portraitUp:
      rotationCompensation = 0;
      break;
    case DeviceOrientation.landscapeLeft:
      rotationCompensation = 90;
      break;
    case DeviceOrientation.portraitDown:
      rotationCompensation = 180;
      break;
    case DeviceOrientation.landscapeRight:
      rotationCompensation = 270;
      break;
  }

  int rotationDegrees;
  if (isFront) {
    rotationDegrees = (sensor + rotationCompensation) % 360;
  } else {
    rotationDegrees = (sensor - rotationCompensation + 360) % 360;
  }
  return InputImageRotationValue.fromRawValue(rotationDegrees);
}

Uint8List _yuv420ToNv21(CameraImage image) {
  final width = image.width;
  final height = image.height;
  final yPlane = image.planes[0];
  final uPlane = image.planes[1];
  final vPlane = image.planes[2];

  final nv21 = Uint8List(width * height + (width * height ~/ 2));
  // Y
  var dst = 0;
  for (var row = 0; row < height; row++) {
    final rowStart = row * yPlane.bytesPerRow;
    nv21.setRange(dst, dst + width, yPlane.bytes, rowStart);
    dst += width;
  }

  // Interleave V/U (NV21)
  final uvHeight = height ~/ 2;
  final uvWidth = width ~/ 2;
  for (var row = 0; row < uvHeight; row++) {
    for (var col = 0; col < uvWidth; col++) {
      final uvIndex = row * uPlane.bytesPerRow + col * (uPlane.bytesPerPixel ?? 1);
      final vIndex = row * vPlane.bytesPerRow + col * (vPlane.bytesPerPixel ?? 1);
      nv21[dst++] = vPlane.bytes[vIndex];
      nv21[dst++] = uPlane.bytes[uvIndex];
    }
  }
  return nv21;
}
