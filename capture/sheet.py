# Contact sheet of rendered stills, labelled with their times.
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
files = sys.argv[2:] if len(sys.argv) > 2 else sorted(glob.glob('.cache/stills/*.jpg'))
out = sys.argv[1]
cols = 2
w, h = 960, 540
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 30)), (30, 30, 30))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/System/Library/Fonts/SFNSMono.ttf', 22)
except Exception:
    font = ImageFont.load_default()
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h))
    x, y = (i % cols) * w, (i // cols) * (h + 30)
    sheet.paste(im, (x, y + 30))
    d.text((x + 8, y + 4), os.path.basename(f), fill=(255, 220, 0), font=font)
sheet.save(out, quality=85)
print(out, sheet.size)
