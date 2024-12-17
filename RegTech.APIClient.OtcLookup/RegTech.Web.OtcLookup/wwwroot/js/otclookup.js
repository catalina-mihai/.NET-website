const allData = window.allData;

// Define matchCustom function to customize Select2 dropdown search behavior
function matchCustom(params, data) {
    // If the user hasn't entered any search term, return all options
    if ($.trim(params.term) === '') {
        return data;
    }

    // Check if the search term is anywhere in the option text
    if (data.text.toUpperCase().indexOf(params.term.toUpperCase()) > -1) {
        return data;
    }

    // Return `null` if the term doesn't match
    return null;
}

// Initialize Select2 and other UI functionalities when the document is ready
$(document).ready(function () {
    $('.select2').select2();
    let timeoutId; // Variable to store the timeout ID

    function focusSearchField() {
        let searchField = $('.select2-container--open .select2-search__field');
        if (searchField.length > 0) {
            searchField[0].focus();
        }
    }

    // Initialize Select2 for each dropdown
    $('#assetClass').select2({ matcher: matchCustom, width: '100%' }).on('select2:open', focusSearchField);
    $('#instrumentType').select2({ matcher: matchCustom, width: '100%' }).on('select2:open', focusSearchField);
    $('#useCase').select2({ matcher: matchCustom, width: '100%' }).on('select2:open', focusSearchField);
    $('#level').select2({ matcher: matchCustom, width: '100%' }).on('select2:open', focusSearchField);
    $('#templateVersion').select2({ matcher: matchCustom, width: '100%' }).on('select2:open', focusSearchField);

    // Toggle visibility of extra options with a button click
    $('#extraOptionsButton').click(function (event) {
        event.stopPropagation(); // Prevent event from affecting other elements
        const extraOptions = $('#extraOptions');
        const overlay = $('#overlay');
        const isVisible = extraOptions.hasClass('show');

        if (isVisible) {
            extraOptions.removeClass('show');
            overlay.hide();

            // Clear any existing timeout when manually closing
            clearTimeout(timeoutId);
        } else {
            extraOptions.addClass('show');
            overlay.show();

            // Set a new timeout to hide after 15 seconds
            clearTimeout(timeoutId); // Clear any previous timeout
            timeoutId = setTimeout(() => {
                extraOptions.removeClass('show');
                overlay.hide();
            }, 15000); // 15 seconds timeout
        }
    });

    // Close the extra options when clicking outside
    $(document).on('click', function (event) {
        const extraOptions = $('#extraOptions');
        const overlay = $('#overlay');
        const isClickedOutside = !$(event.target).closest('#extraOptions, #extraOptionsButton').length;

        if (extraOptions.hasClass('show') && isClickedOutside) {
            extraOptions.removeClass('show');
            overlay.hide();

            // Clear timeout when closing via outside click
            clearTimeout(timeoutId);
        }
    });

    // Prevent clicks inside the extra options box from closing it
    $('#extraOptions').on('click', function (event) {
        event.stopPropagation(); // Prevent closing when clicking inside the box
    });

    // Assign tooltips to fields within the extra options dynamically
    function assignTooltips() {
        const tooltips = [
            { keyword: "version", text: "Order of template search when multiple versions (V1, V2) are available." },
            { keyword: "instrument", text: "Maximum number of instruments to return." },
            {
                keyword: "ExpiryDate", text: `Searches in ordered dates and stops when at least one result is found for a specific date, ignoring the rest.
            E.g., for templates with a single ExpiryDate (e.g., 2024-07-15), this defines the days around it:
            [0]: Exact date (2024-07-15) only.
            [1]: Exact date first (2024-07-15), then +/- 1 day (2024-07-14, 2024-07-16).
            [-1]: Exact date first (2024-07-15), then -1 day (2024-07-14), +1 day (2024-07-16).
            [2]: Exact date first (2024-07-15), then +/- 1 day (2024-07-14, 2024-07-16), +2 days (2024-07-17), -2 days (2024-07-13).
            [-2]: Exact date first (2024-07-15), then -1 day (2024-07-14), +1 day (2024-07-16), -2 days (2024-07-13), +2 days (2024-07-17).` }
        ];

        // Assign tooltips to matching elements inside #extraOptions
        $('#extraOptions label, #extraOptions select').each(function () {
            const element = $(this);

            const textContent = element.text().trim().toLowerCase();

            const matchingTooltip = tooltips.find(tooltip => textContent.includes(tooltip.keyword.toLowerCase()));

            if (matchingTooltip) {
                element.attr('title', matchingTooltip.text);
            }
        });
    }


    // Call the function to assign tooltips after extra options are shown
    $('#extraOptionsButton').click(assignTooltips);

    // Initialize Select2 for the extra dropdowns
    $('#templateSearchDirection').select2({ width: '100%' });
    $('#expiryDatesSpans').select2({ width: '100%' });
    $('#instrumentLimit').select2({ width: '100%' });
});

