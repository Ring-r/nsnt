import { IDBPDatabase, openDB } from "idb";

const dbName = "nsnt";
const dbVersion = 1;
let db: IDBPDatabase<unknown>;

export enum Stores {
    CachedData = "cachedData",
    IgnoredData = "ignoredData",
    WatchedData = "watchedData",
  }
  
export interface IItem {
    url: string;
    title: string;
    description: string | null
    // TODO: should be uses `priority`?
  }

export interface IWatchedItem {
  url: string;
  source_title: string; // it is necessary to user quick understanding what it is.
  source_description: string | null
  user_title: string; // it is necessary to user quick understanding what it is.
  user_description: string | null
}

export interface IData {
  watched_items: IItem[];
  ignored_items: IItem[];
}

export const initDb = async () => {
  db = await openDB(dbName, dbVersion, {
    upgrade(db, oldVersion, newVersion, transaction, event) {
      if (!db.objectStoreNames.contains(Stores.CachedData)) {
        db.createObjectStore(Stores.CachedData, { keyPath: "url" });
        console.log(Stores.CachedData + ". object store created");
      }
      if (!db.objectStoreNames.contains(Stores.IgnoredData)) {
        db.createObjectStore(Stores.IgnoredData, { keyPath: "url" });
        console.log(Stores.IgnoredData + ". object store created");
      }
      if (!db.objectStoreNames.contains(Stores.WatchedData)) {
        db.createObjectStore(Stores.WatchedData, { keyPath: "url" });
        console.log(Stores.WatchedData + ". object store created");
      }
    },
  });
}

export const loadData = async (file: File) => {
    const textContent = await file.text();
    const jsonContent = (JSON.parse(textContent) as IData); // todo: is it correct to use `as` here?

    for await (const ignoredItem of jsonContent.ignored_items) {
      await addData(Stores.CachedData, ignoredItem);
      await addData(Stores.IgnoredData, ignoredItem); // todo: put?
    }
    for await (const watchedItem of jsonContent.watched_items) {
      await addData(Stores.CachedData, watchedItem);
      await addData(Stores.WatchedData, watchedItem); // todo: put?
    }

}

export const saveData = async (isCachedData: boolean = false) => {
  if (isCachedData) {
    // todo: temporary. for development only. remove later.
    const cachedData = await db.getAll(Stores.CachedData);
    const jsonString = JSON.stringify(cachedData, null, 2);
    downloadJSON(jsonString, "cached_data.json");  
  }

  const ignoreData = await db.getAll(Stores.IgnoredData);
  const watchedData = await db.getAll(Stores.WatchedData);
  const data = {
    "watched_data": watchedData,
    "ignore_data": ignoreData,
  }
  const jsonString = JSON.stringify(data, null, 2);
  downloadJSON(jsonString, "data.json");
}

const downloadJSON = (jsonString: string, filename: string) => {
  const blob = new Blob([jsonString], { type: "application/json" });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const addData = async (storeName: string, item: IItem) => {
  try {
    await db.add(storeName, item);
    // todo: signal
  }
  catch {
    // todo: skip error relates to duplicates.
    // todo: where should error be catched (transaction or request)?
    console.log(storeName + ". transaction not opened due to error. Duplicate items not allowed.");
  }
}

export const getData = async (storeName: string) => {
  const count = 10;
  return db.getAll(storeName, null, count);
}

export const getOthersData = async () => {
  let cursor = await db.transaction(Stores.CachedData).store.openCursor();

  const count = 10;
  let i = 0;
  const data = []
  while (cursor) {
    if (await db.get(Stores.IgnoredData, cursor.key)) continue;
    if (await db.get(Stores.WatchedData, cursor.key)) continue;

    data.push(cursor.value);

    i++;
    if (i === count) break;
    cursor = await cursor.continue();
  }

  return data;
}

export const getWatchedData = async () => {
  const watchedData = await db.getAll(Stores.WatchedData, null, 3);
  const data: IWatchedItem[] = [];
  for await (const watchedItem of watchedData) {
    const cachedItem = await db.get(Stores.CachedData, watchedItem.url);
    data.push({
      url: watchedItem.url,
      source_title: cachedItem.title,
      source_description: cachedItem.description,
      user_title: watchedItem.title,
      user_description: watchedItem.description
    })
  }
  return data;
}

export const ignoreData = async (itemUrl: string) => {
  let item = await db.get(Stores.WatchedData, itemUrl);
  if (item) {
    await db.delete(Stores.WatchedData, itemUrl);
  }
  else {
    item = await db.get(Stores.CachedData, itemUrl);
  }
  addData(Stores.IgnoredData, item);
}

export const watcheData = async (itemUrl: string) => {
  let item = await db.get(Stores.IgnoredData, itemUrl);
  if (item) {
    await db.delete(Stores.IgnoredData, itemUrl);
  }
  else {
    item = await db.get(Stores.CachedData, itemUrl);
  }
  addData(Stores.WatchedData, item);
}