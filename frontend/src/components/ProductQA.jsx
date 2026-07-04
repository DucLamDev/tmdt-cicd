import { useState, useEffect } from 'react';
import { questionAPI } from '../api/features';
import useAuthStore from '../store/authStore';
import { FiMessageSquare, FiSend, FiUser, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ProductQA = ({ productId }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [answeringId, setAnsweringId] = useState(null);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => { if (productId) fetchQuestions(); }, [productId]);

  const fetchQuestions = async () => {
    try { const r = await questionAPI.getByProduct(productId, { limit: 20 }); setQuestions(r.data.data.questions); } catch {} finally { setLoading(false); }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    try {
      await questionAPI.ask(productId, { question: newQuestion });
      toast.success('Đã gửi câu hỏi');
      setNewQuestion(''); fetchQuestions();
    } catch (e) { toast.error(e.response?.data?.message || 'Lỗi'); }
  };

  const handleAnswer = async (questionId) => {
    if (!answerText.trim()) return;
    try {
      await questionAPI.answer(questionId, { content: answerText });
      toast.success('Đã trả lời');
      setAnswerText(''); setAnsweringId(null); fetchQuestions();
    } catch (e) { toast.error(e.response?.data?.message || 'Lỗi'); }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FiMessageSquare /> Hỏi đáp ({questions.length})
      </h3>

      {isAuthenticated && (
        <form onSubmit={handleAsk} style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          <input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Đặt câu hỏi về sản phẩm..."
            style={{ flex: 1, padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }} />
          <button type="submit" style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.875rem' }}>
            <FiSend size={14} /> Gửi
          </button>
        </form>
      )}

      {loading ? <div>Đang tải...</div> : questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>Chưa có câu hỏi nào. Hãy là người đầu tiên!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {questions.map(q => (
            <div key={q._id} style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FiUser size={14} style={{ color: '#3b82f6' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{q.userId?.name || 'Người dùng'}</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(q.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
              <p style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.75rem' }}>{q.question}</p>

              {q.answers?.map(a => (
                <div key={a._id} style={{ marginLeft: '1.5rem', padding: '0.75rem', background: '#fff', borderRadius: '8px', marginBottom: '6px', borderLeft: a.isSellerAnswer ? '3px solid #3b82f6' : '3px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    {a.isSellerAnswer ? <FiShield size={12} style={{ color: '#3b82f6' }} /> : <FiUser size={12} />}
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: a.isSellerAnswer ? '#3b82f6' : '#334155' }}>{a.userId?.name || 'Người dùng'} {a.isSellerAnswer && '(Shop)'}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569' }}>{a.content}</p>
                </div>
              ))}

              {isAuthenticated && (
                answeringId === q._id ? (
                  <div style={{ marginLeft: '1.5rem', display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <input value={answerText} onChange={e => setAnswerText(e.target.value)} placeholder="Nhập câu trả lời..."
                      style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem' }} />
                    <button onClick={() => handleAnswer(q._id)} style={{ padding: '8px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Gửi</button>
                    <button onClick={() => setAnsweringId(null)} style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Hủy</button>
                  </div>
                ) : (
                  <button onClick={() => setAnsweringId(q._id)} style={{ marginLeft: '1.5rem', marginTop: '6px', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>Trả lời</button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductQA;
