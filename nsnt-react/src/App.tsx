import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { getData, getWatchedData, initDb, IWatchedItem, saveData, Stores, uploadFile } from './db';

function LoadSave({setDataTimestamp}: {setDataTimestamp: React.Dispatch<React.SetStateAction<number>>}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>();
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  React.useEffect(() => {
    if (!file) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        await uploadFile(file);
        setDataTimestamp(Date.now());
      } catch (error) {
        console.log("Load data error: ", error)
      }
      finally {
        setLoading(false);
      }
    }

    fetchData()

    }, [file]);

  const handleLoadClick = () => {
    hiddenFileInput.current?.click();
  }

  const handleSaveClick = async () => {
    await saveData(Stores.CachedData); // todo: temporary. for development only. remove later.

    // todo: store follow two as one file
    await saveData(Stores.IgnoredData);
    await saveData(Stores.WatchedData);
  }

  return (
    <div className="LoadSave" aria-disabled={loading} >
      <input type="file" id="fileInput" hidden onChange={handleFileChange} ref={hiddenFileInput} />
      <button onClick={handleLoadClick}>load</button>
      <button onClick={handleSaveClick}>save</button>
    </div>
  )
}

interface ISourceItem {
  title: string;
  url: string;
  elementsSelector: string;
  elementUriSelector: string;
  elementMarkersSelector: string;  // TODO: change to use multi values
  nextPageSelector: string;
}

function SourceItem({data}: {data: ISourceItem}) {
  const [isEditing, setIsEditing] = useState(false)

  const checkHandler = () => {
    setIsEditing(!isEditing)
  }

  return (
    <div className="SourceItem">
      <div>
        <label>edit</label><input type="checkbox" name="edit" checked={isEditing} onChange={checkHandler}/>
      </div>
      <div>
        <label>title:</label><input name="title" readOnly={isEditing} value={data.title} />
      </div>
      <div hidden={!isEditing}>
        <label>url:</label><input name="url" value={data.url} />
      </div>
      <div hidden={!isEditing}>
        <label>selector for elements:</label><input name="selector for elements" value={data.elementsSelector} />
      </div>
      <div hidden={!isEditing}>
        <label>selector for element id or url:</label><input name="selector for element id or url" value={data.elementUriSelector} />
      </div>
      <div hidden={!isEditing}>
        <label>selector for element markers:</label><input name="selector for element markers" value={data.elementMarkersSelector} />
      </div>
      <div hidden={!isEditing}>
        <label>selector for next page element:</label><input name="selector for next page element" value={data.nextPageSelector} />
      </div>
      <button hidden={isEditing}>update</button>
      <p>
      todo:<br/>
      - add handler for update button.<br />
      - add styles.
      </p>
    </div>
  )
}

function Sources({data}: {data: ISourceItem[]}) {
  const sourceItems = data.map(item => <SourceItem data={item}/>);

  return (
    <div className="Sources">
      <h2>sources</h2>
      {sourceItems}
    </div>
  )
}

function WatchedItem({data}: {data: IWatchedItem}) {
  return (
    <div className="WatchedItem">
      <div hidden>{data.url}</div>
      <input value={data.user_title} />
      <span>{data.source_title}</span>
      {data.user_description && <textarea>{data.user_description}</textarea>}
      {data.source_description && <span>{data.source_description}</span>}
      <div hidden>priority</div>
      <button>ignore</button>
      {/* <p>url (hidden). (later) image. user title (can be edited and saved; (maybe) set data from source title; input, useState, style). source title. (later) list of markers changes (details). user description (can be edited and save; textarea, useState, style; details). (maybe) source description (details). priority (drag and drop or buttons to change). ignore button (remove from watched list, add to ignored list).</p> */}
    </div>
  )
}

function Watched({dataTimestamp}: {dataTimestamp: number}) {
  const [watchedData, setWatchedData] = useState<IWatchedItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getWatchedData(); // todo: filter, sort, limit
      setWatchedData(data);
    }
    fetchData();
  }, [dataTimestamp]);

  const watchedItems = watchedData.map(item => <WatchedItem data={item} key={item.url} />);

  return (
    <div className="Watched">
      <h2>watched</h2>
      {watchedItems}
    </div>
  )
}

interface IOtherItem {
  url: string;
  title: string; // it is necessary to user quick understanding what it is. the data is set by society.
  description: string | null // the data is set by society.
}

function OtherItem({data}: {data: IOtherItem}) {
  return (
    <div className="OtherItem">
      <div hidden>{data.url}</div>
      <span>{data.title}</span>
      <span>{data.description}</span>
      <button>watch</button>
      <button>ignore</button>
      {/* <p>url (hidden). (later) image. title. (maybe) description (details). watch button (add to watched list). ignore button (add to ignored list).</p> */}
    </div>
  )
}

function Others({dataTimestamp}: {dataTimestamp: number}) {
  const [othersData, setOthersData] = useState<IOtherItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getData(Stores.CachedData); // todo: filter, sort, limit
      setOthersData(data);
    }
    fetchData();
  }, [dataTimestamp]);

  const otherItems = othersData.map(item => <OtherItem data={item}/>);

  return (
    <div className="Others">
      <h2>others</h2>
      {otherItems}
    </div>
  )
}

interface IIgnoredItem {
  url: string;
  title: string; // it is necessary to user quick understanding what it is. the data can be set by user.
  description: string | null // the data can be set by user.
}

function IgnoredItem({data}: {data: IIgnoredItem}) {
  return (
    <div className="IgnoredItem">
      <div hidden>{data.url}</div>
      <input value={data.title} />
      {data.description && <textarea>{data.description}</textarea>}
      <button>watch</button>
      {/* <p>url (hidden). (later) image (details; lazy download). title (can be edited and saved; input, useState, style). description (can be edited and save; textarea, useState, style). watch button (remove from ignored list, add to watched list).</p> */}
    </div>
  )
}

function Ignored({dataTimestamp}: {dataTimestamp: number}) {
  const [ignoredData, setIgnoredData] = useState<IIgnoredItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getData(Stores.IgnoredData); // todo: filter, sort, limit
      setIgnoredData(data);
    }
    fetchData();
  }, [dataTimestamp]);

  const ignoredItems = ignoredData.map(item => <IgnoredItem data={item} key={item.url} />);

  return (
    <div className="Ignored">
      <h2>ignored</h2>
      {ignoredItems}
    </div>
  )
}

function App() {
  const [isDbReady, setIsDbReady] = useState<boolean>(false);
  const [dataTimestamp, setDataTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    const fetchData = async () => {
      await initDb();
      setIsDbReady(true);
    }
    fetchData();
  }, []);

  return (
    <div className="App">
      <header className="App-header"></header>
      {isDbReady &&
        <>
          <LoadSave setDataTimestamp={setDataTimestamp} />
          <Sources data={[]} />
          <Watched dataTimestamp={dataTimestamp} />
          <Others dataTimestamp={dataTimestamp} />
          <Ignored dataTimestamp={dataTimestamp} />
        </>
      }
    </div>
  );
}

export default App;
