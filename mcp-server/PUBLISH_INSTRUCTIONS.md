# 🚀 PUBLISH CASCADE REGISTRY MCP SERVER TO NPM

## Step-by-Step Publication Instructions

### Prerequisites

You need an npm account. If you don't have one:
1. Go to https://www.npmjs.com/signup
2. Create a free account
3. Verify your email

---

## 📦 PUBLICATION STEPS

### Step 1: Login to npm

```bash
cd /Users/maekaess/CascadeProjects/windsurf-project/mcp-server
npm login
```

You'll be prompted for:
- **Username:** Your npm username
- **Password:** Your npm password
- **Email:** Your npm email
- **One-time password:** (if you have 2FA enabled)

### Step 2: Verify Login

```bash
npm whoami
```

Should display your npm username.

### Step 3: Final Verification

```bash
npm pack --dry-run
```

Should show:
```
✓ cascade-registry-mcp@1.0.0
✓ package size: 12.2 kB
✓ unpacked size: 51.3 kB
✓ total files: 7
```

### Step 4: Publish!

```bash
npm publish --access public
```

This will:
- Build the package (runs `npm run build` automatically)
- Upload to npm registry
- Make it available worldwide

### Step 5: Verify Publication

```bash
npm view cascade-registry-mcp
```

Or visit: https://www.npmjs.com/package/cascade-registry-mcp

---

## ✅ After Publication

### Test Installation

```bash
# In a different directory
npm install -g cascade-registry-mcp

# Test the command
cascade-registry-mcp
```

Should start the MCP server (will wait for stdin).

### Update Windsurf Config

Now users can use the simpler config:

```json
{
  "mcpServers": {
    "cascade-registry": {
      "command": "cascade-registry-mcp"
    }
  }
}
```

Instead of the full path.

---

## 🎯 What Happens After Publishing

1. **npm Registry:** Package appears at npmjs.com
2. **Global Installation:** Anyone can `npm install -g cascade-registry-mcp`
3. **Windsurf Integration:** Easier to configure (just the command name)
4. **Discoverability:** Searchable on npm
5. **Version Management:** Can publish updates with `npm version` + `npm publish`

---

## 📊 Monitoring

After publication, monitor:

- **npm Stats:** https://npm-stat.com/charts.html?package=cascade-registry-mcp
- **Downloads:** Check weekly/monthly downloads
- **Issues:** Monitor GitHub issues
- **Feedback:** Social media mentions

---

## 🔄 Publishing Updates

When you make changes:

```bash
# Update version (choose one)
npm version patch  # 1.0.0 -> 1.0.1 (bug fixes)
npm version minor  # 1.0.0 -> 1.1.0 (new features)
npm version major  # 1.0.0 -> 2.0.0 (breaking changes)

# Publish the update
npm publish
```

---

## ⚠️ Important Notes

1. **Package Name:** `cascade-registry-mcp` must be available on npm
   - Check: https://www.npmjs.com/package/cascade-registry-mcp
   - If taken, you'll need to choose a different name

2. **Version:** Starting at 1.0.0 (already configured)

3. **License:** MIT (already configured)

4. **Access:** Public (free, anyone can install)

5. **Scope:** Unscoped package (not @username/package)

---

## 🎉 Ready to Publish!

Run these commands in order:

```bash
cd /Users/maekaess/CascadeProjects/windsurf-project/mcp-server
npm login
npm publish --access public
```

**That's it!** Your MCP server will be live on npm! 🚀

---

## 📞 Troubleshooting

### "Package name already exists"
- Choose a different name in `package.json`
- Try: `cascade-biotech-mcp`, `biotech-trials-mcp`, etc.

### "Need to login"
- Run `npm login` first
- Verify with `npm whoami`

### "403 Forbidden"
- Package name might be taken
- Or you don't have permission (shouldn't happen for new packages)

### "Build failed"
- Run `npm run build` manually first
- Check for TypeScript errors

---

## 🎊 After Publishing

1. **Share on Social Media:**
   - LinkedIn: "Just published cascade-registry-mcp on npm!"
   - Twitter: "New MCP server for biotech research 🔬"

2. **Submit to Windsurf Registry:**
   - Follow instructions in `PUBLISH.md`

3. **Write Blog Post:**
   - Share your experience building it
   - Technical deep-dive

4. **Create Demo Video:**
   - Show installation and usage
   - Real queries and results

---

**Good luck with the publication! 🚀**
