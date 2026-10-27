import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Eye,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Send,
  ShieldCheck,
  Star,
  Calendar,
  User,
} from 'lucide-react';
import { surveysApi, usersApi } from '../../api';
import {
  CLIENT_TOPICS,
  CLIENT_TEMPLATES,
  getPresetByTopic,
} from '../../data/surveyTemplates';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function SurveyManagement() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create' | 'results'
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Results State
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [surveyResults, setSurveyResults] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Preview State
  const [previewSurvey, setPreviewSurvey] = useState(null);

  // Form State (CRM Client Surveys)
  const initialPreset = CLIENT_TEMPLATES[0];
  const [title, setTitle] = useState(initialPreset?.title || CLIENT_TOPICS[0]);
  const [description, setDescription] = useState(initialPreset?.description || '');
  const [imageUrl, setImageUrl] = useState(initialPreset?.imageUrl || '');
  const [selectedTopic, setSelectedTopic] = useState(CLIENT_TOPICS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [audienceType, setAudienceType] = useState('all_users'); // 'all_users' | 'selected_users'
  const [triggerType, setTriggerType] = useState('manual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [questions, setQuestions] = useState(
    initialPreset?.questions.map((q, idx) => ({ ...q, id: String(idx + 1) })) || []
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Customer Recipient Selection
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);

  useEffect(() => {
    loadSurveys();
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === 'create') {
      usersApi
        .getUsers({ role: 'customer', status: 'active', itemPerPage: 100 })
        .then((res) => {
          setCustomers(res?.data?.list || []);
        })
        .catch(() => {});
    }
  }, [activeTab]);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await surveysApi.getSurveys(params);
      const items = res?.data?.list || (Array.isArray(res?.data) ? res.data : []);
      // Chỉ hiển thị khảo sát dành cho khách hàng (loại bỏ khảo sát vendor cũ)
      setSurveys(items.filter((s) => s.audienceType !== 'all_vendors'));
    } catch (err) {
      console.error('Failed to load admin surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
    const preset = getPresetByTopic('client', topic);
    if (preset) {
      setTitle(preset.title);
      setDescription(preset.description || '');
      if (preset.imageUrl) setImageUrl(preset.imageUrl);
      setQuestions(preset.questions.map((q, idx) => ({ ...q, id: String(idx + 1) })));
    } else if (!topic.includes('Khác')) {
      setTitle(topic);
    }
  };

  const handleOpenResults = async (surveyId) => {
    try {
      setSelectedSurveyId(surveyId);
      setActiveTab('results');
      setResultsLoading(true);
      const res = await surveysApi.getResults(surveyId);
      setSurveyResults(res?.data || res);
    } catch (err) {
      console.error('Failed to load results:', err);
      alert('Không thể tải kết quả: ' + (err.response?.data?.message || err.message));
    } finally {
      setResultsLoading(false);
    }
  };

  const handleChangeStatus = async (surveyId, newStatus) => {
    try {
      await surveysApi.changeStatus(surveyId, newStatus);
      loadSurveys();
      if (selectedSurveyId === surveyId) {
        handleOpenResults(surveyId);
      }
    } catch (err) {
      alert('Không thể cập nhật trạng thái: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAddQuestion = (type) => {
    const newQ = {
      id: Date.now().toString(),
      question: '',
      type,
      required: false,
      options:
        type === 'single_choice' || type === 'multiple_choice'
          ? ['Lựa chọn 1', 'Lựa chọn 2']
          : [],
    };
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleRemoveQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleAddOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options.push(`Lựa chọn ${updated[qIndex].options.length + 1}`);
    setQuestions(updated);
  };

  const handleUpdateOption = (qIndex, optIndex, val) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = val;
    setQuestions(updated);
  };

  const handleRemoveOption = (qIndex, optIndex) => {
    const updated = [...questions];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== optIndex);
    setQuestions(updated);
  };

  const toggleSelectCustomer = (id) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateSurvey = async (activateImmediately = false) => {
    const surveyTitle =
      title.trim() || (selectedTopic.includes('Khác') ? customTopic : selectedTopic);
    if (!surveyTitle) {
      alert('Vui lòng nhập tiêu đề hoặc chủ đề khảo sát');
      return;
    }
    if (questions.length === 0) {
      alert('Vui lòng thêm ít nhất một câu hỏi khảo sát');
      return;
    }
    if (audienceType === 'selected_users' && selectedCustomerIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 tài khoản khách hàng nhận khảo sát');
      return;
    }
    for (const q of questions) {
      if (!q.question.trim()) {
        alert('Có câu hỏi chưa nhập nội dung');
        return;
      }
      if (
        (q.type === 'single_choice' || q.type === 'multiple_choice') &&
        q.options.length < 2
      ) {
        alert(`Câu hỏi trắc nghiệm "${q.question}" cần ít nhất 2 đáp án`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        title: surveyTitle,
        description: description.trim() || undefined,
        imageUrl:
          imageUrl && imageUrl.trim().startsWith('http') ? imageUrl.trim() : undefined,
        scope: 'platform',
        audienceType,
        triggerType,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        questions: questions.map((q, idx) => ({
          question: q.question.trim(),
          type: q.type,
          required: !!q.required,
          position: idx + 1,
          options:
            q.type === 'single_choice' || q.type === 'multiple_choice'
              ? q.options.map((opt, oIdx) => ({ content: opt.trim(), position: oIdx + 1 }))
              : undefined,
        })),
      };

      const res = await surveysApi.createSurvey(payload);
      const created = res?.data?.data || res?.data || res;

      if (activateImmediately && created?.id) {
        await surveysApi.changeStatus(
          created.id,
          'active',
          audienceType === 'selected_users' ? selectedCustomerIds : undefined
        );
      }

      setFeedbackMsg(
        activateImmediately
          ? 'Đã tạo bảng khảo sát và gửi thông báo đến tài khoản khách hàng thành công!'
          : 'Đã lưu bản nháp khảo sát khách hàng thành công!'
      );
      loadSurveys();
      setActiveTab('list');
      setSelectedCustomerIds([]);
    } catch (err) {
      console.error('Error creating survey:', err);
      const data = err.response?.data;
      let errorText = err.message;
      if (data?.errors) {
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          errorText = data.errors
            .map((e) => e.message || e.error || JSON.stringify(e))
            .join(', ');
        } else if (typeof data.errors === 'string') {
          errorText = data.errors;
        }
      } else if (data?.message && data.message !== 'ERROR') {
        errorText = data.message;
      }
      alert('Lỗi tạo khảo sát: ' + errorText);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSurveys = surveys.filter((s) => {
    if (searchTerm) {
      const match = s.title?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
              <ClipboardList className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Quản lý Khảo sát Khách hàng & Thống kê Kết quả (CRM)
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tạo bảng khảo sát độ hài lòng, thăm dò sản phẩm mới, gửi đến tài khoản khách hàng và thống kê kết quả.
          </p>
        </div>

        {activeTab !== 'create' && (
          <button
            onClick={() => setActiveTab('create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" /> Tạo bảng khảo sát mới
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('list')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'list'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          Danh sách khảo sát ({surveys.length})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'create'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          + Tạo bảng khảo sát & Gửi Khách hàng
        </button>
        {selectedSurveyId && (
          <button
            onClick={() => setActiveTab('results')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'results'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Thống kê kết quả khảo sát
          </button>
        )}
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{feedbackMsg}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: LIST */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm khảo sát theo tiêu đề..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Trạng thái:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang mở (Active)</option>
                  <option value="draft">Bản nháp (Draft)</option>
                  <option value="closed">Đã đóng (Closed)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium">Đang tải danh sách khảo sát...</p>
              </div>
            ) : filteredSurveys.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                  Không tìm thấy khảo sát nào
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Tạo bảng khảo sát để gửi tới tài khoản khách hàng.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Tiêu đề khảo sát</th>
                      <th className="px-4 py-4">Đối tượng nhận</th>
                      <th className="px-4 py-4">Thời gian</th>
                      <th className="px-4 py-4">Trạng thái</th>
                      <th className="px-4 py-4 text-center">Lượt phản hồi</th>
                      <th className="px-6 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSurveys.map((survey) => (
                      <tr
                        key={survey.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-white max-w-sm truncate">
                            {survey.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-sm">
                            {survey.description || 'Không có mô tả'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            <User className="w-3 h-3" />
                            {survey.audienceType === 'selected_users'
                              ? 'Khách hàng được chọn'
                              : 'Toàn bộ Khách hàng'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500">
                          {survey.startDate
                            ? new Date(survey.startDate).toLocaleDateString('vi-VN')
                            : 'Bắt đầu ngay'}
                          {' → '}
                          {survey.endDate
                            ? new Date(survey.endDate).toLocaleDateString('vi-VN')
                            : 'Không giới hạn'}
                        </td>
                        <td className="px-4 py-4">
                          {survey.status === 'active' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              Đang diễn ra
                            </span>
                          )}
                          {survey.status === 'draft' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Bản nháp
                            </span>
                          )}
                          {survey.status === 'closed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                              Đã đóng
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {survey._count?.responses || 0}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenResults(survey.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50"
                              title="Thống kê kết quả khảo sát"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                              Thống kê
                            </button>
                            <button
                              onClick={() => setPreviewSurvey(survey)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Xem trước câu hỏi"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {survey.status === 'draft' && (
                              <button
                                onClick={() => handleChangeStatus(survey.id, 'active')}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
                                title="Kích hoạt và gửi thông báo tới khách hàng"
                              >
                                Gửi khảo sát
                              </button>
                            )}
                            {survey.status === 'active' && (
                              <button
                                onClick={() => handleChangeStatus(survey.id, 'closed')}
                                className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100"
                                title="Đóng khảo sát"
                              >
                                Đóng
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CREATE SURVEY */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                1. Chủ đề & Thông tin Bảng khảo sát Khách hàng
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Mẫu khảo sát CRM (Độ hài lòng / Thăm dò ra mắt sản phẩm mới):
                </label>
                <div className="flex flex-wrap gap-2">
                  {CLIENT_TOPICS.map((topic) => (
                    <button
                      type="button"
                      key={topic}
                      onClick={() => handleTopicSelect(topic)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        selectedTopic === topic
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tiêu đề khảo sát <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Khảo sát thăm dò nhu cầu khách hàng trước khi ra mắt bộ sưu tập mới..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả lời mời (hiển thị trong thông báo gửi tài khoản khách hàng)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kính mời quý khách thực hiện khảo sát để doanh nghiệp nâng cao chất lượng sản phẩm..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100 resize-none"
                />
              </div>
            </div>

            {/* Step 2: Questions Builder */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                  2. Danh sách câu hỏi khảo sát ({questions.length})
                </h3>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('rating')}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
                  >
                    + Đánh giá Sao
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('single_choice')}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
                  >
                    + Chọn 1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('multiple_choice')}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
                  >
                    + Chọn nhiều
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('text')}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
                  >
                    + Tự luận
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-2">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => handleUpdateQuestion(idx, 'question', e.target.value)}
                          placeholder="Nhập nội dung câu hỏi..."
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-lg"
                        title="Xóa câu hỏi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pl-8 text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="font-medium bg-slate-200/70 dark:bg-slate-700 px-2 py-0.5 rounded">
                          Loại:{' '}
                          {q.type === 'rating'
                            ? 'Đánh giá Sao (1-5)'
                            : q.type === 'single_choice'
                            ? 'Chọn 1 đáp án'
                            : q.type === 'multiple_choice'
                            ? 'Chọn nhiều'
                            : 'Tự luận'}
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) =>
                              handleUpdateQuestion(idx, 'required', e.target.checked)
                            }
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>Bắt buộc trả lời</span>
                        </label>
                      </div>
                    </div>

                    {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                      <div className="pl-8 space-y-2 pt-1">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold w-4">
                              {oIdx + 1}.
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateOption(idx, oIdx, e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                            />
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(idx, oIdx)}
                                className="text-slate-400 hover:text-rose-500 p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddOption(idx)}
                          className="text-xs text-blue-600 hover:underline font-medium pt-1"
                        >
                          + Thêm lựa chọn
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3: Delivery & Customer Account Selection */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                3. Gửi đến Tài khoản Khách hàng
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nhóm tài khoản khách hàng nhận khảo sát
                </label>
                <select
                  value={audienceType}
                  onChange={(e) => setAudienceType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100"
                >
                  <option value="all_users">Tất cả tài khoản khách hàng đang hoạt động</option>
                  <option value="selected_users">Chọn tài khoản khách hàng cụ thể</option>
                </select>
              </div>

              {audienceType === 'selected_users' && (
                <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Chọn tài khoản ({selectedCustomerIds.length} đã chọn)</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCustomerIds(
                          selectedCustomerIds.length === customers.length
                            ? []
                            : customers.map((c) => c.id)
                        )
                      }
                      className="text-blue-600 hover:underline"
                    >
                      {selectedCustomerIds.length === customers.length
                        ? 'Bỏ chọn hết'
                        : 'Chọn tất cả'}
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {customers.map((cus) => (
                      <label
                        key={cus.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCustomerIds.includes(cus.id)}
                          onChange={() => toggleSelectCustomer(cus.id)}
                          className="rounded text-blue-600"
                        />
                        <div className="truncate">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                            {cus.fullName}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {cus.email}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cơ chế kích hoạt gửi
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
                >
                  <option value="manual">Gửi ngay vào tài khoản khách hàng khi kích hoạt</option>
                  <option value="after_order_completed">Tự động gửi khi đơn hàng hoàn thành</option>
                  <option value="after_checkout">Tự động gửi sau khi khách đặt hàng</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hạn chót trả lời khảo sát
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                Khi bấm gửi, hệ thống sẽ tạo thông báo khảo sát gửi trực tiếp đến <strong>Chuông thông báo & Hộp thư Khảo sát</strong> của tài khoản khách hàng.
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <button
                type="button"
                onClick={() => handleCreateSurvey(true)}
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Đang gửi...' : 'Kích hoạt & Gửi đến Khách hàng'}
              </button>

              <button
                type="button"
                onClick={() => handleCreateSurvey(false)}
                disabled={submitting}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-colors"
              >
                Lưu thành bản nháp (Draft)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="w-full py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 text-xs font-medium"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RESULTS */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <button
            onClick={() => setActiveTab('list')}
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            ← Quay lại danh sách khảo sát
          </button>

          {resultsLoading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Đang tải số liệu thống kê kết quả khảo sát...</p>
            </div>
          ) : !surveyResults ? (
            <div className="py-12 text-center text-slate-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Chưa có dữ liệu thống kê cho khảo sát này</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xs text-slate-500 font-medium">Khách hàng được mời</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {surveyResults.summary?.invitedCount || 0}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xs text-slate-500 font-medium">Đã mở xem</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">
                    {surveyResults.summary?.openedCount || 0}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xs text-slate-500 font-medium">Đã hoàn thành</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    {surveyResults.summary?.responseCount || 0}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xs text-slate-500 font-medium">Chưa trả lời</div>
                  <div className="text-2xl font-bold text-amber-500 mt-1">
                    {surveyResults.summary?.pendingCount || 0}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
                  <div className="text-xs text-slate-500 font-medium">Tỷ lệ hoàn thành</div>
                  <div className="text-2xl font-bold text-indigo-600 mt-1">
                    {((surveyResults.summary?.completionRate || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Thống kê chi tiết từng câu hỏi khảo sát
                </h3>

                {surveyResults.questions?.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                  >
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-base text-slate-900 dark:text-white">
                          {q.question}
                        </h4>
                        <span className="text-xs text-slate-400">
                          Loại:{' '}
                          {q.type === 'rating'
                            ? 'Đánh giá Sao'
                            : q.type === 'single_choice'
                            ? 'Chọn 1'
                            : q.type === 'multiple_choice'
                            ? 'Chọn nhiều'
                            : 'Tự luận'}
                        </span>
                      </div>
                    </div>

                    {q.type === 'rating' && q.result?.distribution && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl font-extrabold text-amber-500">
                            {Number(q.result.average || 0).toFixed(1)}
                          </span>
                          <div className="flex items-center text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-5 h-5 ${
                                  s <= Math.round(q.result.average || 0)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-slate-500">
                            ({q.result.answeredCount || 0} đánh giá)
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-2">
                          {q.result.distribution.map((d) => {
                            const percent = q.result.answeredCount
                              ? (d.count / q.result.answeredCount) * 100
                              : 0;
                            return (
                              <div key={d.value} className="flex items-center gap-3 text-xs">
                                <span className="w-12 text-slate-600 dark:text-slate-400 font-semibold">
                                  {d.value} sao
                                </span>
                                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <span className="w-14 text-right font-medium text-slate-700 dark:text-slate-300">
                                  {d.count} ({percent.toFixed(0)}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(q.type === 'single_choice' || q.type === 'multiple_choice') &&
                      q.result?.options && (
                        <div className="space-y-2 pt-2">
                          {q.result.options.map((opt, oIdx) => (
                            <div key={opt.id} className="space-y-1 text-xs">
                              <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                                <span>{opt.content}</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  {opt.count} lượt ({Number(opt.percentage || 0).toFixed(1)}%)
                                </span>
                              </div>
                              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${opt.percentage || 0}%`,
                                    backgroundColor: COLORS[oIdx % COLORS.length],
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    {q.type === 'text' && q.result?.list && (
                      <div className="space-y-2 pt-2">
                        {q.result.list.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">
                            Chưa có phản hồi tự luận nào.
                          </p>
                        ) : (
                          q.result.list.map((ans) => (
                            <div
                              key={ans.id}
                              className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-slate-400">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {ans.response?.client?.fullName || 'Khách hàng'}
                                </span>
                                <span>{new Date(ans.createdAt).toLocaleDateString('vi-VN')}</span>
                              </div>
                              <p className="text-slate-800 dark:text-slate-100 italic">
                                "{ans.textAnswer}"
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                  Xem trước bảng khảo sát
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {previewSurvey.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewSurvey(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {previewSurvey.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {previewSurvey.description}
              </p>
            )}

            <div className="space-y-4 pt-2">
              {previewSurvey.questions?.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border text-xs space-y-2"
                >
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {idx + 1}. {q.question} {q.required && <span className="text-rose-500">*</span>}
                  </div>
                  {q.type === 'rating' && (
                    <div className="flex gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                  )}
                  {q.options?.map((opt) => (
                    <div
                      key={opt.id}
                      className="p-2 bg-white dark:bg-slate-800 rounded border text-slate-600 dark:text-slate-300"
                    >
                      • {opt.content}
                    </div>
                  ))}
                  {q.type === 'text' && (
                    <div className="p-2 bg-white dark:bg-slate-800 rounded border text-slate-400 italic">
                      [Khách hàng nhập câu trả lời tự luận]
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
