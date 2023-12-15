import { API_URL } from "./config.js";
const fetch_url_records = `${API_URL}/rest/records`;
const fetch_url_challenges = `${API_URL}/rest/mainlist`
const REQUIREMENT = 60

let countryCodes = {};

async function loadCountryCodes() {
    const response = await fetch('https://flagcdn.com/en/codes.json');
    const data = await response.json();
    countryCodes = data;
}
async function fetchData(url) {
	const response = await fetch(url);
	let data = await response.json();
	if (!response.ok) {
		throw new Error("Failed to fetch data.");
	}
	return data; // Return data directly
}

async function GetRecords() {
	return fetchData(fetch_url_records).then(data => {
		return data.map(recordInfo => {
			return {
				id: recordInfo.level_id,
				link: recordInfo.link,
				player: recordInfo.player,
				progress: recordInfo.percent
			}
		})
	})
}

export async function GetChallenges() {
	return fetchData(fetch_url_challenges).then(data => {
		let obj = {}

		data.forEach((challengeInfo, i) => {
			obj[challengeInfo.id] = {
				name: challengeInfo.title,
				author: challengeInfo.creator,
				verifier: challengeInfo.verifier,
				link: challengeInfo.link,
				rank: challengeInfo.ranking
			}
		})
        
		return obj
	})
}

