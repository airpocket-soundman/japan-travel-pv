"""クールジャパン PR 用のオリジナル BGM(180BPM・和風ハイパーポップ)を合成する。第三者の音源は使っていない。

1 曲を通しで合成してから小節の境目で切り分け、パート別の wav にする。
エディタはトピックの数に合わせてパートを隙間なく並べ直し、ブラウザ内で 1 本に合成する(src/editor/audioMix.ts)。
エコー・リバーブは使わない(音の余韻は各楽器の自然な減衰だけ)。

    intro 3 小節 / map 2 小節 / spot_a〜spot_d 各 1 小節(王道進行 G → A → F#m → Bm を循環)/ montage 4 小節 / ending 5 小節 + 余韻
出力先: src/templates/japan-travel/bgm/(Vite がファイル名にハッシュを付けるので、作り直すと必ず新しい音源が読み込まれる)
"""
import os, wave
import numpy as np
from scipy.signal import lfilter

SR = 44100
BPM = 180
BEAT = 60 / BPM
BAR = BEAT * 4
TAIL = 2.0  # エンディングの余韻
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'templates', 'japan-travel', 'bgm')
rng = np.random.default_rng(7)

# D のヨナ抜き長音階(D E F# A B)。和音は王道進行(IV - V - iii - vi)
PROG = [(43, [55, 59, 62]), (45, [57, 61, 64]), (42, [54, 57, 61]), (35, [59, 62, 66])]  # G - A - F#m - Bm


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, cut):
    a = 1 - np.exp(-2 * np.pi * cut / SR)
    return lfilter([a], [1, a - 1], x)


def hp(x, cut):
    return x - lp(x, cut)


def env_ad(n, a, d_rate):
    t = np.arange(n) / SR
    return np.clip(t / a, 0, 1) * np.exp(-t * d_rate)


def pluck_string(m, dur, decay):
    """Karplus-Strong による撥弦"""
    n = int(dur * SR); p = max(2, int(SR / hz(m)))
    y = np.zeros(n + p); y[:p] = rng.uniform(-1, 1, p)
    for i in range(p, n + p - 1):
        y[i] = decay * (y[i - p] + y[i - p + 1])
    return y[p:n + p]


# ---------------------------------------------------------------- 和楽器

def koto(m, dur=0.35):
    """琴: 余韻は短め(残響っぽく聞こえないように)"""
    n = int(dur * SR)
    return lp(pluck_string(m, dur, 0.495), 5000) * np.exp(-np.arange(n) / SR * 9) * 0.8


def shamisen(m, dur=0.22):
    n = int(dur * SR); t = np.arange(n) / SR
    bachi = hp(rng.standard_normal(n), 2500) * np.exp(-t * 250) * 0.6
    return (lp(pluck_string(m, dur, 0.49), 6500) * np.exp(-t * 12) + bachi) * 0.7


def fue(m, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    vib = 1 + 0.008 * np.sin(2 * np.pi * 6.5 * t) * np.clip((t - 0.06) / 0.1, 0, 1)
    ph = np.cumsum(hz(m) * vib) / SR
    tone = np.sin(2 * np.pi * ph) + 0.25 * np.sin(4 * np.pi * ph)
    breath = lp(hp(rng.standard_normal(n), 1500), 5000) * 0.1
    return (tone + breath) * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.03, 0, 1) * 0.14


def taiko(big=True, gain=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = (62 if big else 160) + 45 * np.exp(-t * 20)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (8 if big else 18))
    hit = lp(rng.standard_normal(n), 1500 if big else 4000) * np.exp(-t * 70) * 0.4
    return (body + hit) * (0.9 if big else 0.5) * gain


# ---------------------------------------------------------------- ポップ

def kick(gain=1.0):
    n = int(0.25 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(46 + 140 * np.exp(-t * 45)) / SR) * np.exp(-t * 11)
    click = hp(rng.standard_normal(n), 3000) * np.exp(-t * 400) * 0.35
    return np.tanh((body + click) * 1.6) * gain


def clap(gain=1.0):
    n = int(0.16 * SR); t = np.arange(n) / SR
    x = lp(hp(rng.standard_normal(n), 1200), 8000)
    e = np.exp(-t * 30) + 0.7 * np.exp(-((t - 0.008) % 0.008) * 500) * (t < 0.025)
    return x * e * 0.5 * gain


