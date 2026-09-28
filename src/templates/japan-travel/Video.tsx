// 日本観光 PV の映像本体(30 秒・ポップ版)。
// ブラウザ内書き出し(@remotion/web-renderer)に対応させるため、
// radial-gradient / mix-blend-mode / writing-mode / z-index は使わない。
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {geoMercator} from 'd3-geo';
import type {TemplateProps} from '../../editor/types';
import {useMixedAudio} from '../../editor/audioMix';
import {fontCss} from '../../editor/layers/fonts';
import {L, LayerProvider, useSettle} from '../../editor/layers/runtime';
import {ENDING_LEN, FPS, INTRO_LEN, MAP_LEN, MONTAGE_LEN, SPOT_LEN, type JapanTravelConfig, type Spot} from './config';
import {INSET, INSET_PATH, inInset, MAIN, MAIN_PATH, MAP_H, MAP_W} from './japanMap';
import {LAYERS} from './layers';

type P = TemplateProps<JapanTravelConfig>;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const INK = '#1b1b3a';
const PREMOUNT = 30; // 場面を 1 秒前から先読みして、写真の読み込み待ちで止まらないようにする

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

// ケン・バーンズ(ゆっくりズーム+パン)する写真
const Photo: React.FC<{src?: string; dur: number; amount: number; dir?: number; zoomOut?: boolean}> = ({src, dur, amount, dir = 1, zoomOut}) => {
	const frame = useCurrentFrame();
	const [a, b] = zoomOut ? [1 + 0.14 * amount, 1] : [1, 1 + 0.14 * amount];
	const s = interpolate(frame, [0, dur], [a, b], clamp);
	const x = interpolate(frame, [0, dur], [-24 * amount * dir, 24 * amount * dir], clamp);
	if (!src) return <AbsoluteFill style={{background: '#333'}} />;
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `translateX(${x}px) scale(${s})`}} />
		</AbsoluteFill>
	);
};

const Shade: React.FC<{amount: number; from?: 'bottom' | 'left'}> = ({amount, from = 'bottom'}) => (
	<AbsoluteFill
		style={{
			background:
				from === 'left'
					? `linear-gradient(90deg, rgba(0,0,0,${amount * 1.6}) 0%, rgba(0,0,0,${amount * 0.5}) 50%, rgba(0,0,0,0) 80%)`
					: `linear-gradient(0deg, rgba(0,0,0,${amount * 1.6}) 0%, rgba(0,0,0,${amount * 0.4}) 55%, rgba(0,0,0,${amount * 0.2}) 100%)`,
		}}
	/>
);

// 場面の頭で、斜めのストライプが横切る(カットの継ぎ目を隠す)
const Sweep: React.FC<{colors: string[]}> = ({colors}) => {
	const frame = useCurrentFrame();
	if (frame > 12) return null;
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			{colors.map((c, i) => {
				const p = interpolate(frame - i * 1.5, [0, 10], [-0.3, 1.3], {...clamp, easing: Easing.inOut(Easing.cubic)});
				return <div key={i} style={{position: 'absolute', top: -300, bottom: -300, width: 360, left: `${p * 100}%`, marginLeft: -180 + i * 150, background: c, transform: 'skewX(-20deg)'}} />;
			})}
		</AbsoluteFill>
	);
};

// ふわふわ漂う紙吹雪
const Confetti: React.FC<{colors: string[]; seed: string; count?: number}> = ({colors, seed, count = 26}) => {
	const frame = useCurrentFrame();
	return (
		<AbsoluteFill>
			{Array.from({length: count}, (_, i) => {
				const r = (k: string) => random(`${seed}${i}${k}`);
				const size = 10 + r('s') * 22;
				const x = r('x') * 1920 + Math.sin(frame / 20 + r('p') * 6) * 30;
				const y = ((r('y') * 1240 + frame * (1.5 + r('v') * 2.5)) % 1240) - 80;
				const shape = r('k');
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: x,
							top: y,
							width: size,
							height: shape < 0.5 ? size : size * 0.45,
							borderRadius: shape < 0.33 ? '50%' : 3,
							background: colors[i % colors.length],
							transform: `rotate(${frame * (2 + r('r') * 4) + r('a') * 360}deg)`,
							opacity: 0.9,
						}}
					/>
				);
			})}
		</AbsoluteFill>
	);
};

