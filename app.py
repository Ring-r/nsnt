from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Iterable

import pydantic
import requests
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)


class ShortstoryData(pydantic.BaseModel):
    id_: int
    title: str
    update_date: datetime
    update_marker: str
    url: str


class CachedData(pydantic.BaseModel):
    items: list[ShortstoryData] = []


cached_data_file_path = Path("cached_data.json")


def _load_cached_data() -> dict[int, ShortstoryData]:
    if not cached_data_file_path.exists():
        return {}

    with cached_data_file_path.open() as cahce_data_file:
        text = cahce_data_file.read()
        return {item.id_: item for item in CachedData.model_validate_json(text).items}


cached_data = _load_cached_data()


def _save_cached_data() -> None:
    with cached_data_file_path.open("w") as data_file:
        data_file.write(CachedData(items=list(cached_data.values())).model_dump_json())


def _add_to_cached_data(item: ShortstoryData) -> None:
    cached_item = cached_data.get(item.id_)
    if cached_item is not None and cached_item.update_marker == item.update_marker:
        return

    cached_data[item.id_] = item
    _save_cached_data()


class Data(pydantic.BaseModel):
    items: list[ShortstoryData] = []
    ignored_items: list[ShortstoryData] = []


# TODO: use datavase (sqlite + sqlalchemy + orm) to store data and data_ignore

data_file_path = Path("data.json")


def _load_data() -> tuple[dict[int, ShortstoryData], dict[int, ShortstoryData]]:
    if not data_file_path.exists():
        return {}, {}

    with data_file_path.open() as data_file:
        text = data_file.read()
        data = Data.model_validate_json(text)
        items = {item.id_: item for item in data.items}
        ignored_items = {item.id_: item for item in data.ignored_items}

        for item in data.items:
            _add_to_cached_data(item)
        for item in data.ignored_items:
            _add_to_cached_data(item)

        return items, ignored_items


data, ignored_data = _load_data()


def _save_data() -> None:
    with data_file_path.open("w") as data_file:
        data_file.write(
            Data(
                items=list(data.values()),
                ignored_items=list(ignored_data.values()),
            ).model_dump_json(indent=2),
        )


def _fetch_page(url: str) -> str:
    response = requests.get(url)
    response.raise_for_status()
    return response.text


def _parse_shortstory_data_s(soup: BeautifulSoup) -> Iterable[ShortstoryData]:
    for shortstory_element in soup.find_all(class_="shortstory"):
        if not isinstance(shortstory_element, Tag):
            raise TypeError

        shortstory_head_element = shortstory_element.find(class_="shortstoryHead")
        if not isinstance(shortstory_head_element, Tag):
            raise TypeError
        a = shortstory_head_element.find("a", href=True)
        if not isinstance(a, Tag):
            raise TypeError
        href = a["href"]
        if not isinstance(href, str):
            raise TypeError
        id_: int = int(href.split("/")[-1].split("-")[0])
        title = a.text

        update_marker_element = shortstory_element.find(class_="staticInfoLeftData")
        if not isinstance(update_marker_element, Tag):
            raise TypeError
        update_marker = update_marker_element.text

        shortstory_data = ShortstoryData(
            id_=id_,
            title=title,
            update_date=datetime.now(),
            update_marker=update_marker,
            url=href,
        )
        _add_to_cached_data(shortstory_data)

        yield shortstory_data


def _get_page_count(soup: BeautifulSoup) -> int:
    pager = soup.find(class_="block_4")
    if not isinstance(pager, Tag):
        raise TypeError
    *_, last_page_index_element = (x for x in pager.children if x.text.strip())
    return int(last_page_index_element.text)


def _parse_main_page(page_index: int = 1) -> Iterable[ShortstoryData]:
    url = "https://v2.vost.pw/"
    if page_index > 1:
        url = f"{url}page/{page_index}/"

    html = _fetch_page(url)
    soup = BeautifulSoup(html, "html.parser")
    yield from _parse_shortstory_data_s(soup)


# TODO: save last date update and update from 1 page until find necessary date


def _parse_shortstory_page(id_: int) -> None:
    cache_shortstory_data = cached_data.get(id_)
    if cache_shortstory_data is None:
        return  # TODO: or error?

    url = cache_shortstory_data.url
    html = _fetch_page(url)
    soup = BeautifulSoup(html, "html.parser")

    if not isinstance(soup.title, Tag):
        raise TypeError
    title = soup.title.text.split("»")[0].strip()

    update_marker_element = soup.find(class_="staticInfoLeftData")
    if not isinstance(update_marker_element, Tag):
        raise TypeError
    update_marker = update_marker_element.text

    shortstory_data = ShortstoryData(
        id_=id_,
        title=title,
        update_date=datetime.now(),
        update_marker=update_marker,
        url=url,
    )
    _add_to_cached_data(shortstory_data)


def _add(id_: int) -> None:
    cache_shortstory_data = cached_data.get(id_)
    if cache_shortstory_data is None:
        return  # TODO: or error?
    data[id_] = cache_shortstory_data
    _save_data()


def _add_ignore(id_: int) -> None:
    cache_shortstory_data = cached_data.get(id_)
    if cache_shortstory_data is None:
        return  # TODO: or error?
    ignored_data[id_] = cache_shortstory_data
    _save_data()


def _look_to_watch(page_number: int) -> Iterable[ShortstoryData]:
    processed_id_s = set(data.keys()) | set(ignored_data.keys())
    yield from (x for x in _parse_main_page(page_number) if x.id_ not in processed_id_s)
