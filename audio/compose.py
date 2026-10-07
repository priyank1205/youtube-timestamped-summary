"""Original soundtrack for the Timestamped Summary film — music and sound design,
synthesised from scratch (no samples, no third-party audio), locked to the same
clock as the picture via audio/events.json.

Music: 120 BPM, F major. A clock-tick intro over Dm9 while the problem is set
up, a build into a drop on the logo reveal, a pluck hook over Bb–C–Am–Dm for
the demo, a lighter groove for settings, a breakdown for the privacy beat, the
groove again for install, and a resolution to F for the end card.

    .venv/bin/python audio/compose.py   →  public/audio/soundtrack.wav
"""
import json
import math
import os

import numpy as np
from scipy import signal
import soundfile as sf
from pedalboard import Pedalboard, Reverb, Compressor, Limiter, HighpassFilter, LowShelfFilter, HighShelfFilter, Chorus

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SR = 48000
CUES = json.load(open(os.path.join(HERE, 'events.json')))
DUR = float(CUES['duration'])
T = CUES['T']
N = int(SR * DUR)
BEAT = 60.0 / CUES['bpm']
BAR = 4 * BEAT
S16 = BEAT / 4
rng = np.random.default_rng(7)


# ── buffers ──────────────────────────────────────────────────────────────────────
def stem():
    return np.zeros((2, N), dtype=np.float64)


STEMS = {k: stem() for k in ['kick', 'clap', 'hats', 'perc', 'bass', 'pad', 'lead', 'arp', 'bells', 'fx', 'sfx', 'sfxverb']}


def place(dst, sig, t, gain=1.0, pan=0.0):
    """Add a mono (n,) or stereo (2, n) signal at time t (seconds)."""
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


# ── DSP helpers ──────────────────────────────────────────────────────────────────
def tvec(n):
    return np.arange(n) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def sos(kind, f, order=2, q=None):
    nyq = SR / 2
    if kind == 'bp':
        lo, hi = f
        return signal.butter(order, [max(10, lo) / nyq, min(hi, nyq * 0.95) / nyq], btype='band', output='sos')
    return signal.butter(order, min(f, nyq * 0.95) / nyq, btype={'lp': 'low', 'hp': 'high'}[kind], output='sos')


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x, axis=-1)


def noise(n, seed=None):
    g = np.random.default_rng(seed) if seed is not None else rng
    return g.uniform(-1, 1, n)


def saw(freq, n, phase=0.0):
    """Band-limited sawtooth (PolyBLEP)."""
    dt = freq / SR
    ph = (phase + dt * np.arange(n)) % 1.0
    y = 2.0 * ph - 1.0
    m = ph < dt
    t1 = ph[m] / dt
    y[m] -= t1 + t1 - t1 * t1 - 1.0
    m = ph > 1.0 - dt
    t2 = (ph[m] - 1.0) / dt
    y[m] -= t2 * t2 + t2 + t2 + 1.0
    return y


def env_adsr(n, a, d, s, r_start, r):
    """Attack/decay/sustain, then release beginning at r_start seconds."""
    t = tvec(n)
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = np.clip(1 - (t - r_start) / max(r, 1e-6), 0, 1)
    return e * np.where(t > r_start, rel, 1.0)


def exp_env(n, decay, attack=0.002):
    t = tvec(n)
    return np.minimum(1, t / attack) * np.exp(-t / decay)


def fm_bell(freq, dur, ratio=3.5, index=2.2, decay=1.2, idx_decay=0.25):
    n = int(SR * dur)
    t = tvec(n)
    mod = np.sin(2 * np.pi * freq * ratio * t) * index * np.exp(-t / idx_decay)
    return np.sin(2 * np.pi * freq * t + mod) * exp_env(n, decay, 0.003)


def sweep_noise(n, f_from, f_to, seed=None, q=1.4, shape=None):
    """Noise through a band that sweeps from f_from to f_to (log), block-wise."""
    x = noise(n, seed)
    out = np.zeros(n)
    blk = 512
    zi = None
    for i in range(0, n, blk):
        k = i / max(1, n - 1)
        if shape is not None:
            k = shape(k)
        fc = f_from * (f_to / f_from) ** k
        bw = fc / q
        s_ = sos('bp', (fc - bw / 2, fc + bw / 2), 2)
        if zi is None or zi.shape != (s_.shape[0], 2):
            zi = np.zeros((s_.shape[0], 2))
        y, zi = signal.sosfilt(s_, x[i:i + blk], zi=zi)
        out[i:i + blk] = y
    return out


def stereo_width(x, ms=0.012, amount=0.5):
    """Haas-ish widening for mono material."""
    d = int(ms * SR)
    r = np.concatenate([np.zeros(d), x[:-d]])
    return np.vstack([x, (1 - amount) * x + amount * r])


# ── Drums ────────────────────────────────────────────────────────────────────────
def kick(vel=1.0):
    n = int(SR * 0.45)
    t = tvec(n)
    f = 46 + (150 - 46) * np.exp(-t / 0.032)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.30) * np.minimum(1, t / 0.0015)
    click = filt(noise(n, 3), 'hp', 2500) * np.exp(-t / 0.004) * 0.35
    return np.tanh(1.6 * (body + click)) * vel * 0.9


