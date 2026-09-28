// テンプレートの映像内で使うレイヤー部品。
//   <LayerProvider defs overrides theme settle> で包み、各要素を <L id="spot.name" text="..."/> で描く。
// ブラウザ内書き出しの制約(z-index / mix-blend-mode 不可など)に合う CSS だけを使う。
import React, {createContext, useContext, useEffect, useState} from 'react';
import {continueRender, delayRender, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {firstFamily, fontCss, FONTS, type ThemeFonts} from './fonts';
import {ANCHOR_OFFSET, resolveStyle, type LayerDef, type LayerOverrides, type LayerStyle} from './types';

type Ctx = {defs: Map<string, LayerDef>; overrides: LayerOverrides; theme: ThemeFonts; settle: boolean; textColor: string};
const LayerCtx = createContext<Ctx | null>(null);

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const easeOut = Easing.out(Easing.cubic);

/** 使っているフォントの、使っている文字を読み込み終えるまで描画を待つ(書き出し時のフォント差し替わり防止) */
const useFontsReady = (families: string[], text: string) => {
	const [handle] = useState(() => delayRender('fonts'));
	useEffect(() => {
		Promise.all(families.flatMap((fam) => [400, 700].map((w) => document.fonts.load(`${w} 40px ${fam}`, text || 'a'))))
			.catch(() => undefined)
			.finally(() => continueRender(handle));
	}, [handle]); // eslint-disable-line react-hooks/exhaustive-deps
};

export const LayerProvider: React.FC<{
	defs: LayerDef[];
	overrides?: LayerOverrides;
	theme: ThemeFonts;
	textColor?: string;
	/** レイアウト編集中はアニメーションを止め、完成状態で表示する */
	settle?: boolean;
	/** フォントの読み込みを待つための文字列(設定の全テキストなど) */
	glyphs: string;
	children: React.ReactNode;
}> = ({defs, overrides = {}, theme, textColor = '#fff', settle = false, glyphs, children}) => {
	const map = new Map(defs.map((d) => [d.id, d]));
	const families = [
		...new Set([
			firstFamily(theme.jp),
			firstFamily(theme.en),
			...defs.map((d) => firstFamily(fontCss(resolveStyle(d, overrides).font, theme))),
		]),
	];
	useFontsReady(families, glyphs);
	return <LayerCtx.Provider value={{defs: map, overrides, theme, settle, textColor}}>{children}</LayerCtx.Provider>;
};

/** レイアウト編集中(アニメーション停止中)か。テンプレート独自の動きも完成状態で止めるのに使う */
export const useSettle = () => !!useContext(LayerCtx)?.settle;

export const useLayerStyle = (id: string): LayerStyle => {
	const c = useContext(LayerCtx);
	return resolveStyle(c?.defs.get(id), c?.overrides);
};

/** 登場の進み具合(0〜1)と退場の進み具合(0〜1) */
const useProgress = (s: LayerStyle) => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();
	const c = useContext(LayerCtx);
	if (c?.settle) return {t: 1, out: 0, frame, fps, spr: 1};
	const start = s.delay * fps;
	const len = Math.max(1, s.duration * fps);
	const t = s.animIn === 'none' ? 1 : interpolate(frame, [start, start + len], [0, 1], {...clamp, easing: easeOut});
	const outLen = Math.max(1, s.outDuration * fps);
	const out = s.animOut === 'none' ? 0 : interpolate(frame, [durationInFrames - outLen, durationInFrames], [0, 1], clamp);
	const spr = spring({frame: frame - start, fps, config: {damping: 11, stiffness: 160, mass: 0.7}});
	return {t, out, frame, fps, spr};
};

const enterTransform = (s: LayerStyle, t: number, spr: number) => {
	switch (s.animIn) {
		case 'slideUp':
			return {tf: `translateY(${(1 - t) * 60}px)`, o: t};
		case 'slideDown':
			return {tf: `translateY(${(t - 1) * 60}px)`, o: t};
		case 'slideLeft':
			return {tf: `translateX(${(1 - t) * 80}px)`, o: t};
		case 'slideRight':
			return {tf: `translateX(${(t - 1) * 80}px)`, o: t};
		case 'zoomIn':
			return {tf: `scale(${0.6 + 0.4 * t})`, o: t};
		case 'zoomOut':
			return {tf: `scale(${1.4 - 0.4 * t})`, o: t};
		case 'pop':
			return {tf: `scale(${spr})`, o: Math.min(1, spr * 2)};
		case 'blur':
			return {tf: '', o: t, blur: (1 - t) * 16};
		case 'wipe':
			return {tf: '', o: 1, clip: `inset(0 ${(1 - t) * 100}% 0 0)`};
		case 'fade':
			return {tf: '', o: t};
		case 'chars':
		case 'typewriter':
		case 'none':
		default:
			return {tf: '', o: 1};
	}
};

