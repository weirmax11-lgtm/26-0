// Game configuration
const TOTAL_SLOTS = 19; // 18 Players + 1 Coach
const POSITION_NAMES = [
    "B1", "B2", "B3", "HB1", "HB2", "HB3", // Backs
    "C1", "C2", "C3",                      // Midfield
    "HF1", "HF2", "HF3", "F1", "F2", "F3", // Forwards
    "Ruck", "Ruck-Rover", "Rover",         // Followers
    "Coach"                                // Coach Slot
];

// Slugs mapping your scraped data teams to standard labels
const TEAM_SLUGS = [
    "adelaide", "brisbaneb", "brisbanel", "carlton", "collingwood", 
    "essendon", "fitzroy", "fremantle", "geelong", "goldcoast", 
    "gws", "hawthorn", "melbourne", "northm", "portadel", 
    "richmond", "stkilda", "sydney", "westcoast", "westernb"
];

// Game State Tracker
let playersDB = [];
let coachesDB = [];
let currentSlotIndex = 0;
let userSquad = []; // Array of selected objects

let currentSpin = { team: "", year: null };

// 1. Fetch JSON files directly from your GitHub directory relative path
async function initGame() {
    try {
        const playerResponse = await fetch('./players.json');
        playersDB = await playerResponse.json();

        const coachResponse = await fetch('./coaches.json');
        coachesDB = await coachResponse.json();

        console.log("Databases loaded successfully!");
        startNextTurn();
    } catch (error) {
        console.error("Error initializing game data:", error);
    }
}

// 2. Generate a random Team and Year/Era
function generateSpin() {
    const randomTeam = TEAM_SLUGS[Math.floor(Math.random() * TEAM_SLUGS.length)];
    const randomYear = Math.floor(Math.random() * (2026 - 1965 + 1)) + 1965;
    
    currentSpin = { team: randomTeam, year: randomYear };
    displaySpinOptions();
}

// 3. Filter your database to present selection choices to the user
function displaySpinOptions() {
    const isCoachSlot = POSITION_NAMES[currentSlotIndex] === "Coach";
    let availableChoices = [];

    if (isCoachSlot) {
        // Filter coach database matching the spun team
        // (Coaches often span multiple years, so we find if the spun year falls in their 'Seas' range)
        availableChoices = coachesDB.filter(c => {
            if (c.Team_Slug !== currentSpin.team) return false;
            const years = c.Seas.split('-'); // e.g. "1997-1999" or "2020-2024"
            const start = parseInt(years[0]);
            const end = years[1] ? parseInt(years[1]) : 2026;
            return currentSpin.year >= start && currentSpin.year <= end;
        });
        
        // Fallback: If no exact coach matching that exact year, grab any coach from that team
        if (availableChoices.length === 0) {
            availableChoices = coachesDB.filter(c => c.Team_Slug === currentSpin.team);
        }
    } else {
        // Filter player database matching exact year and team
        availableChoices = playersDB.filter(p => 
            p.Year === currentSpin.year && 
            p.Team.toLowerCase().replace(/\s+/g, '') === currentSpin.team
        );
    }

    // INTERFACE TRIGGER: Render these options dynamically into your UI
    console.log(`Slot: ${POSITION_NAMES[currentSlotIndex]}. Spun: ${currentSpin.team.toUpperCase()} (${currentSpin.year})`);
    console.log("Options for user selection:", availableChoices);
}

// 4. Handle Selection
function selectCandidate(chosenObject) {
    userSquad.push({
        position: POSITION_NAMES[currentSlotIndex],
        selection: chosenObject,
        isCoach: POSITION_NAMES[currentSlotIndex] === "Coach"
    });

    currentSlotIndex++;

    if (currentSlotIndex < TOTAL_SLOTS) {
        startNextTurn();
    } else {
        calculateFinalScore();
    }
}

function startNextTurn() {
    generateSpin();
}

// 5. Algorithmic scoring inspired by 82-0 math formulas
function calculateFinalScore() {
    let rawSquadScore = 0;

    userSquad.forEach(slot => {
        if (slot.isCoach) {
            // Coach context formula weight (Wins / total matches factored)
            const winPct = slot.selection.Total_Pct || 50.0;
            const gfBonus = slot.selection.GF * 5; 
            rawSquadScore += (winPct * 0.5) + gfBonus;
        } else {
            // Player metric calculation values
            const p = slot.selection;
            
            // Weight allocations modeled against modern/historical impacts
            const playerPower = 
                ((p.DI || 0) * 0.3) +  // Disposals
                ((p.MK || 0) * 0.5) +  // Marks
                ((p.GL || 0) * 1.2) +  // Goals
                ((p.BH || 0) * 0.2) +  // Behinds
                ((p.TK || 0) * 0.8) +  // Tackles
                ((p.HO || 0) * 0.15) + // Hit Outs
                ((p.BR || 0) * 2.5);   // Brownlow Votes
                
            rawSquadScore += playerPower;
        }
    });

    // Normalize score to fit into a 26 game maximum scale (23 home & away + 3 finals)
    // Adjust the dividing scale factor (e.g., 280) depending on how forgiving you want the game to be
    let calculatedWins = Math.min(26, Math.max(0, Math.floor(rawSquadScore / 280)));
    let calculatedLosses = 26 - calculatedWins;

    // Output final simulation result
    console.log(`--- Simulation Final Grade ---`);
    console.log(`Squad Record: ${calculatedWins} - ${calculatedLosses}`);
    if (calculatedWins === 26) {
        console.log("PERFECTION ACHIEVED! You went 26-0!");
    }
}

// Kickoff on window load
window.onload = initGame;
