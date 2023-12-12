import { API_URL } from "./config.js";
import { GetChallenges, GetPoints } from './leaderboard.js';
let verificationComment = "";


async function fetchUserDetails() {
    try {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            const userData = JSON.parse(storedUserData);
            displayUserDetails(userData);
        } else {
            const response = await fetch(`${API_URL}/rest/users`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                localStorage.setItem('userData', JSON.stringify(userData));
                displayUserDetails(userData);
            } else {
                throw new Error('Failed to fetch user details');
            }
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
        toastr.error('Failed to fetch account details.');
    }
}
async function fetchUserCreatedLevels(gdUsername) {
    try {
        const response = await fetch(`${API_URL}/rest/mainlist`);
        if (response.ok) {
            const levelsData = await response.json();
            return levelsData.filter(level => level.creator === gdUsername).sort((a, b) => a.ranking - b.ranking);
        } else {
            throw new Error('Failed to fetch user created levels');
        }
    } catch (error) {
        console.error('Error fetching user created levels:', error);
        toastr.error('Failed to fetch Geometry Dash levels.');
    }
}

async function fetchUserRecords(gdUsername) {
    const [recordsResponse, mainlistResponse] = await Promise.all([
        fetch(`${API_URL}/rest/records`),
        fetch(`${API_URL}/rest/mainlist`)
    ]);

    if (!recordsResponse.ok || !mainlistResponse.ok) {
        console.error('Error fetching user records');
        toastr.error('Failed to fetch Geometry Dash records.');
        return;
    }

    const [recordsData, mainlistData] = await Promise.all([
        recordsResponse.json(),
        mainlistResponse.json()
    ]);

    const challengesData = await GetChallenges();
    const records = [];

    for (const record of recordsData) {
        if (record.player !== gdUsername || !challengesData.hasOwnProperty(record.level_id)) continue;
        const challenge = challengesData[record.level_id];
        records.push({
            id: record.level_id,
            name: challenge ? challenge.name : 'Unknown',
            progress: record.percent,
            verified: challenge ? challenge.verifier === gdUsername : false,
            link: record.link,
            points: GetPoints(challenge ? challenge.rank : 0, parseInt(record.percent)),
            rank: challenge ? challenge.rank : 'Unknown'
        });
    }

    for (const level of mainlistData) {
        if (level.verifier !== gdUsername || !challengesData.hasOwnProperty(level.id)) continue;
        const challenge = challengesData[level.id];
        records.push({
            id: level.id,
            name: challenge ? challenge.name : 'Unknown',
            progress: "100%",
            verified: true,
            link: level.link,
            points: GetPoints(challenge ? challenge.rank : 0, 100),
            rank: challenge ? challenge.rank : 'Unknown'
        });
    }

    records.sort((a, b) => parseFloat(b.points) - parseFloat(a.points)); // Sort records by points
    return records;
}

function displayUserDetails(data) {
    document.getElementById('usernameDisplay').innerText = data.username;

    const gdUsernameDisplay = document.getElementById('gdUsernameDisplay');
    const linkGdAccountBtn = document.getElementById('linkGdAccountBtn');
    const unlinkGdAccountBtn = document.getElementById('unlinkGdAccountBtn');

    if (data.permission_level >= 1) {
        document.getElementById('adminTag').style.display = 'inline';
        document.getElementById('adminPanelBtn').style.display = 'inline-block';
    }

    if (data.gdusername) {
        gdUsernameDisplay.innerText = data.gdusername;
        linkGdAccountBtn.style.display = 'none';
        unlinkGdAccountBtn.style.display = 'block';
        gdRecordsField.style.display = 'block';
        gdLevelsField.style.display = 'block'
        // Fetch and display user records
        fetchUserRecords(data.gdusername).then(records => {
            const recordsContainer = document.getElementById('gdRecordsContainer');
            recordsContainer.innerHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Level</th>
                            <th>Progress</th>
                            <th>Points</th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            `;
            const tbody = recordsContainer.querySelector('tbody');
            records.forEach(record => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><a href="${record.link}" target="_blank" style="color: inherit; text-decoration: none;">${record.name} (#${record.rank})</a></td>
                    <td><span class="badge ${getBadgeClassForPercentage(record.progress)}">${record.progress}</span></td>
                    <td><span style="font-size: 0.8em;">${record.points.toFixed(2)}</span>${record.verified ? '<span class="badge badge-success" style="margin-left: 5px; background-color: #e795b7;">VERIFIER</span>' : ''}</td>
                `;
                tbody.appendChild(row);
            });
        });

        // Fetch and display user created levels
        fetchUserCreatedLevels(data.gdusername).then(levels => {
            const levelsContainer = document.getElementById('gdCreatedLevelsContainer');
            levelsContainer.innerHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Level</th>
                            <th>Ranking</th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            `;
            const tbody = levelsContainer.querySelector('tbody');
            levels.forEach(level => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><a href="${level.link}" target="_blank" style="color: inherit; text-decoration: none;">${level.title}</a></td>
                    <td>${level.ranking}</td>
                `;
                tbody.appendChild(row);
            });
        });
    } else {
        gdUsernameDisplay.innerText = '';
        linkGdAccountBtn.style.display = 'block';
        unlinkGdAccountBtn.style.display = 'none';
        gdRecordsField.style.display = 'none';
        gdLevelsField.style.display = 'none'
    }

    const isoDate = data.joinDate;
    const date = new Date(isoDate);
    const formattedDate = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    document.getElementById('joinDateDisplay').innerText = formattedDate;
}

