// プロジェクトの状態(設定)と、元に戻す/やり直し、ブラウザへの自動保存
import {useCallback, useEffect, useRef, useState} from 'react';
import type {Template} from './types';

const LIMIT = 100;
const keyOf = (t: Template) => `pv-editor:${t.id}:config`;

export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** "a.b.0.c" のようなパスで値を書き換えた新しいオブジェクトを返す */
export const setIn = (obj: any, path: (string | number)[], value: unknown): any => {
	if (!path.length) return value;
	const [k, ...rest] = path;
	const copy = Array.isArray(obj) ? [...obj] : {...obj};
	copy[k as any] = setIn(obj?.[k as any], rest, value);
	return copy;
};
export const getIn = (obj: any, path: (string | number)[]) => path.reduce((o, k) => o?.[k as any], obj);

const load = <C,>(t: Template<C>): C => {
	try {
		const raw = localStorage.getItem(keyOf(t));
		if (raw) return t.migrate ? t.migrate(JSON.parse(raw)) : {...clone(t.defaultConfig), ...JSON.parse(raw)};
	} catch {
		/* 壊れていたら初期値 */
	}
	return clone(t.defaultConfig);
};

export const useProject = <C,>(t: Template<C>) => {
	const [config, setConfig] = useState<C>(() => load(t));
	const past = useRef<C[]>([]);
	const future = useRef<C[]>([]);
	const [, force] = useState(0);
	const lastPush = useRef(0);

	useEffect(() => {
		setConfig(load(t));
		past.current = [];
		future.current = [];
	}, [t]);

	useEffect(() => {
		const id = setTimeout(() => {
			try {
				localStorage.setItem(keyOf(t), JSON.stringify(config));
			} catch {
				/* 容量オーバーなどは無視 */
			}
		}, 400);
		return () => clearTimeout(id);
	}, [config, t]);

	/** 変更を適用。連続入力(0.8 秒以内)は 1 回の履歴にまとめる */
	const update = useCallback((next: C | ((c: C) => C), coalesce = true) => {
		setConfig((cur) => {
			const value = typeof next === 'function' ? (next as (c: C) => C)(cur) : next;
			const now = Date.now();
			if (!coalesce || now - lastPush.current > 800) {
				past.current = [...past.current.slice(-LIMIT + 1), cur];
				future.current = [];
			}
			lastPush.current = now;
			return value;
		});
		force((n) => n + 1);
	}, []);

	const undo = useCallback(() => {
		setConfig((cur) => {
			const prev = past.current.pop();
			if (prev === undefined) return cur;
			future.current.push(cur);
			return prev;
		});
		lastPush.current = 0;
		force((n) => n + 1);
	}, []);

	const redo = useCallback(() => {
		setConfig((cur) => {
			const next = future.current.pop();
			if (next === undefined) return cur;
			past.current.push(cur);
			return next;
		});
		lastPush.current = 0;
		force((n) => n + 1);
	}, []);

	const reset = useCallback(() => update(clone(t.defaultConfig), false), [t, update]);

	return {config, update, undo, redo, reset, canUndo: past.current.length > 0, canRedo: future.current.length > 0};
};