function updateInstrumentType(assetClass) {
    let instrumentTypeDropDown = document.querySelector("#instrumentType");
    let previousInstrumentType = $('#instrumentType').val();
    let previousUseCase = $('#useCase').val();
    let previousLevel = $('#level').val();
    let previousTemplateVersion = $('#templateVersion').val();

    resetDropdown('instrumentType', false);

    if (assetClass && allData.instrumentType[assetClass]) {
        allData.instrumentType[assetClass].forEach(type => {
            $('#instrumentType').append(`<option value="${type}">${type}</option>`);
        });
        $('#instrumentType').prop('disabled', false).select2();

        if (previousInstrumentType && allData.instrumentType[assetClass].includes(previousInstrumentType)) {
            $('#instrumentType').val(previousInstrumentType).trigger('change');

            if (previousUseCase) {
                updateUseCase(previousInstrumentType, previousUseCase, previousLevel, previousTemplateVersion);
            }
        } else {
            resetDropdown('useCase', true);
            resetDropdown('level', true);
            resetDropdown('templateVersion', true);
        }
    }
}

function updateUseCase(instrumentType, previousUseCase = null, previousLevel = null, previousTemplateVersion = null) {
    let useCaseDropDown = document.querySelector("#useCase");
    let assetClass = document.querySelector("#assetClass").value;

    resetDropdown('useCase', false);

    if (assetClass && instrumentType && allData.useCase[assetClass] && allData.useCase[assetClass][instrumentType]) {
        const currentOptions = allData.useCase[assetClass][instrumentType];

        if (currentOptions.length > 0) {
            currentOptions.forEach(use => {
                $('#useCase').append(`<option value="${use}">${use}</option>`);
            });

            $('#useCase').prop('disabled', false).select2();

            if (previousUseCase && currentOptions.includes(previousUseCase)) {
                $('#useCase').val(previousUseCase).trigger('change');

                if (previousLevel) {
                    updateLevel(previousUseCase, previousLevel, previousTemplateVersion);
                }
            }
        }
    }
}

const levelDisplayMap = {
    'InstRefDataReporting': 'ISIN',
    // Add other mappings if needed
};

function updateLevel(useCase, previousLevel = null, previousTemplateVersion = null) {
    let levelDropDown = document.querySelector("#level");
    let assetClass = document.querySelector("#assetClass").value;
    let instrumentType = document.querySelector("#instrumentType").value;

    resetDropdown('level', false);

    if (assetClass && instrumentType && useCase && allData.level[assetClass] && allData.level[assetClass][instrumentType] && allData.level[assetClass][instrumentType][useCase]) {
        allData.level[assetClass][instrumentType][useCase].forEach(level => {
            const displayText = levelDisplayMap[level] || level;
            $('#level').append(`<option value="${level}">${displayText}</option>`);
        });
        $('#level').prop('disabled', false).select2();

        if (previousLevel && allData.level[assetClass][instrumentType][useCase].includes(previousLevel)) {
            $('#level').val(previousLevel).trigger('change');

            if (previousTemplateVersion) {
                updateTemplateVersion(previousLevel, previousTemplateVersion);
            }
        } else {
            setDefaultLevel();
        }
    }
}

function updateTemplateVersion(level, previousTemplateVersion = null) {
    let templateVersionDropDown = document.querySelector("#templateVersion");
    let assetClass = document.querySelector("#assetClass").value;
    let instrumentType = document.querySelector("#instrumentType").value;
    let useCase = document.querySelector("#useCase").value;

    resetDropdown('templateVersion', false);

    if (assetClass && instrumentType && useCase && level && allData.templateVersion[assetClass] && allData.templateVersion[assetClass][instrumentType] && allData.templateVersion[assetClass][instrumentType][useCase] && allData.templateVersion[assetClass][instrumentType][useCase][level]) {
        allData.templateVersion[assetClass][instrumentType][useCase][level].forEach(version => {
            $('#templateVersion').append(`<option value="${version}">${version}</option>`);
        });
        $('#templateVersion').prop('disabled', false).select2();

        if (previousTemplateVersion && allData.templateVersion[assetClass][instrumentType][useCase][level].includes(previousTemplateVersion)) {
            $('#templateVersion').val(previousTemplateVersion).trigger('change');
        }
    }
}

