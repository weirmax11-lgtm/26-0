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

// Game State Trackers
let coachesDB = [];
let loadedDecadeData = null;
let currentlyLoadedDecade = ""; // Cache to avoid re-fetching if we spin the same decade twice

// 1. Load coaches upfront
async function initGame() {
    try {
        const coachResponse = await fetch('coaches.json');
        coachesDB = await coachResponse.json();
        console.log("Coaches database loaded!");
        startNextTurn();
    } catch (error) {
        console.error("Error loading coach data:", error);
    }
}

// 2. Fetch the decade dataset on demand and filter
async function displaySpinOptions() {
    const currentPosition = POSITION_NAMES[currentSlotIndex];
    const isCoachSlot = currentPosition === "Coach";
    let availableChoices = [];

    if (isCoachSlot) {
        availableChoices = coachesDB.filter(c => {
            if (c.Team_Slug !== currentSpin.team) return false;
            const years = c.Seas.split('-');
            const start = parseInt(years[0]);
            const end = years[1] ? parseInt(years[1]) : 2026;
            return currentSpin.year >= start && currentSpin.year <= end;
        });
        if (availableChoices.length === 0) {
            availableChoices = coachesDB.filter(c => c.Team_Slug === currentSpin.team);
        }
        
        renderOptionsUI(availableChoices, currentPosition);
    } else {
        // Calculate the decade string from the spun year (e.g., 1995 -> "1990s")
        const targetDecade = `${Math.floor(currentSpin.year / 10) * 10}s`;
        
        try {
            // Performance Optimization: Only fetch if we aren't already working within this decade
            if (currentlyLoadedDecade !== targetDecade) {
                const response = await fetch(`decades/${targetDecade}.json`);
                loadedDecadeData = await response.json();
                currentlyLoadedDecade = targetDecade;
                console.log(`Loaded new decade file: ${targetDecade}.json`);
            }
            
            // Filter down out of the entire decade to just the exact Year and Team spun
            availableChoices = loadedDecadeData.filter(p => 
                p.Year === currentSpin.year && 
                p.Team.toLowerCase().replace(/\s+/g, '') === currentSpin.team
            );
            
            renderOptionsUI(availableChoices, currentPosition);
        } catch (err) {
            console.error(`Failed to load data for decade ${targetDecade}:`, err);
            renderOptionsUI([], currentPosition); // Fallback to skip button
        }
    }
}

// 3. Keep your UI renderer helper
function renderOptionsUI(availableChoices, currentPosition) {
    const displayEl = document.getElementById('spinDisplay');
    const teamClean = currentSpin.team.replace('b', ' Bears').replace('l', ' Lions').toUpperCase();
    displayEl.innerHTML = `Drafting Position: <span>${currentPosition}</span><br>Spun Era: <span>${teamClean} (${currentSpin.year})</span>`;
    
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('active'));
    const activeSlot = document.getElementById(`slot-${currentPosition}`);
    if(activeSlot) activeSlot.classList.add('active');

    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    
    if(availableChoices.length === 0) {
        const skipBtn = document.createElement('button');
        skipBtn.className = 'option-btn';
        skipBtn.innerText = "No data found (Skip Slot)";
        skipBtn.onclick = () => handleUiSelection(currentPosition === "Coach" ? { Coach: "Generic Coach", Total_Pct: 50.0, GF: 0 } : { Player: "Squad Filler", DI: 10, MK: 2, GL: 0 }, currentPosition);
        container.appendChild(skipBtn);
        return;
    }

    availableChoices.slice(0, 15).forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        if(currentPosition === "Coach") {
            btn.innerHTML = `<strong>${item.Coach}</strong><br>Record Pct: ${item.Total_Pct}% | GF: ${item.GF}`;
        } else {
            btn.innerHTML = `<strong>${item.Player}</strong><br>Disposals: ${item.DI || 0} | Goals: ${item.GL || 0}`;
        }
        btn.onclick = () => handleUiSelection(item, currentPosition);
        container.appendChild(btn);
    });
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