def clap(vel=1.0, seed=11):
    n = int(SR * 0.35)
    t = tvec(n)
    x = filt(noise(n, seed), 'bp', (850, 3200), 2)
    e = np.zeros(n)
    for off in (0.0, 0.0095, 0.019):
        e += np.where(t >= off, np.exp(-(t - off) / 0.007), 0)
    e += np.where(t >= 0.028, 0.75 * np.exp(-(t - 0.028) / 0.11), 0)
    return x * e * vel * 0.7


def hat(vel=1.0, open_=False, seed=None):
    n = int(SR * (0.35 if open_ else 0.08))
    x = filt(noise(n, seed), 'hp', 7200, 2)
    x = x + 0.5 * filt(noise(n, (seed or 0) + 1), 'bp', (9000, 14000), 2)
    return x * exp_env(n, 0.14 if open_ else 0.022, 0.0008) * vel * 0.35


def snare_hit(vel=1.0, seed=None):
    n = int(SR * 0.18)
    t = tvec(n)
    x = filt(noise(n, seed), 'bp', (1200, 6000), 2) * np.exp(-t / 0.06)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04) * 0.6
    return (x + tone) * vel * 0.45


def crash(vel=1.0, dur=2.6, seed=5):
    n = int(SR * dur)
    t = tvec(n)
    x = filt(noise(n, seed), 'hp', 3500, 2) + 0.4 * filt(noise(n, seed + 9), 'bp', (5000, 9000), 2)
    return stereo_width(x * np.exp(-t / 0.9) * np.minimum(1, t / 0.002) * vel * 0.35, 0.017, 0.8)


def tick_wood(high=True, vel=1.0):
    n = int(SR * 0.06)
    t = tvec(n)
    f = 2100 if high else 1600
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012) + 0.4 * filt(noise(n, 21), 'bp', (2500, 6000), 2) * np.exp(-t / 0.004)
    return x * vel * 0.5


# ── Pitched instruments ─────────────────────────────────────────────────────────
def bass_note(m, dur, vel=1.0):
    n = int(SR * (dur + 0.08))
    f = mtof(m)
    t = tvec(n)
    sub = np.sin(2 * np.pi * f * t) * 0.8
    body = filt(saw(f, n), 'lp', 700, 2) * 0.55
    e = env_adsr(n, 0.004, 0.14, 0.6, dur, 0.05)
    return np.tanh(1.2 * (sub + body)) * e * vel


def pad_chord(notes, dur, bright=2200, attack=0.05, release=0.9, vel=1.0, seed=0):
    n = int(SR * (dur + release))
    out = np.zeros((2, n))
    for j, m in enumerate(notes):
        f = mtof(m)
        for k, det in enumerate((-0.11, 0.0, 0.09)):
            ff = f * 2 ** (det / 12)
            v = saw(ff, n, phase=(seed * 0.37 + j * 0.21 + k * 0.33) % 1)
            pan = (-0.6, 0.0, 0.6)[k]
            l = math.cos((pan + 1) * math.pi / 4)
            r = math.sin((pan + 1) * math.pi / 4)
            out[0] += v * l
            out[1] += v * r
    out = filt(out, 'lp', bright, 2)
    e = env_adsr(n, attack, 0.6, 0.85, dur, release)
    return out * e * vel * 0.09


def pluck(m, dur, vel=1.0):
    """Bright mallet-pluck: a decaying saw through a closing filter, plus an FM tine."""
    n = int(SR * (dur + 0.6))
    f = mtof(m)
    t = tvec(n)
    raw = saw(f, n) * 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * f * t)) * 0.5
    bright = filt(raw, 'lp', 5200, 2)
    dark = filt(raw, 'lp', 900, 2)
    k = np.exp(-t / 0.07)
    tone = bright * k + dark * (1 - k)
    tine = fm_bell(f * 2, n / SR, ratio=1.0, index=1.2, decay=0.35, idx_decay=0.05)
    e = exp_env(n, 0.42, 0.002) * np.where(t > dur, np.clip(1 - (t - dur) / 0.25, 0, 1), 1)
    return (tone * 0.55 + tine * 0.45) * e * vel * 0.32


def bell(m, dur=1.6, vel=1.0):
    return fm_bell(mtof(m), dur, ratio=3.5, index=1.6, decay=dur * 0.45, idx_decay=0.18) * vel * 0.22


# ── Harmony and form ─────────────────────────────────────────────────────────────
CH = {
    'Dm9': ([65, 69, 72, 76], 38),
    'Bb': ([62, 65, 69, 72], 34),
    'C': ([64, 67, 69, 74], 36),
    'Am': ([64, 67, 71, 72], 33),
    'Gm9': ([65, 69, 70, 74], 31),
    'A7s': ([62, 64, 67, 74], 33),
    'A7': ([61, 64, 67, 73], 33),
    'F': ([65, 69, 72, 79], 41),
}
LOOP = ['Bb', 'C', 'Am', 'Dm9']
NBARS = int(DUR / BAR)
bars = ['Dm9'] * NBARS
bars[0:3] = ['Dm9', 'Dm9', 'Dm9']
bars[3], bars[4], bars[5], bars[6] = 'Bb', 'C', 'Gm9', 'A7s'
for b in range(7, 30):
    bars[b] = LOOP[(b - 7) % 4]
bars[30], bars[31], bars[32] = 'Gm9', 'Bb', 'C'
for b in range(33, 44):
    bars[b] = LOOP[(b - 33) % 4]
