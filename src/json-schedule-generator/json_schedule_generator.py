from bs4 import BeautifulSoup
import datetime
from dataclasses import asdict
import json
from schedule_scraper import ScheduleScraper
from schedules import LocationSchedule, Schedule, Schedules
from typing import Any, List, Optional, Tuple


class JsonScheduleGenerator:
    SEASONS = ["spring", "summer", "fall", "winter"]

    @staticmethod
    def create_schedules(*, schedules_soup: BeautifulSoup) -> Schedules:
        schedules = []
        for season in JsonScheduleGenerator.SEASONS:
            table_id = f"accordion-{season}-schedule"
            schedule_soup = schedules_soup.find(id=table_id)
            schedule = JsonScheduleGenerator._create_schedule(
                schedule_soup=schedule_soup
            )
            if schedule is not None:
                schedules.append(schedule)
        JsonScheduleGenerator._populate_end_dates(schedules=schedules)
        return Schedules(schedules=schedules)

    @staticmethod
    def _create_schedule(*, schedule_soup: BeautifulSoup) -> Optional[Schedule]:
        table_soup = schedule_soup.find("table", class_="cot-table")
        name, start = JsonScheduleGenerator._schedule_name_and_start_date(
            schedule_caption=table_soup.contents[1].contents[0]
        )
        if start is None:
            return None
        end = None
        location_schedule_soups = schedule_soup.find_all("table", class_="cot-table")
        locations = {}
        for location_schedule_soup in location_schedule_soups:
            location, location_schedule = (
                JsonScheduleGenerator._create_location_schedule(
                    location_schedule_soup=location_schedule_soup
                )
            )
            locations[location] = location_schedule
        return Schedule(name=name, start=start, end=end, locations=locations)

    @staticmethod
    def _schedule_name_and_start_date(
        *, schedule_caption: str
    ) -> Tuple[Optional[str], Optional[datetime.date]]:
        if "starts" in schedule_caption:
            words = schedule_caption.split()
            name = f"{words[2].capitalize()} {words[1]} Schedule"
            start_date = f"{words[-2]} {words[-1][:-1]} {words[1]}"
            return name, datetime.datetime.strptime(start_date, "%B %d %Y").date()
        if "started" in schedule_caption:
            words = schedule_caption.split()
            name = f"{words[1].capitalize()} {words[-1][:-1]} Schedule"
            start_date = " ".join(words[-3:])
            return name, datetime.datetime.strptime(start_date, "%B %d, %Y.").date()
        return None, None

    @staticmethod
    def _create_location_schedule(
        *,
        location_schedule_soup: List[BeautifulSoup],
    ) -> Tuple[str, LocationSchedule]:
        location = (
            location_schedule_soup.contents[3].contents[1].contents[3].contents[0]
        )
        if not isinstance(location, str):
            location = location.contents[0]
        location = " ".join(location.split()[1:])
        departs_city = []
        departs_island = []
        rows = location_schedule_soup.contents[5].contents
        for row in rows[1 : len(rows) : 2]:
            departs_city_time = JsonScheduleGenerator._format_time(
                time=row.contents[1].contents[0]
            )
            departs_island_time = JsonScheduleGenerator._format_time(
                time=row.contents[3].contents[0]
            )
            departs_city.append(departs_city_time)
            departs_island.append(departs_island_time)
        return location, LocationSchedule(
            Departs_City=departs_city, Departs_Island=departs_island
        )

    @staticmethod
    def _populate_end_dates(*, schedules: List[Schedule]) -> None:
        schedules.sort(key=lambda schedule: schedule.start)
        for i in range(len(schedules) - 1):
            schedules[i].end = schedules[i + 1].start - datetime.timedelta(days=1)

    @staticmethod
    def _format_time(*, time: str) -> str:
        time = time.replace("a.m.", "AM").replace("p.m.", "PM")
        time_obj = datetime.datetime.strptime(time, "%I:%M %p")
        return time_obj.strftime("%H:%M")


def custom_serializer(obj: Any) -> Any:
    if isinstance(obj, datetime.date):
        return obj.isoformat()


def run():
    soup = ScheduleScraper.scrape_schedules()
    schedules = JsonScheduleGenerator.create_schedules(schedules_soup=soup)
    schedules_string = json.dumps(
        asdict(schedules), ensure_ascii=False, default=custom_serializer, indent=4
    )
    schedules_string = schedules_string.replace("Departs_City", "Departs City").replace(
        "Departs_Island", "Departs Island"
    )
    with open("../../output/schedule.json", "w") as f:
        f.write(schedules_string)


if __name__ == "__main__":
    run()