def snare(gain=1.0):
    n = int(0.16 * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 210 * t) * np.exp(-t * 35) * 0.5
    noise = lp(hp(rng.standard_normal(n), 1800), 10000) * np.exp(-t * 28) * 0.55
    return (tone + noise) * gain


def hat(open_=False, gain=1.0):
    n = int((0.1 if open_ else 0.03) * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 8500) * np.exp(-t * (30 if open_ else 110)) * 0.22 * gain


def crash(gain=1.0):
    n = int(1.4 * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 5000) * np.exp(-t * 3.2) * 0.3 * gain


def impact(gain=1.0):
    """ドロップの頭の「ドーン」"""
    n = int(0.9 * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 80 * np.exp(-t * 12)) / SR) * np.exp(-t * 4)
    return np.tanh(boom * 2) * 0.8 * gain


def supersaw(ch, dur, cut=5000, voices=7, detune=0.018):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for m in ch:
        for v in range(voices):
            d = 1 + detune * (v - (voices - 1) / 2) / ((voices - 1) / 2)
            ph0 = rng.random()
            x += 2 * ((hz(m) * d * t + ph0) % 1) - 1
    x /= voices
    return lp(lp(x, cut), cut * 1.5) * np.clip(t / 0.005, 0, 1) * np.clip((dur - t) / 0.02, 0, 1) * 0.06


def saw_bass(m, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = 2 * ((hz(m) * t) % 1) - 1 + 0.6 * np.sin(2 * np.pi * hz(m) * t)
    return lp(x, 900) * np.clip(t / 0.003, 0, 1) * np.clip((dur - t) / 0.01, 0, 1) * 0.32


def lead(m, dur):
    """キラキラのリード(矩形波 + ノコギリ波)"""
    n = int(dur * SR); t = np.arange(n) / SR
    ph = hz(m) * t
    x = np.sign(np.sin(2 * np.pi * ph)) * 0.6 + (2 * (ph % 1) - 1) * 0.4 + np.sign(np.sin(4 * np.pi * ph * 1.003)) * 0.25
    return lp(x, 7000) * np.clip(t / 0.004, 0, 1) * np.clip((dur - t) / 0.015, 0, 1) * (0.7 + 0.3 * np.exp(-t * 10)) * 0.06


def riser(dur, gain=1.0):
    n = int(dur * SR); x = rng.standard_normal(n)
    x = np.concatenate([lp(x[i:i + 512], 300 + 12000 * (i / n) ** 2) for i in range(0, n, 512)])[:n]
    t = np.arange(n) / SR
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1800 * (t / dur) ** 2) / SR) * 0.3
    return (x + sweep) * np.linspace(0, 1, n) ** 2 * 0.22 * gain


# ---------------------------------------------------------------- 曲

class Song:
    """drums / music の 2 系統。music はキックに合わせて強めに揺らす(サイドチェインのポンピング)"""

    def __init__(self, bars):
        self.n = int((bars * BAR + TAIL) * SR)
        self.drums = np.zeros((self.n, 2)); self.music = np.zeros((self.n, 2)); self.kicks = []

    def add(self, x, bar, beat=0.0, bus='music', pan=0.0, gain=1.0):
        s = int(round((bar * BAR + beat * BEAT) * SR))
        if s >= self.n or s < 0: return
        x = x[: self.n - s] * gain
        buf = self.drums if bus == 'drums' else self.music
        buf[s:s + len(x), 0] += x * (1 - pan); buf[s:s + len(x), 1] += x * (1 + pan)

    def kick(self, bar, beat, gain=1.0):
        self.add(kick(gain), bar, beat, 'drums'); self.kicks.append(bar * BAR + beat * BEAT)

    def render(self):
        duck = np.ones(self.n)
        for k in self.kicks:
            s = int(k * SR); m = min(self.n - s, int(BEAT * 0.9 * SR))
            duck[s:s + m] = np.minimum(duck[s:s + m], 0.25 + 0.75 * (np.arange(m) / m) ** 0.6)
        mix = self.drums + self.music * duck[:, None]
        mix = np.tanh(mix / np.abs(mix).max() * 1.8)  # 音圧を上げる
        return mix / np.abs(mix).max() * 0.9


