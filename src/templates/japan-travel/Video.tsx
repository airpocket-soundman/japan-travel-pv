// 日本観光 PV の映像本体。
// ブラウザ内書き出し(@remotion/web-renderer)に対応させるため、
// radial-gradient / mix-blend-mode / writing-mode / z-index は使わない。
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {geoMercator} from 'd3-geo';
import type {TemplateProps} from '../../editor/types';
import {ENDING_LEN, INTRO_LEN, MAP_LEN, MONTAGE_LEN, SPOT_LEN, type JapanTravelConfig, type Spot} from './config';
import {INSET, INSET_PATH, inInset, MAIN, MAIN_PATH, MAP_H, MAP_W} from './japanMap';

type P = TemplateProps<JapanTravelConfig>;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.out(Easing.cubic);
const pMain = geoMercator().scale(MAIN.scale).translate(MAIN.translate);
const pInset = geoMercator().scale(INSET.scale).translate(INSET.translate);
// 南西諸島は左上の別枠に描くので、投影も切り替える
const project = (s: {lat: number; lng: number}): [number, number] => (inInset(s.lat, s.lng) ? pInset : pMain)([s.lng, s.lat]) ?? [0, 0];

// 地名ラベルが重ならないよう、右・左・下・上の順に空いている位置を選ぶ
const placeLabels = (pts: [number, number][], names: string[], size: number) => {
	const boxes: {x: number; y: number; w: number; h: number}[] = pts.map(([x, y]) => ({x: x - 12, y: y - 12, w: 24, h: 24}));
	const hit = (a: (typeof boxes)[0]) => boxes.some((b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h);
	return pts.map(([x, y], i) => {
		const w = [...names[i]].length * size + 8;
		const h = size + 6;
		const cands = [
			{x: x + 16, y: y - h / 2},
			{x: x - 16 - w, y: y - h / 2},
			{x: x - w / 2, y: y + 14},
			{x: x - w / 2, y: y - 14 - h},
			{x: x + 16, y: y + 8},
			{x: x - 16 - w, y: y + 8},
		];
		const pick = cands.find((c) => !hit({...c, w, h})) ?? cands[0];
		boxes.push({...pick, w, h});
		return pick;
	});
};

const fonts = (c: JapanTravelConfig) =>
	c.style.headingFont === 'mincho'
		? {jp: '"Shippori Mincho B1", "Noto Serif JP", serif', en: '"Cormorant Garamond", serif', enWeight: 500}
		: {jp: '"Zen Kaku Gothic New", "Noto Sans JP", sans-serif', en: '"Montserrat", sans-serif', enWeight: 600};

// 設定の全テキストのグリフを読み込み終えるまで描画を待つ(書き出し時の文字化け・フォント差し替わり防止)
const useFontsReady = (c: JapanTravelConfig) => {
	const [handle] = useState(() => delayRender('fonts'));
	const text = JSON.stringify(c).replace(/[{}"\[\]:,]/g, '');
	useEffect(() => {
		const f = fonts(c);
		const families = [...f.jp.split(',').slice(0, 1), ...f.en.split(',').slice(0, 1)];
		Promise.all(families.flatMap((fam) => [400, 700].map((w) => document.fonts.load(`${w} 40px ${fam}`, text))))
			.catch(() => undefined)
			.finally(() => continueRender(handle));
	}, [handle]); // eslint-disable-line react-hooks/exhaustive-deps
};

// ケン・バーンズ(ゆっくりズーム+パン)する写真
const Photo: React.FC<{src?: string; dur: number; amount: number; dir?: number; from?: number; to?: number}> = ({
	src,
	dur,
	amount,
	dir = 1,
	from,
	to,
}) => {
	const frame = useCurrentFrame();
	const a = from ?? (dir > 0 ? 1 : 1 + 0.12 * amount);
	const b = to ?? (dir > 0 ? 1 + 0.12 * amount : 1);
	const s = interpolate(frame, [0, dur], [a, b], clamp);
	const x = interpolate(frame, [0, dur], [-20 * amount * dir, 20 * amount * dir], clamp);
	if (!src) return <AbsoluteFill style={{background: '#222'}} />;
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `translateX(${x}px) scale(${s})`}} />
		</AbsoluteFill>
	);
};

