import { useState } from 'react';
import FileDropZone from '../components/FileDropZone';

export default function Intake() {
  const [upload, setUpload] = useState(null);
  const [parsed, setParsed] = useState(null);
  const API = 'http://localhost:4000';

  async function onFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API}/uploads`, { method: 'POST', body: fd });
    const up = await res.json();
    setUpload(up);
  }

  async function parse() {
    const res = await fetch(`${API}/uploads/${upload.id}/parse`, { method: 'POST' });
    const data = await res.json();
    setParsed(data.parsed_json);
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl">Intake</h1>
      {!upload && <FileDropZone onFile={onFile} />}
      {upload && !parsed && <button className="bg-primary text-black px-4 py-2" onClick={parse}>Parse Upload</button>}
      {parsed && (
        <div>
          <h2 className="text-lg">Parsed Students</h2>
          <pre className="bg-panel p-2 overflow-x-auto">{JSON.stringify(parsed, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
