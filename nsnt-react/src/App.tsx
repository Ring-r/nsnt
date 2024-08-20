import React, { useState } from 'react';
import './App.css';

function LoadSave({data, setData}: {data: IData, setData: React.Dispatch<React.SetStateAction<IData>>}) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  React.useEffect(() => {
    async function uploadFile() {
      try {
        // setLoading("true");
        if (!file) return;

        const textContent = await file.text();
        const jsonContent = JSON.parse(textContent);
        setData(jsonContent)
        // localStorage.setItem('data', jsonContent);

        // setResult();
      } catch (error) {
        // setLoading("null");
      }
    }
    uploadFile();
  }, [file]);

  return (
    <div className="LoadSave">
      <input type="file" id="input" onChange={handleFileChange} />
      <button>load</button>
      <button>save</button>
      <p>
      todo:<br/>
      - add actions. information stored in localStorage and can move from and to local file system.<br/>
      - add styles. 
      </p>
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

interface IWatchedItem {
  url: string;
  source_title: string; // it is necessary to user quick understanding what it is.
  source_description: string | null
  user_title: string; // it is necessary to user quick understanding what it is.
  user_description: string | null
}

function WatchedItem({data}: {data: IWatchedItem}) {
  return (
    <div className="WatchedItem">
      <div hidden>{data.url}</div>
      <div>
        <input name="user_title" value={data.user_title} />
      </div>
      <div>
        <input name="source_title" value={data.source_title} />
      </div>
      {(data.user_description || data.source_description) &&
        <details>
          <summary>description</summary>
          <textarea name="description">{data.user_description}</textarea>
          {data.source_description &&
            <details>
              <summary>source description</summary>
              <textarea name="description">{data.source_description}</textarea>
            </details>
          }
        </details>
      }
      <div hidden>priority</div>
      <p>url (hidden). (later) image. user title (can be edited and saved; (maybe) set data from source title; input, useState, style). source title. (later) list of markers changes (details). user description (can be edited and save; textarea, useState, style; details). (maybe) source description (details). priority (drag and drop or buttons to change). ignore button (remove from watched list, add to ignored list).</p>
      <button>ignore</button>
    </div>
  )
}

function Watched({data}: {data: IWatchedItem[]}) {
  const watchedItems = data.map(item => <WatchedItem data={item}/>);

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
      <div>{data.title}</div>
      {data.description &&
        <details>
          <summary>{data.description}</summary>
          <textarea name="description" />
        </details>
      }
      <p>url (hidden). (later) image. title. (maybe) description (details). watch button (add to watched list). ignore button (add to ignored list).</p>
      <button>watch</button>
      <button>ignore</button>
    </div>
  )
}

function Others({data}: {data: IOtherItem[]}) {
  const otherItems = data.map(item => <OtherItem data={item}/>);

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
      <div>
        <input name="title" value={data.title} />
      </div>
      {data.description &&
        <details>
          <summary>{data.description}</summary>
          <textarea name="description">{data.description}</textarea>
        </details>
      }
      <p>url (hidden). (later) image (details; lazy download). title (can be edited and saved; input, useState, style). description (can be edited and save; textarea, useState, style). watch button (remove from ignored list, add to watched list).</p>
      <button>watch</button>
    </div>
  )
}

function Ignored({data}: {data: IIgnoredItem[]}) {
  const ignoredItems = data.map(item => <IgnoredItem data={item}/>);

  return (
    <div className="Ignored">
      <h2>ignored</h2>
      {ignoredItems}
    </div>
  )
}

interface IData {
  ignored_items: IIgnoredItem[];
}

function App() {
  const [data, setData] = useState<IData>({
    ignored_items: []
  });

  return (
    <div className="App">
      <header className="App-header"></header>
      <LoadSave data={data} setData={setData}/>
      <Sources data={[]} />
      <Watched data={[]} />
      <Others data={[]} />
      <Ignored data={data.ignored_items} />
    </div>
  );
}

export default App;
