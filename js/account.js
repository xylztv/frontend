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
            return levelsData.filter(level => level.creator === gdUsername);
        } else {
            throw new Error('Failed to fetch user created levels');
        }
    } catch (error) {
        console.error('Error fetching user created levels:', error);
        toastr.error('Failed to fetch Geometry Dash levels.');
    }
}

async function fetchUserRecords(gdUsername) {
    try {
        const response = await fetch(`${API_URL}/rest/records`);
        if (response.ok) {
            const recordsData = await response.json();
            const challengesData = await GetChallenges();
            return recordsData.filter(record => record.player === gdUsername).map(record => {
                const challenge = challengesData[record.level_id];
                return {
                    id: record.level_id,
                    name: challenge ? challenge.name : 'Unknown',
                    progress: record.percent,
                    verified: challenge ? challenge.verifier === gdUsername : false,
                    link: record.link,
                    points: GetPoints(challenge ? challenge.rank : 0, parseInt(record.percent)),
                    rank: challenge ? challenge.rank : 'Unknown'
                };
            }).sort((a, b) => parseFloat(b.points) - parseFloat(a.points)); // Sort records by points
        } else {
            throw new Error('Failed to fetch user records');
        }
    } catch (error) {
        console.error('Error fetching user records:', error);
        toastr.error('Failed to fetch Geometry Dash records.');
    }
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
                    <td><span class="badge ${getBadgeClassForPoints(record.points)}">${record.points.toFixed(2)}</span>${record.verified ? '<span class="badge badge-success">VERIFIER</span>' : ''}</td>
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
function getBadgeClassForPoints(points) {
    if (points >= 200) {
        return 'badge-success';
    } else if (points >= 100) {
        return 'badge-info';
    } else {
        return;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchUserDetails();
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
                        throw new Error("Failed to generate verification comment.");
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
                    throw new Error(data.errorMessage || "Verification failed.");
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

// Additional event listener for the Geometry Dash account link button
document.getElementById('linkGdAccountBtn').addEventListener('click', function() {
    // Implementation depends on how you plan to link Geometry Dash accounts
    // Example:
    // window.location.href = '/link-gd-account.html';
});