bars[44], bars[45] = 'Bb', 'C'
for b in range(46, NBARS):
    bars[b] = 'F'


def section(b):
    t0 = b * BAR
    if t0 < 6: return 'intro'
    if t0 < 10: return 'scrub'
    if t0 < 14: return 'build'
    if t0 < 18: return 'drop'
    if t0 < 46: return 'demo'
    if t0 < 60: return 'settings'
    if t0 < 64: return 'trust'
    if t0 < 66: return 'rise'
    if t0 < 88: return 'install'
    if t0 < 92: return 'outro'
    return 'end'


KICKS = []

# Drums
for b in range(NBARS):
    sec = section(b)
    t0 = b * BAR
    for q in range(4):
        tb = t0 + q * BEAT
        if sec == 'intro' and t0 >= 2.0 and q in (0, 2):
            place(STEMS['kick'], kick(0.55), tb); KICKS.append((tb, 0.4))
        elif sec in ('scrub',):
            place(STEMS['kick'], kick(0.8), tb); KICKS.append((tb, 0.6))
        elif sec in ('drop', 'demo', 'install', 'outro'):
            place(STEMS['kick'], kick(1.0), tb); KICKS.append((tb, 1.0))
        elif sec == 'settings':
            place(STEMS['kick'], kick(0.85 if q in (0, 2) else 0.6), tb); KICKS.append((tb, 0.8))
        # backbeat
        if q in (1, 3) and sec in ('scrub', 'drop', 'demo', 'settings', 'install', 'outro'):
            place(STEMS['clap'], clap(0.95 if sec != 'settings' else 0.75, seed=11 + q), tb, pan=0.05)
        # hats
        for s in range(4):
            th = tb + s * S16
            v = [0.85, 0.35, 0.6, 0.38][s]
            if sec in ('scrub', 'drop', 'demo', 'install', 'outro'):
                place(STEMS['hats'], hat(v * (0.9 if sec != 'demo' else 0.75), seed=int(th * 1000) % 997), th, pan=0.25)
            elif sec in ('settings', 'trust') and s == 2:
                place(STEMS['hats'], hat(0.5, seed=int(th * 1000) % 997), th, pan=0.25)
        if sec in ('drop', 'install', 'outro') and True:
            place(STEMS['hats'], hat(0.55, open_=True, seed=int(tb * 100) % 991), tb + BEAT / 2, pan=-0.2)
    # clock ticks through the problem — time running out
    if sec in ('intro', 'scrub', 'build'):
        for q in range(4):
            place(STEMS['perc'], tick_wood(q % 2 == 0, 0.9 if sec == 'intro' else 0.7), t0 + q * BEAT, pan=0.35 if q % 2 else -0.35)

# Build-up: snare roll accelerating into the drop, and into install and the end card.
def roll(t_from, t_to, gain=1.0):
    t = t_from
    while t < t_to - 0.01:
        k = (t - t_from) / (t_to - t_from)
        step = BEAT / 2 if k < 0.4 else BEAT / 4 if k < 0.75 else BEAT / 8
        place(STEMS['perc'], snare_hit(gain * (0.35 + 0.65 * k), seed=int(t * 977) % 1000), t, pan=0.1)
        t += step


roll(12.0, T['drop'] - 0.25, 0.9)
roll(64.0, 66.0, 0.7)
roll(90.0, T['endCard'] - 0.12, 0.85)

# Crashes on the big downbeats
for tc, v in [(T['drop'], 1.0), (18.0, 0.5), (46.0, 0.45), (66.0, 0.8), (T['allSet'], 0.55), (T['endCard'], 1.0)]:
    place(STEMS['fx'], crash(v, 3.0), tc)

# Bass: off-beat eighths (house), root of the bar's chord
for b in range(NBARS):
    sec = section(b)
    if sec in ('intro',) and b >= 1:
        place(STEMS['bass'], bass_note(CH[bars[b]][1], BAR - 0.05, 0.45), b * BAR)
        continue
    if sec in ('build', 'trust', 'end', 'intro'):
        continue
    root = CH[bars[b]][1]
    for q in range(4):
        tb = b * BAR + q * BEAT + BEAT / 2
        m = root + (12 if q == 3 and sec in ('drop', 'install') else 0)
        place(STEMS['bass'], bass_note(m, BEAT / 2 - 0.02, 0.9 if sec != 'settings' else 0.75), tb)
    if sec in ('demo', 'install', 'drop') and b % 2 == 1:
        place(STEMS['bass'], bass_note(root + 7, S16 * 0.9, 0.6), b * BAR + BAR - S16)

# Final F: low root under the end card
place(STEMS['bass'], bass_note(29, 5.5, 0.9), T['endCard'])

# Pads
for b in range(NBARS):
    sec = section(b)
    notes, _ = CH[bars[b]]
    if sec == 'end' and b > 46:
        continue
    bright = {'intro': 900, 'scrub': 1500, 'build': 1200, 'drop': 3200, 'demo': 2300, 'settings': 2600,
              'trust': 1600, 'rise': 2000, 'install': 3000, 'outro': 3400, 'end': 3800}[sec]
    att = 0.6 if sec in ('intro', 'trust', 'build') else 0.03
    dur = BAR if sec != 'end' else 7.0
    rel = 1.2 if sec != 'end' else 1.0
    if bars[b] == 'A7s':  # sus4 resolving to the dominant on beat 3
        place(STEMS['pad'], pad_chord(CH['A7s'][0], BAR / 2, bright, att, 0.2, seed=b), b * BAR)
        place(STEMS['pad'], pad_chord(CH['A7'][0], BAR / 2, bright, 0.02, 0.8, seed=b + 1), b * BAR + BAR / 2)
        continue
    place(STEMS['pad'], pad_chord(notes, dur, bright, att, rel, vel=1.25 if sec == 'end' else 1.0, seed=b), b * BAR)

