"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle, Award } from "lucide-react";
import { useState } from "react";

export default function QuizPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const quiz = {
    id: 1,
    title: "Ownership Mindset Assessment",
    description: "Test your understanding of ownership mindset and leadership",
    session: "Session 1: Ownership Mindset & Leadership at Work",
    timeLimit: 15,
    passingScore: 70,
    points: 200,
    questions: [
      {
        id: 1,
        question: "What is the key difference between leadership and authority?",
        options: [
          "Leadership requires a formal title",
          "Leadership is about influence, authority is about position",
          "Authority is more important than leadership",
          "There is no difference",
        ],
        correct: 1,
      },
      {
        id: 2,
        question: "Which characteristic best describes an ownership mindset?",
        options: [
          "Waiting for instructions before acting",
          "Taking responsibility for outcomes",
          "Blaming others when things go wrong",
          "Only caring about your own tasks",
        ],
        correct: 1,
      },
      {
        id: 3,
        question: "How can you demonstrate leadership without formal authority?",
        options: [
          "By demanding others follow you",
          "By taking initiative and influencing through example",
          "By avoiding responsibility",
          "By waiting for a promotion",
        ],
        correct: 1,
      },
    ],
  };

  const handleStart = () => {
    setStarted(true);
  };

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    setAnswers({ ...answers, [questionIndex]: quiz.questions[questionIndex].options[optionIndex] });
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    let correctAnswers = 0;
    quiz.questions.forEach((q, index) => {
      if (answers[index] === q.options[q.correct]) {
        correctAnswers++;
      }
    });
    const finalScore = Math.round((correctAnswers / quiz.questions.length) * 100);
    setScore(finalScore);
    setCompleted(true);
  };

  if (completed) {
    const passed = score >= quiz.passingScore;
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-[#0b0b45] text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/resources")}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Award className="w-6 h-6" />
                <span className="font-bold text-xl">Quiz Results</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
              passed ? "bg-green-100" : "bg-red-100"
            }`}>
              {passed ? (
                <CheckCircle className="w-12 h-12 text-green-600" />
              ) : (
                <Award className="w-12 h-12 text-red-600" />
              )}
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {passed ? "Congratulations!" : "Keep Learning!"}
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              {passed 
                ? "You've successfully completed this quiz!"
                : "You didn't pass this time, but you can try again."}
            </p>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Your Score</p>
                <p className={`text-4xl font-bold ${passed ? "text-green-600" : "text-red-600"}`}>
                  {score}%
                </p>
              </div>
              <div className="p-6 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Passing Score</p>
                <p className="text-4xl font-bold text-gray-900">{quiz.passingScore}%</p>
              </div>
            </div>

            {passed && (
              <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-900 font-semibold">
                  +{quiz.points} points earned!
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push("/resources")}
                className="px-6 py-3 bg-[#0b0b45] text-white rounded-lg font-semibold hover:bg-[#0b0b45]/90 transition-colors"
              >
                Back to Resources
              </button>
              {!passed && (
                <button
                  onClick={() => {
                    setCompleted(false);
                    setStarted(false);
                    setCurrentQuestion(0);
                    setAnswers({});
                    setScore(0);
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-[#0b0b45] text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/resources")}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Award className="w-6 h-6" />
                <span className="font-bold text-xl">Quiz</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{quiz.title}</h1>
            <p className="text-lg text-gray-600 mb-6">{quiz.description}</p>
            <p className="text-sm text-blue-600 mb-8">{quiz.session}</p>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Time Limit</p>
                <p className="text-lg font-bold text-gray-900">{quiz.timeLimit} min</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Passing Score</p>
                <p className="text-lg font-bold text-gray-900">{quiz.passingScore}%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Award className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Points</p>
                <p className="text-lg font-bold text-gray-900">{quiz.points}</p>
              </div>
            </div>

            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Instructions:</span> You have {quiz.timeLimit} minutes to complete {quiz.questions.length} questions. 
                You need {quiz.passingScore}% or higher to pass and earn {quiz.points} points. Good luck!
              </p>
            </div>

            <button
              onClick={handleStart}
              className="w-full px-6 py-4 bg-[#0b0b45] text-white rounded-lg font-semibold text-lg hover:bg-[#0b0b45]/90 transition-colors"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestion];
  const selectedAnswer = answers[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#0b0b45] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6" />
              <span className="font-bold text-xl">{quiz.title}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">12:34</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round(((currentQuestion + 1) / quiz.questions.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#0b0b45] h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{currentQ.question}</h2>
          
          <div className="space-y-3">
            {currentQ.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(currentQuestion, index)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAnswer === option
                    ? "border-[#0b0b45] bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedAnswer === option
                      ? "border-[#0b0b45] bg-[#0b0b45]"
                      : "border-gray-300"
                  }`}>
                    {selectedAnswer === option && (
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="text-gray-900">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {currentQuestion < quiz.questions.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!selectedAnswer}
              className="px-6 py-3 bg-[#0b0b45] text-white rounded-lg font-semibold hover:bg-[#0b0b45]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length !== quiz.questions.length}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
