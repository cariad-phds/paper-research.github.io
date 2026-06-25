let allPapers = [];
let paperTiles = [];
let currentPage = 1;
const papersPerPage = 10;
let filteredPapers = [];
let currentSort = 'year-desc';

document.addEventListener('DOMContentLoaded', () => {
    // Google Sheets URL - convert pubhtml to CSV format
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT2WZPl25mEBmlGvrpkX5dKWOuhizH5bHsoAIzNOwMusbFBH5Rn2_seS2uqUXWeD1g1VVylEiMC5QuQ/pub?output=csv';
    
    // Fetch and process papers from Google Sheets
    fetch(sheetUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch Google Sheets data');
            }
            return response.text();
        })
        .then(csvData => {
            allPapers = parseCSV(csvData);
            
            // Extract unique values for all filters
            const uniqueTags = extractUniqueTags(allPapers);
            const uniqueYears = extractUniqueYears(allPapers);
            const uniqueFirstAuthors = extractUniqueFirstAuthors(allPapers);
            
            // Populate all filter dropdowns
            populateFieldFilter(uniqueTags);
            populateYearFilter(uniqueYears);
            populateAuthorFilter(uniqueFirstAuthors);

            // Wire up the sort control
            setupSortControl();
            
            // Restore page from sessionStorage if available
            const savedPage = sessionStorage.getItem('currentPage');
            if (savedPage) {
                currentPage = parseInt(savedPage, 10);
            }
            
            // Display all papers initially
            filteredPapers = allPapers;
            displayPapers(filteredPapers);
        })
        .catch(error => console.error('Error fetching Google Sheets data:', error));
});

function closeAllDropdowns(except) {
    document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
        if (dropdown === except) return;
        dropdown.classList.remove('active');
        const content = dropdown.querySelector('.dropdown-content');
        if (content) {
            content.classList.remove('show');
        }
    });
}

function setupSortControl() {
    const dropdownContent = document.getElementById('sort-dropdown-content');
    const dropdownButton = document.getElementById('sort-dropdown-button');
    const dropdownText = document.getElementById('sort-dropdown-text');
    if (!dropdownContent || !dropdownButton) return;

    const customDropdown = dropdownButton.closest('.custom-dropdown');

    const sortOptions = [
        { value: 'year-desc', label: 'Year ↓' },
        { value: 'year-asc', label: 'Year ↑' }
    ];

    // Build the options (single-select, mutually exclusive)
    dropdownContent.innerHTML = '';
    sortOptions.forEach(option => {
        const optionElement = document.createElement('label');
        optionElement.className = 'dropdown-option';
        const labelSpan = document.createElement('span');
        labelSpan.textContent = option.label;
        optionElement.appendChild(labelSpan);
        optionElement.addEventListener('click', function(e) {
            e.stopPropagation();
            currentSort = option.value;
            dropdownText.textContent = option.label;
            // Close the dropdown
            dropdownContent.classList.remove('show');
            customDropdown.classList.remove('active');
            // Reset to page 1 when sort order changes
            currentPage = 1;
            sessionStorage.removeItem('currentPage');
            displayPapers(filteredPapers);
        });
        dropdownContent.appendChild(optionElement);
    });

    // Set initial button text based on the default sort
    const initial = sortOptions.find(o => o.value === currentSort);
    if (initial) {
        dropdownText.textContent = initial.label;
    }

    // Toggle dropdown on button click
    dropdownButton.addEventListener('click', function(e) {
        e.stopPropagation();
        // Close any other open dropdowns first
        closeAllDropdowns(customDropdown);
        const isOpen = dropdownContent.classList.toggle('show');
        if (isOpen) {
            customDropdown.classList.add('active');
        } else {
            customDropdown.classList.remove('active');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-dropdown')) {
            dropdownContent.classList.remove('show');
            customDropdown.classList.remove('active');
        }
    });
}

function sortPapers(papers) {
    const getYear = paper => {
        const year = parseInt(paper.Year || paper.year || paper.YEAR || '', 10);
        return isNaN(year) ? null : year;
    };

    // Copy to avoid mutating the source array
    return papers.slice().sort((a, b) => {
        const yearA = getYear(a);
        const yearB = getYear(b);

        // Papers without a year always go to the end
        if (yearA === null && yearB === null) return 0;
        if (yearA === null) return 1;
        if (yearB === null) return -1;

        return currentSort === 'year-asc' ? yearA - yearB : yearB - yearA;
    });
}

