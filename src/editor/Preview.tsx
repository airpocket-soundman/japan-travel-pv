// プレビュー(Remotion Player)とタイムライン
import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import type {AssetMap, Section, Template} from './types';

export type PreviewHandle = {seekTo: (frame: number, play?: boolean) => void; pause: () => void};

const fmt = (f: number, fps: number) => {
	const s = f / fps;
	return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
};

export const Preview = forwardRef<PreviewHandle, {template: Template; config: any; assets: AssetMap; sections: Section[]; duration: number}>(
	({template: t, config, assets, sections, duration}, ref) => {
		const player = useRef<PlayerRef>(null);
		const [frame, setFrame] = useState(0);
		useImperativeHandle(ref, () => ({
			seekTo: (f, play = true) => {
				player.current?.seekTo(f);
				if (play) player.current?.play();
			},
			pause: () => player.current?.pause(),
		}));
		useEffect(() => {
			const p = player.current;
			if (!p) return;
			const on = (e: {detail: {frame: number}}) => setFrame(e.detail.frame);
			p.addEventListener('frameupdate', on);
			return () => p.removeEventListener('frameupdate', on);
		}, []);
		return (
			<div className="preview">
				<div className="player-wrap">
					<Player
						ref={player}
						component={t.component}
						inputProps={{config, assets}}
						durationInFrames={duration}
						fps={t.fps}
						compositionWidth={t.width}
						compositionHeight={t.height}
						style={{width: '100%', aspectRatio: `${t.width} / ${t.height}`}}
						controls
						loop
						acknowledgeRemotionLicense
					/>
				</div>
				<div className="timeline">
					{sections.map((s) => (
						<button
							type="button"
							key={s.id}
							className="seg"
							title={`${s.label}(${fmt(s.from, t.fps)}〜)`}
							style={{flexGrow: s.duration, background: s.color ?? '#555', opacity: frame >= s.from && frame < s.from + s.duration ? 1 : 0.65}}
							onClick={() => {
								player.current?.seekTo(s.from);
								player.current?.play();
							}}
						>
							{s.label}
						</button>
					))}
					<div className="playhead" style={{left: `${(frame / duration) * 100}%`}} />
				</div>
				<div className="muted small">
					{fmt(frame, t.fps)} / {fmt(duration, t.fps)}({duration} フレーム・{t.fps}fps)
				</div>
			</div>
		);
	},
);