function resetDropdown(dropdownId, disable = true) {
    let dropdown = document.querySelector(`#${dropdownId}`);
    if (dropdownId === 'templateVersion') {
        dropdown.innerHTML = `<option value="">Could be left blank</option>`;
    } else {
        dropdown.innerHTML = `<option value="">Choose a ${dropdownId.charAt(0).toUpperCase() + dropdownId.slice(1)}</option>`;
    }
    if (disable) {
        $(`#${dropdownId}`).prop('disabled', true).select2();
    }
}
let searchTimeout;
let lastSearchData = null;

// Function to perform the search and get dynamic fields
function performSearch() {
    // Clear any existing timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    // Capture current values immediately
    const currentData = {
        assetClass: $('#assetClass').val(),
        instrumentType: $('#instrumentType').val(),
        useCase: $('#useCase').val(),
        level: $('#level').val(),
        templateVersion: $('#templateVersion').val()
    };

    // Store current values
    lastSearchData = { ...currentData };

    // Set a new timeout
    searchTimeout = setTimeout(() => {
        // Use the stored values for the API call
        console.log('Selected Asset Class:', lastSearchData.assetClass);
        console.log('Selected Instrument Type:', lastSearchData.instrumentType);

        fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(lastSearchData)
        })
            .then(response => response.json())
            .then(data => {
                // Save current field values before regenerating
                savePreviousDynamicFieldValues();

                // Generate new fields
                generateDynamicFields(data);

                // Restore the saved values
                setTimeout(() => {
                    restorePreviousDynamicFieldValues();
                }, 0);
            })
            .catch(error => {
                console.error('Error fetching attributes:', error);
            });
    }, 300);
}


function clearResults() {
    // Clear displayed results
    $('#results').empty();
    // Keep both the Find and Clear Results buttons visible
    $('#find-button').css('display', 'block');
    $('#clear-results-button').css('display', 'block');
}

function performFind() {
    const formData = {
        header: {
            assetClass: $('#assetClass').val(),
            instrumentType: $('#instrumentType').val(),
            useCase: $('#useCase').val(),
            level: $('#level').val(),
            templateVersion: $('#templateVersion').val()
        },
        instrumentLimit: $('#instrumentLimit').val(),
        templateSearchDirection: $('#templateSearchDirection').val(),
        extractAttributes: true,
        extractDerived: true,
        expiryDatesSpans: $('#expiryDatesSpans').val(),
        deriveCfiCodeProperties: true,
        attributes: gatherDynamicFields()
    };

    // Add this detailed logging
    console.log("Payload being sent:", JSON.stringify(formData, null, 2));
    console.log("Dynamic Fields:", gatherDynamicFields());
    console.log("Form Values:", {
        assetClass: $('#assetClass').val(),
        instrumentType: $('#instrumentType').val(),
        useCase: $('#useCase').val(),
        level: $('#level').val(),
        templateVersion: $('#templateVersion').val(),
        
    });

    fetch('/find', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else {
                    console.log("Raw response from server:", data);
                    console.log("Response type:", typeof data);

                    // Extract the correlation ID (assuming it's always provided)
                    const headers = Array.isArray(data.headers) ? data.headers : [];
                    const correlationId = headers.find(obj => obj.name.includes('x-correlation-id'))?.value;

                    // Handle both the direct data case and the nested data case
                    let resultData;
                    try {
                        resultData = data.content ? JSON.parse(data.content) : data;
                    } catch (parseError) {
                        console.error("Error parsing data.content:", parseError);
                        resultData = data;
                    }

                    console.log("Has instruments:", resultData.instruments ? Object.keys(resultData.instruments).length : 0);
                    console.log("Final data to display:", resultData);

                    displayResults(resultData, correlationId);
                }
        })
        .catch(error => {
            console.error('Error fetching instruments:', error);
            alert('Error fetching results. Please try again.');
        });

}

