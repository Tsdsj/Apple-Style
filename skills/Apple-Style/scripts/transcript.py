import re,html,sys
for f in sys.argv[1:]:
    s=open(f).read()
    title=re.search(r'<h1>(.*?)</h1>',s,re.S); title=html.unescape(title.group(1).strip()) if title else f
    desc=re.search(r'</div>\s*<p>(.*?)</p>',s[s.find('data-supplement-id="details"'):],re.S)
    desc=html.unescape(re.sub(r'<[^>]+>','',desc.group(1))).strip() if desc else ""
    chapters=re.findall(r'data-start-time="\d+">(\d+:\d+) - <a[^>]*>(.*?)</a>',s)
    # transcript supplement li
    m=re.search(r'<li class="supplement transcript"[^>]*>(.*?)</li>\s*(?:<li class="supplement|</ul>)', s, re.S)
    if not m:
        print("NO TRANSCRIPT",f); continue
    seg=m.group(1)
    sents=re.findall(r'<span[^>]*class="sentence"[^>]*>(.*?)</span>',seg,re.S)
    if sents:
        txt=[html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',x))).strip() for x in sents]
    else:
        txt=[html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',seg))).replace("Search this video…","").strip()]
    body=" ".join(txt)
    # paragraphize roughly every ~6 sentences
    paras=[]; cur=[]
    for t in txt:
        cur.append(t)
        if len(cur)>=6: paras.append(" ".join(cur)); cur=[]
    if cur: paras.append(" ".join(cur))
    out="# "+title+" (WWDC25)\n\n"+desc+"\n\n## Chapters\n"+"\n".join(f"- {a} {html.unescape(b)}" for a,b in chapters)+"\n\n## Transcript\n\n"+"\n\n".join(paras)+"\n"
    open(f.replace(".html",".md"),"w").write(out)
    print(f, title, len(body))
