#!/usr/bin/env node

/**
 * Roadmap to GitHub Issues Migration Script
 *
 * This script reads the roadmap markdown and creates GitHub issues for each task.
 * Requires GitHub CLI (gh) to be installed and authenticated.
 *
 * Usage:
 *   node scripts/migrate-roadmap-to-issues.js [--dry-run] [--phase=P1]
 *
 * Options:
 *   --dry-run    Show what would be created without creating issues
 *   --phase=PX   Only create issues for specific phase (P1, P2, P3, P4, P5)
 */

import fs from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROADMAP_PATH = path.join(__dirname, "..", "docs", "roadmap.md");
const REPO = "fcortesbio/BiteTrack";

// Phase mapping
const PHASE_MAP = {
  "Phase 1": {
    label: "phase::p1",
    milestone: "Phase 1: Stabilize Core Services",
    priority: "high",
  },
  "Phase 2": {
    label: "phase::p2",
    milestone: "Phase 2: Developer Experience",
    priority: "medium",
  },
  "Phase 3": {
    label: "phase::p3",
    milestone: "Phase 3: Product Features",
    priority: "medium",
  },
  "Phase 4": {
    label: "phase::p4",
    milestone: "Phase 4: Deployment & Scaling",
    priority: "high",
  },
  "Phase 5": {
    label: "phase::p5",
    milestone: "Phase 5: Documentation & Launch",
    priority: "low",
  },
};

// Area detection from content
function detectArea(title, description) {
  const lower = (title + " " + description).toLowerCase();
  if (
    lower.includes("api") ||
    lower.includes("swagger") ||
    lower.includes("route")
  ) {
    return "area::api";
  }
  if (
    lower.includes("frontend") ||
    lower.includes("react") ||
    lower.includes("dashboard") ||
    lower.includes("ui")
  ) {
    return "area::frontend";
  }
  if (
    lower.includes("mcp") ||
    lower.includes("code executor") ||
    lower.includes("sandbox")
  ) {
    return "area::mcp";
  }
  if (
    lower.includes("docker") ||
    lower.includes("traefik") ||
    lower.includes("infrastructure") ||
    lower.includes("deployment")
  ) {
    return "area::infrastructure";
  }
  if (
    lower.includes("test") ||
    lower.includes("jest") ||
    lower.includes("coverage")
  ) {
    return "area::testing";
  }
  if (
    lower.includes("doc") ||
    lower.includes("readme") ||
    lower.includes("changelog")
  ) {
    return "area::docs";
  }
  return "area::api"; // default
}

// Parse roadmap markdown
async function parseRoadmap() {
  const content = await fs.readFile(ROADMAP_PATH, "utf-8");
  const issues = [];
  let currentPhase = null;
  let currentSection = null;

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect phase
    if (line.startsWith("## Phase ")) {
      const match = line.match(/Phase (\d+)/);
      if (match) {
        currentPhase = `Phase ${match[1]}`;
        currentSection = null;
      }
      continue;
    }

    // Detect section (API Hardening, Frontend MVP, etc.)
    if (line.startsWith("**") && line.endsWith("**") && currentPhase) {
      currentSection = line.replace(/\*\*/g, "").trim();
      continue;
    }

    // Detect task items (lines starting with -)
    if (line.startsWith("- ") && currentPhase && currentSection) {
      const task = line.substring(2).trim();
      if (task && !task.startsWith("Part of") && !task.startsWith("Blocks:")) {
        const area = detectArea(currentSection, task);
        const phaseInfo = PHASE_MAP[currentPhase];

        issues.push({
          title: `[${currentPhase}] ${currentSection}: ${task.substring(0, 60)}${task.length > 60 ? "..." : ""}`,
          body: createIssueBody(currentPhase, currentSection, task),
          labels: [phaseInfo.label, area, `priority::${phaseInfo.priority}`],
          milestone: phaseInfo.milestone,
          phase: currentPhase,
          section: currentSection,
          task: task,
        });
      }
    }
  }

  return issues;
}

// Create issue body
function createIssueBody(phase, section, task) {
  return `## Description

${task}

## Context

This task is part of **${phase} - ${section}**.

## Acceptance Criteria

- [ ] Task completed
- [ ] Tests added/updated (if applicable)
- [ ] Documentation updated (if applicable)
- [ ] Code reviewed and merged

## Related

- Part of ${phase}
- See \`docs/roadmap.md\` for full context

## Notes

Migrated from static roadmap. Update this issue as work progresses.
`;
}

