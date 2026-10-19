import json, sys, os, collections
W = os.environ.get('EVIDENCE', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'evidence'))
def load(run, name):
    p = os.path.join(W, run, name + '.json')
    return json.load(open(p)) if os.path.exists(p) else None
for run in sys.argv[1:]:
    crawl, pages, layout, axe = load(run, 'crawl'), load(run, 'pages'), load(run, 'layout'), load(run, 'axe')
    print(f'===== {run}')
    print('pages', len(crawl['pages']), crawl['pages'])
    print('broken', crawl['broken'], 'missingAnchors', crawl['missingAnchors'][:5], 'orphans', crawl['orphans'])
    keys = ['title','lang','description','icon','appleTouch','og','canonical','themeColor','colorScheme','h1','headingSkips','main','header','footer','navs','ariaCurrent','skipLink','imgNoAlt','asClasses','backdrop','jsonld','bytes']
    agg = collections.defaultdict(list)
    for p in pages:
        for k in keys: agg[k].append(p.get(k))
        if p['errors'] or p['external'] or p['failed']: print('  PROBLEM', p['page'], p['errors'][:3], p['external'][:3], p['failed'][:3])
    def summ(k):
        v = agg[k]
        if k in ('og','navs'): return f"{sum(1 for x in v if x)}/{len(v)} {v[0]}"
        if k in ('title',): return f"unique {len(set(v))}/{len(v)}"
        if isinstance(v[0], bool) or v[0] is None or isinstance(v[0], str): return f"{sum(1 for x in v if x)}/{len(v)}"
        return f"min {min(v)} max {max(v)}"
    print('  ' + ' | '.join(f'{k}: {summ(k)}' for k in keys))
    print('  stylesheets', pages[0]['stylesheets'], 'scripts', pages[0]['scripts'])
    over = [(l['page'], l['width'], l['overflow'], l['offenders']) for l in layout if l['overflow'] > 0]
    print('  overflow', over[:8])
    viol = collections.Counter(); nodes = collections.Counter()
    for k, v in axe.items():
        for x in v['violations']: viol[(k.split()[0], x['id'], x['impact'])] += 1; nodes[(k.split()[0], x['id'])] += x['nodes']
    print('  axe violations (scheme, rule, impact): pages', dict(viol))
    print('  axe nodes', dict(nodes))
    for n in ['mobile-nav', 'keyboard', 'contact', 'preferences', '404']:
        d = load(run, n)
        if n == 'keyboard': print('  keyboard noring', [s['el'] for s in d if s and not s['ring']], 'stops', len([s for s in d if s]))
        elif n == 'contact': print('  contact', json.dumps({k: d.get(k) for k in ['page','afterEmpty','afterValid']}, ensure_ascii=False)[:700]); print('  fields', [(f['name'], f['type'], f['labelled'], f['autocomplete']) for f in d.get('fields') or []])
        else: print(' ', n, json.dumps(d, ensure_ascii=False))
