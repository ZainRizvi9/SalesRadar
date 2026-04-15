require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { IamAuthenticator } = require('ibm-cloud-sdk-core');
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1');

const app = express();
app.use(cors());
app.use(express.json());

// Watson NLU client
const nlu = new NaturalLanguageUnderstandingV1({
  version: '2022-04-07',
  authenticator: new IamAuthenticator({ apikey: process.env.WATSON_API_KEY }),
  serviceUrl: process.env.WATSON_URL
});

// Buying signal definitions
const BUYING_SIGNALS = {
  expansion: [
    'expand', 'expansion', 'growth', 'scaling', 'scale',
    'new market', 'launch', 'opening', 'international', 'global rollout'
  ],
  investment: [
    'funding', 'raised', 'investment', 'capital', 'valuation',
    'IPO', 'acquisition', 'acquires', 'merger', 'billion', 'million', 'Series'
  ],
  hiring: [
    'hiring', 'headcount', 'talent', 'recruit', 'recruitment',
    'workforce', 'new roles', 'job openings', 'onboarding'
  ],
  technology: [
    'cloud', 'AI', 'artificial intelligence', 'digital transformation',
    'platform', 'automation', 'infrastructure', 'data', 'machine learning', 'SaaS'
  ],
  partnership: [
    'partnership', 'agreement', 'deal', 'collaboration',
    'contract', 'alliance', 'integration', 'joint venture', 'strategic'
  ]
};

function detectSignals(keywords, categories, concepts, rawText) {
  const signals = [];
  const searchCorpus = [
    ...keywords.map(k => k.text),
    ...categories.map(c => c.label),
    ...concepts.map(c => c.text),
    rawText
  ].join(' ').toLowerCase();

  for (const [signalType, terms] of Object.entries(BUYING_SIGNALS)) {
    const matched = terms.filter(term => searchCorpus.includes(term.toLowerCase()));
    if (matched.length > 0) {
      signals.push({
        type: signalType,
        strength: matched.length >= 3 ? 'Strong' : 'Moderate',
        evidence: [...new Set(matched)].slice(0, 3)
      });
    }
  }

  return signals.sort((a, b) =>
    a.strength === 'Strong' && b.strength !== 'Strong' ? -1 : 1
  );
}

function calculateScore(signals, sentiment, articleCount) {
  let score = 0;
  signals.forEach(signal => {
    score += signal.strength === 'Strong' ? 22 : 13;
  });
  score += Math.min(articleCount * 2, 15);
  if (sentiment === 'positive') score += 12;
  else if (sentiment === 'negative') score -= 8;
  return Math.min(Math.max(Math.round(score), 0), 100);
}

function isRelevantArticle(article, company) {
  const text = `${article.title} ${article.description}`.toLowerCase();
  return company.split(' ').some(word =>
    word.length > 2 && text.includes(word.toLowerCase())
  );
}

async function fetchArticleContent(url) {
  try {
    const response = await axios.get(url, {
      timeout: 4000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SalesRadar/1.0)' }
    });
    const text = response.data
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.slice(0, 3000);
  } catch {
    return null;
  }
}

async function analyzeCompany(company) {
  const newsResponse = await axios.get('https://newsapi.org/v2/everything', {
    params: {
      q: `"${company}"`,
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: 15,
      apiKey: process.env.NEWS_API_KEY
    }
  });

  const allArticles = newsResponse.data.articles.filter(
    a => a.title &&
         a.description &&
         !a.title.includes('[Removed]') &&
         isRelevantArticle(a, company)
  );

  if (allArticles.length === 0) {
    return {
      company, score: 0, priority: 'Cold', priorityColor: '#6b7280',
      sentiment: 'neutral', sentimentScore: 0, signals: [],
      keywords: [], keywordsWithSentiment: [], concepts: [],
      keyPeople: [], keyOrgs: [], articles: [], articleCount: 0,
      analyzedAt: new Date().toISOString()
    };
  }

  const topArticles = allArticles.slice(0, 5);
  const fullContents = await Promise.all(
    topArticles.slice(0, 3).map(a => fetchArticleContent(a.url))
  );

  const richText = topArticles.map((a, i) => {
    const base = `${a.title}. ${a.description}`;
    const full = fullContents[i];
    return full ? `${base} ${full}` : base;
  }).join(' ');

  const watsonText = richText.slice(0, 49000);

  const watsonResponse = await nlu.analyze({
    text: watsonText,
    features: {
      keywords:   { limit: 20, sentiment: true },
      categories: { limit: 5 },
      sentiment:  { document: true },
      concepts:   { limit: 10 },
      entities:   { limit: 10, sentiment: true, mentions: true }
    }
  });

  const watsonResult = watsonResponse.result;
  const sentiment   = watsonResult.sentiment.document.label;
  const keywords    = watsonResult.keywords   || [];
  const categories  = watsonResult.categories || [];
  const concepts    = watsonResult.concepts   || [];
  const entities    = watsonResult.entities   || [];

  const signals = detectSignals(keywords, categories, concepts, richText);
  const score   = calculateScore(signals, sentiment, allArticles.length);

  let priority, priorityColor;
  if      (score >= 70) { priority = 'Hot';  priorityColor = '#10b981'; }
  else if (score >= 50) { priority = 'Warm'; priorityColor = '#f59e0b'; }
  else if (score >= 30) { priority = 'Cool'; priorityColor = '#3b82f6'; }
  else                  { priority = 'Cold'; priorityColor = '#6b7280'; }

  // Only include named people with good relevance
  const keyPeople = entities
    .filter(e => e.type === 'Person' && e.relevance > 0.3)
    .slice(0, 4)
    .map(e => ({ name: e.text, sentiment: e.sentiment?.label || 'neutral' }));

  // Only include short, relevant org names — filter out Watson category strings
  const keyOrgs = entities
    .filter(e =>
      e.type === 'Organization' &&
      e.text.toLowerCase() !== company.toLowerCase() &&
      e.text.length < 40 &&
      e.relevance > 0.25
    )
    .slice(0, 4)
    .map(e => e.text);

  const keywordsWithSentiment = keywords.slice(0, 10).map(k => ({
    text: k.text,
    relevance: k.relevance,
    sentiment: k.sentiment?.label || 'neutral'
  }));

  return {
    company, score, priority, priorityColor, sentiment,
    sentimentScore: watsonResult.sentiment.document.score,
    signals,
    keywords: keywords.slice(0, 8).map(k => k.text),
    keywordsWithSentiment,
    concepts: concepts.slice(0, 6).map(c => c.text),
    keyPeople,
    keyOrgs,
    categories: categories.slice(0, 3).map(c => c.label),
    articles: allArticles.slice(0, 5).map(a => ({
      title: a.title, description: a.description,
      url: a.url, source: a.source.name, publishedAt: a.publishedAt
    })),
    articleCount: allArticles.length,
    analyzedAt: new Date().toISOString()
  };
}

