from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "sqezz-community-banner-base.png"
CLEAN = ROOT / "assets" / "sqezz-community-banner-clean.png"
OUTPUT = ROOT / "assets" / "sqezz-community-banner.gif"
SIZE = (960, 540)

# Crops are ordered exactly as the viewer should read the lettering.
LETTER_BOXES = [
    # SQEZZ
    (266, 323, 357, 402),
    (350, 323, 451, 402),
    (443, 323, 529, 402),
    (518, 323, 614, 402),
    (601, 323, 701, 402),
    # COMMUNITY
    (311, 401, 353, 447),
    (345, 401, 393, 447),
    (386, 401, 440, 447),
    (432, 401, 488, 447),
    (480, 401, 530, 447),
    (524, 401, 574, 447),
    (568, 401, 591, 447),
    (584, 401, 627, 447),
    (618, 401, 661, 447),
]


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_ratio = size[0] / size[1]
    source_ratio = image.width / image.height
    if source_ratio > target_ratio:
        width = round(image.height * target_ratio)
        left = (image.width - width) // 2
        image = image.crop((left, 0, left + width, image.height))
    else:
        height = round(image.width / target_ratio)
        top = (image.height - height) // 2
        image = image.crop((0, top, image.width, top + height))
    return image.resize(size, Image.Resampling.LANCZOS)


def text_mask(original: Image.Image, clean: Image.Image) -> Image.Image:
    # The clean plate was produced from the same artwork. A difference mask
    # isolates the removed lettering while retaining its neon bloom.
    difference = ImageChops.difference(original, clean).convert("L")
    difference = ImageEnhance.Contrast(difference).enhance(2.6)
    difference = difference.point(lambda value: 0 if value < 18 else min(255, value * 4))

    allowed = Image.new("L", SIZE, 0)
    for box in LETTER_BOXES:
        allowed.paste(255, box)
    difference = ImageChops.multiply(difference, allowed)
    return difference.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.4))


def revealed_mask(full_mask: Image.Image, count: int) -> Image.Image:
    reveal = Image.new("L", SIZE, 0)
    for box in LETTER_BOXES[:count]:
        reveal.paste(full_mask.crop(box), box)
    return reveal


def add_neon_flash(frame: Image.Image, strength: float) -> Image.Image:
    glow = frame.filter(ImageFilter.GaussianBlur(10))
    glow = ImageEnhance.Brightness(glow).enhance(1.25)
    return Image.blend(frame, glow, strength)


def main() -> None:
    with Image.open(SOURCE) as image:
        original = cover(image.convert("RGB"), SIZE)
    with Image.open(CLEAN) as image:
        clean = cover(image.convert("RGB"), SIZE)

    full_mask = text_mask(original, clean)
    frames: list[Image.Image] = []
    durations: list[int] = []

    # A short clean opening, then one new letter on every frame.
    for _ in range(2):
        frames.append(clean.copy())
        durations.append(120)

    for count in range(1, len(LETTER_BOXES) + 1):
        frame = Image.composite(original, clean, revealed_mask(full_mask, count))
        frames.append(frame)
        durations.append(115 if count <= 5 else 85)

    completed = Image.composite(original, clean, full_mask)
    frames.extend(
        [
            add_neon_flash(completed, 0.05),
            add_neon_flash(completed, 0.10),
            add_neon_flash(completed, 0.05),
            completed,
            completed,
        ]
    )
    durations.extend([90, 90, 90, 250, 900])

    paletted = [
        frame.convert("P", palette=Image.Palette.ADAPTIVE, colors=192)
        for frame in frames
    ]
    paletted[0].save(
        OUTPUT,
        save_all=True,
        append_images=paletted[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )


if __name__ == "__main__":
    main()