const JapanMap: React.FC<{spots: Spot[]; progress: number; active?: number; accent: string; mini?: boolean}> = ({spots, progress, active, accent, mini}) => {
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
			<rect x={INSET.box.x} y={INSET.box.y} width={INSET.box.w} height={INSET.box.h} rx={16} fill="rgba(255,255,255,0.08)" stroke="#fff" strokeWidth={3} strokeDasharray="10 8" />
			<path d={MAIN_PATH} fill={mini ? 'rgba(255,255,255,0.85)' : '#ffffff'} stroke={INK} strokeWidth={mini ? 5 : 3} strokeLinejoin="round" />
			<path d={INSET_PATH} fill={mini ? 'rgba(255,255,255,0.85)' : '#ffffff'} stroke={INK} strokeWidth={mini ? 5 : 3} strokeLinejoin="round" />
			{!mini && segs.map((s, k) => (s ? <line key={k} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke={accent} strokeWidth={7} strokeLinecap="round" strokeDasharray="2 14" /> : null))}
			{pts.map((p, i) => {
				const shown = mini || progress * (spots.length - 1) >= i - 0.05;
				const isActive = active === i;
				const pulse = isActive ? 1 + 0.6 * ((frame % 20) / 20) : 1;
				const r = mini ? (isActive ? 26 : 12) : 14;
				return (
					<g key={i} opacity={shown ? (active === undefined || isActive ? 1 : 0.5) : 0}>
						{isActive && <circle cx={p[0]} cy={p[1]} r={r * 1.4 * pulse} fill="none" stroke={spots[i].color} strokeWidth={6} opacity={2 - pulse} />}
						<circle cx={p[0]} cy={p[1]} r={r} fill={spots[i].color} stroke={INK} strokeWidth={4} />
					</g>
				);
			})}
		</svg>
	);
};

// ---------------------------------------------------------------- scenes

const Intro: React.FC<P> = ({config: c, assets}) => {
	const tokens = {accent: c.style.accent, sub: c.style.sub};
	return (
		<AbsoluteFill>
			<Photo src={assets[c.intro.photo]} dur={INTRO_LEN} amount={c.style.kenBurns} zoomOut />
			<Shade amount={c.style.overlay} />
			{c.style.confetti && <Confetti colors={[c.style.accent, c.style.sub, '#ffffff', '#29c7ff']} seed="intro" />}
			<L id="intro.kicker" text={c.intro.kicker} tokens={tokens} />
			<L id="intro.title" text={c.intro.title} tokens={tokens} />
			<L id="intro.subtitle" text={c.intro.subtitle} tokens={tokens} />
		</AbsoluteFill>
	);
};

const MapScene: React.FC<P> = ({config: c}) => {
	const frame = useCurrentFrame();
	const tokens = {accent: c.style.accent, sub: c.style.sub};
	const progress = interpolate(frame, [4, MAP_LEN - 12], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
	const pts = c.spots.map(project);
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{background: `linear-gradient(135deg, ${c.style.accent} 0%, #7b2ff7 100%)`}} />
			<AbsoluteFill
				style={{
					backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%)',
					backgroundSize: '90px 90px',
					backgroundPosition: `${frame * 2}px 0`,
				}}
			/>
			<L id="map.map" tokens={tokens} style={{width: 980, height: 980}}>
				<div style={{position: 'relative', width: 980, height: 980}}>
					<JapanMap spots={c.spots} progress={progress} accent={c.style.sub} />
					{placeLabels(
						pts.map(([x, y]) => [x * 0.98, y * 0.98] as [number, number]),
						c.spots.map((s) => s.name),
						28,
					).map((pos, i) => {
						const show = interpolate(progress * (c.spots.length - 1) - i, [0, 0.3], [0, 1], clamp);
						return (
							<div key={i} style={{position: 'absolute', left: pos.x, top: pos.y, opacity: show, transform: `scale(${0.6 + 0.4 * show})`, background: INK, color: '#fff', fontFamily: fontCss(c.style.jpFont, {jp: 'sans-serif', en: 'sans-serif'}), fontWeight: 800, fontSize: 24, lineHeight: 1.2, padding: '2px 10px', borderRadius: 999, whiteSpace: 'nowrap'}}>
								{c.spots[i].name}
							</div>
						);
					})}
				</div>
			</L>
			<L id="map.caption" text={c.map.caption} tokens={{...tokens, accent: INK}} />
			<L id="map.subtitle" text={c.map.subtitle} tokens={tokens} />
			<Sweep colors={[c.style.sub, '#ffffff', c.style.accent]} />
		</AbsoluteFill>
	);
};

