#!/usr/bin/env python3
"""Generate the PWA icon set (no third-party deps).

Draws a gold masquerade mask on a dark rounded square, safely inside the
80% maskable safe-zone. Run from the repo root: python3 scripts/generate-icons.py
"""
import math
import os
import struct
import zlib

BG = (0x0B, 0x0F, 0x1A)
GOLD = (0xD4, 0xAF, 0x37)
GOLD_HI = (0xF5, 0xDE, 0x8A)
DARK = (0x0B, 0x0F, 0x1A)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rounded_box(x, y, size, radius):
    """Return coverage 0..1 for a rounded square covering the whole canvas."""
    r = radius
    cx = min(max(x, r), size - r)
    cy = min(max(y, r), size - r)
    return 1.0 if math.hypot(x - cx, y - cy) <= r else 0.0


def ellipse(x, y, cx, cy, rx, ry, soft=1.5):
    d = math.hypot((x - cx) / rx, (y - cy) / ry)
    if d <= 1.0:
        return 1.0
    if d <= 1.0 + soft / min(rx, ry):
        return max(0.0, 1.0 - (d - 1.0) * min(rx, ry) / soft)
    return 0.0


def mask_alpha(x, y, s):
    """Coverage of a masquerade mask: tapered band with eye holes and wing tips."""
    u = (x / s - 0.5) * 2.0            # -1 .. 1 across the icon
    if abs(u) > 1.02:
        return 0.0
    # half-height of the band, tapering to sharp outer wing tips
    h = 0.175 * (1.0 - (abs(u) / 1.02) ** 2.6)
    cy = 0.5 - 0.055 * u * u           # edges sweep upward
    soft = 0.010
    d = abs(y / s - cy)
    a = max(0.0, min(1.0, (h - d) / soft))
    if a <= 0:
        return 0.0
    # eye holes
    hole = max(
        ellipse(x, y, s * (0.5 - 0.185), s * (cy - 0.012), s * 0.118, s * 0.055),
        ellipse(x, y, s * (0.5 + 0.185), s * (cy - 0.012), s * 0.118, s * 0.055),
    )
    # nose-bridge notch on the lower edge
    notch = ellipse(x, y, s * 0.5, s * (cy + h * 1.02), s * 0.055, s * 0.055)
    return a * (1.0 - hole) * (1.0 - notch)


def render(size):
    px = bytearray()
    r_corner = size * 0.22
    for y in range(size):
        px.append(0)  # PNG filter type 0
        for x in range(size):
            bg_cov = rounded_box(x + 0.5, y + 0.5, size, r_corner)
            # radial vignette for depth
            t = math.hypot(x - size / 2, y - size / 2) / (size * 0.72)
            base = lerp((0x14, 0x1A, 0x2B), BG, min(1.0, t))
            col = base
            m = mask_alpha(x + 0.5, y + 0.5, size)
            if m > 0:
                g = lerp(GOLD_HI, GOLD, min(1.0, (y / size))) 
                col = lerp(col, g, m)
            # blend to transparent outside the rounded square
            if bg_cov < 1.0:
                col = tuple(round(c * bg_cov) for c in col)
            else:
                col = tuple(int(round(c)) for c in col)
            a = round(255 * bg_cov)
            px.extend(bytes(col) + bytes([a]))
    return bytes(px)


def png(size, path):
    raw = render(size)
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    body = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(body)
    print(f"wrote {path} ({len(body)} bytes)")


if __name__ == "__main__":
    root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")
    os.makedirs(root, exist_ok=True)
    for s, name in ((512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")):
        png(s, os.path.join(root, name))
