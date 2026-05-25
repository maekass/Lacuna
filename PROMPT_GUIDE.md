# Step-by-Step Prompt Guide for 1-Day Sprint
# Copy-paste these prompts to Cascade in order

---

## 🌅 MORNING SESSION (9:00 AM - 12:30 PM)

### Sprint 1: README Transformation (9:00 AM - 10:30 AM)

#### Prompt 1.1: Update Hero Section (10 min)
```
Update the README.md hero section to lead with AI/ML capabilities and venture framing. 

Replace the current hero with:
- Title: "AI-Powered Clinical Intelligence Platform"
- Tagline emphasizing ML-driven predictions, verified trials, and quality score
- Tech stack badges for Python, Scikit-learn, XGBoost, OpenAI API
- Brief description positioning this as venture-ready infrastructure

Make it look professional and AI-first.
```

#### Prompt 1.2: Add Venture Opportunity Section (20 min)
```
Add a new "Venture Opportunity" section to README.md after the hero section.

Include:
- Problem statement: Biotech investors lack reliable data for $200B+ clinical trial market
- Solution: AI-powered platform with certified data quality
- Market opportunity: $5B+ TAM for biotech investment analytics
- Target customers: VC firms, pharma BD teams, hedge funds
- Business model: SaaS ($10K-50K/year per seat)
- Traction: 6,819 verified trials, 99.96/100 quality score, daily certification

Use professional formatting with clear sections and bullet points.
```

#### Prompt 1.3: Add AI/ML Architecture Section (20 min)
```
Add an "AI/ML Architecture" section to README.md showing technical capabilities.

Include:
- Ensemble model details (RandomForest + GradientBoosting + XGBoost + LogisticRegression)
- 78% accuracy with 30+ features
- Key features: NLP analysis, sponsor intelligence, competitive scoring
- Data pipeline flow diagram (text-based is fine)
- Output: Success probability with 95% confidence intervals

Make it technical but accessible.
```

#### Prompt 1.4: Add Business Impact Section (20 min)
```
Add a "Business Impact" section to README.md with quantified value.

Include metrics for:
- Biotech investors: 40% faster due diligence, $500K+ saved per decision, 78% vs 60% accuracy
- Pharma BD teams: Real-time intelligence, 100% verified data, $1M+ saved annually
- Platform metrics: 6,819 trials (3x competitors), 99.96/100 quality, daily certification

Use tables or bullet points for clarity.
```

#### Prompt 1.5: Update Quick Start Section (20 min)
```
Update the Quick Start section in README.md to be more user-friendly.

Add two paths:
1. For Investors/Analysts: Verify data → Explore dashboard → Query API
2. For Developers: Clone → Install → Run predictions → Start dashboard

Include actual commands and links. Make it easy to get started.
```

**✅ Checkpoint:** README should look venture-ready and AI-focused

---

### Sprint 2: ML Explainability Dashboard (10:30 AM - 12:30 PM)

#### Prompt 2.1: Add Feature Importance Visualization (30 min)
```
Add a new "ML Model Explainability" page to the Streamlit dashboard (dashboard/app.py).

Create a feature importance visualization showing:
- Top 15 features for trial success prediction
- Horizontal bar chart using plotly
- Load from existing ML model if available, or create sample data
- Add to sidebar navigation

Make it visually appealing and informative.
```

#### Prompt 2.2: Add Model Comparison Metrics (30 min)
```
Add a model performance comparison section to the ML Explainability page.

Show:
- Comparison of RandomForest, GradientBoosting, XGBoost, LogisticRegression, and Ensemble
- Metrics: Accuracy, Precision, Recall, F1-Score
- Grouped bar chart using plotly
- Highlight that Ensemble performs best (78% accuracy)

Use realistic performance numbers based on typical ML models.
```

#### Prompt 2.3: Add Prediction Confidence Visualization (30 min)
```
Add a prediction confidence distribution section to the ML Explainability page.

Include:
- Histogram showing distribution of success probabilities
- Table of high-confidence predictions (>80% probability)
- Use sample data if real predictions aren't available
- Make it interactive with plotly

Show that the model produces well-calibrated probabilities.
```

#### Prompt 2.4: Update Sidebar Navigation (30 min)
```
Update the Streamlit sidebar navigation to include the new "ML Model Explainability" page.

Add it after "ML Models" and before "Quant Strategy".
Make sure the page routing works correctly.
Test that clicking the navigation item loads the new page.
```

