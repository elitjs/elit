import os, re, json, glob

pkg_root = 'packages'
issues = []

for pkg_dir in sorted(os.listdir(pkg_root)):
    pkg_path = os.path.join(pkg_root, pkg_dir)
    if not os.path.isdir(pkg_path):
        continue

    pkg_json_path = os.path.join(pkg_path, 'package.json')
    if not os.path.exists(pkg_json_path):
        continue

    with open(pkg_json_path, 'r', encoding='utf-8') as f:
        pkg = json.load(f)
    declared = set((pkg.get('dependencies') or {}).keys())
    self_name = pkg.get('name', f'@elitjs/{pkg_dir}')

    imported = set()
    pattern = re.compile(r'''from\s+['"](@elitjs/[^'"\s]+)['"]''')
    for src_file in glob.glob(os.path.join(pkg_path, 'src', '**', '*.ts'), recursive=True):
        if os.sep + 'templates' + os.sep in src_file or src_file.endswith(os.sep + 'templates.ts'):
            continue
        try:
            with open(src_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception:
            continue
        for m in pattern.finditer(content):
            imported.add(m.group(1))

    missing = imported - declared - {self_name}
    if missing:
        issues.append((pkg_dir, sorted(missing)))

if issues:
    print('MISSING DEPS:')
    for pkg, deps in issues:
        print(f'  {pkg}: {deps}')
else:
    print('No missing @elitjs/* dep declarations.')
