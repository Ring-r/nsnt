import React, { useState } from 'react';
import './App.css';

function LoadSave({data, setData}: {data: IData | null, setData: React.Dispatch<React.SetStateAction<IData | null>>}) {
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


  const fileChangeHandler = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files == null) return;

    const textContent = await target.files[0].text();
    const jsonContent = JSON.parse(textContent);
    localStorage.setItem('data', jsonContent);
  }

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

function SourceItem() {
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
        <label>title:</label><input name="title" readOnly={isEditing} />
      </div>
      <div hidden={!isEditing}>
        <label>url:</label><input name="url" />
      </div>
      <div hidden={!isEditing}>
        <label>selector for elements:</label><input name="selector for elements" />
      </div>
      <div hidden={!isEditing}>
        <label>selector for element id or url:</label><input name="selector for element id or url" />
      </div>
      <div hidden={!isEditing}>
        <label>selector for element markers:</label><input name="selector for element markers" />
      </div>
      <div hidden={!isEditing}>
        <label>selector for next page element:</label><input name="selector for next page element" />
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

function Sources() {
  return (
    <div className="Sources">
      <h2>sources</h2>
      <SourceItem />
      <p>
      todo:<br/>
      - create list of sources.
      </p>
    </div>
  )
}

function WatchedItem() {
  return (
    <div className="WatchedItem">
      <div hidden>url</div>
      <div>image</div>
      <div>
        <input name="title" />
      </div>
      <div>cached title</div>
      <details>
        <summary>description</summary>
        <textarea name="description" />
      </details>
      <div hidden>priority</div>
      <button>ignore</button>
      <p>
      todo:<br/>
      - url (hidden)<br/>
      - (later) image<br/>
      - title (input; can be edited and saved)<br/>
      - cached title (later list of changed markers) (copy current to item info)<br/>
      - description (spoiler; can be edited and save)<br/>
      - ignore button<br/>
      - drag and drop or buttons to change priority.
      </p>
    </div>
  )
}

function Watched() {
  return (
    <div className="Watched">
      <h2>watched</h2>
      <WatchedItem />
      <p>
      todo:<br/>
      - list of watched.
      </p>
    </div>
  )
}

function OtherItem() {
  return (
    <div className="OtherItem">
      <div hidden>url</div>
      <div>image</div>
      <div>cached title</div>
      <details>
        <summary>description</summary>
        <textarea name="description" />
      </details>
      <button>watch</button>
      <button>ignore</button>
      <p>
      todo:<br/>
      - url (hidden)<br/>
      - (later) image<br/>
      - title<br/>
      - (later) list of markers<br/>
      - (maybe) description (spoiler)<br/>
      - watch button<br/>
      - ignore button<br/>
      </p>
    </div>
  )
}

function Others() {
  return (
    <div className="Others">
      <h2>others</h2>
      <OtherItem />
      <p>
      todo:<br/>
      - list of others.<br/>
      - item (cached info). image;  url (hidden), title, (later) list of markers, (maybe) description (spoiler). watch button. ignore button.
      </p>
    </div>
  )
}

interface IIgnoredItem {
  id_: number;
  title: string;
  update_marker: string;
  url: string;
  priority: number | null;
  description: string | null
}

function IgnoredItem({data}: {data: IIgnoredItem}) {
  return (
    <div className="IgnoredItem">
      <div hidden>{data.url}</div>
      <div>image</div>
      <div>
        <input name="title" value={data.title} />
      </div>
      <details>
        <summary>description</summary>
        <textarea name="description">{data.description}</textarea>
      </details>
      <button>watch</button>
      <p>
      todo:<br/>
      - url (hidden)<br/>
      - (later) image (spoiler; lazy download)<br/>
      - title (input; can be edited and saved)<br/>
      - description (spoiler; can be edited and save)<br/>
      - watch button<br/>
      </p>
    </div>
  )
}

function Ignored({data}: {data: IIgnoredItem[]}) {
  return (
    <div className="Ignored">
      <h2>ignored</h2>
      <IgnoredItem data={data[0]}/>
      <p>
      todo:<br/>
      - list of ignored.<br/>
      </p>
    </div>
  )
}

interface IData {
  ignored_items: IIgnoredItem[];
}

function App() {
  const [data, setData] = useState<IData | null>(null);
  return (
    <div className="App">
      <header className="App-header"></header>
      <LoadSave data={data} setData={setData}/>
      {data
        ? (
          <>
          <Sources />
          <Watched />
          <Others />
          <Ignored data={data?.ignored_items}/>
          </>
        )
        : ''
      }
    </div>
  );
}

export default App;
