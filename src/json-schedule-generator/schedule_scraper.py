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
        except requests.HTTPError as error:
            ScheduleScraper.LOGGER.error(error)
            raise error
        ScheduleScraper.LOGGER.info("Successfully retrieved ferry schedules")
        return BeautifulSoup(response.text, "html.parser")