function extractUniqueTags(papers) {
    const tagsSet = new Set();
    
    papers.forEach(paper => {
        const field = paper.Field || paper.field || paper.FIELD || '';
        if (field) {
            // Handle multiple tags separated by comma, semicolon, or newline
            const tags = field.split(/[,;\n]/).map(tag => tag.trim()).filter(tag => tag !== '');
            tags.forEach(tag => tagsSet.add(tag));
        }
    });
    
    return Array.from(tagsSet).sort();
}

function extractUniqueYears(papers) {
    const yearsSet = new Set();
    
    papers.forEach(paper => {
        const year = paper.Year || paper.year || paper.YEAR || '';
        if (year) {
            yearsSet.add(year.trim());
        }
    });
    
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)
}

function getFirstAuthor(authorsString) {
    if (!authorsString) return '';
    // Extract first author as all text before the first comma
    return authorsString.split(',')[0].trim();
}

function extractUniqueFirstAuthors(papers) {
    const authorsSet = new Set();
    
    papers.forEach(paper => {
        const authors = paper.Authors || paper.authors || paper.AUTHORS || '';
        if (authors) {
            // Extract first author (all text before the first comma)
            const firstAuthor = getFirstAuthor(authors);
            if (firstAuthor) {
                authorsSet.add(firstAuthor);
            }
        }
    });
    
    return Array.from(authorsSet).sort();
}

function populateFieldFilter(tags) {
    populateMultiSelectFilter('field', tags, 'All Fields', 'field-dropdown-content', 'field-dropdown-button', 'field-dropdown-text');
}

function populateYearFilter(years) {
    populateMultiSelectFilter('year', years, 'All Years', 'year-dropdown-content', 'year-dropdown-button', 'year-dropdown-text');
}

function populateAuthorFilter(authors) {
    populateMultiSelectFilter('author', authors, 'All Authors', 'author-dropdown-content', 'author-dropdown-button', 'author-dropdown-text');
}

function populateMultiSelectFilter(filterType, options, allText, contentId, buttonId, textId) {
    const dropdownContent = document.getElementById(contentId);
    dropdownContent.innerHTML = '';
    
    // Add "All" option
    const allOption = document.createElement('label');
    allOption.className = 'dropdown-option';
    const allCheckbox = document.createElement('input');
    allCheckbox.type = 'checkbox';
    allCheckbox.value = '';
    allCheckbox.checked = true; // Default to showing all
    allCheckbox.dataset.filterType = filterType;
    allCheckbox.addEventListener('change', function() {
        if (this.checked) {
            // Uncheck all others in this filter
            dropdownContent.querySelectorAll('.dropdown-option input[type="checkbox"]:not([value=""])').forEach(cb => {
                cb.checked = false;
            });
            handleFilterChange();
        }
    });
    allOption.appendChild(allCheckbox);
    const allLabel = document.createElement('span');
    allLabel.textContent = allText;
    allOption.appendChild(allLabel);
    dropdownContent.appendChild(allOption);
    
    // Add options
    options.forEach(option => {
        const optionElement = document.createElement('label');
        optionElement.className = 'dropdown-option';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = option;
        checkbox.dataset.filterType = filterType;
        checkbox.addEventListener('change', function() {
            // Uncheck "All" if any specific option is selected
            if (this.checked) {
                dropdownContent.querySelector('.dropdown-option input[value=""]').checked = false;
            }
            // If no options selected, select "All"
            const anyChecked = dropdownContent.querySelectorAll('.dropdown-option input[type="checkbox"]:checked').length > 0;
            if (!anyChecked) {
                dropdownContent.querySelector('.dropdown-option input[value=""]').checked = true;
            }
            handleFilterChange();
        });
        optionElement.appendChild(checkbox);
        const label = document.createElement('span');
        label.textContent = option;
        optionElement.appendChild(label);
        dropdownContent.appendChild(optionElement);
    });
    
    // Toggle dropdown on button click
    const dropdownButton = document.getElementById(buttonId);
    const customDropdown = dropdownButton.closest('.custom-dropdown');
    dropdownButton.addEventListener('click', function(e) {
        e.stopPropagation();
        // Close any other open dropdowns first
        closeAllDropdowns(customDropdown);
        const isOpen = dropdownContent.classList.toggle('show');
        if (isOpen) {
            customDropdown.classList.add('active');
        } else {
            customDropdown.classList.remove('active');
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-dropdown')) {
            dropdownContent.classList.remove('show');
            customDropdown.classList.remove('active');
        }
    });
}

