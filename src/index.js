// Colors are assigned by mapping the registry index into RGB space through a
// Morton (Z-order) encoding with the bits of each channel reversed. This
// spreads consecutive indexes far apart from each other in color space, so a
// color perturbed by anti-aliasing blending (or by Brave's fingerprinting
// protection, see below) resolves to an unregistered index instead of a
// neighboring object.
//
// Morton encode/decode:
// http://johnsietsma.com/2019/12/05/morton-order-introduction/
// https://fgiesen.wordpress.com/2009/12/13/decoding-morton-codes/

const MAX_COLORS = 0xffffff;
// Brave randomizes the lowest bit of each channel on canvas reads, so the
// lowest bit of r, g and b is unusable there (3 of the 24 bits).
const MAX_COLORS_BRAVE = 0x1fffff;

const part1By2 = x => {
  x = x & 0x000003ff;               // x = ---- ---- ---- ---- ---- --98 7654 3210
  x = (x ^ (x << 16)) & 0xff0000ff; // x = ---- --98 ---- ---- ---- ---- 7654 3210
  x = (x ^ (x << 8)) & 0x0300f00f;  // x = ---- --98 ---- ---- 7654 ---- ---- 3210
  x = (x ^ (x << 4)) & 0x030c30c3;  // x = ---- --98 ---- 76-- --54 ---- 32-- --10
  x = (x ^ (x << 2)) & 0x09249249;  // x = ---- 9--8 --7- -6-- 5--4 --3- -2-- 1--0
  return x;
};

const compact1By2 = x => {
  x = x & 0x09249249;               // x = ---- 9--8 --7- -6-- 5--4 --3- -2-- 1--0
  x = (x ^ (x >> 2)) & 0x030c30c3;  // x = ---- --98 ---- 76-- --54 ---- 32-- --10
  x = (x ^ (x >> 4)) & 0x0300f00f;  // x = ---- --98 ---- ---- 7654 ---- ---- 3210
  x = (x ^ (x >> 8)) & 0xff0000ff;  // x = ---- --98 ---- ---- ---- ---- 7654 3210
  x = (x ^ (x >> 16)) & 0x000003ff; // x = ---- ---- ---- ---- ---- --98 7654 3210
  return x;
};

const encodeMorton3 = (r, g, b) => (part1By2(r) << 2) + (part1By2(g) << 1) + part1By2(b);

const decodeMorton3 = code => ({
  r: compact1By2(code >> 2),
  g: compact1By2(code >> 1),
  b: compact1By2(code)
});

const reverseEightBits = x => {
  x = ((x & 0xf0) >> 4) | ((x & 0x0f) << 4);
  x = ((x & 0xcc) >> 2) | ((x & 0x33) << 2);
  x = ((x & 0xaa) >> 1) | ((x & 0x55) << 1);
  return x >>> 0;
};

const hexColor2Rgb = hex => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
};

const int2HexPair = n => n.toString(16).padStart(2, '0');
const reverseAndHex = n => int2HexPair(reverseEightBits(n));

const int2Color = n => {
  const { r, g, b } = decodeMorton3(n);
  return `#${reverseAndHex(r)}${reverseAndHex(g)}${reverseAndHex(b)}`;
};

const rgb2Int = (r, g, b) => encodeMorton3(reverseEightBits(r), reverseEightBits(g), reverseEightBits(b));

export default class {
  constructor() {
    this.reset();

    // Brave's fingerprinting protection randomizes the lowest bit of each
    // channel returned by canvas getImageData. Detect it so lookup can mask
    // that bit out.
    typeof navigator !== 'undefined' && navigator.brave &&
      navigator.brave.isBrave().then(isBrave => {
        if (isBrave) {
          this.#isBrave = true;
          this.#maxColors = MAX_COLORS_BRAVE;
        }
      });
  }

  reset() {
    this.#registry = [null]; // indexed objects for rgb lookup, position 0 reserved for background
  }

  register(obj) {
    if (this.#registry.length >= this.#maxColors) {
      return null; // Registry is full
    }

    const color = int2Color(this.#registry.length);
    this.#registry.push(obj);
    return color;
  }

  lookup(color) {
    if (!color) return null; // invalid color

    let rgb = typeof color === 'string' ? hexColor2Rgb(color) : color;
    if (!rgb) return null; // invalid color

    if (this.#isBrave) {
      // The lowest bit of each channel may have been randomized, zero it.
      rgb = [rgb[0] & 0xfe, rgb[1] & 0xfe, rgb[2] & 0xfe];
    }

    return this.#registry[rgb2Int(...rgb)] ?? null;
  }

  // Internal state
  #registry;
  #isBrave = false;
  #maxColors = MAX_COLORS;
}
