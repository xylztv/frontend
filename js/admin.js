import { API_URL } from "./config.js";

let changedLevels = [];
let originalRankings = {}; // { levelId: ranking }
let levelNames = {}; // { levelId: levelName }
let initialOrder = []; // This will store the initial order of the levels

document.addEventListener('DOMContentLoaded', function() {
    const levelsButton = document.getElementById('levelsButton');
    const usersButton = document.getElementById('usersButton');
    const recordsButton = document.getElementById('recordsButton');
    const backButton = document.getElementById('backButton');
    const adminPanel = document.getElementById('adminPanel');
    const expandedSection = document.getElementById('expandedSection');
    const sectionTitle = document.getElementById('sectionTitle');

    levelsButton.addEventListener('click', function() {
        showExpandedSection('Levels');
        handleLevelsSection();
    });

    backButton.addEventListener('click', function() {
        hideExpandedSection();
    });

    function showExpandedSection(title) {
        adminPanel.style.display = 'none';
        expandedSection.style.display = 'block';
        sectionTitle.textContent = title;
    }

    function hideExpandedSection() {
        adminPanel.style.display = 'block';
        expandedSection.style.display = 'none';
    }

    // Save Changes button click event:
    document.getElementById('saveChangesButton').addEventListener('click', function() {
        openSaveChangesModal();
    });
    $('#genericModal').on('hidden.bs.modal', function() {
        // Reset the primary button's display
        document.getElementById('genericModalPrimaryBtn').style.display = 'block';
    });
    document.getElementById('listTypeDropdown').addEventListener('change', handleLevelsSection);
    document.addEventListener('DOMContentLoaded', handleLevelsSection);
    checkAdminStatus();
});


