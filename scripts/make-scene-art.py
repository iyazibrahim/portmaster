"""Paint the fishing scene with an organic brush-stroke edge (no badge ring)."""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

SRC = Path(
    r"C:\Users\IyazIbrahim\.cursor\projects\c-Users-IyazIbrahim-Desktop-Project-Portmaster\assets\c__Users_IyazIbrahim_AppData_Roaming_Cursor_User_workspaceStorage_adac9d037f1316b72a9bacf8207944a8_images_Mancing-60d6eddd-6e72-456f-989d-5f2c01b9b511.jpg"
)
OUT_DIR = Path(r"C:\Users\IyazIbrahim\Desktop\Project\Portmaster\public\brand")
OUT = OUT_DIR / "tiangpass-scene.png"
OUT_SM = OUT_DIR / "tiangpass-scene-sm.png"
RNG = random.Random(20260921)


def paste_max(base: Image.Image, overlay: Image.Image, xy: tuple[int, int]) -> None:
    x, y = xy
    ow, oh = overlay.size
    bw, bh = base.size
    sx0 = 0 if x >= 0 else -x
    sy0 = 0 if y >= 0 else -y
    dx0 = max(x, 0)
    dy0 = max(y, 0)
    dx1 = min(x + ow, bw)
    dy1 = min(y + oh, bh)
    if dx1 <= dx0 or dy1 <= dy0:
        return
    sx1 = sx0 + (dx1 - dx0)
    sy1 = sy0 + (dy1 - dy0)
    region = base.crop((dx0, dy0, dx1, dy1))
    piece = overlay.crop((sx0, sy0, sx1, sy1))
    base.paste(ImageChops.lighter(region, piece), (dx0, dy0))


def make_stroke(length: int, width: int, angle: float, fill: int = 255) -> Image.Image:
    sw = max(length, width) + 6
    sh = width + 6
    stroke = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(stroke).rounded_rectangle(
        [2, 2, sw - 3, sh - 3],
        radius=max(2, sh // 2),
        fill=fill,
    )
    return stroke.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)


def stamp_stroke(
    mask: Image.Image,
    x: float,
    y: float,
    length: int,
    width: int,
    angle: float,
    fill: int = 255,
) -> None:
    stroke = make_stroke(length, width, angle, fill)
    rw, rh = stroke.size
    paste_max(mask, stroke, (int(x - rw / 2), int(y - rh / 2)))


