"""Draws patchbay's pixel-art logo on a grid and writes it as SVG: one <path> per colour, one rectangle per run.

The logo is a patch bay's faceplate (rack ears, two rows of jacks, two patch cables sagging between them) beside the
word "patchbay" in a bold pixel font; the icon is the faceplate alone. The SVGs in docs/assets/ are this script's output,
committed. Change the logo here, then run `python3 tools/logo.py` from the repository root (standard library only).
"""

from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "docs" / "assets"

INK = "#1c1a2e"  # outlines, and the letters on a light background
CREAM = "#ffe9cc"  # the letters on a dark background
PLATE, PLATE_LIGHT, PLATE_DARK = "#3b3660", "#59528c", "#2a2647"  # the faceplate, its lit top edge, its lower edge
SCREW = "#8a82c8"
RING, RING_LIGHT = "#b8bccb", "#ffffff"  # a jack's metal ring and its glint
HOLE = "#0d0c16"  # an empty jack
ORANGE, ORANGE_DARK = "#ff8a3d", "#d9541e"  # one cable, its shaded underside
GREEN, GREEN_DARK = "#3ddc84", "#1f9e5a"  # the other

Grid = dict[tuple[int, int], str]

# Lowercase glyphs, 5 wide before bolding; rows 0-1 ascend, 2-6 are the x-height, 7-8 descend.
GLYPHS = {
    "p": ["", "", "####", "#...#", "#...#", "#...#", "####", "#", "#"],
    "a": ["", "", ".###", "....#", ".####", "#...#", ".####"],
    "t": [".#", ".#", "####", ".#", ".#", ".#..#", "..##"],
    "c": ["", "", ".###", "#...#", "#", "#...#", ".###"],
    "h": ["#", "#", "#.##", "##..#", "#...#", "#...#", "#...#"],
    "b": ["#", "#", "####", "#...#", "#...#", "#...#", "####"],
    "y": ["", "", "#...#", "#...#", "#...#", "#...#", ".####", "....#", ".###"],
}


def faceplate() -> Grid:
    """The patch bay: a plate 31 wide and 11 tall with rack ears, two rows of four jacks, and two cables that join
    jacks on the lower row and sag below the plate, the green one over the orange."""
    g: Grid = {}
    w, h = 31, 11
    for y in range(h):
        for x in range(w):
            edge = x in (0, w - 1) or y in (0, h - 1)
            g[(x, y)] = INK if edge else PLATE_LIGHT if y == 1 else PLATE_DARK if y == h - 2 else PLATE
    for ear in (2, w - 3):
        for y in (3, h - 4):
            g[(ear, y)] = SCREW
            g[(ear, y + 1)] = PLATE_DARK
        seam = ear + 2 if ear == 2 else ear - 2
        for y in range(1, h - 1):
            g[(seam, y)] = PLATE_DARK
    for cx in (8, 13, 18, 23):
        for cy in (3, 7):
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    g[(cx + dx, cy + dy)] = RING
            g[(cx - 1, cy - 1)] = RING_LIGHT
            g[(cx, cy)] = HOLE
    cable(g, (8, 7), (18, 7), sag=6, colour=ORANGE, shade=ORANGE_DARK)
    cable(g, (13, 7), (23, 7), sag=4, colour=GREEN, shade=GREEN_DARK)
    # a plugged jack keeps its ring above and beside the plug; the cable leaves through the ring's bottom edge
    for cx, plug in ((8, ORANGE), (18, ORANGE), (13, GREEN), (23, GREEN)):
        for dx, dy in ((-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0)):
            g[(cx + dx, 7 + dy)] = RING_LIGHT if (dx, dy) == (-1, -1) else RING
        g[(cx, 7)] = plug
    return g


def cable(g: Grid, start: tuple[int, int], end: tuple[int, int], sag: int, colour: str, shade: str) -> None:
    """A cable from one jack to another, a quadratic curve hanging ``sag`` pixels below the lower jack, two pixels
    wide and lit, with a shaded pixel under each column, so it reads as thick at every slope; the plug fills each hole."""
    (x0, y0), (x2, y2) = start, end
    x1, y1 = (x0 + x2) / 2, max(y0, y2) + 2 * sag
    pixels: list[tuple[int, int]] = []
    for i in range(801):
        t = i / 800
        x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * x1 + t**2 * x2
        y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * y1 + t**2 * y2
        p = (round(x), round(y))
        if not pixels or pixels[-1] != p:
            pixels.append(p)
    lit = set(pixels) | {(x + 1, y) for x, y in pixels}
    for x, y in lit:
        if (x, y + 1) not in lit:
            g[(x, y + 1)] = shade
    for p in lit:
        g[p] = colour


def word(text: str, ink: str) -> Grid:
    """The word in the pixel font, bold (each pixel doubled to its right, so strokes are two wide), each letter
    followed by one blank column."""
    g: Grid = {}
    x = 0
    for letter in text:
        rows = GLYPHS[letter]
        for y, row in enumerate(rows):
            for dx, cell in enumerate(row):
                if cell == "#":
                    g[(x + dx, y)] = ink
                    g[(x + dx + 1, y)] = ink
        x += 7
    return g


def svg(grid: Grid, title: str, pad: int = 1) -> str:
    xs = [x for x, _ in grid]
    ys = [y for _, y in grid]
    x0, y0 = min(xs) - pad, min(ys) - pad
    width, height = max(xs) - x0 + 1 + pad, max(ys) - y0 + 1 + pad
    paths: dict[str, list[str]] = {}
    for y in range(y0, y0 + height):
        x = x0
        while x < x0 + width:
            c = grid.get((x, y))
            if c is None:
                x += 1
                continue
            run = 1
            while grid.get((x + run, y)) == c:
                run += 1
            paths.setdefault(c, []).append(f"M{x - x0} {y - y0}h{run}v1h-{run}z")
            x += run
    body = "".join(f'<path fill="{c}" d="{"".join(d)}"/>' for c, d in paths.items())
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" shape-rendering="crispEdges" '
        f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'
    )


def logo(ink: str) -> Grid:
    """The faceplate, then the word four pixels to its right, its x-height level with the jack rows."""
    g = faceplate()
    ox = max(x for x, _ in g) + 4
    for (x, y), c in word("patchbay", ink).items():
        g[(x + ox, y + 1)] = c
    return g


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "logo.svg").write_text(svg(logo(INK), "patchbay"))
    (OUT / "logo-dark.svg").write_text(svg(logo(CREAM), "patchbay"))
    (OUT / "icon.svg").write_text(svg(faceplate(), "patchbay"))


if __name__ == "__main__":
    main()
