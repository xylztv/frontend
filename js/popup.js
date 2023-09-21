import { API_URL } from "./config.js";
const fetch_url = `${API_URL}/rest/records`;
const nong_fetch_url = `${API_URL}/rest/all-nongs`;

Setup();

let completions = [];
let nongs = [];

async function fetchData(url) {
    // Storing response
    const response = await fetch(url);
    
    // Storing data in form of JSON
    let data = await response.json();
    if (!response) {
        throw new Error("Failed to fetch data.");
    }
    return data
}

async function checkNONG(data) {
    let middle = document.getElementsByClassName("middle");
    let IDs = data.values.map((listItem) => getVideoID(listItem[4]));

    let submit = document.getElementsByClassName("submit-record-button");
    await Promise.all(getThumbnails(IDs)).then(thumbnails => {
        data.values.forEach((listItem, index) => {listItem[0]
        });
    }).catch((e) => console.log("Error fetching thumbnails: ", e))
}

async function addRecordItems(data) {
    let i = 0;
    data.forEach(recordItem => {
        completions[i] = {id: recordItem.level_id, link: recordItem.link, name: recordItem.player, runPercentage: recordItem.percent};
        i++;
    });

    completions.sort((a, b) => {
        let aPercentage = parseFloat(a.runPercentage.replace('%', ''));
        let bPercentage = parseFloat(b.runPercentage.replace('%', ''));
        return bPercentage - aPercentage; // For descending order
    });
}

async function addNONG() {
    let response = await fetch(`${API_URL}/rest/all-nongs`);
    let data = await response.json();
    let i = 0;
    data.forEach(listItem => {
        if (!listItem.link) return;
        nongs[i] = {id: listItem.id, nong: listItem.link};
        i++;
    });
}

