// レイヤー(場面の中の文字・画像などの要素)の型。
// テンプレートは各レイヤーの初期スタイルを宣言し、config.layout には「初期値からの差分」だけが保存される。

export type Anchor = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';

export type AnimIn =
	| 'none'
	| 'fade'
	| 'slideUp'
	| 'slideDown'
	| 'slideLeft'
	| 'slideRight'
	| 'zoomIn'
	| 'zoomOut'
	| 'pop'
	| 'blur'
	| 'wipe'
	| 'chars'
	| 'typewriter';

export type AnimOut = 'none' | 'fade' | 'slideDown' | 'zoomOut';

export type LayerStyle = {
	visible: boolean;
	/** 基準点の位置(1920x1080 の画面座標) */
	x: number;
	y: number;
	anchor: Anchor;
	opacity: number;
	rotate: number; // 度
	scale: number;
	/** 文字レイヤーのみ */
	font: string; // フォントの key(fonts.ts)
	size: number; // px
	weight: number;
	color: string; // '' ならテンプレートの既定色
	spacing: number; // em
	lineHeight: number;
	align: 'left' | 'center' | 'right';
	italic: boolean;
	/** 装飾。色は '' で既定、'accent' / 'sub' などでテンプレートの名前付きの色 */
	bg: string; // 背景色(ラベル・吹き出し風)
	pad: number; // 背景の余白(em)
	radius: number; // 角丸(px)
	stroke: number; // 文字の縁取りの太さ(px)
	strokeColor: string;
	shadow: 'none' | 'soft' | 'hard' | 'glow';
	shadowColor: string;
	/** アニメーション(秒は場面の頭からの時間) */
	animIn: AnimIn;
	delay: number;
	duration: number;
	stagger: number; // 1 文字ごとの遅れ(chars / typewriter)
	animOut: AnimOut;
	outDuration: number;
};

export type LayerKind = 'text' | 'block';

export type LayerDef = {
	id: string; // 例 "spot.name"
	/** 属する場面。タイムライン区間 id と一致、または "spot" なら "spot-0", "spot-1"… に当てはまる */
	scene: string;
	sceneLabel: string;
	label: string;
	kind: LayerKind;
	defaults: Partial<LayerStyle>;
};

export type LayerOverrides = Record<string, Partial<LayerStyle>>;

export const BASE_STYLE: LayerStyle = {
	visible: true,
	x: 960,
	y: 540,
	anchor: 'mc',
	opacity: 1,
	rotate: 0,
	scale: 1,
	font: 'theme:jp',
	size: 48,
	weight: 700,
	color: '',
	spacing: 0,
	lineHeight: 1.3,
	align: 'left',
	italic: false,
	bg: '',
	pad: 0.35,
	radius: 999,
	stroke: 0,
	strokeColor: '#1b1b3a',
	shadow: 'none',
	shadowColor: 'accent',
	animIn: 'fade',
	delay: 0.3,
	duration: 0.5,
	stagger: 0.05,
	animOut: 'fade',
	outDuration: 0.3,
};

export const resolveStyle = (def: LayerDef | undefined, overrides: LayerOverrides | undefined): LayerStyle => ({
	...BASE_STYLE,
	...(def?.defaults ?? {}),
	...((def && overrides?.[def.id]) ?? {}),
});

export const ANCHOR_OFFSET: Record<Anchor, [number, number]> = {
	tl: [0, 0],
	tc: [-50, 0],
	tr: [-100, 0],
	ml: [0, -50],
	mc: [-50, -50],
	mr: [-100, -50],
	bl: [0, -100],
	bc: [-50, -100],
	br: [-100, -100],
};

export const sceneMatches = (scene: string, sectionId: string) => sectionId === scene || sectionId.startsWith(`${scene}-`);
