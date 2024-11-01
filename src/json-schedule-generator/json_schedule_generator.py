import datetime
import json
import logging
import re
from dataclasses import asdict
from typing import Any, List, Optional, Tuple

from bs4 import BeautifulSoup
from google.protobuf import json_format
from models.proto.schedules_pb2 import Date, LocationSchedule, Schedule, Schedules
from schedule_scraper import ScheduleScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(filename)s (%(lineno)d) - %(levelname)s - %(message)s",
)
LOGGER = logging.getLogger("json_schedule_generator")


class JsonScheduleGenerator:
    SEASONS = ["spring", "summer", "fall", "winter"]

    @staticmethod
    def create_schedules(*, schedules_soup: BeautifulSoup) -> Schedules:
        schedules_list = []
        for season in JsonScheduleGenerator.SEASONS:
            LOGGER.info(f"Creating schedule for {season}")
            table_id = f"accordion-{season}-schedule"
            schedule_soup = schedules_soup.find(id=table_id)
            if not JsonScheduleGenerator._is_valid_schedule(
                schedule_soup=schedule_soup
            ):
                continue
            schedules_list.append(
                JsonScheduleGenerator._create_schedule(schedule_soup=schedule_soup)
            )
        LOGGER.info("Created all schedules")
        JsonScheduleGenerator._populate_end_dates(schedules=schedules_list)
        schedules = Schedules()
        schedules.schedules.extend(schedules_list)
        return schedules

    @staticmethod
    def _is_valid_schedule(*, schedule_soup) -> bool:
        table_soup = schedule_soup.find("table", class_="cot-table")
        start = JsonScheduleGenerator._get_start_date(
            schedule_caption=table_soup.contents[1].contents[0]
        )
        return start is not None

    @staticmethod
    def _create_schedule(*, schedule_soup: BeautifulSoup) -> Schedule:
        table_soup = schedule_soup.find("table", class_="cot-table")
        locations = {}
        for location_schedule_soup in schedule_soup.find_all(
            "table", class_="cot-table"
        ):
            location, location_schedule = (
                JsonScheduleGenerator._create_location_schedule(
                    location_schedule_soup=location_schedule_soup
                )
            )
            locations[location] = location_schedule
        schedule = Schedule()
        schedule.name = schedule_soup.get("id").split("-")[1].capitalize()
        schedule.start.CopyFrom(
            datetime_date_to_date(
                JsonScheduleGenerator._get_start_date(
                    schedule_caption=table_soup.contents[1].contents[0]
                )
            )
        )
        for location, location_schedule in locations.items():
            schedule.locations[location].CopyFrom(location_schedule)
        return schedule

    @staticmethod
    def _get_start_date(*, schedule_caption: str) -> Optional[datetime.date]:
        LOGGER.info("Finding start date")
        month, day, year = JsonScheduleGenerator.parse_date(schedule_caption)
        if any(info is None for info in [month, day, year]):
            return None
        return datetime.datetime.strptime(f"{month} {day} {year}", "%B %d %Y").date()

    @staticmethod
    def parse_date(sentence) -> Tuple[Optional[str], Optional[int], Optional[int]]:
        # Define the regex patterns for month, day, and year
        month_pattern = r"(January|February|March|April|May|June|July|August|September|October|November|December)"
        day_pattern = r"\b([1-9]|[12][0-9]|3[01])\b"
        year_pattern = r"\b(\d{4})\b"

        # Search for the patterns in the sentence
        month_match = re.search(month_pattern, sentence, re.IGNORECASE)
        day_match = re.search(day_pattern, sentence)
        year_match = re.search(year_pattern, sentence)

        # Extract the matched values
        month = month_match.group(0) if month_match else None
        day = int(day_match.group(0)) if day_match else None
        year = int(year_match.group(0)) if year_match else None

        return month, day, year

    @staticmethod
    def _create_location_schedule(
        *,
        location_schedule_soup: List[BeautifulSoup],
    ) -> Tuple[str, LocationSchedule]:
        location = (
            location_schedule_soup.contents[3].contents[1].contents[3].contents[0]
        )
        LOGGER.info(f"Creating location schedule for {location}")
        if not isinstance(location, str):
            location = location.contents[0]
        location = " ".join(location.split()[1:])
        rows = location_schedule_soup.contents[5].contents
        departs_city = [
            JsonScheduleGenerator._format_time(time=row.contents[1].contents[0])
            for row in rows
            if row != "\n"
        ]
        departs_island = [
            JsonScheduleGenerator._format_time(time=row.contents[3].contents[0])
            for row in rows
            if row != "\n"
        ]
        location_schedule = LocationSchedule()
        location_schedule.departsCity.extend(departs_city)
        location_schedule.departsIsland.extend(departs_island)
        return location, location_schedule

    @staticmethod
    def _populate_end_dates(*, schedules: List) -> None:
        LOGGER.info("Populating end dates for schedules")
        schedules.sort(key=lambda schedule: date_to_datetime_date(schedule.start))
        for i in range(len(schedules) - 1):
            schedules[i].end.CopyFrom(
                datetime_date_to_date(
                    date_to_datetime_date(schedules[i + 1].start)
                    - datetime.timedelta(days=1)
                )
            )
        schedules[-1].end.CopyFrom(Date())

    @staticmethod
    def _format_time(*, time: str) -> str:
        if time.lower() == "noon":
            return "12:00"
        time = time.replace("a.m.", "AM").replace("p.m.", "PM")
        time_obj = datetime.datetime.strptime(time, "%I:%M %p")
        return time_obj.strftime("%H:%M")


def datetime_date_to_date(date: datetime.date) -> Date:
    if date is None:
        return Date()
    result = Date()
    result.year = date.year
    result.month = date.month
    result.day = date.day
    return result


def date_to_datetime_date(date: Date) -> datetime.date:
    return datetime.date(year=date.year, month=date.month, day=date.day)


def custom_serializer(obj: Any) -> Any:
    if isinstance(obj, Date):
        return date_to_datetime_date(obj).isoformat()


def run():
    soup = ScheduleScraper.scrape_schedules()
    schedules = JsonScheduleGenerator.create_schedules(schedules_soup=soup)
    schedules_dict = json_format.MessageToDict(schedules)
    schedules_string = json.dumps(
        schedules_dict, ensure_ascii=False, default=custom_serializer, indent=4
    )
    schedules_string = schedules_string.replace("Departs_City", "Departs City").replace(
        "Departs_Island", "Departs Island"
    )
    LOGGER.info(f"Created schedules string: {schedules_string}")
    with open("../../output/schedule.json", "w") as f:
        f.write(schedules_string)
    LOGGER.info("Wrote schedules string to output/schedule.json")


if __name__ == "__main__":
    run()
