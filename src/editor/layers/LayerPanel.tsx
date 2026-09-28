// 「レイアウト」タブ: 場面ごとのレイヤー一覧と、選んだレイヤーの配置・フォント・アニメーションの設定
import React from 'react';
import {FONTS} from './fonts';
import {BASE_STYLE, type Anchor, type AnimIn, type AnimOut, type LayerDef, type LayerOverrides, type LayerStyle} from './types';

const ANCHORS: [Anchor, string][] = [
	['tl', '↖'],
	['tc', '↑'],
	['tr', '↗'],
	['ml', '←'],
	['mc', '・'],
	['mr', '→'],
	['bl', '↙'],
	['bc', '↓'],
	['br', '↘'],
];
const ANIM_IN: [AnimIn, string][] = [
	['none', 'なし'],
	['fade', 'フェード'],
	['slideUp', '下から'],
	['slideDown', '上から'],
	['slideLeft', '右から'],
	['slideRight', '左から'],
	['zoomIn', 'ズームイン'],
	['zoomOut', 'ズームアウト'],
	['pop', 'ポップ(弾む)'],
	['blur', 'ぼかしから'],
	['wipe', 'ワイプ'],
	['chars', '1 文字ずつ'],
	['typewriter', 'タイプライター'],
];
const ANIM_OUT: [AnimOut, string][] = [
	['none', 'なし'],
	['fade', 'フェード'],
	['slideDown', '下へ'],
	['zoomOut', '縮む'],
];
const SHADOWS: [LayerStyle['shadow'], string][] = [
	['none', 'なし'],
	['soft', 'やわらかい影'],
	['hard', 'ずらした影(ポップ)'],
	['glow', '光彩'],
];

/** '' = 既定、'accent' / 'sub' = テンプレートの色、それ以外は色コード */
const ColorInput: React.FC<{value: string; onChange: (v: string) => void; allowNone?: boolean}> = ({value, onChange, allowNone}) => {
	const mode = value === '' ? '' : value === 'accent' || value === 'sub' ? value : 'custom';
	return (
		<span className="row-input">
			<select value={mode} onChange={(e) => onChange(e.target.value === 'custom' ? '#ffffff' : e.target.value)} style={{maxWidth: 130}}>
				<option value="">{allowNone ? 'なし' : '既定'}</option>
				<option value="accent">テーマ色</option>
				<option value="sub">2 色目</option>
				<option value="custom">指定…</option>
			</select>
			{mode === 'custom' && (
				<>
					<input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'} onChange={(e) => onChange(e.target.value)} />
					<input type="text" className="hex" value={value} onChange={(e) => onChange(e.target.value)} />
				</>
			)}
		</span>
	);
};

