import re
js = open("nikepoi-website/inline-script-4.js", encoding="utf-8").read()
for m in re.finditer(r"'([^']+\.json)'", js):
    print(m.group(1))
print("---ROUTES---")
for m in re.finditer(r"route:\s*'([^']+)'", js):
    print(m.group(1))
