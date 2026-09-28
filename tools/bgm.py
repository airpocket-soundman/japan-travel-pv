"""日本観光 PV 用のオリジナル BGM(120BPM・ポップ)をパート別に合成する。第三者の音源は使っていない。

パートは小節の頭に置いて並べる前提で、各ファイルは名目の長さ + 余韻(TAIL 秒)を持つ。
エディタが観光地の数に合わせてブラウザ内で 1 本に合成する(src/editor/audioMix.ts)。
    intro 1 小節 / map 1 小節 / spot_a, spot_b 各 1 小節(観光地ごとに交互)/ montage 2 小節 / ending 3 小節
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


def kick(gain=1.0):
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 50 + 120 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8) * gain


def clap():
    n = int(0.22 * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n); x = lp(x - lp(x, 900), 6000)
    e = np.exp(-t * 22) + 0.6 * np.exp(-((t - 0.012) % 0.011) * 300) * (t < 0.035)
    return x * e * 0.55


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n); x = x - lp(x, 7000)
    return x * np.exp(-t * (18 if open_ else 80)) * 0.3


def pluck(ch, dur, cut=3200):
    """シンセの和音(ノコギリ波 + フィルター)"""
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(2 * ((hz(m) * (1 + d) * t) % 1) - 1 for m in ch for d in (-0.004, 0.004))
    return lp(lp(x, cut), cut) * np.exp(-t * 7) * 0.06


def square(m, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 6 * t) * np.clip(t / 0.15, 0, 1)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(hz(m) * vib) / SR))
    env = np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.03, 0, 1) * (0.75 + 0.25 * np.exp(-t * 6))
    return lp(x, 4500) * env * 0.07


def groove(tr, bar0, bars, claps=True, busy=True):
    """四つ打ち + クラップ + 裏拍のオープンハイハット + 16 分のハット + 弾むベース + シンセの裏打ち"""
    for b in range(bars):
        t0 = b * BAR
        root, ch = PROG[(bar0 + b) % 4]
        for q in range(4):
            tr.add(kick(), t0 + q * BEAT)
            if claps and q in (1, 3): tr.add(clap(), t0 + q * BEAT, pan=0.05)
            tr.add(hat(True), t0 + q * BEAT + BEAT / 2, pan=0.3)
            if busy:
                for s in (1, 3): tr.add(hat(), t0 + q * BEAT + s * BEAT / 4, pan=-0.3, gain=0.7)
            tr.add(bass(root + (12 if q % 2 else 0), BEAT * 0.45), t0 + q * BEAT + BEAT / 2, gain=1.1)
            tr.add(pluck([m + 12 for m in ch], BEAT * 0.45), t0 + q * BEAT + BEAT / 2, pan=-0.15 if q % 2 else 0.15)


def riser(tr, at, dur):
    n = int(dur * SR); x = rng.standard_normal(n)
    x = np.concatenate([lp(x[i:i + 2048], 300 + 9000 * i / n) for i in range(0, n, 2048)])[:n]
    tr.add(x * np.linspace(0, 1, n) ** 2 * 0.25, at)


# ヨナ抜き音階のリード(16 分音符単位: (開始, 音, 長さ))
LEAD_A = [(0, 74, 2), (2, 76, 2), (4, 78, 2), (6, 81, 4), (10, 78, 2), (12, 76, 4)]
LEAD_B = [(0, 81, 2), (2, 83, 2), (4, 81, 2), (6, 78, 2), (8, 76, 4), (12, 78, 4)]


def lead(tr, notes, bar=0, octave=0):
    for s, m, d in notes:
        tr.add(square(m + octave, d * BEAT / 4), bar * BAR + s * BEAT / 4, gain=1.0)


def main():
    os.makedirs(OUT, exist_ok=True)
    # intro(1 小節): 琴のきらめき → 太鼓のフィルとライザーでドロップへ
    t = Track(1)
    arp(t, 0, 1, density=0.9, octave=12)
    t.add(pad(PROG[0][1], BAR), 0, gain=0.8)
    riser(t, 0, BAR)
    for k in range(4): t.add(taiko(False), 2 * BEAT + k * BEAT / 2, gain=0.5 + 0.15 * k)
    t.echo(); t.write('intro')
    # map(1 小節): ドロップ。四つ打ちが入る
    t = Track(1)
    groove(t, 0, 1, busy=False); arp(t, 0, 1, density=0.7)
    t.add(taiko(True), 0, gain=0.9)
    t.echo(); t.write('map')
    # spot_a / spot_b(各 1 小節): 旋律違いで交互に使う
    for name, mel, bar0 in (('spot_a', LEAD_A, 1), ('spot_b', LEAD_B, 3)):
        t = Track(1)
        groove(t, bar0, 1); arp(t, bar0, 1, density=0.6, octave=12)
        lead(t, mel)
        t.echo(); t.write(name)
    # montage(2 小節): いちばん盛り上がる。リード 1 オクターブ上 + 太鼓
    t = Track(2)
    groove(t, 0, 2); arp(t, 0, 2, density=0.9, octave=12)
    lead(t, LEAD_A, 0, 12); lead(t, LEAD_B, 1, 12)
    for b in range(2): t.add(taiko(True), b * BAR, gain=0.8)
    riser(t, BAR + 2 * BEAT, 2 * BEAT)
    t.echo(); t.write('montage')
    # ending(3 小節): 1 小節目は決めのリズム、残りは和音と琴で余韻
    t = Track(3)
    groove(t, 0, 1)
    lead(t, [(0, 81, 2), (2, 83, 2), (4, 86, 8)], 0)
    t.add(kick(1.2), BAR); t.add(taiko(True), BAR, gain=1.1); t.add(clap(), BAR)
    t.add(pad(PROG[0][1] + [74], BAR * 2 + TAIL), BAR, gain=1.5)
    for k, m in enumerate([62, 66, 69, 74, 78]): t.add(koto(m, 3.0), BAR + k * 0.06, gain=0.8)
    arp(t, 2, 1, density=0.4, octave=12)
    t.echo(); t.write('ending')


if __name__ == '__main__':
    main()
