# Roadmap Migration to GitHub Projects

This guide helps you migrate the static roadmap (`docs/roadmap.md`) to a dynamic GitHub Projects board.

## Overview

GitHub Projects provides:

- **Roadmap view**: Timeline-based planning with milestones
- **Board view**: Kanban-style workflow (To Do → In Progress → Done)
- **Table view**: Spreadsheet-like task management
- **Integration**: Issues, PRs, and milestones linked directly to code

## Step 1: Create GitHub Project

1. Go to your repository: `https://github.com/fcortesbio/BiteTrack`
2. Click **Projects** tab → **New project**
3. Choose **Roadmap** layout (or **Board** for Kanban)
4. Name it: **"BiteTrack Delivery Roadmap"**
5. Set visibility (Public/Private)

## Step 2: Set Up Custom Fields

Add these custom fields to your project:

### Status Field (Single Select)

- `Not Started`
- `In Progress`
- `Blocked`
- `Done`

### Phase Field (Single Select)

- `P1 - Stabilize Core Services`
- `P2 - Developer Experience & Quality`
- `P3 - Product Features`
- `P4 - Deployment & Scaling`
- `P5 - Documentation & Launch`

### Area Field (Single Select)

- `API`
- `Frontend`
- `MCP`
- `Infrastructure`
- `Testing`
- `Documentation`

### Priority Field (Single Select)

- `Critical`
- `High`
- `Medium`
- `Low`

## Step 3: Create Labels

Run this script or create labels manually:

```bash
# Labels for phases
gh label create "phase::p1" --description "Phase 1: Stabilize Core Services" --color "0E8A16"
gh label create "phase::p2" --description "Phase 2: Developer Experience & Quality" --color "1D76DB"
gh label create "phase::p3" --description "Phase 3: Product Features" --color "B60205"
gh label create "phase::p4" --description "Phase 4: Deployment & Scaling" --color "D93F0B"
gh label create "phase::p5" --description "Phase 5: Documentation & Launch" --color "5319E7"

# Labels for areas
gh label create "area::api" --description "Backend API work" --color "0052CC"
gh label create "area::frontend" --description "Frontend/React work" --color "E3E341"
gh label create "area::mcp" --description "MCP server work" --color "FBCA04"
gh label create "area::infrastructure" --description "Docker/infra work" --color "0E8A16"
gh label create "area::testing" --description "Testing improvements" --color "D4C5F9"
gh label create "area::docs" --description "Documentation" --color "FFFFFF"

# Priority labels
gh label create "priority::critical" --description "Critical priority" --color "B60205"
gh label create "priority::high" --description "High priority" --color "D93F0B"
gh label create "priority::medium" --description "Medium priority" --color "FBCA04"
gh label create "priority::low" --description "Low priority" --color "0E8A16"
```

## Step 4: Create Milestones

Create milestones for each phase:

```bash
gh api repos/fcortesbio/BiteTrack/milestones -X POST -f title="Phase 1: Stabilize Core Services" -f description="API hardening, Frontend MVP, MCP polish"
gh api repos/fcortesbio/BiteTrack/milestones -X POST -f title="Phase 2: Developer Experience" -f description="Automation scripts, testing targets, observability"
gh api repos/fcortesbio/BiteTrack/milestones -X POST -f title="Phase 3: Product Features" -f description="Dashboard experience, API enhancements, MCP assistant"
gh api repos/fcortesbio/BiteTrack/milestones -X POST -f title="Phase 4: Deployment & Scaling" -f description="Secure infra, CI/CD, backups, performance"
gh api repos/fcortesbio/BiteTrack/milestones -X POST -f title="Phase 5: Documentation & Launch" -f description="Polished docs, changelog, UAT sign-off"
```

## Step 5: Create Issues from Roadmap

Use the provided script (`scripts/migrate-roadmap-to-issues.js`) to automatically create issues from the roadmap, or create them manually using the template below.

### Issue Template

For each roadmap item, create an issue with:

**Title**: `[Phase X] Brief task description`

**Body**:

```markdown
## Description

[Detailed description from roadmap]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Related

- Part of Phase X
- Blocks: [issue numbers]
- Blocked by: [issue numbers]

## Notes

[Any additional context]
```

**Labels**: `phase::pX`, `area::xxx`, `priority::xxx`

**Milestone**: Select appropriate phase milestone

## Step 6: Add Issues to Project

1. Open your GitHub Project
2. Click **+ Add item** → **Issue**
3. Select issues to add
4. Set custom fields:
   - **Status**: `Not Started`
   - **Phase**: Select appropriate phase
   - **Area**: Select area
   - **Priority**: Set priority

## Step 7: Configure Project Views

### Roadmap View

- Group by: **Milestone**
- Filter: Show all phases
- Timeline: Set start/end dates for each milestone

### Board View

- Columns: `Not Started` | `In Progress` | `Blocked` | `Done`
- Group by: **Phase** or **Area**
- Filter: Use labels to show specific areas

### Table View

- Columns: Title, Status, Phase, Area, Priority, Assignee, Milestone
- Sort by: Priority, then Phase

## Step 8: Set Up Automation (Optional)

GitHub Projects supports automation rules:

1. **Auto-status on PR merge**: When PR is merged, set issue status to `Done`
2. **Auto-label**: When issue is added to project, apply phase label
3. **Auto-milestone**: Link issues to milestones based on phase

## Maintenance

- **Weekly**: Review `In Progress` items, update statuses
- **Monthly**: Move completed items to `Done`, shift `Next` items to `Now`
- **Per milestone**: Archive completed phase, create new phase view

## Quick Reference

- **Project URL**: `https://github.com/users/fcortesbio/projects/X`
- **Issues filter**: `is:issue label:phase::p1`
- **Roadmap view**: Shows timeline across all phases
- **Board view**: Kanban workflow per phase

## Next Steps

1. Run `scripts/migrate-roadmap-to-issues.js` to create issues automatically
2. Add issues to your GitHub Project
3. Configure views (Roadmap, Board, Table)
4. Set up automation rules
5. Start tracking work!
