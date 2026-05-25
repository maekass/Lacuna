# AI/ML Sprint: Step-by-Step Prompts with Debugging
# Scrupulous implementation with testing at every step

**Total Time:** 4-6 hours
**Approach:** Build → Test → Debug → Verify → Move On

---

## 🎯 PART 1: ML EXPLAINABILITY DASHBOARD (2 hours)

### Prompt 1.1: Add Feature Importance Visualization (30 min)

```
Add a new "ML Model Explainability" page to the Streamlit dashboard.

Requirements:
1. Create a new page in dashboard/app.py that displays feature importance
2. Show top 15 features for trial success prediction
3. Use a horizontal bar chart with plotly
4. Include sample data (we'll connect real model later)
5. Add professional styling consistent with existing theme
6. Add to sidebar navigation after "ML Models"

Features to show:
- Phase, Enrollment Size, Sponsor Type, Disease Prevalence
- Competitive Density, Primary Outcome Type, Trial Duration
- Number of Sites, Sponsor Track Record, Funding Amount
- FDA Designation, Patient Population, Endpoint Clarity
- Biomarker Availability, Prior Phase Success

Make it visually appealing with proper labels and formatting.
After implementation, help me test that:
- Page loads without errors
- Chart displays correctly
- Navigation works from sidebar
```

**After implementation, run this test prompt:**
```
Test the ML Model Explainability page:

1. Start the Streamlit app: streamlit run dashboard/app.py
2. Navigate to "ML Model Explainability" from sidebar
3. Verify the feature importance chart displays
4. Check that all 15 features are shown
5. Confirm bars are sorted by importance
6. Test that hovering shows values

If any errors occur, show me the full error message and stack trace.
If it works, take a screenshot for documentation.
```

---

### Prompt 1.2: Add Model Comparison Metrics (30 min)

```
Add a model performance comparison section to the ML Model Explainability page.

Requirements:
1. Add below the feature importance chart
2. Show comparison of 5 models: RandomForest, GradientBoosting, XGBoost, LogisticRegression, Ensemble
3. Display 4 metrics for each: Accuracy, Precision, Recall, F1-Score
4. Use a grouped bar chart with plotly
5. Highlight that Ensemble achieves best performance (78% accuracy)
6. Add an info box explaining the ensemble approach
7. Use realistic performance numbers (Ensemble: 78%, XGBoost: 77%, GradientBoosting: 76%, RandomForest: 74%, LogisticRegression: 71%)

After implementation, help me verify:
- Chart displays all 5 models
- All 4 metrics are shown for each model
- Ensemble is clearly the best performer
- Colors are distinct and professional
- Info box explains the value of ensemble approach
```

**After implementation, run this test prompt:**
```
Debug and test the model comparison section:

1. Refresh the Streamlit app
2. Navigate to ML Model Explainability page
3. Scroll to model comparison section
4. Verify all 5 models are shown
5. Check that metrics are correctly displayed
6. Confirm ensemble has highest values
7. Test chart interactivity (hover, legend)

Common issues to check:
- Are colors distinguishable?
- Do legend labels match data?
- Is the chart height appropriate?
- Does the info box display correctly?

If any issues, provide detailed error messages.
```

---

### Prompt 1.3: Add Prediction Confidence Distribution (30 min)

```
Add a prediction confidence distribution section to the ML Model Explainability page.

Requirements:
1. Add below the model comparison section
2. Generate sample prediction probabilities (use numpy.random.beta for realistic distribution)
3. Create a histogram showing distribution of success probabilities
4. Add summary statistics: mean probability, high confidence count (>70%), low confidence count (<30%)
5. Use 3 columns for the metrics display
6. Color the histogram green (#4CAF50)
7. Set appropriate bin count (50 bins)
8. Add explanatory text about what the distribution means

After implementation, verify:
- Histogram displays realistic distribution
- Summary metrics are calculated correctly
- Layout is clean with proper spacing
- Colors match the theme
```