const SpotScene: React.FC<P & {i: number}> = ({config: c, assets, i}) => {
	const s = c.spots[i];
	const n = c.spots.length;
	const tokens = {accent: s.color, sub: c.style.sub};
	return (
		<AbsoluteFill>
			<Photo src={assets[s.photo]} dur={SPOT_LEN} amount={c.style.kenBurns} dir={i % 2 ? -1 : 1} />
			<Shade amount={c.style.overlay} from="left" />
			<Shade amount={c.style.overlay * 0.6} />
			<L id="spot.counter" text={`${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`} tokens={tokens} />
			<L id="spot.tag" text={`#${s.region}`} tokens={tokens} />
			<L id="spot.name" text={s.name} tokens={tokens} />
			<L id="spot.en" text={s.en} tokens={tokens} />
			<L id="spot.catch" text={s.catch} tokens={tokens} />
			<L id="spot.minimap" tokens={tokens} style={{width: 330, height: 330}}>
				<div style={{width: 330, height: 330}}>
					<JapanMap spots={c.spots} progress={1} active={i} accent={s.color} mini />
				</div>
			</L>
			<Sweep colors={[s.color, c.style.sub, '#ffffff']} />
		</AbsoluteFill>
	);
};

// 写真カードが 1 拍ずつポンポン積み重なるコラージュ
const Montage: React.FC<P> = ({config: c, assets}) => {
	const settle = useSettle();
	const now = useCurrentFrame();
	const frame = settle ? MONTAGE_LEN : now; // レイアウト編集中は全カードを表示
	const {fps} = useVideoConfig();
	const tokens = {accent: c.style.accent, sub: c.style.sub};
	const items = c.montage.items;
	const each = MONTAGE_LEN / Math.max(1, items.length);
	const cols = Math.min(4, Math.max(1, Math.ceil(items.length / 2)));
	const rows = Math.ceil(items.length / cols);
	const cw = 1500 / cols;
	const ch = Math.min(360, 700 / rows);
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{background: `linear-gradient(160deg, ${c.style.sub} 0%, ${c.style.accent} 100%)`}} />
			<AbsoluteFill
				style={{
					backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.14) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.14) 75%, transparent 75%)',
					backgroundSize: '90px 90px',
					backgroundPosition: `${-now * 2}px 0`,
				}}
			/>
			<L id="montage.cards" tokens={tokens} style={{width: 1500, height: rows * ch}}>
				<div style={{position: 'relative', width: 1500, height: rows * ch}}>
					{items.map((it, k) => {
						const p = spring({frame: frame - k * each, fps, config: {damping: 10, stiffness: 190, mass: 0.6}});
						const col = k % cols;
						const row = Math.floor(k / cols);
						const rot = (random(`rot${k}`) - 0.5) * 14;
						const w = cw * 0.86;
						const h = ch * 0.84;
						return (
							<div
								key={k}
								style={{
									position: 'absolute',
									left: col * cw + (cw - w) / 2 + (random(`jx${k}`) - 0.5) * 30,
									top: row * ch + (ch - h) / 2 + (random(`jy${k}`) - 0.5) * 20,
									width: w,
									height: h,
									background: '#fff',
									padding: 10,
									borderRadius: 18,
									boxShadow: `10px 10px 0 ${INK}`,
									transform: `scale(${p}) rotate(${rot * p}deg)`,
									opacity: frame >= k * each ? 1 : 0,
								}}
							>
								<Img src={assets[it.photo]} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, display: 'block'}} />
								<div
									style={{
										position: 'absolute',
										left: -12,
										bottom: -16,
										background: k % 2 ? c.style.accent : INK,
										color: '#fff',
										fontFamily: fontCss(c.style.jpFont, {jp: 'sans-serif', en: 'sans-serif'}),
										fontWeight: 800,
										fontSize: 30,
										padding: '4px 18px',
										borderRadius: 999,
										transform: 'rotate(-6deg)',
										whiteSpace: 'nowrap',
									}}
								>
									{it.label}
								</div>
							</div>
						);
					})}
				</div>
			</L>
			<L id="montage.title" text={c.montage.title} tokens={{...tokens, accent: INK}} />
			<L id="montage.subtitle" text={c.montage.subtitle} tokens={{...tokens, sub: '#ffffff'}} />
			<Sweep colors={[c.style.accent, '#ffffff', c.style.sub]} />
		</AbsoluteFill>
	);
};

