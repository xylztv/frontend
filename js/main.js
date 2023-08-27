import { API_URL } from "./config.js";

const fetch_url = `${API_URL}/rest/mainlist`;

async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Failed to fetch data.");
    }
    return response.json();
}

async function preloadThumbnails(data) {
    const promises = data.map(async item => {
        const videoID = getVideoID(item.link);
        const thumbnailURL = `https://img.youtube.com/vi/${videoID}/mqdefault.jpg`;
        const img = new Image();
        img.src = thumbnailURL;
        await img.decode();
    });

    await Promise.all(promises);
}

async function addListItems(data) {
    const middle = document.querySelector(".middle");
    await preloadThumbnails(data);

    const fragment = document.createDocumentFragment();
    data.sort((a, b) => a.ranking - b.ranking);
    data.forEach(item => {
        fragment.appendChild(createListItem(item));
    });

    middle.appendChild(fragment);
    assignCopyButtons();
}

function createListItem(item) {
    const videoID = getVideoID(item.link);
    const thumbnailURL = `https://img.youtube.com/vi/${videoID}/mqdefault.jpg`;
    const listItem = document.createElement('div');
    listItem.classList.add('list-item');
    listItem.innerHTML = `
        <div class="list-number">#${item.ranking}</div>
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
    try {
        const data = await fetchData(fetch_url);
        addListItems(data);
    } catch (error) {
        console.error("Failed to fetch data:", error);
    }
})();
