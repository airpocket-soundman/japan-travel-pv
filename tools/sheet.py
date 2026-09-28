"""候補写真のサムネイルを一覧画像にまとめる(選定用)。"""
import io, json, sys, urllib.request, concurrent.futures as cf
from PIL import Image, ImageDraw
UA = {'User-Agent': 'japan-travel-pv/0.1 (https://github.com/airpocket-soundman/japan-travel-pv)'}
c = json.load(open('tools/_candidates.json', encoding='utf-8'))
items = []
for q in sys.argv[2:]:
    for i, r in enumerate(c.get(q, [])[:8]):
        items.append((f'{q}#{i}', r['thumb'].replace('/1920px-', '/330px-')))
def get(u):
    try: return Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read())).convert('RGB')
    except Exception as e: return Image.new('RGB', (330, 220), 'gray')
with cf.ThreadPoolExecutor(6) as ex: ims = list(ex.map(get, [u for _, u in items]))
W, H = 330, 220; cols = 8
s = Image.new('RGB', (W * cols, H * ((len(ims) + cols - 1) // cols)), 'black'); d = ImageDraw.Draw(s)
for k, ((lab, _), im) in enumerate(zip(items, ims)):
    im.thumbnail((W, H)); x, y = (k % cols) * W, (k // cols) * H; s.paste(im, (x, y))
    d.rectangle([x, y, x + 200, y + 14], fill='black'); d.text((x + 3, y + 2), lab, fill='yellow')
s.save(sys.argv[1])
