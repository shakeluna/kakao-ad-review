"""
e-himart 이미지 로컬 다운로드 스크립트.

- Apps Script proxy 호출 → Target 시트 전체 행 수집
- 필터: Human_Result 빈값 AND url 에 'static2.e-himart.co.kr' 포함
- images/{md5(url)[:16]}.jpg 저장
- images/url_map.json 갱신 (key: 원본URL, value: 해시.jpg)
- 신규/스킵/실패 카운트 출력
- git add/commit/push 는 수동 수행

사용: python scripts/download_images.py
"""

import hashlib
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

import requests
import urllib3

# SSL 검증 비활성화 (Windows Python 환경 cert 누락 회피)
VERIFY = False
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

ROOT = Path(__file__).resolve().parent.parent
IMAGES_DIR = ROOT / "images"
URL_MAP_PATH = IMAGES_DIR / "url_map.json"

APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxDJWLpGePg4r9MKvjd2lBPp4vBFCwAfykNcSHaC7SpxlUzxCKhWs3bCd8vzGUsH7Tx/exec"
SECRET_TOKEN = "adreview2026"

TARGET_DOMAIN = "static2.e-himart.co.kr"
DOWNLOAD_HEADERS = {
    "Referer": "http://www.e-himart.co.kr/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120 Safari/537.36",
}

REQUEST_TIMEOUT = 15
SLEEP_BETWEEN = 0.05  # 50ms — origin 부하 방지


def hash_url(url: str) -> str:
    return hashlib.md5(url.encode("utf-8")).hexdigest()[:16]


def fetch_target_rows():
    params = {"action": "getData", "token": SECRET_TOKEN}
    r = requests.get(f"{APPS_SCRIPT_URL}?{urlencode(params)}", timeout=60, verify=VERIFY)
    r.raise_for_status()
    body = r.json()
    if not body.get("success"):
        raise RuntimeError(f"Apps Script error: {body.get('error')}")
    return body.get("data", [])


def load_url_map() -> dict:
    if URL_MAP_PATH.exists():
        try:
            return json.loads(URL_MAP_PATH.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"[WARN] url_map.json parse 실패, 새로 시작: {e}")
    return {}


def save_url_map(m: dict):
    URL_MAP_PATH.write_text(
        json.dumps(m, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )


def is_target_url(url: str) -> bool:
    if not isinstance(url, str):
        return False
    return TARGET_DOMAIN in url


def is_unreviewed(row: dict) -> bool:
    v = row.get("Human_Result")
    if v is None:
        return True
    if isinstance(v, str) and v.strip() == "":
        return True
    return False


def detect_ext(url: str, content_type: str) -> str:
    ct = (content_type or "").lower()
    if "png" in ct:
        return ".png"
    if "webp" in ct:
        return ".webp"
    if "gif" in ct:
        return ".gif"
    if "jpeg" in ct or "jpg" in ct:
        return ".jpg"
    m = re.search(r"\.([a-zA-Z0-9]{3,4})(?:\?|$)", url)
    if m:
        e = m.group(1).lower()
        if e in ("jpg", "jpeg", "png", "webp", "gif"):
            return ".jpg" if e == "jpeg" else f".{e}"
    return ".jpg"


def download(url: str) -> tuple[bytes, str]:
    r = requests.get(url, headers=DOWNLOAD_HEADERS, timeout=REQUEST_TIMEOUT, stream=False, verify=VERIFY)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "")


def main():
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    print("[1/3] Apps Script 데이터 fetch 중...")
    rows = fetch_target_rows()
    print(f"      전체 행: {len(rows)}")

    candidates = []
    seen = set()
    for r in rows:
        u = r.get("url")
        if not is_target_url(u):
            continue
        if not is_unreviewed(r):
            continue
        if u in seen:
            continue
        seen.add(u)
        candidates.append(u)
    print(f"      대상 (e-himart + 미검수 + unique): {len(candidates)}")

    url_map = load_url_map()
    print(f"      기존 매핑: {len(url_map)}")

    new_count = 0
    skip_count = 0
    fail_count = 0
    fail_log = []

    print("[2/3] 다운로드 중...")
    for idx, url in enumerate(candidates, 1):
        if url in url_map:
            target = IMAGES_DIR / url_map[url]
            if target.exists():
                skip_count += 1
                continue

        try:
            content, ct = download(url)
            ext = detect_ext(url, ct)
            fname = f"{hash_url(url)}{ext}"
            (IMAGES_DIR / fname).write_bytes(content)
            url_map[url] = fname
            new_count += 1
            if new_count % 25 == 0:
                save_url_map(url_map)
                print(f"      진행 {idx}/{len(candidates)} (신규 {new_count}, 스킵 {skip_count}, 실패 {fail_count})")
        except Exception as e:
            fail_count += 1
            fail_log.append((url, str(e)))

        time.sleep(SLEEP_BETWEEN)

    print("[3/3] url_map.json 저장...")
    save_url_map(url_map)

    print("")
    print("=" * 50)
    print(f"신규 다운로드: {new_count}")
    print(f"스킵 (기존):   {skip_count}")
    print(f"실패:         {fail_count}")
    print(f"총 매핑 수:    {len(url_map)}")
    print("=" * 50)

    if fail_log:
        log_path = ROOT / "scripts" / "download_failed.log"
        with log_path.open("w", encoding="utf-8") as f:
            for u, err in fail_log:
                f.write(f"{u}\t{err}\n")
        print(f"실패 로그: {log_path}")

    print("")
    print("다음 단계 (수동):")
    print("  cd C:/dist/temp/kakao-ad-review")
    print("  git add images/")
    print("  git commit -m 'feat: e-himart 이미지 로컬 캐시'")
    print("  git push")


if __name__ == "__main__":
    sys.exit(main() or 0)
