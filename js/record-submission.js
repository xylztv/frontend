import { API_URL } from "./config.js?v=20261016";
import { escapeHTML } from "./utils.js";
function getAuthHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('userToken')}` };
}
const debounce = (fn, wait) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            fn(...args);
        }, wait);
    };
};

async function fetchLevels() {
    const response = await fetch(`${API_URL}/rest/mainlist`);
    if (!response.ok) throw new Error(`Could not load levels (HTTP ${response.status})`);
    return response.json();
}

function validateUsername(inputId, username) {
    return fetch(`${API_URL}/validateUsername?username=${encodeURIComponent(username)}`)
        .then((response) => response.json())
        .then((data) => {
            const isValid = data.isValid;
            const errorMessage = data.errorMessage;

            const inputElement = document.getElementById(inputId);
            const usernameError = document.getElementById(`${inputId}Error`);
            const usernameIcon = document.getElementById(`${inputId}Icon`);

            inputElement.classList.toggle("is-invalid", !isValid);
            usernameError.textContent = errorMessage;
            usernameError.style.display = !isValid ? "block" : "none";
            usernameIcon.innerHTML = isValid ? "<i class='tick-icon fas fa-check'></i>" : "<i class='cross-icon fas fa-times'></i>";

            return isValid;
        })
        .catch((error) => {
            console.error("Error:", error);
            return false;
        });
}

function validateYouTubeLink() {
    const youtubeLink = document.getElementById("youtubeLinkRecord").value.trim();
    const youtubeLinkElement = document.getElementById("youtubeLinkRecord");
    const youtubeLinkIcon = document.getElementById("youtubeLinkRecordIcon");
    const youtubeLinkError = document.getElementById("youtubeLinkRecordError");

    const youtubeRegex = /^(https?:\/\/)?(www\.)?youtube.com\/watch\?v=([\w-]{11})(?:&[\w\-=]*)?$/;
    const shortYoutubeRegex = /^(https?:\/\/)?(www\.)?youtu.be\/([\w-]{11})$/;
    const isValidLink = youtubeRegex.test(youtubeLink) || shortYoutubeRegex.test(youtubeLink);

    youtubeLinkElement.classList.toggle("is-invalid", !isValidLink);
    youtubeLinkError.style.display = !isValidLink ? "block" : "none";
    youtubeLinkIcon.innerHTML = isValidLink ? "<i class='tick-icon fas fa-check'></i>" : "<i class='cross-icon fas fa-times'></i>";

    return isValidLink;
}

document.getElementById('recordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = document.getElementById('submitButton');
    const loader = document.getElementById('loader');

    // Disable the submit button and show the loader
    submitButton.disabled = true;
    loader.style.display = 'block';

    try {
        if (!localStorage.getItem('userToken')) {
            toastr.error('Please sign in to submit records.', 'Error');
            return;
        }

        const levelId = document.getElementById('levelDropdown').value;
        const playerName = document.getElementById('playerName').value.trim();
        const youtubeLinkRecord = document.getElementById('youtubeLinkRecord').value.trim();
        const percentage = document.getElementById('percentage').value + '%';

        const isPlayerValid = await validateUsername("playerName", playerName);
        const isYouTubeLinkValid = validateYouTubeLink();
        const isPercentageValid = validatePercentage();

        if (!levelId || !isPlayerValid || !isYouTubeLinkValid || !isPercentageValid) {
            toastr.error('Please fill in all required fields correctly.', 'Error');
            return;
        }

        const queryParams = new URLSearchParams({
            level_id: levelId,
            player: playerName,
            percentage: percentage,
            link: youtubeLinkRecord
        });
        const response = await fetch(`${API_URL}/rest/add-record?${queryParams}`, {
            method: "POST",
            headers: getAuthHeaders()
        });
        // Proxies and server errors can return HTML or plain text.
        const responseData = await response.json().catch(() => ({}));
        if (response.ok) {
            toastr.success('Record submitted successfully!', 'Success');
        } else if ([401, 403].includes(response.status) || [2, 3].includes(responseData.error)) {
            toastr.error('Your session has expired. Please sign in again.', 'Error');
        } else if (responseData.error === "Record already exists") {
            toastr.warning('Record already exists', 'Warning');
        } else {
            const detail = typeof responseData.error === 'string' ? responseData.error : responseData.message;
            toastr.error(escapeHTML(detail || `Could not submit record (HTTP ${response.status}). Please try again.`), 'Error');
        }
    } catch (error) {
        console.error('Error submitting record:', error);
        toastr.error('Could not reach the list server. Please try again.', 'Error');
    } finally {
        submitButton.disabled = false;
        loader.style.display = 'none';
    }
});


function getYoutubeThumbnailUrl(youtubeLink) {
    const videoIdRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
    const match = youtubeLink.match(videoIdRegex);
    if (match && match[1].length === 11) {
        return `https://img.youtube.com/vi/${match[1]}/0.jpg`;
    } else {
        return null;
    }
}
function validatePercentage() {
  const percentageInput = document.getElementById('percentage');
  const percentageValue = Number(percentageInput.value);
  const percentageError = document.getElementById('percentageError');

  if (!Number.isInteger(percentageValue) || percentageValue < 60 || percentageValue > 100) {
      percentageInput.classList.add("is-invalid");
      percentageError.style.display = "block";
      return false;
  } else {
      percentageInput.classList.remove("is-invalid");
      percentageError.style.display = "none";
      return true;
  }
}


document.addEventListener('DOMContentLoaded', async () => {

    // Get the GDusername of the authenticated user
    try {
        const response = await fetch(`${API_URL}/get-gdusername`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        // If the user has a GDusername, set it as the value of the playerName field
        if (data.gdusername) {
            const playerNameInput = document.getElementById('playerName');
            playerNameInput.value = data.gdusername;
            playerNameInput.readOnly = true;
            validateUsername("playerName", document.getElementById("playerName").value)
        }
    } catch (error) {
        console.error('Could not load the linked GD account:', error);
    }

    try {
        const levelDropdown = document.getElementById('levelDropdown');
        const levels = await fetchLevels();

        levels.sort((a, b) => a.ranking - b.ranking);

        levels.forEach(level => {
            const option = document.createElement('option');
            option.value = level.id;
            option.textContent = `${level.title} by ${level.creator} (Rank: ${level.ranking})`;
            option.style.backgroundImage = `url(${getYoutubeThumbnailUrl(level.link)})`;
            option.style.backgroundSize = 'cover';
            option.style.padding = '10px 0';
            levelDropdown.appendChild(option);
        });
        // Get the level ID from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const levelId = urlParams.get('levelId');

        // Pre-select the level in the dropdown
        if (levelId) {
            levelDropdown.value = levelId;
        }
    } catch (error) {
        console.error('Could not load levels:', error);
        toastr.error('Could not load the list. Please reload the page to try again.', 'Error');
    }
});

// Event Listeners
document.getElementById("youtubeLinkRecord").addEventListener("input", validateYouTubeLink);
document.getElementById("playerName").addEventListener("input", debounce(() => validateUsername("playerName", document.getElementById("playerName").value), 1000));
