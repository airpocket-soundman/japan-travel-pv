"""クールジャパン PR 用のオリジナル BGM(150BPM・和風ポップ)を合成する。第三者の音源は使っていない。

1 曲を通しで合成してから小節の境目で切り分け、パート別の wav にする。
エディタはトピックの数に合わせてパートを隙間なく並べ直し、ブラウザ内で 1 本に合成する(src/editor/audioMix.ts)。
並べると元の 1 曲の流れに戻るので、場面の継ぎ目で音が途切れたり重なったりしない。エコーは使わない。

    intro 2 小節 / map 1 小節 / spot_a〜spot_d 各 1 小節(王道進行 G → A → F#m → Bm を循環)/ montage 3 小節 / ending 4 小節 + 余韻
"""
import os, wave
import numpy as np
from scipy.signal import lfilter

SR = 44100
BPM = 150
BEAT = 60 / BPM
BAR = BEAT * 4
TAIL = 3.0  # エンディングの余韻
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'bgm')
rng = np.random.default_rng(3)

# D のヨナ抜き長音階(D E F# A B)。和音は J-POP・アニソンでおなじみの王道進行(IV - V - iii - vi)
PROG = [(43, [55, 59, 62]), (45, [57, 61, 64]), (42, [54, 57, 61]), (35, [59, 62, 66])]  # G - A - F#m - Bm


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, cut):
    a = 1 - np.exp(-2 * np.pi * cut / SR)
    return lfilter([a], [1, a - 1], x)


def hp(x, cut):
    return x - lp(x, cut)


def pluck_string(m, dur, decay):
    """Karplus-Strong による撥弦"""
    n = int(dur * SR); p = max(2, int(SR / hz(m)))
    y = np.zeros(n + p); y[:p] = rng.uniform(-1, 1, p)
    for i in range(p, n + p - 1):
        y[i] = decay * (y[i - p] + y[i - p + 1])
    return y[p:n + p]


# ---------------------------------------------------------------- 音色(和楽器)

def koto(m, dur=1.0):
    n = int(dur * SR)
    return lp(pluck_string(m, dur, 0.497), 4500) * np.exp(-np.arange(n) / SR * 2.5) * 0.8


def shamisen(m, dur=0.3):
    """三味線風: 撥(ばち)のアタック + 減衰の速い撥弦"""
    n = int(dur * SR); t = np.arange(n) / SR
    bachi = hp(rng.standard_normal(n), 2500) * np.exp(-t * 250) * 0.6
    return (lp(pluck_string(m, dur, 0.492), 6000) * np.exp(-t * 6) + bachi) * 0.7


def fue(m, dur):
    """篠笛風: ビブラートつきの正弦波 + 息の音"""
    n = int(dur * SR); t = np.arange(n) / SR
    vib = 1 + 0.007 * np.sin(2 * np.pi * 6 * t) * np.clip((t - 0.08) / 0.15, 0, 1)
    ph = np.cumsum(hz(m) * vib) / SR
    tone = np.sin(2 * np.pi * ph) + 0.25 * np.sin(4 * np.pi * ph) + 0.08 * np.sin(6 * np.pi * ph)
    breath = lp(hp(rng.standard_normal(n), 1500), 5000) * 0.12
    env = np.clip(t / 0.03, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
    return (tone + breath) * env * 0.16


def taiko(big=True, gain=1.0):
    """和太鼓(big)/ 締太鼓(小)"""
    n = int(0.6 * SR); t = np.arange(n) / SR
    f = (62 if big else 150) + 45 * np.exp(-t * 20)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (6 if big else 14))
    hit = lp(rng.standard_normal(n), 1500 if big else 4000) * np.exp(-t * 70) * 0.4
    return (body + hit) * (0.9 if big else 0.5) * gain


# ---------------------------------------------------------------- 音色(ポップ)

def kick(gain=1.0):
    n = int(0.3 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(48 + 110 * np.exp(-t * 40)) / SR) * np.exp(-t * 10)
    click = hp(rng.standard_normal(n), 3000) * np.exp(-t * 300) * 0.25
    return (body + click) * gain