# Lead: the hook (16ths, F major pentatonic), and an answer phrase.
HOOK_A = [  # bar over Bb, then over C
    [(0, 74, 2), (3, 77, 1), (4, 81, 2), (6, 79, 2), (8, 77, 3), (11, 74, 1), (12, 72, 4)],
    [(0, 76, 2), (3, 79, 1), (4, 81, 2), (6, 84, 2), (8, 81, 2), (10, 79, 2), (12, 76, 2), (14, 74, 2)],
]
HOOK_B = [  # over Am, then Dm
    [(0, 72, 2), (2, 76, 2), (4, 79, 4), (8, 76, 2), (10, 72, 2), (12, 74, 4)],
    [(0, 77, 2), (3, 76, 1), (4, 74, 2), (6, 72, 2), (8, 69, 6)],
]


def play_phrase(bar_index, phrase, vel=1.0, octave=0):
    for s, m, ln in phrase:
        t0 = bar_index * BAR + s * S16
        place(STEMS['lead'], pluck(m + 12 * octave, ln * S16 * 0.92, vel), t0, pan=-0.1)


def hook(at_bar, vel=1.0, answer=True):
    play_phrase(at_bar, HOOK_A[0], vel)
    play_phrase(at_bar + 1, HOOK_A[1], vel)
    if answer:
        play_phrase(at_bar + 2, HOOK_B[0], vel * 0.95)
        play_phrase(at_bar + 3, HOOK_B[1], vel * 0.95)


hook(7, 1.0, answer=False)   # the reveal: 14–18 s
hook(15, 0.55)               # summary has landed: 30–38 s, under the demo
hook(19, 0.75, answer=False) # "Answered in 20 seconds": 38–42 s
hook(33, 0.8)                # install: 66–74 s
hook(37, 0.7)                # 74–82 s
hook(41, 0.85, answer=False) # 82–86 s, the celebration
hook(44, 0.9, answer=False)  # outro: 88–92 s

# Arpeggio: running sixteenths of chord tones for drive (demo after the summary, install, outro)
for b in range(NBARS):
    sec = section(b)
    if not ((sec == 'demo' and b * BAR >= 28) or sec in ('install', 'outro', 'settings')):
        continue
    notes = CH[bars[b]][0]
    seq = [notes[0], notes[1], notes[2], notes[3], notes[2] + 12, notes[3], notes[1] + 12, notes[2]]
    for s in range(16):
        m = seq[s % len(seq)] + 12
        v = (0.5 if s % 4 == 0 else 0.3) * (0.7 if sec == 'settings' else 0.85)
        place(STEMS['arp'], bell(m, 0.5, v), b * BAR + s * S16, pan=0.45 if s % 2 else -0.45)

# Trust: slow bell chords over the breakdown
for b in (30, 31, 32):
    for j, m in enumerate(CH[bars[b]][0]):
        place(STEMS['bells'], bell(m + 12, 3.0, 0.55), b * BAR + j * 0.09, pan=-0.3 + 0.2 * j)

# End: the resolving chord, rolled
for j, m in enumerate([53, 60, 65, 69, 72, 79, 84]):
    place(STEMS['bells'], bell(m, 5.0, 0.7), T['endCard'] + j * 0.05, pan=-0.45 + 0.15 * j)

# Riser and reverse swell into the drop; a smaller one into install
def riser(dur, gain=1.0, f0=300, f1=7000):
    n = int(SR * dur)
    t = tvec(n)
    x = sweep_noise(n, f0, f1, seed=31, q=2.5, shape=lambda k: k ** 1.6)
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (3 * (t / dur) ** 1.8)) / SR) * 0.25
    e = (t / dur) ** 2.2
    return stereo_width((x * 0.8 + tone) * e * gain * 0.5, 0.013, 0.7)


place(STEMS['fx'], riser(T['drop'] - 0.15 - 10.4, 1.0), 10.4)
place(STEMS['fx'], riser(1.9, 0.6, 500, 6000), 64.1)
place(STEMS['fx'], riser(1.9, 0.75, 500, 7000), 90.1)


# ── Sound design ─────────────────────────────────────────────────────────────────
def s_key(v=1.0, seed=0):
    n = int(SR * 0.05)
    t = tvec(n)
    x = filt(noise(n, seed), 'bp', (1800, 6500), 2) * np.exp(-t / 0.004)
    thock = np.sin(2 * np.pi * (170 + seed % 40) * t) * np.exp(-t / 0.012) * 0.5
    return (x + thock) * v * 0.32


def s_click(v=1.0):
    n = int(SR * 0.12)
    t = tvec(n)
    press = filt(noise(n, 77), 'bp', (1500, 7000), 2) * np.exp(-t / 0.0025) + np.sin(2 * np.pi * 2300 * t) * np.exp(-t / 0.006) * 0.25
    rel_t = np.clip(t - 0.065, 0, None)
    rel = (filt(noise(n, 78), 'bp', (2000, 8000), 2) * np.exp(-rel_t / 0.002)) * (t >= 0.065) * 0.45
    return (press + rel) * v * 0.42


