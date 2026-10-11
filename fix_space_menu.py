from pathlib import Path
import re
import sys

source = Path("static/index.html.broken-menu-backup")
target = Path("static/index.html")

if not source.exists():
    sys.exit("ERROR: Saved menu backup was not found.")

html = source.read_text()

marker = "// COSMOSIM Space Menu extension"
start = html.find(marker)
end = html.find("function animate(){", start)

if start == -1 or end == -1:
    sys.exit("ERROR: Could not locate the menu extension. No files changed.")

extension = html[start:end]

# Rename only calls/declaration of the helper function.
# References like the original glow.visible remain unchanged.
extension, count = re.subn(
    r"\bglow(?=\s*\()",
    "simGlowMat",
    extension
)

if count == 0:
    sys.exit("ERROR: No glow() helper found in the menu extension. No files changed.")

fixed = html[:start] + extension + html[end:]

# Save a separate copy before activating the repaired version.
Path("static/index.html.menu-fixed").write_text(fixed)
target.write_text(fixed)

print(f"Repaired menu helper references: {count}")
print("Saved repaired copy: static/index.html.menu-fixed")
print("Activated repaired page: static/index.html")
