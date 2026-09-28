"""日本観光 PV 用のオリジナル BGM(120BPM)をパート別に合成する。第三者の音源は使っていない。

パートは小節の頭に置いて並べる前提で、各ファイルは名目の長さ + 余韻(TAIL 秒)を持つ。
    intro  3 小節 / map 2 小節 / spot_a, spot_b 各 2 小節(観光地ごとに交互)/ montage 4 小節 / ending 5 小節
"""
import os, wave
import numpy as np
from scipy.signal import lfilter

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
TAIL = 3.0
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'bgm')
rng = np.random.default_rng(3)

# D ヨナ抜き長音階(D E F# A B)
SCALE = [62, 64, 66, 69, 71]
PROG = [  # (ルート, 和音) 1 小節ずつ: D - Bm - G - A
    (38, [62, 66, 69]), (35, [59, 62, 66]), (31, [55, 59, 62]), (33, [57, 61, 64])]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, cut):
    a = 1 - np.exp(-2 * np.pi * cut / SR)
    return lfilter([a], [1, a - 1], x)


def koto(m, dur=1.6, bright=0.5):
    """Karplus-Strong による撥弦音"""
    n = int(dur * SR); f = hz(m); p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p) * (0.6 + 0.4 * bright)
    out = np.zeros(n)
    y = np.concatenate([buf, np.zeros(n)])
    for i in range(p, n + p):
        y[i] = 0.498 * (y[i - p] + y[i - p + 1]) if i - p + 1 < len(y) else 0
    out = y[p:n + p]
    return lp(out, 5000) * np.exp(-np.arange(n) / SR * 1.2)


def taiko(big=True):
    n = int(0.9 * SR); t = np.arange(n) / SR
    f = (60 if big else 110) + 50 * np.exp(-t * 18)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (5 if big else 9))
    hit = lp(rng.standard_normal(n), 1800) * np.exp(-t * 60) * 0.5
    return (body + hit) * (1.0 if big else 0.6)


def kane():
    """小さな鉦(チャンチキ)風の金属音"""
    n = int(0.25 * SR); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * t) for f in (1850, 2710, 3930)) * np.exp(-t * 30) * 0.08


def shaker():
    n = int(0.06 * SR); x = rng.standard_normal(n)
    return (x - lp(x, 6000)) * np.exp(-np.arange(n) / SR * 70) * 0.25


def fue(m, dur):
    """篠笛風: ビブラートつきの正弦波 + 息の音"""
    n = int(dur * SR); t = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.3, 0, 1)
    ph = np.cumsum(hz(m + 12) * vib) / SR
    tone = np.sin(2 * np.pi * ph) + 0.18 * np.sin(4 * np.pi * ph)
    breath = lp(rng.standard_normal(n), 3000) * 0.08
    env = np.clip(t / 0.04, 0, 1) * np.clip((dur - t) / 0.08, 0, 1)
    return (tone + breath) * env * 0.22


def pad(ch, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * np.cumsum(np.full(n, hz(m) * (1 + d))) / SR) for m in ch for d in (-0.003, 0.003))
    env = np.clip(t / 0.5, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)
    return lp(x, 1200) * env * 0.05


def bass(m, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * hz(m) * t) + 0.3 * np.sin(4 * np.pi * hz(m) * t)
    return x * np.exp(-t * 3) * np.clip(t / 0.005, 0, 1) * 0.35


class Track:
    def __init__(self, bars):
        self.len = bars * BAR
        self.L = np.zeros(int((self.len + TAIL) * SR)); self.R = self.L.copy()

    def add(self, x, at, pan=0.0, gain=1.0):
        s = int(at * SR)
        if s >= len(self.L): return
        x = x[: len(self.L) - s] * gain
        self.L[s:s + len(x)] += x * (1 - pan) / 1.0
        self.R[s:s + len(x)] += x * (1 + pan) / 1.0

    def echo(self, t=BEAT * 0.75, fb=0.3):
        d = int(t * SR)
        for ch in (self.L, self.R):
            for k in range(1, 4):
                ch[d * k:] += ch[:-d * k] * (fb ** k) * 0.5

    def write(self, name):
        m = max(np.abs(self.L).max(), np.abs(self.R).max(), 1e-9)
        L, R = np.tanh(1.6 * self.L / m), np.tanh(1.6 * self.R / m)
        g = 0.85 / max(np.abs(L).max(), np.abs(R).max())
        d = (np.stack([L * g, R * g], 1) * 32767).astype(np.int16)
        with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes())
        print('wrote', name, round(len(L) / SR, 2), 's')


def arp(tr, bar0, bars, density=1.0, octave=0):
    """琴の分散和音(8 分音符)"""
    for b in range(bars):
        root, ch = PROG[(bar0 + b) % 4]
        notes = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[1], ch[0] + 12, ch[2]]
        for e, m in enumerate(notes):
            if rng.random() <= density:
                tr.add(koto(m + octave, 1.4, 0.4 + 0.3 * (e % 2 == 0)), (b * 4 + e / 2) * BEAT, pan=0.3 * (1 if e % 2 else -1), gain=0.5)