def drums(song, bar, level=2):
    """level 0: キックのみ / 1: + クラップ・裏のハイハット / 2: + 16 分のハイハット"""
    for q in range(4):
        song.kick(bar, q)
        if level >= 1:
            if q in (1, 3): song.add(clap(), bar, q, 'drums'); song.add(snare(0.6), bar, q, 'drums')
            song.add(hat(True), bar, q + 0.5, 'drums', pan=0.3)
        if level >= 2:
            for s in (0.25, 0.75): song.add(hat(False, 0.8), bar, q + s, 'drums', pan=-0.3)


def snare_roll(song, bar, beats=4, start=0.0, gain=0.9):
    """ドロップ前の加速するスネア連打(8 分 → 16 分 → 32 分)"""
    t = start; end = start + beats
    while t < end - 1e-6:
        prog = (t - start) / beats
        step = 0.5 if prog < 0.4 else 0.25 if prog < 0.8 else 0.125
        song.add(snare(gain * (0.4 + 0.6 * prog)), bar, t, 'drums')
        t += step


def chords(song, bar, pb, level=1.0, stutter=False):
    """裏拍で跳ねるスーパーソウ。stutter で最後の拍を 16 分で刻む"""
    root, ch = PROG[pb % 4]
    notes = [m + 12 for m in ch] + [ch[0] + 24]
    for q in range(4):
        if stutter and q == 3:
            for s in range(4): song.add(supersaw(notes, BEAT * 0.2), bar, q + s * 0.25, gain=level)
        else:
            song.add(supersaw(notes, BEAT * 0.9), bar, q, gain=level)


def bassline(song, bar, pb):
    root, _ = PROG[pb % 4]
    for q in range(4):
        song.add(saw_bass(root, BEAT * 0.45), bar, q + 0.5)
        song.add(saw_bass(root + 12, BEAT * 0.2), bar, q + 0.75, gain=0.7)


def koto16(song, bar, pb, gain=0.5, up=12):
    _, ch = PROG[pb % 4]
    notes = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2] + 12, ch[1] + 12, ch[0] + 12, ch[2]]
    for e in range(16):
        song.add(koto(notes[e % 8] + up), bar, e * 0.25, pan=0.4 if e % 2 else -0.4, gain=gain)


def shamisen16(song, bar, pb, gain=0.5):
    _, ch = PROG[pb % 4]
    pat = [ch[0] + 12, ch[2], ch[1] + 12, ch[2], ch[0] + 24, ch[2], ch[1] + 12, ch[2]]
    for k in range(16):
        song.add(shamisen(pat[k % 8]), bar, k * 0.25, pan=0.25, gain=gain * (1.0 if k % 4 == 2 else 0.55))


# 4 小節で 1 周する 16 分のリード(ヨナ抜き)。(16 分の位置, 音, 長さ[16 分])
HOOK = [
    [(0, 83, 2), (2, 86, 1), (3, 88, 1), (4, 90, 2), (6, 88, 1), (7, 86, 1), (8, 83, 2), (10, 86, 2), (12, 88, 4)],
    [(0, 90, 2), (2, 88, 1), (3, 86, 1), (4, 88, 2), (6, 90, 2), (8, 93, 2), (10, 90, 1), (11, 88, 1), (12, 86, 4)],
    [(0, 85, 2), (2, 86, 1), (3, 88, 1), (4, 85, 2), (6, 81, 2), (8, 83, 2), (10, 85, 2), (12, 88, 4)],
    [(0, 86, 2), (2, 83, 1), (3, 81, 1), (4, 83, 2), (6, 86, 2), (8, 88, 1), (9, 90, 1), (10, 93, 2), (12, 95, 4)],
]


