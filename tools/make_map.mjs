// Natural Earth(パブリックドメイン, world-atlas 経由)から日本地図の SVG パスを作る。
// 本土(北緯 30 度以北)を大きく描き、南西諸島は左上の別枠(インセット)に描く。
// 出力: src/templates/japan-travel/japanMap.ts
import {readFileSync, writeFileSync} from 'node:fs';
import {feature} from 'topojson-client';
import {geoMercator, geoPath} from 'd3-geo';

const topo = JSON.parse(readFileSync('node_modules/world-atlas/countries-50m.json', 'utf8'));
const full = feature(topo, topo.objects.countries).features.find((f) => f.id === '392');
const polys = full.geometry.coordinates;
const within = (poly, f) => poly[0].every(([lng, lat]) => f(lng, lat));
const mk = (coordinates) => ({type: 'Feature', properties: {}, geometry: {type: 'MultiPolygon', coordinates}});

// 本土: 北緯 30 度以上(小笠原など遠い島は除く)
const main = mk(polys.filter((p) => within(p, (lng, lat) => lat > 30 && lng > 128 && lng < 146.5)));
// 南西諸島: 北緯 30 度未満・東経 131.5 度未満
const ryukyu = mk(polys.filter((p) => within(p, (lng, lat) => lat < 30 && lat > 23.5 && lng > 122 && lng < 131.5)));

const W = 1000, H = 1000;
const INSET = {x: 30, y: 30, w: 400, h: 300};
const pMain = geoMercator().fitExtent([[140, 30], [W - 20, H - 20]], main);
const pInset = geoMercator().fitExtent([[INSET.x + 20, INSET.y + 20], [INSET.x + INSET.w - 20, INSET.y + INSET.h - 20]], ryukyu);
const d = (p, f) => geoPath(p).digits(1)(f);

const out = `// 自動生成: tools/make_map.mjs(Natural Earth, public domain)
export const MAP_W = ${W};
export const MAP_H = ${H};
export const MAIN = {scale: ${pMain.scale()}, translate: [${pMain.translate().join(', ')}] as [number, number]};
export const INSET = {scale: ${pInset.scale()}, translate: [${pInset.translate().join(', ')}] as [number, number], box: ${JSON.stringify(INSET)}};
export const MAIN_PATH = ${JSON.stringify(d(pMain, main))};
export const INSET_PATH = ${JSON.stringify(d(pInset, ryukyu))};
/** この緯度経度が南西諸島の枠で描かれるか */
export const inInset = (lat: number, lng: number) => lat < 30 && lng < 131.5;
`;
writeFileSync('src/templates/japan-travel/japanMap.ts', out);
console.log('main scale', pMain.scale(), 'inset scale', pInset.scale(), 'polys', main.geometry.coordinates.length, ryukyu.geometry.coordinates.length);