// 1 文字ずつ下から現れる見出し
const Chars: React.FC<{text: string; delay: number; step?: number; style: React.CSSProperties}> = ({text, delay, step = 3, style}) => {
	const frame = useCurrentFrame();
	return (
		<div style={{display: 'flex', flexWrap: 'nowrap', whiteSpace: 'pre', ...style}}>
			{[...text].map((ch, i) => {
				const t = interpolate(frame - delay - i * step, [0, 14], [0, 1], {...clamp, easing: ease});
				return (
					<span key={i} style={{display: 'inline-block', opacity: t, transform: `translateY(${(1 - t) * 40}px)`}}>
						{ch}
					</span>
				);
			})}
		</div>
	);
};

const Fade: React.FC<{dur: number; inLen?: number; outLen?: number; children: React.ReactNode}> = ({dur, inLen = 0, outLen = 0, children}) => {
	const frame = useCurrentFrame();
	const o = Math.min(inLen ? interpolate(frame, [0, inLen], [0, 1], clamp) : 1, outLen ? interpolate(frame, [dur - outLen, dur], [1, 0], clamp) : 1);
	return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

// ---------------------------------------------------------------- scenes

const Intro: React.FC<P> = ({config: c, assets}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const f = fonts(c);
	const sun = spring({frame: frame - 18, fps, config: {damping: 14, mass: 0.8}});
	const line = interpolate(frame, [40, 70], [0, 1], {...clamp, easing: ease});
	return (
		<Fade dur={INTRO_LEN} inLen={12} outLen={14}>
			<Photo src={assets[c.intro.photo]} dur={INTRO_LEN} amount={c.style.kenBurns} from={1 + 0.15 * c.style.kenBurns} to={1} />
			<AbsoluteFill style={{background: `linear-gradient(180deg, rgba(0,0,0,${c.style.overlay * 0.3}) 0%, rgba(0,0,0,${c.style.overlay * 1.3}) 100%)`}} />
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: c.style.textColor}}>
				<div style={{width: 120, height: 120, borderRadius: '50%', background: c.style.accent, transform: `scale(${sun})`, marginBottom: 40, boxShadow: '0 0 60px rgba(0,0,0,0.35)'}} />
				<Chars text={c.intro.kicker} delay={28} step={1} style={{fontFamily: f.en, fontWeight: f.enWeight, fontSize: 30, letterSpacing: '0.5em', marginBottom: 24}} />
				<Chars text={c.intro.title} delay={48} step={4} style={{fontFamily: f.jp, fontWeight: 700, fontSize: 128, textShadow: '0 6px 30px rgba(0,0,0,0.5)'}} />
				<div style={{width: 520 * line, height: 2, background: c.style.textColor, margin: '34px 0 26px', opacity: 0.8}} />
				<Chars text={c.intro.subtitle} delay={80} step={1} style={{fontFamily: f.en, fontStyle: 'italic', fontSize: 40, letterSpacing: '0.08em'}} />
			</AbsoluteFill>
		</Fade>
	);
};

const JapanMap: React.FC<{spots: Spot[]; progress: number; active?: number; accent: string; dim?: boolean}> = ({spots, progress, active, accent, dim}) => {
	const frame = useCurrentFrame();
	const pts = spots.map(project);
	const inset = spots.map((s) => inInset(s.lat, s.lng));
	// 区間ごとに順番に線を伸ばす。本土と南西諸島の枠をまたぐ区間は線を引かない
	const segs = pts.slice(1).map((p, k) => {
		const a = pts[k];
		const t = Math.max(0, Math.min(1, progress * (pts.length - 1) - k));
		return inset[k] !== inset[k + 1] || t <= 0 ? null : ([a, [a[0] + (p[0] - a[0]) * t, a[1] + (p[1] - a[1]) * t]] as const);
	});
	return (
		<svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" height="100%">
			<rect x={INSET.box.x} y={INSET.box.y} width={INSET.box.w} height={INSET.box.h} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} strokeDasharray="6 5" />
			<path d={MAIN_PATH} fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.55)" strokeWidth={1.4} />
			<path d={INSET_PATH} fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.55)" strokeWidth={1.4} />
			{!dim &&
				segs.map((s, k) => (s ? <line key={k} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke={accent} strokeWidth={3} strokeLinecap="round" /> : null))}
			{pts.map((p, i) => {
				const shown = dim || progress * (spots.length - 1) >= i - 0.05;
				const isActive = active === i;
				const pulse = isActive ? 1 + 0.5 * ((frame % 30) / 30) : 1;
				return (
					<g key={i} opacity={shown ? (active === undefined || isActive ? 1 : 0.45) : 0}>
						{isActive && <circle cx={p[0]} cy={p[1]} r={14 * pulse} fill="none" stroke={spots[i].color} strokeWidth={3} opacity={2 - pulse} />}
						<circle cx={p[0]} cy={p[1]} r={isActive ? 11 : 8} fill={spots[i].color} stroke="#fff" strokeWidth={3} />
					</g>
				);
			})}
		</svg>
	);
};