**After implementation, run this test prompt:**
```
Test the confidence distribution section thoroughly:

1. Refresh Streamlit app
2. Navigate to ML Model Explainability
3. Scroll to confidence distribution
4. Verify histogram displays
5. Check that metrics show reasonable values
6. Test that distribution looks realistic (not uniform)

Debugging checklist:
- Does numpy import work?
- Is random seed set for reproducibility?
- Are metrics calculated correctly?
- Is histogram binning appropriate?
- Do colors render correctly?

If errors occur, show full traceback and suggest fixes.
```

---

### Prompt 1.4: Add Sample Predictions Table (30 min)

```
Add a sample high-confidence predictions table to the ML Model Explainability page.

Requirements:
1. Add below the confidence distribution
2. Create a table with 5 sample trials showing:
   - NCT ID (real NCT IDs from our data: NCT04846959, NCT03979352, NCT05114278, NCT02156843, NCT01805414)
   - Disease
   - Phase
   - Success Probability
   - Confidence Interval
   - Key Factor (what drives the prediction)
3. Style the table with background gradient on Success Probability column (red-yellow-green)
4. Make NCT IDs clickable links to ClinicalTrials.gov
5. Hide the index column
6. Add caption explaining these are sample predictions

After implementation, verify:
- Table displays with proper styling
- Gradient coloring works (green for high probability)
- NCT ID links are clickable
- All columns are properly formatted
- Caption is informative
```

**After implementation, run this test prompt:**
```
Comprehensive testing of the predictions table:

1. Refresh Streamlit app
2. Navigate to ML Model Explainability
3. Scroll to sample predictions table
4. Test each aspect:
   - Click an NCT ID link (should open ClinicalTrials.gov)
   - Verify gradient coloring (higher probability = greener)
   - Check that all data displays correctly
   - Confirm confidence intervals are formatted properly

Edge cases to test:
- Do links open in new tab?
- Is gradient visible on all probability values?
- Are percentages formatted correctly?
- Does table fit within container width?

Document any issues with screenshots.
```

---

### Prompt 1.5: Final ML Dashboard Integration (30 min)

```
Integrate the ML Model Explainability page into the main dashboard navigation and ensure everything works together.

Requirements:
1. Add "ML Model Explainability" to the sidebar navigation (after "ML Models", before "Quant Strategy")
2. Ensure page routing works correctly
3. Add a section header at the top of the page
4. Add navigation breadcrumbs or back button
5. Ensure all charts use consistent styling with the rest of the dashboard
6. Add loading states where appropriate
7. Test that page works with the new UX improvements (Lottie animations, tooltips)

After implementation, perform full integration testing:
- Test navigation from every other page
- Verify styling is consistent
- Check that all interactive elements work
- Ensure no console errors
- Test on different screen sizes (if possible)
```

**After implementation, run this test prompt:**
```
Full integration testing for ML Explainability Dashboard:

1. Start fresh Streamlit session
2. Test navigation:
   - From Overview → ML Model Explainability
   - From ML Models → ML Model Explainability
   - From ML Model Explainability → other pages
3. Verify all components load:
   - Feature importance chart
   - Model comparison chart
   - Confidence distribution
   - Sample predictions table
4. Check browser console for errors (F12 → Console)
5. Test responsiveness (resize browser window)
6. Verify theme consistency with other pages

Create a checklist of what works and what needs fixing.
If everything works, commit the changes with a descriptive message.
```

---

## 🤖 PART 2: LLM CHAT INTERFACE (2-2.5 hours)

### Prompt 2.1: Set Up OpenAI Integration (15 min)

```
Set up OpenAI integration for the Streamlit dashboard with proper error handling.

Requirements:
1. Add OpenAI import at the top of dashboard/app.py
2. Check for OPENAI_API_KEY environment variable
3. Create a flag OPENAI_ENABLED that's True only if key exists
4. Initialize openai.api_key only if key is present
5. Create a comprehensive system prompt for a clinical trial analyst assistant
6. Add error handling for missing API key
7. Add instructions for users on how to set the API key

System prompt should include:
- Role: Clinical trial analyst assistant
- Database: 6,819 trials across 15 diseases
- Capabilities: Trial analysis, drug development insights, investment opportunities
- Style: Accurate, data-driven, cite NCT IDs
- Limitations: Clearly state when information is not available

After implementation, verify:
- Import works without errors
- Flag is set correctly based on environment variable
- System prompt is comprehensive and professional
- Error messages are helpful
```

