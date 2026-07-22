from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SIZE, SCALE = 64, 4
CANVAS = SIZE * SCALE
WHITE = (255, 255, 255, 255)
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "role-icons"

ROLES = {
    "owner": ("Owner", "#1e1d20", "crown"),
    "head-admin": ("Head Admin", "#4e4747", "crown-star"),
    "senior-admin": ("Senior Admin", "#aa3b3b", "shield-star"),
    "admin": ("Admin", "#f83737", "shield-check"),
    "junior-admin": ("Junior Admin", "#fc5858", "shield"),
    "senior-moderator": ("Senior Moderator", "#0c7412", "badge-star"),
    "moderator": ("Moderator", "#0fac04", "badge-check"),
    "junior-moderator": ("Junior Moderator", "#029662", "badge"),
    "support": ("Support", "#4cadd0", "headset"),
}


def s(value): return round(value * SCALE)
def box(values): return tuple(s(value) for value in values)
def points(values): return [(s(x), s(y)) for x, y in values]


def line(draw, values, width=4, close=False):
    pts = points(values)
    if close: pts.append(pts[0])
    stroke = s(width)
    draw.line(pts, fill=WHITE, width=stroke, joint="curve")
    radius = stroke // 2
    targets = pts if close else (pts[0], pts[-1])
    for x, y in targets:
        draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=WHITE)


def star_points(cx, cy, outer, inner):
    import math
    result = []
    for index in range(10):
        angle = -math.pi / 2 + index * math.pi / 5
        radius = outer if index % 2 == 0 else inner
        result.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    return result


def crown(draw, star=False):
    line(draw, [(12, 22), (23, 34), (32, 15), (41, 34), (52, 22), (47, 47), (17, 47)], 4, True)
    line(draw, [(18, 53), (46, 53)], 4)
    if star: draw.polygon(points(star_points(32, 32, 7, 3)), fill=WHITE)


def shield(draw, detail=None):
    line(draw, [(32, 10), (50, 17), (47, 39), (32, 54), (17, 39), (14, 17)], 4, True)
    if detail == "check": line(draw, [(23, 32), (29, 38), (42, 25)], 4)
    if detail == "star": draw.polygon(points(star_points(32, 31, 8, 3.5)), fill=WHITE)


def badge(draw, detail=None):
    draw.ellipse(box((12, 12, 52, 52)), outline=WHITE, width=s(4))
    if detail == "check": line(draw, [(22, 32), (29, 39), (43, 24)], 4)
    elif detail == "star": draw.polygon(points(star_points(32, 31, 10, 4.5)), fill=WHITE)
    else:
        draw.ellipse(box((27, 22, 37, 32)), fill=WHITE)
        draw.rounded_rectangle(box((23, 35, 41, 43)), radius=s(4), fill=WHITE)


def headset(draw):
    draw.arc(box((12, 11, 52, 53)), 180, 360, fill=WHITE, width=s(5))
    draw.rounded_rectangle(box((10, 29, 19, 45)), radius=s(4), fill=WHITE)
    draw.rounded_rectangle(box((45, 29, 54, 45)), radius=s(4), fill=WHITE)
    line(draw, [(49, 43), (44, 51), (35, 51)], 4)
    draw.ellipse(box((30, 47, 38, 55)), fill=WHITE)


def render(color, symbol):
    image = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.ellipse(box((2, 2, 62, 62)), fill=color, outline=(255, 255, 255, 80), width=s(2))
    if symbol == "crown": crown(draw)
    elif symbol == "crown-star": crown(draw, True)
    elif symbol == "shield-star": shield(draw, "star")
    elif symbol == "shield-check": shield(draw, "check")
    elif symbol == "shield": shield(draw)
    elif symbol == "badge-star": badge(draw, "star")
    elif symbol == "badge-check": badge(draw, "check")
    elif symbol == "badge": badge(draw)
    else: headset(draw)
    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rendered = []
    for filename, (role_name, color, symbol) in ROLES.items():
        image = render(color, symbol)
        image.save(OUTPUT_DIR / f"{filename}.png", optimize=True)
        rendered.append((role_name, image, color))

    width, row_height = 520, 86
    preview = Image.new("RGBA", (width, row_height * len(rendered)), (9, 11, 18, 255))
    draw = ImageDraw.Draw(preview)
    try: font = ImageFont.truetype("arialbd.ttf", 22)
    except OSError: font = ImageFont.load_default()
    try: small = ImageFont.truetype("arial.ttf", 15)
    except OSError: small = ImageFont.load_default()
    for index, (name, image, color) in enumerate(rendered):
        y = index * row_height
        preview.alpha_composite(image, (18, y + 11))
        draw.text((102, y + 19), name, fill=(239, 246, 255, 255), font=font)
        draw.text((102, y + 49), color.upper(), fill=color, font=small)
    preview.save(OUTPUT_DIR / "role-icons-preview.png", optimize=True)
    print(f"Generated {len(rendered)} role icons")


if __name__ == "__main__": main()