// Create GitHub issue
function createIssue(issue, dryRun = false) {
  if (dryRun) {
    console.log("\n📝 Would create issue:");
    console.log(`   Title: ${issue.title}`);
    console.log(`   Labels: ${issue.labels.join(", ")}`);
    console.log(`   Milestone: ${issue.milestone}`);
    return null;
  }

  try {
    // Create issue via GitHub CLI
    const labelsArg = issue.labels.map((l) => `-l "${l}"`).join(" ");
    const milestoneArg = issue.milestone ? `-m "${issue.milestone}"` : "";
    const bodyEscaped = JSON.stringify(issue.body)
      .slice(1, -1)
      .replace(/"/g, '\\"');

    const command = `gh issue create --repo ${REPO} --title "${issue.title}" --body "${bodyEscaped}" ${labelsArg} ${milestoneArg}`;

    const output = execSync(command, { encoding: "utf-8", stdio: "pipe" });
    const issueUrl = output.trim();
    console.log(`✅ Created: ${issueUrl}`);
    return issueUrl;
  } catch (error) {
    console.error(`❌ Failed to create issue: ${issue.title}`);
    console.error(`   Error: ${error.message}`);
    return null;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const phaseFilter = args
    .find((arg) => arg.startsWith("--phase="))
    ?.split("=")[1];

  console.log("🚀 Roadmap to GitHub Issues Migration");
  console.log("=====================================\n");

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No issues will be created\n");
  }

  // Check if gh CLI is available
  try {
    execSync("gh --version", { stdio: "ignore" });
  } catch {
    console.error("❌ GitHub CLI (gh) is not installed or not in PATH");
    console.error("   Install from: https://cli.github.com/");
    process.exit(1);
  }

  // Check authentication
  try {
    execSync("gh auth status", { stdio: "ignore" });
  } catch {
    console.error("❌ GitHub CLI is not authenticated");
    console.error("   Run: gh auth login");
    process.exit(1);
  }

  // Parse roadmap
  console.log("📖 Parsing roadmap...");
  const issues = await parseRoadmap();

  // Filter by phase if specified
  const filteredIssues = phaseFilter
    ? issues.filter((issue) =>
        issue.phase.toLowerCase().includes(phaseFilter.toLowerCase()),
      )
    : issues;

  console.log(`📋 Found ${filteredIssues.length} tasks to migrate\n`);

  if (filteredIssues.length === 0) {
    console.log("No issues to create. Exiting.");
    process.exit(0);
  }

  // Group by phase
  const byPhase = {};
  filteredIssues.forEach((issue) => {
    if (!byPhase[issue.phase]) {
      byPhase[issue.phase] = [];
    }
    byPhase[issue.phase].push(issue);
  });

  // Show summary
  console.log("Summary by phase:");
  Object.keys(byPhase).forEach((phase) => {
    console.log(`  ${phase}: ${byPhase[phase].length} issues`);
  });
  console.log();

  // Confirm (unless dry-run)
  if (!dryRun) {
    console.log("⚠️  This will create GitHub issues. Continue? (y/N)");
    // In a real script, you'd read from stdin. For now, we'll proceed.
    // Uncomment below for interactive confirmation:
    // const readline = require('readline');
    // const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // const answer = await new Promise(resolve => rl.question('', resolve));
    // if (answer.toLowerCase() !== 'y') { process.exit(0); }
  }

  // Create issues
  console.log("Creating issues...\n");
  let created = 0;
  let failed = 0;

  for (const issue of filteredIssues) {
    const url = createIssue(issue, dryRun);
    if (url) {
      created++;
    } else if (!dryRun) {
      failed++;
    }
    // Small delay to avoid rate limiting
    if (!dryRun && filteredIssues.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Created: ${created}`);
  if (failed > 0) {
    console.log(`   Failed: ${failed}`);
  }

  if (!dryRun) {
    console.log(`\n📌 Next steps:`);
    console.log(`   1. Go to your GitHub Project`);
    console.log(`   2. Add the created issues to your project`);
    console.log(`   3. Set custom fields (Status, Phase, Area, Priority)`);
    console.log(`   4. Configure views (Roadmap, Board, Table)`);
  }
}

main().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
