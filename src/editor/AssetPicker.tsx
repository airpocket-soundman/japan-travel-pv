// 素材を選ぶダイアログ(同梱素材 + アップロード素材)
import React, {useRef, useState} from 'react';
import type {Asset, AssetKind} from './types';

export const AssetPicker: React.FC<{
	kind: AssetKind;
	current: string;
	assets: Asset[];
	onPick: (id: string) => void;
	onUpload: (files: File[]) => Promise<void>;
	onRemove: (id: string) => void;
	onClose: () => void;
}> = ({kind, current, assets, onPick, onUpload, onRemove, onClose}) => {
	const input = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);
	const [drag, setDrag] = useState(false);
	const list = assets.filter((a) => a.kind === kind);
	const upload = async (files: File[]) => {
		setBusy(true);
		try {
			await onUpload(files);
		} catch (e) {
			alert(String(e));
		} finally {
			setBusy(false);
		}
	};
	return (
		<div className="modal-bg" onClick={onClose}>
			<div
				className={`modal wide ${drag ? 'drag' : ''}`}
				onClick={(e) => e.stopPropagation()}
				onDragOver={(e) => {
					e.preventDefault();
					setDrag(true);
				}}
				onDragLeave={() => setDrag(false)}
				onDrop={(e) => {
					e.preventDefault();
					setDrag(false);
					upload([...e.dataTransfer.files]);
				}}
			>
				<div className="modal-head">
					<h2>{kind === 'image' ? '写真を選ぶ' : '素材を選ぶ'}</h2>
					<button type="button" onClick={onClose}>
						閉じる
					</button>
				</div>
				<div className="picker-tools">
					<button type="button" className="primary" disabled={busy} onClick={() => input.current?.click()}>
						{busy ? '読み込み中…' : '手持ちのファイルを追加'}
					</button>
					<span className="muted">ドラッグ&ドロップでも追加できます。追加した素材はこのブラウザの中だけに保存され、外部には送信されません。</span>
					<input ref={input} type="file" hidden multiple accept={`${kind}/*`} onChange={(e) => upload([...(e.target.files ?? [])])} />
				</div>
				<div className="grid">
					{list.map((a) => (
						<div key={a.id} className={`tile ${a.id === current ? 'selected' : ''}`} onClick={() => {
							onPick(a.id);
							onClose();
						}}>
							{kind === 'image' ? <img src={a.url} alt="" loading="lazy" /> : <div className="tile-audio">♪</div>}
							<div className="tile-label">{a.label}</div>
							<div className="tile-meta">{a.uploaded ? 'アップロード' : a.credit?.license}</div>
							{a.uploaded && (
								<button type="button" className="tile-del" onClick={(e) => {
									e.stopPropagation();
									if (confirm('この素材を削除しますか?')) onRemove(a.id);
								}}>
									✕
								</button>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
