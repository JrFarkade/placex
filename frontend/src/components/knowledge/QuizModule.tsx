import React, { useState } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  Loader2, 
  Check, 
  AlertCircle,
  Brain,
  Code2,
  Terminal,
  Award
} from 'lucide-react';
import axios from 'axios';

interface QuizModuleProps {
  token: string;
}

interface Question {
  id?: number;
  question_id?: string | number;
  question: string;
  question_text?: string;
  options: string[];
  code_snippet?: string;
}

interface AnswerKeyItem {
  question_id: number;
  question_text: string;
  options: string[];
  correct_option_index: number;
  correct_answer: string;
  selected_option_index: number;
  selected_answer: string;
  is_correct: boolean;
  status: string;
  explanation: string;
  domain: string;
  question_type: string;
  sub_topic: string;
  difficulty: string;
  points_earned: number;
}

interface SubmitResponse {
  attempt_id?: string;
  score?: number;
  total_questions?: number;
  total?: number;
  percentage?: number;
  answer_key?: AnswerKeyItem[];
  explanations?: { [key: string]: string };
}

export const QuizModule: React.FC<QuizModuleProps> = ({ token }) => {
  // Config & Form Selection State
  const [domain, setDomain] = useState<string>('ai_ml');
  const [questionType, setQuestionType] = useState<string>('theory');
  const [numQuestions, setNumQuestions] = useState<number>(5);

  // Quiz Execution State
  const [quizState, setQuizState] = useState<'selection' | 'quiz' | 'submitting' | 'results'>('selection');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Loaded Quiz Data
  const [quizId, setQuizId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});

  // Result & Review Data
  const [resultData, setResultData] = useState<SubmitResponse | null>(null);

  // 1. START QUIZ (POST /quiz/start)
  const handleStartQuiz = async () => {
    setLoading(true);
    setError('');

    const payload = {
      user_id: "student_1",
      domain: domain,
      question_type: questionType,
      num_questions: numQuestions
    };

    try {
      let res;
      try {
        res = await axios.post('http://localhost:8000/quiz/start', payload);
      } catch (e) {
        res = await axios.post('/api/v1/quiz/start', payload);
      }

      const data = res.data;
      const fetchedQuestions = data.questions || data.data || [];
      const returnedQuizId = data.quiz_id || ('quiz_' + Date.now());

      if (fetchedQuestions && fetchedQuestions.length > 0) {
        setQuestions(fetchedQuestions);
        setQuizId(returnedQuizId);
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setQuizState('quiz');
      } else {
        setError("No questions found for the selected topic. Please select another subject.");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not connect to Quiz backend. Ensure Python service is running on http://localhost:8000.");
    } finally {
      setLoading(false);
    }
  };

  // Select Option for Current Question
  const handleSelectOption = (questionKey: string, optionValue: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionKey]: optionValue
    }));
  };

  // 2. SUBMIT QUIZ (POST /quiz/submit)
  const handleSubmitQuiz = async () => {
    setLoading(true);
    setError('');

    // Format selected answers strictly preserving question presentation order (1, 2, 3, 4, 5)
    const formattedAnswers = questions.map((q, idx) => {
      const rawId = q.id || q.question_id || (idx + 1);
      const qKey = String(rawId);
      const cleanQid = typeof rawId === 'number' ? rawId : parseInt(qKey.replace('q_', '').replace('q', ''), 10);
      const userSelected = selectedAnswers[qKey];

      return {
        question_id: isNaN(cleanQid) ? rawId : cleanQid,
        selected_value: userSelected !== undefined ? userSelected : "Not Answered",
        presentation_order: idx + 1
      };
    });

    const payload = {
      quiz_id: quizId,
      user_id: "student_1",
      domains: [domain],
      answers: formattedAnswers
    };

    try {
      let res;
      try {
        res = await axios.post('http://localhost:8000/quiz/submit', payload);
      } catch (e) {
        res = await axios.post('/api/v1/quiz/submit', payload);
      }

      setResultData(res.data);
      setQuizState('results');
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const currentQ = questions[currentQuestionIndex];
  const currentQKey = currentQ ? String(currentQ.id || currentQ.question_id || currentQuestionIndex + 1) : '';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 text-[#202321]">
      
      {/* 1. Module Header Card */}
      <div className="bg-white p-8 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] text-[#059669] flex items-center justify-center shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-[#202321] tracking-tight">Knowledge Base & Quiz</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0] uppercase">
                Active
              </span>
            </div>
            <p className="text-xs text-[#666B67] font-medium">Test your conceptual knowledge and practice technical placement questions.</p>
          </div>
        </div>

        {quizState !== 'selection' && (
          <button
            onClick={() => setQuizState('selection')}
            className="px-4 py-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#666B67]" />
            <span>Change Subject / Quiz</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. STATE 1: SELECTION FORM (Choose Domain, Question Type, & Start Quiz) */}
      {quizState === 'selection' && (
        <div className="bg-white p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-[#202321]">Select Quiz Topic & Format</h2>
            <p className="text-xs text-[#666B67] font-medium">Choose a domain and question type to fetch dynamic questions from the backend.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Domain Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-[#202321] uppercase tracking-wider">
                Select Domain / Subject
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'ai_ml', label: 'AI & Machine Learning', icon: Brain },
                  { id: 'web_dev', label: 'Web Development', icon: Code2 },
                  { id: 'python', label: 'Python Programming', icon: Terminal },
                  { id: 'aptitude', label: 'Quantitative Aptitude', icon: BookOpen }
                ].map(d => {
                  const Icon = d.icon;
                  const isSelected = domain === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDomain(d.id)}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#E6F4EA] border-[#059669] text-[#047857] shadow-xs' 
                          : 'bg-[#FAF8F5] border-[#EAE7DF] text-[#202321] hover:bg-[#F4F1EA]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-[#059669]' : 'text-[#666B67]'}`} />
                      <span className="text-xs font-extrabold">{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-[#202321] uppercase tracking-wider">
                Question Type
              </label>
              <div className="space-y-2.5">
                {[
                  { id: 'theory', label: 'Theory & Conceptual', desc: 'Multiple choice conceptual & architecture questions' },
                  { id: 'code', label: 'Code & Output Analysis', desc: 'Code snippets, syntax output, and debugging questions' }
                ].map(t => {
                  const isSelected = questionType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setQuestionType(t.id)}
                      className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#E6F4EA] border-[#059669] text-[#047857] shadow-xs' 
                          : 'bg-[#FAF8F5] border-[#EAE7DF] text-[#202321] hover:bg-[#F4F1EA]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-extrabold">{t.label}</p>
                        <p className="text-[11px] text-[#666B67] font-medium">{t.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#059669] bg-[#059669] text-white' : 'border-[#EAE7DF] bg-white'}`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Number of Questions */}
              <div className="pt-3 flex items-center justify-between bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EAE7DF]">
                <span className="text-xs font-bold text-[#202321]">Number of Questions:</span>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="bg-white border border-[#EAE7DF] rounded-xl px-3 py-1.5 text-xs font-extrabold text-[#059669] focus:outline-none"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>
            </div>

          </div>

          {/* Start Quiz Action */}
          <button
            onClick={handleStartQuiz}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Fetching Quiz Questions...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Start Quiz ▶</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 3. STATE 2: ACTIVE QUIZ VIEW (Render Questions & Options Dynamically) */}
      {quizState === 'quiz' && currentQ && (
        <div className="bg-white p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
          
          {/* Progress Header */}
          <div className="flex items-center justify-between border-b border-[#EAE7DF] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0] uppercase">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-xs font-bold text-[#666B67] capitalize">
                Domain: {domain.replace('_', ' ')}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-32 bg-[#FAF8F5] rounded-full h-2 border border-[#EAE7DF] overflow-hidden">
              <div 
                className="bg-[#059669] h-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-3">
            <h3 className="text-lg font-black text-[#202321] leading-relaxed">
              {currentQ.question || currentQ.question_text}
            </h3>

            {/* Optional Code Snippet Display */}
            {currentQ.code_snippet && (
              <pre className="p-4 rounded-2xl bg-[#202321] text-[#6EE7B7] text-xs font-mono overflow-x-auto select-text leading-relaxed">
                {currentQ.code_snippet}
              </pre>
            )}
          </div>

          {/* Options Display */}
          <div className="space-y-3 pt-2">
            {(currentQ.options || []).map((optText, optIdx) => {
              const optKey = String.fromCharCode(65 + optIdx); // A, B, C, D
              const isSelected = selectedAnswers[currentQKey] === optText;

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(currentQKey, optText)}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#E6F4EA] border-[#059669] text-[#047857] font-bold shadow-xs'
                      : 'bg-[#FAF8F5] border-[#EAE7DF] text-[#202321] hover:bg-[#F4F1EA]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold ${isSelected ? 'bg-[#059669] text-white' : 'bg-white border border-[#EAE7DF] text-[#666B67]'}`}>
                      {optKey}
                    </span>
                    <span className="text-xs font-semibold">{optText}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-[#059669]" />}
                </button>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-[#EAE7DF]">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-[#666B67] hover:text-[#202321] font-bold text-xs disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-6 py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                disabled={loading}
                className="px-6 py-2.5 rounded-2xl bg-[#047857] hover:bg-[#065F46] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Answers...</span>
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    <span>Submit Final Quiz</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. STATE 3: RESULTS VIEW (Display Final Score & Detailed Explanations) */}
      {quizState === 'results' && resultData && (
        <div className="bg-white p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
          
          {/* Score Header Card */}
          <div className="p-6 rounded-3xl bg-[#E6F4EA]/40 border border-[#BBF7D0] text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#059669] text-white flex items-center justify-center mx-auto shadow-md shadow-[#059669]/20">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-3xl font-black text-[#202321]">
                Quiz Completed!
              </h2>
              <p className="text-xs text-[#047857] font-extrabold uppercase tracking-wider">
                Domain: {domain.replace('_', ' ')} • {questionType}
              </p>
            </div>

            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white border border-[#BBF7D0] shadow-xs">
              <span className="text-2xl font-black text-[#059669]">
                {resultData.score ?? 0} / {resultData.total_questions ?? resultData.total ?? questions.length}
              </span>
              <span className="text-xs font-bold text-[#666B67]">
                ({resultData.percentage ?? Math.round(((resultData.score || 0) / (resultData.total_questions || questions.length)) * 100)}% Score)
              </span>
            </div>
          </div>

          {/* Explanations Review */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-[#202321] flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#059669]" />
              <span>Detailed Question Review & Explanations</span>
            </h3>

            <div className="space-y-4">
              {(resultData.answer_key || []).map((item, idx) => {
                const isCorrect = item.is_correct;
                const isUnanswered = item.status === 'unanswered' || item.selected_answer === 'Not Answered';

                return (
                  <div key={idx} className="p-6 rounded-3xl bg-[#FAF8F5] border border-[#EAE7DF] space-y-4 shadow-xs">
                    
                    {/* Header: Question Number & Correctness Badge */}
                    <div className="flex items-start justify-between gap-4 border-b border-[#EAE7DF] pb-3">
                      <p className="text-sm font-black text-[#202321] leading-relaxed">
                        {idx + 1}. {item.question_text}
                      </p>
                      
                      {isCorrect ? (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0] inline-flex items-center gap-1.5 shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                          <span>✓ Correct</span>
                        </span>
                      ) : isUnanswered ? (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] inline-flex items-center gap-1.5 shrink-0">
                          <AlertCircle className="w-4 h-4 text-[#D97706]" />
                          <span>— Not Answered</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-600 border border-rose-200 inline-flex items-center gap-1.5 shrink-0">
                          <XCircle className="w-4 h-4 text-rose-500" />
                          <span>✗ Incorrect</span>
                        </span>
                      )}
                    </div>

                    {/* Answers Comparison Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      
                      {/* Your Selected Answer */}
                      <div className={`p-3.5 rounded-2xl border ${
                        isCorrect 
                          ? 'bg-[#E6F4EA] border-[#BBF7D0] text-[#047857]' 
                          : isUnanswered 
                            ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]' 
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}>
                        <span className="block text-[10px] uppercase font-extrabold tracking-wider opacity-80 mb-1">
                          Your Answer
                        </span>
                        <span className="font-extrabold text-sm">{item.selected_answer}</span>
                      </div>

                      {/* Correct Answer */}
                      <div className="p-3.5 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] text-[#047857]">
                        <span className="block text-[10px] uppercase font-extrabold tracking-wider text-[#059669] mb-1">
                          Correct Answer
                        </span>
                        <span className="font-extrabold text-sm text-[#047857]">{item.correct_answer}</span>
                      </div>

                    </div>

                    {/* Real Explanation Card */}
                    {item.explanation && (
                      <div className="p-4 rounded-2xl bg-white border border-[#EAE7DF] space-y-1">
                        <span className="text-xs font-extrabold text-[#059669] flex items-center gap-1.5">
                          <Brain className="w-4 h-4 text-[#059669]" />
                          <span>Explanation:</span>
                        </span>
                        <p className="text-xs text-[#525753] font-medium leading-relaxed">
                          {item.explanation}
                        </p>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-4 border-t border-[#EAE7DF]">
            <button
              onClick={() => setQuizState('selection')}
              className="flex-1 py-3.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Take Another Quiz</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
