// プレビュー(Remotion Player)とタイムライン
import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import type {AssetMap, Section, Template} from './types';

export type PreviewHandle = {seekTo: (frame: number, play?: boolean) => void; pause: () => void; frame: () => number};

const fmt = (f: number, fps: number) => {
	const s = f / fps;
	return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
};

/** 区間 id から場面の種類を得る("spot-3" → "spot") */
export const sceneOf = (sectionId: string | undefined) => sectionId?.replace(/-\d+$/, '') ?? null;

export const Preview = forwardRef<
	PreviewHandle,
	{
		template: Template;
		config: any;
		assets: AssetMap;
		sections: Section[];
		duration: number;
		editMode?: boolean;
		/** レイアウト編集用の重ね表示。host はプレイヤーの枠、scene は今映っている場面の種類 */
		overlay?: (host: HTMLElement | null, scene: string | null) => React.ReactNode;
	}
>(({template: t, config, assets, sections, duration, editMode = false, overlay}, ref) => {
	const player = useRef<PlayerRef>(null);
	const host = useRef<HTMLDivElement>(null);
	const [frame, setFrame] = useState(0);
	useImperativeHandle(ref, () => ({
		seekTo: (f, play = true) => {
			player.current?.seekTo(f);
			setFrame(f);
			if (play) player.current?.play();
		},
		pause: () => player.current?.pause(),
		frame: () => player.current?.getCurrentFrame() ?? 0,
	}));
	useEffect(() => {
		const p = player.current;
		if (!p) return;
		const on = (e: {detail: {frame: number}}) => setFrame(e.detail.frame);
		p.addEventListener('frameupdate', on);
		p.addEventListener('seeked', on as never);
		return () => {
			p.removeEventListener('frameupdate', on);
			p.removeEventListener('seeked', on as never);
		};
	}, []);
	useEffect(() => {
		if (editMode) player.current?.pause();
	}, [editMode]);
	const current = sections.find((s) => frame >= s.from && frame < s.from + s.duration);
	return (
		<div className="preview">
			<div className={`player-wrap ${editMode ? 'editing' : ''}`} ref={host}>
				<Player
					ref={player}
					component={t.component}
					inputProps={{config, assets, editor: {settle: editMode}}}
					durationInFrames={duration}
					fps={t.fps}
					compositionWidth={t.width}
					compositionHeight={t.height}
					style={{width: '100%', aspectRatio: `${t.width} / ${t.height}`}}
					controls={!editMode}
					loop
					acknowledgeRemotionLicense
				/>
				{editMode && overlay?.(host.current, sceneOf(current?.id))}
			</div>
			<div className="timeline">
				{sections.map((s) => (
					<button
						type="button"
						key={s.id}
						className="seg"
						title={`${s.label}(${fmt(s.from, t.fps)}〜)`}
						style={{flexGrow: s.duration, background: s.color ?? '#555', opacity: current?.id === s.id ? 1 : 0.65}}
						onClick={() => {
							player.current?.seekTo(editMode ? s.from + Math.floor(s.duration / 2) : s.from);
							if (!editMode) player.current?.play();
						}}
					>
						{s.label}
					</button>
				))}
				<div className="playhead" style={{left: `${(frame / duration) * 100}%`}} />
			</div>
			<div className="muted small">
				{fmt(frame, t.fps)} / {fmt(duration, t.fps)}({duration} フレーム・{t.fps}fps)
				{editMode && '  ― レイアウト編集中(アニメーション停止)。タイムラインで場面を切り替えられます'}
			</div>
		</div>
	);
});
