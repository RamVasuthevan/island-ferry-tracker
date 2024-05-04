function createDate(year, month, day, time = null) {
    // Creates a moment object with the specified date and time (optional) in America/Toronto timezone
    const dateStr = `${year}-${month}-${day}` + (time ? ` ${time}` : '');
    return moment.tz(dateStr, time ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD', 'America/Toronto');
}

function createToday(){
    return moment.tz('America/Toronto')
}

function displayCurrentTimeEST() {
    const currentTime = createToday().format('hh:mm:ss A');
    document.getElementById('currentTime').innerText = currentTime;
}

async function displayAllRoutes() {
    // Fetches and processes the ferry schedule, adjusting dates to America/Toronto timezone
    const response = await fetch('data/schedule.json');
    const data = await response.json();
    
    const schedules = data.schedules;
    const today = createToday().format('YYYY-MM-DD');
    const routeSelect = document.getElementById('ferryRoute');

    schedules.forEach(schedule => {
        const startDate = createDate(schedule.start.year, schedule.start.month, schedule.start.day);
        
        // Assume endDate is valid indefinitely if not specified
        let endDate = createDate(9999, 12, 31);
        if (Object.keys(schedule.end).length !== 0) {
            endDate = createDate(schedule.end.year, schedule.end.month, schedule.end.day);
        }

        if (startDate.isSameOrBefore(today) && endDate.isSameOrAfter(today)) {
            Object.keys(schedule.locations).forEach(location => {
                Object.keys(schedule.locations[location]).forEach(direction => {
                    let routeOption;
                    if (direction === "departsCity") {
                        routeOption = `City to ${location}`;
                    } else if (direction === "departsIsland") {
                        routeOption = `${location} to City`;
                    }
                    const option = document.createElement('option');
                    option.value = JSON.stringify({location, direction});
                    option.innerText = routeOption;
                    routeSelect.appendChild(option);
                });
            });
        }
    });
}

async function showNextFerryTimes(selectedRoute) {
    // Shows ferry times, highlighting those within the next hour in America/Toronto timezone
    const {location, direction} = JSON.parse(selectedRoute);
    const response = await fetch('data/schedule.json');
    const data = await response.json();
    const schedules = data.schedules;
    const today = createToday().format('YYYY-MM-DD');
    const timesContainer = document.getElementById('ferryTimes');
    timesContainer.innerHTML = `<p>Ferries within the next hour are highlighted</p>`;
    timesContainer.classList.add('styledFerryTimes');

    schedules.forEach(schedule => {
        const startDate = createDate(schedule.start.year, schedule.start.month, schedule.start.day);
        
        let endDate = createDate(9999, 12, 31); // Assume indefinitely valid end date
        if (Object.keys(schedule.end).length !== 0) {
            endDate = createDate(schedule.end.year, schedule.end.month, schedule.end.day);
        }
        
        if (startDate.isSameOrBefore(today) && endDate.isSameOrAfter(today)) {
            if (schedule.locations[location] && schedule.locations[location][direction]) {
                let allTimes = schedule.locations[location][direction];
                let [remainingTimes, pastTimes] = splitTimes(allTimes);

                let tableHTML = `<table><tr><th>Remaining Schedule for ${location} today:</th></tr>`;
                if (remainingTimes.length > 0) {
                    remainingTimes.forEach(time => {
                        const highlightClass = isWithinNextHour(time) ? 'class="highlight"' : '';
                        tableHTML += `<tr ${highlightClass}><td>${convertToAmPm(time)}</td></tr>`;
                    });
                }

                tableHTML += `<tr><td>END OF THE DAY</td></tr>`;

                pastTimes.forEach(time => {
                    tableHTML += `<tr><td>${convertToAmPm(time)}</td></tr>`;
                });

                tableHTML += `</table>`;
                timesContainer.innerHTML += tableHTML;
            }
        }
    });
}

function splitTimes(times) {
    // Splits times into past and future relative to current time in America/Toronto timezone
    const now = createToday();
    let nextTimes = [];
    let pastTimes = [];

    times.forEach(time => {
        // Create a moment object for the time entry with today's date in America/Toronto timezone
        const timeMoment = createDate(now.year(), now.month() + 1, now.date(), time);
        if (timeMoment.isAfter(now)) {
            nextTimes.push(time);
        } else {
            pastTimes.push(time);
        }
    });
    return [nextTimes, pastTimes];
}

function isWithinNextHour(time) {
    // Checks if a given time is within the next hour in America/Toronto timezone
    const now = createToday();
    // Create a moment object for the time entry with today's date in America/Toronto timezone
    const targetTime = createDate(createToday().year(), createToday().month() + 1, createToday().date(), time);

    return targetTime.diff(now, 'minutes') <= 60 && targetTime.isAfter(now);
}


function convertToAmPm(time) {
    // Converts time to AM/PM format
    return moment(time, 'HH:mm').format('hh:mm A');
}

window.onload = function() {
    displayCurrentTimeEST();
    displayAllRoutes();
    setInterval(displayCurrentTimeEST, 1000);
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ferryRoute').addEventListener('change', (event) => {
        showNextFerryTimes(event.target.value);
    });
});
