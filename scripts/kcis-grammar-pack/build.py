#!/usr/bin/env python3
"""KCIS grammar pack builder.

One JSON question bank -> two outputs:
  1. <slug>.html            interactive quiz for GitHub Pages (repo root)
  2. <slug>-gdoc.html       print layout (student pages + answer key) to upload
                            to Google Drive as text/html -> converts to a Google Doc

Usage:
  python3 scripts/kcis-grammar-pack/build.py scripts/kcis-grammar-pack/banks/<slug>.json [--out-dir .] [--gdoc-dir DIR]

Bank format: see README.md next to this file.
"""
import argparse, html, json, random, re, sys
from pathlib import Path

DOUBLE = {"run","swim","sit","get","put","stop","set","cut","shop","plan","jog","hit","win","drop",
          "begin","clap","skip","dig","chat","hug","rub","nod","shut","forget","let","sit","beg","prefer"}
ING_EXCEPT = {"lie":"lying","die":"dying","tie":"tying","be":"being","see":"seeing","flee":"fleeing",
              "agree":"agreeing","ski":"skiing","dye":"dyeing","picnic":"picnicking","panic":"panicking"}
SENSE = ("see","hear","watch","listen to","notice","feel")
CAUSATIVE = ("make","have","let")
PAST_IRREG = {"made","had","let","got","told","asked","saw","heard","watched","listened to"}


def ing(v):
    v = v.strip()
    if v in ING_EXCEPT: return ING_EXCEPT[v]
    if v.endswith("ie"): return v[:-2] + "ying"
    if v in DOUBLE: return v + v[-1] + "ing"
    if v.endswith("e") and not v.endswith(("ee","ye","oe")): return v[:-1] + "ing"
    return v + "ing"


def base_verb(v):
    return re.sub(r"^not\s+", "", v.strip())


def alts(a):
    return [x.strip() for x in a.split("|")]


def key_text(a):
    xs = alts(a)
    if len(xs) == 2 and xs[0] == "to " + xs[1]:
        return f"(to) {xs[1]}"
    return " or ".join(xs)


def options_for(kind, sec_id, qi, bi, verb, pp, seed):
    """Return option list (or None for a free-text blank) for choice blank number bi."""
    if kind == "ing_to":
        opts = [f"to {verb}", ing(verb)]
    elif kind == "not_to":
        if bi > 0: return None
        opts = [f"not to {verb}", f"don't {verb}"]
    elif kind == "three":
        opts = [f"to {verb}", ing(verb), verb]
    elif kind == "pp":
        opts = [verb, ing(verb), pp]
        if pp == verb:  # cut / set / put / read: show the p.p. label so students still see 3 choices
            opts = [verb, ing(verb), f"{pp} (p.p.)"]
    else:
        raise ValueError(kind)
    random.Random(f"{seed}-{sec_id}-{qi}-{bi}").shuffle(opts)
    return opts


def build_items(bank):
    out = []
    for sec in bank["sections"]:
        kind = sec["kind"]
        for qi, it in enumerate(sec["items"], 1):
            n = len(re.findall(r"\{\d+\}", it["p"]))
            ans = it["a"]
            if n != len(ans):
                sys.exit(f"[{sec['id']}{qi}] {n} blanks but {len(ans)} answers: {it['p']}")
            nb = len(it["b"])
            first_choice = n - nb
            blanks = []
            for j, a in enumerate(ans):
                if j < first_choice:
                    blanks.append({"answers": alts(a), "options": None, "role": "main", "key": key_text(a)})
                    continue
                bi = j - first_choice
                pp = (it.get("pp") or [None] * nb)[bi]
                opts = options_for(kind, sec["id"], qi, bi, it["b"][bi], pp, bank["slug"])
                accepted = alts(a)
                if opts:
                    # map accepted answers to option labels; "(p.p.)" suffix allowed
                    label_ok = [o for o in opts if re.sub(r" \(p\.p\.\)$", "", o) in accepted]
                    if not label_ok:
                        sys.exit(f"[{sec['id']}{qi}] answer {a!r} not among options {opts}")
                    # when the answer equals both VR and p.p. (cut/set), keep the intended one only
                    if kind == "pp" and len(label_ok) > 1:
                        want_pp = "被動" in it.get("k", "")
                        label_ok = [o for o in label_ok if o.endswith("(p.p.)") == want_pp]
                    accepted = label_ok
                blanks.append({"answers": accepted, "options": opts, "role": "choice", "key": key_text(a)})
            full = it["p"]
            for j, a in enumerate(ans, 1):
                full = full.replace("{%d}" % j, alts(a)[0])
            out.append({
                "id": f"{sec['id']}{qi}", "sec": sec["id"], "n": qi, "group": sec["title"],
                "p": it["p"], "verb": it["v"], "blanks": blanks, "sentence": full,
                "zh": it.get("zh", ""), "tip": tip(sec, it), "cue": cue_text(sec, it, blanks),
            })
    return out