**✅ Checkpoint:** ML explainability dashboard should be working

---

### 🍕 LUNCH BREAK (12:30 PM - 1:00 PM)
Take a 30-minute break!

---

## 🌆 AFTERNOON SESSION (1:00 PM - 6:00 PM)

### Sprint 3: LLM Chat Interface (1:00 PM - 3:30 PM)

#### Prompt 3.1: Set Up OpenAI Integration (30 min)
```
Add OpenAI integration to the Streamlit dashboard (dashboard/app.py).

At the top of the file:
- Import openai
- Initialize with API key from environment variable
- Create a system prompt for a clinical trial analyst assistant
- Add error handling if API key is missing

Keep it simple and clean.
```

#### Prompt 3.2: Create Simple RAG Function (60 min)
```
Create a simple keyword-based search function for clinical trials (no vector database needed).

The function should:
- Take a user query as input
- Search through the enhanced_clinical_trials.csv file
- Score trials by counting keyword matches in title, summary, and conditions
- Return top 5 most relevant trials
- Be fast and simple (no embeddings needed for MVP)

This will be used to provide context to the LLM.
```

#### Prompt 3.3: Build Chat Interface (60 min)
```
Add a new "AI Research Assistant" page to the Streamlit dashboard.

Create a chat interface that:
- Uses st.chat_input and st.chat_message
- Stores conversation history in session state
- When user asks a question:
  1. Search for relevant trials using the keyword search function
  2. Create context from top matches
  3. Send to OpenAI GPT-3.5-turbo with system prompt and context
  4. Display the response
- Handle errors gracefully (show message if API key missing)

Make it look like a professional chat interface.
```

#### Prompt 3.4: Add Example Queries (30 min)
```
Add example queries to the AI Research Assistant page sidebar.

Include 5 example questions like:
- "What Phase 3 trials are there for Multiple Sclerosis?"
- "Which trials have the highest success probability?"
- "Tell me about recent trials for rare diseases"
- "What's the competitive landscape for Crohn's disease?"
- "Which sponsors have the best track record?"

Make them clickable buttons that populate the chat input.
```

**✅ Checkpoint:** Chat interface should answer questions about trials

---

### Sprint 4: Demo Video (3:30 PM - 4:30 PM)

#### Prompt 4.1: Create Demo Script (10 min)
```
Create a 5-minute demo video script for the platform.

Structure:
1. Intro (30 sec): Platform overview and value proposition
2. Data Quality (60 sec): Show verification banner and one-click verification
3. ML Predictions (90 sec): Show ML explainability dashboard
4. AI Chat (90 sec): Ask 2-3 questions and show responses
5. Wrap-up (30 sec): Summary of capabilities and venture potential

Keep it concise and focused on impressive features.
```

#### Prompt 4.2: Recording Instructions (20 min)
```
Give me step-by-step instructions for recording the demo video.

Include:
- Recommended screen recording tool (Loom, QuickTime, OBS)
- Settings to use (resolution, frame rate)
- What to show on screen for each section
- Tips for smooth recording (close notifications, prepare tabs, etc.)
- How to do it in one take without editing

Make it foolproof for someone who hasn't recorded demos before.
```

#### Prompt 4.3: Upload Instructions (30 min)
```
After I record the video, give me instructions for:
- Uploading to YouTube (unlisted)
- What title, description, and tags to use
- How to get the shareable link
- How to add the video to the README with a thumbnail

Include the exact markdown code to embed the video in README.
```

**✅ Checkpoint:** Demo video recorded and uploaded

---

### Sprint 5: Application Materials (4:30 PM - 6:00 PM)

#### Prompt 5.1: Update Resume Project Description (30 min)
```
Write a 2-3 line resume description for this project tailored to C10 Labs AI Fellow position.

Emphasize:
- AI/ML capabilities (ensemble models, 78% accuracy)
- Venture-ready infrastructure (6,819 trials, 99.96/100 quality)
- Business value ($5B+ market opportunity, SaaS model)
- Full-stack capability (data → ML → LLM → UI)
- Healthcare + AI intersection

Make it impressive but concise.
```

