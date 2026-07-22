from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

COLOR = (0, 174, 239, 255)
SIZE = 128
SCALE = 4
CANVAS = SIZE * SCALE
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "emojis"


def s(value):
    return round(value * SCALE)


def box(values):
    return tuple(s(value) for value in values)


def points(values):
    return [(s(x), s(y)) for x, y in values]


def rounded_line(draw, values, width=11, fill=COLOR, close=False):
    pts = points(values)
    if close:
        pts.append(pts[0])
    stroke = s(width)
    draw.line(pts, fill=fill, width=stroke, joint="curve")
    radius = stroke // 2
    for x, y in (pts if close else [pts[0], pts[-1]]):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill)


def save_icon(draw):
    draw.rounded_rectangle(box((20, 14, 108, 114)), radius=s(9), outline=COLOR, width=s(10))
    draw.rounded_rectangle(box((36, 20, 91, 59)), radius=s(5), outline=COLOR, width=s(9))
    draw.rounded_rectangle(box((38, 79, 90, 100)), radius=s(5), fill=COLOR)
    draw.rounded_rectangle(box((72, 25, 84, 51)), radius=s(3), fill=COLOR)


def user_icon(draw):
    draw.ellipse(box((43, 17, 85, 59)), fill=COLOR)
    draw.rounded_rectangle(box((24, 72, 104, 113)), radius=s(20), fill=COLOR)


def redirect_icon(draw):
    rounded_line(draw, [(18, 27), (52, 64), (18, 101)], width=11)
    rounded_line(draw, [(66, 27), (100, 64), (66, 101)], width=11)


def ticket_icon(draw):
    draw.rounded_rectangle(box((15, 30, 113, 98)), radius=s(12), outline=COLOR, width=s(10))
    for y in (43, 58, 73, 88):
        draw.ellipse(box((59, y, 69, y + 10)), fill=COLOR)


def shield_icon(draw):
    rounded_line(draw, [(64, 13), (105, 28), (99, 78), (64, 113), (29, 78), (23, 28)], width=10, close=True)
    rounded_line(draw, [(43, 64), (57, 78), (86, 47)], width=10)


def warn_icon(draw):
    rounded_line(draw, [(64, 15), (112, 105), (16, 105)], width=10, close=True)
    rounded_line(draw, [(64, 45), (64, 73)], width=10)
    draw.ellipse(box((58, 84, 70, 96)), fill=COLOR)


def check_icon(draw):
    rounded_line(draw, [(20, 66), (50, 94), (108, 32)], width=14)


def close_icon(draw):
    rounded_line(draw, [(28, 28), (100, 100)], width=13)
    rounded_line(draw, [(100, 28), (28, 100)], width=13)


def gift_icon(draw):
    draw.rounded_rectangle(box((20, 53, 108, 108)), radius=s(8), outline=COLOR, width=s(9))
    draw.rounded_rectangle(box((14, 44, 114, 67)), radius=s(7), fill=COLOR)
    draw.rounded_rectangle(box((58, 45, 70, 108)), radius=s(3), fill=COLOR)
    draw.ellipse(box((31, 19, 63, 50)), outline=COLOR, width=s(9))
    draw.ellipse(box((65, 19, 97, 50)), outline=COLOR, width=s(9))


def announce_icon(draw):
    draw.polygon(points([(19, 51), (48, 51), (99, 24), (99, 104), (48, 77), (19, 77)]), fill=COLOR)
    rounded_line(draw, [(40, 78), (48, 108)], width=12)
    rounded_line(draw, [(112, 47), (112, 81)], width=8)


def bot_icon(draw):
    draw.rounded_rectangle(box((17, 37, 111, 108)), radius=s(16), outline=COLOR, width=s(10))
    rounded_line(draw, [(64, 37), (64, 21)], width=8)
    draw.ellipse(box((56, 11, 72, 27)), fill=COLOR)
    draw.ellipse(box((37, 59, 53, 75)), fill=COLOR)
    draw.ellipse(box((75, 59, 91, 75)), fill=COLOR)
    rounded_line(draw, [(43, 88), (64, 97), (85, 88)], width=8)


def crown_icon(draw):
    rounded_line(draw, [(17, 37), (42, 65), (64, 26), (86, 65), (111, 37), (101, 96), (27, 96)], width=10, close=True)
    rounded_line(draw, [(28, 110), (100, 110)], width=10)


ICONS = {
    "naplet_save": save_icon,
    "naplet_user": user_icon,
    "naplet_redirect": redirect_icon,
    "naplet_ticket": ticket_icon,
    "naplet_shield": shield_icon,
    "naplet_warn": warn_icon,
    "naplet_check": check_icon,
    "naplet_close": close_icon,
    "naplet_gift": gift_icon,
    "naplet_announce": announce_icon,
    "naplet_bot": bot_icon,
    "naplet_crown": crown_icon,
}


def render_icon(renderer):
    large = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    renderer(ImageDraw.Draw(large))
    return large.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rendered = []
    for name, renderer in ICONS.items():
        image = render_icon(renderer)
        output = OUTPUT_DIR / f"{name}.png"
        image.save(output, optimize=True)
        rendered.append((name, image))

    cell_width, cell_height, columns = 190, 170, 4
    rows = (len(rendered) + columns - 1) // columns
    preview = Image.new("RGBA", (cell_width * columns, cell_height * rows), (9, 11, 18, 255))
    draw = ImageDraw.Draw(preview)
    try:
        font = ImageFont.truetype("arial.ttf", 15)
    except OSError:
        font = ImageFont.load_default()
    for index, (name, image) in enumerate(rendered):
        column, row = index % columns, index // columns
        x, y = column * cell_width, row * cell_height
        preview.alpha_composite(image, (x + 31, y + 8))
        text_box = draw.textbbox((0, 0), name, font=font)
        text_width = text_box[2] - text_box[0]
        draw.text((x + (cell_width - text_width) / 2, y + 142), name, fill=(219, 234, 254, 255), font=font)
    preview.save(OUTPUT_DIR / "naplet-emoji-pack-preview.png", optimize=True)
    print(f"Generated {len(rendered)} smooth emoji files in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