export function GetPoints(rank, progress) {
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

async function Setup() {
	const RECORD_DATA = await GetRecords()
	const CHALLENGE_DATA = await GetChallenges()
	let leaderboardData = []

	function GetPlayer(player) {
		// Try finding the player
		let playerEntry = leaderboardData.find(playerInfo => { return playerInfo.player == player })
		
		// Create a new player entry if player doesn't have one
		if (!playerEntry) {
			playerEntry = {
				player: player,
				totalPoints: 0,
				records: []
			}

			leaderboardData.push(playerEntry)
		}

		return playerEntry
	}

	// Loop through records to get all players
	RECORD_DATA
	.filter((recordInfo) => {
		// Remove records in levels that aren't in the main list
		return CHALLENGE_DATA.hasOwnProperty(recordInfo.id)
	})
	.forEach((recordInfo) => {
		let challengeInfo = CHALLENGE_DATA[recordInfo.id]
		let playerEntry = GetPlayer(recordInfo.player)
		let points = GetPoints(challengeInfo.rank, parseInt(recordInfo.progress))

		// Submit record in player entry
		playerEntry.records.push({
			id: parseInt(recordInfo.id),
			name: challengeInfo.name,
			progress: recordInfo.progress,
			verified: false,
			link: recordInfo.link,
			points: points
		})

		playerEntry.totalPoints += points
	})

	// Loop through challenges to get all verifiers
	Object.entries(CHALLENGE_DATA)
	.forEach(([id, challengeInfo]) => {
		let playerEntry = GetPlayer(challengeInfo.verifier)
		let points = GetPoints(challengeInfo.rank, 100)
		
		// Submit verification in player entry
		playerEntry.records.push({
			id: id,
			name: challengeInfo.name,
			progress: "100%",
			verified: true,
			link: challengeInfo.link,
			points: points
		})

		playerEntry.totalPoints += points
	})

	// Sort player records from highest to lowest points
	leaderboardData.forEach(playerEntry => {
		playerEntry.records.sort((a, b) => { return b.points - a.points })
	})
	
	// Sort players from highest to lowest points
	leaderboardData.sort((a, b) => { return b.totalPoints - a.totalPoints })

	// Construct HTML elements
	let middle = document.querySelector(`.middle`)

	middle.innerHTML = `
	<div class="container">
		<div class="row">
			<h1>Leaderboard</h1>
		</div>
		<div class="row mt-3 mb-2">
			<input type="text" class="form-control col-6" id="search-input" placeholder="Search player..." style="border-radius: 20px;">
		</div>
		<div class="row">
			<table id="leaderboard-table" class="table" style="background-color: #fff; border-radius: 20px;">
				<thead>
					<tr>
						<th>Player</th>
						<th>Total Points</th>
					</tr>
				</thead>
				<tbody></tbody>
			</table>
		</div>
	</div>
	`
	let table = document.getElementById(`leaderboard-table`)
	let tableBody = table.querySelector(`tbody`)

	// Insert every player on the leaderboard
leaderboardData.forEach((playerEntry, i) => {
    tableBody.innerHTML += `
    <tr>
        <td>
            <span style="font-weight: bold; margin-right: 5px;">#${i + 1} </span>
            <a href="#/" data-player="${playerEntry.player}">${playerEntry.player}</a>
            <span id="flag-${playerEntry.player}"></span>
        </td>
        <td>${playerEntry.totalPoints.toFixed(2)}</td>
    </tr>`
});
var pattern = trianglify({
	width: window.innerWidth,
	height: document.body.scrollHeight,
	cellSize: 200, // Adjust this value as needed
	xColors: ['#ffb727', '#ff6347', '#75ca4e'], // More contrasting colors
	colorFunction: trianglify.colorFunctions.interpolateLinear(0.5),
	seed: Math.random().toString(36).substring(7)
});

document.body.style.backgroundImage = 'url(' + pattern.toCanvas().toDataURL() + ')';
document.body.style.backgroundColor = '#ffffff'; // Set a background color


async function fetchFlag(player, size) {
    const response = await fetch(`${API_URL}/rest/get-flag?gdUsername=${encodeURIComponent(player)}`);
    const data = await response.json();

    if (data.success) {
        const flag = data.flag;
        const countryName = countryCodes[flag];
        const flagElement = `<img src="https://flagcdn.com/${size}/${flag}.png" alt="${flag} flag" title="${countryName}">`; // Add the flag next to the player name
        return flagElement;
    }

    return '';
}
// Fetch the flag for each player in the leaderboard
await Promise.all(leaderboardData.map(async (playerEntry) => {
    const flagElement = await fetchFlag(playerEntry.player, '24x18');
    document.getElementById(`flag-${playerEntry.player}`).innerHTML = flagElement;
}));

	// Setup search bar
	let searchBar = document.getElementById(`search-input`)

	// Handle input events on the search bar
	searchBar.addEventListener(`input`, () => {
		let toSearch = searchBar.value.toLowerCase()
		let tableRows = tableBody.querySelectorAll(`tr`)

		tableRows.forEach(row => {
			let playerName = row.querySelector(`a`).innerHTML.toLowerCase()

			row.style.display = playerName.includes(toSearch) ? `table-row` : `none`
		})
	})

	// Setup popup window
	let playerLinks = tableBody.querySelectorAll(`a`)
	
	playerLinks.forEach(playerLink => {
		let playerEntry = GetPlayer(playerLink.innerHTML)
		let flagPromise = fetchFlag(playerEntry.player, '40x30');
		let txt = `
		<div class="overlay"></div>
		<div class="popup-box profile">
			<div style="position: sticky; top: 0; display: flex; justify-content: center; width: 100%;">
				<div class="popup-header">
				<span style="font-size: 2rem; margin-bottom: 0.25em;" id="player-name-${playerEntry.player}">${playerEntry.player} <span id="popup-flag-${playerEntry.player}"></span></span>
					<span>Points: ${playerEntry.totalPoints.toFixed(2)}</span>
				</div>
				<div>
					<button class="close-button btn btn-danger" style="line-height: 1;">
						<span class="material-icons" style="pointer-events: none;">close</span>
					</button>
				</div>
			</div>
			<div class="table-responsive" style="height: 100%; background: #fff">
				<table class="table popup-table">
					<thead class="thead-light" style="position: sticky; top: 0;">
						<tr>
							<th>Challenge</th>
							<th>Record</th>
						</tr>
					</thead>
					<tbody style="overflow-y: scroll">
		`
		playerEntry.records.forEach(recordInfo => {
			let challengeInfo = CHALLENGE_DATA[recordInfo.id]
			txt += `
					<tr>
						<td>
							<strong>${challengeInfo.name} (#${challengeInfo.rank})</strong>
							<br>
								<span>${recordInfo.points.toFixed(2)} points</span>
							<br>
			`

			let verifiedTag = `<span class="badge badge-success">VERIFIER</span>`
			let progressTag = `<span style="color: rgb(181, 181, 181);">${recordInfo.progress}</span>`

			txt += recordInfo.verified ? verifiedTag : progressTag
			txt += `
						</td>
						<td>
							<a href=${recordInfo.link} target="_blank">Link</a>
						</td>
					</tr>
			`
		})
		txt += `
					</tbody>
				</table>
			</div>
		</div>
		`

		// Handle click events on the player name
		playerLink.addEventListener(`click`, () => {
			let wrapper = document.createElement(`div`)
			wrapper.innerHTML = txt

			// Open popup
			middle.insertAdjacentElement(`afterend`, wrapper)

			// Animate popup opening
			let tl = gsap.timeline({ defaults: { opacity: 0, duration: 0.3, ease: `0.2, 0, 0.38, 0.9`, onReverseComplete: OnClose }})
			tl.from(`.popup-box`, { y: -50 })
			tl.from(`.overlay`, {}, 0)
			

			// Handle click events on the close button
			let closeBtn = wrapper.querySelector(`.close-button`)

			// Animate popup closing
			closeBtn.addEventListener(`click`, () => { tl.reverse() })

			// Update the popup header with the flag when it's loaded
			flagPromise.then(flagElement => {
				document.getElementById(`popup-flag-${playerEntry.player}`).innerHTML = flagElement;
			});

			function OnClose() {
				// Close popup
				wrapper.remove()
				closeBtn.removeEventListener(`click`, OnClose)
			}
		})
	})
	
}

loadCountryCodes().then(() => {
	Setup();
});