**After implementation, run this test prompt:**
```
Test OpenAI integration setup:

1. First test WITHOUT API key:
   - Unset OPENAI_API_KEY: unset OPENAI_API_KEY
   - Start Streamlit app
   - Check that OPENAI_ENABLED is False
   - Verify no errors on startup

2. Then test WITH API key:
   - Set OPENAI_API_KEY: export OPENAI_API_KEY="sk-..."
   - Restart Streamlit app
   - Check that OPENAI_ENABLED is True
   - Verify openai.api_key is set

3. Test system prompt:
   - Print the system prompt
   - Verify it's comprehensive
   - Check for typos or unclear instructions

Document the results and any issues encountered.
```

---

### Prompt 2.2: Create Keyword Search Function (45 min)

```
Create a simple but effective keyword-based search function for clinical trials.

Requirements:
1. Create a function that loads trials data (use caching with @st.cache_data)
2. Create a search function that:
   - Takes a query string and returns top K relevant trials
   - Searches across: title, brief_summary, conditions, interventions, sponsor
   - Scores trials by counting keyword matches
   - Weights exact phrase matches higher
   - Filters out very short words (<4 characters)
   - Returns empty DataFrame if no matches
3. Handle missing/null values gracefully
4. Make it fast enough for interactive use
5. Add docstrings explaining the algorithm

Search algorithm:
- Split query into words
- For each trial, count occurrences of each word in searchable text
- Boost score for exact phrase matches
- Return top K trials sorted by score
- Only return trials with score > 0

After implementation, test thoroughly with various queries.
```

**After implementation, run this test prompt:**
```
Comprehensive testing of keyword search function:

1. Test with simple queries:
   - "Multiple Sclerosis" (should find MS trials)
   - "Phase 3" (should find Phase 3 trials)
   - "Crohn's Disease" (should find Crohn's trials)

2. Test edge cases:
   - Empty query (should handle gracefully)
   - Very long query (should not crash)
   - Query with special characters
   - Query with numbers
   - Query with only short words

3. Test performance:
   - Time the search function
   - Should return in <1 second for typical queries
   - Verify caching works (second call faster)

4. Test result quality:
   - Verify returned trials are relevant
   - Check that scores make sense
   - Confirm top results are most relevant

5. Test error handling:
   - What happens if trials_df is empty?
   - What if required columns are missing?
   - What if all values are null?

Document all test results and any bugs found.
```

---

### Prompt 2.3: Build Chat Interface (60 min)

```
Create a professional chat interface for the AI Research Assistant page.

Requirements:
1. Create a new page "AI Research Assistant" in dashboard/app.py
2. Check if OpenAI is enabled, show warning if not
3. Load trials data and display count
4. Initialize chat history in session state
5. Display chat history with proper message formatting
6. Create chat input using st.chat_input
7. When user sends message:
   - Add to chat history
   - Search for relevant trials using keyword search
   - Build context from top 5 matches
   - Send to OpenAI with system prompt and context
   - Display response
   - Add response to chat history
8. Handle errors gracefully (API errors, rate limits, etc.)
9. Show loading spinner while generating response
10. Add helpful error messages for common issues

Chat flow:
User input → Search trials → Build context → OpenAI API → Display response → Update history

After implementation, test the complete flow.
```