const MapScene: React.FC<P> = ({config: c}) => {
	const frame = useCurrentFrame();
	const f = fonts(c);
	const progress = interpolate(frame, [10, MAP_LEN - 20], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
	return (
		<Fade dur={MAP_LEN} inLen={10} outLen={8}>
			<AbsoluteFill style={{background: 'linear-gradient(135deg, #0b1f3a 0%, #102a4c 55%, #0b1f3a 100%)'}} />
			<AbsoluteFill
				style={{
					backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
					backgroundSize: '60px 60px',
				}}
			/>
			<div style={{position: 'absolute', right: 120, top: 40, width: 1000, height: 1000}}>
				<JapanMap spots={c.spots} progress={progress} accent={c.style.accent} />
				{placeLabels(c.spots.map(project), c.spots.map((s) => s.name), 26).map((pos, i) => {
					const show = interpolate(progress * (c.spots.length - 1) - i, [0, 0.4], [0, 1], clamp);
					return (
						<div key={i} style={{position: 'absolute', left: pos.x, top: pos.y, opacity: show, color: '#fff', fontFamily: f.jp, fontWeight: 700, fontSize: 26, lineHeight: 1.2, whiteSpace: 'nowrap', textShadow: '0 2px 8px rgba(0,0,0,0.7)'}}>
							{c.spots[i].name}
						</div>
					);
				})}
				<div style={{position: 'absolute', left: INSET.box.x + 10, top: INSET.box.y + 8, color: 'rgba(255,255,255,0.6)', fontFamily: f.jp, fontSize: 20}}>南西諸島</div>
			</div>
			<div style={{position: 'absolute', left: 140, top: 400, color: '#fff'}}>
				<Chars text={c.map.caption} delay={6} step={3} style={{fontFamily: f.jp, fontWeight: 700, fontSize: 72}} />
				<Chars text={c.map.subtitle} delay={24} step={0.6} style={{fontFamily: f.en, fontStyle: 'italic', fontSize: 34, marginTop: 20, opacity: 0.85}} />
			</div>
		</Fade>
	);
};

const SpotScene: React.FC<P & {i: number}> = ({config: c, assets, i}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = c.spots[i];
	const f = fonts(c);
	const n = c.spots.length;
	// 切り替わりで、テーマ色の帯が画面を横切る
	const sweep = interpolate(frame, [0, 16], [-0.2, 1.4], {...clamp, easing: Easing.inOut(Easing.cubic)});
	const bar = spring({frame: frame - 16, fps, config: {damping: 16}});
	const out = interpolate(frame, [SPOT_LEN - 10, SPOT_LEN], [1, 0], clamp);
	return (
		<AbsoluteFill>
			<Photo src={assets[s.photo]} dur={SPOT_LEN} amount={c.style.kenBurns} dir={i % 2 ? -1 : 1} />
			<AbsoluteFill style={{background: `linear-gradient(90deg, rgba(0,0,0,${c.style.overlay * 1.5}) 0%, rgba(0,0,0,${c.style.overlay * 0.6}) 45%, rgba(0,0,0,0) 75%)`}} />
			<AbsoluteFill style={{background: `linear-gradient(0deg, rgba(0,0,0,${c.style.overlay}) 0%, rgba(0,0,0,0) 40%)`}} />
			<div style={{position: 'absolute', left: 130, bottom: 150, color: c.style.textColor, opacity: out}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 22, marginBottom: 18, opacity: interpolate(frame, [12, 22], [0, 1], clamp)}}>
					<div style={{fontFamily: f.en, fontWeight: f.enWeight, fontSize: 30, letterSpacing: '0.2em'}}>
						{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
					</div>
					<div style={{background: s.color, color: '#fff', fontFamily: f.jp, fontWeight: 700, fontSize: 26, padding: '4px 20px', borderRadius: 4}}>{s.region}</div>
				</div>
				<Chars text={s.name} delay={14} step={4} style={{fontFamily: f.jp, fontWeight: 700, fontSize: 170, lineHeight: 1.05, textShadow: '0 6px 30px rgba(0,0,0,0.45)'}} />
				<Chars text={s.en} delay={24} step={1.2} style={{fontFamily: f.en, fontWeight: f.enWeight, fontSize: 40, letterSpacing: '0.45em', marginTop: 8}} />
				<div style={{width: 140 * bar, height: 6, background: s.color, margin: '26px 0 22px'}} />
				<Chars text={s.catch} delay={34} step={1.5} style={{fontFamily: f.jp, fontWeight: 400, fontSize: 44, textShadow: '0 2px 12px rgba(0,0,0,0.6)'}} />
			</div>
			<div style={{position: 'absolute', right: 70, bottom: 50, width: 330, height: 330, opacity: interpolate(frame, [18, 30], [0, 0.95], clamp) * out}}>
				<JapanMap spots={c.spots} progress={1} active={i} accent={c.style.accent} dim />
			</div>
			<div
				style={{
					position: 'absolute',
					top: -200,
					bottom: -200,
					width: 700,
					left: `${sweep * 100}%`,
					marginLeft: -350,
					background: s.color,
					transform: 'skewX(-18deg)',
					opacity: frame < 17 ? 1 : 0,
				}}
			/>
		</AbsoluteFill>
	);
};

// 判子風のラベル(縦書きは 1 文字ずつ縦に積む)
const Stamp: React.FC<{text: string; color: string; font: string}> = ({text, color, font}) => (
	<div style={{background: color, color: '#fff', padding: '18px 14px', borderRadius: 8, border: '4px solid rgba(255,255,255,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.35)'}}>
		{[...text].map((ch, k) => (
			<div key={k} style={{fontFamily: font, fontWeight: 700, fontSize: 64, lineHeight: 1.1}}>
				{ch === 'ー' ? '|' : ch}
			</div>
		))}
	</div>
);

const Montage: React.FC<P> = ({config: c, assets}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const f = fonts(c);
	const items = c.montage.items.length ? c.montage.items : [{photo: '', label: ''}];
	const each = Math.floor(MONTAGE_LEN / items.length);
	const k = Math.min(items.length - 1, Math.floor(frame / each));
	const local = frame - k * each;
	const item = items[k];
	const pop = spring({frame: local - 3, fps, config: {damping: 11, stiffness: 180}});
	const flash = interpolate(local, [0, 6], [0.35, 0], clamp);
	return (
		<AbsoluteFill>
			<Sequence key={k} from={k * each} durationInFrames={each} layout="none">
				<Photo src={assets[item.photo]} dur={each} amount={c.style.kenBurns * 1.4} from={1 + 0.12 * c.style.kenBurns} to={1} />
			</Sequence>
			<AbsoluteFill style={{background: `linear-gradient(180deg, rgba(0,0,0,${c.style.overlay}) 0%, rgba(0,0,0,0) 35%)`}} />
			<div style={{position: 'absolute', right: 150, top: 150, transform: `scale(${1.6 - 0.6 * pop}) rotate(${-8 * pop}deg)`, opacity: Math.min(1, pop * 1.5)}}>
				<Stamp text={item.label} color={c.style.accent} font={f.jp} />
			</div>
			<div style={{position: 'absolute', left: 110, top: 90, color: c.style.textColor}}>
				<div style={{fontFamily: f.jp, fontWeight: 700, fontSize: 64, textShadow: '0 4px 20px rgba(0,0,0,0.5)'}}>{c.montage.title}</div>
				<div style={{fontFamily: f.en, fontStyle: 'italic', fontSize: 32, opacity: 0.9}}>{c.montage.subtitle}</div>
			</div>
			<div style={{position: 'absolute', left: 110, bottom: 80, display: 'flex', gap: 10}}>
				{items.map((_, j) => (
					<div key={j} style={{width: 46, height: 6, borderRadius: 3, background: j <= k ? c.style.accent : 'rgba(255,255,255,0.4)'}} />
				))}
			</div>
			<AbsoluteFill style={{background: '#fff', opacity: flash}} />
		</AbsoluteFill>
	);
};

const Ending: React.FC<P> = ({config: c, assets}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const f = fonts(c);
	const sun = spring({frame: frame - 6, fps, config: {damping: 18, mass: 1.2}});
	return (
		<Fade dur={ENDING_LEN} inLen={10} outLen={36}>
			<Photo src={assets[c.ending.photo]} dur={ENDING_LEN} amount={c.style.kenBurns * 0.7} />
			<AbsoluteFill style={{background: `linear-gradient(180deg, rgba(0,0,0,${c.style.overlay * 0.5}) 0%, rgba(0,0,0,${c.style.overlay * 1.4}) 100%)`}} />
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: c.style.textColor}}>
				<div style={{width: 90, height: 90, borderRadius: '50%', background: c.style.accent, transform: `scale(${sun})`, marginBottom: 44}} />
				<Chars text={c.ending.title} delay={16} step={5} style={{fontFamily: f.jp, fontWeight: 700, fontSize: 150, textShadow: '0 6px 30px rgba(0,0,0,0.5)'}} />
				<Chars text={c.ending.subtitle} delay={50} step={1} style={{fontFamily: f.en, fontStyle: 'italic', fontSize: 46, marginTop: 26, letterSpacing: '0.06em'}} />
			</AbsoluteFill>
			<div style={{position: 'absolute', left: 0, right: 0, bottom: 46, textAlign: 'center', color: 'rgba(255,255,255,0.75)', fontFamily: '"Montserrat", sans-serif', fontSize: 20, letterSpacing: '0.04em', opacity: interpolate(frame, [80, 110], [0, 1], clamp)}}>
				{c.ending.note}
			</div>
		</Fade>
	);
};

