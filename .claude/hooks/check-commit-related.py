#!/usr/bin/env python3
"""
Git pre-commit hook - 检查提交的文件是否相关，建议分批提交
"""

import subprocess
import sys
from pathlib import Path

# 文件分组规则
GROUPS = {
    'frontend': ['web/', 'web/src/', '.vue', '.ts', '.tsx'],
    'backend': ['src/', 'server/', '.py'],
    'config': ['.env', '.json', '.yaml', '.yml', '.toml'],
    'docs': ['README', 'CHANGELOG', 'docs/', '.md'],
    'git': ['.gitignore', 'gitignore'],
    'build': ['package.json', 'package-lock.json', 'pyproject.toml', 'requirements.txt'],
    'ci': ['.github/', '.gitlab-ci.yml', 'Dockerfile'],
    'claude': ['.claude/'],
}


def get_staged_files() -> list[str]:
    """获取暂存区的文件列表"""
    try:
        output = subprocess.check_output(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM'],
            text=True
        )
        return [f for f in output.strip().split('\n') if f]
    except subprocess.CalledProcessError:
        return []


def categorize_file(file_path: str) -> list[str]:
    """根据文件路径归类"""
    categories = []

    for group, patterns in GROUPS.items():
        if any(p in file_path or file_path.endswith(p) for p in patterns):
            categories.append(group)

    return categories if categories else ['other']


def analyze_relatedness(files: list[str]) -> dict:
    """分析文件相关性"""
    grouped: dict[str, list[str]] = {}

    for file_path in files:
        categories = categorize_file(file_path)
        for cat in categories:
            grouped.setdefault(cat, []).append(file_path)

    group_count = len(grouped)
    is_related = group_count <= 1

    suggestions = []
    if not is_related:
        suggestions.append('\n⚠️  检测到不相关的文件被一起提交:\n')
        for group, files in grouped.items():
            suggestions.append(f'  [{group}]:')
            suggestions.extend(f'    - {f}' for f in files)
        suggestions.append('\n💡 建议按分组分别提交:')
        for group, files in grouped.items():
            suggestions.append(f'  git add {" ".join(files)} && git commit -m "..."')
        suggestions.append('\n跳过此检查使用: git commit --no-verify')

    return {
        'is_related': is_related,
        'groups': grouped,
        'suggestions': suggestions
    }


def main() -> int:
    files = get_staged_files()

    if not files:
        return 0

    result = analyze_relatedness(files)

    if not result['is_related']:
        print('\n'.join(result['suggestions']), file=sys.stderr)
        return 1

    print(f'✅ 提交检查通过: {len(files)} 个文件属于同一类变更')
    return 0


if __name__ == '__main__':
    sys.exit(main())
