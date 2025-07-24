// DOM Elements
const form = document.getElementById('journey-form');
const resultSection = document.getElementById('result');
const generateBtn = document.querySelector('.generate-btn');
const fromInput = document.getElementById('from');
const toInput = document.getElementById('to');
const fromSuggestions = document.getElementById('from-suggestions');
const toSuggestions = document.getElementById('to-suggestions');

// Global variables
let selectedFromStation = null;
let selectedToStation = null;
let currentHighlighted = -1;
let debounceTimeout = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    animateOnScroll();
});

// Event Listeners
function initializeEventListeners() {
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
    
    // Autocomplete for "From" input
    fromInput.addEventListener('input', (e) => handleInputChange(e, 'from'));
    fromInput.addEventListener('keydown', (e) => handleKeyDown(e, 'from'));
    fromInput.addEventListener('blur', () => setTimeout(() => hideSuggestions('from'), 200));
    fromInput.addEventListener('focus', (e) => {
        if (e.target.value.length >= 2) {
            handleInputChange(e, 'from');
        }
    });
    
    // Autocomplete for "To" input
    toInput.addEventListener('input', (e) => handleInputChange(e, 'to'));
    toInput.addEventListener('keydown', (e) => handleKeyDown(e, 'to'));
    toInput.addEventListener('blur', () => setTimeout(() => hideSuggestions('to'), 200));
    toInput.addEventListener('focus', (e) => {
        if (e.target.value.length >= 2) {
            handleInputChange(e, 'to');
        }
    });
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            hideSuggestions('from');
            hideSuggestions('to');
        }
    });
    
    // Location buttons
    document.querySelectorAll('.location-btn').forEach(btn => {
        btn.addEventListener('click', handleLocationClick);
    });
}

// Handle input changes with debouncing
function handleInputChange(e, type) {
    const value = e.target.value.trim();
    
    // Clear previous timeout
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }
    
    if (value.length < 2) {
        hideSuggestions(type);
        return;
    }
    
    // Show loading state
    e.target.classList.add('loading');
    
    // Debounce API calls
    debounceTimeout = setTimeout(() => {
        searchStations(value, type);
    }, 300);
}

// Handle keyboard navigation
function handleKeyDown(e, type) {
    const suggestionsList = type === 'from' ? fromSuggestions : toSuggestions;
    const suggestions = suggestionsList.querySelectorAll('.suggestion-item');
    
    if (suggestions.length === 0) return;
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            currentHighlighted = Math.min(currentHighlighted + 1, suggestions.length - 1);
            updateHighlight(suggestions);
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            currentHighlighted = Math.max(currentHighlighted - 1, -1);
            updateHighlight(suggestions);
            break;
            
        case 'Enter':
            e.preventDefault();
            if (currentHighlighted >= 0) {
                selectSuggestion(suggestions[currentHighlighted], type);
            }
            break;
            
        case 'Escape':
            hideSuggestions(type);
            break;
    }
}

// Update highlight on keyboard navigation
function updateHighlight(suggestions) {
    suggestions.forEach((item, index) => {
        item.classList.toggle('highlighted', index === currentHighlighted);
    });
}