export const LayerPanel: React.FC<{
	defs: LayerDef[];
	overrides: LayerOverrides;
	resolve: (id: string) => LayerStyle;
	selected: string | null;
	editMode: boolean;
	onEditMode: (v: boolean) => void;
	onSelect: (id: string) => void;
	onChange: (id: string, patch: Partial<LayerStyle>) => void;
	onReset: (id: string | null) => void;
}> = ({defs, overrides, resolve, selected, editMode, onEditMode, onSelect, onChange, onReset}) => {
	const scenes = [...new Map(defs.map((d) => [d.scene, d.sceneLabel])).entries()];
	const def = defs.find((d) => d.id === selected);
	const s = selected ? resolve(selected) : null;
	const ov = (selected && overrides[selected]) || {};
	const set = (patch: Partial<LayerStyle>) => selected && onChange(selected, patch);
	const changed = (k: keyof LayerStyle) => (k in ov ? 'changed' : '');
	const num = (k: keyof LayerStyle, label: string, o: {min?: number; max?: number; step?: number} = {}) => (
		<label className={`row ${changed(k)}`}>
			<span className="row-label">{label}</span>
			<span className="row-input">
				{o.min !== undefined && o.max !== undefined && (
					<input type="range" min={o.min} max={o.max} step={o.step ?? 1} value={Number(s![k])} onChange={(e) => set({[k]: Number(e.target.value)} as Partial<LayerStyle>)} />
				)}
				<input type="number" className="num" min={o.min} max={o.max} step={o.step ?? 1} value={Number(s![k])} onChange={(e) => set({[k]: Number(e.target.value)} as Partial<LayerStyle>)} />
			</span>
		</label>
	);
	const isText = def?.kind === 'text';

	return (
		<div className="layer-panel">
			<label className="edit-toggle">
				<input type="checkbox" checked={editMode} onChange={(e) => onEditMode(e.target.checked)} />
				<span>
					<strong>レイアウト編集モード</strong>
					<br />
					<span className="muted small">アニメーションを止めて、プレビュー上で要素をドラッグで動かせます(右下の角で拡大縮小、矢印キーで微調整、Shift で吸着なし)</span>
				</span>
			</label>
			{scenes.map(([scene, label]) => (
				<div key={scene} className="layer-scene">
					<div className="layer-scene-title">{label}</div>
					<div className="layer-chips">
						{defs
							.filter((d) => d.scene === scene)
							.map((d) => (
								<button type="button" key={d.id} className={`chip ${d.id === selected ? 'active' : ''} ${overrides[d.id] ? 'edited' : ''}`} onClick={() => onSelect(d.id)}>
									{d.label}
								</button>
							))}
					</div>
				</div>
			))}
			<div className="layer-reset-all">
				<button type="button" disabled={!Object.keys(overrides).length} onClick={() => confirm('すべてのレイアウトを初期状態に戻しますか?') && onReset(null)}>
					すべてのレイアウトを初期化
				</button>
			</div>

			{def && s && (
				<div className="layer-detail">
					<div className="layer-detail-head">
						<strong>
							{def.sceneLabel} / {def.label}
						</strong>
						<button type="button" disabled={!Object.keys(ov).length} onClick={() => onReset(def.id)}>
							この要素を初期化
						</button>
					</div>
					<p className="muted small">色つきの項目は初期値から変更しています。{def.scene === 'spot' ? 'この場面のレイアウトは、繰り返し出てくるすべての項目に共通です。' : ''}</p>

					<fieldset className="group">
						<legend>配置</legend>
						<label className={`row ${changed('visible')}`}>
							<span className="row-label">表示</span>
							<span className="row-input">
								<input type="checkbox" checked={s.visible} onChange={(e) => set({visible: e.target.checked})} />
							</span>
						</label>
						{num('x', '横位置 X', {min: 0, max: 1920})}
						{num('y', '縦位置 Y', {min: 0, max: 1080})}
						<div className={`row ${changed('anchor')}`}>
							<span className="row-label">基準点</span>
							<span className="anchor-grid">
								{ANCHORS.map(([a, l]) => (
									<button type="button" key={a} className={s.anchor === a ? 'active' : ''} onClick={() => set({anchor: a})} title={a}>
										{l}
									</button>
								))}
							</span>
						</div>
						{isText ? num('size', '文字サイズ', {min: 8, max: 400}) : num('scale', '拡大率', {min: 0.1, max: 3, step: 0.05})}
						{isText && num('scale', '拡大率', {min: 0.1, max: 3, step: 0.05})}
						{num('rotate', '回転(度)', {min: -180, max: 180})}
						{num('opacity', '不透明度', {min: 0, max: 1, step: 0.05})}
					</fieldset>

					{isText && (
						<fieldset className="group">
							<legend>文字</legend>
							<label className={`row ${changed('font')}`}>
								<span className="row-label">フォント</span>
								<span className="row-input">
									<select value={s.font} onChange={(e) => set({font: e.target.value})}>
										{['テーマ', '和文', '欧文'].map((g) => (
											<optgroup key={g} label={g}>
												{FONTS.filter((f) => f.group === g).map((f) => (
													<option key={f.key} value={f.key}>
														{f.label}
													</option>
												))}
											</optgroup>
										))}
									</select>
								</span>
							</label>
							<label className={`row ${changed('weight')}`}>
								<span className="row-label">太さ</span>
								<span className="row-input">
									<select value={s.weight} onChange={(e) => set({weight: Number(e.target.value)})}>
										<option value={400}>標準</option>
										<option value={700}>太字</option>
										<option value={800}>極太(対応フォントのみ)</option>
									</select>
									<label className="radio">
										<input type="checkbox" checked={s.italic} onChange={(e) => set({italic: e.target.checked})} /> 斜体
									</label>
								</span>
							</label>
							<div className={`row ${changed('color')}`}>
								<span className="row-label">文字色</span>
								<ColorInput value={s.color} onChange={(v) => set({color: v})} />
							</div>
							{num('spacing', '字間(em)', {min: -0.1, max: 1, step: 0.01})}
							{num('lineHeight', '行間', {min: 0.8, max: 2.5, step: 0.05})}
							<label className={`row ${changed('align')}`}>
								<span className="row-label">行揃え</span>
								<span className="row-input">
									<select value={s.align} onChange={(e) => set({align: e.target.value as LayerStyle['align']})}>
										<option value="left">左</option>
										<option value="center">中央</option>
										<option value="right">右</option>
									</select>
								</span>
							</label>
						</fieldset>
					)}

					{isText && (
						<fieldset className="group">
							<legend>装飾</legend>
							<div className={`row ${changed('bg')}`}>
								<span className="row-label">背景(ラベル)</span>
								<ColorInput value={s.bg} onChange={(v) => set({bg: v})} allowNone />
							</div>
							{s.bg && num('pad', '背景の余白', {min: 0, max: 2, step: 0.05})}
							{s.bg && num('radius', '角丸', {min: 0, max: 999})}
							{num('stroke', '縁取り(px)', {min: 0, max: 30})}
							{s.stroke > 0 && (
								<div className={`row ${changed('strokeColor')}`}>
									<span className="row-label">縁取りの色</span>
									<ColorInput value={s.strokeColor} onChange={(v) => set({strokeColor: v})} />
								</div>
							)}
							<label className={`row ${changed('shadow')}`}>
								<span className="row-label">影</span>
								<span className="row-input">
									<select value={s.shadow} onChange={(e) => set({shadow: e.target.value as LayerStyle['shadow']})}>
										{SHADOWS.map(([v, l]) => (
											<option key={v} value={v}>
												{l}
											</option>
										))}
									</select>
								</span>
							</label>
							{(s.shadow === 'hard' || s.shadow === 'glow') && (
								<div className={`row ${changed('shadowColor')}`}>
									<span className="row-label">影の色</span>
									<ColorInput value={s.shadowColor} onChange={(v) => set({shadowColor: v})} />
								</div>
							)}
						</fieldset>
					)}

					<fieldset className="group">
						<legend>アニメーション</legend>
						<label className={`row ${changed('animIn')}`}>
							<span className="row-label">登場</span>
							<span className="row-input">
								<select value={s.animIn} onChange={(e) => set({animIn: e.target.value as AnimIn})}>
									{ANIM_IN.filter(([v]) => isText || (v !== 'chars' && v !== 'typewriter')).map(([v, l]) => (
										<option key={v} value={v}>
											{l}
										</option>
									))}
								</select>
							</span>
						</label>
						{num('delay', '開始(秒)', {min: 0, max: 5, step: 0.05})}
						{num('duration', '長さ(秒)', {min: 0.05, max: 3, step: 0.05})}
						{(s.animIn === 'chars' || s.animIn === 'typewriter') && num('stagger', '1 文字の間隔(秒)', {min: 0, max: 0.3, step: 0.01})}
						<label className={`row ${changed('animOut')}`}>
							<span className="row-label">退場</span>
							<span className="row-input">
								<select value={s.animOut} onChange={(e) => set({animOut: e.target.value as AnimOut})}>
									{ANIM_OUT.map(([v, l]) => (
										<option key={v} value={v}>
											{l}
										</option>
									))}
								</select>
							</span>
						</label>
						{s.animOut !== 'none' && num('outDuration', '退場の長さ(秒)', {min: 0.05, max: 2, step: 0.05})}
						<p className="muted small">開始は場面の頭からの秒数です。退場は場面の終わりに合わせて行われます。</p>
					</fieldset>
				</div>
			)}
			{!def && <p className="muted">要素を選ぶと、配置・フォント・アニメーションを変更できます。プレビュー上の枠をクリックしても選べます。</p>}
		</div>
	);
};

export {BASE_STYLE};
