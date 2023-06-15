const fetch_url_records = "https://xylz.tv/rest/records";
const fetch_url_challenges = "https://xylz.tv/rest/mainlist";
const REQUIREMENT = 60

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

async function GetChallenges() {
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

async function Setup() {
	const RECORD_DATA = await GetRecords()
	const CHALLENGE_DATA = await GetChallenges()
	let leaderboardData = []

	// Structure data into an array containing players and their records, sorted from highest to lowest points
	/* 
	leaderboardData = [
		[1] = {
			player: "Ellopro"
			totalPoints: 2097,
			records: [
				{
					id: 87793135,
					progress: "100%",
					verified: true,
					link: url,
					points: 362
				},
				{
					id: 87454329,
					progress: "100%",
					verified: false,
					link: url,
					points: 166
				},
				...
			],
		}
		...
	]
	 */

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
			<input type="text" class="form-control col-6" id="search-input" placeholder="Search player...">
		</div>
		<div class="row">
			<table id="leaderboard-table" class="table">
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
			</td>
			<td>${playerEntry.totalPoints.toFixed(2)}</td>
		</tr>`
	})

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
		let txt = `
		<div class="overlay"></div>
		<div class="popup-box profile">
			<div style="position: sticky; top: 0; display: flex; justify-content: center; width: 100%;">
				<div class="popup-header">
					<span style="font-size: 2rem; margin-bottom: 0.25em;">${playerEntry.player}</span>
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

			function OnClose() {
				// Close popup
				wrapper.remove()
				closeBtn.removeEventListener(`click`, OnClose)
			}
		})
	})

	// Animation timeline
	let tl = gsap.timeline({ defaults: { opacity: 0, ease: `0.2, 0, 0.38, 0.9` }})
	tl.from(`.row`, { duration: 1, y: -30 })
	tl.from(`#search-input`, { duration: 1 }, 0.5)
	tl.from(`#leaderboard-table`, { duration: 0.5, x: 30 }, 0.2)
	tl.from(`thead`, { duration: 0.3, y: -50 }, 0.2)
	tl.from(`tr`, { duration: 0.2, y: 50, stagger: 0.05 }, 0.1)
}

Setup()