def snare(gain=1.0):
    n = int(0.22 * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5
    noise = lp(hp(rng.standard_normal(n), 1500), 9000) * np.exp(-t * 22) * 0.5
    return (tone + noise) * gain


def hat(open_=False, gain=1.0):
    n = int((0.14 if open_ else 0.04) * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 8000) * np.exp(-t * (22 if open_ else 90)) * 0.2 * gain


def bass(m, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * hz(m) * t) + 0.35 * np.sin(4 * np.pi * hz(m) * t) + 0.15 * np.sin(6 * np.pi * hz(m) * t)
    env = np.clip(t / 0.004, 0, 1) * np.clip((dur - t) / 0.02, 0, 1) * (0.7 + 0.3 * np.exp(-t * 8))
    return x * env * 0.3


def saw_chord(ch, dur, cut=2600):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(2 * ((hz(m) * (1 + d) * t) % 1) - 1 for m in ch for d in (-0.005, 0.005))
    env = np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
    return lp(lp(x, cut), cut) * env * 0.035


def riser(dur):
    n = int(dur * SR); x = rng.standard_normal(n)
    x = np.concatenate([lp(x[i:i + 1024], 400 + 8000 * i / n) for i in range(0, n, 1024)])[:n]
    return x * np.linspace(0, 1, n) ** 2 * 0.18


# ---------------------------------------------------------------- 曲

class Song:
    """小節単位で音を置いていく。drums / music の 2 系統で、music はキックに合わせて音量を揺らす(サイドチェイン)"""

    def __init__(self, bars):
        self.n = int((bars * BAR + TAIL) * SR)
        self.drums = np.zeros((self.n, 2)); self.music = np.zeros((self.n, 2)); self.kicks = []

    def add(self, x, bar, beat=0.0, bus='music', pan=0.0, gain=1.0):
        s = int(round((bar * BAR + beat * BEAT) * SR))
        if s >= self.n: return
        x = x[: self.n - s] * gain
        buf = self.drums if bus == 'drums' else self.music
        buf[s:s + len(x), 0] += x * (1 - pan); buf[s:s + len(x), 1] += x * (1 + pan)

    def kick(self, bar, beat, gain=1.0):
        self.add(kick(gain), bar, beat, 'drums'); self.kicks.append(bar * BAR + beat * BEAT)

    def render(self):
        duck = np.ones(self.n)
        for k in self.kicks:  # キックの瞬間に music を少し下げて、ふわっと戻す
            s = int(k * SR); m = min(self.n - s, int(0.22 * SR))
            duck[s:s + m] = np.minimum(duck[s:s + m], 0.6 + 0.4 * (np.arange(m) / m) ** 0.7)
        mix = self.drums + self.music * duck[:, None]
        mix = np.tanh(mix / np.abs(mix).max() * 1.3)
        return mix / np.abs(mix).max() * 0.88


def groove(song, bar, full=True):
    """四つ打ち + スネア + 16 分のハイハット + 8 分で刻むベース + 裏打ちのシンセ和音"""
    root, ch = PROG[bar % 4]
    for q in range(4):
        song.kick(bar, q)
        if q in (1, 3): song.add(snare(), bar, q, 'drums', pan=0.05)
        song.add(hat(True, 0.8), bar, q + 0.5, 'drums', pan=0.3)
        if full:
            for s16 in (0.25, 0.75): song.add(hat(False, 0.7), bar, q + s16, 'drums', pan=-0.3)
        for e in (0, 0.5):  # 8 分でオクターブを行き来するベース
            song.add(bass(root + (12 if e else 0), BEAT * 0.45), bar, q + e, gain=0.9)
        song.add(saw_chord([m + 12 for m in ch], BEAT * 0.35), bar, q + 0.5, pan=0.15 if q % 2 else -0.15)


def koto_arp(song, bar, density=1.0, octave=12, gain=0.55, sixteenth=False):
    root, ch = PROG[bar % 4]
    notes = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2] + 12, ch[1] + 12, ch[0] + 12, ch[2]]
    step = 0.25 if sixteenth else 0.5
    for e in range(int(4 / step)):
        if rng.random() <= density:
            song.add(koto(notes[e % 8] + octave, 0.9), bar, e * step, pan=0.35 if e % 2 else -0.35, gain=gain)


def shamisen_riff(song, bar, gain=0.5):
    """三味線の刻み(16 分・裏にアクセント)"""
    root, ch = PROG[bar % 4]
    pat = [ch[0] + 12, ch[2], ch[1] + 12, ch[2]]
    for k in range(16):
        song.add(shamisen(pat[k % 4], 0.3), bar, k * 0.25, pan=0.25, gain=gain * (1.0 if k % 4 == 2 else 0.6))


def shime_roll(song, bar, beat_from, beats, gain=0.5):
    """締太鼓の連打(だんだん大きく)"""
    n = int(beats * 4)
    for k in range(n):
        song.add(taiko(False, gain * (0.5 + 0.5 * k / n)), bar, beat_from + k * 0.25, 'drums')


# 4 小節で 1 周する篠笛の旋律(ヨナ抜き)。(拍, 音, 長さ[拍])
MELODY = [
    [(0, 83, 0.5), (0.5, 81, 0.5), (1, 78, 0.5), (1.5, 81, 0.5), (2, 83, 1), (3, 86, 1)],  # G
    [(0, 86, 0.5), (0.5, 83, 0.5), (1, 81, 1), (2, 78, 0.5), (2.5, 76, 0.5), (3, 78, 1)],  # A
    [(0, 81, 0.5), (0.5, 78, 0.5), (1, 76, 1), (2, 78, 0.5), (2.5, 81, 0.5), (3, 83, 1)],  # F#m
    [(0, 86, 1.5), (1.5, 83, 0.5), (2, 81, 1), (3, 78, 0.5), (3.5, 76, 0.5)],  # Bm
]


