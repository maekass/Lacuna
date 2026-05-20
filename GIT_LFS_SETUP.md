# Git LFS Setup Guide

**Status:** Ready to configure  
**Purpose:** Track large data files efficiently in git

---

## 🎯 Quick Start

### Step 1: Install Git LFS

**macOS - Download Binary (Recommended):**
```bash
cd /tmp
curl -L https://github.com/git-lfs/git-lfs/releases/download/v3.4.0/git-lfs-darwin-amd64-v3.4.0.tar.gz -o git-lfs.tar.gz
tar -xzf git-lfs.tar.gz
sudo ./git-lfs-3.4.0/install.sh
```

**Alternative - Visit Website:**
https://git-lfs.github.com/

---

### Step 2: Run Setup Script

```bash
bash scripts/setup_git_lfs.sh
```

This will:
- ✅ Verify Git LFS is installed
- ✅ Initialize LFS in your repository
- ✅ Show what files will be tracked
- ✅ Provide next steps

---

### Step 3: Add Files to LFS

```bash
# Add .gitattributes (already created for you)
git add .gitattributes

# Add your large files
git add data/processed/enhanced_clinical_trials.csv
git add data/validation/models/*.pkl

# Commit
git commit -m "Add data files via Git LFS"

# Push
git push
```

---

## 📋 What's Configured

The `.gitattributes` file is already set up to track:

### CSV Data Files
- `data/processed/*.csv` - Enhanced clinical trials data
- `data/validation/*.csv` - Validation datasets

### Model Files
- `*.pkl` - All pickle files
- `data/models/*.pkl` - Trained models
- `data/validation/models/*.pkl` - Validation models

### Large JSON Files
- `data/raw/validation_report.json` - Validation reports

---

## 🔍 Verify LFS is Working

After pushing, verify files are tracked by LFS:

```bash
# List LFS files
git lfs ls-files

# Should show something like:
# 3f7d52e4f3 * data/processed/enhanced_clinical_trials.csv
# a1b2c3d4e5 * data/validation/models/random_forest_real_data.pkl
```

---

## 📊 GitHub Free Tier Limits

| Resource | Limit | Your Usage |
|----------|-------|------------|
| **Storage** | 1 GB | ~5 MB (0.5%) |
| **Bandwidth** | 1 GB/month | Minimal |

**Your files:**
- `enhanced_clinical_trials.csv`: ~500 KB
- Model files (4 × .pkl): ~4 MB
- **Total:** ~4.5 MB

✅ **Well within free tier limits!**

---

## 🔄 Migrating Existing Files

If files are already in git (not LFS):

```bash
# 1. Remove from git cache (keeps local file)
git rm --cached data/processed/enhanced_clinical_trials.csv

# 2. Add with LFS
git add data/processed/enhanced_clinical_trials.csv

# 3. Commit migration
git commit -m "Migrate enhanced_clinical_trials.csv to Git LFS"

# 4. Push
git push
```

---

## 🚀 Team Workflow

### Cloning the Repository

Team members clone normally:
```bash
git clone https://github.com/maekass/MPK1.git
cd MPK1
```

Git LFS automatically downloads large files!

### Pulling Updates

```bash
git pull
```

LFS files are automatically fetched.

---

## 🛠️ Common Commands

### Check LFS Status
```bash
git lfs status
```

### List Tracked Files
```bash
git lfs ls-files
```

### Check Storage Usage
```bash
git lfs env
```

### Fetch LFS Files
```bash
git lfs fetch
git lfs checkout
```

### Pull LFS Files
```bash
git lfs pull
```

---

## 📈 Benefits

### Before Git LFS
- ❌ Large files bloat repository
- ❌ Slow clones
- ❌ GitHub rejects files >100MB
- ❌ History grows with every change

### After Git LFS
- ✅ Fast clones (pointers only)
- ✅ Files up to 2GB supported
- ✅ Efficient storage (deduplicated)
- ✅ Clean git history

---

## 🔧 Troubleshooting

### "Git LFS not found"

Install Git LFS first:
```bash
# Download from: https://git-lfs.github.com/
# Or run: bash scripts/setup_git_lfs.sh
```

### "This exceeds GitHub's file size limit"

File is >100MB without LFS. Migrate to LFS:
```bash
git rm --cached large_file.csv
git add large_file.csv  # Now uses LFS
git commit -m "Migrate to LFS"
```

### "Quota exceeded"

You've hit the 1GB free tier limit. Options:
1. Buy more storage ($5/month for 50GB)
2. Remove old LFS files
3. Use alternative storage (S3, etc.)

### Files Not Downloading

```bash
# Manually fetch LFS files
git lfs fetch --all
git lfs checkout
```

---

## 📚 Additional Resources

- **Git LFS Website:** https://git-lfs.github.com/
- **GitHub LFS Docs:** https://docs.github.com/en/repositories/working-with-files/managing-large-files
- **Pricing:** https://docs.github.com/en/billing/managing-billing-for-git-large-file-storage

---

## ✅ Checklist

Before pushing:

- [ ] Git LFS installed (`git lfs version`)
- [ ] LFS initialized (`git lfs install`)
- [ ] `.gitattributes` committed
- [ ] Large files added
- [ ] Verified with `git lfs ls-files`
- [ ] Pushed to GitHub

---

## 🎉 You're All Set!

Once you complete the steps above:

1. ✅ Large files tracked efficiently
2. ✅ Fast clones for team
3. ✅ GitHub accepts your files
4. ✅ Clean git history

**Your data files are now ready for Git LFS! 🚀**

---

**Questions?** Check the troubleshooting section or visit https://git-lfs.github.com/
