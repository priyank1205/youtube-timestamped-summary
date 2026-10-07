"""Original soundtrack for the second film ("Daylight") — a warm jazz waltz and
paper-and-wood sound design, synthesised from scratch (no samples, no
third-party audio), locked to the shared clock via audio/events2.json.

Music: 3/4 at 90 BPM, so a bar is 2 s and lands on the same bar lines as the
picture. F major: Rhodes comping, upright bass, brushes and ride, a vibraphone
melody. A solo Rhodes opening, a breath on the question, the band arriving on
the stamp, the tune through the demo, a lighter settings section, Rhodes and
pad alone for the small print, the band again for install, and a held F major
ninth for the end page.

    .venv/bin/python audio/compose2.py   →  public/audio/soundtrack2.wav
"""
import json
import math
import os

import numpy as np
from scipy import signal
import soundfile as sf
from pedalboard import Pedalboard, Reverb, Compressor, HighpassFilter, LowShelfFilter, HighShelfFilter, Chorus

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SR = 48000
CUES = json.load(open(os.path.join(HERE, 'events2.json')))
DUR = float(CUES['duration'])
T = CUES['T']
N = int(SR * DUR)
BPM = 90.0
BEAT = 60.0 / BPM          # 0.667 s
BAR = 3 * BEAT             # 2.0 s
NBARS = int(round(DUR / BAR))
rng = np.random.default_rng(11)


def stem():
    return np.zeros((2, N), dtype=np.float64)


STEMS = {k: stem() for k in ['rhodes', 'bass', 'kick', 'brush', 'ride', 'vibes', 'bells', 'pad', 'sfx', 'sfxverb']}


def place(dst, sig, t, gain=1.0, pan=0.0):
    i0 = int(round(t * SR))
    if sig.ndim == 1:
        l = math.cos((pan + 1) * math.pi / 4)
        r = math.sin((pan + 1) * math.pi / 4)
        sig = np.vstack([sig * l * math.sqrt(2), sig * r * math.sqrt(2)])
    n = sig.shape[1]
    a, b = max(0, i0), min(N, i0 + n)
    if b <= a:
        return
    dst[:, a:b] += gain * sig[:, a - i0:b - i0]


def tvec(n):
    return np.arange(n) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def sos(kind, f, order=2):
    if kind == 'bp':
        return signal.butter(order, [f[0] / (SR / 2), min(0.99, f[1] / (SR / 2))], btype='band', output='sos')
    return signal.butter(order, min(0.99, f / (SR / 2)), btype={'lp': 'low', 'hp': 'high'}[kind], output='sos')


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x, axis=-1)


def noise(n, seed=None):
    return np.random.default_rng(seed).standard_normal(n)


def human(t, amt=0.008, seed=0):
    return t + (np.random.default_rng(seed).random() - 0.5) * 2 * amt


# ── Instruments ──────────────────────────────────────────────────────────────────
def rhodes(m, dur, vel=0.7):
    """DX7-style electric piano: a 1:1 FM body plus a short 14:1 tine, with a
    gentle stereo tremolo."""
    f = mtof(m)
    n = int(SR * (dur + 1.2))
    t = tvec(n)
    i1 = (0.6 + 1.6 * vel) * np.exp(-t / 0.28) + 0.18
    body = np.sin(2 * np.pi * f * t + i1 * np.sin(2 * np.pi * f * t))
    tine = np.sin(2 * np.pi * f * t + (0.5 + 0.9 * vel) * np.exp(-t / 0.02) * np.sin(2 * np.pi * 14 * f * t)) * np.exp(-t / 0.06)
    decay = 1.9 * (1.25 - (m - 48) / 80)
    env = np.minimum(1, t / 0.002) * np.exp(-t / decay)
    off = np.clip((t - dur) / 0.14, 0, 1)
    env = env * (1 - off) ** 2
    x = (body * 0.8 + tine * 0.22 * vel) * env * (0.35 + 0.65 * vel)
    trem = 0.12 * np.sin(2 * np.pi * 4.2 * t)
    return np.vstack([x * (1 + trem), x * (1 - trem)]) * 0.5


