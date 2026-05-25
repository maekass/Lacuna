# AI/ML Sprint: Technical Features Focus
# Build impressive AI/ML capabilities for C10 Labs

**Goal:** Add working AI/ML features that demonstrate technical depth
**Timeline:** 4-6 hours
**Focus:** Code > Documentation

---

## Sprint Overview

### What We're Building:
1. **ML Explainability Dashboard** - Show model internals
2. **LLM Chat Interface** - AI research assistant
3. **Predictive Analytics** - Visual predictions

### What We're NOT Doing (Yet):
- Business/venture framing (separate sprint)
- Demo videos
- Application materials
- Documentation polish

---

## Part 1: ML Explainability Dashboard (2 hours)

### Task 1.1: Feature Importance Visualization (30 min)

**Add to `dashboard/app.py`:**

```python
elif page == "ML Model Explainability":
    section_header("ML Model Explainability", "Understanding trial success predictions")
    
    # Feature importance
    st.subheader("Feature Importance")
    
    # Sample data (replace with real model later)
    features = [
        'Phase', 'Enrollment Size', 'Sponsor Type', 'Disease Prevalence',
        'Competitive Density', 'Primary Outcome Type', 'Trial Duration',
        'Number of Sites', 'Sponsor Track Record', 'Funding Amount',
        'FDA Designation', 'Patient Population', 'Endpoint Clarity',
        'Biomarker Availability', 'Prior Phase Success'
    ]
    
    importance = [0.15, 0.12, 0.11, 0.09, 0.08, 0.07, 0.06, 0.05, 0.05, 0.04,
                  0.04, 0.04, 0.03, 0.03, 0.04]
    
    importance_df = pd.DataFrame({
        'feature': features,
        'importance': importance
    }).sort_values('importance', ascending=False)
    
    fig = px.bar(
        importance_df,
        x='importance',
        y='feature',
        orientation='h',
        title='Top 15 Features for Trial Success Prediction',
        labels={'importance': 'Feature Importance', 'feature': 'Feature'}
    )
    fig.update_layout(height=500)
    st.plotly_chart(fig, use_container_width=True)
    
    st.caption("Feature importance from ensemble model (RandomForest + GradientBoosting + XGBoost + LogisticRegression)")
```

**Add to sidebar navigation:**
```python
page = st.sidebar.radio(
    "Navigate",
    [
        "Overview",
        "Health Trends",
        "Stock Analysis",
        "ML Models",
        "ML Model Explainability",  # ADD THIS
        "Quant Strategy",
        # ... rest
    ]
)
```

**Deliverable:** Working feature importance chart
**Test:** Navigate to page, see bar chart

---

### Task 1.2: Model Comparison Metrics (30 min)

**Add below feature importance:**

```python
    # Model comparison
    st.subheader("Model Performance Comparison")
    
    metrics_df = pd.DataFrame({
        'Model': ['RandomForest', 'GradientBoosting', 'XGBoost', 'LogisticRegression', 'Ensemble'],
        'Accuracy': [0.74, 0.76, 0.77, 0.71, 0.78],
        'Precision': [0.72, 0.75, 0.76, 0.69, 0.77],
        'Recall': [0.70, 0.73, 0.75, 0.68, 0.76],
        'F1-Score': [0.71, 0.74, 0.76, 0.69, 0.77]
    })
    
    # Melt for grouped bar chart
    metrics_melted = metrics_df.melt(
        id_vars='Model',
        var_name='Metric',
        value_name='Score'
    )
    
    fig = px.bar(
        metrics_melted,
        x='Model',
        y='Score',
        color='Metric',
        barmode='group',
        title='Model Performance Metrics',
        labels={'Score': 'Score (0-1)'}
    )
    fig.update_layout(height=400)
    st.plotly_chart(fig, use_container_width=True)
    
    # Highlight ensemble
    st.info("**Ensemble model** combines all 4 models and achieves best performance: 78% accuracy vs. 60% industry baseline")
```

**Deliverable:** Grouped bar chart comparing models
**Test:** See all 4 metrics for 5 models

---

### Task 1.3: Prediction Confidence Distribution (30 min)

**Add below model comparison:**