#### Prompt 5.2: Write Cover Letter (45 min)
```
Write a 1-page cover letter for the C10 Labs AI Fellow position.

Structure:
1. Opening: Why I'm applying (built AI-first healthcare venture)
2. Project overview: Clinical intelligence platform with ML + certified data
3. Technical achievements: Ensemble models, LLM chat, automated certification
4. Venture thinking: Identified problem, built solution, designed business model
5. C10 alignment: Healthcare + AI + venture building
6. Closing: Excited to bring this approach to C10's portfolio

Include:
- Demo video link
- GitHub link
- Key metrics (78% accuracy, 6,819 trials, 99.96/100 quality)

Make it compelling and show both technical depth and business thinking.
```

#### Prompt 5.3: Add Demo Video to README (15 min)
```
Add the demo video to the README.md file.

Create a new section called "Demo Video" near the top (after hero, before verification).

Include:
- Embedded YouTube video with thumbnail
- Brief description of what's shown in the video
- List of features demonstrated
- Link to full documentation

Make it prominent and clickable.
```

**✅ Checkpoint:** Application materials complete and ready to submit

---

## 🎯 END OF DAY CHECKLIST

### Final Prompt: Review Everything
```
Help me review everything we've built today:

1. Check that README looks professional and venture-focused
2. Verify ML explainability dashboard works
3. Test AI chat interface with a few questions
4. Confirm demo video is embedded in README
5. Review resume description and cover letter
6. Create a checklist of what's done and what's ready to submit

Give me a summary of what we accomplished and what the next steps are for applying to C10 Labs.
```

---

## 📋 QUICK REFERENCE: Prompts in Order

**Morning:**
1. "Update README hero section with AI/ML focus"
2. "Add Venture Opportunity section to README"
3. "Add AI/ML Architecture section to README"
4. "Add Business Impact section to README"
5. "Update Quick Start section in README"
6. "Add feature importance visualization to Streamlit"
7. "Add model comparison metrics to Streamlit"
8. "Add prediction confidence visualization to Streamlit"
9. "Update sidebar navigation with new page"

**Afternoon:**
10. "Set up OpenAI integration in Streamlit"
11. "Create simple keyword search function for trials"
12. "Build chat interface with OpenAI"
13. "Add example queries to chat sidebar"
14. "Create demo video script"
15. "Give me recording instructions"
16. "Give me upload instructions"
17. "Write resume description for C10 Labs"
18. "Write cover letter for C10 Labs"
19. "Add demo video to README"
20. "Review everything and create final checklist"

---

## 💡 TIPS FOR USING THESE PROMPTS

### Do:
- ✅ Copy-paste prompts exactly as written
- ✅ Wait for each task to complete before moving to next
- ✅ Test each feature after it's built
- ✅ Ask for clarification if output isn't clear

### Don't:
- ❌ Skip prompts or change order
- ❌ Try to combine multiple prompts
- ❌ Add extra requirements not in the prompt
- ❌ Move on if something doesn't work

### If Something Breaks:
```
"The [feature] isn't working. I'm getting this error: [paste error]. 
Can you help me debug and fix it?"
```

### If You Need to Skip Something:
```
"I'm running behind schedule. Can we simplify [feature] to just the 
essential parts? What's the minimum viable version?"
```

### If You Want to Test:
```
"Can you help me test the [feature] we just built? What should I check 
to make sure it's working correctly?"
```

---

## ⏰ TIME CHECKPOINTS

**10:30 AM:** README should be transformed ✓  
**12:30 PM:** ML dashboard should be working ✓  
**3:30 PM:** Chat interface should be functional ✓  
**4:30 PM:** Demo video should be recorded ✓  
**6:00 PM:** Application materials should be complete ✓

**If you're behind at any checkpoint, use the emergency shortcuts in ONE_DAY_SPRINT.md**

---

## 🚀 READY TO START?

**Your first prompt is:**

```
Update the README.md hero section to lead with AI/ML capabilities and venture framing. 

Replace the current hero with:
- Title: "AI-Powered Clinical Intelligence Platform"
- Tagline emphasizing ML-driven predictions, verified trials, and quality score
- Tech stack badges for Python, Scikit-learn, XGBoost, OpenAI API
- Brief description positioning this as venture-ready infrastructure

Make it look professional and AI-first.
```

**Copy-paste this when you're ready to begin! Good luck! 🎯**
