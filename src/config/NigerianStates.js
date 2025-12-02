/**
 * Comprehensive list of all Nigerian states and major cities
 * Used for restaurant and hotel location searches
 */

const NIGERIAN_STATES = [
  { name: 'Abia', capital: 'Umuahia', majorCity: 'Aba', region: 'South East' },
  { name: 'Adamawa', capital: 'Yola', majorCity: 'Yola', region: 'North East' },
  { name: 'Akwa Ibom', capital: 'Uyo', majorCity: 'Uyo', region: 'South South' },
  { name: 'Anambra', capital: 'Awka', majorCity: 'Onitsha', region: 'South East' },
  { name: 'Bauchi', capital: 'Bauchi', majorCity: 'Bauchi', region: 'North East' },
  { name: 'Bayelsa', capital: 'Yenagoa', majorCity: 'Yenagoa', region: 'South South' },
  { name: 'Benue', capital: 'Makurdi', majorCity: 'Makurdi', region: 'North Central' },
  { name: 'Borno', capital: 'Maiduguri', majorCity: 'Maiduguri', region: 'North East' },
  { name: 'Cross River', capital: 'Calabar', majorCity: 'Calabar', region: 'South South' },
  { name: 'Delta', capital: 'Asaba', majorCity: 'Warri', region: 'South South' },
  { name: 'Ebonyi', capital: 'Abakaliki', majorCity: 'Abakaliki', region: 'South East' },
  { name: 'Edo', capital: 'Benin City', majorCity: 'Benin City', region: 'South South' },
  { name: 'Ekiti', capital: 'Ado Ekiti', majorCity: 'Ado Ekiti', region: 'South West' },
  { name: 'Enugu', capital: 'Enugu', majorCity: 'Enugu', region: 'South East' },
  { name: 'FCT', capital: 'Abuja', majorCity: 'Abuja', region: 'North Central' },
  { name: 'Gombe', capital: 'Gombe', majorCity: 'Gombe', region: 'North East' },
  { name: 'Imo', capital: 'Owerri', majorCity: 'Owerri', region: 'South East' },
  { name: 'Jigawa', capital: 'Dutse', majorCity: 'Dutse', region: 'North West' },
  { name: 'Kaduna', capital: 'Kaduna', majorCity: 'Kaduna', region: 'North West' },
  { name: 'Kano', capital: 'Kano', majorCity: 'Kano', region: 'North West' },
  { name: 'Katsina', capital: 'Katsina', majorCity: 'Katsina', region: 'North West' },
  { name: 'Kebbi', capital: 'Birnin Kebbi', majorCity: 'Birnin Kebbi', region: 'North West' },
  { name: 'Kogi', capital: 'Lokoja', majorCity: 'Lokoja', region: 'North Central' },
  { name: 'Kwara', capital: 'Ilorin', majorCity: 'Ilorin', region: 'North Central' },
  { name: 'Lagos', capital: 'Ikeja', majorCity: 'Lagos', region: 'South West' },
  { name: 'Nasarawa', capital: 'Lafia', majorCity: 'Lafia', region: 'North Central' },
  { name: 'Niger', capital: 'Minna', majorCity: 'Minna', region: 'North Central' },
  { name: 'Ogun', capital: 'Abeokuta', majorCity: 'Abeokuta', region: 'South West' },
  { name: 'Ondo', capital: 'Akure', majorCity: 'Akure', region: 'South West' },
  { name: 'Osun', capital: 'Osogbo', majorCity: 'Osogbo', region: 'South West' },
  { name: 'Oyo', capital: 'Ibadan', majorCity: 'Ibadan', region: 'South West' },
  { name: 'Plateau', capital: 'Jos', majorCity: 'Jos', region: 'North Central' },
  { name: 'Rivers', capital: 'Port Harcourt', majorCity: 'Port Harcourt', region: 'South South' },
  { name: 'Sokoto', capital: 'Sokoto', majorCity: 'Sokoto', region: 'North West' },
  { name: 'Taraba', capital: 'Jalingo', majorCity: 'Jalingo', region: 'North East' },
  { name: 'Yobe', capital: 'Damaturu', majorCity: 'Damaturu', region: 'North East' },
  { name: 'Zamfara', capital: 'Gusau', majorCity: 'Gusau', region: 'North West' }
];

