// プレビューの上に重ねる、レイヤー操作用の枠(ドラッグで移動、右下の角で拡大縮小)
import React, {useEffect, useRef, useState} from 'react';
import type {LayerDef, LayerStyle} from './types';

type Box = {id: string; x: number; y: number; w: number; h: number};
type Drag = {id: string; mode: 'move' | 'resize'; px: number; py: number; start: LayerStyle; w: number};

const SNAP = 14; // 画面中央への吸着距離(動画の座標で)

/** 親をたどって実効の不透明度を求める(先読み中の場面は透明なので除外するため) */
const effectiveOpacity = (el: HTMLElement, stop: HTMLElement) => {
	let o = 1;
	for (let p: HTMLElement | null = el; p && p !== stop; p = p.parentElement) {
		const cs = getComputedStyle(p);
		o *= parseFloat(cs.opacity || '1');
		if (cs.visibility === 'hidden' || cs.display === 'none') return 0;
	}
	return o;
};

export const LayerOverlay: React.FC<{
	host: HTMLElement | null;
	compWidth: number;
	defs: LayerDef[];
	activeScene: string | null; // 今映っている場面に属するレイヤーだけを対象にする
	resolve: (id: string) => LayerStyle;
	selected: string | null;
	onSelect: (id: string | null) => void;
	onChange: (id: string, patch: Partial<LayerStyle>) => void;
}> = ({host, compWidth, defs, activeScene, resolve, selected, onSelect, onChange}) => {
	const [boxes, setBoxes] = useState<Box[]>([]);
	const [guides, setGuides] = useState<{x: boolean; y: boolean}>({x: false, y: false});
	const drag = useRef<Drag | null>(null);
	const self = useRef<HTMLDivElement>(null);
	const scale = host ? host.getBoundingClientRect().width / compWidth : 1;

	// 枠の位置は描画結果(DOM)から毎フレーム取り直す
	useEffect(() => {
		if (!host) return;
		let raf = 0;
		let last = '';
		const tick = () => {
			const base = host.getBoundingClientRect();
			const best = new Map<string, {o: number; r: DOMRect}>();
			host.querySelectorAll<HTMLElement>('[data-layer]').forEach((el) => {
				const id = el.dataset.layer!;
				const def = defs.find((d) => d.id === id);
				if (!def || (activeScene && def.scene !== activeScene)) return;
				const o = effectiveOpacity(el, host);
				const r = el.getBoundingClientRect();
				if (o < 0.05 || r.width === 0) return;
				if (!best.has(id) || best.get(id)!.o < o) best.set(id, {o, r});
			});
			const next = [...best.entries()].map(([id, {r}]) => ({id, x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height}));
			const key = JSON.stringify(next.map((b) => [b.id, Math.round(b.x), Math.round(b.y), Math.round(b.w), Math.round(b.h)]));
			if (key !== last) {
				last = key;
				setBoxes(next);
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [host, defs, activeScene]);

	// 矢印キーで 1px(Shift で 10px)ずつ動かす
	useEffect(() => {
		const on = (e: KeyboardEvent) => {
			if (!selected) return;
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
			const d = e.shiftKey ? 10 : 1;
			const s = resolve(selected);
			const map: Record<string, [number, number]> = {ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d]};
			const m = map[e.key];
			if (!m) return;
			e.preventDefault();
			onChange(selected, {x: s.x + m[0], y: s.y + m[1]});
		};
		window.addEventListener('keydown', on);
		return () => window.removeEventListener('keydown', on);
	}, [selected, resolve, onChange]);

	const down = (e: React.PointerEvent, id: string, mode: Drag['mode'], w: number) => {
		e.stopPropagation();
		e.preventDefault();
		onSelect(id);
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		drag.current = {id, mode, px: e.clientX, py: e.clientY, start: resolve(id), w: w / scale};
	};
	const move = (e: React.PointerEvent) => {
		const d = drag.current;
		if (!d) return;
		const dx = (e.clientX - d.px) / scale;
		const dy = (e.clientY - d.py) / scale;
		if (d.mode === 'move') {
			let x = Math.round(d.start.x + dx);
			let y = Math.round(d.start.y + dy);
			const gx = Math.abs(x - compWidth / 2) < SNAP && !e.shiftKey;
			const gy = Math.abs(y - (compWidth * 9) / 32) < SNAP && !e.shiftKey;
			if (gx) x = compWidth / 2;
			if (gy) y = (compWidth * 9) / 32;
			setGuides({x: gx, y: gy});
			onChange(d.id, {x, y});
		} else {
			const f = Math.max(0.1, (d.w + dx) / d.w);
			const def = defs.find((x) => x.id === d.id);
			if (def?.kind === 'block') onChange(d.id, {scale: Math.round(d.start.scale * f * 100) / 100});
			else onChange(d.id, {size: Math.max(8, Math.round(d.start.size * f))});
		}
	};
	const up = () => {
		drag.current = null;
		setGuides({x: false, y: false});
	};

	return (
		<div ref={self} className="layer-overlay" onPointerDown={() => onSelect(null)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
			{guides.x && <div className="guide v" style={{left: (compWidth / 2) * scale}} />}
			{guides.y && <div className="guide h" style={{top: ((compWidth * 9) / 32) * scale}} />}
			{boxes.map((b) => {
				const def = defs.find((d) => d.id === b.id);
				const sel = b.id === selected;
				return (
					<div
						key={b.id}
						className={`layer-box ${sel ? 'selected' : ''}`}
						style={{left: b.x, top: b.y, width: b.w, height: b.h}}
						onPointerDown={(e) => down(e, b.id, 'move', b.w)}
						title={def?.label}
					>
						<span className="layer-tag">{def?.label}</span>
						{sel && <span className="layer-handle" onPointerDown={(e) => down(e, b.id, 'resize', b.w)} />}
					</div>
				);
			})}
		</div>
	);
};