async function Setup() {
    Promise.all([fetchData(fetch_url), fetchData(nong_fetch_url)]).then((data) => {
        addRecordItems(data[0]).then(addNONG(data[1]))
    })

    document.addEventListener("click", function (event) {
        if (!event.target.closest(".list-item")) return;

        // Reconstruct the html from the element
        let listInfo = event.target.parentElement.querySelector(".level-info");
        let levelID = listInfo.querySelector(".level-id").innerHTML
        let levelName = event.target.closest(".list-item").querySelector(".level-name");
        let rankString = event.target.closest(".list-item").querySelector(".list-number").innerText;
        let rank = parseInt(rankString.replace('#', ''));
        let points = parseFloat(GetPoints(rank, 100).toFixed(2))
        let runs = completions.filter(x => x.id == levelID);
        let runsHTML = ""

        // start of runsHTML edit

        if (runs.length == 0) {
            runsHTML = `<div class="text-center font-weight-bold mt-3" style="margin-bottom: 32px;">No Records Available</div>`
        } else {
            runsHTML = `
            <div class="text-center my-2 font-weight-bold">Records</div>`
        }

        runsHTML += `
        <div style="display: flex; justify-content: space-between; width: 100%;">
        <a href="/record_submission_form.html?levelId=${levelID}" target="_blank"><label><span class="submit-button">Submit Record</span></label></a>`

        // check if nong exists
        let nongData = nongs.find(e => e.id == levelID)
        if (nongData) {
            runsHTML += `<button id="downloadNongBtn" class="btn btn-info nong-button" data-nong-url="${nongData.link}">Download NONG</button>`;
        }

        runsHTML += `</div>`

        if (runs.length > 0) {
            runsHTML += `
            <div class="table-responsive" style="height: 100%;">
                <table class="table">
                    <thead class="thead-light" style="position: sticky; top: 0;">
                        <tr>
                            <th>Name</th>
                            <th>Run Percentage</th>
                            <th>YouTube <i class="fas fa-box-arrow-up-right"></i></th>
                        </tr>
                    </thead>
                    <tbody>
            `
            runs.forEach(element => {
                runsHTML += `<tr>
                <td>${element.name}</td>
                <td>${element.runPercentage}</td>
                <td><a href="${element.link}" target="_blank">Link <i class="fas fa-box-arrow-up-right"></i></a></td>
                </tr>`
            });
            runsHTML += `
                    </tbody>
                </table>
            </div>
            `
            
            $(document).ready(function() {
                $('#runs-table').DataTable({
                    "dom": "ft",
                    "autoWidth": true
                });
            });
            let horizontalBar = "<hr>";
            let tableHeight = $("#runs-table").height();
            $(".popup-box").css("height", tableHeight + "px");
            $("#runs-table").on("resize", function() {
                let tableHeight = $("#runs-table").height();
                $(".popup-box").css("height", tableHeight + "px");
                $(window).resize(function() {
                    let tableHeight = $("#runs-table").height();
                    let tableWidth = $("#runs-table").width();
                    $(".popup-box").css("height", tableHeight + "px");
                    $(".popup-box").css("width", tableWidth + "px");
                    $(".popup-box").css("margin-left", "-" + $(".popup-box").width()/2 + "px");
                    $(".popup-box").css("margin-top", "-" + $(".popup-box").height()/2 + "px");
                });
            });
        }

let listitemlevelName = event.target.closest('.list-item').querySelector('.level-name');
let levelImage = event.target.closest('.list-item').querySelector('.level-image');
let levelInfo = event.target.closest('.list-item').querySelector('.level-info');

let newHTML = `
    <div class="level-name">${levelName.innerHTML}</div>
    <div class="level-points">${points} points</div>
    <div class="level-info">${levelInfo.innerHTML}</div>
`

// create the element
let popup = document.createElement("div");
popup.classList.add("popup-box");
popup.style.overflow = `hidden`
popup.innerHTML = `
    <div class="popup-header">
        ${newHTML}
    </div>
    <div class="run-info">
        ${runsHTML}
    </div>
    <button class="close-button btn btn-danger" style="line-height: 1"><span class="material-icons" style="pointer-events: none;">close</span></button>
`;

// animate the insertion of the element
TweenMax.from(popup, 0.5, { opacity: 0, y: -50 });
event.target.closest(".list-item").insertAdjacentElement("afterend", popup);

let overlay = document.createElement("div");
overlay.classList.add("overlay");

// animate the insertion of the overlay element to fade in
TweenMax.from(overlay, 0.5, { opacity: 0 });

// insert the overlay element
document.body.appendChild(overlay);

document.addEventListener('click', function (event) {
    if (!event.target.matches('.close-button')) return;
    let popupBox = event.target.parentElement;
    let overlay = document.querySelector('.overlay');
    TweenMax.to([popupBox, overlay], 0.5, {
        opacity: 0, onComplete: function () {
            popupBox.remove();
            overlay.remove();
        }
    });
}, false);
if (popup.querySelector("#downloadNongBtn")) {
popup.querySelector("#downloadNongBtn").addEventListener("click", function (event) {
    event.preventDefault(); // prevent the default button action

    // Get the levelId from the listItem
    let levelId = event.target.closest('.popup-box').previousElementSibling.querySelector('.level-id').innerHTML;

    // URL for the audio file from the button data attribute
    let audioUrl = `${API_URL}/rest/nong?levelId=${levelId}`;

    // Fetch the songId and the link to the audio file
    fetch(audioUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        let songId = data.songId;
        let audioFileUrl;
        if (data.link.startsWith('https')) {
            window.open(data.link, '_blank');
        } else {
            audioFileUrl = `${API_URL}/rest/get-audio/${data.link}`;
        }

        // Fetch the audio file
        return fetch(audioFileUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            }
        })
        .then(response => response.blob())
        .then(blob => {
            let nong = nongs.find(n => n.id === levelId);

            // Check if the nong object is retrieved correctly
            if (nong) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${songId}.mp3`; // Use songId as the filename
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                console.error(`No nong found for level ID: ${levelId}`);
            }
        });
    });
});
}
function GetPoints(rank, progress) {
	let maxPoints

	if (rank <= 10) {
		maxPoints = 149.61 * (Math.pow(1.38796762063, 1 - rank)) + 100.39
	} else if (rank <= 20) {
		maxPoints = 166.611 * (Math.pow(1.0172736527773, -8 - rank)) - 14.195692219
	} else if (rank <= 35) {
		maxPoints = 261.8498558893426 * (Math.pow(1.036, -14 - rank)) + 10.2765560994
	} else if (rank <= 100) {
		maxPoints = 36.18203535684543 * (Math.pow(2, Math.log(50) * (50.947 - rank) / 99)) + 0.5599125586
	}

	return progress == 100 ? maxPoints : maxPoints * 0.1 * Math.pow(5, (progress - REQUIREMENT) / (100 - REQUIREMENT))
}
    })}
