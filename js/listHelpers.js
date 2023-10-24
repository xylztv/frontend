
        // Fetch the helper names from the endpoint
        import { API_URL } from "./config.js";
        fetch(`${API_URL}/rest/discord-members`)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                // Extract the helper names from the response data
                const helperNames = data.helperMemberData;
                const adminNames = data.adminMemberData;

                // Update the sidebar description with the helper names
                const sidebarDescription = document.querySelector('.sidebar-description');
                sidebarDescription.innerHTML = helperNames.map(name => `<div class="helper-name">${name}</div>`).join('');
                // Bold the admin names in the sidebar description
                adminNames.forEach(name => {
                    const adminNameElement = document.createElement('div');
                    adminNameElement.classList.add('helper-name');
                    adminNameElement.style.fontWeight = 'bold';
                    adminNameElement.textContent = name;
                    sidebarDescription.appendChild(adminNameElement);
                });
            })
            .catch(error => {
                console.error(error);
            });