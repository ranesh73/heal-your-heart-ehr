import React, { useState } from "react";
import { Check, Save, FileText, HelpCircle, CheckCircle2 } from "lucide-react";
import { api } from "../../api";

interface QuestionItem {
  id: string;
  question: string;
  answer: "yes" | "no" | null;
}

const DEFAULT_QUESTIONS: QuestionItem[] = [
  { id: "q1", question: "Do you experience chest discomfort, tightness, or pressure during exertion or emotional stress?", answer: null },
  { id: "q2", question: "Have you been formally diagnosed with coronary artery disease, angina, or refractory ischemia?", answer: null },
  { id: "q3", question: "Have you previously undergone coronary angioplasty (stents) or coronary artery bypass graft (CABG)?", answer: null },
  { id: "q4", question: "Do you experience shortness of breath or early exhaustion when climbing one flight of stairs or walking?", answer: null },
  { id: "q5", question: "Do you suffer from persistent fatigue or reduced stamina that limits your daily independent activities?", answer: null },
  { id: "q6", question: "Are you taking sublingual nitroglycerin, nitrates, or beta-blockers regularly for angina relief?", answer: null },
  { id: "q7", question: "Have you been informed that you are not a suitable candidate for further stent or bypass surgeries?", answer: null },
  { id: "q8", question: "Do you wish to pursue non-invasive Enhanced External Counterpulsation (EECP) natural bypass therapy?", answer: null },
];

export function QuestionnairesSubpage() {
  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    const saved = localStorage.getItem("hyh_eecp_candidate_questionnaire");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_QUESTIONS;
  });

  const [savedNotice, setSavedNotice] = useState(false);

  const handleSelectAnswer = (id: string, ans: "yes" | "no") => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, answer: ans } : q))
    );
  };

  const handleSave = async () => {
    localStorage.setItem(
      "hyh_eecp_candidate_questionnaire",
      JSON.stringify(questions)
    );
    try {
      await api(
        "/admin/settings/questionnaires/practice-questionnaires",
        "PUT",
        {
          title: "Are you a candidate for EECP Therapy?",
          questions,
        }
      );
    } catch {}

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const yesCount = questions.filter((q) => q.answer === "yes").length;
  const answeredCount = questions.filter((q) => q.answer !== null).length;

  return (
    <div className="charm-settings-form-container">
      {savedNotice && (
        <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-sm flex items-center gap-2">
          <Check size={16} />
          <span>Questionnaire responses saved and updated automatically!</span>
        </div>
      )}

      <div className="charm-form-header-box flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-[#166eb8] uppercase">
              Clinical Assessment
            </span>
            <span className="text-slate-400 text-xs">Version 2.4 · EECP Unit</span>
          </div>
          <h2 className="text-[18px] font-bold text-slate-800 mt-1">
            Are you a candidate for EECP Therapy?
          </h2>
          <p className="text-[13px] text-slate-600 mt-0.5">
            This screening questionnaire evaluates clinical suitability and refractory angina severity for outpatient EECP natural bypass therapy.
          </p>
        </div>

        <button
          type="button"
          className="charm-btn-orange-new"
          onClick={handleSave}
        >
          <Save size={14} />
          <span>Save Questionnaire</span>
        </button>
      </div>

      {answeredCount > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="text-xs text-slate-700">
            <strong>{answeredCount} of {questions.length}</strong> questions answered ·{" "}
            <span className="text-[#166eb8] font-bold">{yesCount} affirmative (Yes)</span>
          </div>
          {yesCount >= 3 && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded">
              ✓ High EECP Candidacy Indicator
            </span>
          )}
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className={`p-3.5 rounded-lg border transition-all ${
              q.answer === "yes"
                ? "bg-blue-50/50 border-blue-300 shadow-sm"
                : q.answer === "no"
                ? "bg-slate-50 border-slate-200"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2.5 flex-1">
                <span className="font-bold text-[#166eb8] text-sm mt-0.5">
                  {idx + 1}.
                </span>
                <p className="text-slate-800 text-[13.5px] font-medium leading-snug">
                  {q.question}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    q.answer === "yes"
                      ? "bg-[#166eb8] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  onClick={() => handleSelectAnswer(q.id, "yes")}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    q.answer === "no"
                      ? "bg-slate-700 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  onClick={() => handleSelectAnswer(q.id, "no")}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

