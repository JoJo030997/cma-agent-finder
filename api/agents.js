export default async function handler(req, res) {
  // CORS headers
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

    const agents = [];
    const MAX_PAGES = 3;

    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = page === 1 
        ? `https://www.realtor.com/realestateagents/${zipCode}` 
        : `https://www.realtor.com/realestateagents/${zipCode}/pg-${page}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.realtor.com/'
        }
      });

      if (!response.ok) {
        if (response.status === 404 && page > 1) {
          break;
        }
        throw new Error(`Failed to fetch realtor.com data: ${response.statusText}`);
      }

      const html = await response.text();
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);

      if (!nextDataMatch || !nextDataMatch[1]) {
        if (page === 1) {
            throw new Error('__NEXT_DATA__ not found in the response. Realtor.com structure may have changed.');
        } else {
            break;
        }
      }

      let data;
      try {
        data = JSON.parse(nextDataMatch[1]);
      } catch (e) {
        throw new Error('Failed to parse __NEXT_DATA__ JSON');
      }

      const pageAgents = findAgentArray(data);
      if (!pageAgents || pageAgents.length === 0) {
        if (page === 1) {
            throw new Error('Could not find agent list in __NEXT_DATA__. Structure may have changed.');
        } else {
            break; // No agents on this page, probably end of results
        }
      }

      for (const rawAgent of pageAgents) {
        const getVal = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);
        
        let name = rawAgent.person_name || rawAgent.name || rawAgent.full_name || '';
        if (!name && rawAgent.first_name) {
            name = `${rawAgent.first_name} ${rawAgent.last_name || ''}`.trim();
        }

        let phone = '';
        if (Array.isArray(rawAgent.phones) && rawAgent.phones.length > 0) {
            phone = rawAgent.phones[0].number || rawAgent.phones[0].ext || '';
        } else if (rawAgent.phone_numbers && rawAgent.phone_numbers.length > 0) {
            phone = rawAgent.phone_numbers[0];
        } else if (rawAgent.office && rawAgent.office.phones && rawAgent.office.phones.length > 0) {
             phone = rawAgent.office.phones[0].number;
        }

        const email = rawAgent.email || null;
        
        const review_count = parseInt(rawAgent.review_count || rawAgent.ratings_count || 0, 10);
        const rating = parseFloat(rawAgent.rating || rawAgent.star_rating || rawAgent.agent_rating || 0);
        
        let recently_sold_count = parseInt(
            rawAgent.recently_sold_count || 
            getVal(rawAgent, 'recent_sales.count') || 
            getVal(rawAgent, 'sold_properties') || 0, 10);

        let experience_years = 0;
        const currentYear = new Date().getFullYear();
        if (rawAgent.first_year) {
            experience_years = currentYear - parseInt(rawAgent.first_year, 10);
        } else if (rawAgent.agent_active_start_year) {
            experience_years = currentYear - parseInt(rawAgent.agent_active_start_year, 10);
        } else if (rawAgent.experience_years) {
            experience_years = parseInt(rawAgent.experience_years, 10);
        }
        
        const testimonials_count = parseInt(rawAgent.recommendations_count || rawAgent.testimonials_count || 0, 10);

        if (name) {
             agents.push({
                name,
                phone,
                email,
                review_count,
                rating,
                recently_sold_count,
                experience_years,
                testimonials_count
            });
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

function findAgentArray(obj, depth = 0) {
  if (depth > 10 || !obj) return null;

  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
      if ('advertiser_id' in obj[0] || 'person_name' in obj[0] || 'agent_id' in obj[0] || 'office' in obj[0]) {
        return obj;
      }
    }
    for (const item of obj) {
      const found = findAgentArray(item, depth + 1);
      if (found) return found;
    }
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const found = findAgentArray(obj[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}
