"""Wikimedia Commons から PD / CC0 の横長写真を検索して候補を出す。"""
import json, re, sys, urllib.parse, urllib.request

UA = {'User-Agent': 'japan-travel-pv/0.1 (https://github.com/airpocket-soundman/japan-travel-pv)'}
OK = re.compile(r'^(public domain|pd|cc0|cc-zero)', re.I)


def search(q, limit=40):
    p = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrnamespace': 6, 'gsrsearch': q,
         'gsrlimit': limit, 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata|mime', 'iiurlwidth': 1920}
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(p)
    d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA)))
    out = []
    for pg in (d.get('query', {}).get('pages', {}) or {}).values():
        ii = (pg.get('imageinfo') or [{}])[0]
        md = ii.get('extmetadata', {})
        lic = md.get('LicenseShortName', {}).get('value', '')
        w, h = ii.get('width', 0), ii.get('height', 0)
        if not OK.match(lic) or ii.get('mime') != 'image/jpeg' or w < 1800 or w / max(h, 1) < 1.3:
            continue
        artist = re.sub('<[^>]+>', '', md.get('Artist', {}).get('value', '')).strip()
        out.append({'title': pg['title'], 'w': w, 'h': h, 'license': lic, 'artist': artist[:60],
                    'thumb': ii.get('thumburl'), 'page': ii.get('descriptionurl')})
    return out


if __name__ == '__main__':
    res = {}
    for q in sys.argv[1:]:
        res[q] = search(q)
        print(f'## {q}: {len(res[q])}')
        for r in res[q][:12]:
            print(f"  {r['w']}x{r['h']} [{r['license']}] {r['title'][5:80]}")
    json.dump(res, open('tools/_candidates.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
