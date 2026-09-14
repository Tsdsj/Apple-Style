import json,subprocess,os,glob
base="https://developer.apple.com/tutorials/data"
seen=set(l.strip() for l in open("pages.txt") if l.strip())
queue=list(seen)
while queue:
    u=queue.pop()
    slug=u.rsplit("/",1)[1]
    out=f"json/{slug}.json"
    if not os.path.exists(out) or os.path.getsize(out)<100:
        subprocess.run(["curl","-sL",base+u+".json","-o",out])
    try: d=json.load(open(out))
    except Exception as e: print("BAD",u,e); continue
    for k,r in d.get("references",{}).items():
        ru=r.get("url","")
        if ru.startswith("/design/human-interface-guidelines/") and "#" not in ru and ru not in seen:
            seen.add(ru); queue.append(ru)
open("pages.txt","w").write("\n".join(sorted(seen))+"\n")
print(len(seen))
