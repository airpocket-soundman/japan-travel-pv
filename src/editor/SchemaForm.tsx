// 項目定義(FieldDef)から編集フォームを自動生成する
import React, {useState} from 'react';
import type {Asset, AssetKind, FieldDef} from './types';
import {getIn} from './useProject';

type Path = (string | number)[];
export type FormCtx = {
	root: any;
	set: (path: Path, value: unknown) => void;
	assets: Asset[];
	pickAsset: (kind: AssetKind, current: string, onPick: (id: string) => void) => void;
	seek: (sectionId: string) => void;
};

const Row: React.FC<{label: string; help?: string; children: React.ReactNode}> = ({label, help, children}) => (
	<label className="row">
		<span className="row-label">{label}</span>
		<span className="row-input">{children}</span>
		{help && <span className="row-help">{help}</span>}
	</label>
);

const AssetField: React.FC<{f: Extract<FieldDef, {type: 'asset'}>; value: string; path: Path; ctx: FormCtx}> = ({f, value, path, ctx}) => {
	const a = ctx.assets.find((x) => x.id === value);
	return (
		<div className="row">
			<span className="row-label">{f.label}</span>
			<button type="button" className="asset-field" onClick={() => ctx.pickAsset(f.kind, value, (id) => ctx.set(path, id))}>
				{a && f.kind === 'image' ? <img src={a.url} alt="" /> : <span className="asset-missing">{a ? a.label : '未選択'}</span>}
				<span className="asset-name">{a ? a.label : value || '選択してください'}</span>
				<span className="asset-change">変更</span>
			</button>
		</div>
	);
};

const ListField: React.FC<{f: Extract<FieldDef, {type: 'list'}>; value: any[]; path: Path; ctx: FormCtx}> = ({f, value = [], path, ctx}) => {
	const [open, setOpen] = useState<number | null>(0);
	const move = (i: number, d: number) => {
		const j = i + d;
		if (j < 0 || j >= value.length) return;
		const next = [...value];
		[next[i], next[j]] = [next[j], next[i]];
		ctx.set(path, next);
		setOpen(j);
	};
	const canAdd = f.max === undefined || value.length < f.max;
	const canDel = f.min === undefined || value.length > f.min;
	return (
		<div className="list">
			<div className="list-head">
				<span>{f.label}</span>
				<span className="muted">{value.length} 件</span>
			</div>
			{f.help && <div className="row-help">{f.help}</div>}
			{value.map((item, i) => (
				<div key={i} className={`card ${open === i ? 'open' : ''}`}>
					<div className="card-head" onClick={() => setOpen(open === i ? null : i)}>
						<span className="caret">{open === i ? '▾' : '▸'}</span>
						<span className="card-title">{f.itemTitle ? f.itemTitle(item, i) : `#${i + 1}`}</span>
						<span className="card-tools" onClick={(e) => e.stopPropagation()}>
							{f.sectionId && (
								<button type="button" title="この場面を再生" onClick={() => ctx.seek(f.sectionId!(i))}>
									▶
								</button>
							)}
							<button type="button" title="上へ" disabled={i === 0} onClick={() => move(i, -1)}>
								↑
							</button>
							<button type="button" title="下へ" disabled={i === value.length - 1} onClick={() => move(i, 1)}>
								↓
							</button>
							<button type="button" title="複製" disabled={!canAdd} onClick={() => ctx.set(path, [...value.slice(0, i + 1), JSON.parse(JSON.stringify(item)), ...value.slice(i + 1)])}>
								⧉
							</button>
							<button type="button" title="削除" disabled={!canDel} onClick={() => confirm('削除しますか?') && ctx.set(path, value.filter((_, k) => k !== i))}>
								✕
							</button>
						</span>
					</div>
					{open === i && (
						<div className="card-body">
							<Fields fields={f.fields} path={[...path, i]} ctx={ctx} />
						</div>
					)}
				</div>
			))}
			<button type="button" className="add" disabled={!canAdd} onClick={() => {
				ctx.set(path, [...value, f.newItem()]);
				setOpen(value.length);
			}}>
				+ 追加
			</button>
		</div>
	);
};

const Field: React.FC<{f: FieldDef; path: Path; ctx: FormCtx}> = ({f, path, ctx}) => {
	const p = [...path, f.key];
	const v = getIn(ctx.root, p);
	switch (f.type) {
		case 'text':
			return (
				<Row label={f.label} help={f.help}>
					<input type="text" value={v ?? ''} maxLength={f.maxLength} placeholder={f.placeholder} onChange={(e) => ctx.set(p, e.target.value)} />
				</Row>
			);
		case 'textarea':
			return (
				<Row label={f.label} help={f.help}>
					<textarea rows={f.rows ?? 3} value={v ?? ''} onChange={(e) => ctx.set(p, e.target.value)} />
				</Row>
			);
		case 'number':
			return (
				<Row label={f.label} help={f.help}>
					{f.slider && <input type="range" min={f.min} max={f.max} step={f.step} value={v ?? 0} onChange={(e) => ctx.set(p, Number(e.target.value))} />}
					<input type="number" className="num" min={f.min} max={f.max} step={f.step} value={v ?? 0} onChange={(e) => ctx.set(p, Number(e.target.value))} />
				</Row>
			);
		case 'color':
			return (
				<Row label={f.label} help={f.help}>
					<input type="color" value={v ?? '#000000'} onChange={(e) => ctx.set(p, e.target.value)} />
					<input type="text" className="hex" value={v ?? ''} onChange={(e) => ctx.set(p, e.target.value)} />
				</Row>
			);
		case 'boolean':
			return (
				<Row label={f.label} help={f.help}>
					<input type="checkbox" checked={!!v} onChange={(e) => ctx.set(p, e.target.checked)} />
				</Row>
			);
		case 'select':
			return (
				<Row label={f.label} help={f.help}>
					<select value={v} onChange={(e) => ctx.set(p, e.target.value)}>
						{f.options.map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>
				</Row>
			);
		case 'latlng': {
			// 緯度・経度は同じ階層の lat / lng を編集する
			const lat = getIn(ctx.root, [...path, 'lat']);
			const lng = getIn(ctx.root, [...path, 'lng']);
			return (
				<Row label={f.label} help={f.help}>
					<input type="number" className="num" step={0.01} value={lat ?? 0} onChange={(e) => ctx.set([...path, 'lat'], Number(e.target.value))} />
					<input type="number" className="num" step={0.01} value={lng ?? 0} onChange={(e) => ctx.set([...path, 'lng'], Number(e.target.value))} />
				</Row>
			);
		}
		case 'asset':
			return <AssetField f={f} value={v} path={p} ctx={ctx} />;
		case 'list':
			return <ListField f={f} value={v} path={p} ctx={ctx} />;
		case 'group':
			return (
				<fieldset className="group">
					<legend>{f.label}</legend>
					<Fields fields={f.fields} path={p} ctx={ctx} />
				</fieldset>
			);
	}
};

export const Fields: React.FC<{fields: FieldDef[]; path: Path; ctx: FormCtx}> = ({fields, path, ctx}) => (
	<>
		{fields.map((f, i) => (
			<Field key={`${f.key}-${i}`} f={f} path={path} ctx={ctx} />
		))}
	</>
);