def beat(tr, bars, fill_last=True, full=True):
    for b in range(bars):
        t0 = b * BAR
        for q in range(4):
            if q in (0, 2) or (full and q == 3 and b % 2):
                tr.add(taiko(True), t0 + q * BEAT, gain=0.9)
            if full and q in (1, 3):
                tr.add(taiko(False), t0 + q * BEAT, pan=0.2, gain=0.8)
            tr.add(kane(), t0 + q * BEAT + BEAT / 2, pan=-0.4)
            for s in range(2):
                tr.add(shaker(), t0 + q * BEAT + s * BEAT / 2 + BEAT / 4, pan=0.4, gain=0.7)
        if fill_last and b == bars - 1:
            for k in range(4):
                tr.add(taiko(False), t0 + 3 * BEAT + k * BEAT / 4, gain=0.5 + 0.15 * k)


def bassline(tr, bar0, bars):
    for b in range(bars):
        root, _ = PROG[(bar0 + b) % 4]
        for q, off in enumerate([0, 0, 7, 12]):
            tr.add(bass(root + off, BEAT * 0.9), b * BAR + q * BEAT, gain=0.9)


MEL_A = [(0, 74, 1), (1, 76, 0.5), (1.5, 78, 0.5), (2, 81, 1.5), (4, 78, 1), (5, 76, 1), (6, 74, 2)]
MEL_B = [(0, 81, 1), (1, 83, 0.5), (1.5, 81, 0.5), (2, 78, 1), (3, 76, 1), (4, 74, 1.5), (5.5, 76, 0.5), (6, 78, 2)]


def melody(tr, mel, bar0=0):
    for beat_at, m, d in mel:
        tr.add(fue(m - 12, d * BEAT), bar0 * BAR + beat_at * BEAT, gain=1.0)


def main():
    os.makedirs(OUT, exist_ok=True)
    # intro: 琴のソロから始まり、3 小節目で和音が広がる
    t = Track(3)
    arp(t, 0, 3, density=0.8)
    for b in range(3): t.add(pad(PROG[b % 4][1], BAR), b * BAR, gain=0.6 + 0.2 * b)
    t.add(taiko(True), 2 * BAR + 3 * BEAT, gain=0.8); t.add(taiko(True), 2 * BAR + 3.5 * BEAT, gain=1.0)
    t.echo(); t.write('intro')
    # map: 太鼓が入って助走
    t = Track(2)
    arp(t, 3, 2); bassline(t, 3, 2); beat(t, 2, full=False)
    for b in range(2): t.add(pad(PROG[(3 + b) % 4][1], BAR), b * BAR)
    t.echo(); t.write('map')
    # spot_a / spot_b: 観光地ごとのループ(2 小節)。旋律違いで交互に使う
    for name, mel, bar0 in (('spot_a', MEL_A, 0), ('spot_b', MEL_B, 2)):
        t = Track(2)
        arp(t, bar0, 2, density=0.9); bassline(t, bar0, 2); beat(t, 2)
        for b in range(2): t.add(pad(PROG[(bar0 + b) % 4][1], BAR), b * BAR)
        melody(t, mel)
        t.echo(); t.write(name)
    # montage: 盛り上がり(旋律 A→B、1 オクターブ上の琴)
    t = Track(4)
    arp(t, 0, 4, octave=12); bassline(t, 0, 4); beat(t, 4)
    for b in range(4): t.add(pad(PROG[b % 4][1], BAR), b * BAR, gain=1.3)
    melody(t, [(a, m + 12, d) for a, m, d in MEL_A]); melody(t, [(a, m + 12, d) for a, m, d in MEL_B], bar0=2)
    t.echo(); t.write('montage')
    # ending: 1 小節目で決め、残りは和音と琴で静かに終わる
    t = Track(5)
    t.add(taiko(True), 0, gain=1.2)
    arp(t, 0, 2, density=0.6)
    for k, (b, ch) in enumerate([(0, PROG[0][1]), (2, PROG[2][1]), (3, PROG[3][1])]):
        t.add(pad(ch, BAR * (2 if b == 0 else 1)), b * BAR, gain=1.2)
    t.add(pad(PROG[0][1] + [74], BAR * 2 + TAIL), 4 * BAR, gain=1.4)
    t.add(koto(62, 3.0), 4 * BAR); t.add(koto(69, 3.0), 4 * BAR + 0.08); t.add(koto(74, 3.0), 4 * BAR + 0.16)
    t.add(taiko(True), 4 * BAR, gain=0.8)
    t.echo(); t.write('ending')


if __name__ == '__main__':
    main()