def vibes(m, dur=1.6, vel=0.8):
    f = mtof(m)
    n = int(SR * (dur + 1.8))
    t = tvec(n)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / 2.4)
         + 0.22 * np.sin(2 * np.pi * 4.0 * f * t) * np.exp(-t / 0.5)
         + 0.07 * np.sin(2 * np.pi * 10.0 * f * t) * np.exp(-t / 0.12))
    mallet = filt(noise(n, int(m * 7)), 'bp', (1500, 6000)) * np.exp(-t / 0.004) * 0.15
    off = np.clip((t - dur) / 0.35, 0, 1)
    motor = 1 - 0.22 * (0.5 + 0.5 * np.sin(2 * np.pi * 5.4 * t))
    return (x * motor + mallet) * np.minimum(1, t / 0.0015) * (1 - off) ** 2 * vel * 0.42


def bass(m, dur, vel=0.8):
    f = mtof(m)
    n = int(SR * (dur + 0.4))
    t = tvec(n)
    bend = 1 + 0.009 * np.exp(-t / 0.04)
    ph = 2 * np.pi * f * np.cumsum(bend) / SR
    x = np.zeros(n)
    for k in range(1, 9):
        x += np.sin(k * ph) * (1 / k ** 1.25) * np.exp(-t / (1.1 / k ** 0.65))
    finger = filt(noise(n, int(m * 13)), 'bp', (250, 1400)) * np.exp(-t / 0.012) * 0.25
    off = np.clip((t - dur) / 0.07, 0, 1)
    y = filt(x * 0.6 + finger, 'lp', 1100) * np.minimum(1, t / 0.003) * (1 - off) * vel
    return y * 0.55


def kick_felt(vel=0.6):
    n = int(SR * 0.3)
    t = tvec(n)
    f = 52 + 40 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.11) * np.minimum(1, t / 0.002) * vel * 0.8


def brush_tap(vel=0.6, seed=0):
    n = int(SR * 0.18)
    t = tvec(n)
    slap = filt(noise(n, seed), 'bp', (1400, 8000)) * np.exp(-t / 0.028)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.035) * 0.35
    return (slap * 0.55 + body) * vel * 0.5


def swish(d, vel=0.5, seed=0):
    """A brush circling the head for one beat: a breathy sweep."""
    n = int(SR * d)
    t = tvec(n)
    k = t / d
    e = np.sin(np.pi * np.clip(k, 0, 1)) ** 1.5
    x = filt(noise(n, seed), 'bp', (1800, 7500))
    return x * e * vel * 0.16


def ride(vel=0.5, long=True, seed=0):
    n = int(SR * (1.4 if long else 0.6))
    t = tvec(n)
    x = noise(n, seed)
    x = filt(x, 'hp', 4500) * 0.6 + filt(x, 'bp', (2800, 3600)) * 0.35
    ping = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(3150, 0.5), (4870, 0.35), (6930, 0.2)]) * np.exp(-t / 0.25)
    env = np.exp(-t / (0.55 if long else 0.22)) * np.minimum(1, t / 0.001)
    return (x * env + ping * 0.08 * np.exp(-t / 0.3)) * vel * 0.18


def pad(notes, dur, vel=0.5):
    n = int(SR * (dur + 1.5))
    t = tvec(n)
    x = np.zeros(n)
    for i, m in enumerate(notes):
        for det in (-0.06, 0.06):
            f = mtof(m + det)
            x += np.sin(2 * np.pi * f * t + i) + 0.25 * np.sin(4 * np.pi * f * t)
    env = np.minimum(1, t / 0.9) * (1 - np.clip((t - dur) / 1.4, 0, 1))
    return filt(x * env, 'lp', 1500) * vel * 0.05


def bell(m, dur=1.2, vel=0.6):
    f = mtof(m)
    n = int(SR * dur)
    t = tvec(n)
    idx = 2.0 * np.exp(-t / 0.08)
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * 3.5 * f * t)) * np.exp(-t / (dur * 0.45))
    return x * np.minimum(1, t / 0.001) * vel * 0.3


