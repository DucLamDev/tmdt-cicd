import { useRef, useState } from 'react';
import { Camera, Loader2, Mic, Search, Sparkles, Upload, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatbotAPI } from '../api/chatbot';

const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const quickPrompts = [
  'Điện thoại chụp ảnh đẹp',
  'Laptop học tập dưới 15 triệu',
  'Tai nghe chống ồn',
  'Áo polo nam dễ phối'
];

const AIProductSearch = ({ onResults }) => {
  const fileInputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeSource, setActiveSource] = useState(null);

  const applyResults = (payload, sourceLabel) => {
    const data = payload?.data || payload || {};
    const products = Array.isArray(data) ? data : data.products || [];
    const visualLabel = data.analysis
      ? [data.analysis.color, data.analysis.productType].filter(Boolean).join(' ')
      : '';
    const detectedQuery = data.query || visualLabel || query;
    onResults?.({ products, query: detectedQuery, source: sourceLabel });
    toast[products.length ? 'success' : 'error'](
      payload?.message || (products.length ? `Đã tìm thấy ${products.length} sản phẩm` : 'Chưa tìm thấy sản phẩm phù hợp')
    );
  };

  const searchText = async (text, sourceLabel = 'voice') => {
    const keyword = text?.trim();
    if (!keyword) return;
    try {
      setSearching(true);
      setActiveSource(sourceLabel);
      const response = await chatbotAPI.searchByVoice({ text: keyword });
      applyResults(response, sourceLabel);
    } finally {
      setSearching(false);
      setActiveSource(null);
    }
  };

  const handleVoiceSearch = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      toast.error('Trình duyệt chưa hỗ trợ nhận diện giọng nói. Bạn có thể nhập từ khóa rồi bấm Tìm ngay.');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setListening(true);
      setActiveSource('voice');
    };
    recognition.onend = () => {
      setListening(false);
      setActiveSource(null);
    };
    recognition.onerror = () => {
      setListening(false);
      setActiveSource(null);
      toast.error('Không nhận diện được giọng nói, vui lòng thử lại');
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setQuery(transcript);
      searchText(transcript, 'voice');
    };
    recognition.start();
  };

  const runImageSearch = async (image) => {
    if (!image) return;

    try {
      setSearching(true);
      setActiveSource('image');
      const response = await chatbotAPI.searchByImage(image, { limit: 8 });
      applyResults(response, 'image');
    } finally {
      setSearching(false);
      setActiveSource(null);
    }
  };

  const handleImageSearch = async (event) => {
    const image = event.target.files?.[0];
    try {
      await runImageSearch(image);
    } finally {
      event.target.value = '';
    }
  };

  const handlePasteImage = (event) => {
    const image = Array.from(event.clipboardData?.items || [])
      .find((item) => item.type?.startsWith('image/'))
      ?.getAsFile();
    if (!image || searching) return;
    event.preventDefault();
    runImageSearch(image);
  };

  const statusText = listening
    ? 'Đang nghe giọng nói...'
    : searching
      ? activeSource === 'image'
        ? 'Đang phân tích ảnh mẫu...'
        : 'Đang tìm sản phẩm phù hợp...'
      : 'Tìm bằng mô tả, giọng nói hoặc ảnh mẫu';

  return (
    <div className="mb-8 overflow-hidden rounded-[22px] border border-blue-100 bg-white shadow-soft" onPaste={handlePasteImage} tabIndex={0}>
      <div className="border-b border-blue-100 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 px-5 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12">
              <Sparkles size={20} />
            </span>
            <div>
              <div className="text-sm font-extrabold">Tìm sản phẩm thông minh</div>
              <div className="text-xs font-medium text-blue-50">{statusText}</div>
            </div>
          </div>
          {(searching || listening) && (
            <div className="pill border-white/10 bg-white/10 text-white">
              <Loader2 size={14} className="animate-spin" />
              Đang xử lý
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.10)]">
            <Search className="h-5 w-5 text-blue-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') searchText(query, 'text');
              }}
              placeholder="Ví dụ: váy midi đi làm, laptop học tập, tai nghe chống ồn..."
              className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => searchText(query, 'text')}
              disabled={searching || !query.trim()}
              className="btn-primary"
            >
              {searching && activeSource === 'text' ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              Tìm ngay
            </button>
            <button
              type="button"
              onClick={handleVoiceSearch}
              disabled={searching || listening}
              className="btn-secondary"
              title="Tìm bằng giọng nói"
            >
              <Mic size={16} />
              {listening ? 'Đang nghe' : 'Giọng nói'}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={searching}
              className="btn-outline"
              title="Tìm bằng hình ảnh"
            >
              <Camera size={16} />
              Hình ảnh
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSearch}
              className="hidden"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setQuery(prompt);
                searchText(prompt, 'text');
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
          <Upload className="h-4 w-4 text-blue-600" />
          Ảnh mẫu chỉ dùng để nhận diện đặc điểm sản phẩm và trả về gợi ý tương đồng.
        </div>
      </div>
    </div>
  );
};

export default AIProductSearch;