const Ending: React.FC<P> = ({config: c, assets}) => {
	const frame = useCurrentFrame();
	const tokens = {accent: c.style.accent, sub: c.style.sub};
	const fade = interpolate(frame, [ENDING_LEN - 24, ENDING_LEN], [1, 0], clamp);
	return (
		<AbsoluteFill style={{opacity: fade}}>
			<Photo src={assets[c.ending.photo]} dur={ENDING_LEN} amount={c.style.kenBurns * 0.6} />
			<Shade amount={c.style.overlay * 1.1} />
			{c.style.confetti && <Confetti colors={[c.style.accent, c.style.sub, '#ffffff', '#29c7ff']} seed="ending" count={34} />}
			<L id="ending.title" text={c.ending.title} tokens={tokens} />
			<L id="ending.subtitle" text={c.ending.subtitle} tokens={tokens} />
			<L id="ending.note" text={c.ending.note} tokens={tokens} />
			<Sweep colors={[c.style.sub, c.style.accent, '#ffffff']} />
		</AbsoluteFill>
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

/** BGM のパートの並び。パートの境目は小節の頭に揃う */
const musicParts = (c: JapanTravelConfig, t: ReturnType<typeof layout>) => [
	{id: 'bgm:intro', at: t.intro},
	{id: 'bgm:map', at: t.map},
	...c.spots.map((_, i) => ({id: i % 2 ? 'bgm:spot_b' : 'bgm:spot_a', at: t.spots + i * SPOT_LEN})),
	{id: 'bgm:montage', at: t.montage},
	{id: 'bgm:ending', at: t.ending},
];

export const JapanTravelVideo: React.FC<P> = (props) => {
	const {config: c, assets, editor} = props;
	const t = layout(c);
	const parts = musicParts(c, t)
		.filter((p) => assets[p.id])
		.map((p) => ({url: assets[p.id], at: p.at / FPS}));
	const bgm = useMixedAudio(c.music.enabled ? parts : [], t.total / FPS);
	const theme = {jp: fontCss(c.style.jpFont, {jp: 'sans-serif', en: 'sans-serif'}), en: fontCss(c.style.enFont, {jp: 'sans-serif', en: 'sans-serif'})};
	const glyphs = JSON.stringify([c.intro, c.map, c.spots.map((s) => [s.name, s.en, s.region, s.catch]), c.montage, c.ending]) + '0123456789/#!?';
	const seq = (from: number, len: number) => ({from, durationInFrames: len, premountFor: from > 0 ? PREMOUNT : 0});
	return (
		<LayerProvider defs={LAYERS} overrides={c.layout} theme={theme} textColor={c.style.textColor} settle={editor?.settle} glyphs={glyphs}>
			<AbsoluteFill style={{background: '#000'}}>
				<Sequence {...seq(t.intro, INTRO_LEN)} name="オープニング">
					<Intro {...props} />
				</Sequence>
				<Sequence {...seq(t.map, MAP_LEN)} name="地図">
					<MapScene {...props} />
				</Sequence>
				{c.spots.map((s, i) => (
					<Sequence key={i} {...seq(t.spots + i * SPOT_LEN, SPOT_LEN)} name={s.name}>
						<SpotScene {...props} i={i} />
					</Sequence>
				))}
				<Sequence {...seq(t.montage, MONTAGE_LEN)} name="モンタージュ">
					<Montage {...props} />
				</Sequence>
				<Sequence {...seq(t.ending, ENDING_LEN)} name="エンディング">
					<Ending {...props} />
				</Sequence>
				{bgm && c.music.enabled && <Audio src={bgm} volume={c.music.volume} />}
			</AbsoluteFill>
		</LayerProvider>
	);
};