def tip(sec, it):
    v = base_verb(it["v"]); k = it.get("k", "")
    kind = sec["kind"]
    if kind == "ing_to":
        rule = f"{v} + V-ing" if "V-ing" in sec["rule"].split(";")[0] else f"{v} + to V（and／or 後的 to 可省略）"
    elif kind == "not_to":
        rule = f"{v} + 受詞 + not to V；or 後面接原形 VR"
    elif kind == "three":
        rule = f"{v} + 受詞 + VR（原形）" if v in CAUSATIVE else f"{v} + 受詞 + to V（and 後的 to 可省略）"
    else:
        a = alts(it["a"][-1])[0]; b = it["b"][0]
        if "被動" in k: rule = f"{v} + 受詞 + p.p.：受詞「被」動作（by …）"
        elif a == ing(b): rule = f"{v} + 受詞 + V-ing：當下正在進行"
        else: rule = f"{v} + 受詞 + VR：看／聽到整個動作從頭到尾"
    return f"{rule}｜時態線索：{k}" if k else rule


def cue_text(sec, it, blanks):
    parts = [it["v"]]
    for b in blanks:
        if b["role"] == "choice":
            parts.append(" / ".join(b["options"]) if b["options"] else None)
    if sec["kind"] == "not_to":
        parts = [it["v"], " / ".join(blanks[-2]["options"]), it["b"][-1]]
    return "（" + "｜".join(p for p in parts if p) + "）"


# ---------------------------------------------------------------- quiz HTML
QUIZ_TEMPLATE = Path(__file__).with_name("quiz_template.html")


def write_quiz(bank, items, out_dir):
    data = {"title": bank["title"], "subtitle": bank["subtitle"], "slug": bank["slug"],
            "sections": [{"id": s["id"], "title": s["title"], "zh": s["title_zh"], "rule": s["rule"]} for s in bank["sections"]],
            "items": items}
    tpl = QUIZ_TEMPLATE.read_text(encoding="utf-8")
    page = (tpl.replace("__TITLE__", html.escape(bank["title"]))
               .replace("__SUBTITLE__", html.escape(bank["subtitle"]))
               .replace("__COUNT__", str(len(items)))
               .replace("__DATA__", json.dumps(data, ensure_ascii=False).replace("</", "<\\/")))
    path = Path(out_dir) / f"{bank['slug']}.html"
    path.write_text(page, encoding="utf-8")
    return path


# ---------------------------------------------------------------- Google Doc HTML
BLANK = "____________"


def gdoc_question(it):
    s = html.escape(it["p"], quote=False)
    s = re.sub(r"\{\d+\}", BLANK, s)
    return s


def write_gdoc(bank, items, gdoc_dir):
    e = lambda t: html.escape(t, quote=False)
    navy = "#1a3a5c"
    out = [f'<html><head><meta charset="utf-8"><title>{e(bank["title"])}</title></head><body style="font-family:Arial;font-size:12pt">']
    out.append(f'<h1 style="color:{navy};font-size:18pt">{e(bank["title"])}</h1>')
    out.append(f'<p style="font-size:11pt">Name: ________________ &nbsp;&nbsp; Class: ________ &nbsp;&nbsp; No.: ______ &nbsp;&nbsp; Date: ____________ &nbsp;&nbsp; Score: ______ / {len(items)}</p>')
    out.append(f'<p style="font-size:11pt;color:#444">{e(bank["instructions_zh"])}</p>')
    by_sec = {}
    for it in items: by_sec.setdefault(it["sec"], []).append(it)
    for sec in bank["sections"]:
        out.append(f'<h2 style="color:#ffffff;background-color:{navy};font-size:13pt">&nbsp;{e(sec["title"])}　{e(sec["title_zh"])}</h2>')
        out.append(f'<p style="font-size:11pt"><i>{e(sec["directions"])}</i></p>')
        for i, it in enumerate(by_sec[sec["id"]], 1):
            out.append(f'<p style="line-height:2">{i}. {gdoc_question(it)} {e(it["cue"])}</p>')
            if i % 5 == 0 and i != len(by_sec[sec["id"]]):
                out.append('<hr>')
    out.append('<p style="page-break-before:always"></p>')
    out.append(f'<h1 style="color:{navy};font-size:18pt">Answer Key 解答</h1>')
    for sec in bank["sections"]:
        out.append(f'<h2 style="color:#ffffff;background-color:{navy};font-size:13pt">&nbsp;{e(sec["title"])}</h2>')
        out.append(f'<p style="font-size:10pt;color:#444">Rule: {e(sec["rule"])}</p>')
        for i, it in enumerate(by_sec[sec["id"]], 1):
            ans = " ／ ".join(b["key"] for b in it["blanks"])
            out.append(f'<p>{i}. <b>{e(ans)}</b>　{e(it["zh"])}</p>')
    out.append('</body></html>')
    path = Path(gdoc_dir) / f"{bank['slug']}-gdoc.html"
    path.write_text("\n".join(out), encoding="utf-8")
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("bank")
    ap.add_argument("--out-dir", default=".")
    ap.add_argument("--gdoc-dir", default=".")
    a = ap.parse_args()
    bank = json.loads(Path(a.bank).read_text(encoding="utf-8"))
    items = build_items(bank)
    q = write_quiz(bank, items, a.out_dir)
    g = write_gdoc(bank, items, a.gdoc_dir)
    counts = {s["id"]: len(s["items"]) for s in bank["sections"]}
    print(f"OK {len(items)} items {counts}\nquiz: {q}\ngdoc: {g}")


if __name__ == "__main__":
    main()
