function displayCurrentTimeEST() {
    const currentTime = moment.tz('America/Toronto').format('hh:mm:ss A');
    document.getElementById('currentTime').innerText = currentTime;
}


async function displayAllRoutes() {
    // Fetches and processes the ferry schedule, adjusting dates to America/Toronto timezone
    const response = await fetch('data/schedule.json');
    const data = await response.json();
    const schedules = data.schedules;
    const today = moment.tz('America/Toronto').format('YYYY-MM-DD');
    const routeSelect = document.getElementById('ferryRoute');

    schedules.forEach(schedule => {
        if (moment(schedule.start).isSameOrBefore(today) && (schedule.end === null || moment(schedule.end).isSameOrAfter(today))) {
            Object.keys(schedule.locations).forEach(location => {
                Object.keys(schedule.locations[location]).forEach(direction => {
                    let routeOption;
                    if (direction === "Departs City") {
                        routeOption = `City to ${location}`;
                    } else if (direction === "Departs Island") {
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
    const today = moment.tz('America/Toronto').format('YYYY-MM-DD');
    const timesContainer = document.getElementById('ferryTimes');
    timesContainer.innerHTML = `<p>Ferries within the next hour are highlighted</p>`;
    timesContainer.classList.add('styledFerryTimes');

    schedules.forEach(schedule => {
        if (moment(schedule.start).isSameOrBefore(today) && (schedule.end === null || moment(schedule.end).isSameOrAfter(today))) {
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
            } else {
                timesContainer.innerHTML = `<p>No more departures for ${location} today.</p>`;
            }
        }
    });
}

function splitTimes(times) {
    // Splits times into past and future relative to current time in America/Toronto timezone
    const currentTime = moment.tz('America/Toronto');
    let nextTimes = [];
    let pastTimes = [];

    times.forEach(time => {
        const timeToday = moment.tz(time, 'HH:mm', 'America/Toronto');
        if (timeToday.isAfter(currentTime)) {
            nextTimes.push(time);
        } else {
            pastTimes.push(time);
        }
    });

    return [nextTimes, pastTimes];
}

function isWithinNextHour(time) {
    // Checks if a given time is within the next hour in America/Toronto timezone
    const currentTime = moment.tz('America/Toronto');
    const targetTime = moment.tz(time, 'HH:mm', 'America/Toronto');
    
    return targetTime.diff(currentTime, 'minutes') <= 60 && targetTime.isAfter(currentTime);
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
