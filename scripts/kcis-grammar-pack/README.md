# KCIS grammar pack builder

One JSON bank → interactive quiz page (repo root) + print HTML for Google Docs.

```
python3 scripts/kcis-grammar-pack/build.py scripts/kcis-grammar-pack/banks/<slug>.json --out-dir . --gdoc-dir <scratch>
```

## Bank format

```json
{
  "slug": "kcis-g5-verb-patterns",          // file name: <slug>.html
  "title": "...", "subtitle": "...", "level": "Grade 5",
  "instructions_zh": "printed under the name line",
  "sections": [{
    "id": "A", "title": "Part A｜...", "title_zh": "...",
    "kind": "ing_to | not_to | three | pp",
    "rule": "English rule (first clause decides V-ing vs to V tips)",
    "directions": "printed under the section heading",
    "items": [{
      "p": "Every Sunday, Grandpa {1} {2} the paper and {3} tea.",
      "v": "enjoy",                 // main-verb cue; "not enjoy" for negatives
      "b": ["read", "drink"],       // base verbs for the choice blanks (the LAST len(b) blanks)
      "a": ["enjoys", "reading", "drinking"],   // one per {n}; "to see|see" = alternatives
      "pp": ["..."],                // kind=pp only: past participle per b
      "k": "every Sunday",          // tense / form clue shown in tips (put 被動 in it for p.p. answers)
      "zh": "中文翻譯"
    }]
  }]
}
```

Option sets generated per kind (shuffled with a fixed seed):

| kind | choice blank options |
|---|---|
| ing_to | to V / V-ing |
| not_to | first: not to V / don't V; later blanks are typed VR |
| three | to V / V-ing / VR |
| pp | VR / V-ing / p.p. |

Blanks before the choice blanks are typed (main verb, or Aux + verb for questions).
The build exits with an error if a blank count or answer doesn't match its options.
