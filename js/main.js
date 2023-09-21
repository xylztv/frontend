import { API_URL } from "./config.js";

const fetch_url = `${API_URL}/rest/mainlist`;

async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Failed to fetch data.");
    }
    return response.json();
}

async function updateFirstPlaceholdersWithActualData(data) {
    const middle = document.querySelector(".middle");
    const placeholders = middle.querySelectorAll(".placeholder");
    for (let i = 0; i < Math.min(5, data.length); i++) {
        const placeholder = placeholders[i];
        const item = data.find(entry => entry.ranking === i + 1); // Find item with the appropriate ranking
        if (item) {
            const listItem = createListItem(item);
            placeholder.replaceWith(listItem);
        }
    }
}

async function addListItems(data) {
    const middle = document.querySelector(".middle");
    const fragment = document.createDocumentFragment();
    data.sort((a, b) => a.ranking - b.ranking);
    data.slice(5).forEach(item => {
        fragment.appendChild(createListItem(item));
    });

    middle.appendChild(fragment);
    assignCopyButtons();

    // Remove the animation class from placeholders
    const placeholders = middle.querySelectorAll(".placeholder");
    placeholders.forEach(placeholder => {
        placeholder.classList.remove("animation-class");
    });
}

async function updatePlaceholdersWithActualData(data) {
    const middle = document.querySelector(".middle");
    const placeholders = middle.querySelectorAll(".placeholder");
    placeholders.forEach((placeholder, index) => {
        const item = data[index];
        const listItem = createListItem(item);
        placeholder.replaceWith(listItem);
    });

    assignCopyButtons();
}

function createListItem(item) {
    const videoID = getVideoID(item.link);
    const thumbnailURL = item.link ? `https://img.youtube.com/vi/${videoID}/mqdefault.jpg`:'';
    const listItem = document.createElement('div');
    listItem.classList.add('list-item');
    const rankingText = item.ranking ? `#${item.ranking}` : '';
    listItem.innerHTML = `
        <div class="list-number">${rankingText}</div>
        <div class="list-thumbnail">
            <a href="${item.link}" target="_blank">
            <img class="list-image" src="${thumbnailURL}" alt="Level thumbnail" loading="lazy">
            </a>
        </div>
        <div class="list-info">
            <p class="level-name">${item.title}</p>
            <div class="level-info">
                <p class="level-id">${item.id}</p>
                <p class="level-author">${item.creator}</p>
                <p class="level-verifier">${item.verifier}</p>
            </div>
        </div>
    `;
    return listItem;
}

function assignCopyButtons() {
    const middle = document.querySelector(".middle");
    middle.addEventListener('click', event => {
        if (event.target.classList.contains('level-id')) {
            copyText(event);
        }
    });
}

async function copyText(event) {
    const id = event.target.textContent;
    try {
        await navigator.clipboard.writeText(id);
        console.log('Content copied to clipboard:', id);
        event.target.innerHTML = `<span style="color: #42be65">Copied!</span>`;
        setTimeout(() => event.target.innerHTML = id, 1000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

function getVideoID(url) {
    try {
        const match = url.match(/(?:vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)([^?&]+)/i);
        return match ? match[1] : url;
    } catch (err) {
        console.error('Failed to get video ID:', err);
        return url;
    }
}

// Initial loading and processing
(async () => {
    const middle = document.querySelector(".middle");

    // Add empty list items as placeholders with animation class and ranking value
    for (let i = 1; i <= 5; i++) {
        const placeholder = createListItem({ ranking: i, link: '', title: '', id: '', creator: '', verifier: '' });
        placeholder.classList.add("placeholder", "animation-class");
        middle.appendChild(placeholder);
    }

    try {
        const data = await fetchData(fetch_url);

        // Update the first placeholders with actual data
        updateFirstPlaceholdersWithActualData(data);

        // Add the remaining levels
        addListItems(data);
    } catch (error) {
        console.error("Failed to fetch data:", error);
    }
})();
