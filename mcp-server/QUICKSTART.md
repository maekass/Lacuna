# Cascade Registry MCP - Quick Start Guide

Get up and running with the Cascade Registry MCP server in 5 minutes.

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Python 3.9+ installed
- ✅ Cascade Registry project cloned

## Installation (3 steps)

### Step 1: Install the MCP Server

```bash
cd /path/to/windsurf-project/mcp-server
./install.sh
```

This will:
- Install npm dependencies
- Build the TypeScript code
- Make the server executable

### Step 2: Collect Data (if not already done)

```bash
cd ..
python3 src/data_collection/collect_all_data.py
```

This collects real data from:
- ClinicalTrials.gov (1,400+ trials)
- openFDA (drug approvals)
- CDC/Orphanet (epidemiology)

**Takes ~5-10 minutes**

### Step 3: Configure Your MCP Client

Add to your MCP configuration file:

**For Cascade:** `~/.config/cascade/mcp.json`
**For Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cascade-registry": {
      "command": "node",
      "args": ["/Users/maekaess/CascadeProjects/windsurf-project/mcp-server/dist/index.js"]
    }
  }
}
```

**⚠️ Update the path to match your actual project location!**

## Test It Out

Restart your MCP client, then try these queries:

### Query 1: Search Clinical Trials
```
"What are the active Phase 3 trials for Sickle Cell Disease?"
```

The AI will use `search_clinical_trials` tool.

### Query 2: Market Analysis
```
"What's the market size for Multiple Sclerosis therapies?"
```

The AI will use `run_market_analysis` tool.

### Query 3: Predict Trial Success
```
"What's the success probability for a Phase 2 industry-sponsored trial with 150 patients?"
```

The AI will use `predict_trial_success` tool.

## Available Tools (10 total)

1. **search_clinical_trials** - Find trials by disease, phase, status
2. **get_disease_info** - Comprehensive disease profiles
3. **query_fda_approvals** - FDA drug approvals
4. **predict_trial_success** - ML-powered success prediction
5. **get_company_pipeline** - Company trial pipelines
6. **analyze_disease_burden** - Prevalence and market metrics
7. **get_trial_statistics** - Aggregate trial stats
8. **search_biotech_companies** - Find companies by disease
9. **get_epidemiology_data** - Prevalence and demographic data
10. **run_market_analysis** - TAM, competitive landscape

## Troubleshooting

### "Python script failed"
- Ensure Python 3.9+ is installed: `python3 --version`
- Check data files exist: `ls data/demo/`
- Run data collection: `python3 src/data_collection/collect_all_data.py`

### "Module not found"
- Run: `npm install` in the mcp-server directory
- Build: `npm run build`

### "Cannot find MCP server"
- Check the path in your MCP config is absolute and correct
- Restart your MCP client after config changes

## Next Steps

- Read `README.md` for detailed documentation
- Check `USAGE_EXAMPLES.md` for 13 real-world examples
- Explore all 10 tools with different queries

## Support

- GitHub Issues: [Cascade Registry Issues](https://github.com/maekass/Immunology-Investment-Intelligence/issues)
- Documentation: See `README.md` and `USAGE_EXAMPLES.md`

---

**🎉 You're ready to go! Start asking biotech/pharma questions to your AI assistant.**
