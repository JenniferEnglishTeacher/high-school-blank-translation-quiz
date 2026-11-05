import json
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "units.json"


def translate(text: str) -> str:
    query = urllib.parse.urlencode(
        {"client": "gtx", "sl": "en", "tl": "zh-TW", "dt": "t", "q": text}
    )
    req = urllib.request.Request(
        "https://translate.googleapis.com/translate_a/single?" + query,
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return "".join(part[0] for part in payload[0] if part[0]).strip()


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    completed = 0
    for unit in data["units"]:
        for entry in unit["words"]:
            if entry.get("zh"):
                continue
            for attempt in range(4):
                try:
                    entry["zh"] = translate(entry["definition"])
                    completed += 1
                    break
                except Exception:
                    if attempt == 3:
                        raise
                    time.sleep(1.5 * (attempt + 1))
            time.sleep(0.04)
        DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Unit {unit['unit']:02d}: translations saved")
    print(f"Added {completed} Traditional Chinese definitions")


if __name__ == "__main__":
    main()
