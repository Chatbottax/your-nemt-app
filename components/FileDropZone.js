export default function FileDropZone({ onFile }) {
  return (
    <div className="border-dashed border-2 border-secondary p-4 text-center">
      <input type="file" accept=".pdf,.jpg,.png" onChange={e => onFile(e.target.files[0])} />
    </div>
  );
}
