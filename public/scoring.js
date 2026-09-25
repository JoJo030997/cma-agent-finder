/**
 * Ranks a pool of real estate agents based on predefined criteria.
 * @param {Array} agents - Array of agent objects
 * @returns {Array} Top 10 ranked agents
 */
function rankAgents(agents) {
  if (!Array.isArray(agents) || agents.length === 0) {
    return [];
  }

  // 1. Pre-filter: Remove agents below 4.0 stars
  let filtered = agents.filter(agent => {
    const stars = parseFloat(agent.starRating) || 0;
    return stars >= 4.0;
  });

  if (filtered.length === 0) return [];

  // 2. Check if enough agents (10+) have 15+ years experience
  const exp15Plus = filtered.filter(a => (parseInt(a.yearsExperience) || 0) >= 15);
  if (exp15Plus.length >= 10) {
    filtered = exp15Plus;
  } else {
    const exp10Plus = filtered.filter(a => (parseInt(a.yearsExperience) || 0) >= 10);
    if (exp10Plus.length >= 10) {
      filtered = exp10Plus;
    }
    // If still not enough, keep the current 'filtered' list
  }

  // Calculate max values for normalization
  let maxSales = 0;
  let maxReviews = 0;
  let maxTestimonials = 0;

  for (const agent of filtered) {
    const sales = parseInt(agent.recentSales) || 0;
    const reviews = parseInt(agent.reviewCount) || 0;
    const testimonials = parseInt(agent.testimonialCount) || 0;

    if (sales > maxSales) maxSales = sales;
    if (reviews > maxReviews) maxReviews = reviews;
    if (testimonials > maxTestimonials) maxTestimonials = testimonials;
  }

  // 3. Score each agent
  filtered.forEach(agent => {
    const exp = parseInt(agent.yearsExperience) || 0;
    const sales = parseInt(agent.recentSales) || 0;
    const stars = parseFloat(agent.starRating) || 0;
    const reviews = parseInt(agent.reviewCount) || 0;
    const testimonials = parseInt(agent.testimonialCount) || 0;

    let expScore = 0;
    if (exp >= 20) expScore = 1.0;
    else if (exp >= 15) expScore = 0.75;
    else if (exp >= 10) expScore = 0.4;
    else expScore = 0.1;

    let salesScore = maxSales > 0 ? (sales / maxSales) : 0;
    
    let starsScore = 0;
    if (stars >= 5.0) starsScore = 1.0;
    else if (stars >= 4.5) starsScore = 0.85;
    else if (stars >= 4.0) starsScore = 0.7;
    else starsScore = 0.3; // Should be impossible due to pre-filter, but safe to include

    let reviewsScore = maxReviews > 0 ? (reviews / maxReviews) : 0;
    let testimonialsScore = maxTestimonials > 0 ? (testimonials / maxTestimonials) : 0;

    let totalScore = (expScore * 0.30) + 
                     (salesScore * 0.30) + 
                     (starsScore * 0.20) + 
                     (reviewsScore * 0.15) + 
                     (testimonialsScore * 0.05);

    // 4. Balance penalty
    if (reviews > 50 && sales < 15) {
      totalScore *= 0.7;
    }

    agent._score = totalScore;
  });

  // 5. Sort by score descending
  filtered.sort((a, b) => b._score - a._score);

  // 6. Return top 10
  return filtered.slice(0, 10);
}

// Export globally
window.rankAgents = rankAgents;
