// 日本観光 PV テンプレートの設定(エディタで編集される内容)

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
	intro: {photo: string; kicker: string; title: string; subtitle: string};
	map: {caption: string; subtitle: string};
	spots: Spot[];
	montage: {title: string; subtitle: string; items: MontageItem[]};
	ending: {photo: string; title: string; subtitle: string; note: string};
	style: {
		accent: string;
		textColor: string;
		headingFont: 'mincho' | 'gothic';
		kenBurns: number; // 写真のズーム量 0〜2
		overlay: number; // 写真に重ねる暗さ 0〜1
	};
	music: {enabled: boolean; volume: number};
};

// 1 拍 = 15f(120BPM / 30fps)。各区間は小節(60f)単位
export const FPS = 30;
export const INTRO_LEN = 180;
export const MAP_LEN = 120;
export const SPOT_LEN = 120;
export const MONTAGE_LEN = 240;
export const ENDING_LEN = 300;

export const defaultConfig: JapanTravelConfig = {
	intro: {
		photo: 'photo:fuji-kawaguchiko',
		kicker: 'JAPAN TRAVEL GUIDE',
		title: '日本を、旅しよう。',
		subtitle: 'Discover the islands of Japan',
	},
	map: {caption: '北の運河から、南の海まで。', subtitle: 'From the northern canals to the southern seas'},
	spots: [
		{name: '小樽', en: 'OTARU', region: '北海道', catch: '灯りがゆれる、石造りの運河', photo: 'photo:otaru-canal', lat: 43.197, lng: 140.994, color: '#3a7bd5'},
		{name: '東京', en: 'TOKYO', region: '東京都', catch: '一日に数十万人が行き交う交差点', photo: 'photo:tokyo-shibuya', lat: 35.659, lng: 139.7, color: '#e8384f'},
		{name: '富士山', en: 'MT. FUJI', region: '山梨県・静岡県', catch: '紅葉と五重塔の向こうに、日本一の山', photo: 'photo:fuji-chureito', lat: 35.361, lng: 138.727, color: '#f08a24'},
		{name: '京都', en: 'KYOTO', region: '京都府', catch: '千本鳥居の朱色のトンネル', photo: 'photo:kyoto-fushimi-inari', lat: 34.967, lng: 135.773, color: '#d9480f'},
		{name: '奈良', en: 'NARA', region: '奈良県', catch: '古都の公園で、鹿とすれちがう', photo: 'photo:nara-deer', lat: 34.685, lng: 135.843, color: '#8a6d3b'},
		{name: '大阪', en: 'OSAKA', region: '大阪府', catch: 'ネオンと食い倒れの道頓堀', photo: 'photo:osaka-dotonbori', lat: 34.669, lng: 135.501, color: '#f59f00'},
		{name: '宮島', en: 'MIYAJIMA', region: '広島県', catch: '海に浮かぶ大鳥居', photo: 'photo:miyajima-torii', lat: 34.296, lng: 132.32, color: '#c92a2a'},
		{name: '石垣島', en: 'ISHIGAKI', region: '沖縄県', catch: 'どこまでも青い、南の海', photo: 'photo:okinawa-kabira', lat: 24.45, lng: 124.14, color: '#0ca678'},
	],
	montage: {
		title: 'まだまだ、ある。',
		subtitle: 'And so much more',
		items: [
			{photo: 'photo:sakura', label: '桜'},
			{photo: 'photo:ramen', label: 'ラーメン'},
			{photo: 'photo:autumn-kyoto', label: '紅葉'},
			{photo: 'photo:shinkansen', label: '新幹線'},
			{photo: 'photo:osaka-castle', label: 'お城'},
			{photo: 'photo:garden-lantern', label: '日本庭園'},
			{photo: 'photo:tokyo-tower', label: '夜景'},
			{photo: 'photo:hokusai-wave', label: '浮世絵'},
		],
	},
	ending: {
		photo: 'photo:fuji-sunset',
		title: 'さあ、日本へ。',
		subtitle: 'Your journey starts here',
		note: 'Photos: Wikimedia Commons (CC0 / Public Domain)  Map: Natural Earth  Music: original',
	},
	style: {accent: '#e8384f', textColor: '#ffffff', headingFont: 'mincho', kenBurns: 1, overlay: 0.45},
	music: {enabled: true, volume: 0.9},
};
