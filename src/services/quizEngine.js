// PlaceX Quiz Engine & Grading Subsystem
// Faithful port of backend/quiz_backend/
import { SEED_QUESTIONS } from '../data/quizData.js';
import { recordStudentActivity } from './activityStore.js';

export function normalizeDomain(domainStr = "") {
  const d = domainStr.toLowerCase();
  if (d.includes('ai') || d.includes('ml')) return 'AIML';
  if (d.includes('data')) return 'DataScience';
  if (d.includes('cyber') || d.includes('security')) return 'CyberSecurity';
  if (d.includes('aptitude') || d.includes('quant')) return 'Aptitude';
  if (d.includes('web') || d.includes('soft') || d.includes('dev') || d.includes('python') || d.includes('core')) return 'SoftwareEngineering';
  return 'SoftwareEngineering';
}

export function getQuizDomains() {
  return [
    { id: 'ai_ml', domain: 'AIML', name: 'AI & Machine Learning', count: 16 },
    { id: 'web_dev', domain: 'SoftwareEngineering', name: 'Software Engineering & Web Dev', count: 16 },
    { id: 'data_science', domain: 'DataScience', name: 'Data Science & Analytics', count: 16 },
    { id: 'cyber_security', domain: 'CyberSecurity', name: 'Cybersecurity & Networks', count: 16 },
    { id: 'aptitude', domain: 'Aptitude', name: 'Quantitative Aptitude', count: 15 }
  ];
}

export function startQuizSession(domain = "ai_ml", questionType = "all", numQuestions = 5) {
  const normDomain = normalizeDomain(domain);
  let pool = SEED_QUESTIONS.filter(q => q.domain === normDomain);

  if (questionType && questionType !== 'all') {
    const typeFiltered = pool.filter(q => q.question_type === questionType);
    if (typeFiltered.length > 0) pool = typeFiltered;
  }

  // Shuffle or slice requested count
  const count = Math.min(Math.max(1, numQuestions), pool.length);
  const selected = pool.slice(0, count);

  const quizId = 'quiz_' + Date.now();

  // Strip answers from questions payload to prevent client-side inspection
  const sanitizedQuestions = selected.map((q, idx) => ({
    id: q.id,
    question_id: q.id,
    question: q.question_text,
    question_text: q.question_text,
    options: q.options,
    difficulty: q.difficulty,
    sub_topic: q.sub_topic,
    domain: q.domain,
    question_type: q.question_type,
    presentation_order: idx + 1
  }));

  return {
    quiz_id: quizId,
    domain: normDomain,
    total_questions: sanitizedQuestions.length,
    questions: sanitizedQuestions
  };
}

export function gradeQuizSubmission(quizId, answers = [], domain = "ai_ml") {
  const questionMap = new Map();
  for (const q of SEED_QUESTIONS) {
    questionMap.set(q.id, q);
    questionMap.set(String(q.id), q);
  }

  const answerKey = [];
  let score = 0;
  const total = answers.length;

  for (let idx = 0; idx < answers.length; idx++) {
    const ans = answers[idx];
    const qid = ans.question_id;
    const q = questionMap.get(qid) || SEED_QUESTIONS[idx % SEED_QUESTIONS.length];

    const correctIndex = q.correct_option_index;
    const correctAnswer = q.options[correctIndex];

    const selectedVal = ans.selected_value;
    let selectedIndex = -1;

    if (typeof selectedVal === 'number') {
      selectedIndex = selectedVal;
    } else if (typeof selectedVal === 'string') {
      selectedIndex = q.options.findIndex(opt => opt.trim().toLowerCase() === selectedVal.trim().toLowerCase());
      if (selectedIndex === -1 && /^\d+$/.test(selectedVal)) {
        selectedIndex = parseInt(selectedVal, 10);
      }
    }

    const isCorrect = (selectedIndex === correctIndex) || (typeof selectedVal === 'string' && selectedVal.trim() === correctAnswer.trim());
    if (isCorrect) score++;

    const chosenAnswer = selectedIndex >= 0 && selectedIndex < q.options.length ? q.options[selectedIndex] : String(selectedVal || "Not Answered");

    answerKey.push({
      question_id: q.id,
      question_text: q.question_text,
      options: q.options,
      correct_option_index: correctIndex,
      correct_answer: correctAnswer,
      selected_option_index: selectedIndex,
      selected_answer: chosenAnswer,
      is_correct: isCorrect,
      status: isCorrect ? "correct" : "incorrect",
      explanation: q.explanation,
      domain: q.domain,
      question_type: q.question_type,
      sub_topic: q.sub_topic,
      difficulty: q.difficulty,
      points_earned: isCorrect ? 1 : 0
    });
  }

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = percentage >= 60;

  // Record real qualifying learning activity
  recordStudentActivity(undefined, false, true, "quiz.completed");

  let feedback = "Good effort! Review the explanations below to target weak concepts.";
  if (percentage === 100) {
    feedback = "Flawless score! You demonstrated complete conceptual mastery across all questions.";
  } else if (percentage >= 80) {
    feedback = "Excellent performance! High conceptual accuracy demonstrated for placement rounds.";
  } else if (percentage >= 60) {
    feedback = "Passing score achieved! Solid foundation with a few minor gaps to review.";
  }

  return {
    quiz_id: quizId || ('quiz_' + Date.now()),
    score: score,
    total_questions: total,
    total: total,
    percentage: percentage,
    passed: passed,
    feedback: feedback,
    answer_key: answerKey,
    details: answerKey.map(k => ({
      question_id: k.question_id,
      correct: k.is_correct,
      explanation: k.explanation
    }))
  };
}