def melody(song, bar, octave=0, gain=1.0):
    for b, m, d in MELODY[bar % 4]:
        song.add(fue(m - 12 + octave, d * BEAT * 0.95), bar, b, gain=gain)


def main():
    os.makedirs(OUT, exist_ok=True)
    # 通しの構成: intro x2 | map | topic a b c d a b c d | montage x3 | ending x4
    #   bar:      0  1     2     3 ................. 10   11 12 13    14 15 16 17
    # PROG[bar % 4] で和音が決まるので、トピックの 1 つ目(bar 3)が G から始まるよう小節番号をずらす
    song = Song(18)
    off = 1  # bar 3 + off = 4 → PROG[0] = G
    B = lambda b: b + off  # 和音を決めるための小節番号
    # intro: 琴の速い分散和音 → 2 小節目の後半で締太鼓の連打とライザー → ドン
    for b in (0, 1):
        for e in range(16):
            _, ch = PROG[0]
            notes = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2] + 12, ch[1] + 12, ch[0] + 12, ch[2]]
            song.add(koto(notes[e % 8] + 12, 0.9), b, e * 0.25, pan=0.35 if e % 2 else -0.35, gain=0.55 + 0.1 * b)
    song.add(saw_chord([55, 59, 62, 67], BAR * 2, cut=1500) * 1.2, 0)
    song.add(riser(BAR), 1)
    shime_roll(song, 1, 2, 1.5, 0.8)
    song.add(taiko(True, 1.2), 1, 3.5, 'drums')

    def at(fn, bar, *a, **k):
        """groove / melody などは bar % 4 で和音を選ぶので、和音用の小節番号で呼び、置く位置だけ実際の小節 bar にする"""
        pb = B(bar)
        shift = bar - pb

        class Proxy:
            def add(self_, x, b, beat=0.0, bus='music', pan=0.0, gain=1.0):
                song.add(x, b + shift, beat, bus, pan, gain)

            def kick(self_, b, beat, gain=1.0):
                song.kick(b + shift, beat, gain)

        fn(Proxy(), pb, *a, **k)

    # map: ドロップ
    song.add(taiko(True, 1.3), 2, 0, 'drums')
    at(groove, 2); at(koto_arp, 2, density=0.8)
    # トピック: グルーヴ + 篠笛の旋律 + 琴(王道進行を 2 周)
    for bar in range(3, 11):
        at(groove, bar)
        at(melody, bar)
        at(koto_arp, bar, density=0.5, gain=0.45)
        if B(bar) % 4 == 3: shime_roll(song, bar, 3, 1, 0.5)  # 4 小節ごとに締太鼓のフィル
    # montage: いちばん盛り上がる(旋律 1 オクターブ上 + 三味線の刻み + 太鼓)
    for bar in (11, 12, 13):
        at(groove, bar); at(melody, bar, octave=12, gain=0.85); at(shamisen_riff, bar)
        song.add(taiko(True), bar, 0, 'drums'); song.add(taiko(True, 0.8), bar, 2, 'drums')
    shime_roll(song, 13, 2, 2, 0.8)
    song.add(riser(BEAT * 2), 13, 2)
    # ending: 1 小節目で決め、残りは D の和音・琴・篠笛のロングトーンで余韻
    at(groove, 14); at(melody, 14, octave=12, gain=0.85); at(shamisen_riff, 14, 0.4)
    song.kick(15, 0, 1.3); song.add(taiko(True, 1.3), 15, 0, 'drums'); song.add(snare(1.2), 15, 0, 'drums')
    song.add(saw_chord([62, 66, 69, 74], BAR * 3 + TAIL, cut=1600) * 1.6, 15)
    song.add(bass(38, BAR * 2), 15)
    for k, m in enumerate([62, 66, 69, 74, 78, 81, 86]): song.add(koto(m, 3.0), 15, k * 0.15, pan=(k - 3) / 6, gain=0.7)
    song.add(fue(74, BAR * 2.5), 15, 1, gain=0.8)

    mix = song.render()
    cuts = {'intro': (0, 2), 'map': (2, 3), 'montage': (11, 14), 'ending': (14, None)}
    # トピックは 2 周目(前の小節の余韻を含んだ状態)から切り出す。bar 7〜10 = G, A, F#m, Bm
    for i, k in enumerate('abcd'): cuts[f'spot_{k}'] = (7 + i, 8 + i)
    for name, (a, b) in cuts.items():
        seg = mix[int(round(a * BAR * SR)): (int(round(b * BAR * SR)) if b else None)]
        with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((seg * 32767).astype(np.int16).tobytes())
        print('wrote', name, round(len(seg) / SR, 3), 's')
    # 確認用に通しの曲も書き出す(PV には使わない)
    with wave.open(os.path.join(os.path.dirname(__file__), '_full_song.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())


if __name__ == '__main__':
    main()
