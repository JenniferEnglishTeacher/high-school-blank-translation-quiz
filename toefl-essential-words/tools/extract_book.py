import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT.parent / "Essential-Words-For-The-TOEFL 7 edition.pdf"
OUT = ROOT / "data" / "units.json"

OVERRIDES = {
    "advantage": {"pos": "n.", "definition": "something that may help someone succeed or gain a benefit"},
    "brash": {"pos": "adj.", "definition": "overly confident or aggressive; careless about consequences"},
    "accelerate": {"pos": "v.", "definition": "to increase speed; to cause something to happen sooner"},
    "benefit": {"pos": "v.", "definition": "to be useful or helpful"},
    "conscientious": {"pos": "adj.", "definition": "careful, responsible, and serious about doing work well"},
    "coherent": {"pos": "adj.", "definition": "logical, clear, and easy to understand"},
    "accentuate": {"pos": "v.", "definition": "to highlight or give more importance to something"},
    "aptly": {"pos": "adv.", "definition": "appropriately; in a fitting way"},
    "acknowledge": {"pos": "v.", "definition": "to recognize, remember, and accept that something exists"},
    "chiefly": {"pos": "adv.", "definition": "mainly; for the most part"},
    "distinct": {"pos": "adj.", "definition": "clearly noticeable; different from something else"},
    "dense": {"pos": "adj.", "definition": "closely packed or crowded; difficult to see through"},
    "install": {"pos": "v.", "definition": "to set up or put equipment or software in place"},
    "enhance": {"pos": "v.", "definition": "to increase the value, power, quality, or beauty of something"},
    "prime": {"pos": "adj.", "definition": "main or first in importance"},
    "element": {"pos": "n.", "definition": "a basic part of a whole"},
    "extensive": {"pos": "adj.", "definition": "large in area, amount, or number"},
    "found": {"pos": "v.", "definition": "to establish or start an organization or institution"},
    "situated": {"pos": "adj.", "definition": "located in a particular place or position"},
    "particular": {"pos": "adj.", "definition": "specific; distinct from others"},
    "demonstration": {"pos": "n.", "definition": "a show, display, or explanation of how something works"},
    "moderate": {"pos": "adj.", "definition": "average in amount or degree; not extreme"},
    "synthesis": {"pos": "n.", "definition": "a combination of separate things that forms a whole"},
    "requisite": {"pos": "adj.", "definition": "needed for a specific purpose"},
    "magnitude": {"pos": "n.", "definition": "great size, extent, or importance"},
    "persistent": {"definition": "continuous; refusing to give up; firm in action or decision"},
    "valid": {"definition": "producing a desired result; based on truth or facts"},
    "halt": {"example": "Heavy snow forced the city to halt bus service until the roads were safe."},
    "in conjunction with": {"pos": "prep.", "definition": "together with; combined with", "example": "Regular exercise, in conjunction with a balanced diet, can improve long-term health."},
    "adhere": {"pos": "v.", "definition": "to stick to or follow precisely", "example": "All laboratory visitors must adhere to the safety rules posted beside the entrance."},
    "unwarranted": {"pos": "adj.", "definition": "without good reason or cause; inappropriate", "example": "The evidence was weak, so the scientist said the alarming conclusion was unwarranted."},
    "nevertheless": {"pos": "adv.", "definition": "in spite of that; however", "example": "The trail was steep and wet; nevertheless, the hikers reached the research station safely."},
    "withdraw": {"example": "After injuring her ankle, Maya chose to withdraw from the race before the final lap."},
    "contemporary": {"example": "The museum displays contemporary art created by artists who are working today."},
    "turbulent": {"example": "The flight became turbulent when strong winds began to shake the plane."},
    "baffle": {"example": "The unusual test results continued to baffle the researchers because no theory could explain them."},
    "purposefully": {"example": "The architect purposefully placed large windows on the south wall to capture more sunlight."},
    "mammoth": {"example": "Building the new bridge was a mammoth task that required thousands of workers."},
    "accurate": {"example": "The weather forecast was accurate, predicting the exact hour when the storm would arrive."},
    "superficial": {"example": "The damage looked serious, but the inspector found that the cracks were only superficial."},
    "uphold": {"example": "The court voted to uphold the law because it protected the rights of all citizens."},
    "diligent": {"example": "The diligent student checked every source carefully before submitting her report."},
    "redundant": {"example": "The final paragraph was redundant because it repeated the same idea without adding evidence."},
    "underscore": {"example": "The rapid rise in sea level underscores the need for stronger coastal protection."},
    "infancy": {"example": "The technology is still in its infancy, so researchers expect many improvements."},
    "proficient": {"example": "After years of practice, Elena became proficient in reading scientific articles in English."},
    "unlikely": {"example": "With clear skies and low humidity, rain is unlikely during the field trip."},
    "come across": {"example": "While searching the archive, the historian came across a letter that changed the investigation."},
    "means": {"example": "The scholarship gave Leo the financial means to attend university without taking a second job."},
    "varied": {"example": "The course uses varied materials, including maps, interviews, and scientific reports."},
    "plentiful": {"example": "Fresh water was plentiful near the mountain springs, so the settlement grew quickly."},
    "run into": {"example": "Researchers may run into unexpected problems when equipment is used in extreme weather."},
    "allusion": {"example": "The poem contains an allusion to a famous Greek myth that many readers recognize."},
    "flourishing": {"example": "The flourishing community garden produced enough vegetables for several local families."},
    "insufficient": {"example": "The evidence was insufficient to support the claim, so the study continued."},
    "reciprocate": {"example": "When neighboring villages shared food after the flood, the town promised to reciprocate their kindness."},
    "gratifying": {"example": "It was gratifying to see the injured bird recover and return to the wild."},
}