# ── Harmony ──────────────────────────────────────────────────────────────────────
CH = {
    'Fmaj9': ([57, 60, 64, 67], 41), 'Dm9': ([53, 57, 60, 64], 38), 'Gm9': ([58, 62, 65, 69], 43), 'C13': ([58, 62, 64, 69], 36),
    'Am7': ([55, 60, 64, 69], 45), 'D7b9': ([54, 60, 63, 69], 38), 'C7b9': ([52, 58, 61, 67], 36), 'Bbmaj9': ([57, 60, 62, 65], 46),
    'C7sus': ([58, 60, 65, 67], 36), 'Fmaj9/A': ([60, 64, 67, 69], 45),
}
A = ['Fmaj9', 'Dm9', 'Gm9', 'C13']
B = ['Am7', 'D7b9', 'Gm9', 'C7b9']


def section(b):
    t0 = b * BAR
    if t0 < 2: return 'intro'
    if t0 < 10: return 'hook'
    if t0 < 14: return 'breath'
    if t0 < 18: return 'arrive'
    if t0 < 46: return 'demo'
    if t0 < 60: return 'settings'
    if t0 < 66: return 'small'
    if t0 < 88: return 'install'
    if t0 < 92: return 'outro'
    return 'end'


bars = []
for b in range(NBARS):
    sec = section(b)
    if sec in ('intro', 'hook'):
        bars.append(['Fmaj9', 'Dm9', 'Gm9', 'C13'][b % 4])
    elif sec == 'breath':
        bars.append('Bbmaj9' if b == 5 else 'C7sus')
    elif sec == 'end':
        bars.append('Fmaj9')
    elif sec == 'small':
        bars.append(['Bbmaj9', 'Am7', 'Gm9'][(b - 30) % 3])
    else:
        k = (b - 7) % 8
        bars.append((A + B)[k])
# land the outro on a V and the end on I
bars[44], bars[45] = 'Gm9', 'C13'

# Rhodes comping
for b, name in enumerate(bars):
    sec = section(b)
    voicing, _ = CH[name]
    t0 = b * BAR
    if sec == 'end':
        if b == 46:
            for i, m in enumerate(voicing + [72]):
                place(STEMS['rhodes'], rhodes(m, 7.2, 0.62), T['endCard'] + i * 0.035, pan=-0.1 + 0.07 * i)
        continue
    if sec in ('intro', 'breath', 'small'):
        # one soft, spread chord per bar
        for i, m in enumerate(voicing):
            place(STEMS['rhodes'], rhodes(m, BAR * 0.95, 0.42 if sec != 'small' else 0.36), human(t0 + i * 0.03, 0.004, b * 10 + i), pan=-0.15 + 0.1 * i)
        continue
    # waltz comp: a short chord on 2 and 3; sometimes on the "and" of 2 instead
    pattern = [1, 2] if b % 4 != 3 else [1.5, 2]
    vel = 0.5 if sec in ('settings',) else 0.58
    for beat in pattern:
        tb = human(t0 + beat * BEAT, 0.01, b * 7 + int(beat * 3))
        for i, m in enumerate(voicing):
            place(STEMS['rhodes'], rhodes(m, BEAT * 0.55, vel * (0.85 + 0.15 * rng.random())), tb + i * 0.006, pan=-0.12 + 0.08 * i)

# Bass: two-feel in the light sections, a walking waltz in the band sections
for b, name in enumerate(bars):
    sec = section(b)
    _, root = CH[name]
    nxt = CH[bars[min(b + 1, NBARS - 1)]][1]
    t0 = b * BAR
    if sec in ('intro',):
        continue
    if sec == 'end':
        if b == 46:
            place(STEMS['bass'], bass(29, 5.0, 0.9), T['endCard'])
        continue
    if sec in ('breath', 'small'):
        place(STEMS['bass'], bass(root, BAR * 0.9, 0.62), t0)
        continue
    fifth = root + 7
    approach = nxt + (1 if (b % 2) else -1)
    for beat, m, v in [(0, root, 0.85), (1, fifth if b % 3 else root + 12, 0.62), (2, approach, 0.66)]:
        place(STEMS['bass'], bass(m, BEAT * 0.9, v), human(t0 + beat * BEAT, 0.006, b * 3 + beat))

