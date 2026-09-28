import type {Asset, FieldDef, Template} from '../../editor/types';
import credits from '../../../public/assets/photos/credits.json';
import {defaultConfig, ENDING_LEN, FPS, INTRO_LEN, MAP_LEN, MONTAGE_LEN, SPOT_LEN, type JapanTravelConfig} from './config';
import {FONTS} from '../../editor/layers/fonts';
import {LAYERS} from './layers';
import {JapanTravelVideo, layout} from './Video';

const fontOptions = (group: '和文' | '欧文') => FONTS.filter((f) => f.group === group).map((f) => ({value: f.key, label: f.label}));

const base = import.meta.env.BASE_URL;

const photoAssets: Asset[] = credits.map((c) => ({
	id: `photo:${c.id}`,
	kind: 'image',
	label: c.title.replace(/\.(jpe?g)$/i, ''),
	url: `${base}${c.file}`,
	credit: {title: c.title, author: c.author, license: c.license, source: c.source},
}));

// BGM は Vite に読み込ませて、ファイル名にハッシュを付ける(作り直すと必ず新しい音源が読み込まれる)
const bgmFiles = import.meta.glob('./bgm/*.wav', {eager: true, query: '?url', import: 'default'}) as Record<string, string>;
const bgmCredit = {title: 'Original BGM (tools/bgm.py)', license: 'CC0', author: 'japan-travel-pv'};
const bgmAssets: Asset[] = Object.entries(bgmFiles).map(([path, url]) => {
	const k = path.replace(/^.*\/(.*)\.wav$/, '$1');
	return {id: `bgm:${k}`, kind: 'audio', label: `BGM ${k}`, url, credit: bgmCredit};
});

const spotFields: FieldDef[] = [
	{type: 'asset', kind: 'image', key: 'photo', label: '写真'},
	{type: 'text', key: 'name', label: '見出し', maxLength: 8},
	{type: 'text', key: 'en', label: '英語'},
	{type: 'text', key: 'region', label: '場所(ハッシュタグ)'},
	{type: 'text', key: 'catch', label: 'キャッチコピー', maxLength: 30},
	{type: 'latlng', key: 'lat', label: '地図の位置(緯度・経度)', help: '地図のピンの位置です'},
	{type: 'color', key: 'color', label: 'テーマ色'},
];

