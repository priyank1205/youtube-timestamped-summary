#!/usr/bin/env bash
# Deliverables from a rendered master (1080p60) and its poster still:
#   <name>-readme.mp4   ≤ 9.5 MB, 1280×720 30 fps — fits GitHub's 10 MB upload
#                       limit, and opens on the poster (GitHub's thumbnail is
#                       the first frame)
#   <name>-1080p.mp4    H.264 for the landing page (Safari, older browsers)
#   <name>-1080p.webm   VP9 for the landing page
#   <poster>.jpg        <video poster="…">
#   <gif>               the core interaction (click a timestamp → the video jumps)
#
#   bash scripts/export.sh                    # the first film: out/promo.mp4, out/poster.png
#   bash scripts/export.sh out/promo-daylight-dark.mp4 out/daylight-dark-poster.png out/daylight-dark out/daylight-dark-loop.gif
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=${1:-out/promo.mp4}
POSTER=${2:-out/poster.png}
NAME=${3:-out/promo}
GIF=${4:-out/demo-loop.gif}
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
PASSLOG=$(mktemp -t export-pass)

# README cut: poster for 0.6 s dissolving into the film, two-pass to a size budget.
TOTAL=$(python3 -c "print($DUR + 0.6)")
VBR=$(python3 -c "print(int(9.3*8*1024/$TOTAL - 96))")
VIDEO_FILTER="[0:v]scale=1280:720:flags=lanczos,fps=30,format=yuv420p,setsar=1[p];[1:v]fps=30,scale=1280:720:flags=lanczos,format=yuv420p,setsar=1[f];[p][f]xfade=transition=fade:duration=0.3:offset=0.6[v]"
FILTER="$VIDEO_FILTER;[1:a]adelay=600|600[a]"
ffmpeg -y -loglevel error -loop 1 -t 0.9 -i "$POSTER" -i "$SRC" -filter_complex "$VIDEO_FILTER" -map "[v]" \
  -c:v libx264 -preset slow -b:v ${VBR}k -pass 1 -passlogfile "$PASSLOG" -an -f mp4 /dev/null
ffmpeg -y -loglevel error -loop 1 -t 0.9 -i "$POSTER" -i "$SRC" -filter_complex "$FILTER" -map "[v]" -map "[a]" \
  -c:v libx264 -preset slow -b:v ${VBR}k -pass 2 -passlogfile "$PASSLOG" -c:a aac -b:a 96k -movflags +faststart "$NAME-readme.mp4"
rm -f "$PASSLOG"*

# Landing page: H.264 and VP9 at 1080p (keep 60 fps; it's what makes the motion smooth).
ffmpeg -y -loglevel error -i "$SRC" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$NAME-1080p.mp4"
ffmpeg -y -loglevel error -i "$SRC" -c:v libvpx-vp9 -b:v 0 -crf 33 -row-mt 1 -deadline good -cpu-used 2 -c:a libopus -b:a 128k "$NAME-1080p.webm"

# Poster as JPEG for the web.
ffmpeg -y -loglevel error -i "$POSTER" -q:v 2 "${POSTER%.png}.jpg"

# GIF: click a timestamp → the video jumps (31.6 s → 37.2 s), 960 px wide, 15 fps.
PALETTE=$(mktemp -t export-palette).png
ffmpeg -y -loglevel error -ss 31.6 -t 5.6 -i "$SRC" -vf "fps=15,scale=960:-1:flags=lanczos,palettegen=stats_mode=diff" "$PALETTE"
ffmpeg -y -loglevel error -ss 31.6 -t 5.6 -i "$SRC" -i "$PALETTE" -lavfi "fps=15,scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=sierra2_4a" "$GIF"
rm -f "$PALETTE"

ls -lh "$NAME-readme.mp4" "$NAME-1080p.mp4" "$NAME-1080p.webm" "${POSTER%.png}.jpg" "$GIF"