def s_pop(v=1.0, down=False):
    n = int(SR * 0.16)
    t = tvec(n)
    f0, f1 = (950, 620) if down else (620, 1050)
    f = f1 + (f0 - f1) * np.exp(-t / 0.035)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * exp_env(n, 0.045, 0.003)
    return x * v * 0.35


def s_whoosh(d=0.8, v=1.0, seed=0):
    n = int(SR * d)
    t = tvec(n)
    k = t / d
    x = sweep_noise(n, 250, 2600, seed=40 + seed, q=1.2, shape=lambda u: math.sin(u * math.pi) ** 0.8)
    e = np.sin(np.clip(k, 0, 1) * np.pi) ** 1.6
    st = np.vstack([x * (1 - 0.6 * k), x * (0.4 + 0.6 * k)])
    return st * e * v * 0.55


def s_comb(direction=1):
    out = np.zeros(int(SR * 0.6))
    for i in range(9):
        m = (84 + [0, 2, 4, 7, 9, 12, 14, 16, 19][i]) if direction > 0 else (103 - [0, 3, 5, 7, 10, 12, 15, 17, 19][i])
        b = fm_bell(mtof(m), 0.25, ratio=2.0, index=0.8, decay=0.06, idx_decay=0.03) * (0.5 + 0.06 * i)
        i0 = int(i * 0.022 * SR)
        out[i0:i0 + len(b)] += b[:len(out) - i0]
    return out * 0.16


def s_working(d):
    n = int(SR * d)
    t = tvec(n)
    bed = filt(noise(n, 61), 'bp', (500, 2500), 2) * (0.5 + 0.5 * np.sin(2 * np.pi * 4 * t)) * 0.12
    blips = np.zeros(n)
    for i, tt in enumerate(np.arange(0, d, 0.125)):
        f = mtof(88 + [0, 7, 12, 4, 9, 2][i % 6])
        b = np.sin(2 * np.pi * f * tvec(int(SR * 0.05))) * exp_env(int(SR * 0.05), 0.012)
        i0 = int(tt * SR)
        blips[i0:i0 + len(b)] += b[:max(0, n - i0)] * 0.18
    e = np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.2)
    return (bed + blips) * e


def s_shimmer(v=1.0):
    out = np.zeros((2, int(SR * 2.4)))
    for i, m in enumerate([77, 81, 84, 88, 91, 93, 96]):
        b = fm_bell(mtof(m), 1.6, ratio=3.0, index=1.2, decay=0.55, idx_decay=0.12) * (0.75 - 0.05 * i)
        st = np.vstack([b * (0.5 + 0.07 * i), b * (1 - 0.07 * i)])
        i0 = int(i * 0.045 * SR)
        out[:, i0:i0 + st.shape[1]] += st[:, :out.shape[1] - i0]
    air = sweep_noise(out.shape[1], 3000, 9000, seed=12, q=2.0) * np.exp(-tvec(out.shape[1]) / 0.5) * 0.15
    return (out + air) * v * 0.33


