#!/usr/bin/env bash
# pad_to_size.sh <input> <output> <size>
# Example: ./pad_to_size.sh index.html index_30mb.html 30M
# This wrapper prefers the Node implementation (pad_to_size.js). If node is missing,
# a Python3 fallback is used to perform the same insertion/append logic.

set -e

if [ "$#" -lt 3 ]; then
  echo "Usage: $0 <input> <output> <size>"
  exit 1
fi

INPUT="$1"
OUTPUT="$2"
SIZE_STR="$3"

# Prefer Node implementation if available
if command -v node >/dev/null 2>&1 && [ -f "$(dirname "$0")/pad_to_size.js" ]; then
  node "$(dirname "$0")/pad_to_size.js" "$INPUT" "$OUTPUT" "$SIZE_STR"
  exit $?
fi

# Otherwise try Python3 fallback
if ! command -v python3 >/dev/null 2>&1; then
  echo "Erreur: ni node (pad_to_size.js) ni python3 ne sont disponibles. Installe node ou python3."
  exit 2
fi

python3 - "$INPUT" "$OUTPUT" "$SIZE_STR" <<'PY'
import sys, os, codecs

def parse_size(s):
    if not s: return None
    s = s.strip()
    if not s: return None
    last = s[-1].upper()
    mul = 1
    num = s
    if last == 'K':
        mul = 1024; num = s[:-1]
    elif last == 'M':
        mul = 1024*1024; num = s[:-1]
    elif last == 'G':
        mul = 1024*1024*1024; num = s[:-1]
    try:
        n = float(num)
    except:
        return None
    return max(0, int(n * mul))

if len(sys.argv) < 4:
    print("Usage python fallback")
    sys.exit(1)

input_path = sys.argv[1]
output_path = sys.argv[2]
size_str = sys.argv[3]

if not os.path.exists(input_path):
    print("Input file not found:", input_path)
    sys.exit(2)

target = parse_size(size_str)
if target is None:
    print("Invalid size:", size_str)
    sys.exit(3)

with open(input_path, 'rb') as f:
    data = f.read()
cur_size = len(data)
if cur_size >= target:
    # copy as-is
    with open(output_path, 'wb') as fo:
        fo.write(data)
    print(f"Source ({cur_size}) >= target ({target}). Copied without padding.")
    sys.exit(0)

pad_size = target - cur_size
header = b"<!-- PADDING START (do not remove) -->\n"
footer = b"\n<!-- PADDING END -->\n"
overhead = len(header) + len(footer)
inner = pad_size - overhead
if inner < 0:
    inner = 0

# Try to decode as utf8 and insert before last </body>
inserted = False
try:
    text = data.decode('utf8')
    lower = text.lower()
    idx = lower.rfind('</body>')
    if idx != -1:
        before = text[:idx].encode('utf8')
        after = text[idx:].encode('utf8')
        filler = b" " * inner
        out = before + header + filler + footer + after
        with open(output_path, 'wb') as fo:
            fo.write(out)
        final_len = os.path.getsize(output_path)
        if final_len != target:
            # if size mismatched, append spaces/truncate as needed
            if final_len < target:
                with open(output_path, 'ab') as fo:
                    fo.write(b" " * (target - final_len))
            else:
                with open(output_path, 'r+b') as fo:
                    fo.truncate(target)
        print(f"Inserted padding before </body>, wrote {os.path.getsize(output_path)} bytes.")
        sys.exit(0)
except Exception as e:
    # fallback to append mode
    pass

# Append fallback
with open(output_path, 'wb') as fo:
    fo.write(data)
    fo.write(header)
    fo.write(b" " * inner)
    fo.write(footer)

final_len = os.path.getsize(output_path)
if final_len < target:
    with open(output_path, 'ab') as fo:
        fo.write(b" " * (target - final_len))
elif final_len > target:
    with open(output_path, 'r+b') as fo:
        fo.truncate(target)

print(f"Appended padding, wrote {os.path.getsize(output_path)} bytes.")
PY