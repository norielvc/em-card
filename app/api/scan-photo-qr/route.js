import { NextResponse } from "next/server";
import jsQR from "jsqr";
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  GlobalHistogramBinarizer,
} from "@zxing/library";

// Server-side Dual-Engine QR Decoder (ZXing MultiFormat + jsQR + Sharp)
// Runs on Node.js server with unlimited memory. 
// Generates lightweight 25KB thumbnail so iOS Safari never crashes from raw 48MP textures.

function decodeWithZXing(rgbaBuffer, width, height) {
  try {
    const luminances = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < rgbaBuffer.length; i += 4, j++) {
      luminances[j] = ((rgbaBuffer[i] * 299 + rgbaBuffer[i + 1] * 587 + rgbaBuffer[i + 2] * 114 + 500) / 1000) | 0;
    }

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new MultiFormatReader();
    reader.setHints(hints);

    const luminanceSource = new RGBLuminanceSource(luminances, width, height);

    // 1. Hybrid Binarizer (handles shadows and uneven lighting)
    try {
      const bitmapHybrid = new BinaryBitmap(new HybridBinarizer(luminanceSource));
      const res = reader.decode(bitmapHybrid);
      if (res && res.getText()) {
        return res.getText().trim();
      }
    } catch (_) {}

    // 2. Global Histogram Binarizer (handles low contrast / faded QR codes)
    try {
      const bitmapGlobal = new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource));
      const res = reader.decode(bitmapGlobal);
      if (res && res.getText()) {
        return res.getText().trim();
      }
    } catch (_) {}
  } catch (_) {}

  return null;
}

function decodeWithJsQR(rgbaBuffer, width, height) {
  try {
    for (const inv of ["dontInvert", "attemptBoth"]) {
      const res = jsQR(rgbaBuffer, width, height, { inversionAttempts: inv });
      if (res && res.data) {
        return res.data.trim();
      }
    }
  } catch (_) {}
  return null;
}

function dualEngineDecode(rgbaBuffer, width, height, label, debugList) {
  // Try ZXing first (best at angle and tilted cards)
  const zxResult = decodeWithZXing(rgbaBuffer, width, height);
  if (zxResult) {
    debugList.push(`${label}:zxing`);
    return zxResult;
  }

  // Try jsQR second (fast and resilient on direct alignment)
  const jsResult = decodeWithJsQR(rgbaBuffer, width, height);
  if (jsResult) {
    debugList.push(`${label}:jsqr`);
    return jsResult;
  }

  return null;
}

export async function POST(request) {
  const debug = [];
  try {
    const formData = await request.formData();
    const file = formData.get("photo");
    if (!file || typeof file === "string") {
      return NextResponse.json({ qrText: null, thumbnail: null, debug: "no_file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    debug.push(`recv:${Math.round(inputBuffer.length / 1024)}KB`);

    const sharp = (await import("sharp")).default;

    // 1. Generate ultra-lightweight thumbnail (~20-25 KB) for safe client UI preview
    let thumbnail = "";
    try {
      const thumbBuf = await sharp(inputBuffer)
        .rotate()
        .resize(450, 450, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();
      thumbnail = `data:image/jpeg;base64,${thumbBuf.toString("base64")}`;
    } catch (_) {}

    let qrText = null;

    // ── PASS 1: Standard Frame (1200px max) ──
    const pass1 = await sharp(inputBuffer)
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const p1Rgba = new Uint8ClampedArray(pass1.data.buffer, pass1.data.byteOffset, pass1.data.byteLength);
    const { width: w1, height: h1 } = pass1.info;
    debug.push(`dims:${w1}x${h1}`);

    qrText = dualEngineDecode(p1Rgba, w1, h1, "full_1200", debug);

    // ── PASS 2: High-Resolution Frame (1800px max) for small QR in distance shots ──
    if (!qrText && (w1 >= 1000 || h1 >= 1000)) {
      try {
        const pass2 = await sharp(inputBuffer)
          .rotate()
          .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });

        const p2Rgba = new Uint8ClampedArray(pass2.data.buffer, pass2.data.byteOffset, pass2.data.byteLength);
        qrText = dualEngineDecode(p2Rgba, pass2.info.width, pass2.info.height, "high_1800", debug);
      } catch (_) {}
    }

    // ── PASS 3: Center Crop 70% (Focus on card center) ──
    if (!qrText) {
      const cw = Math.round(w1 * 0.70);
      const ch = Math.round(h1 * 0.70);
      const ox = Math.round((w1 - cw) / 2);
      const oy = Math.round((h1 - ch) / 2);

      const pass3 = await sharp(inputBuffer)
        .rotate()
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .extract({ left: ox, top: oy, width: cw, height: ch })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const p3Rgba = new Uint8ClampedArray(pass3.data.buffer, pass3.data.byteOffset, pass3.data.byteLength);
      qrText = dualEngineDecode(p3Rgba, pass3.info.width, pass3.info.height, "crop70", debug);

      // ── PASS 4: Contrast Stretch on 70% Crop (Removes glare/shadows) ──
      if (!qrText) {
        try {
          const len = p3Rgba.length;
          let min = 255, max = 0;
          for (let i = 0; i < len; i += 4) {
            const lum = (p3Rgba[i] * 299 + p3Rgba[i + 1] * 587 + p3Rgba[i + 2] * 114) / 1000;
            if (lum < min) min = lum;
            if (lum > max) max = lum;
          }
          const range = max - min;
          if (range >= 25) {
            const stretched = new Uint8ClampedArray(len);
            for (let i = 0; i < len; i += 4) {
              const lum = (p3Rgba[i] * 299 + p3Rgba[i + 1] * 587 + p3Rgba[i + 2] * 114) / 1000;
              const s = Math.round(((lum - min) * 255) / range);
              stretched[i] = s;
              stretched[i + 1] = s;
              stretched[i + 2] = s;
              stretched[i + 3] = 255;
            }
            qrText = dualEngineDecode(stretched, pass3.info.width, pass3.info.height, "contrast70", debug);
          }
        } catch (_) {}
      }
    }

    // ── PASS 5: Center Crop 50% (Close-up) ──
    if (!qrText) {
      const cw2 = Math.round(w1 * 0.50);
      const ch2 = Math.round(h1 * 0.50);
      const ox2 = Math.round((w1 - cw2) / 2);
      const oy2 = Math.round((h1 - ch2) / 2);

      const pass5 = await sharp(inputBuffer)
        .rotate()
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .extract({ left: ox2, top: oy2, width: cw2, height: ch2 })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const p5Rgba = new Uint8ClampedArray(pass5.data.buffer, pass5.data.byteOffset, pass5.data.byteLength);
      qrText = dualEngineDecode(p5Rgba, pass5.info.width, pass5.info.height, "crop50", debug);
    }

    debug.push(qrText ? "decoded" : "no_qr");
    return NextResponse.json({
      qrText: qrText || null,
      thumbnail: thumbnail || null,
      debug: debug.join(" | "),
    });

  } catch (err) {
    debug.push(`err:${err.message}`);
    return NextResponse.json({
      qrText: null,
      thumbnail: null,
      debug: debug.join(" | "),
    }, { status: 500 });
  }
}
