// クールジャパン PR テンプレートの設定(エディタで編集される内容)
import type {LayerOverrides} from '../../editor/layers/types';

export type Spot = {
	name: string;
	en: string;
	region: string;
	catch: string;
	photo: string; // 素材 id
	lat: number;
	lng: number;
	color: string;
};

export type MontageItem = {photo: string; label: string};

export type JapanTravelConfig = {
	version: 4;
	intro: {photo: string; kicker: string; title: string; subtitle: string};
	map: {caption: string; subtitle: string};
	spots: Spot[];
	montage: {title: string; subtitle: string; items: MontageItem[]};
	ending: {photo: string; title: string; subtitle: string; note: string};
	style: {
		accent: string;
		sub: string; // 2 色目(飾り・ストライプ)
		textColor: string;
		jpFont: string; // テーマの和文フォント(fonts.ts の key)
		enFont: string; // テーマの欧文フォント
		kenBurns: number; // 写真のズーム量 0〜2
		overlay: number; // 写真に重ねる暗さ 0〜1
		confetti: boolean; // 紙吹雪の飾り
		mapRoute: boolean; // 地図で並び順にルート線を引く
	};
	music: {enabled: boolean; volume: number};
	/** レイアウト編集で変えた、各レイヤーの初期値からの差分 */
	layout: LayerOverrides;
};

// 150BPM / 30fps: 1 拍 = 12f、1 小節 = 48f(1.6 秒)。各区間は小節単位(BGM のパートと揃える)
export const FPS = 30;
export const BEAT = 12;
export const BAR = 48;
export const INTRO_LEN = BAR * 2;
export const MAP_LEN = BAR;
export const SPOT_LEN = BAR;
export const MONTAGE_LEN = BAR * 3;
export const ENDING_LEN = BAR * 4;

export const defaultConfig: JapanTravelConfig = {
	version: 4,
	intro: {
		photo: 'photo:tokyo-neon',
		kicker: 'COOL JAPAN',
		title: 'ニッポンは、\nおもしろい。',
		subtitle: 'Welcome to Cool Japan',
	},
	map: {caption: '日本中が、\nクールだ。', subtitle: 'TRADITION × INNOVATION'},
	spots: [
		{name: '電気街', en: 'AKIBA', region: '秋葉原', catch: 'オタク文化の聖地へ、ようこそ', photo: 'photo:akihabara', lat: 35.698, lng: 139.771, color: '#2f9bff'},
		{name: 'カワイイ', en: 'KAWAII', region: '原宿', catch: '食べ歩きも、カワイイが正義', photo: 'photo:harajuku-crepe', lat: 35.671, lng: 139.703, color: '#ff5fa2'},
		{name: '寿司', en: 'SUSHI', region: '北海道', catch: 'ひと貫に、職人の技', photo: 'photo:sushi', lat: 43.064, lng: 141.347, color: '#ff8a00'},
		{name: '新幹線', en: 'SHINKANSEN', region: '名古屋', catch: '時速320km、しかも定刻', photo: 'photo:shinkansen', lat: 35.171, lng: 136.882, color: '#00b4d8'},
		{name: '浮世絵', en: 'UKIYO-E', region: '長野・小布施', catch: '世界をおどろかせた、一枚の波', photo: 'photo:hokusai-wave', lat: 36.697, lng: 138.314, color: '#3a5ba0'},
		{name: '富士山', en: 'MT. FUJI', region: '山梨', catch: 'やっぱり、日本のアイコン', photo: 'photo:fuji-chureito', lat: 35.361, lng: 138.727, color: '#ff4b2b'},
		{name: '鳥居', en: 'TORII', region: '京都', catch: '千本つづく、朱のデザイン', photo: 'photo:kyoto-fushimi-inari', lat: 34.967, lng: 135.773, color: '#e63946'},
		{name: 'ネオン', en: 'NEON', region: '大阪', catch: '看板も、味も、ネオン級', photo: 'photo:osaka-dotonbori', lat: 34.669, lng: 135.501, color: '#ffc300'},
	],
	montage: {
		title: 'まだまだ、クール。',
		subtitle: 'MORE COOL STUFF',
		items: [
			{photo: 'photo:robot', label: 'ロボット'},
			{photo: 'photo:ramen', label: 'ラーメン'},
			{photo: 'photo:arcade', label: 'ゲーセン'},
			{photo: 'photo:sakura', label: '桜'},
			{photo: 'photo:tokyo-tower', label: '夜景'},
			{photo: 'photo:autumn-kyoto', label: '紅葉'},
			{photo: 'photo:garden-lantern', label: '庭園'},
			{photo: 'photo:osaka-castle', label: 'お城'},
		],
	},
	ending: {
		photo: 'photo:fuji-sunset',
		title: '世界が、ハマる国。',
		subtitle: 'This is COOL JAPAN.',
		note: 'Photos: Wikimedia Commons (CC0 / Public Domain)  Map: Natural Earth  Music: original',
	},
	style: {
		accent: '#ff2e88',
		sub: '#00e5ff',
		textColor: '#ffffff',
		jpFont: 'mplus-rounded',
		enFont: 'montserrat',
		kenBurns: 1,
		overlay: 0.35,
		confetti: true,
		mapRoute: false,
	},
	music: {enabled: true, volume: 0.9},
	layout: {},
};