function saveChangesToBackend() {
    const listType = document.getElementById('listTypeDropdown').value;
    const offset = listType === 'legacy_levels' ? 100 : 0;
    
    const payload = {
        listType: listType,
        changes: changedLevels.map(change => ({ 
            ...change, 
            newRanking: change.newRanking + offset
        }))
    };

    fetch(`${API_URL}/rest/update-levels-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            toastr.success('Changes saved successfully!'); // Toastr success notification
            changedLevels = []; // Reset the changes array

            // Update the initialOrder to reflect the current order
            const levelsContainer = document.getElementById('levelsTable').querySelector('tbody');
            initialOrder = Array.from(levelsContainer.children).map(row => row.querySelector('.editButton').dataset.levelId);
            fetchMainListLevels(endpoint); // Refresh the levels list

        } else {
            toastr.error('Error saving changes.'); // Toastr error notification
        }
    })
    .catch(error => {
        console.error('Error saving changes:', error);
        console.log(endpoint)
        toastr.error('Error saving changes.'); // Toastr error notification
    });
}
function saveLevelChanges(levelId) {
    const updatedName = document.getElementById('editModalName').value;
    const updatedID = document.getElementById('editModalID').value;
    const updatedCreator = document.getElementById('editModalCreator').value;
    const updatedVerifier = document.getElementById('editModalVerifier').value;
    const updatedLink = document.getElementById('editModalLink').value;

    const updatedData = {
        listType: document.getElementById('listTypeDropdown').value,
        id: updatedID,
        title: updatedName,
        creator: updatedCreator,
        verifier: updatedVerifier,
        link: updatedLink
    };

    fetch(`${API_URL}/rest/update-level`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify(updatedData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            toastr.success('Level updated successfully!');
            // Refresh the levels list or make other UI updates as needed
        } else {
            toastr.error('Error updating level.');
        }
    })
    .catch(error => {
        console.error('Error updating level:', error);
        toastr.error('Error updating level.');
    });
}


function openEditModal(levelId) {
    // Retrieve the data from the existing data
    const levelData = {
        title: levelNames[levelId],
        id: levelId,
        creator: document.querySelector(`[data-level-id="${levelId}"]`).closest('tr').children[4].textContent,
        verifier: document.querySelector(`[data-level-id="${levelId}"]`).closest('tr').children[5].textContent,
        link: document.querySelector(`[data-level-id="${levelId}"]`).closest('tr').children[1].querySelector('a').href
    };

    // Populate the modal with the level data
    document.getElementById('editModalTitle').innerText = `Edit ${levelData.title}`;
    document.getElementById('editModalName').value = levelData.title;
    document.getElementById('editModalID').value = levelData.id;
    document.getElementById('editModalCreator').value = levelData.creator;
    document.getElementById('editModalVerifier').value = levelData.verifier;
    document.getElementById('editModalLink').value = levelData.link;

    // Add an event listener to the save button in the modal
    document.getElementById('editModalSaveBtn').addEventListener('click', function() {
        saveLevelChanges(levelId);
    });

    // Open the modal
    $('#editModal').modal('show');
}
function openRemoveModal(levelId) {
    const listType = document.getElementById('listTypeDropdown').value;
    
    let modalMessage;
    switch (listType) {
        case 'mainlist':
            modalMessage = "Are you sure you want to move this level to the removed levels list? This cannot be undone.";
            break;
        case 'legacy_levels':
        case 'removed_levels':
            modalMessage = "Are you sure you want to permanently delete this level? This cannot be undone.";
            break;
        default:
            console.error('Unknown list type:', listType);
            return;
    }

    document.getElementById('removeModalConfirmBtn').addEventListener('click', function() {
        removeLevel(levelId);
        $('#removeModal').modal('hide'); // Close the modal
    });

    // Set the modal message
    document.getElementById('removeModalMessage').textContent = modalMessage;

    // Open the modal
    $('#removeModal').modal('show');
}

function updateRankingsAfterRemoval() {
    const listType = document.getElementById('listTypeDropdown').value;
    const offset = listType === 'legacy_levels' ? 100 : 0; // Add this line

    fetch(`${API_URL}/rest/${listType}`)
    .then(response => response.json())
    .then(data => {
        // Sort the data based on the ranking
        data.sort((a, b) => a.ranking - b.ranking);
        
        // Create an array of changes to send to the backend
        const changes = [];
        for (let i = 0; i < data.length; i++) {
            const level = data[i];
            const adjustedRanking = i + 1 + offset; // Adjust the ranking here
            if (level.ranking !== adjustedRanking) {
                changes.push({
                    id: level.id,
                    newRanking: adjustedRanking
                });
            }
        }

        // Send the changes to the backend
        if (changes.length > 0) {
            fetch(`${API_URL}/rest/update-levels-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: JSON.stringify({
                    changes: changes,  // Send the changes array
                    listType: listType  // Send the listType
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    toastr.success('Levels order updated successfully!');
                } else {
                    toastr.error('Error updating levels order.');
                }
            })
            .catch(error => {
                console.error('Error updating levels order:', error);
                console.log(endpoint)
                toastr.error('Error updating levels order.');
            });
        }
    })
    .catch(error => {
        console.error('Error fetching main list levels:', error);
    });
}

function removeLevel(levelId) {
    const listType = document.getElementById('listTypeDropdown').value;
    
    let endpoint;
    switch (listType) {
        case 'mainlist':
            endpoint = '/rest/remove-level';
            break;
        case 'legacy_levels':
            endpoint = '/rest/delete-level';
            break;
        case 'removed_levels':
            endpoint = '/rest/delete-removed-level';
            break;
        default:
            console.error('Unknown list type:', listType);
            return;
    }

    fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify({ id: levelId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            toastr.success('Level removed successfully!');
            if (listType !== 'removed_levels') {
                updateRankingsAfterRemoval();
            }
        } else {
            toastr.error('Error removing level.');
        }
    })
    .catch(error => {
        console.error('Error removing level:', error);
        toastr.error('Error removing level.');
    });
}





function checkAdminStatus() {
    const token = localStorage.getItem('userToken');
    if (!token) {
        displayNotAdminMessage();
        return;
    }

    fetch(`${API_URL}/rest/users`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.permission_level > 0) {
            displayAdminPanel();
        } else {
            displayNotAdminMessage();
        }
    })
    .catch(error => {
        console.error('Error fetching user details:', error);
        displayNotAdminMessage();
    });
}

function displayAdminPanel() {
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('notAdminMessage').style.display = 'none';
}

