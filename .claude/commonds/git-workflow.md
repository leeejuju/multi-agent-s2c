---
description: Git 工作流命令
---

# Git 工作流命令

## 日常操作

### 查看状态
```bash
# 查看当前状态
git status

# 查看分支
git branch -a

# 查看最近提交
git log --oneline -10
```

### 创建新分支
```bash
# 创建功能分支
git checkout -b feat/agent-optimization

# 创建修复分支
git checkout -b fix/chat-bug

# 创建重构分支
git checkout -b refactor/config-structure
```

### 提交更改
```bash
# 查看更改
git diff

# 暂存文件
git add src/agents/new_agent.py
git add .claude/rules/agent-design.md

# 提交（遵循 Conventional Commits）
git commit -m "feat(agent): add new specialized agent for image processing"
```

## 提交规范

### 提交格式
```bash
<type>(<scope>): <subject>

# 类型：feat, fix, refactor, doc, test, chore, build, ci
# 范围：agent, chat, web, deps, config 等
# 主题：简短描述（小写，不超过 72 字符）
```

### 常用提交示例
```bash
# 新功能
git commit -m "feat(agent): add image generation agent"

# Bug 修复
git commit -m "fix(chat): resolve message streaming timeout issue"

# 重构
git commit -m "refactor(config): split model configuration into separate module"

# 文档
git commit -m "doc(readme): add setup instructions for new agents"

# 测试
git commit -m "test(agent): add unit tests for agent manager"

# 依赖更新
git commit -m "chore(deps): update langchain to version 1.2.12"

# 构建
git commit -m "build(web): update vite configuration for production"
```

### 详细提交（多行）
```bash
git commit -m "feat(agent): add multi-agent coordination

Implement agent coordination system using LangGraph:
- Add AgentCoordinator for task distribution
- Implement message routing between agents
- Add agent health monitoring

Closes #123"
```

## 分支管理

### 查看分支
```bash
# 查看本地分支
git branch

# 查看所有分支（包括远程）
git branch -a

# 查看分支详情
git branch -vv
```

### 切换分支
```bash
# 切换到已存在的分支
git checkout main
git switch main

# 切换到上一个分支
git checkout -
```

### 合并分支
```bash
# 合并功能分支到 main
git checkout main
git merge feat/new-agent

# 使用 squash 合并（保持历史整洁）
git merge --squash feat/new-agent
git commit -m "feat(agent): add new agent with all changes"
```

### 删除分支
```bash
# 删除本地分支
git branch -d feat/old-feature

# 强制删除未合并的分支
git branch -D feat/abandoned-feature

# 删除远程分支
git push origin --delete feat/old-feature
```

## 拉取请求

### 创建 PR
```bash
# 推送分支到远程
git push -u origin feat/new-agent

# 使用 gh CLI 创建 PR（需要安装 GitHub CLI）
gh pr create --title "feat(agent): add new agent" --body "Description of changes"

# 或在 GitHub 网页上创建 PR
```

### PR 检查清单
```bash
# 确保：
# - [ ] 代码遵循项目规范
# - [ ] 添加了必要的测试
# - [ ] 文档已更新
# - [ ] 所有测试通过
# - [ ] 提交信息遵循规范
```

### 更新 PR
```bash
# 添加更多提交
git commit -m "fix: address review comments"
git push

# 修改最近的提交
git commit --amend
git push --force-with-lease  # 谨慎使用
```

## 同步与更新

### 拉取最新更改
```bash
# 拉取并合并
git pull origin main

# 拉取并变基（保持历史整洁）
git pull --rebase origin main

# 获取所有远程分支信息
git fetch --all
```

### 同步分支
```bash
# 将 main 的更改合并到功能分支
git checkout feat/new-feature
git merge main

# 或使用 rebase
git rebase main
```

## 撤销更改

### 撤销工作区更改
```bash
# 撤销单个文件
git checkout -- file.py

# 撤销所有更改
git reset --hard HEAD

# 撤销暂存区的文件
git reset HEAD file.py
```

### 撤销提交
```bash
# 撤销最近的提交（保留更改）
git reset --soft HEAD~1

# 撤销最近的提交（丢弃更改）
git reset --hard HEAD~1

# 撤销特定提交（创建新提交）
git revert abc123
```

## 暂存与恢复

### 暂存更改
```bash
# 暂存当前工作
git stash push -m "work in progress"

# 暂存特定文件
git stash push -m "agent work" src/agents/

# 暂存包括未跟踪的文件
git stash push -u -m "all work"
```

### 恢复暂存
```bash
# 查看暂存列表
git stash list

# 应用最近的暂存
git stash pop

# 应用特定暂存
git stash apply stash@{1}

# 删除暂存
git stash drop stash@{0}
```

## 历史查看

### 查看提交历史
```bash
# 简洁查看
git log --oneline -10

# 查看分支图
git log --graph --oneline --all

# 查看特定文件的历史
git log --follow -- file.py

# 查看特定作者的提交
git log --author="Your Name"
```

### 查看更改详情
```bash
# 查看特定提交的更改
git show abc123

# 查看特定文件的更改
git show abc123:path/to/file.py

# 比较两个分支
git diff main..feature-branch
```

## 标签管理

### 创建标签
```bash
# 创建轻量标签
git tag v1.0.0

# 创建附注标签
git tag -a v1.0.0 -m "Release version 1.0.0"

# 推送标签到远程
git push origin v1.0.0

# 推送所有标签
git push origin --tags
```

### 查看标签
```bash
# 列出所有标签
git tag

# 查看标签详情
git show v1.0.0
```

## 清理与维护

### 清理
```bash
# 清理未跟踪的文件
git clean -f

# 清理未跟踪的文件和目录
git clean -fd

# 清理忽略的文件
git clean -fdX

# 垃圾回收
git gc
```

### 维护
```bash
# 检查仓库完整性
git fsck

# 查看仓库大小
git count-objects -vH
```
