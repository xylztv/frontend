import { API_URL } from "./config.js";
const headers = {
    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
};
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
    return response.json();
}

function validateUsername(inputId, username) {
    return fetch(`${API_URL}/validateUsername?username=${username}`)
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
    const youtubeLink = document.getElementById("youtubeLinkRecord").value;
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

    const levelId = document.getElementById('levelDropdown').value;
    const playerName = document.getElementById('playerName').value;
    const youtubeLinkRecord = document.getElementById('youtubeLinkRecord').value;
    const percentage = document.getElementById('percentage').value + '%';

    const isPlayerValid = await validateUsername("playerName", playerName);
    const isYouTubeLinkValid = validateYouTubeLink();
    const isPercentageValid = validatePercentage();

    if (isPlayerValid && isYouTubeLinkValid && isPercentageValid) {
        const queryParams = new URLSearchParams({
            level_id: levelId,
            player: playerName,
            percentage: percentage,
            link: youtubeLinkRecord
        });

        const url = `${API_URL}/rest/add-record?${queryParams.toString()}`;

        fetch(url, {
            method: "POST",
            headers: headers
        })

            .then(async (response) => {
                const responseData = await response.json();
                if (response.ok) {
                    toastr.success('Record submitted successfully!', 'Success');
                } else if (responseData.error === 3) {
                    toastr.error('You must be logged in to submit records', 'Error');
                } else if (responseData.error === "Record already exists") { // Check if the error is due to a duplicate record
                    toastr.warning('Record already exists', 'Warning'); // Display a toastr warning
                } else {
                    toastr.error('Error submitting record.', 'Error');
                }
            })
            .catch((error) => {
                console.error("Error:", error);
                toastr.error('Error submitting record.', 'Error');
            });
    } else {
        toastr.error('Please fill in all required fields correctly.', 'Error');
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
  const percentageValue = parseInt(percentageInput.value, 10);
  const percentageError = document.getElementById('percentageError');

  if (isNaN(percentageValue) || percentageValue < 60) {
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
        console.log(levelId)
    }
});

// Event Listeners
document.getElementById("youtubeLinkRecord").addEventListener("input", validateYouTubeLink);
document.getElementById("playerName").addEventListener("input", debounce(() => validateUsername("playerName", document.getElementById("playerName").value), 1000));
