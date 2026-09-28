# PV エディタ — 日本観光 PV

ブラウザだけで **編集・プレビュー・MP4 書き出し** ができる PV のエディタです。
最初のテンプレートとして、30 秒のポップな「日本観光 PV」を同梱しています。

**▶ エディタを開く: https://airpocket-soundman.github.io/japan-travel-pv/**

- サーバー不要。書き出しはブラウザの WebCodecs で行い、素材や動画は外部に送信されません
- 編集内容はブラウザに自動保存。「プロジェクトを保存 / 開く」で JSON ファイルとしてやり取りできます
- 手持ちの画像を追加して差し替えられます(ブラウザ内の IndexedDB にだけ保存)
- **レイアウト編集**: プレビュー上で文字や部品をドラッグして移動・拡大縮小。フォント・色・縁取り・影・登場/退場アニメーション・タイミングも要素ごとに変更できます
- 推奨ブラウザ: Chrome / Edge(Safari ではフィルター系の効果が書き出されません)

## 日本観光 PV の構成(120BPM・30 秒)

| 区間 | 長さ | 内容 |
|---|---|---|
| オープニング | 2 秒 | 河口湖の逆さ富士 + タイトル |
| 地図 | 2 秒 | 日本地図に観光地のルートを描く(南西諸島は別枠) |
| 観光地 × 8 | 各 2 秒 | 写真・名前・ハッシュタグ・キャッチコピー・ミニ地図 |
| モンタージュ | 4 秒 | 写真カードが 1 拍ずつ積み重なるコラージュ |
| エンディング | 6 秒 | 夕景の富士 + メッセージ |

観光地は 1〜16 か所まで増減でき、1 か所あたり 2 秒ずつ全体の長さが変わります。
BGM はパート別の音源を、観光地の数に合わせてブラウザ内で 1 本に合成して使うので、場面の継ぎ目で途切れません。

## 素材とライセンス

公開データと自作素材だけで作っています。

| 素材 | 出典 | ライセンス |
|---|---|---|
| 写真 20 枚 | Wikimedia Commons(一覧は [public/assets/photos/credits.json](public/assets/photos/credits.json)、エディタの「クレジット」でも確認可) | CC0 / Public Domain |
| 日本地図 | [Natural Earth](https://www.naturalearthdata.com/)(world-atlas 経由) | Public Domain |
| BGM | [tools/bgm.py](tools/bgm.py) で合成したオリジナル | CC0 |
| フォント | Google Fonts(Dela Gothic One / M PLUS Rounded 1c / Zen Kaku Gothic New / Shippori Mincho B1 / Zen Old Mincho / Yusei Magic / Montserrat / Bebas Neue / Cormorant Garamond / Playfair Display) | SIL Open Font License |

ソースコードは MIT ライセンスです([LICENSE](LICENSE))。

動画の生成には [Remotion](https://www.remotion.dev/) を使っています。Remotion は個人・従業員 3 名以下の企業・非営利団体などは無料で使えますが、
それ以外の企業で使う場合は [Remotion のライセンス](https://remotion.dev/license) が必要です。

## 開発

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ に出力(GitHub Pages へは main への push で自動公開)
```

素材の作り直し:

```bash
python tools/find_photos.py "Mount Fuji" "Kyoto"   # Commons で PD / CC0 の写真を検索
python tools/fetch_photos.py                        # 選定した写真を取得し credits.json を更新
python tools/bgm.py                                 # BGM(パート別 wav)を合成
node tools/make_map.mjs                             # 日本地図の SVG パスを生成
```

## エディタの使い回し方(新しいテンプレートの追加)

エディタ本体(`src/editor/`)は動画の中身を知りません。テンプレートを追加すれば、同じ画面で別の PV を編集・書き出しできます。

1. `src/templates/<id>/` を作り、映像コンポーネントを書く
   - props は `{config, assets}`。`config` は編集内容、`assets` は素材 id → URL の対応表
   - 画像は `assets[config.photo]` のように素材 id から URL を引く
   - ブラウザ内書き出しの[制約](https://www.remotion.dev/docs/client-side-rendering/limitations)に合わせる
     (`radial-gradient`・`mix-blend-mode`・`writing-mode`・`z-index` は不可、動画と音声は `@remotion/media` を使う)
2. `Template` を実装して export する(`src/editor/types.ts` 参照)
   - `defaultConfig`: 初期データ
   - `panels`: 右側のタブと項目の定義。`text` / `textarea` / `number` / `color` / `boolean` / `select` / `asset` / `latlng` / `list` / `group` を並べるだけでフォームが自動生成されます
   - `sections(config)`: タイムラインの区間(合計が動画の長さになる)
   - `assets`: 同梱する写真・BGM と、そのクレジット
3. `src/templates/index.ts` の `TEMPLATES` に追加する

レイアウト編集を使う場合:

- `layers`(`LayerDef[]`)で要素の id・属する場面・初期スタイルを宣言し、映像側は `<LayerProvider>` で包んで各要素を `<L id="..." text="..."/>` で描く(`src/editor/layers/`)
- 編集結果は `config.layout` に「初期値からの差分」として保存される
- 場面をまたいで鳴らす BGM は `useMixedAudio`(`src/editor/audioMix.ts`)で 1 本に合成すると継ぎ目で途切れない

画面上部のプルダウンでテンプレートを切り替えられます。