**After implementation, run this test prompt:**
```
Thorough testing of chat interface:

1. Basic functionality:
   - Navigate to AI Research Assistant page
   - Verify page loads without errors
   - Check that trial count displays
   - Confirm chat input is visible

2. Test WITHOUT API key:
   - Unset OPENAI_API_KEY
   - Restart app
   - Navigate to AI Research Assistant
   - Verify warning message displays
   - Confirm chat input is disabled or shows helpful message

3. Test WITH API key:
   - Set OPENAI_API_KEY
   - Restart app
   - Navigate to AI Research Assistant
   - Send a test message: "What Phase 3 trials are there for Multiple Sclerosis?"
   - Verify:
     * Message appears in chat
     * Loading spinner shows
     * Response is generated
     * Response appears in chat
     * Response is relevant and cites NCT IDs

4. Test error handling:
   - Try with invalid API key (should show error)
   - Try with very long message (should handle gracefully)
   - Try rapid-fire messages (should queue properly)

5. Test chat history:
   - Send multiple messages
   - Verify all messages persist
   - Refresh page (history should reset)
   - Check that context is maintained across messages

6. Test search integration:
   - Send query about specific disease
   - Verify relevant trials are found
   - Check that context includes trial details
   - Confirm NCT IDs in response match found trials

Document all issues with detailed error messages and screenshots.
```

---

### Prompt 2.4: Add Example Queries (30 min)

```
Add example queries to the AI Research Assistant sidebar to help users get started.

Requirements:
1. Add a sidebar section when on AI Research Assistant page
2. Create 7 example questions covering different use cases:
   - Disease-specific queries
   - Phase-specific queries
   - Success probability queries
   - Competitive landscape queries
   - Sponsor track record queries
   - Novel mechanism queries
   - Success factor queries
3. Make each example a clickable button
4. When clicked, add the question to chat and trigger response
5. Style buttons consistently with theme
6. Add a header "Example Questions" above the buttons
7. Add a separator line above the section

Example questions should be:
- Realistic and useful
- Cover different query types
- Demonstrate platform capabilities
- Lead to interesting responses

After implementation, test that clicking examples works correctly.
```

**After implementation, run this test prompt:**
```
Test example queries thoroughly:

1. Visual testing:
   - Navigate to AI Research Assistant
   - Check that sidebar shows "Example Questions"
   - Verify all 7 examples are visible
   - Confirm buttons are styled consistently
   - Check that separator line displays

2. Functional testing:
   - Click each example button one by one
   - Verify each adds question to chat
   - Confirm response is generated for each
   - Check that responses are relevant
   - Test that button clicks work multiple times

3. Edge case testing:
   - Click button while response is generating (should queue or disable)
   - Click multiple buttons rapidly (should handle gracefully)
   - Test with and without API key
   - Verify buttons work after page refresh

4. Response quality testing:
   - For each example, verify response quality:
     * Is response relevant to question?
     * Does it cite specific NCT IDs?
     * Is information accurate?
     * Is tone professional?
     * Does it demonstrate platform capabilities?

5. Integration testing:
   - Test examples with different trial data states
   - Verify examples work with search function
   - Check that context is properly built
   - Confirm no console errors

Create a test report documenting:
- Which examples work perfectly
- Which need response tuning
- Any bugs or issues found
- Suggestions for improvement
```

---

### Prompt 2.5: Final Chat Integration and Polish (30 min)

```
Finalize the AI Research Assistant integration and add polish.

Requirements:
1. Add "AI Research Assistant" to main sidebar navigation (after "ML Model Explainability")
2. Add section header with icon and description
3. Add helpful instructions at the top of the page
4. Add a "Clear Chat" button to reset conversation
5. Add token usage tracking (if possible)
6. Add rate limit handling
7. Improve error messages to be more user-friendly
8. Add tooltips explaining features
9. Ensure consistent styling with rest of dashboard
10. Add keyboard shortcuts (Enter to send)

Polish items:
- Professional styling
- Smooth animations
- Clear visual hierarchy
- Helpful onboarding
- Graceful error handling

After implementation, do final end-to-end testing.
```

