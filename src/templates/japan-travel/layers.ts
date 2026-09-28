// 日本観光 PV のレイヤー(場面の中の要素)と、その初期スタイル。
// 色の 'accent' は場面ごとのテーマ色、'sub' は 2 色目(スタイル設定)。時間は秒(場面の頭から)。
import type {LayerDef} from '../../editor/layers/types';

const title = {font: 'dela', weight: 400, shadow: 'hard', shadowColor: 'accent', animOut: 'none'} as const;

export const LAYERS: LayerDef[] = [
	// オープニング
	{id: 'intro.kicker', scene: 'intro', sceneLabel: 'オープニング', label: '小見出し', kind: 'text', defaults: {font: 'montserrat', size: 30, weight: 700, spacing: 0.3, bg: 'accent', pad: 0.5, x: 960, y: 330, anchor: 'mc', animIn: 'pop', delay: 0.05, duration: 0.4, animOut: 'none'}},
	{id: 'intro.title', scene: 'intro', sceneLabel: 'オープニング', label: 'タイトル', kind: 'text', defaults: {...title, size: 140, x: 960, y: 520, anchor: 'mc', align: 'center', animIn: 'chars', delay: 0.15, duration: 0.3, stagger: 0.05}},
	{id: 'intro.subtitle', scene: 'intro', sceneLabel: 'オープニング', label: 'サブタイトル', kind: 'text', defaults: {font: 'theme:en', size: 44, weight: 700, italic: true, x: 960, y: 680, anchor: 'mc', animIn: 'slideUp', delay: 0.7, duration: 0.35, animOut: 'none'}},
	// 地図
	{id: 'map.caption', scene: 'map', sceneLabel: '地図', label: 'キャプション', kind: 'text', defaults: {...title, size: 76, lineHeight: 1.25, x: 150, y: 470, anchor: 'ml', animIn: 'chars', delay: 0.05, duration: 0.25, stagger: 0.03}},
	{id: 'map.subtitle', scene: 'map', sceneLabel: '地図', label: 'サブタイトル', kind: 'text', defaults: {font: 'bebas', size: 60, weight: 400, spacing: 0.1, color: 'sub', x: 150, y: 660, anchor: 'ml', animIn: 'wipe', delay: 0.5, duration: 0.35, animOut: 'none'}},
	{id: 'map.map', scene: 'map', sceneLabel: '地図', label: '日本地図', kind: 'block', defaults: {x: 1340, y: 540, anchor: 'mc', scale: 1, animIn: 'zoomIn', delay: 0, duration: 0.4, animOut: 'none'}},
	// 観光地(全観光地で共通のレイアウト)
	{id: 'spot.counter', scene: 'spot', sceneLabel: '観光地', label: '番号(03 / 08)', kind: 'text', defaults: {font: 'montserrat', size: 26, weight: 700, spacing: 0.15, x: 1840, y: 70, anchor: 'tr', animIn: 'fade', delay: 0.1, duration: 0.3, animOut: 'none'}},
	{id: 'spot.tag', scene: 'spot', sceneLabel: '観光地', label: 'ハッシュタグ', kind: 'text', defaults: {font: 'theme:jp', size: 34, weight: 800, bg: 'accent', pad: 0.45, x: 120, y: 585, anchor: 'bl', animIn: 'slideRight', delay: 0.1, duration: 0.3, animOut: 'none'}},
	{id: 'spot.name', scene: 'spot', sceneLabel: '観光地', label: '名前', kind: 'text', defaults: {...title, size: 190, lineHeight: 1.1, x: 110, y: 810, anchor: 'bl', animIn: 'pop', delay: 0.15, duration: 0.4}},
	{id: 'spot.en', scene: 'spot', sceneLabel: '観光地', label: '英語名', kind: 'text', defaults: {font: 'bebas', size: 64, weight: 400, spacing: 0.25, color: 'sub', x: 125, y: 862, anchor: 'ml', animIn: 'wipe', delay: 0.35, duration: 0.3, animOut: 'none'}},
	{id: 'spot.catch', scene: 'spot', sceneLabel: '観光地', label: 'キャッチコピー', kind: 'text', defaults: {font: 'theme:jp', size: 44, weight: 800, color: '#1b1b3a', bg: '#ffffff', pad: 0.55, radius: 18, shadow: 'hard', shadowColor: 'accent', x: 120, y: 965, anchor: 'ml', animIn: 'slideUp', delay: 0.45, duration: 0.3, animOut: 'none'}},
	{id: 'spot.minimap', scene: 'spot', sceneLabel: '観光地', label: 'ミニ地図', kind: 'block', defaults: {x: 1850, y: 1040, anchor: 'br', scale: 1, animIn: 'zoomIn', delay: 0.3, duration: 0.3, animOut: 'none'}},
	// モンタージュ
	{id: 'montage.title', scene: 'montage', sceneLabel: 'モンタージュ', label: '見出し', kind: 'text', defaults: {...title, size: 88, x: 960, y: 60, anchor: 'tc', animIn: 'pop', delay: 0, duration: 0.4}},
	{id: 'montage.subtitle', scene: 'montage', sceneLabel: 'モンタージュ', label: 'サブタイトル', kind: 'text', defaults: {font: 'bebas', size: 50, weight: 400, spacing: 0.3, color: 'sub', x: 960, y: 200, anchor: 'tc', animIn: 'fade', delay: 0.2, duration: 0.3, animOut: 'none'}},
	{id: 'montage.cards', scene: 'montage', sceneLabel: 'モンタージュ', label: '写真カード', kind: 'block', defaults: {x: 960, y: 660, anchor: 'mc', scale: 1, animIn: 'none', animOut: 'none'}},
	// エンディング
	{id: 'ending.title', scene: 'ending', sceneLabel: 'エンディング', label: 'タイトル', kind: 'text', defaults: {...title, size: 118, x: 960, y: 470, anchor: 'mc', align: 'center', animIn: 'chars', delay: 0.2, duration: 0.3, stagger: 0.06}},
	{id: 'ending.subtitle', scene: 'ending', sceneLabel: 'エンディング', label: 'サブタイトル', kind: 'text', defaults: {font: 'theme:en', size: 48, weight: 700, italic: true, x: 960, y: 610, anchor: 'mc', animIn: 'slideUp', delay: 1.1, duration: 0.4, animOut: 'none'}},
	{id: 'ending.note', scene: 'ending', sceneLabel: 'エンディング', label: 'クレジット', kind: 'text', defaults: {font: 'montserrat', size: 20, weight: 400, color: 'rgba(255,255,255,0.8)', x: 960, y: 1040, anchor: 'bc', animIn: 'fade', delay: 1.8, duration: 0.5, animOut: 'none'}},
];
