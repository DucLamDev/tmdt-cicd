import { ImagePlus, Link as LinkIcon, Upload, X } from 'lucide-react';

const getPastedImageFiles = (clipboardData) => Array.from(clipboardData?.items || [])
  .filter((item) => item.type?.startsWith('image/'))
  .map((item) => item.getAsFile())
  .filter(Boolean);

const ImagePasteInput = ({
  title = 'Ảnh',
  files = [],
  onFilesChange,
  urls = '',
  onUrlsChange,
  multiple = true,
  maxFiles = 10,
  capture,
  fileLabel = 'Chọn ảnh từ máy',
  urlLabel = 'Hoặc nhập URL ảnh',
  urlPlaceholder = 'Mỗi URL một dòng',
  showUrlInput = true,
  accept = 'image/*'
}) => {
  const appendFiles = (nextFiles) => {
    if (!nextFiles.length) return;
    const merged = multiple ? [...files, ...nextFiles] : nextFiles.slice(0, 1);
    onFilesChange?.(merged.slice(0, maxFiles));
  };

  const handleFileChange = (event) => {
    appendFiles(Array.from(event.target.files || []));
    event.target.value = '';
  };

  const handlePaste = (event) => {
    const pastedFiles = getPastedImageFiles(event.clipboardData);
    if (!pastedFiles.length) return;
    event.preventDefault();
    appendFiles(pastedFiles);
  };

  const removeFile = (index) => {
    onFilesChange?.(files.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4" onPaste={handlePaste} tabIndex={0}>
      <div className="mb-3 flex items-center gap-2 font-semibold text-blue-800">
        <Upload size={18} />
        {title}
      </div>
      <label className="mb-2 block font-medium">{fileLabel}</label>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        capture={capture}
        onChange={handleFileChange}
        className="block w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm"
      />

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-blue-200 bg-white px-3 py-3 text-sm font-medium text-slate-600">
        <ImagePlus size={18} className="text-blue-600" />
        Dán ảnh đã copy vào vùng này
      </div>

      {files.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.size}-${index}`} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-700">
              <img src={URL.createObjectURL(file)} alt={file.name || `Ảnh ${index + 1}`} className="h-10 w-10 rounded object-cover" />
              <span className="min-w-0 flex-1 truncate">{file.name || `Ảnh đã dán ${index + 1}`}</span>
              <button type="button" onClick={() => removeFile(index)} className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Xóa ảnh">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showUrlInput && (
        <div className="mt-4">
          <label className="mb-2 flex items-center gap-2 font-medium">
            <LinkIcon size={16} />
            {urlLabel}
          </label>
          <textarea
            rows="4"
            value={urls}
            onChange={(event) => onUrlsChange?.(event.target.value)}
            className="input w-full bg-white"
            placeholder={urlPlaceholder}
          />
        </div>
      )}
    </div>
  );
};

export default ImagePasteInput;
