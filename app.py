from __future__ import annotations

import logging
from datetime import UTC, datetime
from itertools import chain
from pathlib import Path
from typing import Iterable

import pydantic
import requests
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)


class Item(pydantic.BaseModel):
    id_: int
    title: str
    update_date: datetime
    update_marker: str | None
    url: str

    priority: float | None = None
    # TODO: use this to store own description. `description: str | None = None`


class CachedData(pydantic.BaseModel):
    items: list[Item] = []


cached_data_file_path = Path("cached_data.json")


def _load_cached_data() -> dict[int, Item]:
    if not cached_data_file_path.exists():
        return {}

    with cached_data_file_path.open() as cahce_data_file:
        text = cahce_data_file.read()
        return {item.id_: item for item in CachedData.model_validate_json(text).items}


cached_data = _load_cached_data()


def _save_cached_data() -> None:
    with cached_data_file_path.open("w") as data_file:
        data_file.write(CachedData(items=list(cached_data.values())).model_dump_json())


def _add_to_cached_data(item: Item) -> bool:
    cached_item = cached_data.get(item.id_)
    if cached_item is not None and cached_item.update_marker == item.update_marker:
        return False

    cached_data[item.id_] = item
    _save_cached_data()
    return True


class Data(pydantic.BaseModel):
    items: list[Item] = []
    ignored_items: list[Item] = []


# TODO: use datavase (sqlite + sqlalchemy + orm) to store data and data_ignore

data_file_path = Path("data.json")


def _load_data() -> tuple[dict[int, Item], dict[int, Item]]:
    if not data_file_path.exists():
        return {}, {}

    with data_file_path.open() as data_file:
        text = data_file.read()
        data = Data.model_validate_json(text)
        items = {item.id_: item for item in data.items}
        ignored_items = {item.id_: item for item in data.ignored_items}

        for item in chain(data.items, data.ignored_items):
            if item.id_ not in cached_data:
                _add_to_cached_data(item)
                cached_data[item.id_].update_marker = None

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


def _parse_shortstory_data_s(
    soup: BeautifulSoup,
    *,
    stop_on_duplicate: bool = False,
) -> Iterable[Item]:
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

        item = Item(
            id_=id_,
            title=title,
            update_date=datetime.now(tz=UTC),
            update_marker=update_marker,
            url=href,
        )
        is_add = _add_to_cached_data(item)
        if stop_on_duplicate and not is_add:
            return

        yield item


def _get_page_count(soup: BeautifulSoup) -> int:
    pager = soup.find(class_="block_4")
    if not isinstance(pager, Tag):
        raise TypeError
    *_, last_page_index_element = (x for x in pager.children if x.text.strip())
    return int(last_page_index_element.text)


def _parse_main_page(
    page_index: int = 1,
    *,
    stop_on_duplicate: bool = False,
) -> Iterable[Item]:
    url = "https://v2.vost.pw/"
    if page_index > 1:
        url = f"{url}page/{page_index}/"

    html = _fetch_page(url)
    soup = BeautifulSoup(html, "html.parser")
    yield from _parse_shortstory_data_s(soup, stop_on_duplicate=stop_on_duplicate)


def _parse_main_pages(
    page_number_start: int = 1,
    page_count: int = 10,
    *,
    stop_on_duplicate: bool = False,
) -> Iterable[Item]:
    if stop_on_duplicate and len(cached_data) == 0:
        yield from _parse_main_page()
        return

    for page_number in range(page_number_start, page_number_start + page_count):
        yield from _parse_main_page(page_number, stop_on_duplicate=stop_on_duplicate)


def _parse_shortstory_page(id_: int) -> None:
    cached_item = cached_data.get(id_)
    if cached_item is None:
        return

    url = cached_item.url
    html = _fetch_page(url)
    soup = BeautifulSoup(html, "html.parser")

    if not isinstance(soup.title, Tag):
        raise TypeError
    title = soup.title.text.split("»")[0].strip()

    update_marker_element = soup.find(class_="staticInfoLeftData")
    if not isinstance(update_marker_element, Tag):
        raise TypeError
    update_marker = update_marker_element.text

    shortstory_data = Item(
        id_=id_,
        title=title,
        update_date=datetime.now(tz=UTC),
        update_marker=update_marker,
        url=url,
    )
    _add_to_cached_data(shortstory_data)


def _add(id_: int) -> None:
    cached_item = cached_data.get(id_)
    if cached_item is None:
        return
    data[id_] = cached_item
    _save_data()


def _add_ignore(id_: int) -> None:
    cached_item = cached_data.get(id_)
    if cached_item is None:
        return
    ignored_data[id_] = cached_item
    _save_data()


def _set_priority(id_: int, priority: float) -> None:
    if id_ not in data:
        return

    data[id_].priority = priority
    _save_data()


# show 3 lists:
#   - list of interest (loi):
#       - filter by changes; i don't want to see information that i've processed;
#       - sorted by priority; to see main information first; it would be good to store data in sorted mode;
#       - show id, info (title), changes; id to manipulate, info to understand, changes to make desizion;
#   - list of others;
#       - filter (exclude loi; exclude ignor_list);
#       - sort by update_date; it would be good to store data in sorted mode;
#       - group by number of update (each update of main pages has unique number; not implemented);
#       - show id, info (title); id to manipulate, info to understand;
#   - list of ignore (igonre_list);
#       - sorted by time of adding; to remove if add wrong; it would be good to store data in sorted mode;
#       - show id, info (title);


def _get_interests() -> Iterable[str]:
    changed_data = (
        item
        for item in data.values()
        if item.update_marker != cached_data[item.id_].update_marker
    )
    none_priority: float = float("inf")
    sorted_data_by_priority = sorted(
        changed_data,
        key=lambda x: x.id_ if x is not None else none_priority,
        reverse=True,
    )
    yield from (
        f"{item.id_}\n\t{item.title}\n\t{cached_data[item.id_].title}"
        for item in sorted_data_by_priority
    )


def _get_others() -> Iterable[str]:
    other_data = [
        value
        for key, value in cached_data.items()
        if key not in data and key not in ignored_data
    ]
    sorted_data_by_update_dt = sorted(
        other_data, key=lambda x: x.update_date.astimezone(UTC), reverse=True,
    )
    yield from (f"{item.id_}\n\t{item.title}" for item in sorted_data_by_update_dt)


def _get_wrong() -> Iterable[str]:
    sorted_data_by_add_dt = ignored_data  # TODO: add field `add_dt` to use `sorted(ignored_data, key=lambda x: x.add_date.astimezone(UTC), reverse=True)`
    yield from (
        f"{item.id_}\n\t{item.title}" for item in sorted_data_by_add_dt.values()
    )


# TODO: add vs add_and_update
# TODO: show stored difference between stored and cached. show diff in title.
# TODO: update title and update_marker
# TODO: add priority to interested items
# TODO: show items wich is not equal to cached and sort by priority (use paging)
# TODO: show cached items groupped by update_date sort
