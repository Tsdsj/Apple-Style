#!/usr/bin/env python3
"""Render Apple DocC JSON (developer.apple.com/tutorials/data/...) to markdown."""
import json, sys, re

def inline(nodes, refs):
    out = []
    for n in nodes or []:
        t = n.get("type")
        if t == "text": out.append(n.get("text",""))
        elif t == "codeVoice": out.append("`%s`" % n.get("code",""))
        elif t in ("emphasis","strong"):
            m = "*" if t=="emphasis" else "**"
            out.append(m + inline(n.get("inlineContent"), refs) + m)
        elif t == "reference":
            r = refs.get(n.get("identifier"), {})
            title = r.get("title") or n.get("identifier","")
            url = r.get("url","")
            if url and url.startswith("/"): url = "https://developer.apple.com" + url
            out.append("[%s](%s)" % (title, url) if url else title)
        elif t == "image":
            r = refs.get(n.get("identifier"), {})
            out.append("![%s]" % (r.get("alt","image")))
        elif t == "inlineHead": out.append(inline(n.get("inlineContent"), refs))
        elif t == "newTerm": out.append("*" + inline(n.get("inlineContent"), refs) + "*")
        elif t == "superscript": out.append(inline(n.get("inlineContent"), refs))
        elif t == "link": out.append("[%s](%s)" % (n.get("title",n.get("destination")), n.get("destination")))
        else: out.append(inline(n.get("inlineContent"), refs))
    return "".join(out)

def block(nodes, refs, depth=0):
    out = []
    for n in nodes or []:
        t = n.get("type")
        if t == "heading":
            out.append("\n" + "#"*(n.get("level",2)) + " " + n.get("text","") + "\n")
        elif t == "paragraph":
            out.append(inline(n.get("inlineContent"), refs) + "\n")
        elif t == "unorderedList":
            for it in n.get("items",[]):
                body = block(it.get("content"), refs, depth+1).strip()
                lines = body.split("\n")
                out.append("  "*depth + "- " + lines[0])
                out.extend("  "*depth + "  " + l for l in lines[1:] if l.strip())
            out.append("")
        elif t == "orderedList":
            for i,it in enumerate(n.get("items",[]),1):
                body = block(it.get("content"), refs, depth+1).strip()
                lines = body.split("\n")
                out.append("  "*depth + "%d. "%i + lines[0])
                out.extend("  "*depth + "   " + l for l in lines[1:] if l.strip())
            out.append("")
        elif t == "aside":
            out.append("> **%s:** " % n.get("name", n.get("style","Note")) + block(n.get("content"), refs).strip().replace("\n","\n> ") + "\n")
        elif t == "codeListing":
            out.append("```%s\n%s\n```\n" % (n.get("syntax","") or "", "\n".join(n.get("code",[]))))
        elif t == "table":
            rows = n.get("rows",[])
            for ri,row in enumerate(rows):
                cells = [inline_cell(c, refs) for c in row]
                out.append("| " + " | ".join(cells) + " |")
                if ri == 0: out.append("|" + "---|"*len(cells))
            out.append("")
        elif t == "termList":
            for it in n.get("items",[]):
                term = inline(it.get("term",{}).get("inlineContent"), refs)
                d = block(it.get("definition",{}).get("content"), refs).strip()
                out.append("- **%s** — %s" % (term, d))
            out.append("")
        elif t == "row":
            for col in n.get("columns",[]):
                out.append(block(col.get("content"), refs))
        elif t == "tabNavigator":
            for tab in n.get("tabs",[]):
                out.append("\n**%s**\n" % tab.get("title",""))
                out.append(block(tab.get("content"), refs))
        elif t == "links":
            for ident in n.get("items",[]):
                r = refs.get(ident,{})
                url = r.get("url","")
                if url.startswith("/"): url = "https://developer.apple.com"+url
                ab = inline(r.get("abstract"), refs)
                out.append("- [%s](%s)%s" % (r.get("title",ident), url, (" — "+ab) if ab else ""))
            out.append("")
        elif t == "small":
            out.append(block(n.get("inlineContent") and [{"type":"paragraph","inlineContent":n["inlineContent"]}] or n.get("content"), refs))
        elif t == "video":
            r = refs.get(n.get("identifier"),{})
            out.append("[video: %s]\n" % r.get("alt","video"))
        elif t == "image":
            r = refs.get(n.get("identifier"),{})
            out.append("![%s]\n" % r.get("alt","image"))
        else:
            out.append(block(n.get("content"), refs))
    return "\n".join(out)

def inline_cell(cell, refs):
    return block(cell, refs).strip().replace("\n"," ")

def render(doc):
    refs = doc.get("references",{})
    md = []
    title = doc.get("metadata",{}).get("title","")
    md.append("# " + title + "\n")
    ab = inline(doc.get("abstract"), refs)
    if ab: md.append(ab + "\n")
    for sec in doc.get("primaryContentSections",[]):
        if sec.get("kind") == "content":
            md.append(block(sec.get("content"), refs))
    for ts in doc.get("topicSections",[]):
        md.append("\n## " + ts.get("title","") + "\n")
        for ident in ts.get("identifiers",[]):
            r = refs.get(ident,{})
            url = r.get("url","")
            if url.startswith("/"): url = "https://developer.apple.com"+url
            ab = inline(r.get("abstract"), refs)
            md.append("- [%s](%s)%s" % (r.get("title",ident), url, (" — "+ab) if ab else ""))
    for ts in doc.get("seeAlsoSections",[]):
        md.append("\n## See also: " + ts.get("title","") + "\n")
        for ident in ts.get("identifiers",[]):
            r = refs.get(ident,{})
            url = r.get("url","")
            if url.startswith("/"): url = "https://developer.apple.com"+url
            md.append("- [%s](%s)" % (r.get("title",ident), url))
    text = "\n".join(md)
    return re.sub(r"\n{3,}", "\n\n", text)

if __name__ == "__main__":
    for f in sys.argv[1:]:
        doc = json.load(open(f))
        sys.stdout.write(render(doc) + "\n")
