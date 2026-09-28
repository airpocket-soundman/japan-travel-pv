"""選定した PD / CC0 写真をダウンロードし、public/assets/photos/ と credits.json を作る。"""
import io, json, urllib.request
from PIL import Image

UA = {'User-Agent': 'japan-travel-pv/0.1 (https://github.com/airpocket-soundman/japan-travel-pv)'}
PICK = {
    'tokyo-shibuya': ('Shibuya crossing', 4), 'tokyo-tower': ('Tokyo Tower', 4),
    'kyoto-fushimi-inari': ('Fushimi Inari', 2), 'fuji-chureito': ('Mount Fuji Chureito', 0),
    'fuji-kawaguchiko': ('Mount Fuji Kawaguchiko', 0), 'fuji-sunset': ('FujiExtra', 3),
    'osaka-dotonbori': ('Dotonbori', 2), 'osaka-castle': ('Osaka Castle', 1),
    'nara-deer': ('Nara Park deer', 3), 'nara-todaiji': ('Todai-ji Nara', 0),
    'miyajima-torii': ('Itsukushima Shrine torii', 0), 'otaru-canal': ('Otaru canal', 0),
    'furano': ('Furano', 3), 'okinawa-kabira': ('Kabira Bay', 2),
    'ramen': ('ramen', 3), 'sakura': ('cherry blossoms Japan', 0), 'autumn-kyoto': ('autumn leaves Kyoto', 0),
    'shinkansen': ('Shinkansen', 4), 'garden-lantern': ('Japanese lanterns', 0), 'hokusai-wave': ('FujiExtra', 7),
}
c = json.load(open('tools/_candidates.json', encoding='utf-8'))
credits = []
for key, (q, i) in PICK.items():
    r = c[q][i]
    raw = urllib.request.urlopen(urllib.request.Request(r['thumb'], headers=UA), timeout=60).read()
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    im.thumbnail((1920, 1920))
    im.save(f'public/assets/photos/{key}.jpg', quality=84, optimize=True, progressive=True)
    credits.append({'id': key, 'file': f'assets/photos/{key}.jpg', 'title': r['title'][5:], 'author': r['artist'],
                    'license': r['license'], 'source': r['page'], 'width': im.width, 'height': im.height})
    print('ok', key, im.size, r['license'])
json.dump(credits, open('public/assets/photos/credits.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