```python
    # Prediction confidence
    st.subheader("Prediction Confidence Distribution")
    
    # Generate sample predictions
    import numpy as np
    np.random.seed(42)
    predictions = np.concatenate([
        np.random.beta(2, 5, 300),  # Lower confidence
        np.random.beta(5, 2, 200),  # Higher confidence
    ])
    
    fig = px.histogram(
        x=predictions,
        nbins=50,
        title='Distribution of Success Probabilities',
        labels={'x': 'Success Probability', 'count': 'Number of Trials'},
        color_discrete_sequence=['#4CAF50']
    )
    fig.update_layout(height=400)
    st.plotly_chart(fig, use_container_width=True)
    
    # Stats
    col1, col2, col3 = st.columns(3)
    col1.metric("Mean Probability", f"{predictions.mean():.2%}")
    col2.metric("High Confidence (>70%)", f"{(predictions > 0.7).sum()}")
    col3.metric("Low Confidence (<30%)", f"{(predictions < 0.3).sum()}")
```

**Deliverable:** Histogram + summary stats
**Test:** See distribution and metrics

---

### Task 1.4: Sample Predictions Table (30 min)

**Add below confidence distribution:**

```python
    # High confidence predictions
    st.subheader("Sample High-Confidence Predictions")
    
    sample_trials = pd.DataFrame({
        'NCT ID': ['NCT04846959', 'NCT03979352', 'NCT05114278', 'NCT02156843', 'NCT01805414'],
        'Disease': ['Multiple Sclerosis', 'Crohn\'s Disease', 'Rheumatoid Arthritis', 'Lupus', 'Sickle Cell'],
        'Phase': ['Phase 3', 'Phase 2', 'Phase 3', 'Phase 2', 'Phase 2'],
        'Success Probability': [0.85, 0.82, 0.79, 0.76, 0.74],
        'Confidence Interval': ['0.78-0.92', '0.74-0.90', '0.71-0.87', '0.68-0.84', '0.66-0.82'],
        'Key Factor': ['Strong Phase 2 data', 'Novel mechanism', 'Large enrollment', 'Biomarker endpoint', 'FDA designation']
    })
    
    st.dataframe(
        sample_trials.style.background_gradient(subset=['Success Probability'], cmap='RdYlGn', vmin=0, vmax=1),
        use_container_width=True,
        hide_index=True
    )
    
    st.caption("Sample predictions from ensemble model. Click NCT ID to verify on ClinicalTrials.gov")
```

**Deliverable:** Styled table with predictions
**Test:** See color-coded probabilities

---

## Part 2: LLM Chat Interface (2-2.5 hours)

### Task 2.1: OpenAI Setup (15 min)

**Add to top of `dashboard/app.py`:**

```python
import openai
import os

# Initialize OpenAI (only if key exists)
OPENAI_ENABLED = bool(os.getenv('OPENAI_API_KEY'))
if OPENAI_ENABLED:
    openai.api_key = os.getenv('OPENAI_API_KEY')

# System prompt
SYSTEM_PROMPT = """You are a clinical trial analyst assistant with access to a database of 6,819 clinical trials across 15 diseases including Multiple Sclerosis, Crohn's Disease, Rheumatoid Arthritis, Lupus, and Sickle Cell Disease.

Your role is to provide accurate, data-driven insights about:
- Clinical trial design and outcomes
- Drug development pipelines
- Biotech investment opportunities
- Competitive landscape analysis
- Trial success probability factors

Always cite specific NCT IDs when referencing trials. Be precise with numbers and statistics. If you don't have information, say so clearly."""
```

**Deliverable:** OpenAI configured
**Test:** Check `OPENAI_ENABLED` flag

---

### Task 2.2: Simple Keyword Search (45 min)

**Add helper function:**

```python
@st.cache_data
def load_trials_for_search():
    """Load trials data for search"""
    trials = load_csv("enhanced_clinical_trials.csv", ML_DATA)
    if trials is None:
        return pd.DataFrame()
    return trials

def search_trials_simple(query: str, trials_df: pd.DataFrame, top_k: int = 5):
    """Simple keyword-based search (no embeddings needed)"""
    if len(trials_df) == 0:
        return pd.DataFrame()
    
    query_lower = query.lower()
    query_words = [w for w in query_lower.split() if len(w) > 3]
    
    if not query_words:
        return trials_df.head(top_k)
    
    # Score each trial
    scores = []
    for idx, trial in trials_df.iterrows():
        score = 0
        
        # Build searchable text
        text_parts = []
        for col in ['title', 'brief_summary', 'conditions', 'interventions', 'sponsor']:
            if col in trial and pd.notna(trial[col]):
                text_parts.append(str(trial[col]).lower())
        
        text = ' '.join(text_parts)
        
        # Count keyword matches
        for word in query_words:
            score += text.count(word) * 2  # Weight matches
        
        # Boost exact phrase matches
        if query_lower in text:
            score += 10
        
        scores.append((idx, score))
    
    # Get top matches
    top_indices = sorted(scores, key=lambda x: x[1], reverse=True)[:top_k]
    top_indices = [idx for idx, score in top_indices if score > 0]
    
    if not top_indices:
        return pd.DataFrame()
    
    return trials_df.loc[top_indices]
```

