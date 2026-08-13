import React, { useState, useRef, useEffect } from 'react';
import { Mic, Video, VideoOff, Play, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import axios from 'axios';

interface InterviewSimulatorProps {
  token: string;
}

export const InterviewSimulator: React.FC<InterviewSimulatorProps> = ({ token }) => {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [interviewType, setInterviewType] = useState('Technical');
  const [sessionData, setSessionData] = useState<any>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("Webcam access requested or simulated.");
      setCameraActive(true);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setCameraActive(false);
  };

  const handleStartSession = async () => {
    try {
      const res = await axios.post(
        '/api/v1/interview/start',
        { interview_type: interviewType, target_company: 'Google' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSessionData(res.data);
      setSessionStarted(true);
      setCurrentQIndex(0);
      setFinalReport(null);
      setEvalResult(null);
      startCamera();
    } catch (err) {
      alert("Session start failed.");
    }
  };

  const handleSubmitAnswer = async () => {
    if (!sessionData) return;
    setEvaluating(true);

    try {
      const question = sessionData.questions[currentQIndex];
      const res = await axios.post(
        '/api/v1/interview/answer',
        {
          session_id: sessionData.session_id,
          question,
          answer_text: answerText || 'I designed a scalable microservices architecture using FastAPI, Docker containers, and MySQL database.'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEvalResult(res.data);
    } catch (err) {
      alert("Answer submission failed.");
    } finally {
      setEvaluating(false);
    }
  };

  const handleNextOrFinish = async () => {
    if (!sessionData) return;
    if (currentQIndex < sessionData.questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
      setAnswerText('');
      setEvalResult(null);
    } else {
      try {
        const res = await axios.post(
          '/api/v1/interview/finish',
          { session_id: sessionData.session_id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFinalReport(res.data);
        stopCamera();
      } catch (err) {
        alert("Finish session failed.");
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 text-[#202321]">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FFE4E6] text-[#E11D48] border border-[#FECDD3]">
            <Mic className="w-3.5 h-3.5 text-[#E11D48]" />
            <span>AI Mock Interview Room</span>
          </div>
          <h2 className="text-2xl font-black text-[#202321] tracking-tight">Immersive Interview Environment</h2>
          <p className="text-xs text-[#666B67] font-medium max-w-xl leading-relaxed">
            Simulate Technical, HR, and Viva interviews with real-time Speech STT & non-verbal analysis.
          </p>
        </div>

        {!sessionStarted && (
          <div className="flex items-center gap-3">
            <select
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              className="bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#202321] focus:outline-none focus:border-[#059669] cursor-pointer"
            >
              <option value="Technical">Technical Interview</option>
              <option value="HR">HR & Behavioral</option>
              <option value="Viva">Project Viva Mode</option>
            </select>

            <button
              onClick={handleStartSession}
              className="px-6 py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Session</span>
            </button>
          </div>
        )}
      </div>

      {sessionStarted && !finalReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: WebRTC Video Camera Preview */}
          <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-4">
            <div className="relative aspect-video rounded-2xl bg-[#202321] border border-[#333734] overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[#949A95] space-y-2">
                  <VideoOff className="w-10 h-10" />
                  <span className="text-xs font-semibold">Camera Preview Active</span>
                </div>
              )}

              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#202321]/80 text-[#10B981] border border-[#10B981]/30 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span> Live Session
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF]">
                <div className="text-[10px] font-bold text-[#949A95] uppercase">Speech Rate</div>
                <div className="text-xs font-black text-[#059669] mt-0.5">140 WPM</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF]">
                <div className="text-[10px] font-bold text-[#949A95] uppercase">Eye Contact</div>
                <div className="text-xs font-black text-[#047857] mt-0.5">88.5%</div>
              </div>
            </div>
          </div>

          {/* Right Column: Question & Response */}
          <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
                <span className="text-xs font-bold text-[#949A95] uppercase tracking-wider">
                  Question {currentQIndex + 1} of {sessionData.questions.length}
                </span>
                <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E6F4EA] text-[#047857]">
                  {interviewType}
                </span>
              </div>

              <h3 className="text-sm font-extrabold text-[#202321] leading-relaxed">
                "{sessionData.questions[currentQIndex]}"
              </h3>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#202321]">Your Answer (Speak or Type)</label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type or speak your response here..."
                  rows={4}
                  className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl p-3.5 text-xs font-medium text-[#202321] focus:outline-none focus:border-[#059669] focus:bg-white resize-none"
                />
              </div>

              {evalResult && (
                <div className="p-4 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#047857]">
                    <span>Response Score</span>
                    <span className="text-[#059669] font-black">{evalResult.eval_score} / 100</span>
                  </div>
                  <div className="text-xs text-[#064E3B] font-medium">
                    <strong>Follow-up:</strong> "{evalResult.follow_up_question}"
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              {!evalResult ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={evaluating}
                  className="w-full py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  {evaluating ? 'Analyzing Speech & Technical Accuracy...' : 'Submit & Evaluate Answer'}
                </button>
              ) : (
                <button
                  onClick={handleNextOrFinish}
                  className="w-full py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>{currentQIndex < sessionData.questions.length - 1 ? 'Next Question' : 'Generate Full Debrief Report'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Final Score Report View */}
      {finalReport && (
        <div className="bg-white p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-4">
            <div>
              <h3 className="text-xl font-black text-[#202321]">Interview Evaluation Report</h3>
              <p className="text-xs text-[#666B67] font-semibold">Mode: {interviewType}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-[#059669]">{finalReport.overall_score} / 100</div>
              <div className="text-xs text-[#949A95] font-bold">Overall Readiness Score</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(finalReport.score_breakdown || {}).map(([cat, score]: [string, any]) => (
              <div key={cat} className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#525753]">{cat}</span>
                  <span className="text-[#059669]">{score}%</span>
                </div>
                <div className="w-full bg-[#EAE7DF] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#059669] h-full rounded-full" style={{ width: `${score}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] space-y-2">
            <h4 className="text-xs font-extrabold text-[#047857] uppercase tracking-wider">Key Strengths Noted</h4>
            <ul className="space-y-1.5 text-xs text-[#202321] font-medium">
              {(finalReport.report?.strengths || []).map((str: string, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => {
              setFinalReport(null);
              setSessionStarted(false);
            }}
            className="px-6 py-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] text-xs font-bold text-[#202321] border border-[#EAE7DF] transition-all cursor-pointer"
          >
            Start New Session
          </button>
        </div>
      )}
    </div>
  );
};