def perimeter_points(
    x0: float, y0: float, x1: float, y1: float, radius: float, spacing: float
) -> list[tuple[float, float, float]]:
    """Points along a rounded-rect, with tangent angle in degrees."""
    pts: list[tuple[float, float, float]] = []
    width = x1 - x0
    height = y1 - y0
    r = min(radius, width / 2, height / 2)

    def add_line(ax: float, ay: float, bx: float, by: float, angle: float) -> None:
        dist = math.hypot(bx - ax, by - ay)
        n = max(1, int(dist / spacing))
        for i in range(n + 1):
            t = i / n
            pts.append((ax + (bx - ax) * t, ay + (by - ay) * t, angle))

    def add_arc(cx: float, cy: float, a0: float, a1: float) -> None:
        span = a1 - a0
        n = max(4, int(abs(span) * r / spacing))
        for i in range(n + 1):
            a = a0 + span * i / n
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a), math.degrees(a) + 90))

    add_line(x0 + r, y0, x1 - r, y0, 0)
    add_arc(x1 - r, y0 + r, -math.pi / 2, 0)
    add_line(x1, y0 + r, x1, y1 - r, 90)
    add_arc(x1 - r, y1 - r, 0, math.pi / 2)
    add_line(x1 - r, y1, x0 + r, y1, 0)
    add_arc(x0 + r, y1 - r, math.pi / 2, math.pi)
    add_line(x0, y1 - r, x0, y0 + r, 90)
    add_arc(x0 + r, y0 + r, math.pi, 3 * math.pi / 2)
    return pts


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    target_w = 1400
    scale = target_w / src.width
    art = src.resize(
        (target_w, round(src.height * scale)),
        Image.Resampling.LANCZOS,
    )
    art = ImageEnhance.Brightness(art).enhance(1.06)
    art = ImageEnhance.Color(art).enhance(0.88)
    art = ImageEnhance.Contrast(art).enhance(0.94)
    wash = Image.new("RGBA", art.size, (238, 245, 251, 36))
    art = Image.alpha_composite(art, wash)

    w, h = art.size
    pad = 88
    cw, ch = w + pad * 2, h + pad * 2
    placed = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    placed.paste(art, (pad, pad))

    mask = Image.new("L", (cw, ch), 0)
    draw = ImageDraw.Draw(mask)
    inset = 52
    x0, y0 = pad + inset, pad + inset
    x1, y1 = pad + w - inset, pad + h - inset
    radius = int(min(w, h) * 0.28)
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=255)

    # Loaded-brush dabs along the silhouette
    for x, y, tangent in perimeter_points(x0, y0, x1, y1, radius, spacing=10):
        angle = tangent + RNG.uniform(-38, 38)
        length = RNG.randint(70, 150)
        width = RNG.randint(20, 48)
        stamp_stroke(
            mask,
            x + RNG.uniform(-8, 8),
            y + RNG.uniform(-8, 8),
            length,
            width,
            angle,
            fill=255,
        )
        # Second bristle, slightly offset like a worn brush
        stamp_stroke(
            mask,
            x + RNG.uniform(-16, 16),
            y + RNG.uniform(-16, 16),
            RNG.randint(36, 90),
            RNG.randint(10, 24),
            angle + RNG.uniform(-50, 50),
            fill=RNG.randint(210, 255),
        )
        if RNG.random() < 0.4:
            stamp_stroke(
                mask,
                x + RNG.uniform(-20, 20),
                y + RNG.uniform(-20, 20),
                RNG.randint(18, 48),
                RNG.randint(6, 14),
                angle + RNG.uniform(-70, 70),
                fill=RNG.randint(180, 240),
            )

    # Dry-brush bites (subtract)
    bites = Image.new("L", (cw, ch), 0)
    for _ in range(70):
        x, y, tangent = RNG.choice(perimeter_points(x0, y0, x1, y1, radius, spacing=20))
        outward = 18
        bx = x + math.cos(math.radians(tangent - 90)) * outward + RNG.uniform(-8, 8)
        by = y + math.sin(math.radians(tangent - 90)) * outward + RNG.uniform(-8, 8)
        stamp_stroke(
            bites,
            bx,
            by,
            RNG.randint(18, 42),
            RNG.randint(5, 12),
            tangent + RNG.uniform(-50, 50),
            fill=RNG.randint(160, 255),
        )
    mask = ImageChops.subtract(mask, ImageEnhance.Brightness(bites).enhance(0.65))

    # Ink splatters just outside the wash
    splat = ImageDraw.Draw(mask)
    for _ in range(42):
        x, y, tangent = RNG.choice(perimeter_points(x0, y0, x1, y1, radius, spacing=16))
        dist = RNG.uniform(8, 42)
        sx = x + math.cos(math.radians(tangent - 90)) * dist + RNG.uniform(-6, 6)
        sy = y + math.sin(math.radians(tangent - 90)) * dist + RNG.uniform(-6, 6)
        r = RNG.randint(2, 9)
        splat.ellipse([sx - r, sy - r, sx + r, sy + r], fill=RNG.randint(150, 255))
        if RNG.random() < 0.35:
            r2 = RNG.randint(1, 3)
            dx, dy = RNG.uniform(-10, 10), RNG.uniform(-10, 10)
            splat.ellipse(
                [sx + dx - r2, sy + dy - r2, sx + dx + r2, sy + dy + r2],
                fill=RNG.randint(120, 220),
            )

    mask = mask.filter(ImageFilter.GaussianBlur(1.4))
    # Keep the interior solid; leave a slightly ragged brush fringe
    core = mask.point(lambda p: 255 if p > 88 else 0)
    core = core.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.1))
    fringe = mask.point(lambda p: min(255, int(p * 1.2)))
    mask = ImageChops.lighter(core, fringe)
    mask = mask.filter(ImageFilter.GaussianBlur(0.7))

    canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    canvas.paste(placed, (0, 0), mask)
    canvas.save(OUT, "PNG", optimize=True)

    sm_w = 720
    sm_h = round(ch * sm_w / cw)
    canvas.resize((sm_w, sm_h), Image.Resampling.LANCZOS).save(OUT_SM, "PNG", optimize=True)
    print(f"wrote {OUT.name} {canvas.size} {OUT.stat().st_size} bytes")
    print(f"wrote {OUT_SM.name} {sm_w}x{sm_h} {OUT_SM.stat().st_size} bytes")


if __name__ == "__main__":
    main()
