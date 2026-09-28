// 汎用 PV エディタの画面。テンプレートを切り替えて使い回せる
import React, {lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {TEMPLATES} from '../templates';
import {AssetPicker} from './AssetPicker';
import {Preview, type PreviewHandle} from './Preview';
import {Fields, type FormCtx} from './SchemaForm';
import {durationOf, type Asset, type AssetKind} from './types';
import {addUpload, blobToDataUrl, getUploadBlob, listUploads, removeUpload} from './uploads';
import {setIn, useProject} from './useProject';

// 書き出し機能(エンコーダ類)は重いので、ボタンを押したときに読み込む
const ExportDialog = lazy(() => import('./ExportDialog').then((m) => ({default: m.ExportDialog})));

type Picking = {kind: AssetKind; current: string; onPick: (id: string) => void};

const usedIds = (config: unknown) => [...new Set(JSON.stringify(config).match(/"(upload:[^"]+|photo:[^"]+|bgm:[^"]+)"/g)?.map((s) => s.slice(1, -1)) ?? [])];

export const App: React.FC = () => {
	const [templateId, setTemplateId] = useState(() => localStorage.getItem('pv-editor:template') ?? TEMPLATES[0].id);
	const t = TEMPLATES.find((x) => x.id === templateId) ?? TEMPLATES[0];
	const {config, update, undo, redo, reset, canUndo, canRedo} = useProject(t);
	const [uploads, setUploads] = useState<Asset[]>([]);
	const [panel, setPanel] = useState(t.panels[0].id);
	const [picking, setPicking] = useState<Picking | null>(null);
	const [exporting, setExporting] = useState(false);
	const [credits, setCredits] = useState(false);
	const preview = useRef<PreviewHandle>(null);
	const fileInput = useRef<HTMLInputElement>(null);

	useEffect(() => {
		listUploads().then(setUploads).catch(() => setUploads([]));
	}, []);
	useEffect(() => localStorage.setItem('pv-editor:template', t.id), [t]);

	const assets = useMemo(() => [...t.assets, ...uploads], [t, uploads]);
	const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a.url])), [assets]);
	const sections = useMemo(() => t.sections(config), [t, config]);
	const duration = durationOf(sections);

	const set = useCallback((path: (string | number)[], value: unknown) => update((c: any) => setIn(c, path, value)), [update]);
	const ctx: FormCtx = {
		root: config,
		set,
		assets,
		pickAsset: (kind, current, onPick) => setPicking({kind, current, onPick}),
		seek: (id) => {
			const s = sections.find((x) => x.id === id);
			if (s) preview.current?.seekTo(s.from);
		},
	};

	const onUpload = async (files: File[]) => {
		let last: Asset | null = null;
		for (const f of files) last = await addUpload(f);
		setUploads(await listUploads());
		if (last && picking && files.length === 1) {
			picking.onPick(last.id);
			setPicking(null);
		}
	};

	// Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
	useEffect(() => {
		const on = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (!(e.ctrlKey || e.metaKey) || tag === 'INPUT' || tag === 'TEXTAREA') return;
			if (e.key.toLowerCase() === 'z') {
				e.preventDefault();
				if (e.shiftKey) redo();
				else undo();
			} else if (e.key.toLowerCase() === 'y') {
				e.preventDefault();
				redo();
			}
		};
		window.addEventListener('keydown', on);
		return () => window.removeEventListener('keydown', on);
	}, [undo, redo]);

	// プロジェクトファイル(.json)。使っているアップロード素材も埋め込む
	const saveProject = async () => {
		const ups = [];
		for (const id of usedIds(config).filter((x) => x.startsWith('upload:'))) {
			const blob = await getUploadBlob(id);
			const a = uploads.find((u) => u.id === id);
			if (blob) ups.push({id, name: a?.label ?? id, data: await blobToDataUrl(blob)});
		}
		const json = JSON.stringify({app: 'pv-editor', template: t.id, version: 1, savedAt: new Date().toISOString(), config, uploads: ups}, null, 1);
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([json], {type: 'application/json'}));
		a.download = `${t.id}-project.json`;
		a.click();
	};
	const openProject = async (file: File) => {
		try {
			const p = JSON.parse(await file.text());
			if (p.app !== 'pv-editor' || !p.config) throw new Error('このエディタのプロジェクトファイルではありません');
			if (p.template !== t.id) {
				if (!TEMPLATES.some((x) => x.id === p.template)) throw new Error(`未対応のテンプレートです: ${p.template}`);
				setTemplateId(p.template);
			}
			for (const u of p.uploads ?? []) {
				const blob = await (await fetch(u.data)).blob();
				await addUpload(blob, u.name, u.id);
			}
			setUploads(await listUploads());
			update(p.config, false);
		} catch (e) {
			alert(`読み込めませんでした: ${e instanceof Error ? e.message : e}`);
		}
	};

	const usedCredits = assets.filter((a) => usedIds(config).includes(a.id) && a.credit && !a.uploaded);

	return (
		<div className="app">
			<header>
				<div className="brand">
					<strong>PV エディタ</strong>
					<select value={t.id} onChange={(e) => setTemplateId(e.target.value)} title="テンプレート">
						{TEMPLATES.map((x) => (
							<option key={x.id} value={x.id}>
								{x.name}
							</option>
						))}
					</select>
					<span className="muted small">{t.description}</span>
				</div>
				<div className="actions">
					<button type="button" disabled={!canUndo} onClick={undo} title="元に戻す (Ctrl+Z)">
						↶ 戻す
					</button>
					<button type="button" disabled={!canRedo} onClick={redo} title="やり直し (Ctrl+Shift+Z)">
						↷ やり直し
					</button>
					<button type="button" onClick={() => fileInput.current?.click()}>
						開く
					</button>
					<button type="button" onClick={saveProject}>
						プロジェクトを保存
					</button>
					<button type="button" onClick={() => setCredits(true)}>
						クレジット
					</button>
					<button type="button" onClick={() => confirm('編集内容を初期状態に戻しますか?(元に戻すで取り消せます)') && reset()}>
						初期化
					</button>
					<button type="button" className="primary" onClick={() => {
						preview.current?.pause(); // 書き出し中はプレビューを止めて処理を軽くする
						setExporting(true);
					}}>
						MP4 を書き出す
					</button>
					<input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => {
						const f = e.target.files?.[0];
						if (f) openProject(f);
						e.target.value = '';
					}} />
				</div>
			</header>
			<main>
				<section className="left">
					<Preview ref={preview} template={t} config={config} assets={assetMap} sections={sections} duration={duration} />
					<p className="muted small">編集内容はこのブラウザに自動保存されます。別の PC で続けるときは「プロジェクトを保存」したファイルを「開く」で読み込んでください。</p>
				</section>
				<section className="right">
					<nav className="tabs">
						{t.panels.map((p) => (
							<button type="button" key={p.id} className={panel === p.id ? 'active' : ''} onClick={() => setPanel(p.id)}>
								{p.label}
							</button>
						))}
					</nav>
					<div className="panel">
						<Fields fields={(t.panels.find((p) => p.id === panel) ?? t.panels[0]).fields} path={[]} ctx={ctx} />
					</div>
				</section>
			</main>
			{picking && (
				<AssetPicker
					kind={picking.kind}
					current={picking.current}
					assets={assets}
					onPick={picking.onPick}
					onUpload={onUpload}
					onRemove={async (id) => {
						await removeUpload(id);
						setUploads(await listUploads());
					}}
					onClose={() => setPicking(null)}
				/>
			)}
			{exporting && (
				<Suspense fallback={<div className="modal-bg"><div className="modal">書き出し機能を読み込んでいます…</div></div>}>
					<ExportDialog template={t} config={config} assets={assetMap} duration={duration} onClose={() => setExporting(false)} />
				</Suspense>
			)}
			{credits && (
				<div className="modal-bg" onClick={() => setCredits(false)}>
					<div className="modal wide" onClick={(e) => e.stopPropagation()}>
						<div className="modal-head">
							<h2>使用している素材のクレジット</h2>
							<button type="button" onClick={() => setCredits(false)}>
								閉じる
							</button>
						</div>
						<table className="credits">
							<thead>
								<tr>
									<th>素材</th>
									<th>作者</th>
									<th>ライセンス</th>
								</tr>
							</thead>
							<tbody>
								{usedCredits.map((a) => (
									<tr key={a.id}>
										<td>{a.credit?.source ? <a href={a.credit.source} target="_blank" rel="noreferrer">{a.credit.title}</a> : a.credit?.title}</td>
										<td>{a.credit?.author || '—'}</td>
										<td>{a.credit?.license}</td>
									</tr>
								))}
							</tbody>
						</table>
						<p className="muted small">地図: Natural Earth(public domain)。アップロードした素材の権利は、各自でご確認ください。</p>
					</div>
				</div>
			)}
		</div>
	);
};