# Brushes, felt kick and ride in the band sections
for b in range(NBARS):
    sec = section(b)
    t0 = b * BAR
    if sec not in ('hook', 'arrive', 'demo', 'settings', 'install', 'outro'):
        continue
    lvl = {'hook': 0.55, 'arrive': 0.85, 'demo': 0.75, 'settings': 0.6, 'install': 0.8, 'outro': 0.9}[sec]
    if t0 < 2.55 and sec == 'hook':
        continue
    place(STEMS['kick'], kick_felt(0.55 * lvl), t0)
    for beat in range(3):
        place(STEMS['brush'], swish(BEAT, 0.6 * lvl, seed=b * 3 + beat), t0 + beat * BEAT, pan=-0.15)
        if beat > 0:
            place(STEMS['brush'], brush_tap(0.55 * lvl * (1.0 if beat == 1 else 0.8), seed=100 + b * 3 + beat), human(t0 + beat * BEAT, 0.006, 900 + b * 3 + beat), pan=0.1)
    # jazz waltz ride: 1, 2&, 3
    for beat, long, v in [(0, True, 1.0), (1.66, False, 0.6), (2, True, 0.8)]:
        place(STEMS['ride'], ride(v * lvl, long, seed=b * 5 + int(beat * 10)), human(t0 + beat * BEAT, 0.005, 500 + b * 5 + int(beat * 10)), pan=0.35)

# Pad under the question and the small print
for b, name in enumerate(bars):
    sec = section(b)
    if sec in ('breath', 'small'):
        place(STEMS['pad'], pad([m - 12 for m in CH[name][0]] + [CH[name][0][-1]], BAR, 0.8), b * BAR)

# The tune (vibraphone): eight bars, in beats from the phrase start.
TUNE = [
    (0, 72, 2), (2, 69, 1),            # F:  C5 . A4
    (3, 76, 1), (4, 74, 1), (5, 72, 1),  # Dm: E5 D5 C5
    (6, 70, 1), (7, 74, 1), (8, 77, 1),  # Gm: Bb4 D5 F5
    (9, 76, 3),                          # C:  E5 ———
    (12, 81, 2), (14, 79, 1),           # Am: A5 . G5
    (15, 78, 1), (16, 76, 1), (17, 74, 1),  # D7: F#5 E5 D5
    (18, 72, 1), (19, 74, 1), (20, 77, 1),  # Gm: C5 D5 F5
    (21, 76, 2), (23, 79, 1),           # C7: E5 . G5
]


def play_tune(at, vel=0.8, octave=0, short=False):
    for beat, m, length in TUNE:
        if short and beat >= 12:
            break
        place(STEMS['vibes'], vibes(m + 12 * octave, length * BEAT * 0.95, vel * (0.9 + 0.1 * rng.random())), human(at + beat * BEAT, 0.008, int(at * 100) + beat), pan=0.25)


play_tune(14.0, 0.75, short=True)          # the arrival: just the first half
for start in (18.0, 34.0):                 # the demo
    play_tune(start, 0.7)
play_tune(50.0, 0.5, octave=1, short=True)  # settings, up an octave, softer
for start in (70.0,):                      # install
    play_tune(start, 0.62)
play_tune(84.0, 0.55, short=True)

# ── Sound design: paper, wood and pen ───────────────────────────────────────────────
def s_key(v=1.0, seed=0):
    n = int(SR * 0.05)
    t = tvec(n)
    x = filt(noise(n, seed), 'bp', (1600, 5500)) * np.exp(-t / 0.0035)
    thock = np.sin(2 * np.pi * (160 + seed % 40) * t) * np.exp(-t / 0.012) * 0.6
    return (x + thock) * v * 0.22


