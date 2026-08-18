// Version 1.3.2 canvas-color-tracker - https://github.com/vasturiano/canvas-color-tracker
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.ColorTracker = factory());
})(this, (function () { 'use strict';

  function _arrayLikeToArray(r, a) {
    (null == a || a > r.length) && (a = r.length);
    for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
    return n;
  }
  function _arrayWithoutHoles(r) {
    if (Array.isArray(r)) return _arrayLikeToArray(r);
  }
  function _assertClassBrand(e, t, n) {
    if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
    throw new TypeError("Private element is not present on this object");
  }
  function _checkPrivateRedeclaration(e, t) {
    if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object");
  }
  function _classCallCheck(a, n) {
    if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
  }
  function _classPrivateFieldGet2(s, a) {
    return s.get(_assertClassBrand(s, a));
  }
  function _classPrivateFieldInitSpec(e, t, a) {
    _checkPrivateRedeclaration(e, t), t.set(e, a);
  }
  function _classPrivateFieldSet2(s, a, r) {
    return s.set(_assertClassBrand(s, a), r), r;
  }
  function _defineProperties(e, r) {
    for (var t = 0; t < r.length; t++) {
      var o = r[t];
      o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey(o.key), o);
    }
  }
  function _createClass(e, r, t) {
    return r && _defineProperties(e.prototype, r), Object.defineProperty(e, "prototype", {
      writable: false
    }), e;
  }
  function _iterableToArray(r) {
    if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r);
  }
  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  function _toConsumableArray(r) {
    return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread();
  }
  function _toPrimitive(t, r) {
    if ("object" != typeof t || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r);
      if ("object" != typeof i) return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (String )(t);
  }
  function _toPropertyKey(t) {
    var i = _toPrimitive(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }
  function _unsupportedIterableToArray(r, a) {
    if (r) {
      if ("string" == typeof r) return _arrayLikeToArray(r, a);
      var t = {}.toString.call(r).slice(8, -1);
      return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
    }
  }

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

  var MAX_COLORS = 0xffffff;
  // Brave randomizes the lowest bit of each channel on canvas reads, so the
  // lowest bit of r, g and b is unusable there (3 of the 24 bits).
  var MAX_COLORS_BRAVE = 0x1fffff;
  var part1By2 = function part1By2(x) {
    x = x & 0x000003ff; // x = ---- ---- ---- ---- ---- --98 7654 3210
    x = (x ^ x << 16) & 0xff0000ff; // x = ---- --98 ---- ---- ---- ---- 7654 3210
    x = (x ^ x << 8) & 0x0300f00f; // x = ---- --98 ---- ---- 7654 ---- ---- 3210
    x = (x ^ x << 4) & 0x030c30c3; // x = ---- --98 ---- 76-- --54 ---- 32-- --10
    x = (x ^ x << 2) & 0x09249249; // x = ---- 9--8 --7- -6-- 5--4 --3- -2-- 1--0
    return x;
  };
  var compact1By2 = function compact1By2(x) {
    x = x & 0x09249249; // x = ---- 9--8 --7- -6-- 5--4 --3- -2-- 1--0
    x = (x ^ x >> 2) & 0x030c30c3; // x = ---- --98 ---- 76-- --54 ---- 32-- --10
    x = (x ^ x >> 4) & 0x0300f00f; // x = ---- --98 ---- ---- 7654 ---- ---- 3210
    x = (x ^ x >> 8) & 0xff0000ff; // x = ---- --98 ---- ---- ---- ---- 7654 3210
    x = (x ^ x >> 16) & 0x000003ff; // x = ---- ---- ---- ---- ---- --98 7654 3210
    return x;
  };
  var encodeMorton3 = function encodeMorton3(r, g, b) {
    return (part1By2(r) << 2) + (part1By2(g) << 1) + part1By2(b);
  };
  var decodeMorton3 = function decodeMorton3(code) {
    return {
      r: compact1By2(code >> 2),
      g: compact1By2(code >> 1),
      b: compact1By2(code)
    };
  };
  var reverseEightBits = function reverseEightBits(x) {
    x = (x & 0xf0) >> 4 | (x & 0x0f) << 4;
    x = (x & 0xcc) >> 2 | (x & 0x33) << 2;
    x = (x & 0xaa) >> 1 | (x & 0x55) << 1;
    return x >>> 0;
  };
  var hexColor2Rgb = function hexColor2Rgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
  };
  var int2HexPair = function int2HexPair(n) {
    return n.toString(16).padStart(2, '0');
  };
  var reverseAndHex = function reverseAndHex(n) {
    return int2HexPair(reverseEightBits(n));
  };
  var int2Color = function int2Color(n) {
    var _decodeMorton = decodeMorton3(n),
      r = _decodeMorton.r,
      g = _decodeMorton.g,
      b = _decodeMorton.b;
    return "#".concat(reverseAndHex(r)).concat(reverseAndHex(g)).concat(reverseAndHex(b));
  };
  var rgb2Int = function rgb2Int(r, g, b) {
    return encodeMorton3(reverseEightBits(r), reverseEightBits(g), reverseEightBits(b));
  };
  var _registry = /*#__PURE__*/new WeakMap();
  var _isBrave = /*#__PURE__*/new WeakMap();
  var _maxColors = /*#__PURE__*/new WeakMap();
  var _default = /*#__PURE__*/function () {
    function _default() {
      var _this = this;
      _classCallCheck(this, _default);
      // Internal state
      _classPrivateFieldInitSpec(this, _registry, void 0);
      _classPrivateFieldInitSpec(this, _isBrave, false);
      _classPrivateFieldInitSpec(this, _maxColors, MAX_COLORS);
      this.reset();

      // Brave's fingerprinting protection randomizes the lowest bit of each
      // channel returned by canvas getImageData. Detect it so lookup can mask
      // that bit out.
      typeof navigator !== 'undefined' && navigator.brave && navigator.brave.isBrave().then(function (isBrave) {
        if (isBrave) {
          _classPrivateFieldSet2(_isBrave, _this, true);
          _classPrivateFieldSet2(_maxColors, _this, MAX_COLORS_BRAVE);
        }
      });
    }
    return _createClass(_default, [{
      key: "reset",
      value: function reset() {
        _classPrivateFieldSet2(_registry, this, [null]); // indexed objects for rgb lookup, position 0 reserved for background
      }
    }, {
      key: "register",
      value: function register(obj) {
        if (_classPrivateFieldGet2(_registry, this).length >= _classPrivateFieldGet2(_maxColors, this)) {
          return null; // Registry is full
        }
        var color = int2Color(_classPrivateFieldGet2(_registry, this).length);
        _classPrivateFieldGet2(_registry, this).push(obj);
        return color;
      }
    }, {
      key: "lookup",
      value: function lookup(color) {
        var _classPrivateFieldGet2$1;
        if (!color) return null; // invalid color

        var rgb = typeof color === 'string' ? hexColor2Rgb(color) : color;
        if (!rgb) return null; // invalid color

        if (_classPrivateFieldGet2(_isBrave, this)) {
          // The lowest bit of each channel may have been randomized, zero it.
          rgb = [rgb[0] & 0xfe, rgb[1] & 0xfe, rgb[2] & 0xfe];
        }
        return (_classPrivateFieldGet2$1 = _classPrivateFieldGet2(_registry, this)[rgb2Int.apply(void 0, _toConsumableArray(rgb))]) !== null && _classPrivateFieldGet2$1 !== void 0 ? _classPrivateFieldGet2$1 : null;
      }
    }]);
  }();

  return _default;

}));
//# sourceMappingURL=canvas-color-tracker.js.map
