import { API_URL } from "./config.js";

let isYouTubeLinkPresent = false;
let isLevelIdValid = false;
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

function validateDynamicUsername(type, inputElement, iconElement, errorElement) {
    const username = inputElement.value;
    fetch(`${API_URL}/validateUsername?username=${username}`)
        .then((response) => response.json())
        .then((data) => {
            const isValid = data.isValid;
            const errorMessage = data.errorMessage;

            inputElement.classList.toggle("is-invalid", !isValid);
            errorElement.textContent = errorMessage;
            errorElement.style.display = !isValid ? "block" : "none";
            iconElement.innerHTML = isValid ? "<i class='tick-icon fas fa-check'></i>" : "<i class='cross-icon fas fa-times'></i>";
        })
        .catch((error) => {
            console.error("Error:", error);
        });
}

function updateSubmitButtonVisibility() {
    const submitButton = document.getElementById("submitButton");
    if (isLevelIdValid) {
        submitButton.classList.remove("hidden");
    } else {
        submitButton.classList.add("hidden");
    }
}

function showFields() {
    const fields = document.querySelectorAll("#levelInfoFields, #lengthFields, #verifierFields, #creatorFields, #youtubeLinkFields, #nongUpload");
    fields.forEach((field) => {
        field.classList.remove("hidden");
        field.style.animation = "fadeIn 0.3s forwards";
    });
}

function validateYouTubeLink() {
    const youtubeLink = document.getElementById("youtubeLink").value;
    const youtubeLinkElement = document.getElementById("youtubeLink");
    const youtubeLinkIcon = document.getElementById("youtubeLinkIcon");
    const youtubeLinkError = document.getElementById("youtubeLinkError");

    const youtubeRegex = /^(https?:\/\/)?(www\.)?youtube.com\/watch\?v=([\w-]{11})(?:&[\w\-=]*)?$/;
    const isValidLink = youtubeRegex.test(youtubeLink);

    if (youtubeLink === "") {
        isYouTubeLinkPresent = false;
    } else {
        isYouTubeLinkPresent = true;
    }

    youtubeLinkElement.classList.remove("is-invalid");
    youtubeLinkError.style.display = isYouTubeLinkPresent && !isValidLink ? "block" : "none";
    youtubeLinkIcon.innerHTML = isValidLink ? "<i class='tick-icon fas fa-check'></i>" : "<i class='cross-icon fas fa-times'></i>";

    return isYouTubeLinkPresent && isValidLink;
}

