# CMA Agent Finder

Find and rank the top real estate agents by zip code for CMA research. Enter a zip code, get the 10 best-matched agents based on experience, recent sales, star ratings, and reviews — ready to copy straight into Google Sheets.

## How It Works

1. Enter a 5-digit zip code
2. The tool pulls agent data from realtor.com (up to ~60 agents across 3 pages)
3. A weighted ranking algorithm scores each agent based on:
   - **Years of Experience** (30%) — prefers 20+ years, accepts 15+, falls back to 10+
   - **Properties Sold in Last 12 Months** (30%) — normalized against the top seller
   - **Star Rating** (20%) — 4.0 minimum, 5.0 stars = max score
   - **Number of Reviews** (15%) — normalized, with a penalty for high reviews + low sales
   - **Testimonials** (5%) — tracked but weighted low
4. Top 10 agents are displayed in a table
5. One-click copy to clipboard as tab-separated values — paste directly into Google Sheets

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no frameworks)
- **Backend:** Vercel Serverless Functions (Node 18+)
- **Data Source:** Realtor.com agent profiles
- **Hosting:** Vercel (free tier)

## Deploy Your Own

### Prerequisites
- A GitHub account
- A Vercel account (free) linked to your GitHub

### Steps

1. Fork or clone this repo
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Click "Deploy" — that's it
4. Your live URL will be `https://cma-agent-finder.vercel.app` (or similar)

No environment variables or API keys needed.

## Project Structure

```
cma-agent-finder/
├── api/
│   └── agents.js          # Vercel serverless function (data proxy)
├── public/
│   ├── index.html         # Main UI
│   ├── app.js             # Frontend application logic
│   └── scoring.js         # Agent ranking algorithm
├── package.json
├── vercel.json            # Vercel deploy config
├── .env.example
├── .gitignore
└── README.md
```

## Scoring Details

The ranking algorithm uses a balance between experience and activity. An agent with 20 years of experience and 30 recent sales will typically outrank one with 10 years and 50 reviews but only 10 sales. 

A penalty multiplier (0.7x) is applied to agents who have 50+ reviews but fewer than 15 recent sales — this catches agents who may have strong historical presence but aren't actively closing deals.

## Limitations

- **Agent emails** are often hidden on realtor.com (they use contact forms instead). Many email fields will show "N/A".
- **Data freshness** depends on realtor.com's own update cycle.
- If realtor.com changes their page structure, the parser may need updating.

## License

MIT
