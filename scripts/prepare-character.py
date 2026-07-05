"""
Character asset pipeline: takes the raw generated portraits in
public/character/*.png, erases the generator's sparkle watermark
(bottom-right) by cloning the gradient region above it, and emits
optimized WebP files the app actually ships.

Run after replacing any source art:  python scripts/prepare-character.py
Raw PNGs stay untracked; the WebP outputs are committed.
"""

from pathlib import Path

from PIL import Image

STATES = ["idle", "flourish", "celebrate", "slump", "wink", "blink"]
SRC = Path("public/character")

# Sparkle watermark bounding box on the 848x1264 renders, with margin.
WM_BOX = (688, 1095, 775, 1190)  # left, top, right, bottom
# Donor region: same columns, directly above — the backdrop gradient is
# smooth enough vertically that the patch is invisible.
DONOR_SHIFT = WM_BOX[3] - WM_BOX[1]


def process(name: str) -> None:
    src = SRC / f"{name}.png"
    out = SRC / f"{name}.webp"
    img = Image.open(src).convert("RGBA")

    donor_box = (WM_BOX[0], WM_BOX[1] - DONOR_SHIFT, WM_BOX[2], WM_BOX[1])
    patch = img.crop(donor_box)
    img.paste(patch, (WM_BOX[0], WM_BOX[1]))

    img.save(out, "WEBP", quality=86, method=6)
    print(f"{name}: {src.stat().st_size // 1024}KB png -> {out.stat().st_size // 1024}KB webp")


if __name__ == "__main__":
    for state in STATES:
        process(state)