async function getLevelInfo() {
    const loadingIcon = document.getElementById("loadingIcon");
    const levelId = document.getElementById("levelId").value;
    const userToken = localStorage.getItem('userToken'); // Get the user token from local storage.

const response = await fetch(`${API_URL}/getlevel`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}` // Include the user token in 'Authorization' header.
    },
    body: JSON.stringify({ "levelId": levelId })
});

    loadingIcon.classList.add("hidden");

    if (response.ok) {
        const data = await response.json();
        document.getElementById("levelName").value = data.levelName;
        document.getElementById("length").value = data.length;
        document.getElementById("verifier").value = data.uploader;
        document.getElementById("creator").value = data.uploader;

        onCreatorInput();
        onVerifierInput();

        const lengthIcon = document.getElementById("lengthIcon");
        lengthIcon.innerHTML = data.length === "Short" || data.length === "Tiny" ? "<i class='tick-icon fas fa-check'></i>" : "<i class='cross-icon fas fa-times'></i>";

        validateYouTubeLink();
        showFields();
        updateSubmitButtonVisibility();
    } else {
        const errorData = await response.json();
        if (errorData.error === "Invalid level ID") { 
            toastr.error("Invalid Level ID", "Error");
        }
        else if (errorData.error === 3) {
            toastr.error('You must be logged in to submit levels', 'Error');
        } else {
            console.error("Error:", response.status);
            toastr.error("GD API Error", "Error");
        }
    }
}

async function submitFormData() {
  const submitButton = document.getElementById("submitButton");
submitButton.disabled = true;
  const levelId = document.getElementById("levelId").value;
  const levelName = document.getElementById("levelName").value;
  const verifier = document.getElementById("verifier").value;
  const youtubeLink = document.getElementById("youtubeLink").value;

  // Gather all creators from the dynamically added input fields and join them with a comma
  const creatorInputs = document.querySelectorAll('#creatorFields input[name="creator"]');
  const creators = Array.from(creatorInputs).map(input => input.value).join(', ');

  console.log(creators)

  const isYouTubeLinkValid = validateYouTubeLink();
  const isVerifierValid = await validateUsername("verifier", verifier);
  const creatorList = creators.split(',').map(creator => creator.trim());
let allCreatorsValid = true;

for (let creator of creatorList) {
    const isValid = await validateUsername("creator", creator);
    if (!isValid) {
        allCreatorsValid = false;
        break;
    }
}

  const isLengthValid = document.getElementById("lengthIcon").innerHTML.includes("tick-icon");

  if (isYouTubeLinkValid && isVerifierValid && allCreatorsValid && isLengthValid) {
    const queryParams = new URLSearchParams({
        id: levelId,
        name: levelName,
        verifier: verifier,
        creator: creators,
        link: youtubeLink
    });
    
    const url = `${API_URL}/rest/add-level?${queryParams.toString()}`;
    
    fetch(url, {
        method: "POST",
        headers: headers
    })
    .then(async (response) => {
        const responseData = await response.json();
        if (response.ok) {
            const nongFileInput = document.getElementById('nongFile');
            const nongFile = nongFileInput.files[0];
            if (nongFile) {
                try {
                    await uploadNongFile();
                    toastr.success('Level submitted successfully!', 'Success');
                    console.log("Level added to the pending list.");
                    submitButton.disabled = false;
                    resetFormFields();
                } catch (error) {
                    console.error('Error:', error);
                    toastr.error('Error uploading NONG file', 'Error');
                }
            } else {
                toastr.success('Level submitted successfully!', 'Success');
                console.log("Level added to the pending list.");
                submitButton.disabled = false;
                resetFormFields();

            }
        } else {
            console.error("Error:", response.status);
            if (responseData.error === 3) {
                toastr.error('You must be logged in to submit levels', 'Error');
            } else if (responseData.error === "level already exists") {
                toastr.warning('Level already exists', 'Warning');
            } else {
                toastr.error('Unknown error occurred', 'Error');
            }
        }
    });
} else {
    toastr.error('Please fill in all required fields correctly.', 'Error');
    submitButton.disabled = false;
}
}
function resetFormFields() {
    // List of all input ids
    const inputIds = ["levelId", "levelName", "verifier", "youtubeLink"];

    // Loop through each input id and reset its value
    for (let i = 0; i < inputIds.length; i++) {
        const input = document.getElementById(inputIds[i]);
        if (input) {
            input.value = ""; // reset input field
        }
    }

    // Reset all creators fields
    const creatorInputs = document.querySelectorAll('#creatorFields input[name="creator"]');
    creatorInputs.forEach(input => {
        input.value = "";
    });
        const fields = document.querySelectorAll("#levelInfoFields, #lengthFields, #verifierFields, #creatorFields, #youtubeLinkFields, #nongUpload");
        fields.forEach((field) => {
            field.classList.add("hidden");
        });
        submitButton.classList.add("hidden");
}
async function uploadNongFile() {
    const nongFileInput = document.getElementById('nongFile');
    const nongFile = nongFileInput.files[0];
    console.log(nongFile);
    const levelId = document.getElementById("levelId").value;

    if (nongFile) {
        let formData = new FormData();
        formData.append('nongFile', nongFile);
        // Get levelId from the HTML document
    const levelId = document.getElementById("levelId").value;
    
    // Append levelId to formData
    formData.append('levelId', levelId);
        fetch(`${API_URL}/rest/upload-nong`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => console.log(data))
        .catch((error) => {
            console.error('Error:', error);
        });
    }
}
function onLevelIdInput() {
    const loadingIcon = document.getElementById("loadingIcon");
    const levelId = document.getElementById("levelId").value;

    if (levelId === "") {
        const fields = document.querySelectorAll("#levelInfoFields, #lengthFields, #verifierFields, #creatorFields, #youtubeLinkFields, #nongUpload");
        fields.forEach((field) => {
            field.classList.add("hidden");
        });
        loadingIcon.classList.add("hidden");
        isLevelIdValid = false;
        updateSubmitButtonVisibility();
        return;
    }

    if (!/^\d+$/.test(levelId)) {
        toastr.error("Level ID should only contain numbers.");
        loadingIcon.classList.add("hidden");
        isLevelIdValid = false;
        updateSubmitButtonVisibility();
        return;
    }

if (levelId.length < 3 || levelId.length > 8) {
    toastr.error("Level ID should be 3 to 8 digits long.");
    loadingIcon.classList.add("hidden");
    isLevelIdValid = false;
    updateSubmitButtonVisibility();
    return;
}

    // Check if the level is in the mainlist
    fetch(`${API_URL}/rest/mainlist`)
    .then(response => response.json())
    .then(mainlistData => {
        const isLevelInMainlist = mainlistData.some(level => level.id === levelId);
        if (isLevelInMainlist) {
            toastr.error("This level is already on the main list.");
            loadingIcon.classList.add("hidden");
            isLevelIdValid = false;
            updateSubmitButtonVisibility();
        } else {
            // Check if the level is in the pending list using the new endpoint
            fetch(`${API_URL}/rest/is-level-pending?levelId=${levelId}`)
            .then(response => response.json())
            .then(data => {
                if (data.isPending) {
                    toastr.error("This level is already submitted.");
                    loadingIcon.classList.add("hidden");
                    isLevelIdValid = false;
                    updateSubmitButtonVisibility();
                } else {
                    isLevelIdValid = true;
                    getLevelInfo();
                }
            })
            .catch(error => {
                loadingIcon.classList.add("hidden");
                console.error(error);
                isLevelIdValid = false;
                updateSubmitButtonVisibility();
            });
        }
    })
    .catch(error => {
        loadingIcon.classList.add("hidden");
        console.error(error);
        isLevelIdValid = false;
        updateSubmitButtonVisibility();
    });
}

function onVerifierInput() {
    const verifierInputs = document.querySelectorAll('input[name="verifier"]');
    verifierInputs.forEach(input => {
        const verifierUsername = input.value;
        validateUsername("verifier", verifierUsername);
    });
    updateSubmitButtonVisibility();
}

function onCreatorInput() {
    const creatorInputs = document.querySelectorAll('input[name="creator"]');
    creatorInputs.forEach(input => {
        const creatorUsername = input.value;
        validateUsername("creator", creatorUsername);
    });
    updateSubmitButtonVisibility();
}

function addInputField(type) {
  const container = document.getElementById(`${type}Fields`);
  const newInputDiv = document.createElement('div');
  const newInput = document.createElement('input');
  const newInputGroup = document.createElement('div');
  const newInputPrepend = document.createElement('div');
  const newIconSpan = document.createElement('span');
  const removeButtonSpan = document.createElement('span'); 
  const removeButton = document.createElement('button');
  const newErrorDiv = document.createElement('div');
  
  newInputDiv.className = 'input-group mb-3';
  newInput.className = 'form-control';
  newInput.type = 'text';
  newInput.name = type;
  newInput.addEventListener('input', debounce(() => validateDynamicUsername(type, newInput, newIconSpan, newErrorDiv), 1000));
  
  newInputPrepend.className = 'input-group-prepend';
  newIconSpan.className = 'input-group-text';
  newIconSpan.innerHTML = "<i class='cross-icon fas fa-times'></i>";
  
  removeButtonSpan.className = 'input-group-text p-0';
  removeButton.className = 'btn btn-danger w-100 h-100';
  removeButton.style.fontSize = '1.6rem';
  removeButton.style.lineHeight = '0.8';
  removeButton.innerHTML = '-';
  removeButton.addEventListener('click', () => {
      container.removeChild(newInputDiv);
  });
  
  newErrorDiv.className = 'invalid-feedback';
  
  removeButtonSpan.appendChild(removeButton);
  newInputPrepend.appendChild(removeButtonSpan);
  newInputDiv.appendChild(newInputPrepend);
  newInputDiv.appendChild(newInput);
  newInputDiv.appendChild(newIconSpan);
  newInputDiv.appendChild(newErrorDiv);
  
  const addButton = document.getElementById(`${type}AddButton`);
  container.insertBefore(newInputDiv, addButton);
  if (type === 'creator') {
    const creatorInputs = document.querySelectorAll('#creatorFields input[name="creator"]');
}
}


function onYouTubeLinkPaste(event) {
    setTimeout(validateYouTubeLink, 0);
}

// Event Listeners
document.getElementById("youtubeLink").addEventListener("input", validateYouTubeLink);
document.getElementById("addVerifier").addEventListener("click", () => addInputField('verifier'));
document.getElementById("addCreator").addEventListener("click", () => addInputField('creator'));
document.getElementById("levelForm").addEventListener("submit", (event) => {
    event.preventDefault();
    validateYouTubeLink();
    submitFormData();
});
document.getElementById("verifier").addEventListener("input", debounce(onVerifierInput, 1000));
document.getElementById("creator").addEventListener("input", debounce(onCreatorInput, 1000));
document.getElementById("levelId").addEventListener("input", debounce(onLevelIdInput, 1000));
document.getElementById("levelId").addEventListener("input", () => {
    const levelIdInput = document.getElementById("levelId");
    const loadingIcon = document.getElementById("loadingIcon");

    if (levelIdInput.value.trim() !== "") {
        loadingIcon.classList.remove("hidden");
    } else {
        loadingIcon.classList.add("hidden");
    }
});
