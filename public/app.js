document.addEventListener('DOMContentLoaded', () => {
  const zipInput = document.getElementById('zipInput');
  const searchBtn = document.getElementById('searchBtn');
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const emptyState = document.getElementById('emptyState');
  const resultsSection = document.getElementById('resultsSection');
  const resultsHeader = document.getElementById('resultsHeader');
  const agentsTableBody = document.getElementById('agentsTableBody');
  const copyBtn = document.getElementById('copyBtn');
  const copyBtnText = document.getElementById('copyBtnText');

  let currentAgents = [];

  function hideAllStates() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    resultsSection.classList.add('hidden');
    copyBtn.classList.add('hidden');
  }

  function getStarString(rating) {
    const numStars = Math.round(rating);
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += i < numStars ? '★' : '☆';
    }
    return `<span class="star-rating">${stars}</span> (${rating.toFixed(1)})`;
  }

  function renderTable(agents, zipCode, totalCount) {
    agentsTableBody.innerHTML = '';
    
    if (agents.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    resultsHeader.textContent = `${agents.length} of ${totalCount} Agents found for Zip ${zipCode}`;
    
    agents.forEach(agent => {
      const tr = document.createElement('tr');
      
      const nameTd = document.createElement('td');
      nameTd.textContent = agent.name || 'N/A';
      
      const numberTd = document.createElement('td');
      numberTd.textContent = agent.phone || 'N/A';
      
      const emailTd = document.createElement('td');
      emailTd.textContent = agent.email || 'N/A';
      
      const reviewsTd = document.createElement('td');
      reviewsTd.textContent = agent.reviewCount || '0';
      
      const starsTd = document.createElement('td');
      starsTd.innerHTML = getStarString(parseFloat(agent.starRating) || 0);
      
      const salesTd = document.createElement('td');
      salesTd.textContent = agent.recentSales || '0';
      
      const expTd = document.createElement('td');
      expTd.textContent = agent.yearsExperience || '0';
      
      const testTd = document.createElement('td');
      testTd.textContent = agent.testimonialCount || '0';
      
      tr.appendChild(nameTd);
      tr.appendChild(numberTd);
      tr.appendChild(emailTd);
      tr.appendChild(reviewsTd);
      tr.appendChild(starsTd);
      tr.appendChild(salesTd);
      tr.appendChild(expTd);
      tr.appendChild(testTd);
      
      agentsTableBody.appendChild(tr);
    });

    resultsSection.classList.remove('hidden');
    copyBtn.classList.remove('hidden');
  }

  async function searchAgents() {
    const zipCode = zipInput.value.trim();
    
    if (!/^\d{5}$/.test(zipCode)) {
      hideAllStates();
      errorMessage.textContent = 'Please enter a valid 5-digit zip code.';
      errorState.classList.remove('hidden');
      return;
    }

    hideAllStates();
    loadingState.classList.remove('hidden');

    try {
      const response = await fetch(`/api/agents?zipCode=${encodeURIComponent(zipCode)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unknown error from API');
      }

      const rawAgents = data.agents || [];

      // Map snake_case backend fields to camelCase frontend fields
      const allAgents = rawAgents.map(a => ({
        name: a.name || '',
        phone: a.phone || '',
        email: a.email || null,
        reviewCount: a.review_count || 0,
        starRating: a.rating || 0,
        recentSales: a.recently_sold_count || 0,
        yearsExperience: a.experience_years || 0,
        testimonialCount: a.testimonials_count || 0
      }));
      
      currentAgents = window.rankAgents(allAgents);
      
      hideAllStates();
      renderTable(currentAgents, zipCode, allAgents.length);
      
    } catch (error) {
      console.error('Error fetching agents:', error);
      hideAllStates();
      errorMessage.textContent = "Couldn't fetch agents for this zip code. Try again or check the zip code.";
      errorState.classList.remove('hidden');
    }
  }

  function handleCopy() {
    if (currentAgents.length === 0) return;

    // Build TSV
    const headers = [
      "Agent Name", "Agent Number", "Agent Email", "# Of Reviews", 
      "How Many Stars?", "Properties sold within past 12 months", 
      "Years Of Experience", "# Of Testimonials"
    ];

    const tsvRows = [headers.join('\t')];

    currentAgents.forEach(agent => {
      const rating = parseFloat(agent.starRating) || 0;
      const numStars = Math.round(rating);
      let stars = '';
      for (let i = 0; i < 5; i++) {
        stars += i < numStars ? '★' : '☆';
      }
      const starStr = `${stars} (${rating.toFixed(1)})`;

      const row = [
        agent.name || 'N/A',
        agent.phone || 'N/A',
        agent.email || 'N/A',
        agent.reviewCount || '0',
        starStr,
        agent.recentSales || '0',
        agent.yearsExperience || '0',
        agent.testimonialCount || '0'
      ];
      tsvRows.push(row.join('\t'));
    });

    const tsvString = tsvRows.join('\n');

    navigator.clipboard.writeText(tsvString)
      .then(() => {
        const originalText = copyBtnText.textContent;
        copyBtnText.textContent = 'Copied!';
        copyBtn.style.backgroundColor = 'var(--accent-green-hover)';
        
        setTimeout(() => {
          copyBtnText.textContent = originalText;
          copyBtn.style.backgroundColor = '';
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard.');
      });
  }

  // Event Listeners
  searchBtn.addEventListener('click', searchAgents);
  
  zipInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchAgents();
    }
  });

  copyBtn.addEventListener('click', handleCopy);
});
