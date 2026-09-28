// 日本観光 PV テンプレートの設定(エディタで編集される内容)
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
	version: 2;
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
	};
	music: {enabled: boolean; volume: number};
	/** レイアウト編集で変えた、各レイヤーの初期値からの差分 */
	layout: LayerOverrides;
};

// 120BPM / 30fps: 1 拍 = 15f、1 小節 = 60f。各区間は小節単位(BGM のパートと揃える)
export const FPS = 30;
export const BAR = 60;
export const INTRO_LEN = BAR;
export const MAP_LEN = BAR;
export const SPOT_LEN = BAR;
export const MONTAGE_LEN = BAR * 2;
export const ENDING_LEN = BAR * 3;

export const defaultConfig: JapanTravelConfig = {
	version: 2,
	intro: {
		photo: 'photo:fuji-kawaguchiko',
		kicker: 'JAPAN TRIP 2026',
		title: 'ニッポン、まわろ。',
		subtitle: "Let's go around Japan!",
	},
	map: {caption: '北から南まで、\nぜんぶ行く!', subtitle: 'OTARU → ISHIGAKI'},
	spots: [
		{name: '小樽', en: 'OTARU', region: '北海道', catch: 'レトロ運河で夜さんぽ', photo: 'photo:otaru-canal', lat: 43.197, lng: 140.994, color: '#2f9bff'},
		{name: '東京', en: 'TOKYO', region: '東京', catch: '渋谷スクランブル、ど真ん中へ', photo: 'photo:tokyo-shibuya', lat: 35.659, lng: 139.7, color: '#ff3d7f'},
		{name: '富士山', en: 'MT. FUJI', region: '山梨', catch: '五重塔×富士山、映えしかない', photo: 'photo:fuji-chureito', lat: 35.361, lng: 138.727, color: '#ff8a00'},
		{name: '京都', en: 'KYOTO', region: '京都', catch: '千本鳥居をくぐりぬけろ', photo: 'photo:kyoto-fushimi-inari', lat: 34.967, lng: 135.773, color: '#ff4b2b'},
		{name: '奈良', en: 'NARA', region: '奈良', catch: '鹿がふつうに歩いてる', photo: 'photo:nara-deer', lat: 34.685, lng: 135.843, color: '#9b5de5'},
		{name: '大阪', en: 'OSAKA', region: '大阪', catch: '食い倒れ、覚悟して', photo: 'photo:osaka-dotonbori', lat: 34.669, lng: 135.501, color: '#ffc300'},
		{name: '宮島', en: 'MIYAJIMA', region: '広島', catch: '海に立つ鳥居、エモい', photo: 'photo:miyajima-torii', lat: 34.296, lng: 132.32, color: '#f72585'},
		{name: '石垣島', en: 'ISHIGAKI', region: '沖縄', catch: '青すぎる海にダイブ', photo: 'photo:okinawa-kabira', lat: 24.45, lng: 124.14, color: '#00c2a8'},
	],
	montage: {
		title: 'まだまだ、推せる。',
		subtitle: 'MORE TO LOVE',
		items: [
			{photo: 'photo:sakura', label: '桜'},
			{photo: 'photo:ramen', label: 'ラーメン'},
			{photo: 'photo:autumn-kyoto', label: '紅葉'},
			{photo: 'photo:shinkansen', label: '新幹線'},
			{photo: 'photo:osaka-castle', label: 'お城'},
			{photo: 'photo:garden-lantern', label: '庭園'},
			{photo: 'photo:tokyo-tower', label: '夜景'},
			{photo: 'photo:hokusai-wave', label: '浮世絵'},
		],
	},
	ending: {
		photo: 'photo:fuji-sunset',
		title: 'さあ、次はどこ行く?',
		subtitle: 'See you in Japan!',
		note: 'Photos: Wikimedia Commons (CC0 / Public Domain)  Map: Natural Earth  Music: original',
	},
	style: {
		accent: '#ff3d7f',
		sub: '#ffd23f',
		textColor: '#ffffff',
		jpFont: 'mplus-rounded',
		enFont: 'montserrat',
		kenBurns: 1,
		overlay: 0.35,
		confetti: true,
	},
	music: {enabled: true, volume: 0.9},
	layout: {},
};
