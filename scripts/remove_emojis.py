#!/usr/bin/env python3
"""
Remove all emojis from BiteTrack markdown documentation files.
This script processes all .md files in the project and strips emojis while preserving all other content.
"""

import re
import os
import sys
from pathlib import Path

# Comprehensive emoji pattern that matches all Unicode emoji ranges
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F1E0-\U0001F1FF"  # flags (iOS)
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F680-\U0001F6FF"  # transport & map symbols
    "\U0001F700-\U0001F77F"  # alchemical symbols
    "\U0001F780-\U0001F7FF"  # Geometric Shapes Extended
    "\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
    "\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
    "\U0001FA00-\U0001FA6F"  # Chess Symbols
    "\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
    "\U00002702-\U000027B0"  # Dingbats
    "\U000024C2-\U0001F251"  # Enclosed characters
    "\U0001F300-\U0001F5FF"  # Miscellaneous Symbols and Pictographs
    "\U0001F600-\U0001F636"  # Emoticons (Emoji)
    "\U0001F681-\U0001F6C5"  # Transport and Map
    "\U0001F30D-\U0001F567"  # Other additional symbols
    "\u2600-\u2B55"          # Miscellaneous symbols
    "\u200d"                 # Zero Width Joiner (for composite emojis)
    "\uFE0F"                 # Variation Selector-16 (emoji presentation)
    "]+",
    flags=re.UNICODE
)


def remove_emojis_from_text(text):
    """
    Remove all emojis from the given text.
    
    Args:
        text (str): Input text with potential emojis
        
    Returns:
        str: Text with emojis removed and cleaned up
    """
    # Remove emojis
    cleaned = EMOJI_PATTERN.sub('', text)
    
    # Clean up any resulting multiple spaces (but preserve intentional spacing)
    # Only clean up spaces that result from emoji removal
    lines = []
    for line in cleaned.split('\n'):
        # Remove trailing spaces
        line = line.rstrip()
        # Replace multiple spaces with single space, but preserve indentation
        if line.strip():  # Only process non-empty lines
            # Preserve leading whitespace (indentation)
            leading_spaces = len(line) - len(line.lstrip())
            content = line.lstrip()
            # Clean up multiple spaces in content
            content = re.sub(r' {2,}', ' ', content)
            line = ' ' * leading_spaces + content
        lines.append(line)
    
    return '\n'.join(lines)


def process_markdown_file(file_path, dry_run=False):
    """
    Process a single markdown file to remove emojis.
    
    Args:
        file_path (Path): Path to the markdown file
        dry_run (bool): If True, only show what would be changed without writing
        
    Returns:
        tuple: (changed, emoji_count) - whether file was changed and number of emojis removed
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        # Count emojis in original content
        emoji_matches = EMOJI_PATTERN.findall(original_content)
        emoji_count = len(emoji_matches)
        
        if emoji_count == 0:
            return False, 0
        
        # Remove emojis
        cleaned_content = remove_emojis_from_text(original_content)
        
        if original_content == cleaned_content:
            return False, 0
        
        if not dry_run:
            # Write cleaned content back to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(cleaned_content)
        
        return True, emoji_count
        
    except Exception as e:
        print(f"ERROR: Failed to process {file_path}: {e}", file=sys.stderr)
        return False, 0


def find_markdown_files(root_dir, exclude_dirs=None):
    """
    Find all markdown files in the project, excluding specified directories.
    
    Args:
        root_dir (Path): Root directory to search
        exclude_dirs (set): Set of directory names to exclude
        
    Returns:
        list: List of Path objects for markdown files
    """
    if exclude_dirs is None:
        exclude_dirs = {'node_modules', '.git', 'dist', 'build', '.next', 'coverage'}
    
    markdown_files = []
    
    for md_file in root_dir.rglob('*.md'):
        # Check if file is in an excluded directory
        if any(excluded in md_file.parts for excluded in exclude_dirs):
            continue
        markdown_files.append(md_file)
    
    return sorted(markdown_files)


def main():
    """Main function to process all markdown files."""
    # Determine script mode
    dry_run = '--dry-run' in sys.argv or '-n' in sys.argv
    verbose = '--verbose' in sys.argv or '-v' in sys.argv
    
    # Get project root (parent of script location)
    project_root = Path(__file__).parent
    
    print(f"BiteTrack Documentation Emoji Remover")
    print(f"=" * 60)
    print(f"Project root: {project_root}")
    print(f"Mode: {'DRY RUN (no changes will be made)' if dry_run else 'LIVE (files will be modified)'}")
    print()
    
    # Find all markdown files
    print("Scanning for markdown files...")
    markdown_files = find_markdown_files(project_root)
    print(f"Found {len(markdown_files)} markdown files")
    print()
    
    # Process each file
    total_changed = 0
    total_emojis = 0
    changed_files = []
    
    for md_file in markdown_files:
        rel_path = md_file.relative_to(project_root)
        changed, emoji_count = process_markdown_file(md_file, dry_run=dry_run)
        
        if changed:
            total_changed += 1
            total_emojis += emoji_count
            changed_files.append((rel_path, emoji_count))
            
            if verbose:
                status = "[DRY RUN] Would remove" if dry_run else "Removed"
                print(f"  {status} {emoji_count} emoji(s) from: {rel_path}")
    
    # Print summary
    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Files processed: {len(markdown_files)}")
    print(f"Files with emojis: {total_changed}")
    print(f"Total emojis removed: {total_emojis}")
    print()
    
    if changed_files and not verbose:
        print("Files modified:")
        for file_path, count in changed_files:
            print(f"  - {file_path} ({count} emoji(s))")
    
    if dry_run and total_changed > 0:
        print()
        print("NOTE: This was a dry run. Run without --dry-run to apply changes.")
    elif total_changed > 0:
        print()
        print("SUCCESS: All emojis have been removed from documentation files.")
    else:
        print()
        print("INFO: No emojis found in documentation files.")
    
    return 0 if total_changed > 0 else 1


if __name__ == '__main__':
    if '--help' in sys.argv or '-h' in sys.argv:
        print("Usage: python3 remove_emojis.py [OPTIONS]")
        print()
        print("Options:")
        print("  --dry-run, -n    Show what would be changed without modifying files")
        print("  --verbose, -v    Show detailed output for each file")
        print("  --help, -h       Show this help message")
        print()
        print("Examples:")
        print("  python3 remove_emojis.py --dry-run    # Preview changes")
        print("  python3 remove_emojis.py              # Remove emojis from all .md files")
        print("  python3 remove_emojis.py --verbose    # Show detailed progress")
        sys.exit(0)
    
    sys.exit(main())