export const japanTravel: Template<JapanTravelConfig> = {
	id: 'japan-travel',
	name: 'クールジャパン PR',
	description: '日本のクールなものを次々に紹介する 約 30 秒のハイテンポな PR 動画(180BPM)',
	width: 1920,
	height: 1080,
	fps: FPS,
	component: JapanTravelVideo,
	defaultConfig,
	layers: LAYERS,
	// 保存形式が変わった古いデータは初期値に戻し、欠けている項目は初期値で補う
	migrate: (saved) => {
		if (!saved || saved.version !== defaultConfig.version) return JSON.parse(JSON.stringify(defaultConfig));
		const d = JSON.parse(JSON.stringify(defaultConfig));
		return {...d, ...saved, style: {...d.style, ...saved.style}, music: {...d.music, ...saved.music}, layout: saved.layout ?? {}};
	},
	assets: [...photoAssets, ...bgmAssets],
	panels: [
		{
			id: 'spots',
			label: 'トピック',
			fields: [
				{
					type: 'list',
					key: 'spots',
					label: 'トピック(1 つ 1.33 秒)',
					help: '地図には各トピックの場所にピンが立ちます',
					fields: spotFields,
					min: 1,
					max: 16,
					itemTitle: (s, i) => `${String(i + 1).padStart(2, '0')} ${s.name}`,
					sectionId: (i) => `spot-${i}`,
					newItem: () => ({name: '新トピック', en: 'NEW', region: '東京', catch: 'キャッチコピー', photo: 'photo:tokyo-neon', lat: 35.68, lng: 139.76, color: '#ff2e88'}),
				},
			],
		},
		{
			id: 'text',
			label: '場面テキスト',
			fields: [
				{
					type: 'group',
					key: 'intro',
					label: 'オープニング',
					fields: [
						{type: 'asset', kind: 'image', key: 'photo', label: '背景写真'},
						{type: 'text', key: 'kicker', label: '小見出し(英字)'},
						{type: 'textarea', key: 'title', label: 'タイトル', rows: 2},
						{type: 'text', key: 'subtitle', label: 'サブタイトル'},
					],
				},
				{
					type: 'group',
					key: 'map',
					label: '地図',
					fields: [
						{type: 'textarea', key: 'caption', label: 'キャプション', rows: 2},
						{type: 'text', key: 'subtitle', label: 'サブタイトル'},
					],
				},
				{
					type: 'group',
					key: 'montage',
					label: 'モンタージュ(5.3 秒)',
					fields: [
						{type: 'text', key: 'title', label: '見出し'},
						{type: 'text', key: 'subtitle', label: 'サブタイトル'},
						{
							type: 'list',
							key: 'items',
							label: '写真カード(1 拍ずつ順に登場)',
							fields: [
								{type: 'asset', kind: 'image', key: 'photo', label: '写真'},
								{type: 'text', key: 'label', label: 'ラベル', maxLength: 8},
							],
							min: 1,
							max: 16,
							itemTitle: (m) => m.label,
							newItem: () => ({photo: 'photo:sakura', label: '新しい'}),
						},
					],
				},
				{
					type: 'group',
					key: 'ending',
					label: 'エンディング',
					fields: [
						{type: 'asset', kind: 'image', key: 'photo', label: '背景写真'},
						{type: 'text', key: 'title', label: 'タイトル'},
						{type: 'text', key: 'subtitle', label: 'サブタイトル'},
						{type: 'textarea', key: 'note', label: 'クレジット表記', rows: 2},
					],
				},
			],
		},
		{
			id: 'style',
			label: 'スタイル・音楽',
			fields: [
				{
					type: 'group',
					key: 'style',
					label: 'スタイル',
					fields: [
						{type: 'color', key: 'accent', label: 'テーマ色'},
						{type: 'color', key: 'sub', label: '2 色目'},
						{type: 'color', key: 'textColor', label: '文字色'},
						{type: 'select', key: 'jpFont', label: '和文フォント', options: fontOptions('和文')},
						{type: 'select', key: 'enFont', label: '欧文フォント', options: fontOptions('欧文')},
						{type: 'boolean', key: 'confetti', label: '紙吹雪の飾り'},
						{type: 'boolean', key: 'mapRoute', label: '地図にルート線を引く(並び順)'},
						{type: 'number', key: 'kenBurns', label: '写真のズーム量', min: 0, max: 2, step: 0.1, slider: true},
						{type: 'number', key: 'overlay', label: '写真の暗さ', min: 0, max: 1, step: 0.05, slider: true},
					],
				},
				{
					type: 'group',
					key: 'music',
					label: '音楽',
					fields: [
						{type: 'boolean', key: 'enabled', label: 'BGM を入れる'},
						{type: 'number', key: 'volume', label: '音量', min: 0, max: 1, step: 0.05, slider: true},
					],
				},
			],
		},
	],
	sections: (c) => {
		const t = layout(c);
		return [
			{id: 'intro', label: 'オープニング', from: t.intro, duration: INTRO_LEN, color: '#6c757d'},
			{id: 'map', label: '地図', from: t.map, duration: MAP_LEN, color: '#1c3d6e'},
			...c.spots.map((s, i) => ({id: `spot-${i}`, label: s.name, from: t.spots + i * SPOT_LEN, duration: SPOT_LEN, color: s.color})),
			{id: 'montage', label: 'モンタージュ', from: t.montage, duration: MONTAGE_LEN, color: '#495057'},
			{id: 'ending', label: 'エンディング', from: t.ending, duration: ENDING_LEN, color: '#343a40'},
		];
	},
};
