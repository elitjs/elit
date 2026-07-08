"""Generate PNG icons for the Chrome extension from the favicon design."""
from PIL import Image, ImageDraw


def draw_icon(size: int, gradient_colors: tuple[str, str]) -> Image.Image:
    """Render the Elit icon at the given size with the given gradient colors."""
    scale = size / 100.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # Approximate diagonal gradient by computing RGB per pixel.
    r1, g1, b1, _ = _hex(gradient_colors[0])
    r2, g2, b2, _ = _hex(gradient_colors[1])
    gradient = Image.new("RGBA", (size, size))
    denom = max(1, 2 * (size - 1))
    for y in range(size):
        for x in range(size):
            t = (x + y) / denom
            r = int(r1 * (1 - t) + r2 * t)
            g = int(g1 * (1 - t) + g2 * t)
            b = int(b1 * (1 - t) + b2 * t)
            gradient.putpixel((x, y), (r, g, b, 255))

    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=20 * scale, fill=255)
    img.paste(gradient, (0, 0), mask)
    draw = ImageDraw.Draw(img)

    white = (255, 255, 255, 255)
    # 3 horizontal bars of the E
    _bar(draw, 28, 25, 44, 8, scale, white)   # top
    _bar(draw, 28, 46, 32, 8, scale, white)   # middle
    _bar(draw, 28, 67, 44, 8, scale, white)   # bottom
    # Vertical connector on the left
    _bar(draw, 28, 25, 8, 50, scale, white)

    # Accent dot
    cx, cy, r = 72 * scale, 50 * scale, 6 * scale
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, 128))

    return img


def _bar(draw: ImageDraw.ImageDraw, x: float, y: float, w: float, h: float, scale: float, fill):
    draw.rounded_rectangle(
        (x * scale, y * scale, (x + w) * scale, (y + h) * scale),
        radius=4 * scale,
        fill=fill,
    )


def _hex(s: str) -> tuple[int, int, int, int]:
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)


if __name__ == "__main__":
    colored = ("#6366f1", "#8b5cf6")
    bw = ("#4a4f5e", "#3a3f4e")
    sizes = [16, 32, 48, 128]
    for s in sizes:
        draw_icon(s, colored).save(f"icon{s}.png")
        draw_icon(s, bw).save(f"icon{s}-bw.png")
    print("Generated icons:", [f"icon{s}.png" for s in sizes] + [f"icon{s}-bw.png" for s in sizes])