// Single company analysis
app.get('/api/analyze/:company', async (req, res) => {
  const company = decodeURIComponent(req.params.company).trim();
  if (!company || company.length < 2) {
    return res.status(400).json({ error: 'Company name too short.' });
  }
  try {
    const result = await analyzeCompany(company);
    res.json(result);
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Multi-company comparison
app.get('/api/compare', async (req, res) => {
  const { companies } = req.query;
  if (!companies) {
    return res.status(400).json({ error: 'Provide companies as a comma-separated query param.' });
  }

  const companyList = companies
    .split(',')
    .map(c => c.trim())
    .filter(c => c.length > 1)
    .slice(0, 3);

  if (companyList.length < 2) {
    return res.status(400).json({ error: 'Provide at least two companies to compare.' });
  }

  try {
    const results = await Promise.all(
      companyList.map(company =>
        analyzeCompany(company).catch(e => ({
          company, error: e.message, score: 0, signals: [],
          priority: 'Cold', priorityColor: '#6b7280',
          sentiment: 'neutral', keywords: [], keywordsWithSentiment: [],
          keyPeople: [], keyOrgs: [], articles: [], articleCount: 0
        }))
      )
    );

    const ranked = [...results].sort((a, b) => b.score - a.score);

    res.json({
      results: ranked,
      winner: ranked[0].company,
      scoreDiff: ranked[0].score - ranked[ranked.length - 1].score,
      analyzedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('Comparison error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Salesforce OAuth token via REST — no SOAP
async function getSalesforceToken() {
    const params = new URLSearchParams({
      grant_type:    'password',
      client_id:     process.env.SF_CLIENT_ID,
      client_secret: process.env.SF_CLIENT_SECRET,
      username:      process.env.SF_USERNAME,
      password:      process.env.SF_PASSWORD
    });
  
    const res = await axios.post(
      'https://login.salesforce.com/services/oauth2/token',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return res.data;
  }

// Push scored account to Salesforce as a Lead
app.post('/api/push-to-salesforce', async (req, res) => {
  const { company, score, priority, sentiment, signals, keywords } = req.body;
  if (!company) return res.status(400).json({ error: 'Company name required.' });

  try {
    const { access_token, instance_url } = await getSalesforceToken();

    const signalSummary = signals?.length > 0
      ? signals.map(s => `${s.type.toUpperCase()} (${s.strength}): ${s.evidence.join(', ')}`).join('\n')
      : 'No buying signals detected';

    const leadData = {
      Company:     company,
      LastName:    company,
      FirstName:   'SalesRadar',
      LeadSource:  'Web',
      Rating:      priority === 'Hot' ? 'Hot' : priority === 'Warm' ? 'Warm' : 'Cold',
      Description: `SalesRadar Account Intelligence Report\n\nPurchase Intent Score: ${score}/100\nPriority: ${priority}\nSentiment: ${sentiment}\n\nBuying Signals:\n${signalSummary}\n\nKey Topics: ${keywords?.join(', ') || 'N/A'}\n\nPowered by IBM Watson NLU`,
      Status:      'Open - Not Contacted'
    };

    const sfRes = await axios.post(
      `${instance_url}/services/data/v57.0/sobjects/Lead`,
      leadData,
      {
        headers: {
          Authorization:  `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      leadId:        sfRes.data.id,
      message:       'Lead created in Salesforce',
      salesforceUrl: `${instance_url}/lightning/r/Lead/${sfRes.data.id}/view`
    });

  } catch (err) {
    console.error('Salesforce error:', err.response?.data || err.message);
    res.status(500).json({
      error: JSON.stringify(err.response?.data || err.message)
    });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`SalesRadar server running on port ${PORT}`));