def clean(text: str) -> str:
    text = text.replace("\u00ad", "").replace("\ufffd", "")
    text = text.replace("aqj.", "adj.").replace("acy.", "adj.")
    text = re.sub(r"\birLanguage\.com\b", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip(" \n")


def lesson_starts(reader):
    starts = []
    for i in range(56, min(319, len(reader.pages))):
        text = reader.pages[i].extract_text() or ""
        lead = text[:1000]
        if "LESSON" in lead and "MULTIPLE" not in lead[:500] and "•" in lead[:800]:
            starts.append(i)
    if len(starts) != 30:
        raise RuntimeError(f"Expected 30 lesson starts, found {len(starts)}: {starts}")
    return starts


def bullet_words(page_text):
    words = []
    for line in page_text[:1100].splitlines():
        if "•" in line:
            words.extend(x.strip() for x in line.split("•")[1:] if x.strip())
    fixes = {
        "carryout": "carry out",
        "radiant irLanguage.com": "radiant",
        "workout": "work out",
    }
    return [fixes.get(w, w) for w in words]


def entry_pattern(word):
    # OCR sometimes collapses the space in phrasal entries such as "carry out".
    flexible = r"\s*".join(re.escape(part) for part in word.split())
    return re.compile(rf"(?im)^\s*{flexible}(?=\s|$)")


def extract_entry(block, word):
    raw = block.replace("\u00ad", "").replace("\ufffd", "")
    raw = raw.replace("aqj.", "adj.").replace("acy.", "adj.").replace("aclj.", "adj.")
    syn_match = re.search(r"\bsyn\.\s*", raw, flags=re.I)
    if not syn_match:
        sentences = [clean(x) for x in re.findall(r"[A-Z][^.!?]*[.!?]", raw)]
        return {"word": word, "pos": "", "definition": "", "example": sentences[0] if sentences else ""}

    before = raw[: syn_match.start()]
    pos_matches = list(re.finditer(r"\b(adj|adv|n|v|conj)\.\s*", before, flags=re.I))
    if pos_matches:
        candidates = []
        for idx, match in enumerate(pos_matches):
            end = pos_matches[idx + 1].start() if idx + 1 < len(pos_matches) else len(before)
            segment = clean(before[match.end() : end])
            score = len(re.findall(r"[A-Za-z]+", segment))
            candidates.append((score, idx, match, segment))
        _, _, primary, definition = max(candidates, key=lambda item: (item[0], item[1]))
        pos = primary.group(1).lower() + "."
    else:
        pos, definition = "", ""

    after = raw[syn_match.end() :]
    # The synonym occupies the remainder of the current line. Examples begin on
    # following lines and may wrap across lines in the PDF extraction.
    tail_lines = after.splitlines()
    example_text = clean(" ".join(tail_lines[1:])) if len(tail_lines) > 1 else ""
    examples = [clean(x) for x in re.findall(r"[A-Z][^.!?]*[.!?]", example_text)]
    example = examples[0] if examples else ""

    definition = re.sub(r"\b(?:ESSENTIAL WORDS FOR THE TOEFL|THE ESSENTIAL TOEFL VOCABULARY)\b", "", definition, flags=re.I)
    definition = re.sub(r"\s+\d{1,3}\s*$", "", definition)
    return {"word": word, "pos": pos, "definition": clean(definition), "example": example}


def main():
    reader = PdfReader(str(PDF))
    starts = lesson_starts(reader)
    units = []

    for unit_no, start in enumerate(starts, 1):
        start_text = reader.pages[start].extract_text() or ""
        words = bullet_words(start_text)
        expected = 17 if unit_no <= 14 or unit_no in range(16, 22) else 16
        if len(words) != expected:
            raise RuntimeError(f"Unit {unit_no}: expected {expected} words, found {len(words)}")

        end = start + 1
        while end < len(reader.pages):
            t = reader.pages[end].extract_text() or ""
            if "MATCHING" in t[:400] or "MATCIUNG" in t[:400]:
                break
            end += 1
        text = "\n".join((reader.pages[i].extract_text() or "") for i in range(start, end))

        matches = []
        for word in words:
            match = entry_pattern(word).search(text)
            if not match:
                raise RuntimeError(f"Unit {unit_no}: could not locate entry for {word!r}")
            matches.append((word, match))
        matches.sort(key=lambda item: item[1].start())

        entries = []
        for idx, (word, match) in enumerate(matches):
            block_end = matches[idx + 1][1].start() if idx + 1 < len(matches) else len(text)
            entry = extract_entry(text[match.start() : block_end], word)
            entry.update(OVERRIDES.get(word, {}))
            entries.append(entry)

        units.append({"unit": unit_no, "words": entries})

    all_entries = [entry for unit in units for entry in unit["words"]]
    if len(all_entries) != 500:
        raise RuntimeError(f"Expected 500 entries, found {len(all_entries)}")
    missing = [f"U{u['unit']}:{e['word']}" for u in units for e in u["words"] if not e["definition"] or not e["example"]]
    if missing:
        print(f"Warning: {len(missing)} entries need review: {', '.join(missing)}", file=sys.stderr)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"source": PDF.name, "units": units}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} with {len(units)} units and {len(all_entries)} entries")


if __name__ == "__main__":
    main()
