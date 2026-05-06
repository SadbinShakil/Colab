content = open("c:/Users/100945766/Downloads/Thesis-master/CLAUDE.md", "r", encoding="utf-8").read()
# Verify it wrote correctly
print("First 80 chars:", repr(content[:80]))
print("Total length:", len(content))