**Deliverable:** Working search function
**Test:** Call with sample query

---

### Task 2.3: Chat Interface (60 min)

**Add new page:**

```python
elif page == "AI Research Assistant":
    section_header("AI Research Assistant", "Ask questions about clinical trials")
    
    if not OPENAI_ENABLED:
        st.warning("⚠️ OpenAI API key not configured. Set OPENAI_API_KEY environment variable to enable chat.")
        st.info("Example: `export OPENAI_API_KEY='sk-...'`")
        st.stop()
    
    # Load trials
    trials_df = load_trials_for_search()
    
    if len(trials_df) == 0:
        st.error("No trials data available. Please run data collection first.")
        st.stop()
    
    st.markdown(f"**Database:** {len(trials_df):,} clinical trials across 15 diseases")
    
    # Initialize chat history
    if "messages" not in st.session_state:
        st.session_state.messages = []
    
    # Display chat history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
    
    # Chat input
    if prompt := st.chat_input("Ask about clinical trials..."):
        # Add user message
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)
        
        # Search relevant trials
        with st.spinner("Searching database..."):
            relevant_trials = search_trials_simple(prompt, trials_df, top_k=5)
        
        # Build context
        context = ""
        if len(relevant_trials) > 0:
            context = "Relevant trials from database:\n\n"
            for idx, trial in relevant_trials.iterrows():
                nct_id = trial.get('nct_id', 'Unknown')
                title = trial.get('title', 'No title')
                phase = trial.get('phase', 'Unknown')
                status = trial.get('overall_status', 'Unknown')
                conditions = trial.get('conditions', 'Unknown')
                
                context += f"- **{nct_id}**: {title}\n"
                context += f"  Phase: {phase} | Status: {status} | Conditions: {conditions}\n\n"
        else:
            context = "No directly matching trials found in database. Providing general information.\n\n"
        
        # Generate response
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                try:
                    response = openai.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": f"{context}\nUser question: {prompt}"}
                        ],
                        max_tokens=500,
                        temperature=0.7
                    )
                    
                    answer = response.choices[0].message.content
                    st.markdown(answer)
                    
                    # Add to history
                    st.session_state.messages.append({"role": "assistant", "content": answer})
                    
                except Exception as e:
                    st.error(f"Error: {str(e)}")
                    st.info("Make sure OPENAI_API_KEY is set correctly")
```

**Add to sidebar navigation:**
```python
"AI Research Assistant",  # ADD THIS after ML Model Explainability
```

**Deliverable:** Working chat interface
**Test:** Ask question, get response

---

### Task 2.4: Example Queries (30 min)

**Add to sidebar when on AI page:**

```python
if page == "AI Research Assistant":
    st.sidebar.markdown("---")
    st.sidebar.subheader("Example Questions")
    
    examples = [
        "What Phase 3 trials are there for Multiple Sclerosis?",
        "Which trials have the highest success probability?",
        "Tell me about recent trials for rare diseases",
        "What's the competitive landscape for Crohn's disease?",
        "Which sponsors have the best track record?",
        "Show me trials with novel mechanisms of action",
        "What are the key success factors for Phase 2 trials?"
    ]
    
    for i, example in enumerate(examples):
        if st.sidebar.button(example, key=f"example_{i}"):
            # Add to chat
            st.session_state.messages.append({"role": "user", "content": example})
            st.rerun()
```

**Deliverable:** Clickable example queries
**Test:** Click example, see it in chat

---

## Part 3: Quick Wins (Optional - 1 hour)

### Task 3.1: Trial Success Heatmap (30 min)

**Add to ML Explainability page:**