**After implementation, run this test prompt:**
```
Final comprehensive testing of AI Research Assistant:

1. Full user flow testing:
   - Fresh start of Streamlit app
   - Navigate to AI Research Assistant
   - Read instructions (are they clear?)
   - Try an example query
   - Ask a custom question
   - Clear chat and start over
   - Test multiple conversations

2. Polish verification:
   - Check section header displays correctly
   - Verify instructions are helpful
   - Test Clear Chat button works
   - Confirm styling is consistent
   - Check that animations are smooth
   - Verify tooltips display (if added)

3. Error handling testing:
   - Test with no API key (helpful message?)
   - Test with invalid API key (clear error?)
   - Test with rate limit hit (graceful handling?)
   - Test with network error (good error message?)
   - Test with malformed response (doesn't crash?)

4. Performance testing:
   - Measure response time for typical query
   - Test with long conversation history
   - Verify search is fast enough
   - Check that page doesn't lag

5. Accessibility testing:
   - Test keyboard navigation
   - Verify Enter key sends message
   - Check that focus states are visible
   - Confirm screen reader compatibility (if possible)

6. Cross-browser testing (if possible):
   - Test in Chrome
   - Test in Firefox
   - Test in Safari
   - Document any browser-specific issues

Create final test report with:
- Summary of all features tested
- List of any bugs found
- Performance metrics
- User experience assessment
- Recommendations for improvements

If everything passes, commit with detailed commit message.
```

---

## 🧪 PART 3: DEBUGGING & VALIDATION (30-60 min)

### Prompt 3.1: Comprehensive Bug Hunt

```
Perform a comprehensive bug hunt across all new features.

Test systematically:

1. ML Model Explainability page:
   - Load page 10 times (any intermittent errors?)
   - Test all charts with different browser zoom levels
   - Check console for warnings or errors
   - Verify data accuracy (do numbers make sense?)
   - Test with slow network (do loading states work?)

2. AI Research Assistant page:
   - Test with various query types
   - Try to break the search function
   - Test with edge case inputs
   - Verify context building is correct
   - Check that responses are consistently good

3. Integration issues:
   - Test navigation between all pages
   - Verify session state doesn't leak
   - Check that caching works correctly
   - Test with multiple browser tabs
   - Verify no memory leaks

4. Error scenarios:
   - Missing data files
   - Corrupted data
   - Network failures
   - API errors
   - Invalid inputs

Document every bug found with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages
- Screenshots
- Severity (critical/high/medium/low)
```

---

### Prompt 3.2: Performance Optimization

```
Analyze and optimize performance of new features.

Check:

1. Load times:
   - How long does ML Explainability page take to load?
   - How long does chat response take?
   - Are there any slow operations?

2. Caching:
   - Is data cached properly?
   - Are expensive operations cached?
   - Is cache invalidation working?

3. Memory usage:
   - Does memory grow over time?
   - Are large objects cleaned up?
   - Is session state size reasonable?

4. API efficiency:
   - Are we making unnecessary API calls?
   - Can we batch operations?
   - Is retry logic efficient?

Optimize:
- Add caching where needed
- Reduce redundant operations
- Optimize data loading
- Improve search algorithm if slow

Measure before and after optimization.
```

---

### Prompt 3.3: Code Quality Review

```
Review code quality of all new features.

Check for:

1. Code organization:
   - Are functions well-named?
   - Is code properly commented?
   - Are there any code smells?
   - Is logic easy to follow?

2. Error handling:
   - Are all errors caught?
   - Are error messages helpful?
   - Is there proper logging?
   - Are edge cases handled?

3. Best practices:
   - Are there any security issues?
   - Is input validated?
   - Are API keys protected?
   - Is code DRY (Don't Repeat Yourself)?

4. Documentation:
   - Are docstrings complete?
   - Are complex algorithms explained?
   - Are assumptions documented?
   - Is usage clear?

Refactor any code that needs improvement.
Create a code quality report.
```

---

## 📊 FINAL VALIDATION

### Prompt 4.1: End-to-End Testing

```
Perform complete end-to-end testing of the entire platform.

Full user journey:
1. Start Streamlit app
2. Navigate through all pages in order
3. Test every feature on every page
4. Verify all links work
5. Check all data displays correctly
6. Test all interactive elements
7. Verify styling is consistent
8. Check for any console errors

Create a comprehensive test report covering:
- All features tested
- All bugs found
- Performance metrics
- User experience assessment
- Screenshots of key features
- Recommendations

This should be production-ready quality.
```