// ---------------------------------------------------------------- timeline

export const layout = (c: JapanTravelConfig) => {
	const map = INTRO_LEN;
	const spots = map + MAP_LEN;
	const montage = spots + SPOT_LEN * c.spots.length;
	const ending = montage + MONTAGE_LEN;
	return {intro: 0, map, spots, montage, ending, total: ending + ENDING_LEN};
};

const TAIL = 90; // BGM 各パートの余韻(3 秒)

export const JapanTravelVideo: React.FC<P> = (props) => {
	const {config: c, assets} = props;
	useFontsReady(c);
	const t = layout(c);
	const vol = c.music.enabled ? c.music.volume : 0;
	const music = [
		{id: 'bgm:intro', from: t.intro, len: INTRO_LEN},
		{id: 'bgm:map', from: t.map, len: MAP_LEN},
		...c.spots.map((_, i) => ({id: i % 2 ? 'bgm:spot_b' : 'bgm:spot_a', from: t.spots + i * SPOT_LEN, len: SPOT_LEN})),
		{id: 'bgm:montage', from: t.montage, len: MONTAGE_LEN},
		{id: 'bgm:ending', from: t.ending, len: ENDING_LEN},
	];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<Sequence durationInFrames={INTRO_LEN} name="オープニング">
				<Intro {...props} />
			</Sequence>
			<Sequence from={t.map} durationInFrames={MAP_LEN} name="地図">
				<MapScene {...props} />
			</Sequence>
			{c.spots.map((s, i) => (
				<Sequence key={i} from={t.spots + i * SPOT_LEN} durationInFrames={SPOT_LEN} name={s.name}>
					<SpotScene {...props} i={i} />
				</Sequence>
			))}
			<Sequence from={t.montage} durationInFrames={MONTAGE_LEN} name="モンタージュ">
				<Montage {...props} />
			</Sequence>
			<Sequence from={t.ending} durationInFrames={ENDING_LEN} name="エンディング">
				<Ending {...props} />
			</Sequence>
			{vol > 0 &&
				music.map((m, i) =>
					assets[m.id] ? (
						<Sequence key={`a${i}`} from={m.from} durationInFrames={Math.min(m.len + TAIL, t.total - m.from)} layout="none">
							<Audio src={assets[m.id]} volume={vol} />
						</Sequence>
					) : null,
				)}
		</AbsoluteFill>
	);
};
