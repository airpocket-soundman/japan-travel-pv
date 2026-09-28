// オリジナルのアニメ調キャラクター(クールジャパンの案内役)。SVG の図形だけで描いた自作イラスト。
// ブラウザ内書き出しに合わせて、グラデーションやフィルター(url 参照)は使わず単色のセル塗りで描く。
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {useSettle} from '../../editor/layers/runtime';

const INK = '#1b1b3a';
const SKIN = '#ffe3d3';
const SKIN_SHADE = '#f6c3ad';
const HAIR = '#23233f';
const HAIR_SHADE = '#16162b';

export const CHARA_W = 600;
export const CHARA_H = 760;

// 片目。closed でまばたき中の線を描く。flip で左右反転(外側の目じりのはねを付ける向き)
const Eye: React.FC<{cx: number; closed: boolean; flip: boolean; iris: string; irisLight: string}> = ({cx, closed, flip, iris, irisLight}) => {
	const s = flip ? -1 : 1;
	const cy = 332;
	if (closed) {
		return <path d={`M ${cx - 34} ${cy + 4} Q ${cx} ${cy + 18} ${cx + 34} ${cy + 4}`} stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />;
	}
	return (
		<g>
			<ellipse cx={cx} cy={cy} rx={33} ry={40} fill="#ffffff" />
			<ellipse cx={cx + 2 * s} cy={cy + 4} rx={25} ry={33} fill={iris} />
			<ellipse cx={cx + 2 * s} cy={cy + 16} rx={20} ry={19} fill={irisLight} />
			<ellipse cx={cx + 2 * s} cy={cy + 2} rx={11} ry={17} fill="#2a0a22" />
			<circle cx={cx + 10 * s} cy={cy - 12} r={9} fill="#ffffff" />
			<circle cx={cx - 8 * s} cy={cy + 16} r={4.5} fill="#ffffff" />
			{/* 上まつげ(太め)と、外側にはねるアイライン */}
			<path
				d={`M ${cx - 38 * s} ${cy - 6} Q ${cx} ${cy - 50} ${cx + 38 * s} ${cy - 16} L ${cx + 40 * s} ${cy - 8} Q ${cx} ${cy - 40} ${cx - 36 * s} ${cy + 2} Z`}
				fill={INK}
			/>
			<path d={`M ${cx - 36 * s} ${cy - 2} L ${cx - 54 * s} ${cy - 16} L ${cx - 38 * s} ${cy - 10} Z`} fill={INK} />
			<path d={`M ${cx - 24 * s} ${cy + 36} Q ${cx} ${cy + 44} ${cx + 22 * s} ${cy + 34}`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
		</g>
	);
};

export const Chara: React.FC<{accent: string; sub: string; seed?: string}> = ({accent, sub, seed = 'c'}) => {
	const settle = useSettle();
	const now = useCurrentFrame();
	const frame = settle ? 0 : now; // レイアウト編集中は止める
	const bob = Math.sin(frame / 9) * 6;
	const sway = Math.sin(frame / 14) * 1.2;
	// 2〜3 秒に 1 回まばたき(タイミングは seed ごとにずらす)
	const period = 75 + Math.floor(random(`blink${seed}`) * 20);
	const closed = !settle && frame % period > period - 4;
	const glow = 0.55 + 0.45 * Math.exp(-((frame % 12) / 12) * 4); // 拍(12f)ごとにヘッドホンが光る
	return (
		<svg viewBox={`0 0 ${CHARA_W} ${CHARA_H}`} width={CHARA_W} height={CHARA_H} style={{overflow: 'visible', display: 'block'}}>
			<g transform={`translate(0 ${bob}) rotate(${sway} 300 500)`}>
				{/* 後ろ髪 */}
				<path d="M 166 300 Q 140 106 300 90 Q 460 106 434 300 L 448 476 L 424 458 L 412 470 Q 398 430 398 360 L 202 360 Q 202 430 188 470 L 176 458 L 152 476 Z" fill={HAIR} />
				{/* アホ毛 */}
				<path d="M 296 96 Q 270 40 318 20 Q 296 50 318 92 Z" fill={HAIR} />
				{/* 首とジャケット */}
				<path d="M 268 440 L 332 440 L 338 530 L 262 530 Z" fill={SKIN} />
				<path d="M 266 448 Q 300 486 334 448 L 336 476 Q 300 506 264 476 Z" fill={SKIN_SHADE} />
				<path d="M 70 780 Q 92 572 226 522 L 300 566 L 374 522 Q 508 572 530 780 Z" fill={INK} />
				<path d="M 120 640 Q 150 580 214 548" stroke={sub} strokeWidth={8} fill="none" strokeLinecap="round" />
				<path d="M 480 640 Q 450 580 386 548" stroke={sub} strokeWidth={8} fill="none" strokeLinecap="round" />
				{/* 高い襟 */}
				<path d="M 222 512 L 300 572 L 300 616 L 206 548 Z" fill={accent} />
				<path d="M 378 512 L 300 572 L 300 616 L 394 548 Z" fill={accent} />
				<path d="M 300 590 L 300 780" stroke={sub} strokeWidth={6} />
				<rect x={290} y={630} width={20} height={34} rx={4} fill={sub} />
				{/* 顔 */}
				<path d="M 192 282 Q 192 198 300 188 Q 408 198 408 282 L 404 350 Q 394 420 330 462 Q 300 482 270 462 Q 206 420 196 350 Z" fill={SKIN} />
				{/* 前髪の影 */}
				<path d="M 196 300 Q 300 330 404 300 L 404 322 Q 300 346 196 322 Z" fill={SKIN_SHADE} opacity={0.9} />
				{/* 目・眉・鼻・口・ほお */}
				<Eye cx={248} closed={closed} flip={false} iris={accent} irisLight="#ff8cc6" />
				<Eye cx={352} closed={closed} flip iris={accent} irisLight="#ff8cc6" />
				<path d="M 214 270 Q 244 256 278 266" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
				<path d="M 386 270 Q 356 256 322 266" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
				<path d="M 303 372 L 298 384" stroke="#d98c7a" strokeWidth={4} strokeLinecap="round" />
				<path d="M 280 414 Q 304 428 326 408" stroke="#8a2d45" strokeWidth={5} fill="none" strokeLinecap="round" />
				<path d="M 318 412 L 330 402" stroke="#8a2d45" strokeWidth={4} strokeLinecap="round" />
				{[0, 1, 2].map((k) => (
					<g key={k} stroke="#ff8fa8" strokeWidth={4} strokeLinecap="round">
						<path d={`M ${214 + k * 12} ${392} L ${222 + k * 12} ${380}`} />
						<path d={`M ${362 + k * 12} ${392} L ${370 + k * 12} ${380}`} />
					</g>
				))}
				{/* 前髪(とがった毛束)とサイドの髪 */}
				<path
					d="M 182 300 Q 180 140 300 128 Q 420 140 418 300 L 392 246 L 372 304 L 346 232 L 322 292 L 300 222 L 280 292 L 254 232 L 232 304 L 210 246 Z"
					fill={HAIR}
				/>
				{/* 前髪の毛束の影 */}
				<path d="M 254 232 L 262 170 M 300 222 L 300 160 M 346 232 L 338 170 M 210 246 L 226 190 M 392 246 L 376 190" stroke={HAIR_SHADE} strokeWidth={5} strokeLinecap="round" />
				<path d="M 192 296 Q 170 382 196 456 Q 218 402 218 322 Z" fill={HAIR} />
				<path d="M 408 296 Q 430 382 404 456 Q 382 402 382 322 Z" fill={HAIR} />
				<path d="M 200 300 Q 190 360 202 420" stroke={HAIR_SHADE} strokeWidth={5} fill="none" />
				{/* ネオンカラーのメッシュと髪のツヤ */}
				<path d="M 330 166 Q 366 180 378 236 L 362 216 Q 350 188 330 166 Z" fill={sub} />
				<path d="M 238 196 Q 266 176 300 172" stroke="#8c8cc8" strokeWidth={6} fill="none" strokeLinecap="round" />
				{/* ヘッドホン */}
				<path d="M 168 300 Q 162 92 300 84 Q 438 92 432 300" stroke="#2d2d48" strokeWidth={24} fill="none" />
				<path d="M 176 262 Q 176 104 300 98 Q 424 104 424 262" stroke={sub} strokeWidth={5} fill="none" opacity={glow} />
				<rect x={138} y={262} width={56} height={118} rx={26} fill="#2d2d48" />
				<rect x={406} y={262} width={56} height={118} rx={26} fill="#2d2d48" />
				<rect x={150} y={282} width={32} height={78} rx={16} fill={sub} opacity={glow} />
				<rect x={418} y={282} width={32} height={78} rx={16} fill={sub} opacity={glow} />
				{/* 頭の横のきつねのお面 */}
				<g transform="translate(446 176) rotate(24)">
					<path d="M -58 0 L -46 -60 L -18 -22 L 18 -22 L 46 -60 L 58 0 Q 50 70 0 92 Q -50 70 -58 0 Z" fill="#ffffff" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
					<path d="M -44 -48 L -26 -24 L -38 -10 Z" fill="#e63946" />
					<path d="M 44 -48 L 26 -24 L 38 -10 Z" fill="#e63946" />
					<path d="M -34 12 Q -22 2 -10 12" stroke="#e63946" strokeWidth={6} fill="none" strokeLinecap="round" />
					<path d="M 34 12 Q 22 2 10 12" stroke="#e63946" strokeWidth={6} fill="none" strokeLinecap="round" />
					<circle cx={0} cy={-8} r={6} fill="#e63946" />
					<path d="M -8 58 Q 0 66 8 58" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
					<path d="M 0 40 L -6 50 L 6 50 Z" fill={INK} />
				</g>
			</g>
		</svg>
	);
};

/** 漫画風の集中線(キャラクターの背景に) */
export const SpeedLines: React.FC<{color: string; count?: number; cx?: number; cy?: number}> = ({color, count = 44, cx = 1560, cy = 600}) => {
	const frame = useCurrentFrame();
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
			{Array.from({length: count}, (_, i) => {
				const a = (i / count) * Math.PI * 2 + frame * 0.004;
				const w = 0.018 + random(`sl${i}`) * 0.025;
				const r0 = 380 + random(`r${i}`) * 160;
				const R = 2200;
				const p = (ang: number, r: number) => `${cx + Math.cos(ang) * r},${cy + Math.sin(ang) * r}`;
				return <polygon key={i} points={`${p(a - w, R)} ${p(a, r0)} ${p(a + w, R)}`} fill={color} opacity={0.35} />;
			})}
		</svg>
	);
};

/** キラキラ(4 方向にとがった星)が点滅する */
export const Sparkles: React.FC<{color: string; points: [number, number][]}> = ({color, points}) => {
	const frame = useCurrentFrame();
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
			{points.map(([x, y], i) => {
				const t = ((frame + i * 7) % 24) / 24;
				const s = Math.sin(t * Math.PI) * (18 + (i % 3) * 8);
				return <path key={i} d={`M ${x} ${y - s} Q ${x} ${y} ${x + s} ${y} Q ${x} ${y} ${x} ${y + s} Q ${x} ${y} ${x - s} ${y} Q ${x} ${y} ${x} ${y - s} Z`} fill={color} />;
			})}
		</svg>
	);
};