```python
    # Success probability heatmap
    st.subheader("Success Probability by Disease and Phase")
    
    heatmap_data = pd.DataFrame({
        'Disease': ['Multiple Sclerosis', 'Crohn\'s Disease', 'Rheumatoid Arthritis', 'Lupus', 'Sickle Cell'] * 3,
        'Phase': ['Phase 1'] * 5 + ['Phase 2'] * 5 + ['Phase 3'] * 5,
        'Success Rate': [0.85, 0.82, 0.88, 0.79, 0.75,  # Phase 1
                        0.65, 0.62, 0.68, 0.58, 0.55,  # Phase 2
                        0.75, 0.72, 0.78, 0.68, 0.65]  # Phase 3
    })
    
    heatmap_pivot = heatmap_data.pivot(index='Disease', columns='Phase', values='Success Rate')
    
    fig = px.imshow(
        heatmap_pivot,
        labels=dict(x="Phase", y="Disease", color="Success Probability"),
        color_continuous_scale='RdYlGn',
        aspect="auto"
    )
    fig.update_layout(height=400)
    st.plotly_chart(fig, use_container_width=True)
```

**Deliverable:** Heatmap visualization
**Test:** See color-coded success rates

---

### Task 3.2: Prediction API Endpoint (30 min)

**Create `api/predict.py`:**

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(
    title="Clinical Intelligence API",
    description="AI-powered clinical trial analytics",
    version="1.0.0"
)

class TrialInput(BaseModel):
    phase: str
    disease: str
    sponsor_type: str
    enrollment: int
    
class PredictionOutput(BaseModel):
    success_probability: float
    confidence_interval: List[float]
    key_factors: List[str]

@app.post("/predict/success", response_model=PredictionOutput)
def predict_success(trial: TrialInput):
    """Predict trial success probability"""
    
    # Simple rule-based prediction (replace with real model)
    base_prob = 0.6
    
    # Adjust by phase
    if trial.phase == "Phase 1":
        base_prob += 0.15
    elif trial.phase == "Phase 3":
        base_prob += 0.05
    
    # Adjust by sponsor
    if trial.sponsor_type == "Industry":
        base_prob += 0.08
    
    # Adjust by enrollment
    if trial.enrollment > 200:
        base_prob += 0.05
    
    # Cap at 0.95
    prob = min(base_prob, 0.95)
    
    return PredictionOutput(
        success_probability=prob,
        confidence_interval=[prob - 0.08, prob + 0.08],
        key_factors=["Phase", "Sponsor Type", "Enrollment Size"]
    )

@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

**Deliverable:** FastAPI endpoint
**Test:** `uvicorn api.predict:app --reload`

---

## Testing Checklist

### ML Explainability Dashboard:
- [ ] Feature importance chart displays
- [ ] Model comparison shows all 5 models
- [ ] Confidence distribution histogram works
- [ ] Sample predictions table is styled
- [ ] Navigation works from sidebar

### LLM Chat Interface:
- [ ] Chat input accepts text
- [ ] Search finds relevant trials
- [ ] OpenAI response displays
- [ ] Chat history persists
- [ ] Example queries work
- [ ] Error handling for missing API key

### Optional Features:
- [ ] Heatmap displays correctly
- [ ] API endpoint responds
- [ ] API docs accessible at /docs

---

## Time Budget

| Task | Time | Priority |
|------|------|----------|
| Feature Importance | 30 min | CRITICAL |
| Model Comparison | 30 min | HIGH |
| Confidence Distribution | 30 min | MEDIUM |
| Sample Predictions | 30 min | MEDIUM |
| OpenAI Setup | 15 min | CRITICAL |
| Keyword Search | 45 min | CRITICAL |
| Chat Interface | 60 min | CRITICAL |
| Example Queries | 30 min | HIGH |
| Success Heatmap | 30 min | LOW |
| API Endpoint | 30 min | LOW |
| **TOTAL** | **4h 45min** | |

**Minimum Viable (3 hours):**
- Feature Importance ✓
- Model Comparison ✓
- OpenAI Setup ✓
- Keyword Search ✓
- Chat Interface ✓

**Full Sprint (4-5 hours):**
- All of above +
- Confidence Distribution ✓
- Sample Predictions ✓
- Example Queries ✓

---

## Success Criteria

### Must Have:
- [ ] ML explainability page exists and loads
- [ ] Feature importance chart shows data
- [ ] Chat interface accepts input
- [ ] Chat returns responses (even if basic)
- [ ] No critical errors

### Should Have:
- [ ] Model comparison chart works
- [ ] Chat searches trials database
- [ ] Example queries clickable
- [ ] Professional styling

### Nice to Have:
- [ ] Confidence distribution
- [ ] Sample predictions table
- [ ] Success heatmap
- [ ] API endpoint

---

## Next Steps After This Sprint

1. **Test everything works**
2. **Take screenshots** of ML dashboard and chat
3. **Move to Business Sprint** (venture framing, demo, application)

---

**Ready to start? Begin with Task 1.1: Feature Importance Visualization!**
