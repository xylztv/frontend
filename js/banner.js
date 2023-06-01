import { token, tokenDev } from "./config.js";

const fetch_url = `https://sheets.googleapis.com/v4/spreadsheets/1R1hyDMdNR6c7i3fUFTvyM894_FrCNwAakPXWM1DgtVI/values/Blad1!K4:O31?key=${token}`
let levels = []

document.querySelector(".banner_close").addEventListener("click", function() {
    this.closest(".banner").style.display = "none";
})

fetchData(fetch_url).then(data => Setup(data))

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

async function Setup(data){
    await addLevelSubmissions(data)

    async function addLevelSubmissions(data){
        console.log(data)
        let i = 0
        data.values.forEach(submission => {
            levels[i] = {
                id: submission[0],
                name: submission[1],
                author: submission[2],
                verifier: submission[3],
                link: submission[4],
            }
            i++
        });
    }

    document.addEventListener('click', function (event) {
        if (!event.target.closest('.banner_text')) return;
        let levelsHTML = `
        <table class="table">
            <thead class="thead-light" style="position: sticky; top: 0;">
                <tr>
                    <th>ID</th>
                    <th>Level Name</th>
                    <th>Author</th>
                    <th>Verifier</th>
                    <th>YouTube</th>
                </tr>
            </thead>
        <tbody>`;
        if (levels) {
            levels.forEach(level => {
                levelsHTML += `<tr>
                <td>${level.id}</td>
                <td>${level.name}</td>
                <td>${level.author}</td>
                <td>${level.verifier}</td>
                <td><a href="${level.link}" target="_blank">Link</a></td>
                </tr>`;
            });
        } else {
            levelsHTML += `<tr><td colspan="4" class="text-center font-weight-bold">No levels available</td></tr>`;
        }
        levelsHTML += "</tbody></table>";
        /* 
        $(document).ready( function () {
            $('#runs-table').DataTable( {
                "dom": "ft",
                "autoWidth": true
            });
        } );

        let horizontalBar = "<hr>";
        let tableHeight = $("#runs-table").height();
        $(".popup-box").css("height", tableHeight + "px");
        $("#runs-table").on("resize", function() {
            let tableHeight = $("#runs-table").height();
            $(".popup-box").css("height", tableHeight + "px");
            $(window).resize( function() {
                let tableHeight = $("#runs-table").height();
                let tableWidth = $("#runs-table").width();
                $(".popup-box").css("height", tableHeight + "px");
                $(".popup-box").css("width", tableWidth + "px");
                $(".popup-box").css("margin-left", "-" + $(".popup-box").width()/2 + "px");
                $(".popup-box").css("margin-top", "-" + $(".popup-box").height()/2 + "px");
            });
        }); */

        //create the element
        let popup = document.createElement("div");
        popup.classList.add("popup-box");
        popup.innerHTML = `
        <div class="popup-header">
            <span style="font-size: 2rem;">Levels Submitted</span>
        </div>
        
        <div class="table-responsive" style="background: #fff;">
            ${levelsHTML}
        </div>
        <button class="close-button btn btn-danger" style="line-height: 1;"><span class="material-icons" style="pointer-events: none;">close</span></button>`;

        // animate the insertion of the element
        TweenMax.from(popup, 0.5, {opacity: 0, y: -50});
        //document.querySelector(".banner_close").closest(".banner").insertAdjacentElement("afterend", popup);
        document.querySelector(".banner").insertAdjacentElement("afterend", popup);
        //event.target.closest(".list-item").insertAdjacentElement("afterend", popup);

        let overlay = document.createElement("div");
        overlay.classList.add("overlay");

        // animate the insertion of the overlay element to fade in
        TweenMax.from(overlay, 0.5, {opacity: 0});

        // insert the overlay element
        document.body.appendChild(overlay);

        document.querySelector(".close-button").addEventListener("click", function(event) {
            let popupBox = event.target.closest('.popup-box');
            let overlay = document.querySelector('.overlay');
            TweenMax.to([popupBox, overlay], 0.5, {opacity: 0, onComplete: function(){
                popupBox.remove();
                overlay.remove();
            }});
        })
    });
}