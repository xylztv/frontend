import { API_URL } from "../config.js";
let users = [];  // This will store the fetched users
function saveUserChanges() {
  const editModalUsername = document.getElementById('editModalUsername').value;
  const editModalGDe = document.getElementById('editModalGDe').value;
  const editModalPermissionLevel = document.getElementById('editModalPermissionLevel').value;

  const updatedUser = {
      username: editModalUsername,
      gdusername: editModalGDe,
      permission_level: parseInt(editModalPermissionLevel, 10)
  };

  // Send the updated user data to the server
  const userToken = localStorage.getItem('userToken');
  fetch(`${API_URL}/rest/admin/updateUser`, {  // Assuming this is the endpoint to update user data
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`  // Assuming you're using Bearer token for authentication
      },
      body: JSON.stringify(updatedUser)
  })
  .then(response => response.json())
  .then(data => {
      if (data.success) {
          toastr.success('User updated successfully!');
          // Update the UI or re-fetch the users to reflect the changes
          handleUsersSection();
      } else {
          toastr.error('Error updating user.');
      }
  })
  .catch(error => {
      console.error("Error updating user:", error);
      toastr.error('Error updating user.');
  });
}
document.addEventListener('DOMContentLoaded', function () {
  const modalSaveChangesButton = document.getElementById('editUserModalSaveBtn');

  modalSaveChangesButton.addEventListener('click', function() {
    saveUserChanges();
});
  const usersButton = document.getElementById('usersButton');
  usersButton.addEventListener('click', function () {
    showExpandedSection('Users');
    handleUsersSection();
  });

  function showExpandedSection(title) {
    adminPanel.style.display = 'none';
    expandedSection.style.display = 'block';
    recordTypeDropdown.style.display = 'none';
    saveChangesButton.style.display = 'none';
    sectionTitle.textContent = title;
  }
  // Event delegation for dynamically created Edit buttons
  const usersTable = document.getElementById('levelsTable');
  usersTable.addEventListener('click', function (e) {
      if (e.target.classList.contains('editUserBtn')) {
        const username = e.target.getAttribute('data-username');
        const user = users.find(u => u.username === username);
        showEditUserModal(user);
      } else if (e.target.classList.contains('deleteUserBtn')) {
          const username = e.target.getAttribute('data-username');
          showDeleteUserModal(username);
      }  
  });  
});
function showDeleteUserModal(username) {
  const deleteModal = document.getElementById('deleteUserModal');
  const deleteModalUsername = document.getElementById('deleteModalUsername');
  const deleteUserModalConfirmBtn = document.getElementById('deleteUserModalConfirmBtn');

  deleteModalUsername.textContent = username;

  deleteUserModalConfirmBtn.addEventListener('click', function () {
    deleteUser(username);
    $(deleteModal).modal('hide');
  });

  // Show the modal
  $(deleteModal).modal('show');
}

function deleteUser(username) {
  const userToken = localStorage.getItem('userToken');
  fetch(`${API_URL}/rest/admin/deleteUser`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ username })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      toastr.success('User deleted successfully!');
      handleUsersSection();
    } else {
      toastr.error('Error deleting user.');
    }
  })
  .catch(error => {
    console.error("Error deleting user:", error);
    toastr.error('Error deleting user.');
  });
}


function showEditUserModal(user) {
  const editModal = document.getElementById('editUserModal');
  const editModalUsername = document.getElementById('editModalUsername');
  const editModalGDe = document.getElementById('editModalGDe');
  const editModalPermissionLevel = document.getElementById('editModalPermissionLevel');

  editModalUsername.value = user.username;
  editModalGDe.value = user.gdusername || '';
  editModalPermissionLevel.value = user.permission_level;

  // Show the modal
  $(editModal).modal('show');
}

function handleUsersSection() {

  const levelsContainer = document.getElementById('levelsTable').querySelector('tbody');
  levelsContainer.innerHTML = ''; // Clear any previous data

  // Hide the switcher between "Main list", "Legacy levels", and "Removed levels"
  const listTypeDropdown = document.getElementById('listTypeDropdown');
  listTypeDropdown.style.display = 'none';

  // Fetch users data
const userToken = localStorage.getItem('userToken');
fetch(`${API_URL}/rest/admin/users`, {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
})
.then(response => response.json())
.then(data => {
  if (data.error && data.message === 'Insufficient permissions') {
    const usersTable = document.getElementById("levelsTable");
    usersTable.innerHTML = `
      <thead>
          <tr>
              <th>User</th>
              <th>Role</th>
              <th>Actions</th>
          </tr>
      </thead>
      <tbody>
          <tr>
              <td colspan="5">You do not have sufficient permissions to view this data.</td>
          </tr>
      </tbody>
    `;
  } else {
    users = data;  // Store the fetched users in the global variable
    renderUsersTable(data);
  }
})
.catch(error => console.error("Error fetching users:", error));
}


function renderUsersTable(users) {
  const usersTable = document.getElementById('levelsTable');
  usersTable.style.display = 'table';

  // Clear existing rows
  usersTable.innerHTML = `
    <thead>
      <tr>
        <th>Username</th>
        <th>GD User</th>
        <th>Permission Level</th>
        <th>Join Date</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = usersTable.querySelector('tbody');
  users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.gdusername || "N/A"}</td>
      <td>${user.permission_level}</td>
      <td>${new Date(user.joinDate).toLocaleDateString()}</td>
      <td>
  <button class="btn btn-info editUserBtn" data-username="${user.username}">Edit</button>
  <button class="btn btn-danger deleteUserBtn" data-username="${user.username}">Delete</button>
</td>

    `;
    tbody.appendChild(row);
});

}