---

### Prompt 4.2: Create Testing Documentation

```
Create comprehensive testing documentation for future reference.

Include:

1. Test plan:
   - What to test
   - How to test it
   - Expected results

2. Test cases:
   - For each feature
   - Including edge cases
   - With expected outcomes

3. Bug tracking:
   - Template for reporting bugs
   - Severity levels
   - Resolution process

4. Performance benchmarks:
   - Load time targets
   - Response time targets
   - Memory usage limits

5. Regression testing:
   - Tests to run before each release
   - Automated test scripts (if possible)
   - Checklist for manual testing

Save as TESTING.md in the project root.
```

---

## 🎯 SUCCESS CRITERIA

### Before moving to Business Sprint, verify:

**ML Explainability Dashboard:**
- [ ] Page loads without errors
- [ ] Feature importance chart displays correctly
- [ ] Model comparison shows all 5 models
- [ ] Confidence distribution is realistic
- [ ] Sample predictions table is styled properly
- [ ] All charts are interactive
- [ ] Navigation works smoothly
- [ ] No console errors
- [ ] Performance is acceptable (<2s load time)
- [ ] Styling is consistent with theme

**AI Research Assistant:**
- [ ] Page loads with proper instructions
- [ ] OpenAI integration works (with key)
- [ ] Helpful warning shows (without key)
- [ ] Keyword search finds relevant trials
- [ ] Chat interface is responsive
- [ ] Messages display correctly
- [ ] Responses are relevant and cite NCT IDs
- [ ] Example queries work
- [ ] Clear chat button works
- [ ] Error handling is graceful
- [ ] No memory leaks
- [ ] Performance is good (<5s per response)

**Integration:**
- [ ] Both pages accessible from navigation
- [ ] No conflicts between features
- [ ] Session state is clean
- [ ] Caching works correctly
- [ ] No console warnings
- [ ] Works in different browsers
- [ ] Responsive on different screen sizes

**Code Quality:**
- [ ] Code is well-organized
- [ ] Functions are documented
- [ ] Error handling is comprehensive
- [ ] No security issues
- [ ] Follows best practices
- [ ] Ready for production

---

## 📸 DOCUMENTATION

### After completing all testing, create:

1. **Screenshots:**
   - ML Explainability page (all sections)
   - AI Research Assistant (example conversation)
   - Feature importance chart (close-up)
   - Model comparison chart (close-up)
   - Chat interface with response

2. **Screen recording:**
   - 2-minute walkthrough of ML features
   - 2-minute walkthrough of AI chat
   - Show key interactions

3. **Test report:**
   - Summary of all tests performed
   - List of bugs found and fixed
   - Performance metrics
   - User experience assessment

4. **Commit message:**
```
feat: Add ML Explainability Dashboard and AI Research Assistant

## ML Explainability Dashboard
- Feature importance visualization (top 15 features)
- Model performance comparison (5 models)
- Prediction confidence distribution
- Sample high-confidence predictions table
- Interactive charts with plotly
- Professional styling consistent with theme

## AI Research Assistant
- LLM-powered chat interface with OpenAI GPT-3.5
- Keyword-based search across 6,819 trials
- Context-aware responses citing NCT IDs
- 7 example queries for common use cases
- Graceful error handling and loading states
- Clear chat functionality

## Testing
- Comprehensive end-to-end testing performed
- All edge cases handled
- Performance optimized (<2s load, <5s response)
- No console errors or warnings
- Production-ready quality

## Technical Details
- Added OpenAI integration with proper error handling
- Implemented efficient keyword search with caching
- Created reusable chat components
- Optimized for performance and UX
- Full documentation and test coverage
```

---

**Ready to start? Begin with Prompt 1.1: Add Feature Importance Visualization!**

**Remember:** Test after EVERY prompt. Don't move forward if something doesn't work perfectly.