function displayPapers(papers) {
    // Apply the current sort order
    papers = sortPapers(papers);

    // Update filtered papers
    filteredPapers = papers;
    
    // Reset to page 1 if current page is beyond available pages
    const totalPages = Math.ceil(papers.length / papersPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = 1;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * papersPerPage;
    const endIndex = startIndex + papersPerPage;
    const papersToShow = papers.slice(startIndex, endIndex);
    
    const paperList = document.getElementById('paper-list');
    paperList.innerHTML = ''; // Clear existing papers
    paperTiles = [];

    papersToShow.forEach((paper) => {
        // Find original index in allPapers by matching title
        const originalIndex = allPapers.findIndex(p => {
            const pTitle = p.Title || p.title || p.TITLE || '';
            const paperTitle = paper.Title || paper.title || paper.TITLE || '';
            return pTitle === paperTitle && pTitle !== '';
        });
        
        // Use original index if found, otherwise use a fallback
        const displayIndex = originalIndex >= 0 ? originalIndex : allPapers.length;
        
        const paperTile = document.createElement('a');
        paperTile.classList.add('paper-tile');
        paperTile.href = `paper.html?index=${displayIndex}`;
        paperTile.dataset.tags = (paper.Field || paper.field || paper.FIELD || '').toLowerCase();
        
        // Save current page to sessionStorage when clicking on a paper
        paperTile.addEventListener('click', () => {
            sessionStorage.setItem('currentPage', currentPage.toString());
        });

        const imgContainer = document.createElement('div');
        imgContainer.classList.add('paper-image');

        const img = document.createElement('img');
        // Handle case-insensitive column names
        const imageUrl = paper.Image || paper.image || paper.IMAGE || '';
        // Use placeholder image if image field is empty
        img.src = imageUrl || 'hero-background.png';
        const title = paper.Title || paper.title || paper.TITLE || '';
        img.alt = title || `Paper ${displayIndex}`;
        img.onerror = function() {
            // Fallback to placeholder if image fails to load
            this.src = 'hero-background.png';
        };
        imgContainer.appendChild(img);

        const contentContainer = document.createElement('div');
        contentContainer.classList.add('paper-content');
        
        // Format: Title, Authors, Conference, Year
        // Handle case-insensitive column names
        const paperTitle = paper.Title || paper.title || paper.TITLE || '';
        const authors = paper.Authors || paper.authors || paper.AUTHORS || '';
        const conference = paper.Conference || paper.conference || paper.CONFERENCE || '';
        const year = paper.Year || paper.year || paper.YEAR || '';
        
        let content = '';
        if (paperTitle) {
            content += `<strong>${escapeHtml(paperTitle)}</strong>`;
        }
        if (authors) {
            content += `<br>${escapeHtml(authors)}`;
        }
        if (conference) {
            content += `<br><em>${escapeHtml(conference)}</em>`;
        }
        if (year) {
            content += `, <em>${escapeHtml(year)}</em>`;
        }
        
        contentContainer.innerHTML = content;

        paperTile.appendChild(imgContainer);
        paperTile.appendChild(contentContainer);
        paperList.appendChild(paperTile);
        paperTiles.push(paperTile);
    });
    
    updateFilterInfo(papers.length);
    updatePagination(papers.length);
}

function handleFilterChange() {
    // Get selected values for each filter
    const fieldChecked = document.querySelectorAll('#field-dropdown-content .dropdown-option input[type="checkbox"]:checked');
    const yearChecked = document.querySelectorAll('#year-dropdown-content .dropdown-option input[type="checkbox"]:checked');
    const authorChecked = document.querySelectorAll('#author-dropdown-content .dropdown-option input[type="checkbox"]:checked');
    
    const selectedFields = Array.from(fieldChecked).map(cb => cb.value.toLowerCase()).filter(v => v !== '');
    const selectedYears = Array.from(yearChecked).map(cb => cb.value.trim()).filter(v => v !== '');
    const selectedAuthors = Array.from(authorChecked).map(cb => cb.value.trim()).filter(v => v !== '');
    
    // Update dropdown button texts
    updateDropdownText('field-dropdown-text', selectedFields, 'All Fields');
    updateDropdownText('year-dropdown-text', selectedYears, 'All Years');
    updateDropdownText('author-dropdown-text', selectedAuthors, 'All Authors');
    
    // Filter papers based on all selected filters
    const filteredPapers = allPapers.filter(paper => {
        // Field filter
        if (selectedFields.length > 0) {
            const field = (paper.Field || paper.field || paper.FIELD || '').toLowerCase();
            if (!field) return false;
            const paperTags = field.split(/[,;\n]/).map(tag => tag.trim()).filter(tag => tag !== '');
            const matchesField = selectedFields.some(selectedField => paperTags.includes(selectedField));
            if (!matchesField) return false;
        }
        
        // Year filter
        if (selectedYears.length > 0) {
            const year = (paper.Year || paper.year || paper.YEAR || '').trim();
            if (!year || !selectedYears.includes(year)) return false;
        }
        
        // First Author filter
        if (selectedAuthors.length > 0) {
            const authors = paper.Authors || paper.authors || paper.AUTHORS || '';
            if (!authors) return false;
            // Extract first author (all text before the first comma)
            const firstAuthor = getFirstAuthor(authors);
            if (!selectedAuthors.includes(firstAuthor)) return false;
        }
        
        return true;
    });
    
    // Reset to page 1 when filters change and clear saved page
    currentPage = 1;
    sessionStorage.removeItem('currentPage');
    displayPapers(filteredPapers);
}

function updateDropdownText(textElementId, selectedValues, allText) {
    const textElement = document.getElementById(textElementId);
    if (selectedValues.length === 0) {
        textElement.textContent = allText;
    } else if (selectedValues.length === 1) {
        textElement.textContent = selectedValues[0];
    } else {
        textElement.textContent = `${selectedValues.length} selected`;
    }
}

function updateFilterInfo(count) {
    const filterInfo = document.getElementById('filter-info');
    const startIndex = (currentPage - 1) * papersPerPage + 1;
    const endIndex = Math.min(currentPage * papersPerPage, count);
    if (count === 0) {
        filterInfo.textContent = `No papers found`;
    } else {
        filterInfo.textContent = `Showing ${startIndex}-${endIndex} of ${count} paper${count !== 1 ? 's' : ''}`;
    }
}

function updatePagination(totalPapers) {
    const paginationContainer = document.getElementById('pagination-container');
    paginationContainer.innerHTML = '';
    
    if (totalPapers === 0) {
        return;
    }
    
    const totalPages = Math.ceil(totalPapers / papersPerPage);
    
    // Create pagination controls
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-button';
    prevButton.textContent = '← Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayPapers(filteredPapers);
            // Scroll to top of paper list
            document.getElementById('paper-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
    paginationDiv.appendChild(prevButton);
    
    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    paginationDiv.appendChild(pageInfo);
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-button';
    nextButton.textContent = 'Next →';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayPapers(filteredPapers);
            // Scroll to top of paper list
            document.getElementById('paper-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
    paginationDiv.appendChild(nextButton);
    
    paginationContainer.appendChild(paginationDiv);
}

function parseCSV(csvData) {
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    // Parse header row
    const headers = parseCSVLine(lines[0]);
    const papers = [];
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const paper = {};
        
        headers.forEach((header, index) => {
            const cleanHeader = header.trim();
            paper[cleanHeader] = values[index] ? values[index].trim() : '';
        });
        
        // Count non-empty columns
        const nonEmptyColumns = Object.values(paper).filter(value => value && value.trim() !== '').length;
        
        // Only add papers that have more than 3 non-empty columns
        if (nonEmptyColumns > 3) {
            papers.push(paper);
        }
    }
    
    return papers;
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add last field
    values.push(current);
    
    return values;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
