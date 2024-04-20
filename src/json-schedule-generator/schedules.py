import datetime
from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class LocationSchedule:
    Departs_City: List[str]
    Departs_Island: List[str]


@dataclass
class Schedule:
    name: str
    start: datetime.date
    end: Optional[datetime.date]
    locations: Dict[str, LocationSchedule]


@dataclass
class Schedules:
    schedules: List[Schedule]
