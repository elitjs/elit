/**
 * Minimal WebM (Matroska) writer for VP8 keyframes — the pieces Chrome's
 * Page.startScreencast emits as webp frames. Pure JS, no dependencies; the
 * structure mirrors what the classic "whammy" recorder produces (one cluster
 * per keyframe), which Chromium-based players accept.
 */

export interface E2EVideoFrame {
  /** Raw VP8 bitstream (webp container header already stripped). */
  data: Buffer;
  /** Capture timestamp in ms since recording start. */
  timestamp: number;
}

function varintBuffer(value: number, length: number): Buffer {
  const buffer = Buffer.alloc(length);
  for (let index = length - 1; index >= 0; index--) {
    buffer[index] = value & 0xff;
    value = Math.floor(value / 256);
  }
  buffer[0] |= 1 << (8 - length); // vint marker bits
  return buffer;
}

function element(id: Buffer, payload: Buffer): Buffer {
  return Buffer.concat([id, varintBuffer(payload.length, payload.length < 127 ? 1 : 2), payload]);
}

function uintElement(id: Buffer, value: number): Buffer {
  const bytes = [];
  let remaining = value;
  do {
    bytes.unshift(remaining & 0xff);
    remaining = Math.floor(remaining / 256);
  } while (remaining > 0);
  if (bytes[0] & 0x80) bytes.unshift(0); // keep the value unsigned
  return element(id, Buffer.from(bytes));
}

function stringElement(id: Buffer, value: string): Buffer {
  return element(id, Buffer.from(value, 'utf8'));
}

function floatElement(id: Buffer, value: number): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeDoubleBE(value, 0);
  return element(id, buffer);
}

/** Strips the RIFF/webp container, returning the raw VP8 bitstream (or null when the frame is not lossy VP8). */
export function extractVp8Frame(webp: Buffer): Buffer | null {
  if (webp.length < 20) return null;
  if (webp.toString('ascii', 0, 4) !== 'RIFF' || webp.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fourcc = webp.toString('ascii', 12, 16);
  if (fourcc !== 'VP8 ') return null; // VP8L (lossless) or VP8X (extended) are not usable
  const chunkSize = webp.readUInt32LE(16);
  return webp.subarray(20, 20 + chunkSize);
}

/** Assembles captured frames into a WebM file. */
export function muxWebM(frames: E2EVideoFrame[], width: number, height: number): Buffer {
  const EBML_HEADER = element(
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
    Buffer.concat([
      uintElement(Buffer.from([0x42, 0x86]), 1), // EBMLVersion
      uintElement(Buffer.from([0x42, 0xf7]), 1), // EBMLReadVersion
      uintElement(Buffer.from([0x42, 0xf2]), 4), // EBMLMaxIDLength
      uintElement(Buffer.from([0x42, 0xf3]), 8), // EBMLMaxSizeLength
      stringElement(Buffer.from([0x42, 0x82]), 'webm'), // DocType
      uintElement(Buffer.from([0x42, 0x87]), 2), // DocTypeVersion
      uintElement(Buffer.from([0x42, 0x85]), 2), // DocTypeReadVersion
    ]),
  );

  const lastTimestamp = frames.length ? frames[frames.length - 1].timestamp : 0;
  const INFO = element(
    Buffer.from([0x15, 0x49, 0xa9, 0x66]),
    Buffer.concat([
      uintElement(Buffer.from([0x2a, 0xd7, 0xb1]), 1000000), // TimestampScale: 1ms
      floatElement(Buffer.from([0x44, 0x89]), lastTimestamp), // Duration (ms)
      stringElement(Buffer.from([0x4d, 0x80]), 'elit-e2e'),
      stringElement(Buffer.from([0x57, 0x41]), 'elit-e2e'),
    ]),
  );

  const VIDEO = element(
    Buffer.from([0xe0]),
    Buffer.concat([
      uintElement(Buffer.from([0xb0]), width),
      uintElement(Buffer.from([0xba]), height),
    ]),
  );

  const TRACK_ENTRY = element(
    Buffer.from([0xae]),
    Buffer.concat([
      uintElement(Buffer.from([0xd7]), 1), // TrackNumber
      uintElement(Buffer.from([0x73, 0xc5]), 1), // TrackUID
      uintElement(Buffer.from([0x83]), 1), // TrackType: video
      stringElement(Buffer.from([0x86]), 'V_VP8'),
      VIDEO,
    ]),
  );

  const TRACKS = element(Buffer.from([0x16, 0x54, 0xae, 0x6b]), TRACK_ENTRY);

  // Segment with unknown size — live-recording style; players read to EOF.
  const SEGMENT_OPEN = Buffer.concat([
    Buffer.from([0x18, 0x53, 0x80, 0x67]),
    Buffer.from([0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
  ]);

  const clusters: Buffer[] = [];
  for (const frame of frames) {
    const simpleBlockPayload = Buffer.concat([
      Buffer.from([0x81]), // track vint: 1
      Buffer.from([0x00, 0x00]), // relative timecode
      Buffer.from([0x80]), // keyframe flag
      frame.data,
    ]);
    const cluster = element(
      Buffer.from([0x1f, 0x43, 0xb6, 0x75]),
      Buffer.concat([
        uintElement(Buffer.from([0xe7]), Math.round(frame.timestamp)), // absolute timestamp ms
        element(Buffer.from([0xa3]), simpleBlockPayload),
      ]),
    );
    clusters.push(cluster);
  }

  return Buffer.concat([EBML_HEADER, SEGMENT_OPEN, INFO, TRACKS, ...clusters]);
}
