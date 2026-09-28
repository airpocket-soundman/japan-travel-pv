// 音声パートを指定の位置に並べて、ブラウザ内で 1 本の WAV に合成する。
// パートを別々の <Audio> で鳴らすと場面の継ぎ目で途切れるため、1 本にまとめてから再生・書き出しする。
import {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';

export type AudioPart = {url: string; at: number; volume?: number}; // at: 秒

const SR = 44100;
const decoded = new Map<string, Promise<AudioBuffer>>();
const mixed = new Map<string, Promise<string>>();

const decode = (url: string) => {
	if (!decoded.has(url)) {
		decoded.set(
			url,
			fetch(url)
				.then((r) => r.arrayBuffer())
				.then((b) => new OfflineAudioContext(2, 1, SR).decodeAudioData(b)),
		);
	}
	return decoded.get(url)!;
};

const toWav = (buf: AudioBuffer) => {
	const ch = buf.numberOfChannels;
	const n = buf.length;
	const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
	const str = (o: number, s: string) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
	str(0, 'RIFF');
	data.setUint32(4, 36 + n * ch * 2, true);
	str(8, 'WAVEfmt ');
	data.setUint32(16, 16, true);
	data.setUint16(20, 1, true);
	data.setUint16(22, ch, true);
	data.setUint32(24, buf.sampleRate, true);
	data.setUint32(28, buf.sampleRate * ch * 2, true);
	data.setUint16(32, ch * 2, true);
	data.setUint16(34, 16, true);
	str(36, 'data');
	data.setUint32(40, n * ch * 2, true);
	const chans = [...Array(ch)].map((_, c) => buf.getChannelData(c));
	let o = 44;
	for (let i = 0; i < n; i++) {
		for (let c = 0; c < ch; c++) {
			const v = Math.max(-1, Math.min(1, chans[c][i]));
			data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
			o += 2;
		}
	}
	return new Blob([data], {type: 'audio/wav'});
};

/** パートを合成した WAV の blob URL を返す(同じ組み合わせは使い回す) */
export const mixAudio = (parts: AudioPart[], total: number, fadeOut = 1.5) => {
	const key = JSON.stringify([parts, total, fadeOut]);
	if (!mixed.has(key)) {
		mixed.set(
			key,
			(async () => {
				const buffers = await Promise.all(parts.map((p) => decode(p.url)));
				const ctx = new OfflineAudioContext(2, Math.ceil(total * SR), SR);
				const master = ctx.createGain();
				master.connect(ctx.destination);
				master.gain.setValueAtTime(1, Math.max(0, total - fadeOut));
				master.gain.linearRampToValueAtTime(0, total);
				parts.forEach((p, i) => {
					const src = ctx.createBufferSource();
					src.buffer = buffers[i];
					const g = ctx.createGain();
					g.gain.value = p.volume ?? 1;
					src.connect(g).connect(master);
					src.start(p.at);
				});
				return URL.createObjectURL(toWav(await ctx.startRendering()));
			})(),
		);
	}
	return mixed.get(key)!;
};

/** 映像コンポーネントの中で使うフック。合成が終わるまで描画(書き出し)を待たせる */
export const useMixedAudio = (parts: AudioPart[], total: number) => {
	const key = JSON.stringify([parts, total]);
	const [state, setState] = useState<{key: string; url: string} | null>(null);
	const [handle, setHandle] = useState<number | null>(null);
	useEffect(() => {
		if (!parts.length) return;
		const h = delayRender('mix audio');
		setHandle(h);
		let alive = true;
		mixAudio(parts, total)
			.then((url) => alive && setState({key, url}))
			.catch((e) => console.warn('BGM の合成に失敗しました', e))
			.finally(() => continueRender(h));
		return () => {
			alive = false;
			continueRender(h);
		};
	}, [key]); // eslint-disable-line react-hooks/exhaustive-deps
	void handle;
	return state?.key === key ? state.url : state?.url ?? null;
};
