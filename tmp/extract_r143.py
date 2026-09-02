#!/usr/bin/env python3
"""Extract R143 review findings from agent JSONL transcripts."""
import json, sys, glob, re, os

OUTDIR = "/home/gtax/Click Roguelike/tmp/r143_findings"
os.makedirs(OUTDIR, exist_ok=True)

agents = [
    ("combat",     "a5d943f1755a0a0e0"),
    ("save",       "a719bc2b5e942cd7e"),
    ("mahjong",    "a14639d2cb7951c15"),
    ("perf",       "af774114570077495"),
    ("spawner",    "abe6a262ec82d08b7"),
    ("render",     "a630ed6c5b85fe376"),
    ("systems",    "a0034ae6e9ce2246f"),
    ("integration","aca423804660ce602"),
    ("ui",         "af0cb1d85b4445681"),
    ("edge",       "a865dc764d7fa05a7"),
    ("audio",      "a3995d8b3242515c8"),
    ("boss",       "a26906619e2d42383"),
    ("security",   "a7b5fe2bfbe3a2029"),
    ("weapon",     "a50248532fe379fd2"),
]

all_findings = []

for name, aid in agents:
    outpath = f"/tmp/claude-1000/-home-gtax-Click-Roguelike/acf2f8e4-57c4-4f62-9460-23f389d4570a/tasks/{aid}.output"
    if not os.path.exists(outpath):
        print(f"[{name}] Not yet complete: {aid}")
        continue
    try:
        with open(outpath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"[{name}] Read error: {e}")
        continue

    # Extract all text content from the JSONL
    full_text = ""
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        # Look for assistant messages with content
        if obj.get("role") == "assistant":
            content = obj.get("content", "")
            if isinstance(content, str):
                full_text += content + "\n"
            elif isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        full_text += block.get("text", "") + "\n"

    if not full_text:
        print(f"[{name}] No content extracted")
        continue

    # Find FINDING patterns
    findings = re.findall(
        r'FINDING\s*#(\d+):\s*\[([^\]]+)\]\s*'
        r'Severity:\s*(P0|P1|P2)\s*'
        r'File:\s*([^\n]+?)\s*'
        r'Description:\s*([^\n]+(?:\n(?![FINDING])[^s].*)*?)(?=\n\s*Repro:|\nScore:|\nFINDING|#|$)'
        r'Repro:\s*([^\n]+)\s*'
        r'Fix:\s*([^\n]+)\s*'
        r'Score:\s*(\d+)',
        full_text, re.DOTALL
    )

    if findings:
        for f in findings:
            finding_id, title, severity, filepath, desc, repro, fix, score = f
            all_findings.append({
                "agent": name,
                "id": int(finding_id),
                "title": title.strip(),
                "severity": severity.strip(),
                "file": filepath.strip(),
                "description": desc.strip(),
                "repro": repro.strip(),
                "fix": fix.strip(),
                "score": int(score.strip()),
            })
        print(f"[{name}] Found {len(findings)} findings")
    else:
        # Try looser pattern
        loose = re.findall(r'FINDING\s*#\d+.*?Severity:\s*(P0|P1|P2).*?File:.*?(?=FINDING|#|$)', full_text, re.DOTALL)
        if loose:
            print(f"[{name}] Found {len(loose)} potential findings (loose match)")
        else:
            print(f"[{name}] No findings found")

# Summary
p0 = [f for f in all_findings if f["severity"] == "P0"]
p1 = [f for f in all_findings if f["severity"] == "P1"]
p2 = [f for f in all_findings if f["severity"] == "P2"]

print(f"\n=== R143 Summary ===")
print(f"Total findings: {len(all_findings)}")
print(f"P0: {len(p0)}, P1: {len(p1)}, P2: {len(p2)}")

if p0:
    print("\n--- P0 Findings ---")
    for f in p0:
        print(f"  [{f['agent']}] #{f['id']} {f['title']} @ {f['file']}")

if p1:
    print("\n--- P1 Findings ---")
    for f in p1:
        print(f"  [{f['agent']}] #{f['id']} {f['title']} @ {f['file']}")

# Save to JSON for later processing
with open(f"{OUTDIR}/findings.json", 'w') as out:
    json.dump(all_findings, out, indent=2, ensure_ascii=False)

print(f"\nSaved to {OUTDIR}/findings.json")