def s_row(n_):
    m = 96 + [0, 2, 4, 7, 9][n_ % 5] + 12 * (n_ // 5 % 2)
    return fm_bell(mtof(m), 0.12, ratio=2.0, index=0.6, decay=0.03, idx_decay=0.02) * 0.08


def s_zip(v=1.0):
    n = int(SR * 0.42)
    x = sweep_noise(n, 400, 6000, seed=23, q=1.8, shape=lambda u: u ** 0.7)
    e = np.sin(np.clip(tvec(n) / 0.42, 0, 1) * np.pi) ** 0.9
    return stereo_width(x * e * v * 0.6, 0.01, 0.6)


def s_land():
    n = int(SR * 0.3)
    t = tvec(n)
    thump = np.sin(2 * np.pi * np.cumsum(70 + 60 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.09) * 0.55
    c = s_click(0.35)
    thump[:len(c)] += c[:n]
    return thump


def s_expand():
    n = int(SR * 0.3)
    t = tvec(n)
    f = 520 + 380 * (1 - np.exp(-t / 0.04))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * exp_env(n, 0.06, 0.004) * 0.3
    air = filt(noise(n, 88), 'bp', (2500, 7000), 2) * np.sin(np.clip(t / 0.2, 0, 1) * np.pi) * 0.08
    return tone + air


def s_ding(v=1.0):
    a = fm_bell(mtof(81), 1.8, ratio=3.5, index=1.4, decay=0.7, idx_decay=0.2)
    b = fm_bell(mtof(88), 1.8, ratio=3.5, index=1.4, decay=0.8, idx_decay=0.2)
    out = np.zeros(int(SR * 2.0))
    out[:len(a)] += a
    i0 = int(0.11 * SR)
    out[i0:i0 + len(b)] += b[:len(out) - i0]
    return out * v * 0.3


def s_toggle(direction=1):
    c = s_click(0.8)
    p = s_pop(0.5, direction < 0)
    n = max(len(c), len(p) + int(0.01 * SR))
    out = np.zeros(n)
    out[:len(c)] += c
    out[int(0.01 * SR):int(0.01 * SR) + len(p)] += p
    return out


def s_sparkles(d, seed=4, count=18):
    g = np.random.default_rng(seed)
    out = np.zeros((2, int(SR * (d + 1.0))))
    for i in range(count):
        tt = g.uniform(0, d) * (i / count) ** 0.5 + g.uniform(0, 0.1)
        m = 96 + int(g.choice([0, 2, 4, 7, 9, 12]))
        b = fm_bell(mtof(m), 0.6, ratio=3.0, index=0.9, decay=0.15, idx_decay=0.05) * g.uniform(0.3, 0.7)
        pan = g.uniform(-0.8, 0.8)
        i0 = int(tt * SR)
        seg = b[:out.shape[1] - i0]
        out[0, i0:i0 + len(seg)] += seg * (1 - pan) / 2
        out[1, i0:i0 + len(seg)] += seg * (1 + pan) / 2
    return out * 0.22


def s_unzip():
    n = int(SR * 0.55)
    out = np.zeros(n)
    t = 0.0
    k = 0
    while t < 0.45:
        b = filt(noise(int(SR * 0.008), 90 + k), 'bp', (2500, 9000), 2) * np.exp(-tvec(int(SR * 0.008)) / 0.002)
        i0 = int(t * SR)
        out[i0:i0 + len(b)] += b * (0.4 + 0.6 * t / 0.45)
        t += 0.03 * (1 - t / 0.55)
        k += 1
    return out * 0.4


def s_success():
    out = np.zeros(int(SR * 1.6))
    for i, m in enumerate([76, 81, 84]):
        b = fm_bell(mtof(m), 1.4, ratio=3.5, index=1.1, decay=0.5, idx_decay=0.15) * 0.8
        i0 = int(i * 0.07 * SR)
        out[i0:i0 + len(b)] += b[:len(out) - i0]
    return out * 0.28


def s_celebrate():
    n = int(SR * 2.4)
    t = tvec(n)
    snap = filt(noise(n, 300), 'bp', (800, 6000), 2) * np.exp(-t / 0.018) * 0.8
    crackle = np.zeros(n)
    g = np.random.default_rng(301)
    for _ in range(60):
        tt = g.uniform(0.05, 0.9) ** 1.4
        b = filt(noise(int(SR * 0.006), int(g.integers(1000))), 'hp', 4000) * np.exp(-tvec(int(SR * 0.006)) / 0.0015)
        i0 = int(tt * SR)
        crackle[i0:i0 + len(b)] += b * g.uniform(0.2, 0.6)
    chord = np.zeros(n)
    for i, m in enumerate([77, 81, 84, 89]):
        b = fm_bell(mtof(m), 2.0, ratio=3.5, index=1.4, decay=0.8, idx_decay=0.2)
        i0 = int((0.05 + i * 0.06) * SR)
        chord[i0:i0 + len(b)] += b[:n - i0] * 0.7
    return stereo_width((snap + crackle * 0.6 + chord * 0.5) * 0.4, 0.012, 0.6)


def s_draw(i):
    n = int(SR * 0.3)
    x = sweep_noise(n, 1500 + 400 * i, 6000 + 800 * i, seed=70 + i, q=2.0)
    e = np.sin(np.clip(tvec(n) / 0.3, 0, 1) * np.pi) ** 1.5
    tone = fm_bell(mtof(84 + [0, 4, 7][i]), 0.3, ratio=2, index=0.7, decay=0.08, idx_decay=0.03)
    return x * e * 0.15 + tone[:n] * 0.15


def s_impact(v=1.0):
    n = int(SR * 3.0)
    t = tvec(n)
    boom = np.sin(2 * np.pi * np.cumsum(32 + 50 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.9) * np.minimum(1, t / 0.004)
    burst = filt(noise(n, 401), 'lp', 2500, 2) * np.exp(-t / 0.12)
    return stereo_width(np.tanh(1.3 * (boom * 0.9 + burst * 0.5)) * v * 0.85, 0.009, 0.4)


# Scrubbing: a soft, tuned detent each time the playhead crosses a chapter
# marker. Each marker has its own note of D minor pentatonic, so dragging right
# climbs and dragging left falls — felt more than heard, like a jog wheel.
DETENT_NOTES = [74, 77, 79, 81, 84, 86, 89, 91, 93, 96, 98]


def s_detent(n_, v=1.0):
    n = int(SR * 0.14)
    t = tvec(n)
    f = mtof(DETENT_NOTES[n_ % len(DETENT_NOTES)])
    tock = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006)
    ring = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.05) * 0.12
    glass = np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / 0.0025) * 0.16
    click = filt(noise(n, 500 + n_), 'bp', (2500, 8000), 2) * np.exp(-t / 0.0009) * 0.3
    thump = np.sin(2 * np.pi * 150 * t) * np.exp(-t / 0.008) * 0.22
    x = (tock + ring + glass + click + thump) * np.minimum(1, t / 0.0005)
    return x * (0.45 + 0.55 * v) * 0.26


