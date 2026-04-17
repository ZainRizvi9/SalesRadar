# SalesRadar

Account intelligence platform that analyzes real-time news through IBM Watson NLU to extract buying signals and score B2B purchase intent.

[Live App](https://sales-radar-seven.vercel.app) · [Demo](https://youtu.be/Jel0U2JIpSE) · [GitHub](https://github.com/ZainRizvi9/SalesRadar)

---

## Overview

Sales teams spend hours researching accounts before a call; reading news, checking funding rounds, trying to figure out if a company is actually in a buying cycle. SalesRadar automates that research in seconds. Type a company name, and the platform fetches recent news, runs it through IBM Watson NLU, detects buying signals, and returns a scored account with the signals that drove the score and the articles that surfaced them.

Each analysis also supports one-click push to Salesforce CRM, creating a Lead record with the full intelligence report attached as a description.

---

## Features

**Single Account Analysis**
Type any company name and SalesRadar fetches recent news, analyzes it with Watson NLU, and returns a 0-100 purchase intent score with priority tier (Hot, Warm, Cool, Cold), sentiment analysis, buying signals, named entity extraction, and source articles.

**Real-Time Search**
Results populate automatically as you type; 700ms debounce triggers analysis without needing to press Enter.

**Account Comparison**
Compare two companies side by side. Both are analyzed in parallel and ranked by purchase intent score with a visual comparison bar and a top-priority recommendation.

**Push to Salesforce**
One-click export sends the scored account into Salesforce as a Lead with the full Watson intelligence report including signals, score, sentiment, and key topics attached as a description field.

---

## Detection Methodology

**Signal Detection**

Watson NLU extracts keywords, concepts, entities, categories, and document sentiment from the combined article text. SalesRadar then searches this output for terms mapped to five buying signal types.

| Signal | What it detects |
|--------|----------------|
| Market Expansion | expand, growth, scaling, new market, launch, international |
| Investment Activity | funding, raised, acquisition, IPO, billion, merger |
| Talent Acquisition | hiring, headcount, recruit, workforce, job openings |
| Technology Adoption | cloud, AI, digital transformation, automation, SaaS |
| Partnership Activity | partnership, deal, agreement, alliance, integration |

Each signal is rated Strong (3+ matching terms) or Moderate (1-2 matching terms).

**Scoring Formula**

- Strong signal: +22 points
- Moderate signal: +13 points
- Article volume: up to +15 points (2 pts per article, capped at 15)
- Positive sentiment: +12 points
- Negative sentiment: -8 points
- Final score clamped to 0-100

**Full Article Content**

Rather than analyzing just titles and descriptions, SalesRadar fetches the full body text of the top 3 articles and sends the combined corpus to Watson — giving the NLU engine significantly more signal to work with.

---

## Stack

**Frontend:** React, Vite, Axios, deployed on Vercel

**Backend:** Node.js, Express, deployed on Railway

**AI/NLP:** IBM Watson Natural Language Understanding

**Data:** NewsAPI

**CRM:** Salesforce REST API (OAuth 2.0 password flow)

---

## Running Locally

**Prerequisites:** Node.js 18+, IBM Watson NLU API key, NewsAPI key, Salesforce developer org

```bash
git clone https://github.com/ZainRizvi9/SalesRadar.git
cd SalesRadar
```

**Backend:**
```bash
cd server
npm install
```

Create `server/.env`:
```
WATSON_API_KEY=your_watson_api_key
WATSON_URL=your_watson_url
NEWS_API_KEY=your_newsapi_key
PORT=3001
SF_CLIENT_ID=your_salesforce_consumer_key
SF_CLIENT_SECRET=your_salesforce_consumer_secret
SF_USERNAME=your_salesforce_username
SF_PASSWORD=your_salesforce_password_plus_security_token
```

```bash
node index.js
```

**Frontend:**
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Disclaimer

Built for educational and research purposes. Respects NewsAPI rate limits and IBM Watson free tier usage (30,000 NLU items/month).