def s_tock(v=1.0, seed=0):
    """A soft wooden click: the pointer's press and release."""
    n = int(SR * 0.12)
    t = tvec(n)
    press = (np.sin(2 * np.pi * 980 * t) * np.exp(-t / 0.012) + 0.4 * np.sin(2 * np.pi * 2350 * t) * np.exp(-t / 0.004)
             + filt(noise(n, 60 + seed), 'bp', (2000, 6000)) * np.exp(-t / 0.0015) * 0.5)
    rt = np.clip(t - 0.07, 0, None)
    rel = (np.sin(2 * np.pi * 1150 * rt) * np.exp(-rt / 0.006)) * (t >= 0.07) * 0.35
    return (press + rel) * v * 0.3


def s_marimba(m, v=0.6, dur=0.5):
    f = mtof(m)
    n = int(SR * dur)
    t = tvec(n)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.18) + 0.3 * np.sin(2 * np.pi * 3.99 * f * t) * np.exp(-t / 0.03)
    return x * np.minimum(1, t / 0.0008) * v * 0.3


DETENT = [77, 79, 81, 84, 86, 89, 91, 93, 96, 98, 101]


def s_slide(d=0.8, v=0.5, seed=0):
    """Paper sliding over paper."""
    n = int(SR * d)
    t = tvec(n)
    k = t / d
    e = np.sin(np.pi * np.clip(k, 0, 1)) ** 1.2
    x = filt(noise(n, 300 + seed), 'bp', (160, 2400))
    grain = 1 + 0.35 * filt(noise(n, 301 + seed), 'lp', 30)
    st = np.vstack([x * grain * (1 - 0.4 * k), x * grain * (0.6 + 0.4 * k)])
    return st * e * v * 0.5


def s_scribble(d=0.5, v=0.5, seed=0):
    """A felt-tip pen on paper: a hiss that comes and goes with each stroke."""
    n = int(SR * d)
    t = tvec(n)
    x = filt(noise(n, 700 + seed), 'bp', (1800, 6500))
    strokes = np.clip(0.5 + 0.5 * np.sin(2 * np.pi * (11 + 6 * np.random.default_rng(seed).random()) * t + 2 * filt(noise(n, 701 + seed), 'lp', 8)), 0, 1)
    e = np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.06)
    return x * strokes * e * v * 0.14


def s_tab():
    n = int(SR * 0.08)
    t = tvec(n)
    return (filt(noise(n, 911), 'bp', (900, 4200)) * np.exp(-t / 0.006) + np.sin(2 * np.pi * 220 * t) * np.exp(-t / 0.015) * 0.4) * 0.22


