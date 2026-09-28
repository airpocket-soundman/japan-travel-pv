// 汎用 PV エディタの型定義。
// テンプレート(動画の中身)は Template を実装して src/templates/index.ts に登録する。
import type React from 'react';

/** 素材。config には素材 id だけを書き、URL は再生・書き出し時に解決する */
export type AssetKind = 'image' | 'audio' | 'video';
export type Credit = {title: string; author?: string; license: string; source?: string};
export type Asset = {
	id: string; // 例: "photo:fuji-chureito" / "upload:1f2e..."
	kind: AssetKind;
	label: string;
	url: string;
	credit?: Credit;
	uploaded?: boolean;
};
export type AssetMap = Record<string, string>; // id -> url

/** テンプレートの映像コンポーネントが受け取る props */
export type TemplateProps<C> = {config: C; assets: AssetMap};

/** 編集フォームの項目定義。これを並べるだけでフォームが自動生成される */
type Base = {key: string; label: string; help?: string};
export type FieldDef =
	| (Base & {type: 'text'; placeholder?: string; maxLength?: number})
	| (Base & {type: 'textarea'; rows?: number})
	| (Base & {type: 'number'; min?: number; max?: number; step?: number; slider?: boolean})
	| (Base & {type: 'color'})
	| (Base & {type: 'boolean'})
	| (Base & {type: 'select'; options: {value: string; label: string}[]})
	| (Base & {type: 'asset'; kind: AssetKind})
	| (Base & {type: 'latlng'})
	| (Base & {
			type: 'list';
			fields: FieldDef[];
			newItem: () => unknown;
			itemTitle?: (item: any, index: number) => string;
			min?: number;
			max?: number;
			/** 各要素に対応するタイムライン区間 id(クリックでその位置へ移動する) */
			sectionId?: (index: number) => string;
	  })
	| (Base & {type: 'group'; fields: FieldDef[]});

/** 右側パネルのタブ */
export type Panel = {id: string; label: string; fields: FieldDef[]};

/** タイムラインの区間(プレビュー下の帯に表示) */
export type Section = {id: string; label: string; from: number; duration: number; color?: string};

export type Template<C = any> = {
	id: string;
	name: string;
	description: string;
	width: number;
	height: number;
	fps: number;
	component: React.ComponentType<TemplateProps<C>>;
	defaultConfig: C;
	panels: Panel[];
	sections: (config: C) => Section[];
	/** テンプレートに同梱する素材(写真・BGM など) */
	assets: Asset[];
	/** 設定の読み込み時に古い形式を補正するなど(任意) */
	migrate?: (config: any) => C;
};

export const durationOf = (sections: Section[]) =>
	sections.reduce((m, s) => Math.max(m, s.from + s.duration), 1);
