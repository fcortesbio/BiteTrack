# Linting Guide for BiteTrack

This project uses ESLint to maintain consistent code quality and style across the codebase.

## What is Linting?

Linting automatically checks your JavaScript code for:

- **Syntax errors** and potential bugs
- **Style consistency** (quotes, spacing, indentation)
- **Best practices** and code quality issues
- **Security vulnerabilities** and unsafe patterns

## Setup

ESLint is already configured for this project. All dependencies are installed automatically when you run:

```bash
npm install
```

## Available Commands

### Check for Issues

```bash
# Check all files for linting issues
npm run lint

# Check only for errors (fails CI if any errors found)
npm run lint:check
```

### Auto-fix Issues

```bash
# Automatically fix all fixable issues
npm run lint:fix

# Fix specific files only
npx eslint path/to/file.js --fix
```

## Code Standards

Our ESLint configuration enforces these standards:

### Style Rules

- **Single quotes** for strings: `'hello'` instead of `"hello"`
- **2-space indentation** consistently
- **Trailing commas** in multi-line objects and arrays
- **No spaces** before function parentheses: `function()` not `function ()`
- **Semicolons** at the end of statements

### Quality Rules

- **No unused variables** (prefix with `_` if intentionally unused)
- **Consistent equality** operators: use `===` instead of `==`
- **Proper error handling**: avoid empty catch blocks
- **No duplicate object keys**

### Node.js Best Practices

- **Prefer `const`** over `let` when variables don't change
- **Handle callback errors** properly
- **Avoid sync operations** where possible (warnings for `fs.readFileSync`, etc.)

## IDE Integration

### VS Code

Install the ESLint extension:

1. Go to Extensions (Ctrl+Shift+X)
2. Search for "ESLint"
3. Install the official ESLint extension by Dirk Baeumer

### Configure Auto-fix on Save

Add this to your VS Code settings.json:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Development Workflow

1. **Write code** following existing patterns
2. **Run linter** before committing: `npm run lint`
3. **Fix issues** automatically: `npm run lint:fix`
4. **Address remaining errors** manually (auto-fix can't handle everything)
5. **Commit clean code** with no linting errors

## Common Issues and Solutions

### "Strings must use singlequote"

❌ `const message = "Hello world";`
✅ `const message = 'Hello world';`

### "Missing trailing comma"

❌

```javascript
const config = {
  host: "localhost",
  port: 3001,
};
```

✅

```javascript
const config = {
  host: "localhost",
  port: 3001,
};
```

### "Unexpected space before function parentheses"

❌ `const handler = async (req, res) => {}`
✅ `const handler = async(req, res) => {}`

### "No unused variables"

❌ `const unused = getData();`
✅ `const _unused = getData();` (if intentionally unused)
✅ Just remove the unused variable

## Console Warnings

Console statements generate **warnings** (not errors) because they're useful for:

- Development logging
- Error handling
- Debugging scripts

This is intentional - console usage is allowed but flagged for review.

## Ignoring Specific Rules

For exceptional cases, you can disable rules:

```javascript
// Disable for next line
// eslint-disable-next-line no-console
console.log("This is allowed");

// Disable for entire file (top of file)
/* eslint-disable no-console */
```

**Note:** Only disable rules when absolutely necessary and document why.

## Configuration Files

- **`eslint.config.js`** - Main ESLint configuration
- **`package.json`** - Contains linting scripts
- **`LINTING.md`** - This documentation

## Integration with CI/CD

The `lint:check` command fails if there are any errors, making it suitable for CI pipelines:

```bash
npm run lint:check  # Returns exit code 1 if errors found
```

Consider adding this to your pre-commit hooks or CI pipeline.

## Need Help?

- Check the [ESLint documentation](https://eslint.org/docs/latest/)
- Review existing code for patterns
- Ask team members for guidance on style decisions

Remember: Linting helps maintain code quality and consistency across the team. It's a tool to help us write better code together! 🚀
