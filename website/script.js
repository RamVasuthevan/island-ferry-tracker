function displayCurrentTimeEST() {
    const options = { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    document.getElementById('currentTime').innerText = new Date().toLocaleTimeString('en-US', options);
}

async function listTodaySchedule() {
    const response = await fetch('data/schedule.json');
    const data = await response.json();
    const schedules = data.schedules;
    const today = new Date().toISOString().split('T')[0];
    const routeSelect = document.getElementById('ferryRoute');

    schedules.forEach(schedule => {
        if (new Date(schedule.start) <= new Date(today) && (schedule.end === null || new Date(schedule.end) >= new Date(today))) {
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
    const {location, direction} = JSON.parse(selectedRoute);
    let routeOption;
    if (direction === "Departs City") {
        routeOption = `City to ${location}`;
    } else if (direction === "Departs Island") {
        routeOption = `${location} to City`;
    }

    const response = await fetch('data/schedule.json');
    const data = await response.json();
    const schedules = data.schedules;
    const today = new Date().toISOString().split('T')[0];
    const timesContainer = document.getElementById('ferryTimes');
    timesContainer.innerHTML = `<p>Ferries within the next hour are highlighted</p>`;
    timesContainer.classList.add('styledFerryTimes');

    schedules.forEach(schedule => {
        if (new Date(schedule.start) <= new Date(today) && (schedule.end === null || new Date(schedule.end) >= new Date(today))) {
            if (schedule.locations[location] && schedule.locations[location][direction]) {
                let allTimes = schedule.locations[location][direction];
                let [remainingTimes, pastTimes] = splitTimes(allTimes);

                let tableHTML = `<table><tr><th>Remaining Schedule for ${routeOption} today:</th></tr>`;
                if (remainingTimes.length > 0) {
                    remainingTimes.forEach(time => {
                        const highlightClass = isWithinNextHour(time) ? 'class="highlight"' : '';
                        tableHTML += `<tr ${highlightClass}><td>${convertToAmPm(time)}</td></tr>`;
                    });
                }

                tableHTML += `<tr><td>Schedule continuing tomorrow</td></tr>`;

                pastTimes.forEach(time => {
                    tableHTML += `<tr><td>${convertToAmPm(time)}</td></tr>`;
                });

                tableHTML += `</table>`;
                timesContainer.innerHTML += tableHTML;
            } else {
                timesContainer.innerHTML = `<p>No more departures for ${routeOption} today.</p>`;
            }
        }
    });
}

function splitTimes(times) {
    const currentTime = new Date();
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    let nextTimes = [];
    let pastTimes = [];

    for (let time of times) {
        const [hours, minutes] = time.split(':').map(num => parseInt(num, 10));
        if (hours > currentHours || (hours === currentHours && minutes > currentMinutes)) {
            nextTimes.push(time);
        } else {
            pastTimes.push(time);
        }
    }

    return [nextTimes, pastTimes];
}

function isWithinNextHour(time) {
    const currentTime = new Date();
    const targetTime = new Date();
    const [hours, minutes] = time.split(':').map(num => parseInt(num, 10));
    
    targetTime.setHours(hours);
    targetTime.setMinutes(minutes);

    const timeDifference = (targetTime - currentTime) / (1000 * 60);
    return timeDifference <= 60;
}

function convertToAmPm(time) {
    const [hours, minutes] = time.split(':');
    const hoursInt = parseInt(hours, 10);
    if (hoursInt === 0) {
        return `12:${minutes} AM`;
    } else if (hoursInt < 12) {
        return `${hours}:${minutes} AM`;
    } else if (hoursInt === 12) {
        return `${hours}:${minutes} PM`;
    } else {
        return `${hoursInt - 12}:${minutes} PM`;
    }
}

window.onload = function() {
    displayCurrentTimeEST();
    listTodaySchedule();
    setInterval(displayCurrentTimeEST, 1000);
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ferryRoute').addEventListener('change', (event) => {
        showNextFerryTimes(event.target.value);
    });
});
