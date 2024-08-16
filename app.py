from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterable

import pydantic
import requests
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)


class ShortstoryData(pydantic.BaseModel):
    id_: int
    title: str
    update_date: str
    url: str


class Data(pydantic.BaseModel):
    data: list[ShortstoryData]


# TODO: store data to text file; next - use sqlite
data = Data(data=[])
data_index: dict[int, int] = {}


def _get_shortstory_data(id_: int) -> ShortstoryData:
    index = data_index[id_]
    return data.data[index]


def _set_shortstory_data(shortstory_data: ShortstoryData) -> None:
    global data

    if shortstory_data.id_ not in data_index:
        data.data.append(shortstory_data)
        data_index[shortstory_data.id_] = len(data.data) - 1
    else:
        index = data_index[shortstory_data.id_]
        data.data[index] = shortstory_data


new_data = Data(data=[])
new_data_index: dict[int, int] = {}


def _get_new_shortstory_data(id_: int) -> ShortstoryData:
    index = new_data_index[id_]
    return new_data.data[index]


def _set_new_shortstory_data(new_shortstory_data: ShortstoryData) -> None:
    global new_data

    if new_shortstory_data.id_ not in new_data_index:
        new_data.data.append(new_shortstory_data)
        new_data_index[new_shortstory_data.id_] = len(new_data.data) - 1
    else:
        index = new_data_index[new_shortstory_data.id_]
        new_data.data[index] = new_shortstory_data


grey_list: set[int] = set()


data_file_path = Path("data.json")


def _load_data() -> None:
    global data

    if not data_file_path.exists():
        data = Data(data=[])
        return

    with open(data_file_path) as data_file:
        text = data_file.read()
        data = Data.model_validate_json(text)


def _save_data() -> None:
    with open(data_file_path, "w") as data_file:
        data_file.write(data.model_dump_json())


def _fetch_page(url):
    response = requests.get(url)
    response.raise_for_status()  # Raise an HTTPError if the request returned an unsuccessful status code
    return response.text


def _parse_shortstory_data_s(soup: BeautifulSoup) -> Iterable[ShortstoryData]:
    for shortstory_element in soup.find_all(class_="shortstory"):
        if not isinstance(shortstory_element, Tag):
            raise Exception
        shortstory_head_element = shortstory_element.find(class_="shortstoryHead")
        if not isinstance(shortstory_head_element, Tag):
            raise Exception
        a = shortstory_head_element.find("a", href=True)
        if not isinstance(a, Tag):
            raise Exception
        href = a["href"]
        if not isinstance(href, str):
            raise Exception
        id_: int = int(href.split("/")[-1].split("-")[0])
        title = a.text
        update_date_element = shortstory_element.find(class_="staticInfoLeftData")
        if not isinstance(update_date_element, Tag):
            raise Exception
        update_date = update_date_element.text

        shortstory_data = ShortstoryData(
            id_=id_,
            title=title,
            update_date=update_date,
            url=href,
        )
        _set_new_shortstory_data(shortstory_data)

        yield shortstory_data


def _get_page_count(soup: BeautifulSoup) -> int:
    # an error will be rised if page structure is changed
    pager = soup.find(class_="block_4")
    assert isinstance(pager, Tag)
    *_, last_page_index_element = (x for x in pager.children if x.text.strip())
    return int(last_page_index_element.text)


def _parse_main_page(page_index: int = 1) -> Iterable[ShortstoryData]:
    url = "https://v2.vost.pw/"
    if page_index > 1:
        url = f"{url}page/{page_index}/"

    html = _fetch_page(url)
    soup = BeautifulSoup(html, "html.parser")
    yield from _parse_shortstory_data_s(soup)


def _parse_main_pages(page_count: int) -> Iterable[ShortstoryData]:
    for i in range(page_count):
        for new_shortstory_data in _parse_main_page(i + 1):
            id_ = new_shortstory_data.id_
            if id_ in grey_list:
                continue

            if id_ not in data_index:
                yield new_shortstory_data
                continue

            shortstory_data = _get_shortstory_data(id_)
            if shortstory_data.update_date != new_shortstory_data.update_date:
                yield new_shortstory_data
                continue

            return


def _parse_shortstory_page(id_: int) -> None:
    # TODO: fix
    url = _get_shortstory_data(id_).url

    html = _fetch_page(url)
    soup = BeautifulSoup(html, "html.parser")

    assert isinstance(soup.title, Tag)
    _get_new_shortstory_data(id_).title = soup.title.text.split("»")[0].strip()


def _freez_shortstory_data(id_: int) -> None:
    _set_shortstory_data(_get_new_shortstory_data(id_))
    _save_data()


def _skip_shortstory_data(id_: int) -> None:
    grey_list.add(id_)
