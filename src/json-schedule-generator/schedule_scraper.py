import logging
import requests
from bs4 import BeautifulSoup

class ScheduleScraper:
    SCHEDULE_URL: str = (
        "https://www.toronto.ca/explore-enjoy/parks-gardens-beaches/toronto-island-park/all-ferry-schedules/"
    )
    LOGGER: logging.Logger = logging.getLogger("schedule_scraper")

    @staticmethod
    def scrape_schedules() -> BeautifulSoup:
        ScheduleScraper.LOGGER.info("Retrieving ferry schedules")
        try:
            response = requests.get(ScheduleScraper.SCHEDULE_URL)
            response.raise_for_status()
            ScheduleScraper.save_to_file(response.text, "../../output/schedules.html")
        except requests.HTTPError as error:
            ScheduleScraper.LOGGER.error(error)
            raise error
        ScheduleScraper.LOGGER.info("Successfully retrieved ferry schedules")
        return BeautifulSoup(response.text, "html.parser")

    @staticmethod
    def save_to_file(content: str, file_path: str) -> None:
        ScheduleScraper.LOGGER.info(f"Saving webpage to {file_path}")
        with open(file_path, "w", encoding="utf-8") as file:
            file.write(content)
        ScheduleScraper.LOGGER.info(f"Webpage saved to {file_path}")

