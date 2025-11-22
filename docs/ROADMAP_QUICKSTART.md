# Quick Start: GitHub Projects Roadmap

## 5-Minute Setup

### 1. Create Project (2 min)

1. Go to: `https://github.com/fcortesbio/BiteTrack`
2. Click **Projects** → **New project**
3. Choose **Roadmap** layout
4. Name: **"BiteTrack Delivery Roadmap"**

### 2. Create Labels (1 min)

Run this one-liner:

```bash
gh label create "phase::p1" -d "Phase 1" -c "0E8A16" && \
gh label create "phase::p2" -d "Phase 2" -c "1D76DB" && \
gh label create "phase::p3" -d "Phase 3" -c "B60205" && \
gh label create "phase::p4" -d "Phase 4" -c "D93F0B" && \
gh label create "phase::p5" -d "Phase 5" -c "5319E7" && \
gh label create "area::api" -d "API work" -c "0052CC" && \
gh label create "area::frontend" -d "Frontend work" -c "E3E341" && \
gh label create "area::mcp" -d "MCP work" -c "FBCA04" && \
gh label create "area::infrastructure" -d "Infra work" -c "0E8A16" && \
gh label create "area::testing" -d "Testing" -c "D4C5F9" && \
gh label create "area::docs" -d "Documentation" -c "FFFFFF" && \
gh label create "priority::critical" -d "Critical priority" -c "B60205" && \
gh label create "priority::high" -d "High priority" -c "D93F0B" && \
gh label create "priority::medium" -d "Medium priority" -c "FBCA04" && \
gh label create "priority::low" -d "Low priority" -c "0E8A16"
```

### 3. Create Milestones (1 min)

```bash
gh api repos/fcortesbio/BiteTrack/milestones -X POST -f title="Phase 1: Stabilize Core Services" -f description="API hardening, Frontend MVP, MCP polish"
gh api repos/fcortesbio/BiteTrack/milestones -X POST -f title="Phase 2: Developer Experience" -f description="Automation, testing, observability"
gh api repos/fcortesbio/BiteTrack/milestones -X POST -f title="Phase 3: Product Features" -f description="Dashboard, API enhancements, MCP assistant"
gh api repos/fcortesbio/BiteTrack/milestones -X POST -f title="Phase 4: Deployment & Scaling" -f description="Secure infra, CI/CD, backups"
gh api repos/fcortesbio/BiteTrack/milestones -X POST -f title="Phase 5: Documentation & Launch" -f description="Docs, changelog, UAT"
```

### 4. Migrate Issues (1 min)

```bash
# Dry run first (see what will be created)
node scripts/migrate-roadmap-to-issues.js --dry-run

# Create all issues
node scripts/migrate-roadmap-to-issues.js

# Or create issues for specific phase
node scripts/migrate-roadmap-to-issues.js --phase=P1
```

### 5. Add to Project

1. Open your GitHub Project
2. Click **+ Add item** → **Issue**
3. Select all created issues
4. Set custom fields (Status, Phase, Area, Priority)

## Project Views

### Roadmap View

- **Group by**: Milestone
- **Timeline**: Shows phases over time
- **Filter**: Use labels to focus on specific areas

### Board View

- **Columns**: `Not Started` | `In Progress` | `Blocked` | `Done`
- **Group by**: Phase or Area
- **Filter**: `label:phase::p1` to show only Phase 1

### Table View

- **Columns**: Title, Status, Phase, Area, Priority, Assignee
- **Sort**: Priority → Phase

## Daily Workflow

1. **Start work**: Move issue from `Not Started` → `In Progress`
2. **Create PR**: Link PR to issue (use `Closes #123` in PR description)
3. **Complete**: Merge PR → issue auto-moves to `Done` (if automation set up)

## Weekly Review

1. Review `In Progress` items
2. Move completed to `Done`
3. Shift `Next` items to `Now` (update status)

## Tips

- **Use filters**: `label:phase::p1 label:area::api` to focus
- **Link PRs**: Add `Closes #123` to auto-close issues
- **Update status**: Keep project board current
- **Add notes**: Use issue comments for context

## Need Help?

See `docs/ROADMAP_MIGRATION.md` for detailed instructions.
