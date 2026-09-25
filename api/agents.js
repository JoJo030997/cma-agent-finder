export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { zipCode } = req.query;

    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return res.status(400).json({ success: false, error: 'Invalid or missing zip code. Must be 5 digits.' });
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'API key not configured. Add RAPIDAPI_KEY to your Vercel environment variables.'
      });
    }

    const agents = [];
    const PAGES_TO_FETCH = 3;
    const PER_PAGE = 20;

    for (let page = 0; page < PAGES_TO_FETCH; page++) {
      const offset = page * PER_PAGE;

      const url = `https://realtor16.p.rapidapi.com/agents/list?postal_code=${zipCode}&offset=${offset}&limit=${PER_PAGE}`;

      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'realtor16.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('RapidAPI rate limit hit, returning what we have so far');
          break;
        }
        if (page === 0) {
          const errorText = await response.text();
          throw new Error(`API request failed (${response.status}): ${errorText.substring(0, 200)}`);
        }
        break;
      }

      const data = await response.json();

      const agentList = findAgentList(data);
      if (!agentList || agentList.length === 0) {
        if (page === 0 && agents.length === 0) {
          return res.status(200).json({
            success: true,
            agents: [],
            total_found: 0,
            zip_code: zipCode
          });
        }
        break;
      }

      for (const raw of agentList) {
        const agent = extractAgent(raw);
        if (agent.name) {
          agents.push(agent);
        }
      }
    }

    return res.status(200).json({
      success: true,
      agents,
      total_found: agents.length,
      zip_code: zipCode
    });

  } catch (error) {
    console.error('Agent fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An unexpected error occurred while fetching agents.'
    });
  }
}

function extractAgent(raw) {
  const currentYear = new Date().getFullYear();

  let name = '';
  if (raw.person_name) {
    name = raw.person_name;
  } else if (raw.full_name) {
    name = raw.full_name;
  } else if (raw.first_name) {
    name = `${raw.first_name} ${raw.last_name || ''}`.trim();
  } else if (raw.name) {
    name = raw.name;
  }

  let phone = '';
  if (raw.phones && Array.isArray(raw.phones) && raw.phones.length > 0) {
    phone = raw.phones[0].number || raw.phones[0].ext || '';
  } else if (raw.phone) {
    phone = raw.phone;
  } else if (raw.office && raw.office.phones && raw.office.phones.length > 0) {
    phone = raw.office.phones[0].number || '';
  }

  const email = raw.email || null;

  const review_count = parseInt(
    raw.review_count || raw.ratings_count || raw.agent_rating?.review_count || 0, 10
  );

  const rating = parseFloat(
    raw.rating || raw.agent_rating?.recommended_count_rating ||
    raw.agent_rating?.rating || raw.star_rating || 0
  );

  let recently_sold_count = 0;
  if (raw.recently_sold && raw.recently_sold.count !== undefined) {
    recently_sold_count = parseInt(raw.recently_sold.count, 10);
  } else if (raw.recently_sold_count !== undefined) {
    recently_sold_count = parseInt(raw.recently_sold_count, 10);
  } else if (raw.sale_count_12_months !== undefined) {
    recently_sold_count = parseInt(raw.sale_count_12_months, 10);
  }

  let experience_years = 0;
  if (raw.first_year) {
    experience_years = currentYear - parseInt(raw.first_year, 10);
  } else if (raw.agent_active_start_year) {
    experience_years = currentYear - parseInt(raw.agent_active_start_year, 10);
  } else if (raw.experience_years) {
    experience_years = parseInt(raw.experience_years, 10);
  }

  const testimonials_count = parseInt(
    raw.recommendations_count || raw.testimonials_count || 0, 10
  );

  return {
    name,
    phone,
    email,
    review_count,
    rating,
    recently_sold_count,
    experience_years,
    testimonials_count
  };
}

function findAgentList(data) {
  if (!data) return null;

  if (data.agents && Array.isArray(data.agents)) return data.agents;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.results && Array.isArray(data.results)) return data.results;

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      const first = data[0];
      if ('person_name' in first || 'full_name' in first || 'advertiser_id' in first || 'office' in first) {
        return data;
      }
    }
  }

  if (typeof data === 'object') {
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
        const first = val[0];
        if ('person_name' in first || 'full_name' in first || 'advertiser_id' in first || 'agent_id' in first) {
          return val;
        }
      }
    }

    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
        const found = findAgentList(data[key]);
        if (found) return found;
      }
    }
  }

  return null;
}