# A sheet settling over the window: a breath of air and a soft low body.
def s_sheet():
    n = int(SR * 0.4)
    t = tvec(n)
    air = filt(noise(n, 611), 'bp', (450, 2200), 2) * np.sin(np.clip(t / 0.32, 0, 1) * np.pi) ** 2 * 0.16
    body = np.sin(2 * np.pi * np.cumsum(130 + 70 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.07) * np.minimum(1, t / 0.012) * 0.22
    return air + body


SFX_GAIN = {'key': 0.9, 'enter': 1.0, 'click': 0.9, 'release': 0.6}
for e in CUES['events']:
    k, t, v = e['kind'], e['t'], e.get('v', 1.0)
    d, n_ = e.get('d', 0.6), e.get('n', 0)
    S = STEMS['sfx']
    V = STEMS['sfxverb']
    if k == 'key':
        place(S, s_key(v, seed=int(t * 1000) % 400), t, pan=rng.uniform(-0.15, 0.15))
    elif k == 'enter':
        place(S, s_key(1.3, seed=5) + np.concatenate([s_key(0.8, seed=9)[:int(SR * 0.05)]]), t)
    elif k == 'paste':
        place(S, s_key(1.0, seed=17), t)
        place(S, s_key(0.9, seed=18), t + 0.05)
    elif k == 'click':
        place(S, s_click(0.9), t, pan=0.05)
    elif k == 'release':
        place(S, s_click(0.4), t)
    elif k == 'pop':
        place(V, s_pop(v, n_ == -1), t)
    elif k == 'whoosh':
        place(S, s_whoosh(d, v, seed=int(t) % 9), t - d * 0.35)
    elif k == 'tick':
        place(V, fm_bell(mtof(96), 0.3, 2.0, 0.6, 0.06, 0.03) * 0.15, t)
    elif k == 'detent':
        det, pan_ = s_detent(n_, v), (e.get('d', 0.5) - 0.5) * 0.9
        place(S, det * 0.75, t, pan=pan_)   # mostly dry: a tick, not a wash
        place(V, det * 0.25, t, pan=pan_)
    elif k == 'sheet':
        place(S, s_sheet(), t)
    elif k == 'comb':
        place(V, s_comb(int(v)), t)
    elif k == 'working':
        place(S, s_working(d), t)
    elif k == 'shimmer':
        place(V, s_shimmer(v), t)
    elif k == 'row':
        place(V, s_row(n_), t, pan=-0.3 + 0.05 * n_)
    elif k == 'scroll':
        place(S, s_whoosh(d, 0.22, seed=6), t)
    elif k == 'zip':
        place(S, s_zip(v), t)
    elif k == 'land':
        place(S, s_land(), t)
    elif k == 'expand':
        place(V, s_expand(), t)
    elif k == 'ding':
        place(V, s_ding(v), t)
    elif k == 'fold':
        place(S, sweep_noise(int(SR * 0.4), 3000, 400, seed=55, q=1.5) * np.sin(np.clip(tvec(int(SR * 0.4)) / 0.4, 0, 1) * np.pi) ** 1.2 * 0.3, t)
        place(V, s_pop(0.45, True), t + 0.05)
    elif k == 'toggle':
        place(S, s_toggle(int(v)), t)
    elif k == 'bloom':
        place(V, s_sparkles(d, seed=4, count=20), t)
    elif k == 'bell':
        place(V, s_ding(0.32), t)
    elif k == 'done':
        place(V, s_success() * 0.8, t)
    elif k == 'unzip':
        place(S, s_unzip(), t)
    elif k == 'success':
        place(V, s_success(), t)
    elif k == 'celebrate':
        place(V, s_celebrate(), t)
    elif k == 'draw':
        place(V, s_draw(n_), t)
    elif k == 'impact':
        place(STEMS['fx'], s_impact(v), t)


# ── Mix ─────────────────────────────────────────────────────────────────────────
import pyloudnorm as pyln
METER = pyln.Meter(SR)


def lufs(x):
    try:
        v = METER.integrated_loudness(x.T)
        return v if np.isfinite(v) else -70.0
    except Exception:
        return -70.0


def to_lufs(x, target):
    """Gain a stem so its active parts sit at `target` LUFS."""
    cur = lufs(x)
    if cur < -69:
        return x
    return x * 10 ** ((target - cur) / 20)


# Sidechain: pads, bass and arps duck under each kick.
duck = np.ones(N)
tt = tvec(N)
for tk, depth in KICKS:
    i0 = int((tk - 0.004) * SR)
    i1 = min(N, int((tk + 0.42) * SR))
    if i0 < 0:
        continue
    seg = 1 - depth * 0.6 * np.exp(-np.clip(tt[i0:i1] - tk, 0, None) / 0.11) * np.minimum(1, (tt[i0:i1] - tk + 0.004) / 0.004)
    duck[i0:i1] = np.minimum(duck[i0:i1], seg)
duck = signal.sosfilt(sos('lp', 60, 1), duck)


def fxchain(x, board):
    return board(x.astype(np.float32), SR).astype(np.float64)


pad = fxchain(STEMS['pad'], Pedalboard([Chorus(rate_hz=0.4, depth=0.18, mix=0.35)])) * duck
bass = STEMS['bass'] * duck
arp = STEMS['arp'] * duck

# Ping-pong delay on the lead (dotted eighth)
lead = STEMS['lead']
dl = int(0.375 * SR)
pp = np.zeros_like(lead)
src = lead.mean(axis=0)
for k_ in range(1, 5):
    off = dl * k_
    pp[k_ % 2, off:] += src[:N - off] * (0.38 ** k_)
pp = filt(pp, 'lp', 4200, 1)
lead = lead + pp * 0.55

# Balance by measured loudness rather than guesswork.
TARGET = {'kick': -17.5, 'clap': -22.0, 'hats': -27.0, 'perc': -25.0, 'bass': -20.5, 'pad': -22.5,
          'lead': -20.0, 'arp': -27.5, 'bells': -23.0, 'fx': -21.0}
parts = {'kick': STEMS['kick'], 'clap': STEMS['clap'], 'hats': STEMS['hats'], 'perc': STEMS['perc'],
         'bass': bass, 'pad': pad, 'lead': lead, 'arp': arp, 'bells': STEMS['bells'], 'fx': STEMS['fx']}
for k_, v_ in parts.items():
    parts[k_] = to_lufs(v_, TARGET[k_])
    print(f'  {k_:5s} {lufs(v_):6.1f} → {TARGET[k_]}')

music_rev = Pedalboard([Reverb(room_size=0.78, damping=0.45, wet_level=1.0, dry_level=0.0, width=1.0)])
send = parts['pad'] * 0.35 + parts['lead'] * 0.4 + parts['arp'] * 0.45 + parts['clap'] * 0.2 + parts['bells'] * 0.55 + parts['perc'] * 0.12 + parts['fx'] * 0.25
music = sum(parts.values()) + fxchain(send, music_rev) * 0.5

# The pre-drop breath: everything but the riser and the roll goes quiet.
g0, g1 = int((T['drop'] - 0.22) * SR), int(T['drop'] * SR)
breath = np.ones(N)
breath[g0:g1] = 0.1
music = music * breath

music = fxchain(music, Pedalboard([HighpassFilter(32), LowShelfFilter(cutoff_frequency_hz=90, gain_db=-1.5), HighShelfFilter(cutoff_frequency_hz=8000, gain_db=1.0)]))

# Section dynamics (dB): quiet while the problem is set up, full on the drop,
# a step back while the demo talks, a real breakdown for the privacy beat.
AUTO = [(0.0, -9), (2.4, -8), (5.9, -7), (6.0, -4), (9.9, -4), (10.2, -7), (13.7, -1), (14.0, 0), (17.8, 0),
        (18.2, -3), (45.8, -3), (46.0, -4), (59.8, -4), (60.2, -9), (63.8, -8), (65.9, -3), (66.0, -1.5),
        (87.8, -1.5), (88.0, 0), (100.0, 0)]
ta = np.array([a for a, _ in AUTO]); ga = np.array([g for _, g in AUTO])
gain_db = np.interp(tvec(N), ta, ga)
music = music * 10 ** (gain_db / 20)

sfx_rev = Pedalboard([Reverb(room_size=0.55, damping=0.5, wet_level=1.0, dry_level=0.0, width=0.9)])
sfx = STEMS['sfx'] + STEMS['sfxverb'] + fxchain(STEMS['sfxverb'], sfx_rev) * 0.35
sfx = to_lufs(sfx, -23.0)

mix = music + sfx
fade = np.ones(N)
fade[:int(0.25 * SR)] = np.linspace(0, 1, int(0.25 * SR))
fo = int(1.2 * SR)
fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
mix = mix * fade

# Gentle glue, then loudness to -14 LUFS, then a look-ahead true-peak limiter.
from scipy.signal import resample_poly
from scipy.ndimage import minimum_filter1d, uniform_filter1d


def true_peak(x):
    return float(np.max(np.abs(resample_poly(x, 4, 1, axis=1))))


def tp_limit(x, ceiling_db=-1.0, window_ms=8.0):
    """Gain = min over a window, then averaged over the same window, so the
    smoothed gain never exceeds what any sample needed (no overshoot)."""
    ceil = 10 ** (ceiling_db / 20)
    up = np.abs(resample_poly(x, 4, 1, axis=1)).max(axis=0)
    pk = up[:x.shape[1] * 4].reshape(-1, 4).max(axis=1)
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    w = max(3, int(window_ms / 1000 * SR) | 1)
    g = minimum_filter1d(g, size=w, mode='nearest')
    g = uniform_filter1d(g, size=w, mode='nearest')
    return x * g, float(1 - g.min())


mix = fxchain(mix, Pedalboard([Compressor(threshold_db=-18, ratio=1.6, attack_ms=20, release_ms=200)]))
mix = to_lufs(mix, -14.0)
print('  pre-limit true peak dBTP', round(20 * np.log10(true_peak(mix)), 2))
for _ in range(3):
    if true_peak(mix) <= 10 ** (-1.0 / 20):
        break
    mix, depth = tp_limit(mix, -1.2)
    print('  limited, max gain reduction dB', round(-20 * np.log10(max(1e-9, 1 - depth)), 2))
out = mix
print('  final true peak dBTP', round(20 * np.log10(true_peak(out)), 2))

os.makedirs(os.path.join(ROOT, 'public', 'audio'), exist_ok=True)
dst = os.path.join(ROOT, 'public', 'audio', 'soundtrack.wav')
sf.write(dst, out.T.astype(np.float32), SR, subtype='PCM_24')
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)
sf.write(os.path.join(HERE, 'stems', 'music.wav'), music.T.astype(np.float32), SR, subtype='PCM_24')
sf.write(os.path.join(HERE, 'stems', 'sfx.wav'), sfx.T.astype(np.float32), SR, subtype='PCM_24')
print('wrote', dst, f'{DUR:.1f}s', 'LUFS', round(lufs(out), 2), 'peak', round(float(np.max(np.abs(out))), 3))
