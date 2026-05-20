# Streamlit Cloud Deployment Guide

Step-by-step instructions to deploy the Immunology Investment Intelligence Platform to Streamlit Cloud.

---

## Prerequisites

- GitHub account with repository access
- Streamlit Cloud account (free): https://streamlit.io/cloud

---

## Quick Deploy

### Option 1: One-Click Deploy (Recommended)

1. Go to https://share.streamlit.io/
2. Click **"New app"**
3. Fill in:
   - **Repository**: `maekass/Immunology-Investment-Intelligence`
   - **Branch**: `main`
   - **Main file path**: `dashboard/app.py`
4. Click **"Deploy!"**

### Option 2: From Streamlit Cloud Dashboard

1. Sign in to https://share.streamlit.io/
2. Click **"New app"** in the top right
3. Connect your GitHub account (if not already)
4. Select:
   - Repository: `Immunology-Investment-Intelligence`
   - Branch: `main`
   - Main file: `dashboard/app.py`
5. Click **"Deploy"**

---

## Configuration Files

The repository includes these deployment files:

- **`.streamlit/config.toml`** - Streamlit configuration (theme, server settings)
- **`requirements.txt`** - Python dependencies
- **`packages.txt`** - System packages (apt-get)
- **`runtime.txt`** - Python version specification

---

## Environment Variables (Optional)

If you need to add API keys or secrets:

1. In Streamlit Cloud dashboard, go to your app
2. Click **"⋮"** (three dots) → **"Settings"**
3. Go to **"Secrets"** section
4. Add secrets in TOML format:

```toml
# Example secrets
[api_keys]
clinicaltrials_api_key = "your_key_here"
```

5. Access in code:
```python
import streamlit as st
api_key = st.secrets["api_keys"]["clinicaltrials_api_key"]
```

---

## Custom Domain (Optional)

### Free Subdomain
Your app will be available at:
```
https://[your-app-name].streamlit.app
```

### Custom Domain
1. Go to app settings in Streamlit Cloud
2. Navigate to **"General"** → **"Custom subdomain"**
3. Enter your desired subdomain
4. Or add a custom domain (requires DNS configuration)

---

## Monitoring & Logs

### View Logs
1. Go to your app in Streamlit Cloud
2. Click **"Manage app"**
3. View real-time logs in the **"Logs"** tab

### Resource Usage
- Free tier: 1 GB RAM, shared CPU
- If you need more: Upgrade to Streamlit Cloud Pro

---

## Troubleshooting

### App Won't Start

**Check logs for errors:**
```bash
# Common issues:
1. Missing dependencies in requirements.txt
2. Import errors
3. File path issues (use relative paths)
```

**Fix:**
- Update `requirements.txt`
- Ensure all imports are correct
- Use `os.path.join()` for file paths

### Slow Performance

**Optimize:**
```python
# Use caching
@st.cache_data
def load_data():
    return pd.read_csv("data.csv")

# Use session state
if 'data' not in st.session_state:
    st.session_state.data = load_data()
```

### Memory Issues

**Solutions:**
1. Reduce data size
2. Use data sampling
3. Implement lazy loading
4. Upgrade to Streamlit Cloud Pro

---

## Updating Your App

### Automatic Deployment
Streamlit Cloud automatically redeploys when you push to GitHub:

```bash
git add .
git commit -m "Update dashboard"
git push origin main
```

The app will rebuild automatically (takes 2-5 minutes).

### Manual Reboot
1. Go to app in Streamlit Cloud
2. Click **"⋮"** → **"Reboot app"**

---

## Best Practices

### 1. Use Caching
```python
@st.cache_data(ttl=3600)  # Cache for 1 hour
def fetch_clinical_trials():
    # Expensive API call
    return data
```

### 2. Lazy Loading
```python
# Don't load all data on startup
if st.button("Load Data"):
    data = load_large_dataset()
```

### 3. Progress Indicators
```python
with st.spinner("Loading data..."):
    data = fetch_data()
```

### 4. Error Handling
```python
try:
    data = fetch_api_data()
except Exception as e:
    st.error(f"Error: {e}")
    st.stop()
```

---

## Security

### Don't Commit Secrets
```bash
# Add to .gitignore
.streamlit/secrets.toml
.env
*.key
```

### Use Streamlit Secrets
```python
# Good
api_key = st.secrets["api_keys"]["key"]

# Bad
api_key = "hardcoded_key_123"  # Never do this!
```

---

## Support

- **Streamlit Docs**: https://docs.streamlit.io/
- **Community Forum**: https://discuss.streamlit.io/
- **GitHub Issues**: https://github.com/maekass/Immunology-Investment-Intelligence/issues

---

## App URL

Once deployed, your app will be live at:

**https://immunology-investment-intelligence.streamlit.app**

(or your custom subdomain)

---

## Next Steps

1. ✅ Deploy to Streamlit Cloud
2. ✅ Test all features
3. ✅ Share the URL
4. 📊 Monitor usage and performance
5. 🚀 Iterate based on feedback

---

**Happy deploying! 🎉**