function gatherDynamicFields() {
    const dynamicFields = {};
    // Loop through all dynamically generated form fields
    $('#dynamicFields .form-group').each(function () {
        const label = $(this).find('label').text();
        const input = $(this).find('input, textarea, select');
        let value;

        // Get the value based on input type
        if (input.hasClass('select2')) {
            value = input.val(); // Get Select2 value
        } else {
            value = input.val();  // Get other input values
        }

        // Only add dynamicFields if the value exists and is not empty
        if (!value || value.trim() === '' || value === null) {
            return true; // This is equivalent to 'continue' in jQuery's .each()
        }

        dynamicFields[label] = value; // Only add if value passes validation
    });

    console.log("Dynamic Fields Collected:", dynamicFields);  // DEBUG: Log the collected dynamic fields
    return dynamicFields;
}
// Function to copy row content to the clipboard
function copyRowContentToClipboard(rowElement) {
    const text = $(rowElement).find('td:last').text().trim(); // Get the text of the last <td> in the row

    // Check if the content is valid
    if (text && text !== "N/A") {
        navigator.clipboard.writeText(text).then(() => {
            // Show notification for successful copy
            let $notification = $('#notification');

            // Create notification if it doesn't already exist
            if ($notification.length === 0) {
                $notification = $('<div id="notification">')
                    .css({
                        position: 'fixed',
                        top: '40%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: '#ff6600',
                        color: '#fff',
                        padding: '15px 20px',
                        borderRadius: '8px',
                        zIndex: 1000,
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontFamily: 'Arial, sans-serif',
                        display: 'none',
                        textAlign: 'center',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                    })
                    .appendTo('body');
            }

            $notification.text('Content copied to clipboard!').fadeIn();
            setTimeout(() => $notification.fadeOut(), 3000); // Ensure consistent 3-second timeout

            // Hide on click anywhere
            $(document).one('click', (e) => {
                if (!$(e.target).is('#notification')) $notification.fadeOut();
            });

        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    } else {
        let $notification = $('#notification');

        // Create notification if it doesn't already exist
        if ($notification.length === 0) {
            $notification = $('<div id="notification">')
                .css({
                    position: 'fixed',
                    top: '40%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: '#ff6600',
                    color: '#fff',
                    padding: '15px 20px',
                    borderRadius: '8px',
                    zIndex: 1000,
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontFamily: 'Arial, sans-serif',
                    display: 'none',
                    textAlign: 'center',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                })
                .appendTo('body');
        }

        $notification.text('No content to copy!').fadeIn();
        setTimeout(() => $notification.fadeOut(), 3000); // Ensure consistent 3-second timeout

        // Hide on click anywhere
        $(document).one('click', (e) => {
            if (!$(e.target).is('#notification')) $notification.fadeOut();
        });
    }
}



function displayResults(data, correlationId) {
    console.log("Data received in displayResults:", data);
    const resultsDiv = $('#results');

    if (data.instruments) {
        const uniqueId = `results-${new Date().getTime()}`;

        // Declare and fetch form variables once
        const assetClass = $('#assetClass').val();
        const instrumentType = $('#instrumentType').val();
        const useCase = $('#useCase').val();
        const level = $('#level').val();
        const templateVersion = $('#templateVersion').val() || '*';

        // Generate the template information string
        const displayLevel = levelDisplayMap[level] || level;
        const templateInfo = `${assetClass}.${instrumentType}.${useCase}.${displayLevel}.${templateVersion}`;

        const instrumentsReceived = data.instrumentCount;
        const instrumentLimit = $('#instrumentLimit').val() || 'N/A';

        let collapsibleWrapper = `
            <div class="collapsible-results">
                <div class="collapsible-header table-header" onclick="toggleCollapsible('${uniqueId}')">
                    <table class="header-table" style="width: 100%; margin-bottom: 0;">
                        <tr>
                            <td style="width: 30%; text-align: left; font-size: 0.9em; color: #666; cursor: pointer;">
                                <i class="fas fa-chevron-right"></i> Results
                            </td>
                                <td style="width: 20%; text-align: right; font-size: 0.9em; color: #666; cursor: pointer;">
                                    <span>Template:</span>
                                </td>
                                <td style="width: 70%; text-align: right; font-size: 0.9em; color: #666; cursor: pointer;" 
                                    onclick="event.stopPropagation(); copyRowContentToClipboard(this)">
                                    ${templateInfo}
                                </td>
                            <td style="width: 30%; text-align: right; font-size: 0.9em; color: #666; cursor: pointer;">
                                <span>Instruments:</span>
                            </td>
                            <td style="width: 70%; text-align: right; font-size: 0.9em; color: #666; cursor: pointer;"
                                onclick="event.stopPropagation(); copyRowContentToClipboard(this)">
                                ${instrumentsReceived}/${instrumentLimit}
                            </td>
                            <td style="width: 50%; text-align: right; font-size: 0.9em; color: #666; cursor: pointer;">
                                <span>Correlation:</span>
                            </td>
                            <td style="width: 70%; text-align: right; font-size: 0.9em; color: #666; cursor: pointer;"
                                onclick="event.stopPropagation(); copyRowContentToClipboard(this)">
                                ${correlationId}
                            </td>
                        </tr>
                    </table>
                </div>
                <div id="${uniqueId}" class="collapsible-content" style="display: none;">
        `;

        let table = '<div class="table-responsive"><table style="table-layout: fixed;">';
        table += '<tr>';
        table += '<th style="width: 34%;">Identifier</th>';
        table += '<th style="width: 32.5%;">Attributes</th>';
        table += '<th style="width: 33.5%;">Derived</th>';
        table += '</tr>';

        const processedInstruments = new Set(); // Track processed instruments to avoid duplicates

        Object.keys(data.instruments).forEach(isin => {
            if (processedInstruments.has(isin)) {
                console.warn(`Duplicate instrument detected: ${isin}`);
                return; // Skip duplicates
            }
            processedInstruments.add(isin);

            const instrument = data.instruments[isin];
            console.log("Processing instrument:", instrument);

            // Generate identifier and attributes tables
            const identifierTable = createIdentifierTable(instrument, templateInfo, correlationId);
            const attributesTable = createAttributesTable(instrument.attributes);
            const derivedTable = createDerivedTable(instrument.derived);

            // Add a row for each instrument
            table += `<tr style="background-color: transparent;">
                        <td>${identifierTable}</td>
                        <td>${attributesTable}</td>
                        <td style="font-size: 0.95em;">${derivedTable}</td>
                      </tr>`;
        });

        table += '</table></div>';
        collapsibleWrapper += table + '</div></div>'; // Close collapsible-results
        resultsDiv.prepend(collapsibleWrapper);

        updateTableHoverEffect();
    } else {
        resultsDiv.prepend('<p>No instruments found.</p>');
    }

    setTimeout(() => {
        $('.new-search-row').css('background-color', '');
    }, 3000);
}

// Helper function to create the identifier table
function createIdentifierTable(instrument, templateInfo, correlationId) {
    const isinId = instrument.identifier || 'N/A';
    const parentIdentifier = instrument.parentIdentifier || 'N/A';
    const status = instrument.annaDsbStatus || 'N/A';
    const classification = instrument.classificationType || 'N/A';
    const lastUpdated = new Date(instrument.lastUpdateDateTime || Date.now())
        .toISOString()
        .split('T')[0];

    return `
 <table class="nested-table" style="font-size: 0.85em; width: 100%; table-layout: fixed;">
            <tr onclick="copyRowContentToClipboard(this)">
                <td style="text-align: left; width: 30%; overflow: hidden; text-overflow: ellipsis;">ID:</td>
                <td style="text-align: right; width: 70%; overflow: hidden; text-overflow: ellipsis;">${isinId}</td>
            </tr>
            <tr onclick="copyRowContentToClipboard(this)">
                <td style="text-align: left; width: 30%; overflow: hidden; text-overflow: ellipsis;">Parent:</td>
                <td style="text-align: right; width: 70%; overflow: hidden; text-overflow: ellipsis;">${parentIdentifier}</td>
            </tr>
            <tr onclick="copyRowContentToClipboard(this)">
                <td style="text-align: left; width: 30%; overflow: hidden; text-overflow: ellipsis;">Status:</td>
                <td style="text-align: right; width: 70%; overflow: hidden; text-overflow: ellipsis;">${status}</td>
            </tr>
            <tr onclick="copyRowContentToClipboard(this)">
                <td style="text-align: left; width: 30%; overflow: hidden; text-overflow: ellipsis;">Classification:</td>
                <td style="text-align: right; width: 70%; overflow: hidden; text-overflow: ellipsis;">${classification}</td>
            </tr>
            <tr onclick="copyRowContentToClipboard(this)">
                <td style="text-align: left; width: 30%; overflow: hidden; text-overflow: ellipsis;">Last Updated:</td>
                <td style="text-align: right; width: 70%; overflow: hidden; text-overflow: ellipsis;">${lastUpdated}</td>
            </tr>
            <tr onclick="copyRowContentToClipboard(this)">
                <td style="text-align: left; width: 30%; overflow: hidden; text-overflow: ellipsis;">Template:</td>
                <td style="text-align: right; width: 70%; overflow: hidden; text-overflow: ellipsis;">${templateInfo}</td>
            </tr>
            <tr onclick="copyRowContentToClipboard(this)">
                <td style="text-align: left; width: 30%; overflow: hidden; text-overflow: ellipsis;">Correlation:</td>
                <td style="text-align: right; width: 70%; overflow: hidden; text-overflow: ellipsis;">${correlationId}</td>
            </tr>
        </table>`;
}

function toggleCollapsible(sectionId) {
    const section = document.getElementById(sectionId);
    const header = section.previousElementSibling;

    if (section.style.display === 'none') {
        section.style.display = 'block';
        header.classList.add('active');
    } else {
        section.style.display = 'none';
        header.classList.remove('active');
    }
}

// Helper functions to create the nested tables for attributes and derived data
function createAttributesTable(attributes) {
    if (!attributes) return 'N/A';
    return `<table class="nested-table" style="font-size: 0.80em; width: 100%; table-layout: fixed;">
                ${Object.entries(attributes)
            .map(([key, value]) =>
                `<tr onclick="copyRowContentToClipboard(this)">
                            <td style="text-align: left; width: 40%; overflow: hidden; text-overflow: ellipsis;">${key}</td>
                            <td style="text-align: right; width: 60%; overflow: hidden; text-overflow: ellipsis; word-break: break-word;">${value}</td>
                         </tr>`
            ).join('')}
               </table>`;
}

function createDerivedTable(derived) {
    if (!derived) return 'N/A';
    return `<table class="nested-table" style="font-size: 0.76em; width: 100%; table-layout: fixed;">
                ${Object.entries(derived)
            .map(([key, value]) =>
                `<tr onclick="copyRowContentToClipboard(this)">
                            <td style="text-align: left; width: 40%; overflow: hidden; text-overflow: ellipsis;">${key}</td>
                            <td style="text-align: right; width: 60%; overflow: hidden; text-overflow: ellipsis; word-break: break-word;">${value}</td>
                         </tr>`
            ).join('')}
               </table>`;
}


// Function to check if a table has data and add/remove 'has-data' class accordingly
function updateTableHoverEffect() {
    $('table').each(function () {
        // Check if table has any rows with data
        if ($(this).find('tr').length > 0) { // Assuming the first row is the header
            $(this).addClass('has-data');
        } else {
            $(this).removeClass('has-data');
        }
    });
}


// Call this function when you want to initialize the Select2 elements for dynamically created fields
function initDynamicSelect2() {
    function focusSearchField() {
        let searchField = $('.select2-container--open .select2-search__field');
        if (searchField.length > 0) {
            searchField[0].focus();
        }
    }

    $('#dynamicFields .select2').select2({
        placeholder: 'Search',
        allowClear: true
    }).on('select2:open', focusSearchField);
}


function createFieldElement(attributeKey, attribute) {
    const fieldDiv = $('<div>').addClass('form-group').css('margin-top', '10px');
    const tooltipText = `${attributeKey}: ${attribute.description || 'No description available'}`;
    const label = $('<label>').text(attributeKey).attr('title', tooltipText);
    fieldDiv.append(label);

    console.log(`    Processing field: ${attributeKey} - DataType: ${attribute.dataType}`);
    handledAttributes.push(attributeKey);
    console.log(`    Handled attribute: ${attributeKey}`);

    if (attribute.dataType === 'InstrumentTypeEnum') {
        console.log(`Skipping 'InstrumentTypeEnum' field for: ${attributeKey}`);
        return null;
    }

    let input;
    if (attribute.enumSpan) {
        console.log(`    Created searchable dropdown for enumSpan: ${attributeKey}`);
        createSearchableDropdown(fieldDiv, attributeKey, attribute.enumSpan);
    } else if (attribute.dataType === 'string') {
        console.log(`    Created text input for: ${attributeKey}`);
        input = $('<input>').attr('type', 'text').attr('placeholder', `Enter ${attributeKey}`).attr('name', attributeKey).css('padding', '5px');
    } else if (attribute.dataType === 'int' || attribute.dataType === 'integer') {
        console.log(`    Created integer input for: ${attributeKey}`);
        input = $('<input>').attr('type', 'number').attr('min', '1').val('').text('').attr('name', attributeKey).css('padding', '5px');
    } else if (attribute.dataType === 'number') {
        console.log(`    Created number input for: ${attributeKey}`);
        input = $('<input>').attr('type', 'number').attr('step', '0.1').attr('min', '0').val('1.0').attr('name', attributeKey).css('padding', '5px');
    } else if (attribute.dataType === 'datetime' || attribute.dataType === 'DateTime') {
        input = $('<input>').attr('type', 'text')
            .attr('placeholder', 'YYYY-MM-DD')
            .css('width', '100%')
            .attr('name', attributeKey)
            .css('padding', '5px');
        console.log(`    Created datetime input for: ${attributeKey}`);

        input.datepicker({
            dateFormat: "yy-mm-dd",
            changeMonth: true,
            changeYear: true,
            showButtonPanel: true,
            firstDay: 1,
            yearRange: "-100:+10",
            beforeShow: function (input) {
                setTimeout(function () {
                    $(".ui-datepicker").css("z-index", 1000);
                }, 0);
            },
            onSelect: function (dateText) {
                $(this).datepicker("hide");
            }
        });

        input.on('keypress', function (event) {
            if (event.which === 13) {
                event.preventDefault();
                const dateValue = $(this).val().trim();
                const datePattern = /^\d{4}-\d{2}-\d{2}$/;
                if (datePattern.test(dateValue)) {
                    const parsedDate = $.datepicker.parseDate("yy-mm-dd", dateValue);
                    if (parsedDate) {
                        $(this).datepicker("setDate", parsedDate);
                        $(this).datepicker("hide");
                        $(this).blur();
                    } else {
                        alert('Invalid date. Please enter a valid date in the format YYYY-MM-DD.');
                    }
                } else {
                    alert('Please enter a valid date in the format YYYY-MM-DD.');
                }
            }
        });
    } else if (attribute.dataType === 'array') {
        input = $('<textarea>').attr('placeholder', `Enter ${attributeKey} as comma-separated values`).attr('name', attributeKey).css('padding', '5px');
    }

    if (input) {
        fieldDiv.append(input);
    }
    return fieldDiv;
}

const previousDynamicFieldValues = {};

function savePreviousDynamicFieldValues() {
    $('#dynamicFields .form-group').each(function () {
        const input = $(this).find('input, textarea, select');
        if (input.length) {
            const fieldName = input.attr('name');
            if (fieldName) {
                previousDynamicFieldValues[fieldName] = input.val();
            }
        }
    });
}

function restorePreviousDynamicFieldValues() {
    Object.entries(previousDynamicFieldValues).forEach(([fieldName, value]) => {
        const input = $(`#dynamicFields [name="${fieldName}"]`);
        if (input.length) {
            input.val(value).trigger('change'); // Restore values and trigger events
        }
    });
}

const handledAttributes = [];


function generateDynamicFields(data) {
    const dynamicFieldsDiv = $('#dynamicFields');
    dynamicFieldsDiv.empty();
    // Save current values before clearing
    try {
        savePreviousDynamicFieldValues();
    } catch (error) {
        console.warn("Error saving previous field values:", error);
    }

    // Create a document fragment to build the entire structure before adding to DOM
    const fragment = $(document.createDocumentFragment());

    const selectedAssetClass = $('#assetClass').val();
    const selectedInstrumentType = $('#instrumentType').val();


    const fieldHierarchy = JSON.parse(data.field_hierarchy)[0];
    //console.log("Field hierarchy: ", fieldHierarchy);
    const fieldsToAdd = [];

    // create horizontal div
    var currentDivRow = -1;
    var currenthorizontalDiv = null;

    $.each(fieldHierarchy, function (assetClass, assetData) {
        if (assetClass !== selectedAssetClass) return;
        //console.log(`Processing asset class: ${assetClass}`);
        //console.log(`Processing asset Data: ${JSON.stringify(assetData)}`);


        $.each(assetData, function (instrumentType, fields) {
            if (instrumentType !== selectedInstrumentType) return;
            //console.log(`fields are: ${JSON.stringify(fields)}`);


            if (!fields) {
                console.log("Field or dataType is undefined for: " + instrumentType);
                return;
            }

            if (Array.isArray(fields)) {
                console.log(`  It is an array and Processing instrument type: ${instrumentType}`);

                console.log(` fieldsobject ${JSON.stringify(fields)}`);
                // sort by row , column , name 
                const orderedFields = fields.sort((a, b) => {
                    // First, sort by row
                    if (a.row !== b.row) {
                        return a.row - b.row;
                    }
                    // If rows are the same, then sort by column
                    if (a.column !== b.column) {
                        return a.column - b.column;
                    }
                    // If both row and column are the same, then sort by name
                    return a.name.localeCompare(b.name);
                });
                console.log(` ordered fields ${JSON.stringify(orderedFields)}`);

                $.each(orderedFields, function (index, field) {
                    console.log(`field is: ${JSON.stringify(field)}`);
                    const attributeKey = field.name;
                    const attribute = data.attributes[attributeKey];
                    console.log(`fields is an array. index: ${index}, field: `, field);
                    if (!attribute) {
                        console.log(`Attribute data missing for key ${attributeKey}`);
                        return
                    }
                    if (currentDivRow !== field.row || !currenthorizontalDiv) {
                        if (currenthorizontalDiv) {
                            console.log(`Adding horizontal div with divRow = ${currentDivRow}`);
                            fragment.append(currenthorizontalDiv[0]);
                        }
                        console.log(`new row detected : ${currentDivRow}, versus ${field.row}`);
                        currentDivRow = field.row;
                        currenthorizontalDiv = $(`<div class="horizontal-row" data-row="${currentDivRow}"></div>`);
                        console.log(`Create new horizontal div with divRow = ${currentDivRow}`);
                    }
                    if (attribute && dynamicFieldsDiv.find(`[name="${attributeKey}"]`).length === 0) {
                        let isHandled = false;
                        const { name, row, column } = field;
                        //console.log(`Processing field: ${name} - Row: ${row}, Column: ${column}`);

                        const fieldElement = createFieldElement(attributeKey, attribute);
                        console.log(`append field ${field.name} to currenthorizontalDiv = ${currentDivRow}`);
                        //append dynamic field you create to the horizontal div( + append splitter . fixed size)
                        if (fieldElement) {
                            currenthorizontalDiv.append(fieldElement);
                        }
                    }
                });
                if (currenthorizontalDiv) {
                    fragment.append(currenthorizontalDiv[0]);
                    currenthorizontalDiv = null; // Reset for the next set of fields

                }

            }
        });
    });
    // Append the fragment to the DOM all at once
    dynamicFieldsDiv.empty().append(fragment);

    // Initialize all Select2 elements at once
    try {
        initDynamicSelect2();
    } catch (error) {
        console.warn("Error initializing Select2:", error);
    }

    // Restore previous values after everything is built
    try {
        restorePreviousDynamicFieldValues();
    } catch (error) {
        console.warn("Error restoring previous field values:", error);
    }

    $('#find-button').css('display', 'block');
    $('#clear-results-button').css('display', 'block');



    //const notHandledAttributes = Object.keys(data.attributes).filter(key => !dynamicFieldsDiv.find(`[name="${key}"]`).length);
    //notHandledAttributes.forEach(attributeKey => {
    //    const attribute = data.attributes[attributeKey];
    //    if (!isHandled) {
    //        const fieldDiv = createFieldElement(attributeKey, attribute);
    //        if (fieldDiv) {
    //            dynamicFieldsDiv.append(fieldDiv);
    //        }
    //    }
    //});



    //console.log("Handled Attributes: ", handledAttributes);
    //console.log("Not Handled Attributes: ", notHandledAttributes);

}



function createSearchableDropdown(container, attributeKey, options) {
    const select = $('<select>').addClass('select2')
        .attr('name', attributeKey)
        .attr('placeholder', `Search ${attributeKey}`);
    select.append(new Option(`Search ${attributeKey}`, '', true, true));

    options.sort().forEach(option => {
        select.append(new Option(option, option));
    });

    container.append(select);

    // Initialize Select2 and focus the search field after it has been opened
    select.select2({
        placeholder: `Search ${attributeKey}`,
        allowClear: true
    }).on('select2:open', function () {
        setTimeout(function () {
            // Focus the search field inside the dropdown after it opens
            let searchField = $('.select2-container--open .select2-search__field');
            if (searchField.length > 0) {
                searchField[0].focus();
            }
        }, 100); // Delay to ensure the dropdown is fully opened before focusing
    }).on('select2:open', function () {
        setTimeout(function () {
            // Focus the search field inside the dropdown after it opens
            let searchField = $('.select2-container--open .select2-search__field');
            if (searchField.length > 0) {
                searchField[0].focus();
            }
        }, 100); // Delay to ensure the dropdown is fully opened before focusing
    });
}

function setDefaultLevel() {
    // Set Level to "InstRefDataReporting"
    $('#level').val('InstRefDataReporting').trigger('change');

    // If using Select2, update the Select2 display
    $('#level').trigger('select2:update');
}

function logout() {
    // Call the backend to clear access_token and redirect
    fetch('/Account/Logout', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(response => {
        if (response.redirected) {
            window.location.href = response.url; // Redirect to Login
        }
    }).catch(error => {
        console.error('Error during logout:', error);
    });
}