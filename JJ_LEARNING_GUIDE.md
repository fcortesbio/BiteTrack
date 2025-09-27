# Jujutsu (jj) Learning Guide 🚀

Welcome to your hands-on jj learning journey! This guide will take you from zero to confident jj user.

## 🎯 What Makes jj Different?

**Git thinking**: Working Directory → Stage → Commit  
**jj thinking**: You're always "inside" a change, editing it directly

## 📋 Prerequisites Check

Make sure jj is working:
```bash
jj --version  # Should show version 0.33.0
jj status     # Should show current state
```

---

## 🚶 **PART 1: Basic Concepts (15 minutes)**

### Exercise 1: Understanding Your Current State

```bash
# Check where you are
jj status

# Look at recent history
jj log --limit 5

# The @ symbol shows your current "working copy" (the change you're editing)
# The change ID (like xlzpsnvp) never changes, even when you edit the change
# The hash (like 2b48aac9) changes every time the content changes
```

**🤔 Try this**: Run `jj status` a few times. Notice it always tells you exactly where you are.

### Exercise 2: Making Your First Change

```bash
# Create a simple test file
echo "Hello from jj!" > jj-test.txt

# Check status immediately 
jj status
# Notice: jj automatically tracked the file! No 'git add' needed.

# Add a description to your change
jj describe -m "feat: add my first jj test file"

# Check the log
jj log --limit 3
```

**🎯 Key insight**: In jj, you're always working "inside" a change. Files are tracked automatically.

### Exercise 3: Creating a New Change (Stacking)

```bash
# Create a new change on top of the current one
jj new -m "feat: improve test file"

# Check your position
jj status
jj log --limit 4

# Add content to the existing file
echo "This is an improvement!" >> jj-test.txt

# See how jj tracked it automatically
jj status
```

**🎯 Key insight**: `jj new` creates a new change stacked on top of the current one.

---

## 🏃 **PART 2: Navigation & Editing (20 minutes)**

### Exercise 4: Moving Between Changes

```bash
# See your current stack
jj log --limit 5

# Go back to edit the first change (use the change ID from your log)
# Replace 'xlzpsnvp' with your actual change ID from jj log
jj edit xlzpsnvp

# Check where you are now
jj status

# Modify the original file
echo "Edited the original!" >> jj-test.txt

# See what happened
jj status

# Go back to the top change
jj edit @+  # @+ means "one change after current"
```

**🎯 Key insight**: You can edit ANY change in your stack. jj handles the complexity.

### Exercise 5: Understanding the Magic of Rebasing

```bash
# You should be on your second change now
jj status

# Look at the content of your test file
cat jj-test.txt

# Notice it has BOTH changes! jj automatically "rebased" when you edited the first change.
```

**🤯 Mind = Blown**: jj automatically maintained your stack when you edited the middle change!

### Exercise 6: Creating Parallel Changes

```bash
# Go back to your first change
jj edit xlzpsnvp  # (use your actual change ID)

# Create a NEW change that branches off from here
jj new -m "feat: add different feature"

# Create a different file
echo "Parallel development!" > parallel.txt

# See your tree structure
jj log --limit 6

# Notice you have parallel development now!
```

---

## 🎨 **PART 3: Bookmarks (Branches) (10 minutes)**

### Exercise 7: Using Bookmarks

```bash
# Create a bookmark (like a Git branch) on your current change
jj bookmark create my-feature

# See all bookmarks
jj bookmark list

# Check the log - notice the bookmark appears
jj log --limit 5

# Go to a different change
jj edit xlzpsnvp  # (your first change)

# Create another bookmark
jj bookmark create foundation

# See how bookmarks help you navigate
jj log --limit 6
```

### Exercise 8: Switching Between Bookmarks

```bash
# Go to your feature bookmark
jj edit my-feature

# Check where you are
jj status

# Go to foundation
jj edit foundation

# Check again
jj status
```

**🎯 Key insight**: Bookmarks are just friendly names for changes. You can have many of them.

---

## 🔧 **PART 4: Practical Workflow (15 minutes)**

### Exercise 9: A Real Development Workflow