// Search stations using new Places API
async function searchStations(query, type) {
    try {
        const encodedQuery = encodeURIComponent(query);
        const response = await fetch(`https://places-backend.uzwil-to-tokyo.ch/places?search=${encodedQuery}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Remove loading state
        const input = type === 'from' ? fromInput : toInput;
        input.classList.remove('loading');
        
        if (data.data && data.data.places && data.data.places.length > 0) {
            displaySuggestions(data.data.places, type);
        } else {
            showNoResults(type);
        }
        
    } catch (error) {
        console.error('Error fetching stations:', error);
        
        // Remove loading state
        const input = type === 'from' ? fromInput : toInput;
        input.classList.remove('loading');
        
        showError(type, 'Failed to fetch stations. Please try again.');
    }
}

// Display suggestions in the dropdown
function displaySuggestions(places, type) {
    const suggestionsList = type === 'from' ? fromSuggestions : toSuggestions;
    currentHighlighted = -1;
    
    // Clear existing suggestions
    suggestionsList.innerHTML = '';
    
    if (places.length === 0) {
        showNoResults(type);
        return;
    }
    
    // Create suggestion items
    places.forEach((place, index) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `<span class="station-name">${escapeHtml(place.name)}</span>`;
        item.dataset.id = place.id;
        item.dataset.name = place.name;
        
        // Add click event with proper event handling
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectSuggestion(item, type);
        });
        
        // Add mousedown event to prevent blur from firing before click
        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
        
        suggestionsList.appendChild(item);
    });
    
    // Show suggestions
    suggestionsList.style.display = 'block';
}

// Show no results message
function showNoResults(type) {
    const suggestionsList = type === 'from' ? fromSuggestions : toSuggestions;
    suggestionsList.innerHTML = '<div class="loading-suggestion">No stations found</div>';
    suggestionsList.style.display = 'block';
}

// Show error message
function showError(type, message) {
    const suggestionsList = type === 'from' ? fromSuggestions : toSuggestions;
    suggestionsList.innerHTML = `<div class="loading-suggestion">${escapeHtml(message)}</div>`;
    suggestionsList.style.display = 'block';
}

// Select a suggestion
function selectSuggestion(item, type) {
    const input = type === 'from' ? fromInput : toInput;
    const stationData = {
        id: item.dataset.id,
        name: item.dataset.name
    };
    
    // Clear any existing timeout that might hide suggestions
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }
    
    // Update input value - completely overwrite existing content
    input.value = stationData.name;
    
    // Store selected station
    if (type === 'from') {
        selectedFromStation = stationData;
    } else {
        selectedToStation = stationData;
    }
    
    // Hide suggestions immediately
    hideSuggestions(type);
    
    // Remove loading state if any
    input.classList.remove('loading');
    
    // Optional: Remove focus from input to close any mobile keyboards
    input.blur();
}

// Hide suggestions
function hideSuggestions(type) {
    const suggestionsList = type === 'from' ? fromSuggestions : toSuggestions;
    suggestionsList.style.display = 'none';
    currentHighlighted = -1;
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!selectedFromStation || !selectedToStation) {
        showToast('Please select both departure and destination stations from the suggestions.');
        return;
    }
    
    if (selectedFromStation.id === selectedToStation.id) {
        showToast('Departure and destination stations cannot be the same.');
        return;
    }
    
    // Show loading state
    generateBtn.classList.add('loading');
    generateBtn.disabled = true;
    
    // Simulate processing time for better UX
    setTimeout(() => {
        const deeplink = generateSBBDeeplink();
        displayDeeplinkResult(deeplink);
        
        // Remove loading state
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
    }, 500);
}

// Display deeplink result
function displayDeeplinkResult(deeplink) {
    const journeyFrom = document.getElementById('journey-from');
    const journeyTo = document.getElementById('journey-to');
    
    journeyFrom.textContent = selectedFromStation.name;
    journeyTo.textContent = selectedToStation.name;
    
    // Add the deeplink display
    const journeyInfo = document.querySelector('.journey-info');
    
    // Remove existing deeplink if any
    const existingDeeplink = journeyInfo.querySelector('.deeplink-container');
    if (existingDeeplink) {
        existingDeeplink.remove();
    }
    
    // Create deeplink container
    const deeplinkContainer = document.createElement('div');
    deeplinkContainer.className = 'deeplink-container';
    deeplinkContainer.innerHTML = `
        <p><strong>Generated Deeplink:</strong></p>
        <div class="result-container">
            <input type="text" id="generated-deeplink" value="${deeplink}" readonly>
            <button id="copy-deeplink-btn" class="copy-button">Copy</button>
        </div>
        <div class="deeplink-actions">
            <a href="${deeplink}" target="_blank" class="deeplink-button">Open in SBB App</a>
        </div>
    `;
    
    journeyInfo.appendChild(deeplinkContainer);
    
    // Add copy functionality
    const copyBtn = document.getElementById('copy-deeplink-btn');
    copyBtn.addEventListener('click', copyDeeplinkToClipboard);
    
    resultSection.style.display = 'block';
    
    // Smooth scroll to result
    resultSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
    });
    
    // Add animation
    resultSection.style.opacity = '0';
    resultSection.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        resultSection.style.transition = 'all 0.3s ease';
        resultSection.style.opacity = '1';
        resultSection.style.transform = 'translateY(0)';
    }, 100);
}

// ...existing code...

// Toast notification
function showToast(message, type = 'error') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Determine background color based on type
    const backgroundColor = type === 'success' ? '#28a745' : '#dc3545';
    
    // Add toast styles
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: backgroundColor,
        color: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '5px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
        zIndex: '10000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px'
    });
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// Animate elements on scroll
function animateOnScroll() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe feature cards
    document.querySelectorAll('.feature').forEach(feature => {
        feature.style.opacity = '0';
        feature.style.transform = 'translateY(30px)';
        feature.style.transition = 'all 0.6s ease';
        observer.observe(feature);
    });
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle location button click
function handleLocationClick(e) {
    const targetField = e.target.getAttribute('data-target');
    const input = targetField === 'from' ? fromInput : toInput;
    
    // Set the special value
    input.value = 'Aktueller Standort';
    
    // Store the special location data
    const locationData = {
        id: 'current_location',
        name: 'Aktueller Standort'
    };
    
    if (targetField === 'from') {
        selectedFromStation = locationData;
    } else {
        selectedToStation = locationData;
    }
    
    // Hide any open suggestions
    hideSuggestions(targetField);
    
    // Remove loading state if any
    input.classList.remove('loading');
    
    // Add visual feedback
    input.style.background = '#e7f3ff';
    setTimeout(() => {
        input.style.background = '';
    }, 300);
    
    // Show toast notification
    showToast(`Current location set for ${targetField === 'from' ? 'departure' : 'destination'}`, 'success');
}

// Generate SBB mobile app deeplink
function generateSBBDeeplink() {
    // Handle special case for current location
    const fromParam = selectedFromStation.name === 'Aktueller Standort' 
        ? 'CURRENT_POSITION' 
        : encodeURIComponent(selectedFromStation.name);
    
    const toParam = selectedToStation.name === 'Aktueller Standort' 
        ? 'CURRENT_POSITION' 
        : encodeURIComponent(selectedToStation.name);
    
    // Construct the deeplink URL
    const baseUrl = 'https://app.sbbmobile.ch/timetable';
    const deeplink = `${baseUrl}?from=${fromParam}&to=${toParam}`;
    
    return deeplink;
}

// Copy deeplink to clipboard
async function copyDeeplinkToClipboard() {
    const deeplinkInput = document.getElementById('generated-deeplink');
    const copyBtn = document.getElementById('copy-deeplink-btn');
    
    try {
        await navigator.clipboard.writeText(deeplinkInput.value);
        
        // Update button state
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        
        // Reset after 2 seconds
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('copied');
        }, 2000);
        
        // Show toast notification
        showToast('Deeplink copied to clipboard!', 'success');
        
    } catch (err) {
        // Fallback for older browsers
        deeplinkInput.select();
        document.execCommand('copy');
        showToast('Deeplink copied to clipboard!', 'success');
    }
}