def hook(song, bar, pb, octave=0, gain=1.0, with_fue=True):
    for s, m, d in HOOK[pb % 4]:
        song.add(lead(m + octave, d * BEAT / 4 * 0.92), bar, s / 4, gain=gain)
        if with_fue and d >= 2:
            song.add(fue(m - 12 + octave, d * BEAT / 4 * 0.92), bar, s / 4, gain=0.7 * gain)


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.wav'): os.remove(os.path.join(OUT, f))
    # 通しの構成(小節): intro 0-2 | map 3-4 | topic 5-12(王道進行を 2 周)| montage 13-16 | ending 17-21
    song = Song(22)
    pb = lambda bar: bar - 5  # トピックの 1 つ目(bar 5)が G になるように和音の番号をずらす

    # intro: 琴の 16 分 → 締太鼓とスネアの連打・ライザーで溜めて…
    for b in (0, 1, 2):
        koto16(song, b, 0, gain=0.35 + 0.12 * b)
        song.add(supersaw([55, 59, 62, 67], BAR, cut=800 + 1500 * b), b, gain=0.8)
    for q in range(4): song.add(taiko(True, 0.8), 1, q, 'drums')
    snare_roll(song, 2, beats=4)
    song.add(riser(BAR, 1.2), 2)
    # map: 1 回目のドロップ(ドーン + クラッシュ)
    song.add(impact(), 3, 0, 'drums'); song.add(crash(), 3, 0, 'drums'); song.add(taiko(True, 1.2), 3, 0, 'drums')
    for b in (3, 4):
        drums(song, b, level=2); chords(song, b, pb(b) + 4, stutter=(b == 4)); bassline(song, b, pb(b) + 4)
        koto16(song, b, pb(b) + 4, gain=0.4)
    # トピック: フルのドロップ(リード + 篠笛 + 三味線 + 琴)
    for b in range(5, 13):
        drums(song, b, level=2); chords(song, b, pb(b), stutter=(pb(b) % 4 == 3)); bassline(song, b, pb(b))
        hook(song, b, pb(b)); shamisen16(song, b, pb(b), gain=0.35)
        if pb(b) % 4 == 0: song.add(crash(0.7), b, 0, 'drums'); song.add(taiko(True), b, 0, 'drums')
    # montage: いちばんアガる(1 オクターブ上のリード + 琴 + 太鼓連打、最後にスネア連打とライザー)
    for b in range(13, 17):
        drums(song, b, level=2); chords(song, b, pb(b), level=1.15, stutter=True); bassline(song, b, pb(b))
        hook(song, b, pb(b), octave=12, gain=0.9, with_fue=False); koto16(song, b, pb(b), gain=0.45, up=24)
        for q in range(4): song.add(taiko(True, 0.8), b, q, 'drums')
    song.add(crash(), 13, 0, 'drums')
    snare_roll(song, 16, beats=2, start=2, gain=1.0)
    song.add(riser(BEAT * 2, 1.2), 16, 2)
    # ending: もう 1 回だけ爆発 → D の和音と琴で決めて終わる
    song.add(impact(1.2), 17, 0, 'drums'); song.add(crash(1.2), 17, 0, 'drums')
    for b in (17, 18):
        drums(song, b, level=2); chords(song, b, pb(b), level=1.1, stutter=(b == 18)); bassline(song, b, pb(b))
        hook(song, b, pb(b), octave=12, gain=0.9)
    song.kick(19, 0, 1.3); song.add(impact(1.1), 19, 0, 'drums'); song.add(crash(1.2), 19, 0, 'drums')
    song.add(taiko(True, 1.3), 19, 0, 'drums')
    # 決めの和音は映像の終わり(bar 22)まで伸ばす
    n_end = int((BAR * 3 + TAIL) * SR)
    song.add(supersaw([62, 66, 69, 74, 78], BAR * 3 + TAIL, cut=4000) * np.exp(-np.arange(n_end) / SR * 0.55), 19, gain=1.4)
    song.add(saw_bass(38, BAR * 2) * np.exp(-np.arange(int(BAR * 2 * SR)) / SR * 0.8), 19)
    song.add(fue(74, BAR * 2.5), 19, 1, gain=0.9)
    for k, m in enumerate([62, 66, 69, 74, 78, 81, 86]): song.add(koto(m, 1.2), 19, k * 0.12, pan=(k - 3) / 6, gain=0.8)

    mix = song.render()
    cuts = {'intro': (0, 3), 'map': (3, 5), 'montage': (13, 17), 'ending': (17, None)}
    for i, k in enumerate('abcd'): cuts[f'spot_{k}'] = (9 + i, 10 + i)  # 2 周目から切り出す(G, A, F#m, Bm)
    for name, (a, b) in cuts.items():
        seg = mix[int(round(a * BAR * SR)): (int(round(b * BAR * SR)) if b else None)]
        with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((seg * 32767).astype(np.int16).tobytes())
        print('wrote', name, round(len(seg) / SR, 3), 's')
    with wave.open(os.path.join(os.path.dirname(__file__), '_full_song.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())


if __name__ == '__main__':
    main()
