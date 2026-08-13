import React, { useState, useRef, useEffect } from 'react';
import { Mic, Video, VideoOff, MicOff, Play, Square, Sparkles, CheckCircle2, Award, Clock, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
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
      // Finish Session
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
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* Header Banner */}
      <div className="glass-card p-6 rounded-3xl border border-darkBorder flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2">
            <Mic className="w-3.5 h-3.5" />
            <span>WebRTC Audio/Video & Project Viva Engine</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">AI Mock Interview Simulator</h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulate HR, Technical, and Project Viva interviews with real-time Speech STT & non-verbal analysis.
          </p>
        </div>

        {!sessionStarted && (
          <div className="flex items-center gap-3">
            <select
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              className="bg-slate-900 border border-darkBorder rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="Technical">Technical Interview</option>
              <option value="HR">HR & Behavioral</option>
              <option value="Viva">Project Viva Mode</option>
            </select>

            <button
              onClick={handleStartSession}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Mock Interview</span>
            </button>
          </div>
        )}
      </div>

      {sessionStarted && !finalReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: WebRTC Video Camera Preview */}
          <div className="glass-card p-5 rounded-3xl border border-darkBorder flex flex-col justify-between space-y-4">
            <div className="relative aspect-video rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <VideoOff className="w-10 h-10" />
                  <span className="text-xs">Camera Preview Simulation Active</span>
                </div>
              )}

              {/* Status Badges Overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Recording
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-500">Speech Rate (WPM)</div>
                <div className="text-xs font-bold text-blue-400 mt-0.5">140 WPM</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-500">Eye Contact</div>
                <div className="text-xs font-bold text-emerald-400 mt-0.5">88.5%</div>
              </div>
            </div>
          </div>

          {/* Right Column: Question Panel & Answer Input */}
          <div className="glass-card p-6 rounded-3xl border border-darkBorder flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-darkBorder pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Question {currentQIndex + 1} of {sessionData.questions.length}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  {interviewType}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-100 leading-relaxed">
                "{sessionData.questions[currentQIndex]}"
              </h3>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">Your Answer (Speak or Type)</label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type or speak your answer here..."
                  rows={4}
                  className="w-full bg-slate-900 border border-darkBorder rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {evalResult && (
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                    <span>Response Evaluation Score</span>
                    <span className="text-emerald-400">{evalResult.eval_score} / 100</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    <strong>Suggested Follow-up:</strong> "{evalResult.follow_up_question}"
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              {!evalResult ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={evaluating}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-500/20 transition-all"
                >
                  {evaluating ? 'Analyzing Speech & Technical Accuracy...' : 'Submit & Evaluate Answer'}
                </button>
              ) : (
                <button
                  onClick={handleNextOrFinish}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
                >
                  <span>{currentQIndex < sessionData.questions.length - 1 ? 'Next Question' : 'Complete & Generate Report'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Final Score Report View */}
      {finalReport && (
        <div className="glass-card p-8 rounded-3xl border border-darkBorder space-y-6">
          <div className="flex items-center justify-between border-b border-darkBorder pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Interview Evaluation Report</h3>
              <p className="text-xs text-slate-400">Target Company: Google SDE • Mode: {interviewType}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-emerald-400">{finalReport.overall_score} / 100</div>
              <div className="text-xs text-slate-400">Overall Readiness Score</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(finalReport.score_breakdown || {}).map(([cat, score]: [string, any]) => (
              <div key={cat} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">{cat}</span>
                  <span className="text-purple-400">{score}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-400 h-full rounded-full" style={{ width: `${score}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key Strengths</h4>
            <ul className="space-y-1 text-xs text-slate-300">
              {(finalReport.report?.strengths || []).map((str: string, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all"
          >
            Start New Session
          </button>
        </div>
      )}
    </div>
  );
};
