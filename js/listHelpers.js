import { API_URL } from "./config.js";

// Function to update the sidebar with helper and admin names
function updateSidebar(helperNames, adminNames) {
    const sidebarDescription = document.querySelector('.sidebar-description');

    // Clear existing content
    sidebarDescription.innerHTML = '';

    // Check if helperNames is defined and is an array
    if (Array.isArray(helperNames)) {
        sidebarDescription.innerHTML += helperNames.map(name => `<div class="helper-name">${name}</div>`).join('');
    }

    // Check if adminNames is defined and is an array
    if (Array.isArray(adminNames)) {
        adminNames.forEach(name => {
            const adminNameElement = document.createElement('div');
            adminNameElement.classList.add('helper-name');
            adminNameElement.style.fontWeight = 'bold';
            adminNameElement.textContent = name;
            sidebarDescription.appendChild(adminNameElement);
        });
    }
}


// Function to fetch helper and admin names from the server
function fetchDiscordMembers() {
    fetch(`${API_URL}/rest/discord-members`)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            const helperNames = data.helperMemberData;
            const adminNames = data.adminMemberData;

            // Update the sidebar with fetched data
            updateSidebar(helperNames, adminNames);

            // Update local storage with new data
            localStorage.setItem('discordMembers', JSON.stringify({ helperNames, adminNames }));
        })
        .catch(error => {
            console.error(error);
        });
}

// Check local storage first and display data if available
const storedDiscordMembers = localStorage.getItem('discordMembers');
if (storedDiscordMembers) {
    const { helperNames, adminNames } = JSON.parse(storedDiscordMembers);
    updateSidebar(helperNames, adminNames);
}

// Fetch the latest data from the server
fetchDiscordMembers();
