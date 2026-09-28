// ブラウザ内で MP4 を書き出す(@remotion/web-renderer / WebCodecs)
import React, {useEffect, useRef, useState} from 'react';
import {canRenderMediaOnWeb, renderMediaOnWeb, type WebRendererQuality} from '@remotion/web-renderer';
import type {AssetMap, Template} from './types';

type State =
	| {s: 'idle'}
	| {s: 'running'; progress: number; started: number}
	| {s: 'done'; url: string; size: number; secs: number}
	| {s: 'error'; message: string};

const RES = {'1080p': 1, '720p': 2 / 3, '540p': 0.5} as const;

export const ExportDialog: React.FC<{template: Template; config: any; assets: AssetMap; duration: number; onClose: () => void}> = ({
	template: t,
	config,
	assets,
	duration,
	onClose,
}) => {
	const [res, setRes] = useState<keyof typeof RES>('720p');
	const [quality, setQuality] = useState<WebRendererQuality>('high');
	const [state, setState] = useState<State>({s: 'idle'});
	const [issues, setIssues] = useState<string[]>([]);
	const abort = useRef<AbortController | null>(null);

	useEffect(() => {
		const scale = RES[res];
		canRenderMediaOnWeb({container: 'mp4', videoCodec: 'h264', width: Math.round(t.width * scale), height: Math.round(t.height * scale)})
			.then((r) => setIssues(r.issues.map((i) => `${i.severity === 'error' ? '✕' : '!'} ${i.message}`)))
			.catch((e) => setIssues([String(e)]));
	}, [res, t]);

	useEffect(() => () => abort.current?.abort(), []);

	const start = async () => {
		abort.current = new AbortController();
		const started = performance.now();
		setState({s: 'running', progress: 0, started});
		try {
			const {getBlob} = await renderMediaOnWeb({
				composition: {component: t.component, id: t.id, width: t.width, height: t.height, fps: t.fps, durationInFrames: duration, defaultProps: {config, assets}},
				inputProps: {config, assets},
				container: 'mp4',
				videoCodec: 'h264',
				videoBitrate: quality,
				scale: RES[res],
				signal: abort.current.signal,
				onProgress: (p) => setState({s: 'running', progress: p.progress, started}),
				licenseKey: 'free-license',
			});
			const blob = await getBlob();
			setState({s: 'done', url: URL.createObjectURL(blob), size: blob.size, secs: (performance.now() - started) / 1000});
		} catch (e) {
			setState(abort.current?.signal.aborted ? {s: 'idle'} : {s: 'error', message: e instanceof Error ? e.message : String(e)});
		}
	};

	const eta = (st: Extract<State, {s: 'running'}>) => {
		if (st.progress < 0.02) return '計算中…';
		const el = (performance.now() - st.started) / 1000;
		const rest = (el / st.progress) * (1 - st.progress);
		return `残り 約 ${Math.ceil(rest / 60)} 分`;
	};

	return (
		<div className="modal-bg">
			<div className="modal">
				<div className="modal-head">
					<h2>MP4 を書き出す</h2>
					<button type="button" onClick={() => {
						abort.current?.abort();
						onClose();
					}}>
						閉じる
					</button>
				</div>
				<p className="muted">
					書き出しはこのブラウザの中で行われ、素材や動画がサーバーに送られることはありません。Chrome / Edge を推奨します。書き出し中はこのタブを前面に出したままにしてください(裏に回すと遅くなります)。
				</p>
				<div className="row">
					<span className="row-label">解像度</span>
					<span className="row-input">
						{(Object.keys(RES) as (keyof typeof RES)[]).map((k) => (
							<label key={k} className="radio">
								<input type="radio" checked={res === k} disabled={state.s === 'running'} onChange={() => setRes(k)} /> {k}
								{k === '720p' ? '(おすすめ)' : k === '1080p' ? '(高画質・時間がかかります)' : '(速い・確認用)'}
							</label>
						))}
					</span>
				</div>
				<div className="row">
					<span className="row-label">画質</span>
					<span className="row-input">
						<select value={quality} disabled={state.s === 'running'} onChange={(e) => setQuality(e.target.value as WebRendererQuality)}>
							<option value="medium">標準</option>
							<option value="high">高</option>
							<option value="very-high">最高</option>
						</select>
					</span>
				</div>
				{issues.length > 0 && (
					<ul className="issues">
						{issues.map((i) => (
							<li key={i}>{i}</li>
						))}
					</ul>
				)}
				{state.s === 'running' && (
					<div className="progress">
						<div className="bar">
							<div style={{width: `${(state.progress * 100).toFixed(1)}%`}} />
						</div>
						<div className="muted">
							{(state.progress * 100).toFixed(0)}% ・ {eta(state)}
						</div>
					</div>
				)}
				{state.s === 'done' && (
					<div className="done">
						<video src={state.url} controls style={{width: '100%'}} />
						<div className="muted">
							{(state.size / 1024 / 1024).toFixed(1)} MB ・ {state.secs.toFixed(0)} 秒で完了
						</div>
						<a className="button primary" href={state.url} download={`${t.id}.mp4`}>
							MP4 をダウンロード
						</a>
					</div>
				)}
				{state.s === 'error' && <div className="error">書き出しに失敗しました: {state.message}</div>}
				<div className="modal-foot">
					{state.s === 'running' ? (
						<button type="button" onClick={() => abort.current?.abort()}>
							中止
						</button>
					) : (
						<button type="button" className="primary" onClick={start}>
							{state.s === 'done' ? 'もう一度書き出す' : '書き出し開始'}
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
