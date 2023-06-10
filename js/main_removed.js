import { token, tokenDev } from "./config.js";

const fetch_url = `https://sheets.googleapis.com/v4/spreadsheets/1R1hyDMdNR6c7i3fUFTvyM894_FrCNwAakPXWM1DgtVI/values/Blad1!K36:P1000?key=${token}`;


const template_list = `
<div class="list-item">
    <div class="list-number">#1</div>
    <div class="list-thumbnail">
        <a href="https://www.youtube.com/watch?v=GSCG9yohUm4" target="_blank">
            <img class="list-image" src="https://img.youtube.com/vi/GSCG9yohUm4/maxresdefault.jpg" alt="Level thumbnail">
        </a>
    </div>
    <div class="list-info">
        <p class="level-name" id="popupEvent">Xylz Challenge II</p>
        <div class="level-info">
            <p class="level-id" onClick="copyText(event)">87793135</p>
            <p class="level-author">GameCatch</p>
            <p class="level-verifier">GameCatch</p>
        </div>
    </div>
</div>`;

async function fetchData(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch data. Status: " + response.status);
      }
      return await response.json();
    } catch (error) {
      throw new Error("Error fetching data: " + error.message);
    }
  }
  

const data = fetchData(fetch_url)
    .then(data => addListItems(data))
    .then(assignCopyButtons)
    .catch(error => console.error('Error:', error));

function getVideoID(url) {
    try {
        var ID = '';
        url = url.replace(/(>|<)/gi, '').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
        if (url[2] !== undefined) {
            ID = url[2].split(/[^0-9a-z_\-]/i);
            ID = ID[0];
        } else {
            ID = url;
        }
        return ID;
    } catch (err) {
        console.error('Failed to get video ID:', err);
    }
}

function getThumbnails(IDs) {
    return IDs.map((id, index) => {
        const mediumQualityThumbnail = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
        return mediumQualityThumbnail;
    });
}

async function addListItems(data) {
    let middle = document.getElementsByClassName("middle");
    let IDs = data.values.map((listItem) => getVideoID(listItem[4]));

    await Promise.all(getThumbnails(IDs)).then(thumbnails => {
        data.values.forEach((listItem, index) => {
            middle[0].insertAdjacentHTML("beforeend",`
                <div class="list-item">
                    <div class="list-thumbnail">
                        <a href="${listItem[4]}" target="_blank">
                            <img class="list-image" src="${thumbnails[index]}" alt="Level thumbnail">
                        </a>
                    </div>
                    <div class="list-info">
                        <p class="level-name">${listItem[1]}</p>
                        <div class="level-info">
                            <p class="level-id">${listItem[0]}</p>
                            <p class="level-author">${listItem[2]}</p>
                            <p class="level-verifier">${listItem[3]}</p>
                        </div>
                    </div>
                </div>`
            );
        });
    }).catch((e) => console.log("Error fetching thumbnails: ", e))
}

function assignCopyButtons() {
    let copyButtons = document.getElementsByClassName("level-id");

    for (let i = 0; i < copyButtons.length; i++) {
        copyButtons[i].addEventListener('click', copyText);
    }
}

async function copyText(event) {
    let id = event.target.innerHTML;

    try {
        await navigator.clipboard.writeText(id);
        console.log('Content copied to clipboard:', id);
        event.target.innerHTML = `<span style="color: #42be65">Copied!</span>`;
        setTimeout(() => event.target.innerHTML = id, 1000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}
