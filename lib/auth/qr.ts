const VERSION = 6;
const SIZE = 17 + VERSION * 4;
const DATA_CODEWORDS = 136;
const BLOCK_DATA = 68;
const EC_CODEWORDS = 18;

function gfTables() {
  const exp = new Array<number>(512).fill(0);
  const log = new Array<number>(256).fill(0);
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    exp[i] = value;
    log[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) exp[i] = exp[i - 255];
  return { exp, log };
}

const GF = gfTables();
function gfMul(a: number, b: number) { return a && b ? GF.exp[GF.log[a] + GF.log[b]] : 0; }
function polyMultiply(a: number[], b: number[]) {
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i += 1) for (let j = 0; j < b.length; j += 1) out[i + j] ^= gfMul(a[i], b[j]);
  return out;
}
function generator(degree: number) {
  let result = [1];
  for (let i = 0; i < degree; i += 1) result = polyMultiply(result, [1, GF.exp[i]]);
  return result;
}
function reedSolomon(data: number[], degree: number) {
  const gen = generator(degree);
  const remainder = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    for (let i = 0; i < degree; i += 1) remainder[i] ^= gfMul(gen[i + 1], factor);
  }
  return remainder;
}

function appendBits(target: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i -= 1) target.push((value >>> i) & 1);
}

function dataCodewords(text: string) {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (bytes.length > 134) throw new Error("TOTP QR payload is too large.");
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  for (const byte of bytes) appendBits(bits, byte, 8);
  const capacity = DATA_CODEWORDS * 8;
  for (let i = 0; i < Math.min(4, capacity - bits.length); i += 1) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
  for (let pad = 0; out.length < DATA_CODEWORDS; pad += 1) out.push(pad % 2 === 0 ? 0xec : 0x11);
  return out;
}

function finalCodewords(text: string) {
  const data = dataCodewords(text);
  const blocks = [data.slice(0, BLOCK_DATA), data.slice(BLOCK_DATA, BLOCK_DATA * 2)];
  const ecc = blocks.map((block) => reedSolomon(block, EC_CODEWORDS));
  const result: number[] = [];
  for (let i = 0; i < BLOCK_DATA; i += 1) for (const block of blocks) result.push(block[i]);
  for (let i = 0; i < EC_CODEWORDS; i += 1) for (const block of ecc) result.push(block[i]);
  return result;
}

function formatBits(mask: number) {
  const data = (1 << 3) | mask; // Error correction L = binary 01.
  let rem = data;
  for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ (((rem >>> 9) & 1) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

export function qrMatrix(text: string) {
  const modules = Array.from({ length: SIZE }, () => new Array<boolean>(SIZE).fill(false));
  const reserved = Array.from({ length: SIZE }, () => new Array<boolean>(SIZE).fill(false));
  const set = (x: number, y: number, dark: boolean) => { if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) { modules[y][x] = dark; reserved[y][x] = true; } };

  const finder = (x: number, y: number) => {
    for (let dy = -1; dy <= 7; dy += 1) for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx; const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= SIZE || yy >= SIZE) continue;
      const inside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const dark = inside && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      set(xx, yy, dark);
    }
  };
  finder(0, 0); finder(SIZE - 7, 0); finder(0, SIZE - 7);

  for (let i = 8; i < SIZE - 8; i += 1) { set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0); }
  const alignment = (cx: number, cy: number) => { for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); };
  alignment(34, 34);

  const fmt = formatBits(0);
  const bit = (i: number) => ((fmt >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i += 1) set(8, i, bit(i));
  set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
  for (let i = 9; i < 15; i += 1) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i += 1) set(SIZE - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i += 1) set(8, SIZE - 15 + i, bit(i));
  set(8, SIZE - 8, true);

  const bits: number[] = [];
  for (const byte of finalCodewords(text)) appendBits(bits, byte, 8);
  let index = 0;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < SIZE; vert += 1) {
      const upward = ((right + 1) & 2) === 0;
      const y = upward ? SIZE - 1 - vert : vert;
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        if (reserved[y][x]) continue;
        let dark = index < bits.length ? bits[index] === 1 : false;
        if ((x + y) % 2 === 0) dark = !dark; // mask pattern 0
        modules[y][x] = dark;
        index += 1;
      }
    }
  }
  return modules;
}
