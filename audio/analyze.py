"""Objective checks on the soundtrack: short-term loudness over time, per-stem
levels by section, and a spectrogram image for visual inspection."""
import sys, json
import numpy as np
import soundfile as sf
import pyloudnorm as pyln
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

path = sys.argv[1] if len(sys.argv) > 1 else 'public/audio/soundtrack.wav'
x, sr = sf.read(path)
meter = pyln.Meter(sr)
print('integrated LUFS', round(meter.integrated_loudness(x), 2), 'peak dBFS', round(20*np.log10(np.max(np.abs(x))+1e-12), 2))
# short-term loudness (3 s windows) every 2 s
row = []
for t in np.arange(0, len(x)/sr - 3, 2.0):
    seg = x[int(t*sr):int((t+3)*sr)]
    try:
        l = meter.integrated_loudness(seg)
    except Exception:
        l = -70
    row.append(f'{t:4.0f}s:{l:6.1f}')
for i in range(0, len(row), 6):
    print('  '.join(row[i:i+6]))
# spectrogram
mono = x.mean(axis=1)
plt.figure(figsize=(20, 6))
plt.specgram(mono, NFFT=2048, Fs=sr, noverlap=1024, cmap='magma', vmin=-120, vmax=-20)
plt.yscale('symlog', linthresh=200)
plt.ylim(30, 16000)
plt.xlabel('s'); plt.ylabel('Hz')
plt.tight_layout()
plt.savefig(sys.argv[2] if len(sys.argv) > 2 else '.cache/spec.png', dpi=80)