/**
 * Get formatted inline keyboard for state selection
 * @param {string} type - 'restaurant' or 'hotel'
 * @param {number} page - Page number (0-indexed)
 * @returns {Object} Inline keyboard markup
 */
function getStateSelectionKeyboard(type = 'restaurant', page = 0) {
  const itemsPerPage = 12;
  const startIdx = page * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, NIGERIAN_STATES.length);
  const states = NIGERIAN_STATES.slice(startIdx, endIdx);
  
  // Group states into rows of 3
  const buttons = [];
  for (let i = 0; i < states.length; i += 3) {
    const row = states.slice(i, i + 3).map(state => ({
      text: state.name === 'FCT' ? '🏛️ Abuja (FCT)' : `📍 ${state.name}`,
      callback_data: `${type}_state_${state.name.toLowerCase().replace(/\s+/g, '_')}`
    }));
    buttons.push(row);
  }
  
  // Add navigation buttons
  const navRow = [];
  if (page > 0) {
    navRow.push({ text: '⬅️ Previous', callback_data: `${type}_states_page_${page - 1}` });
  }
  navRow.push({ 
    text: `📄 ${page + 1}/${Math.ceil(NIGERIAN_STATES.length / itemsPerPage)}`, 
    callback_data: 'page_info' 
  });
  if (endIdx < NIGERIAN_STATES.length) {
    navRow.push({ text: 'Next ➡️', callback_data: `${type}_states_page_${page + 1}` });
  }
  buttons.push(navRow);
  
  // Add back button
  buttons.push([{ text: '🔙 Back to Menu', callback_data: 'main_menu' }]);
  
  return { inline_keyboard: buttons };
}

/**
 * Get state info by name
 * @param {string} stateName - State name (case-insensitive)
 * @returns {Object|null} State object or null
 */
function getStateByName(stateName) {
  const normalized = stateName.toLowerCase().trim();
  
  // Handle special cases
  if (normalized === 'abuja' || normalized === 'fct') {
    return NIGERIAN_STATES.find(s => s.name === 'FCT');
  }
  
  if (normalized === 'port harcourt' || normalized === 'portharcourt') {
    return NIGERIAN_STATES.find(s => s.name === 'Rivers');
  }
  
  if (normalized === 'benin' || normalized === 'benin city') {
    return NIGERIAN_STATES.find(s => s.name === 'Edo');
  }
  
  // Try exact match first
  let state = NIGERIAN_STATES.find(s => 
    s.name.toLowerCase() === normalized ||
    s.capital.toLowerCase() === normalized ||
    s.majorCity.toLowerCase() === normalized
  );
  
  // Try partial match
  if (!state) {
    state = NIGERIAN_STATES.find(s => 
      s.name.toLowerCase().includes(normalized) ||
      s.capital.toLowerCase().includes(normalized) ||
      s.majorCity.toLowerCase().includes(normalized)
    );
  }
  
  return state || null;
}

/**
 * Get all states by region
 * @param {string} region - Region name
 * @returns {Array} Array of state objects
 */
function getStatesByRegion(region) {
  return NIGERIAN_STATES.filter(s => s.region === region);
}

/**
 * Get search location for a state (prioritizes major city)
 * @param {string} stateName - State name
 * @returns {string} Location string for Google Places search
 */
function getSearchLocation(stateName) {
  const state = getStateByName(stateName);
  if (!state) return stateName;
  
  // For searches, use major city as it typically has more businesses
  return state.majorCity;
}

/**
 * Get all state names for batch operations
 * @returns {Array} Array of state names
 */
function getAllStateNames() {
  return NIGERIAN_STATES.map(s => s.name);
}

/**
 * Get regions list
 * @returns {Array} Unique regions
 */
function getRegions() {
  return [...new Set(NIGERIAN_STATES.map(s => s.region))];
}

module.exports = {
  NIGERIAN_STATES,
  getStateSelectionKeyboard,
  getStateByName,
  getStatesByRegion,
  getSearchLocation,
  getAllStateNames,
  getRegions
};
