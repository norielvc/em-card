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

// Server-side High-Performance QR Decoder (ZXing MultiFormat + jsQR + Sharp)
// Standardizes image in 1 step, then runs dual engines across multi-scale passes in memory.

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

    // 1. Hybrid Binarizer (best for shadows, card glare, uneven lighting)
    try {
      const bitmapHybrid = new BinaryBitmap(new HybridBinarizer(luminanceSource));
      const res = reader.decode(bitmapHybrid);
      if (res && res.getText()) return res.getText().trim();
    } catch (_) {}

    // 2. Global Histogram Binarizer (best for low-contrast / faded QR codes)
    try {
      const bitmapGlobal = new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource));
      const res = reader.decode(bitmapGlobal);
      if (res && res.getText()) return res.getText().trim();
    } catch (_) {}
  } catch (_) {}

  return null;
}

function decodeWithJsQR(rgbaBuffer, width, height) {
  try {
    for (const inv of ["dontInvert", "attemptBoth"]) {
      const res = jsQR(rgbaBuffer, width, height, { inversionAttempts: inv });
      if (res && res.data) return res.data.trim();
    }
  } catch (_) {}
  return null;
}

function dualDecode(rgbaBuffer, width, height, label, debugList) {
  const zx = decodeWithZXing(rgbaBuffer, width, height);
  if (zx) {
    debugList.push(`${label}:zxing`);
    return zx;
  }
  const js = decodeWithJsQR(rgbaBuffer, width, height);
  if (js) {
    debugList.push(`${label}:jsqr`);
    return js;
  }
  return null;
}

export async function POST(request) {
  const debug = [];
  try {
    const formData = await request.formData();
    const file = formData.get("photo");
    if (!file || typeof file === "string") {
      return NextResponse.json({ qrText: null, debug: "no_file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    debug.push(`size:${Math.round(inputBuffer.length / 1024)}KB`);

    const sharp = (await import("sharp")).default;

    // Single step: Auto-rotate EXIF orientation and resize to 1200px max in RGBA
    const { data: rawData, info } = await sharp(inputBuffer)
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    debug.push(`res:${width}x${height}`);

    const rgba = new Uint8ClampedArray(rawData.buffer, rawData.byteOffset, rawData.byteLength);

    // Pass 1: Full Frame
    let qrText = dualDecode(rgba, width, height, "full", debug);

    // Pass 2: Center Crop 70% (in-memory pixel extraction - instant)
    if (!qrText && width > 100 && height > 100) {
      const cw = Math.round(width * 0.70);
      const ch = Math.round(height * 0.70);
      const ox = Math.round((width - cw) / 2);
      const oy = Math.round((height - ch) / 2);

      const crop70 = new Uint8ClampedArray(cw * ch * 4);
      for (let row = 0; row < ch; row++) {
        const srcOffset = ((oy + row) * width + ox) * 4;
        const dstOffset = row * cw * 4;
        crop70.set(rgba.subarray(srcOffset, srcOffset + cw * 4), dstOffset);
      }

      qrText = dualDecode(crop70, cw, ch, "crop70", debug);

      // Pass 3: Contrast stretch on 70% crop
      if (!qrText) {
        try {
          const len = crop70.length;
          let min = 255, max = 0;
          for (let i = 0; i < len; i += 4) {
            const lum = (crop70[i] * 299 + crop70[i + 1] * 587 + crop70[i + 2] * 114) / 1000;
            if (lum < min) min = lum;
            if (lum > max) max = lum;
          }
          const range = max - min;
          if (range >= 20) {
            const stretched = new Uint8ClampedArray(len);
            for (let i = 0; i < len; i += 4) {
              const lum = (crop70[i] * 299 + crop70[i + 1] * 587 + crop70[i + 2] * 114) / 1000;
              const s = Math.round(((lum - min) * 255) / range);
              stretched[i] = s;
              stretched[i + 1] = s;
              stretched[i + 2] = s;
              stretched[i + 3] = 255;
            }
            qrText = dualDecode(stretched, cw, ch, "contrast70", debug);
          }
        } catch (_) {}
      }
    }

    // Pass 4: Center Crop 50% (Close-up)
    if (!qrText && width > 100 && height > 100) {
      const cw2 = Math.round(width * 0.50);
      const ch2 = Math.round(height * 0.50);
      const ox2 = Math.round((width - cw2) / 2);
      const oy2 = Math.round((height - ch2) / 2);

      const crop50 = new Uint8ClampedArray(cw2 * ch2 * 4);
      for (let row = 0; row < ch2; row++) {
        const srcOffset = ((oy2 + row) * width + ox2) * 4;
        const dstOffset = row * cw2 * 4;
        crop50.set(rgba.subarray(srcOffset, srcOffset + cw2 * 4), dstOffset);
      }

      qrText = dualDecode(crop50, cw2, ch2, "crop50", debug);
    }

    debug.push(qrText ? "decoded" : "no_qr");
    return NextResponse.json({
      qrText: qrText || null,
      debug: debug.join(" | "),
    });

  } catch (err) {
    debug.push(`err:${err.message}`);
    return NextResponse.json({
      qrText: null,
      debug: debug.join(" | "),
    }, { status: 500 });
  }
}