const exitTransform = (s: LayerStyle, out: number) => {
	switch (s.animOut) {
		case 'slideDown':
			return {tf: `translateY(${out * 60}px)`, o: 1 - out};
		case 'zoomOut':
			return {tf: `scale(${1 - 0.3 * out})`, o: 1 - out};
		case 'fade':
			return {tf: '', o: 1 - out};
		default:
			return {tf: '', o: 1};
	}
};

/** 1 文字ずつ現れるテキスト */
const Chars: React.FC<{text: string; s: LayerStyle; frame: number; fps: number; settle: boolean}> = ({text, s, frame, fps, settle}) => (
	<>
		{[...text].map((ch, i) => {
			if (ch === '\n') return <br key={i} />;
			const st = (s.delay + i * s.stagger) * fps;
			const t = settle ? 1 : interpolate(frame, [st, st + Math.max(1, s.duration * fps)], [0, 1], {...clamp, easing: easeOut});
			return (
				<span key={i} style={{display: 'inline-block', whiteSpace: 'pre', opacity: t, transform: `translateY(${(1 - t) * 0.6}em)`}}>
					{ch}
				</span>
			);
		})}
	</>
);

export const L: React.FC<{
	id: string;
	text?: string;
	children?: React.ReactNode;
	/** 色の指定で使える名前付きの色。'accent'(場面ごとのテーマ色)や 'sub' など */
	tokens?: Record<string, string>;
	style?: React.CSSProperties;
}> = ({id, text, children, tokens = {}, style}) => {
	const c = useContext(LayerCtx);
	const s = useLayerStyle(id);
	const def = c?.defs.get(id);
	const {t, out, frame, fps, spr} = useProgress(s);
	if (!s.visible) return null;
	const e = enterTransform(s, t, spr);
	const x = exitTransform(s, out);
	const [ax, ay] = ANCHOR_OFFSET[s.anchor];
	const isText = def?.kind !== 'block' && text !== undefined;
	const col = (v: string, fallback: string) => (v ? tokens[v] ?? v : fallback);
	const color = col(s.color, c?.textColor || '#fff');
	const bg = s.bg ? col(s.bg, 'transparent') : '';
	const sc = col(s.shadowColor, 'rgba(0,0,0,0.5)');
	const shadowCss =
		s.shadow === 'hard' ? `0.06em 0.06em 0 ${sc}` : s.shadow === 'soft' ? '0 4px 24px rgba(0,0,0,0.55)' : s.shadow === 'glow' ? `0 0 0.35em ${sc}` : '';
	const boxShadow = s.shadow === 'hard' ? `8px 8px 0 ${sc}` : s.shadow === 'soft' ? '0 10px 30px rgba(0,0,0,0.35)' : s.shadow === 'glow' ? `0 0 30px ${sc}` : '';
	let content: React.ReactNode = children;
	if (isText) {
		if (s.animIn === 'chars') content = <Chars text={text!} s={s} frame={frame} fps={fps} settle={!!c?.settle} />;
		else if (s.animIn === 'typewriter') {
			const n = [...text!].length;
			const shown = c?.settle ? n : Math.floor(interpolate(frame, [s.delay * fps, (s.delay + s.stagger * n) * fps], [0, n], clamp));
			content = [...text!].slice(0, shown).join('');
		} else content = text;
	}
	return (
		<div
			data-layer={id}
			style={{
				position: 'absolute',
				left: s.x,
				top: s.y,
				transform: `translate(${ax}%, ${ay}%) rotate(${s.rotate}deg) scale(${s.scale}) ${e.tf} ${x.tf}`,
				transformOrigin: `${-ax}% ${-ay}%`,
				opacity: s.opacity * e.o * x.o,
				filter: e.blur ? `blur(${e.blur}px)` : undefined,
				clipPath: e.clip,
				...(isText
					? {
							fontFamily: fontCss(s.font, c?.theme ?? {jp: 'serif', en: 'serif'}),
							fontSize: s.size,
							fontWeight: s.weight,
							fontStyle: s.italic ? 'italic' : 'normal',
							letterSpacing: `${s.spacing}em`,
							lineHeight: s.lineHeight,
							textAlign: s.align,
							color,
							whiteSpace: 'pre',
							WebkitTextStroke: s.stroke ? `${s.stroke}px ${col(s.strokeColor, '#000')}` : undefined,
							paintOrder: 'stroke fill',
							textShadow: bg ? undefined : shadowCss || undefined,
						}
					: {color}),
				...(bg ? {background: bg, padding: `${s.pad * 0.6}em ${s.pad * 1.4}em`, borderRadius: s.radius, boxShadow: boxShadow || undefined} : {}),
				...style,
			}}
		>
			{content}
		</div>
	);
};

export {FONTS};