function displayNotAdminMessage() {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('notAdminMessage').style.display = 'block';
}
function openSaveChangesModal() {
    // Set modal title and body content
    document.getElementById('genericModalTitle').innerText = 'Save Changes';

    let changesContent = '';
    changedLevels.forEach(level => {
        changesContent += `<p>${level.message}</p>`;
    });

    document.getElementById('genericModalBody').innerHTML = changesContent;

    // Set primary button action
    const primaryBtn = document.getElementById('genericModalPrimaryBtn');
    primaryBtn.innerText = 'Save';
    primaryBtn.onclick = function() {
        saveChangesToBackend();
        $('#genericModal').modal('hide'); // Close the modal
    };

    // Open the modal
    $('#genericModal').modal('show');
}

function getVideoID(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^\/]+)|youtube\.com\/watch\?v=([^&]+)/;
    const matches = url.match(regex);
    return (matches && (matches[1] || matches[2])) || '';
}

function getThumbnailFromLink(link) {
    const videoID = getVideoID(link);
    return `https://img.youtube.com/vi/${videoID}/mqdefault.jpg`;
}
function updateDisplayedRankings() {
    const rows = document.getElementById('levelsTable').querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
        const rankingCell = row.querySelector('td:first-child');
        rankingCell.textContent = `#${index + 1}`;
    });
}
function fetchMainListLevels(endpoint) {
    //reusing function to fetch from whatever list needed
    fetch(`${API_URL}${endpoint}`)
    .then(response => response.json())
    .then(data => {
        displayLevels(data);
    })
    .catch(error => {
        console.error(`Error fetching ${listType} levels:`, error);
    });
}
function displayLevels(data) {
    const levelsTable = document.getElementById('levelsTable');
    const levelsContainer = levelsTable.querySelector('tbody');

    // Clear the content of the tbody
    levelsContainer.innerHTML = '';

    // Sort the data based on the ranking
    data.sort((a, b) => a.ranking - b.ranking);

    // Store the initial order
    initialOrder = data.map(listItem => listItem.id);

    data.forEach((listItem, index) => {
        originalRankings[listItem.id] = listItem.ranking;
        levelNames[listItem.id] = listItem.title;

        const thumbnail = getThumbnailFromLink(listItem.link);
        levelsContainer.insertAdjacentHTML("beforeend", `
            <tr>
                <td>#${index + 1}</td> <!-- Display the ranking based on the current order -->
                <td>
                    <a href="${listItem.link}" target="_blank">
                        <img class="list-image" src="${thumbnail}" alt="Level thumbnail" width="50">
                    </a>
                </td>
                <td>${listItem.title}</td>
                <td>${listItem.id}</td>
                <td>${listItem.creator}</td>
                <td>${listItem.verifier}</td>
                <td>
                <div class="button-container">
                <button class="btn btn-light editButton" data-level-id="${listItem.id}">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="btn btn-danger removeButton" data-level-id="${listItem.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            
</td>
    
            </tr>
        `);
    });
    document.querySelectorAll('.editButton').forEach(button => {
        button.addEventListener('click', function() {
            const levelId = this.dataset.levelId;
            openEditModal(levelId);
        });
    });
    document.querySelectorAll('.removeButton').forEach(button => {
        button.addEventListener('click', function() {
            const levelId = this.dataset.levelId;
            openRemoveModal(levelId);
        });
    });
    
    // Initialize Sortable on the table body
    new Sortable(levelsContainer, {
        animation: 150,
        onUpdate: function(evt) {
            const currentOrder = Array.from(evt.from.children).map(row => row.querySelector('.editButton').dataset.levelId);
            generateChangeMessages(initialOrder, currentOrder);
            updateDisplayedRankings();
        }
    });
}
function generateChangeMessages(oldOrder, newOrder) {
    changedLevels = []; // Clear previous changes

    for (let i = 0; i < oldOrder.length; i++) {
        if (oldOrder[i] !== newOrder[i]) {
            const movedLevelName = levelNames[newOrder[i]];
            const originalPosition = oldOrder.indexOf(newOrder[i]) + 1;
            const newPosition = i + 1;

            let message;
            if (originalPosition < newPosition) {
                message = `${movedLevelName} was moved down from ${originalPosition} --> ${newPosition}`;
            } else {
                message = `${movedLevelName} was moved up from ${originalPosition} --> ${newPosition}`;
            }
            changedLevels.push({ id: newOrder[i], newRanking: newPosition, message });
        }
    }
}
function handlePendingLevelsSection() {
    fetchPendingLevels();

    function fetchPendingLevels() {
        fetch(`${API_URL}/rest/pending-levels`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            displayPendingLevels(data);
        })
        .catch(error => {
            console.error('Error fetching pending levels:', error);
        });
    }
    
    function displayPendingLevels(data) {
        const pendingLevelsContainer = document.getElementById('levelsTable').querySelector('tbody');
        pendingLevelsContainer.innerHTML = ''; // Clear any previous data
    
        data.forEach(listItem => {
            pendingLevelsContainer.insertAdjacentHTML("beforeend", `
                <tr>
                    <td>${listItem.title}</td>
                    <td>${listItem.id}</td>
                    <td>${listItem.creator}</td>
                    <td>${listItem.verifier}</td>
                    <td><a href="${listItem.link}" target="_blank">Verification Video</a></td>
                    <td>
    <div class="button-container">
        <button class="btn btn-success acceptButton" data-level-id="${listItem.id}">Accept</button>
        <button class="btn btn-danger declineButton" data-level-id="${listItem.id}">Decline</button>
    </div>
</td>

                </tr>
            `);
        });

        document.querySelectorAll('.acceptButton').forEach(button => {
            button.addEventListener('click', function() {
                const levelId = this.dataset.levelId;
                acceptPendingLevel(levelId);
            });
        });

        document.querySelectorAll('.declineButton').forEach(button => {
            button.addEventListener('click', function() {
                const levelId = this.dataset.levelId;
                declinePendingLevel(levelId);
            });
        });
    }

    function acceptPendingLevel(levelId) {
        // Open the placement modal
        openPlacementModal(levelId);
    }
    function openPlacementModal(levelId) {
        // Fetch the main list data
        fetch(`${API_URL}/rest/mainlist`)
        .then(response => response.json())
        .then(mainListData => {
            const mainListContainer = document.createElement('div');
            
            // Sort the main list data based on the ranking
            mainListData.sort((a, b) => a.ranking - b.ranking);
    
            mainListData.forEach((listItem, index) => {
                mainListContainer.insertAdjacentHTML("beforeend", `
                    <div class="level-entry">
                        <span>#${index + 1} - ${listItem.title}</span>
                        <button class="btn btn-light placeHereButton" data-index="${index}">Place Here</button>
                    </div>
                `);
            });
    
            document.getElementById('genericModalBody').innerHTML = '';
            document.getElementById('genericModalBody').appendChild(mainListContainer);
            document.getElementById('genericModalTitle').innerText = 'Choose Placement for Level';
    
            // Add event listeners to the "Place Here" buttons
            document.querySelectorAll('.placeHereButton').forEach(button => {
                button.addEventListener('click', function() {
                    const placementIndex = parseInt(this.dataset.index);
                    finalizeAcceptance(levelId, placementIndex + 1); // +1 because we want to place it after the chosen index
                    $('#genericModal').modal('hide'); // Close the modal
                });
            });
    
            // Hide the primary button
            document.getElementById('genericModalPrimaryBtn').style.display = 'none';
    
            // Open the modal
            $('#genericModal').modal('show');
        })
        .catch(error => {
            console.error('Error fetching main list levels:', error);
        });
    }
    
    
    

    function declinePendingLevel(levelId) {
        const confirmation = window.confirm("Are you sure you want to decline this level? This cannot be undone.");
        
        if (!confirmation) {
            return; // Exit the function if the user clicks "Cancel"
        }
    
        const token = localStorage.getItem('userToken');
        
        const params = new URLSearchParams({
            id: levelId,
            passed: "false",
            ranking: "1", // This value doesn't matter when declining
        });
    
        fetch(`${API_URL}/rest/pending-levels?${params.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                toastr.success('Level declined successfully!');
                fetchPendingLevels(); // Refresh the pending levels list
            } else {
                toastr.error('Error declining level.');
            }
        })
        .catch(error => {
            console.error('Error declining level:', error);
            toastr.error('Error declining level.');
        });
    }
        
    function finalizeAcceptance(levelId, placementIndex) {
        // First, insert the accepted level with its new ranking
        insertAcceptedLevel(levelId, placementIndex);
    
        // Update the initialOrder array to include the accepted level
        initialOrder.splice(placementIndex - 1, 0, levelId); // Insert the levelId at the specified index
    
        // Adjust the rankings of all levels starting from the placementIndex
        const changes = [];
        for (let i = 0; i < initialOrder.length; i++) {
            const movedLevelId = initialOrder[i];
            changes.push({
                id: movedLevelId,
                newRanking: i + 1 // Adjust the ranking to be continuous
            });
        }            
    
        // Send the changes to the backend
        fetch(`${API_URL}/rest/update-levels-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: JSON.stringify({
                changes: changes,  // Send the changes array
                listType: 'mainlist'  // Assuming you're updating the mainlist. Adjust if needed.
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                toastr.success('Levels order updated successfully!');
                fetchMainListLevels(endpoint); // Refresh the levels list
            } else {
                toastr.error('Error updating levels order.');
            }
        })
        .catch(error => {
            console.error('Error updating levels order:', error);
            console.log(endpoint)
            toastr.error('Error updating levels order.');
        });
    }
    function insertAcceptedLevel(levelId, ranking) {
        const token = localStorage.getItem('userToken');
        const params = new URLSearchParams({
            id: levelId,
            passed: "true",
            ranking: ranking,
            token: token
        });
        
        fetch(`${API_URL}/rest/pending-levels?${params.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }            
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                toastr.success('Level accepted and placed successfully!');
                fetchPendingLevels(); // Refresh the pending levels list
            } else {
                toastr.error('Error accepting and placing level.');
            }
        })
        .catch(error => {
            console.error('Error accepting and placing level:', error);
            toastr.error('Error accepting and placing level.');
        });
    }
    
    
    
}

// Call the function when the Levels button is clicked
function fetchLegacyLevels() {
    fetch(`${API_URL}/rest/legacy_levels`)
    .then(response => response.json())
    .then(data => {
        displayLevels(data);
    })
    .catch(error => {
        console.error('Error fetching legacy levels:', error);
    });
}

function fetchRemovedLevels() {
    fetch(`${API_URL}/rest/removed_levels`)
    .then(response => response.json())
    .then(data => {
        displayLevels(data);
    })
    .catch(error => {
        console.error('Error fetching removed levels:', error);
    });
}


function handleLevelsSection() {
    const listType = document.getElementById('listTypeDropdown').value;
    // Hide the switcher between "Main list", "Legacy levels", and "Removed levels"
  const listTypeDropdown = document.getElementById('listTypeDropdown');
  listTypeDropdown.style.display = 'block';

    // Fetch the appropriate list based on the dropdown value
    let endpoint;
    let headers = [];
    switch (listType) {
        case 'mainlist':
            endpoint = '/rest/mainlist';
            headers = ['Ranking', 'Thumbnail', 'Title', 'ID', 'Creator', 'Verifier', 'Actions'];
            break;
        case 'legacy_levels':
            endpoint = '/rest/legacy_levels';
            headers = ['Ranking', 'Thumbnail', 'Title', 'ID', 'Creator', 'Verifier', 'Actions'];
            break;
        case 'removed_levels':
            endpoint = '/rest/removed_levels';
            headers = ['Ranking','Thumbnail', 'Title', 'ID', 'Creator', 'Verifier', 'Actions'];
            break;
        case 'pending_levels':
            endpoint = '/rest/pending-levels';
            headers = ['Title', 'ID', 'Creator', 'Verifier', 'Link', 'Actions'];
            break;
        default:
            console.error('Unknown list type:', listType);
            return;
    }
    const thead = document.querySelector('#levelsTable thead tr');
    thead.innerHTML = headers.map(header => `<th>${header}</th>`).join('');
    const table = document.getElementById('levelsTable');
    if (listType === 'pending_levels') {
        handlePendingLevelsSection();
        return;
    }


    fetch(`${API_URL}${endpoint}`)
    .then(response => response.json())
    .then(data => {
        displayLevels(data);
    })
    .catch(error => {
        console.error(`Error fetching ${listType} levels:`, error);
    });
}
