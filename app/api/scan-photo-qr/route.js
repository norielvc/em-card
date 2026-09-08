import { NextResponse } from "next/server";
import jsQR from "jsqr";

// Server-side QR decoder: runs in Node.js, not on iOS client. No memory limits apply.
// sharp (bundled with Next.js) safely resizes large photos before jsQR.

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
    debug.push(`recv:${Math.round(inputBuffer.length / 1024)}KB`);

    const sharp = (await import("sharp")).default;

    const { data, info } = await sharp(inputBuffer)
      .rotate()
      .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    debug.push(`dims:${width}x${height}`);

    const rgba = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);

    const tryDecode = (pixels, w, h, label) => {
      for (const inv of ["dontInvert", "attemptBoth"]) {
        const result = jsQR(pixels, w, h, { inversionAttempts: inv });
        if (result && result.data) {
          debug.push(`${label}:found`);
          return result.data.trim();
        }
      }
      return null;
    };

    let qrText = null;

    // Pass 1: Full frame 1000px
    qrText = tryDecode(rgba, width, height, "full");

    // Pass 2: Center crop 70%
    if (!qrText) {
      const cw = Math.round(width * 0.70);
      const ch = Math.round(height * 0.70);
      const ox = Math.round((width - cw) / 2);
      const oy = Math.round((height - ch) / 2);
      const crop70 = await sharp(inputBuffer)
        .rotate()
        .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
        .extract({ left: ox, top: oy, width: cw, height: ch })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const c70 = new Uint8ClampedArray(crop70.data.buffer, crop70.data.byteOffset, crop70.data.byteLength);
      qrText = tryDecode(c70, crop70.info.width, crop70.info.height, "crop70");

      // Pass 3: Contrast stretch on crop70
      if (!qrText) {
        try {
          const d = c70;
          const len = d.length;
          let min = 255, max = 0;
          for (let i = 0; i < len; i += 4) {
            const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
            if (lum < min) min = lum;
            if (lum > max) max = lum;
          }
          const range = max - min;
          if (range >= 30) {
            const stretched = new Uint8ClampedArray(len);
            for (let i = 0; i < len; i += 4) {
              const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
              const s = Math.round(((lum - min) * 255) / range);
              stretched[i] = s;
              stretched[i + 1] = s;
              stretched[i + 2] = s;
              stretched[i + 3] = 255;
            }
            qrText = tryDecode(stretched, crop70.info.width, crop70.info.height, "contrast");
          }
        } catch (_) {}
      }
    }

    // Pass 4: Center crop 50%
    if (!qrText) {
      const cw2 = Math.round(width * 0.50);
      const ch2 = Math.round(height * 0.50);
      const ox2 = Math.round((width - cw2) / 2);
      const oy2 = Math.round((height - ch2) / 2);
      const crop50 = await sharp(inputBuffer)
        .rotate()
        .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
        .extract({ left: ox2, top: oy2, width: cw2, height: ch2 })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const c50 = new Uint8ClampedArray(crop50.data.buffer, crop50.data.byteOffset, crop50.data.byteLength);
      qrText = tryDecode(c50, crop50.info.width, crop50.info.height, "crop50");
    }

    debug.push(qrText ? "decoded" : "no_qr");
    return NextResponse.json({ qrText: qrText || null, debug: debug.join(" | ") });

  } catch (err) {
    debug.push(`err:${err.message}`);
    return NextResponse.json({ qrText: null, debug: debug.join(" | ") }, { status: 500 });
  }
}
