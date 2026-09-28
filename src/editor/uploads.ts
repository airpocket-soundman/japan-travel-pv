// ユーザーがアップロードした素材は、ブラウザ内の IndexedDB にだけ保存する(外部には送らない)
import type {Asset, AssetKind} from './types';

const DB = 'pv-editor';
const STORE = 'uploads';
type Row = {id: string; name: string; kind: AssetKind; type: string; blob: Blob; createdAt: number};

const open = () =>
	new Promise<IDBDatabase>((resolve, reject) => {
		const req = indexedDB.open(DB, 1);
		req.onupgradeneeded = () => req.result.createObjectStore(STORE, {keyPath: 'id'});
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});

const tx = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
	const db = await open();
	return new Promise<T>((resolve, reject) => {
		const r = fn(db.transaction(STORE, mode).objectStore(STORE));
		r.onsuccess = () => resolve(r.result);
		r.onerror = () => reject(r.error);
	});
};

const urls = new Map<string, string>();
const toAsset = (r: Row): Asset => {
	if (!urls.has(r.id)) urls.set(r.id, URL.createObjectURL(r.blob));
	return {id: r.id, kind: r.kind, label: r.name, url: urls.get(r.id)!, uploaded: true, credit: {title: r.name, license: 'ユーザー素材'}};
};

export const kindOf = (type: string): AssetKind | null =>
	type.startsWith('image/') ? 'image' : type.startsWith('audio/') ? 'audio' : type.startsWith('video/') ? 'video' : null;

export const listUploads = async (): Promise<Asset[]> => {
	const rows = await tx<Row[]>('readonly', (s) => s.getAll() as IDBRequest<Row[]>);
	return rows.sort((a, b) => a.createdAt - b.createdAt).map(toAsset);
};

export const addUpload = async (file: Blob & {name?: string}, name = file.name ?? 'upload', id?: string): Promise<Asset> => {
	const kind = kindOf(file.type);
	if (!kind) throw new Error(`対応していない形式です: ${file.type || name}`);
	const row: Row = {id: id ?? `upload:${crypto.randomUUID()}`, name, kind, type: file.type, blob: file, createdAt: Date.now()};
	await tx('readwrite', (s) => s.put(row));
	return toAsset(row);
};

export const removeUpload = async (id: string) => {
	await tx('readwrite', (s) => s.delete(id));
	const u = urls.get(id);
	if (u) URL.revokeObjectURL(u);
	urls.delete(id);
};

export const blobToDataUrl = (b: Blob) =>
	new Promise<string>((resolve) => {
		const r = new FileReader();
		r.onload = () => resolve(r.result as string);
		r.readAsDataURL(b);
	});

export const getUploadBlob = async (id: string) => (await tx<Row | undefined>('readonly', (s) => s.get(id) as IDBRequest<Row | undefined>))?.blob;
