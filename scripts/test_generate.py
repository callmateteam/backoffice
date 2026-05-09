"""실제 Gemini 파이프라인으로 새 프롬프트 1글 생성 테스트.
새로 손본 BASE_PERSONA + E(업계관점) 프롬프트로 메인 글 + 1번 댓글 생성.
"""
import json
import os
import re
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_env():
    """`.env.local`에서 GEMINI_API_KEY 추출 — 점수 노출 X 등 정책 인지 안 함, 단순 파서"""
    env = {}
    with open(os.path.join(ROOT, ".env.local"), encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def extract_const(src: str, name: str) -> str:
    """threads.ts에서 `const NAME = \\`...\\`;` 백틱 본문 추출 (export 유무 모두 허용)"""
    pattern = re.compile(
        r"(?:export\s+)?const\s+" + re.escape(name) + r"\s*=\s*`(.*?)`;",
        re.DOTALL,
    )
    m = pattern.search(src)
    if not m:
        raise RuntimeError(f"{name} 추출 실패")
    return m.group(1)


def extract_category_prompt(src: str, cat: str) -> str:
    """CATEGORY_PROMPTS의 특정 카테고리 본문 추출 (BASE_PERSONA 인터폴레이션 포함된 형태 그대로)"""
    # CATEGORY_PROMPTS: Record<Category, string> = { ... } 블록 안에서 `cat: \`...\`,`
    # 키와 다음 콤마+개행+공백+다음키 사이를 잡는 패턴
    pattern = re.compile(
        r"\b" + re.escape(cat) + r"\s*:\s*`(.*?)`,\s*\n\s*[A-Z]\s*:",
        re.DOTALL,
    )
    m = pattern.search(src)
    if not m:
        # 마지막 카테고리(I)는 다음 키 없으니 } 종결로 잡기
        pattern_last = re.compile(
            r"\b" + re.escape(cat) + r"\s*:\s*`(.*?)`,?\s*\n\s*\};",
            re.DOTALL,
        )
        m = pattern_last.search(src)
    if not m:
        raise RuntimeError(f"카테고리 {cat} 프롬프트 추출 실패")
    return m.group(1)


def build_natural_dict_text(src: str) -> str:
    """IMPRESSION_NATURAL을 추출해서 '친근한 → ... / ... / ...' 형태 텍스트로"""
    # IMPRESSION_NATURAL: Record<string, string[]> = { ... };
    pat = re.compile(
        r"const\s+IMPRESSION_NATURAL\s*:\s*Record<string,\s*string\[\]>\s*=\s*\{(.*?)\};",
        re.DOTALL,
    )
    m = pat.search(src)
    if not m:
        raise RuntimeError("IMPRESSION_NATURAL 추출 실패")
    body = m.group(1)
    # 키: ['v1', 'v2', ...] 패턴
    line_pat = re.compile(r"^\s*([가-힣]+):\s*\[(.*?)\]", re.MULTILINE)
    lines = []
    for m2 in line_pat.finditer(body):
        key = m2.group(1)
        items = re.findall(r"'([^']+)'", m2.group(2))
        if not items:
            continue
        lines.append(f"{key} → {' / '.join(items[:3])}")
    return "\n".join(lines)


def call_gemini(api_key: str, system_prompt: str, user_prompt: str, model: str = "gemini-2.5-flash") -> str:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}"
        f":generateContent?key={api_key}"
    )
    body = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"parts": [{"text": user_prompt}]}],
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            data = json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Gemini HTTP {e.code}: {e.read().decode('utf-8')[:300]}")
    cands = data.get("candidates", [])
    if not cands:
        raise RuntimeError(f"No candidates: {data}")
    parts = cands[0].get("content", {}).get("parts", [])
    return "".join(p.get("text", "") for p in parts).strip()


def main():
    env = load_env()
    api_key = env.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("GEMINI_API_KEY 없음")

    src = open(os.path.join(ROOT, "src", "lib", "threads.ts"), encoding="utf-8").read()

    # 1) BASE_PERSONA에 IMPRESSION_NATURAL 사전을 인터폴레이션해서 완성
    base_persona_template = extract_const(src, "BASE_PERSONA")
    natural_dict_text = build_natural_dict_text(src)
    base_persona = base_persona_template.replace(
        "${Object.entries(IMPRESSION_NATURAL).map(([label, exprs]) => `${label} → ${exprs.slice(0, 3).join(' / ')}`).join('\\n')}",
        natural_dict_text,
    )

    # 2) E 카테고리 프롬프트 추출 후 ${BASE_PERSONA} 치환
    e_template = extract_category_prompt(src, "E")
    e_full = e_template.replace("${BASE_PERSONA}", base_persona)

    # 3) COMMENT_PROMPT 추출
    comment_prompt = extract_const(src, "COMMENT_PROMPT")

    # 4) 토픽 — E 풀 첫 번째 (GPT vs 우리 핵심)
    topic = "GPT로 광고 사진 만들면 다 비슷해 보이는 이유"

    user_prompt = (
        f"오늘 카테고리: E (업계관점)\n"
        f"주제: {topic}\n\n"
        "위 카테고리·주제로 500자 이하 Threads 글 작성."
    )

    print("=" * 70)
    print(f"[메인 글 생성 중] 카테고리 E (업계관점) / 주제: {topic}")
    print("=" * 70)
    main_post = call_gemini(api_key, e_full, user_prompt)
    print(main_post)
    print()
    print(f"[글자수: {len(main_post)}자]")
    print()

    # 5) 1번 댓글
    comment_user_prompt = (
        '앞서 쓴 메인 Threads 포스트:\n"""\n'
        f"{main_post}\n"
        '"""\n\n'
        '이 메인 글에 이어다는 1번 댓글을 작성하세요. '
        '메인의 결론·페인을 자연스럽게 이어받아서 '
        '"그래서 우리가 이런 거 만들고 있어요" 구조로요.'
    )
    print("=" * 70)
    print("[1번 댓글 생성 중] (서비스 소개 + DM CTA)")
    print("=" * 70)
    comment = call_gemini(api_key, comment_prompt, comment_user_prompt)
    print(comment)
    print()
    print(f"[글자수: {len(comment)}자]")


if __name__ == "__main__":
    main()
