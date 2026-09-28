// エディタで選べるフォント(Google Fonts, SIL Open Font License)。
// 読み込みは index.html の <link>。和文フォントは使う文字の分だけ自動で読み込まれる。

export type FontDef = {key: string; label: string; css: string; group: '和文' | '欧文' | 'テーマ'};

export const FONTS: FontDef[] = [
	{key: 'theme:jp', label: 'テーマの和文フォント', css: '', group: 'テーマ'},
	{key: 'theme:en', label: 'テーマの欧文フォント', css: '', group: 'テーマ'},
	{key: 'shippori', label: 'しっぽり明朝', css: '"Shippori Mincho B1", serif', group: '和文'},
	{key: 'zen-old', label: 'Zen オールド明朝', css: '"Zen Old Mincho", serif', group: '和文'},
	{key: 'zen-kaku', label: 'Zen 角ゴシック New', css: '"Zen Kaku Gothic New", sans-serif', group: '和文'},
	{key: 'mplus-rounded', label: 'M PLUS Rounded 1c(丸ゴシック)', css: '"M PLUS Rounded 1c", sans-serif', group: '和文'},
	{key: 'dela', label: 'Dela Gothic One(極太)', css: '"Dela Gothic One", sans-serif', group: '和文'},
	{key: 'yusei', label: 'Yusei Magic(手書き風)', css: '"Yusei Magic", sans-serif', group: '和文'},
	{key: 'cormorant', label: 'Cormorant Garamond', css: '"Cormorant Garamond", serif', group: '欧文'},
	{key: 'playfair', label: 'Playfair Display', css: '"Playfair Display", serif', group: '欧文'},
	{key: 'montserrat', label: 'Montserrat', css: '"Montserrat", sans-serif', group: '欧文'},
	{key: 'bebas', label: 'Bebas Neue(細長)', css: '"Bebas Neue", sans-serif', group: '欧文'},
];

/** テーマフォント(theme:jp / theme:en)はテンプレートが決める */
export type ThemeFonts = {jp: string; en: string};

export const fontCss = (key: string, theme: ThemeFonts) => {
	if (key === 'theme:jp') return theme.jp;
	if (key === 'theme:en') return theme.en;
	return FONTS.find((f) => f.key === key)?.css || theme.jp;
};

/** CSS の font-family 指定から、先頭のファミリー名を取り出す */
export const firstFamily = (css: string) => css.split(',')[0].trim();
