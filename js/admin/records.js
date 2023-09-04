import { API_URL } from "../config.js";
let mainlistLevels = [];
const userToken = localStorage.getItem('userToken');
function loadMainlistLevels(token) {
    fetch(`${API_URL}/rest/mainlist`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(levels => {
        mainlistLevels = levels;
    });
}

// Call this function once after the user logs in or as part of an initial setup
loadMainlistLevels(userToken);

function handleRecordsSection(token, endpoint) {
    if (endpoint === '/rest/records') {
        loadRecords(token);
    } else if (endpoint === '/rest/pending-records') {
        loadPendingRecords(token);
    } else {
        console.error("Unknown endpoint:", endpoint);
    }
}


function loadRecords(token) {
    fetch(`${API_URL}/rest/records`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(records => {
        const recordsTable = document.getElementById("levelsTable");
        recordsTable.innerHTML = `
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Records Count</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = recordsTable.querySelector('tbody');

        let groupedByPlayer = {};

        records.forEach(record => {
            if (!groupedByPlayer[record.player]) {
                groupedByPlayer[record.player] = [];
            }
            groupedByPlayer[record.player].push(record);
        });

        for (let player in groupedByPlayer) {
            const playerRow = document.createElement('tr');
            playerRow.innerHTML = `
                <td><a href="#" data-records='${JSON.stringify(groupedByPlayer[player])}' onclick="displayPlayerDetailedRecords('${player}')">${player}</a></td>
                <td>${groupedByPlayer[player].length}</td>
            `;
            tbody.appendChild(playerRow);
        }
        
        
        
    });
}
function deleteRecord(encodedRecord) {
    const record = JSON.parse(decodeURIComponent(atob(encodedRecord)));
    const levelInfo = mainlistLevels.find(level => level.id === record.level_id);
    
    const deleteModal = document.getElementById('deleteUserModal');
    const deleteModalUsername = document.getElementById('deleteModalUsername');
    const deleteUserModalConfirmBtn = document.getElementById('deleteUserModalConfirmBtn');
    
    // Update the deleteModalUsername only if levelInfo exists
    if (levelInfo) {
        deleteModalUsername.textContent = levelInfo.title;
    } else {
        deleteModalUsername.textContent = "Unknown Record";
    }

    // Clear previous event listeners
    const clonedConfirmBtn = deleteUserModalConfirmBtn.cloneNode(true);
    deleteUserModalConfirmBtn.replaceWith(clonedConfirmBtn);

    // Add new event listener
    clonedConfirmBtn.addEventListener('click', function () {
        // Proceed with deletion once the user confirms
        const token = localStorage.getItem('userToken');
        fetch(`${API_URL}/rest/admin/deleteRecord`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ link: record.link })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                toastr.success(result.message || "Record deleted successfully.");
                handleRecordsSection(userToken, '/rest/records');  // Refresh the records
            } else {
                toastr.error(result.message || "Failed to delete the record.");
            }
        })
        .catch(error => {
            toastr.error("An error occurred while processing your request.");
            console.error(error);
        });

        // Close the modal after the delete request
        $(deleteModal).modal('hide');
    });

    // Show the modal to ask for confirmation
    $(deleteModal).modal('show');
}


window.deleteRecord = deleteRecord;
  
function displayPlayerDetailedRecords(player) {
    const playerLink = document.querySelector(`[data-records][onclick="displayPlayerDetailedRecords('${player}')"]`);
    if (!playerLink) return;
    const records = JSON.parse(playerLink.getAttribute('data-records'));
    const recordsTable = document.getElementById("levelsTable");
    recordsTable.innerHTML = `
        <thead>
            <tr>
                <th>Level Name</th>
                <th>Percentage</th>
                <th>Link</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = recordsTable.querySelector('tbody');
    
    records.sort((a, b) => {
        const levelInfoA = mainlistLevels.find(level => level.id === a.level_id);
        const levelInfoB = mainlistLevels.find(level => level.id === b.level_id);
    
        const rankingA = levelInfoA ? levelInfoA.ranking : Infinity;
        const rankingB = levelInfoB ? levelInfoB.ranking : Infinity;
    
        return rankingA - rankingB;
    });
    
    const unknownLevelsOnly = records.every(record => !mainlistLevels.some(level => level.id === record.level_id));
    
    records.forEach(record => {
        const levelInfo = mainlistLevels.find(level => level.id === record.level_id);
    
        // If the levelInfo exists or if there are only unknown levels, then create and append the row
        if (levelInfo || unknownLevelsOnly) {
            let recordRow = document.createElement('tr');
            recordRow.innerHTML = `
                <td>${levelInfo ? levelInfo.title : "Unknown Level"}</td>
                <td>${record.percent}</td>
                <td><a href="${record.link}" target="_blank">View</a></td>
                <td><button class="btn btn-danger" onclick="deleteRecord('${encodeJSON(record)}')">Delete</button></td>
            `;
            tbody.appendChild(recordRow);
        }
    });
    
    
}
function encodeJSON(obj) {
    return btoa(encodeURIComponent(JSON.stringify(obj)));
}
function openReviewModal(encodedRecord) {
    const record = JSON.parse(decodeURIComponent(atob(encodedRecord)));
    currentRecord = record;
    console.log(currentRecord);
    const level = mainlistLevels.find(level => level.id === record.level_id);
    
    const levelTitleElement = document.getElementById('levelTitle');
    const youtubeEmbedElement = document.getElementById('youtubeEmbed');
    const recordInfoElement = document.getElementById('recordInfo');

    if (level) {
        levelTitleElement.textContent = level.title;
        levelTitleElement.style.color = ''; // Reset the color
        levelTitleElement.style.fontWeight = ''; // Reset the font weight
    } else {
        levelTitleElement.textContent = "This level has been removed/is no longer on the mainlist.";
        levelTitleElement.style.color = 'red'; // Set color to red
        levelTitleElement.style.fontWeight = 'bold'; // Set font weight to bold
    }

    youtubeEmbedElement.src = `https://www.youtube.com/embed/${getYouTubeVideoId(record.link)}`;
    recordInfoElement.textContent = `
        Player: ${record.player || "N/A"}
        Percentage: ${record.percent || "N/A"}
        Publisher: ${record.publisher || "Unknown"}
    `;
    $('#reviewModal').modal('show');
}

function loadPendingRecords(token) {
  fetch(`${API_URL}/rest/pending-records`, {
      headers: {
          "Authorization": `Bearer ${token}`
      }
  })
  .then(response => response.json())
  .then(records => {
      const recordsTable = document.getElementById("levelsTable");
      recordsTable.innerHTML = `
          <thead>
              <tr>
                  <th>Player</th>
                  <th>Percentage</th>
                  <th>Level ID</th>
                  <th>Publisher</th>
                  <th>Actions</th>
              </tr>
          </thead>
          <tbody></tbody>
      `;

      const tbody = recordsTable.querySelector('tbody');

      if (records.length === 0) {
          const row = document.createElement('tr');
          const cell = document.createElement('td');
          cell.textContent = 'There are no pending records at the moment.';
          cell.setAttribute('colspan', '5');
          row.appendChild(cell);
          tbody.appendChild(row);
      } else {
          records.forEach(record => {
              const row = document.createElement('tr');
              row.innerHTML = `
              <td>${record.player || "N/A"}</td>
              <td>${record.percent || "N/A"}</td>
              <td>${record.level_id || "N/A"}</td>
              <td>${record.publisher || "Unknown"}</td>
              <td>
          <button class="btn btn-primary" onclick='openReviewModal("${encodeJSON(record)}")'>Review</button>
          </td>
              `;
              tbody.appendChild(row);
          });    
      }
  });
}
let currentRecord = null;

function getYouTubeVideoId(url) {
    const regex = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    const match = url.match(regex);
    return (match && match[7].length == 11) ? match[7] : false;
}



function buildQueryString(params) {
    return Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
}

function acceptRecord() {
    const token = localStorage.getItem('userToken');
    if (!currentRecord) {
        console.error("Current record is null or undefined");
        toastr.error("Error: Current record is null or undefined");
        return;
    }

    const params = {
        link: currentRecord.link,
        passed: "true"
    };
    
    const queryString = buildQueryString(params);

    fetch(`${API_URL}/rest/pending-records?${queryString}`, {
      method: "POST",
      headers: {
          "Authorization": `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            toastr.success(result.message || "Record accepted successfully.");
            const youtubeEmbedElement = document.getElementById('youtubeEmbed');
            youtubeEmbedElement.src = '';
            $('#reviewModal').modal('hide');
            loadPendingRecords(token);
        } else {
            toastr.error(result.message || "Failed to accept the record.");
        }
    })
    .catch(error => {
        toastr.error("An error occurred while processing your request.");
        console.error(error);
    });
}

function denyRecord() {
    const token = localStorage.getItem('userToken');
    if (!currentRecord) {
        console.error("Current record is null or undefined");
        toastr.error("Error: Current record is null or undefined");
        return;
    }

    const params = {
        link: currentRecord.link,
        passed: "false"
    };
    
    const queryString = buildQueryString(params);

    fetch(`${API_URL}/rest/pending-records?${queryString}`, {
      method: "POST",
      headers: {
          "Authorization": `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            toastr.success(result.message || "Record denied successfully.");
            const youtubeEmbedElement = document.getElementById('youtubeEmbed');
            youtubeEmbedElement.src = '';
            $('#reviewModal').modal('hide');
            loadPendingRecords(token);
        } else {
            toastr.error(result.message || "Failed to deny the record.");
        }
    })
    .catch(error => {
        toastr.error("An error occurred while processing your request.");
        console.error(error);
    });
}


function showExpandedSection(title) {
  adminPanel.style.display = 'none';
  expandedSection.style.display = 'block';
  listTypeDropdown.style.display = 'none';
  recordTypeDropdown.style.display = 'block';
  saveChangesButton.style.display = 'none';
  sectionTitle.textContent = title;
}
const recordTypeDropdown = document.getElementById('recordTypeDropdown');
if (recordTypeDropdown) {
    recordTypeDropdown.addEventListener('change', function(e) {
        switch (e.target.value) {
            case 'records':
                handleRecordsSection(userToken, '/rest/records');
                break;
            case 'pending_records':
                handleRecordsSection(userToken, '/rest/pending-records');
                break;
            default:
                console.error('Unknown record type:', e.target.value);
                return;
        }
    });
}

const recordsButton = document.getElementById('recordsButton');
recordsButton.addEventListener('click', function () {
    showExpandedSection('Records');
    if (recordTypeDropdown) {
        switch(recordTypeDropdown.value) {
            case 'records':
                handleRecordsSection(userToken, '/rest/records');
                break;
            case 'pending_records':
                handleRecordsSection(userToken, '/rest/pending-records');
                break;
            default:
                console.error('Unknown record type:', recordTypeDropdown.value);
                return;
        }
    } else {
        handleRecordsSection(userToken, '/rest/pending-records'); // Default endpoint
    }
});
window.displayPlayerDetailedRecords = displayPlayerDetailedRecords;
window.openReviewModal = openReviewModal;
window.acceptRecord = acceptRecord;
window.denyRecord = denyRecord;
window.currentRecord = currentRecord;