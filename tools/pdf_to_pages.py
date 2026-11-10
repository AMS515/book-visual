#!/usr/bin/env python3
"""
tools/pdf_to_pages.py
Converts a PDF file OR existing page images into sequential WebP textures:
  - pages/page-001.webp ... page-N.webp (2048 px on the long side)
  - pages-hi/page-001.webp ... page-N.webp (3500 px on the long side)

Usage:
  1) From attached images folder:
     pip install Pillow PyMuPDF
     python tools/pdf_to_pages.py --from-images ./raw_images --out .

  2) From a PDF file:
     python tools/pdf_to_pages.py --pdf book.pdf --out .
"""

import argparse
import os
from pathlib import Path
from PIL import Image

# Ordered mapping of the 10 provided textbook images (sorted by printed page order)
ORDERED_ATTACHED_FILES = [
    ("1000128468.webp", 1),   # Cover - الفصل الرابع
    ("1000128473.webp", 4),   # Page 4
    ("1000128476.webp", 5),   # Page 5
    ("1000128475.webp", 6),   # Page 6
    ("1000128477.webp", 7),   # Page 7
    ("1000128478.webp", 8),   # Page 8
    ("1000128479.webp", 9),   # Page 9
    ("1000128467.webp", 11),  # Page 11
    ("1000128469.webp", 12),  # Page 12
    ("1000128471.webp", 13),  # Page 13
]


def save_resized_webp(img: Image.Image, dst_path: Path, long_side: int, quality: int = 90):
    img_rgb = img.convert("RGB")
    w, h = img_rgb.size
    scale = long_side / float(max(w, h))
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    resized = img_rgb.resize((new_w, new_h), Image.Resampling.LANCZOS)
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    resized.save(dst_path, "WEBP", quality=quality, method=6)


def convert_from_images(src_dir: Path, out_dir: Path):
    pages_dir = out_dir / "pages"
    pages_hi_dir = out_dir / "pages-hi"
    pages_dir.mkdir(parents=True, exist_ok=True)
    pages_hi_dir.mkdir(parents=True, exist_ok=True)

    found_files = []
    for fname, printed_num in ORDERED_ATTACHED_FILES:
        candidate = src_dir / fname
        if candidate.exists():
            found_files.append((candidate, printed_num))

    if not found_files:
        # Fallback: sort all images in src_dir alphabetically
        exts = {".webp", ".png", ".jpg", ".jpeg"}
        found_files = [
            (p, idx + 1)
            for idx, p in enumerate(sorted(src_dir.iterdir()))
            if p.suffix.lower() in exts
        ]

    for seq_idx, (img_path, printed_num) in enumerate(found_files, start=1):
        seq_name = f"page-{seq_idx:03d}.webp"
        with Image.open(img_path) as im:
            save_resized_webp(im, pages_dir / seq_name, long_side=2048, quality=90)
            save_resized_webp(im, pages_hi_dir / seq_name, long_side=3500, quality=92)
        print(f"[OK] Seq #{seq_idx:02d} (Printed p.{printed_num}) -> pages/{seq_name} & pages-hi/{seq_name}")


def convert_from_pdf(pdf_path: Path, out_dir: Path):
    import fitz  # PyMuPDF

    pages_dir = out_dir / "pages"
    pages_hi_dir = out_dir / "pages-hi"
    doc = fitz.open(pdf_path)

    for idx, page in enumerate(doc, start=1):
        seq_name = f"page-{idx:03d}.webp"
        rect = page.rect
        long_pts = max(rect.width, rect.height)

        # Render 3500 px master and downscale for 2048 px
        zoom_hi = 3500.0 / long_pts
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom_hi, zoom_hi), alpha=False)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        save_resized_webp(img, pages_dir / seq_name, long_side=2048, quality=90)
        save_resized_webp(img, pages_hi_dir / seq_name, long_side=3500, quality=92)
        print(f"[OK] PDF Page #{idx:03d} -> pages/{seq_name} & pages-hi/{seq_name}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Prepare sequential WebP pages for the 3D textbook.")
    parser.add_argument("--pdf", type=Path, help="Path to source PDF file")
    parser.add_argument("--from-images", type=Path, default=Path("."), help="Directory containing page images")
    parser.add_argument("--out", type=Path, default=Path("."), help="Output project root directory")
    args = parser.parse_args()

    if args.pdf and args.pdf.exists():
        convert_from_pdf(args.pdf, args.out)
    else:
        convert_from_images(args.from_images, args.out)