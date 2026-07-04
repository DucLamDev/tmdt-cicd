import { useState } from 'react';
import { FiX } from 'react-icons/fi';

const ActionReasonModal = ({ isOpen, onClose, onConfirm, title, description, actionType = 'warning', confirmText = 'Xác nhận', requireReason = true }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (requireReason && !reason.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {description && (
              <p className="text-gray-600 mb-4">{description}</p>
            )}

            {requireReason && (
              <div>
                <label className="block font-medium mb-2 text-gray-700">
                  Nhập lý do {actionType === 'danger' ? '(bắt buộc)' : '(tùy chọn)'}:
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="4"
                  placeholder="Nhập lý do..."
                  required={requireReason}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || (requireReason && !reason.trim())}
              className={`px-6 py-2 text-white rounded-lg font-medium transition-colors ${
                actionType === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : actionType === 'warning'
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Đang xử lý...' : confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActionReasonModal;