Let's simulate adding a new API endpoint:

```bash
# Start from main
jj edit main

# Create a new feature
jj new -m "feat: add user profile endpoint"

# Create the "code"
mkdir -p api
echo "function getUserProfile() { return user; }" > api/profile.js

# Stack the tests on top
jj new -m "test: add profile endpoint tests"

# Create the "tests"
mkdir -p tests
echo "test('profile endpoint works', () => { ... })" > tests/profile.test.js

# Stack documentation
jj new -m "docs: document profile endpoint"

echo "# Profile API\n\nGET /api/profile - returns user profile" > api/README.md

# See your beautiful stack
jj log --limit 5
```

### Exercise 10: Editing in the Middle of a Stack

```bash
# Oops! Need to fix something in the original endpoint
jj edit @--  # Go back 2 changes (to the endpoint)

# "Fix a bug"
echo "// Fixed: added error handling" >> api/profile.js

# Go back to the top
jj edit @++  # Forward 2 changes

# Check that your fix is in the final result
cat api/profile.js
```

**🤯 Magic Alert**: Your fix automatically propagated through the entire stack!

---

## 🌉 **PART 5: Git Integration (10 minutes)**

### Exercise 11: Working with Git

```bash
# See what Git thinks
git status
git log --oneline -5

# Export your jj changes to Git
jj git export

# Check Git again
git status
git log --oneline -5
```

### Exercise 12: Creating a Git Branch

```bash
# Create a bookmark for Git integration
jj bookmark create feature/user-profile

# Export to Git
jj git export

# Check Git branches
git branch -a

# You can now push to Git normally!
```

---

## 🎓 **PART 6: Essential Commands Reference**

### Daily Commands
```bash
# Check status
jj status

# View history
jj log
jj log --limit 10

# Create new change
jj new -m "description"

# Add description to current change
jj describe -m "description"

# Navigate
jj edit <change-id>
jj edit @+    # Next change
jj edit @-    # Previous change
jj edit main  # Go to main
```

### Bookmark Management
```bash
# Create bookmark
jj bookmark create <name>

# List bookmarks
jj bookmark list

# Go to bookmark
jj edit <bookmark-name>
```

### Git Integration
```bash
# Export changes to Git
jj git export

# Import changes from Git
jj git import
```

---

## 🚀 **Your First Real Project Workflow**

Now try this with actual development:

1. **Start a feature**:
   ```bash
   jj edit main
   jj new -m "feat: implement user authentication"
   ```

2. **Build incrementally**:
   ```bash
   # Add model
   touch models/user.js
   jj new -m "feat: add user controller"
   
   # Add controller  
   touch controllers/auth.js
   jj new -m "feat: add auth routes"
   
   # Add routes
   touch routes/auth.js
   ```

3. **Edit and refine**:
   ```bash
   # Go back and improve the model
   jj edit @--
   # Make changes...
   
   # Go back to tip
   jj edit @++
   ```

4. **Prepare for Git**:
   ```bash
   jj bookmark create feature/user-auth
   jj git export
   ```

---

## 🎯 **Key Mental Model Shifts**

1. **No staging area** - Changes are tracked automatically
2. **You're always "in" a change** - Not in a working directory
3. **Change IDs are permanent** - Even when you edit the change
4. **Stacking is natural** - Build features incrementally
5. **History editing is safe** - jj handles the complexity
6. **Conflicts don't block work** - They're resolved when needed

---

## 🆘 **When Things Go Wrong**

```bash
# See everything
jj log --limit 20

# If lost, go back to known state
jj edit main

# Check Git state
git status

# Start over from Git
jj git import
```

---

## 🏆 **Graduation Exercise**

Create a complete feature with jj:
1. Start from main
2. Create 3-4 stacked changes for different parts
3. Edit a middle change
4. Create a bookmark
5. Export to Git
6. Verify everything works

**You've got this!** 🌟

---

## 📚 **Next Steps**

- Try jj in your daily development
- Experiment with `jj split` to break up large changes
- Learn `jj squash` to combine changes
- Explore `jj rebase` for advanced history manipulation

**Happy jj-ing!** 🎉