function getBadgeClassForPercentage(percentage) {
    const value = parseInt(percentage);
    if (value >= 90) {
        return 'badge-success';
    } else if (value >= 70) {
        return 'badge-warning';
    } else {
        return 'badge-danger';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchUserDetails();
    fetchUserFlag();
    let countryCodes = {};

    // Fetch the list of country codes when the page loads
    fetch('https://flagcdn.com/en/codes.json')
    .then(response => response.json())
    .then(data => {
        countryCodes = data;
    });
    document.getElementById('removeFlagBtn').addEventListener('click', function() {
        updateFlag('');
    });
    document.getElementById('flagSearch').addEventListener('input', function(event) {
        const query = event.target.value.toLowerCase();
        const flags = document.querySelectorAll('#flagContainer img');
        flags.forEach(flag => {
            const countryCode = flag.dataset.countryCode;
            const countryName = countryCodes[countryCode];
            if (countryName && countryName.toLowerCase().includes(query)) {
                flag.style.display = '';
            } else {
                flag.style.display = 'none';
            }
        });
    });
    flagIcon.onclick = loadFlagsIntoModal;
    document.getElementById('verifyGdUsernameBtn').addEventListener('click', async function() {
        const gdUsername = document.getElementById('gdUsername').value;
        if (gdUsername) {
            try {
                // First validate the GD username
                const validationResponse = await fetch(`${API_URL}/validateUsername?username=${encodeURIComponent(gdUsername)}`);
                const validationData = await validationResponse.json();
                if (validationData.isValid) {
                    // If valid, proceed to generate the verification comment
                    const commentResponse = await fetch(`${API_URL}/generate-verification-comment`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                        },
                        body: JSON.stringify({ gdUsername })
                    });
                    const commentData = await commentResponse.json();
                    if (commentData.comment) {
                        verificationComment = commentData.comment;
                        
                        const codeElement = document.createElement("code");
                        codeElement.innerText = verificationComment;

                        const copyCodeButton = document.createElement("copy-code-button");
                        copyCodeButton.innerText = "Copy";
                        copyCodeButton.addEventListener("click", async () => {
                            try {
                                await navigator.clipboard.writeText(verificationComment);
                                copyCodeButton.innerText = "Copied!";
                                setTimeout(() => { copyCodeButton.innerText = "Copy" }, 2000);
                            } catch (err) {
                                console.error("Failed to copy text: ", err);
                            }
                        });

                        const preElement = document.createElement("pre");
                        preElement.appendChild(codeElement);
                        preElement.appendChild(copyCodeButton);
                        
                        const verificationInstructions = document.getElementById("verificationInstructions");
                        verificationInstructions.innerText = "Please upload the following comment to your Geometry Dash account:";
                        verificationInstructions.appendChild(preElement);

                        document.getElementById('gdUsernameSection').style.display = 'none';
                        document.getElementById('verificationInstructionsSection').style.display = 'block';
                    } else {
                        throw new Error(commentData.error || "Failed to generate verification comment.");
                    }
                } else {
                    throw new Error(validationData.errorMessage || "Invalid Geometry Dash username.");
                }
            } catch (error) {
                console.error('Error:', error);
                toastr.error(error.message || "An error occurred.");
            }
        } else {
            toastr.error("Please enter a Geometry Dash username.");
        }
    });

    document.getElementById('submitVerificationBtn').addEventListener('click', async function() {
        const gdUsername = document.getElementById('gdUsername').value;
        if (verificationComment) {
            try {
                const response = await fetch(`${API_URL}/verify-gdaccount`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    },
                    body: JSON.stringify({ gdUsername, verificationComment })
                });
                const data = await response.json();
                if (data.verified) {
                    $('#linkGdAccountModal').modal('hide');
                    toastr.success("Geometry Dash account successfully linked!");
                    localStorage.removeItem('userData');
                    fetchUserDetails();
                } else {
                    throw new Error(data.error || "Verification failed.");
                }
            } catch (error) {
                console.error('Error:', error);
                toastr.error(error.message || "An error occurred during verification.");
            }
        } else {
            toastr.error("Verification comment not found. Please start the process again.");
        }
    });
    document.getElementById('unlinkGdAccountBtn').addEventListener('click', async function() {
        try {
            const response = await fetch(`${API_URL}/unlink-gdaccount`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                toastr.success('Geometry Dash account unlinked successfully.');
                localStorage.removeItem('userData');
                fetchUserDetails();
            } else {
                toastr.error(data.message || 'Failed to unlink Geometry Dash account.');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('An error occurred while trying to unlink the account.');
        }
    });

async function loadFlagsIntoModal() {
    const flagContainer = document.getElementById('flagContainer');

    // Clear the flag container
    flagContainer.innerHTML = '';

    // Fetch the list of country codes
    const response = await fetch('https://flagcdn.com/en/codes.json');
    const countryCodes = await response.json();

    // Add each flag to the flag container
    Object.keys(countryCodes).forEach(countryCode => {
        const flagElement = document.createElement('img');
        flagElement.src = `https://flagcdn.com/64x48/${countryCode}.png`;
        flagElement.dataset.countryCode = countryCode;
        flagElement.onclick = selectFlag;
        flagElement.className = 'flag';
        flagElement.style.cursor = 'pointer';
        flagContainer.appendChild(flagElement);
    });

    $('#flagModal').modal('show');
}

function selectFlag(event) {
    const flagElement = event.target;
    const countryCode = flagElement.dataset.countryCode;
    updateFlag(countryCode);
}

function updateFlag(flag) {
    // Get the user token from local storage
    const userToken = localStorage.getItem('userToken');

    // Send the request to the server
    fetch(`${API_URL}/rest/update-flag`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
            flag: flag
        })
    }).then(response => {
        if (!response.ok) {
            throw new Error('Failed to update flag');
        }
        return response.json();
    }).then(data => {
        // The flag was updated successfully.
        toastr.success('Successfully changed flag');
        $('#flagModal').modal('hide'); // Close the modal
        if (flag === '') {
            // If the flag was removed, replace the flag image with the original flag icon
            const flagIcon = document.createElement('i');
            flagIcon.className = 'fas fa-flag';
            flagIcon.id = 'flagIcon';
            flagIcon.dataset.toggle = 'modal';
            flagIcon.dataset.target = '#flagModal';
            flagIcon.onclick = loadFlagsIntoModal;
            flagIcon.style.display = 'inline-block';

            const oldFlagIcon = document.getElementById('flagIcon');
            oldFlagIcon.parentNode.replaceChild(flagIcon, oldFlagIcon);
        } else {
            fetchUserFlag(); // Refresh the flag of the user on the account
        }
    }).catch(error => {
        console.error('Error updating flag:', error);
    });
}
async function fetchUserFlag() {
    // Get the GD account name
    const gdUsername = document.getElementById('gdUsernameDisplay').textContent;

    // Check if the user has a linked GD account
    if (!gdUsername) {
        toastr.error('No linked GD account found.');
        return;
    }

    // Send the request to the server
    const response = await fetch(`${API_URL}/rest/get-flag?gdUsername=${encodeURIComponent(gdUsername)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch flag');
    }
    const data = await response.json();

     // Check if the user has a flag
     if (data.flag) {
        // Create a new flag icon
        const flagIcon = document.createElement('img');
        flagIcon.src = `https://flagcdn.com/24x18/${data.flag}.png`;
        flagIcon.id = 'flagIcon';
        flagIcon.style.marginRight = '10px';
        flagIcon.style.cursor = 'pointer';
        flagIcon.onclick = loadFlagsIntoModal;


        // Replace the old flag icon with the new one
        const oldFlagIcon = document.getElementById('flagIcon');
        oldFlagIcon.parentNode.replaceChild(flagIcon, oldFlagIcon);
    } else {
        // If the user doesn't have a flag, show the flag icon
        document.getElementById('flagIcon').style.display = 'inline-block';
        document.getElementById('flagIcon').style.cursor = 'pointer';
    }
}
});

document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    window.location.href = '/';
});

document.getElementById('changePasswordForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
        toastr.error('New passwords do not match.');
        return;
    }

    fetch(`${API_URL}/rest/change-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify({
            currentPassword: currentPassword,
            newPassword: newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            toastr.success(data.message);
            $('#changePasswordModal').modal('hide');
        } else {
            toastr.error(data.message);
        }
    })
    .catch(error => {
        console.error('Error changing password:', error);
        toastr.error('Failed to change password. Please try again.');
    });
});