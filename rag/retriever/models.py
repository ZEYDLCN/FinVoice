from dataclasses import dataclass


@dataclass
class Chunk:
    text: str
    source: str  # document filename


@dataclass
class SearchResult:
    text: str
    source: str
    score: float