def s_stamp(v=1.0):
    n = int(SR * 0.9)
    t = tvec(n)
    thump = np.sin(2 * np.pi * np.cumsum(62 + 45 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.16)
    pat = filt(noise(n, 77), 'lp', 1200) * np.exp(-t / 0.03) * 0.6
    return np.tanh(1.2 * (thump + pat)) * v * 0.6


def s_working(d):
    out = np.zeros(int(SR * (d + 1.0)))
    notes = [65, 69, 72, 76, 77, 81, 84, 88]
    t = 0.0
    i = 0
    while t < d - 0.05:
        x = bell(notes[i % len(notes)] + 12, 0.7, 0.35)
        a = int(t * SR)
        out[a:a + len(x)] += x[:max(0, min(len(x), len(out) - a))]
        t += 0.16
        i += 1
    return out * 0.5


def s_arp(notes, step=0.07, v=0.6):
    out = np.zeros(int(SR * (len(notes) * step + 2.2)))
    for i, m in enumerate(notes):
        x = vibes(m, 1.4, v)
        a = int(i * step * SR)
        out[a:a + len(x)] += x[:len(out) - a]
    return out


def s_unzip():
    n = int(SR * 0.45)
    out = np.zeros(n)
    t = 0.0
    k = 0
    while t < 0.36:
        b = filt(noise(int(SR * 0.012), 90 + k), 'bp', (1200, 6000)) * np.exp(-tvec(int(SR * 0.012)) / 0.003)
        i0 = int(t * SR)
        out[i0:i0 + len(b)] += b * (0.4 + 0.6 * t / 0.36)
        t += 0.035 * (1 - t / 0.5)
        k += 1
    return out * 0.25


def s_land():
    n = int(SR * 0.3)
    t = tvec(n)
    return (np.sin(2 * np.pi * np.cumsum(90 + 60 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.08) + filt(noise(n, 5), 'lp', 900) * np.exp(-t / 0.02) * 0.3) * 0.35


for e in CUES['events']:
    k, t, v = e['kind'], e['t'], e.get('v', 1.0)
    d, n_ = e.get('d', 0.6), e.get('n', 0)
    S, V = STEMS['sfx'], STEMS['sfxverb']
    if k == 'key':
        place(S, s_key(v, seed=int(t * 1000) % 400), t, pan=rng.uniform(-0.15, 0.15))
    elif k == 'enter':
        place(S, s_key(1.3, seed=5), t)
    elif k == 'paste':
        place(S, s_key(1.0, 17), t); place(S, s_key(0.9, 18), t + 0.05)
    elif k == 'click':
        place(S, s_tock(0.9, int(t * 10) % 7), t, pan=0.05)
    elif k == 'release':
        place(S, s_tock(0.45, 3), t)
    elif k == 'tick':
        place(V, s_marimba(84 + 5 * n_, 0.5 * v), t)
    elif k == 'detent':
        x = s_marimba(DETENT[n_ % len(DETENT)], 0.32 + 0.3 * v, 0.35)
        place(S, x * 0.75, t, pan=(e.get('d', 0.5) - 0.5) * 0.9)
        place(V, x * 0.25, t)
    elif k == 'slide':
        place(S, s_slide(d, v, seed=int(t) % 9), t - d * 0.3)
    elif k == 'scribble':
        place(S, s_scribble(d, v, seed=int(t * 10) % 50), t, pan=rng.uniform(-0.2, 0.2))
    elif k == 'tab':
        place(S, s_tab(), t)
    elif k == 'stamp':
        place(S, s_stamp(v), t)
        place(V, s_marimba(65, 0.3, 0.8), t + 0.01)
    elif k == 'working':
        place(V, s_working(d), t)
    elif k == 'bloom':
        place(V, s_arp([65, 69, 72, 76, 79], 0.06, 0.5 * v), t)
    elif k == 'land':
        place(S, s_land(), t)
    elif k == 'chime':
        place(V, vibes([81, 84, 88, 77, 76][n_ % 5], 1.2, 0.45 * v), t)
    elif k == 'unzip':
        place(S, s_unzip(), t)
    elif k == 'sheet':
        place(S, s_slide(0.35, 0.35, seed=4), t - 0.05)
    elif k == 'success':
        place(V, s_arp([72, 76, 79, 84], 0.07, 0.55), t)
    elif k == 'celebrate':
        place(V, s_arp([77, 81, 84, 88, 89, 93], 0.06, 0.55), t)
        for i, m in enumerate([96, 100, 103, 108]):
            place(V, bell(m, 0.9, 0.25), t + 0.25 + i * 0.09, pan=-0.4 + 0.25 * i)

# end page: a kalimba-like flourish as the stamp lands
for i, m in enumerate([89, 93, 96, 100, 101, 105]):
    place(STEMS['bells'], bell(m, 1.6, 0.32), T['endCard'] + 0.15 + i * 0.07, pan=-0.5 + 0.2 * i)

# ── Mix ─────────────────────────────────────────────────────────────────────────────
import pyloudnorm as pyln
METER = pyln.Meter(SR)


def lufs(x):
    try:
        v = METER.integrated_loudness(x.T)
        return v if np.isfinite(v) else -70.0
    except Exception:
        return -70.0


def to_lufs(x, target):
    cur = lufs(x)
    return x if cur < -69 else x * 10 ** ((target - cur) / 20)


def fx(x, board):
    return board(x.astype(np.float32), SR).astype(np.float64)


rh = fx(STEMS['rhodes'], Pedalboard([Chorus(rate_hz=0.6, depth=0.12, mix=0.25)]))
TARGET = {'rhodes': -20.5, 'bass': -21.0, 'kick': -30.0, 'brush': -30.5, 'ride': -31.0, 'vibes': -21.5, 'bells': -27.0, 'pad': -27.0}
parts = {'rhodes': rh, 'bass': STEMS['bass'], 'kick': STEMS['kick'], 'brush': STEMS['brush'], 'ride': STEMS['ride'],
         'vibes': STEMS['vibes'], 'bells': STEMS['bells'], 'pad': STEMS['pad']}
for k_, v_ in parts.items():
    parts[k_] = to_lufs(v_, TARGET[k_])
    print(f'  {k_:7s} → {TARGET[k_]}')

room = Pedalboard([Reverb(room_size=0.62, damping=0.55, wet_level=1.0, dry_level=0.0, width=0.95)])
send = parts['rhodes'] * 0.3 + parts['vibes'] * 0.45 + parts['brush'] * 0.25 + parts['ride'] * 0.3 + parts['bells'] * 0.5 + parts['pad'] * 0.4 + parts['bass'] * 0.08
music = sum(parts.values()) + fx(send, room) * 0.45
# warm it up: a touch of tape-like saturation and a gentle tilt
music = to_lufs(music, -20.0)
print('  music peak before saturation', round(float(np.abs(music).max()), 3))
music = np.tanh(music * 1.4) / 1.4
music = fx(music, Pedalboard([HighpassFilter(35), LowShelfFilter(cutoff_frequency_hz=120, gain_db=1.0), HighShelfFilter(cutoff_frequency_hz=9000, gain_db=-1.5)]))

AUTO = [(0.0, -7), (2.4, -6), (2.6, -4), (9.9, -4), (10.3, -8), (13.8, -7), (14.0, 0), (17.8, -1), (18.2, -3.5), (45.8, -3.5),
        (46.2, -4.5), (59.8, -4.5), (60.2, -6), (65.8, -6), (66.0, -3), (87.8, -3), (88.2, -1), (92.0, 0), (100.0, 0)]
gain_db = np.interp(tvec(N), np.array([a for a, _ in AUTO]), np.array([g for _, g in AUTO]))
music = music * 10 ** (gain_db / 20)

sfx_room = Pedalboard([Reverb(room_size=0.4, damping=0.6, wet_level=1.0, dry_level=0.0, width=0.8)])
sfx = STEMS['sfx'] + STEMS['sfxverb'] + fx(STEMS['sfxverb'], sfx_room) * 0.35
sfx = to_lufs(sfx, -24.0)

mix = music + sfx
fade = np.ones(N)
fade[:int(0.3 * SR)] = np.linspace(0, 1, int(0.3 * SR))
fo = int(1.4 * SR)
fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
mix = mix * fade

from scipy.signal import resample_poly
from scipy.ndimage import minimum_filter1d, uniform_filter1d


def true_peak(x):
    return float(np.max(np.abs(resample_poly(x, 4, 1, axis=1))))


def tp_limit(x, ceiling_db=-1.2, window_ms=8.0):
    ceil = 10 ** (ceiling_db / 20)
    up = np.abs(resample_poly(x, 4, 1, axis=1)).max(axis=0)
    pk = up[:x.shape[1] * 4].reshape(-1, 4).max(axis=1)
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    w = max(3, int(window_ms / 1000 * SR) | 1)
    g = minimum_filter1d(g, size=w, mode='nearest')
    g = uniform_filter1d(g, size=w, mode='nearest')
    return x * g


mix = fx(mix, Pedalboard([Compressor(threshold_db=-20, ratio=1.5, attack_ms=25, release_ms=250)]))
mix = to_lufs(mix, -14.0)
for _ in range(3):
    if true_peak(mix) <= 10 ** (-1.0 / 20):
        break
    mix = tp_limit(mix, -1.2)
print('  final true peak dBTP', round(20 * np.log10(true_peak(mix)), 2))

dst = os.path.join(ROOT, 'public', 'audio', 'soundtrack2.wav')
sf.write(dst, mix.T.astype(np.float32), SR, subtype='PCM_24')
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)
sf.write(os.path.join(HERE, 'stems', 'music2.wav'), music.T.astype(np.float32), SR, subtype='PCM_24')
sf.write(os.path.join(HERE, 'stems', 'sfx2.wav'), sfx.T.astype(np.float32), SR, subtype='PCM_24')
print('wrote', dst, f'{DUR:.1f}s', 'LUFS', round(lufs(mix), 2))
