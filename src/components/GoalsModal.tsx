import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Sparkles,
  Trash2,
  X,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { PersonalGoal } from '../types';
import { savePersonalGoal, deletePersonalGoal, subscribeToUserGoals } from '../lib/firebase';

interface GoalsModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectPromptForReflection?: (promptText: string, goalTitle: string) => void;
}

export const GoalsModal: React.FC<GoalsModalProps> = ({
  userId,
  isOpen,
  onClose,
  onSelectPromptForReflection
}) => {
  const [goals, setGoals] = useState<PersonalGoal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<PersonalGoal | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingGemini, setIsLoadingGemini] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<PersonalGoal['category']>('Personal');
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    if (!isOpen || !userId) return;
    const unsubscribe = subscribeToUserGoals(
      userId,
      (fetched) => {
        setGoals(fetched);
        if (fetched.length > 0 && !selectedGoal) {
          setSelectedGoal(fetched[0]);
        }
      },
      (err) => {
        console.error('Error fetching goals:', err);
      }
    );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, userId, onClose]);

  if (!isOpen) return null;

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newGoal: PersonalGoal = {
      id: `goal-${Date.now()}`,
      userId,
      title: newTitle.trim(),
      description: newDescription.trim(),
      category: newCategory,
      status: 'active',
      progress: 0,
      actionSteps: [],
      reflectionPrompts: [],
      targetDate: targetDate || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await savePersonalGoal(userId, newGoal);
      setSelectedGoal(newGoal);
      setIsCreating(false);
      setNewTitle('');
      setNewDescription('');
      setTargetDate('');
    } catch (err: any) {
      setErrorMsg('Failed to save goal.');
    }
  };

  const handleGenerateAISteps = async (goal: PersonalGoal) => {
    setIsLoadingGemini(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/gemini/goal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalTitle: goal.title,
          goalDescription: goal.description,
          category: goal.category
        })
      });

      if (!res.ok) throw new Error('AI breakdown request failed');
      const data = await res.json();
      if (data.data) {
        const generatedSteps = (data.data.steps || []).map((stepText: string, idx: number) => ({
          id: `step-${Date.now()}-${idx}`,
          title: stepText,
          completed: false
        }));

        const updated: PersonalGoal = {
          ...goal,
          actionSteps: [...goal.actionSteps, ...generatedSteps],
          reflectionPrompts: Array.from(new Set([...(goal.reflectionPrompts || []), ...(data.data.reflectionPrompts || [])])),
          updatedAt: new Date().toISOString()
        };

        await savePersonalGoal(userId, updated);
        setSelectedGoal(updated);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to generate AI action steps. Please retry.');
    } finally {
      setIsLoadingGemini(false);
    }
  };

  const handleToggleStep = async (goal: PersonalGoal, stepId: string) => {
    const updatedSteps = goal.actionSteps.map(step =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    );
    const completedCount = updatedSteps.filter(s => s.completed).length;
    const progress = updatedSteps.length > 0 ? Math.round((completedCount / updatedSteps.length) * 100) : 0;

    const updated: PersonalGoal = {
      ...goal,
      actionSteps: updatedSteps,
      progress,
      status: progress === 100 ? 'completed' : 'in_progress',
      updatedAt: new Date().toISOString()
    };

    await savePersonalGoal(userId, updated);
    setSelectedGoal(updated);
  };

  const handleDelete = async (goalId: string) => {
    if (!window.confirm('Delete this goal and its action steps permanently?')) return;
    try {
      await deletePersonalGoal(userId, goalId);
      if (selectedGoal?.id === goalId) {
        const remaining = goals.filter(g => g.id !== goalId);
        setSelectedGoal(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Delete goal error:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1815]/60 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-[#FBF9F6] border border-[#E0DBCF] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E0DBCF] flex items-center justify-between bg-white/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8A9A8A]/15 border border-[#8A9A8A]/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#8A9A8A]" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-semibold text-[#3A352F]">Personal Goals & Action Engine</h2>
              <p className="text-xs text-[#7A7369]">Set mindful intentions, generate Gemini action steps, and track progress</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7A7369] hover:text-[#3A352F] hover:bg-[#EAE4D9] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Goals List */}
          <div className="w-full md:w-80 border-r border-[#E0DBCF] p-4 flex flex-col bg-[#F7F4EE]/50 overflow-y-auto">
            <button
              onClick={() => { setIsCreating(true); setSelectedGoal(null); }}
              className="w-full mb-3 flex items-center justify-center gap-2 py-2 px-3 bg-[#3A352F] hover:bg-[#25221E] text-[#FBF9F6] text-xs font-medium rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Goal</span>
            </button>

            <div className="space-y-2 flex-1">
              {goals.length === 0 ? (
                <div className="text-center py-8 px-2 text-[#7A7369] text-xs">
                  No personal goals set yet. Start by creating one!
                </div>
              ) : (
                goals.map(g => (
                  <div
                    key={g.id}
                    onClick={() => { setSelectedGoal(g); setIsCreating(false); }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedGoal?.id === g.id && !isCreating
                        ? 'bg-white border-[#8A9A8A] shadow-xs'
                        : 'bg-white/60 border-[#E0DBCF] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-serif font-semibold text-[#3A352F] line-clamp-1">{g.title}</h4>
                      <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-[#EAE4D9] text-[#7A7369] shrink-0">
                        {g.category}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 bg-[#E0DBCF]/60 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#8A9A8A] h-full rounded-full transition-all duration-300"
                          style={{ width: `${g.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[#7A7369]">{g.progress}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-white/40">
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isCreating ? (
              <form onSubmit={handleCreateGoal} className="space-y-4 max-w-lg">
                <h3 className="text-sm font-serif font-bold text-[#3A352F]">Define New Goal</h3>
                <div>
                  <label className="block text-xs font-medium text-[#7A7369] mb-1">Goal Title *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Master Cloud Run & Deploy Production AI Apps"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E0DBCF] bg-white text-[#3A352F] focus:outline-none focus:ring-1 focus:ring-[#8A9A8A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#7A7369] mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e: any) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E0DBCF] bg-white text-[#3A352F] focus:outline-none focus:ring-1 focus:ring-[#8A9A8A]"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Career">Career</option>
                      <option value="Learning">Learning</option>
                      <option value="Mindfulness">Mindfulness</option>
                      <option value="Health">Health</option>
                      <option value="Creative">Creative</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#7A7369] mb-1">Target Date</label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E0DBCF] bg-white text-[#3A352F] focus:outline-none focus:ring-1 focus:ring-[#8A9A8A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#7A7369] mb-1">Context / Motivation</label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Why is this meaningful to you right now?"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E0DBCF] bg-white text-[#3A352F] focus:outline-none focus:ring-1 focus:ring-[#8A9A8A] resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#3A352F] text-white text-xs font-medium rounded-xl hover:bg-[#25221E] transition-all cursor-pointer"
                  >
                    Save Goal
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 border border-[#E0DBCF] text-[#7A7369] text-xs font-medium rounded-xl hover:bg-[#EAE4D9] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : selectedGoal ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-serif font-bold text-[#3A352F]">{selectedGoal.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#8A9A8A]/20 text-[#3A352F] font-medium">
                        {selectedGoal.category}
                      </span>
                    </div>
                    {selectedGoal.description && (
                      <p className="text-xs text-[#7A7369] mt-1">{selectedGoal.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(selectedGoal.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Goal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Gemini Action Steps Breakdown */}
                <div className="border border-[#E0DBCF] rounded-xl p-4 bg-white/70">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-xs font-serif font-bold text-[#3A352F]">Action Steps & Milestones</h4>
                    </div>
                    <button
                      onClick={() => handleGenerateAISteps(selectedGoal)}
                      disabled={isLoadingGemini}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isLoadingGemini ? 'Gemini Thinking...' : 'AI Step Breakdown'}</span>
                    </button>
                  </div>

                  {selectedGoal.actionSteps.length === 0 ? (
                    <p className="text-xs text-[#7A7369] py-3 italic">
                      No action steps yet. Click "AI Step Breakdown" to let Gemini map out manageable milestones!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedGoal.actionSteps.map(step => (
                        <div
                          key={step.id}
                          onClick={() => handleToggleStep(selectedGoal, step.id)}
                          className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#FBF9F6] transition-colors cursor-pointer"
                        >
                          {step.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-[#8A9A8A] shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-[#7A7369] shrink-0" />
                          )}
                          <span className={`text-xs ${step.completed ? 'line-through text-[#7A7369]' : 'text-[#3A352F]'}`}>
                            {step.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gemini Reflection Prompts */}
                {selectedGoal.reflectionPrompts && selectedGoal.reflectionPrompts.length > 0 && (
                  <div className="border border-[#E0DBCF] rounded-xl p-4 bg-[#F7F4EE]/60">
                    <h4 className="text-xs font-serif font-bold text-[#3A352F] mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#8A9A8A]" />
                      <span>Targeted Reflection Prompts</span>
                    </h4>
                    <div className="space-y-2">
                      {selectedGoal.reflectionPrompts.map((prompt, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-white rounded-lg border border-[#E0DBCF] flex items-center justify-between gap-2"
                        >
                          <p className="text-xs text-[#3A352F] italic">"{prompt}"</p>
                          {onSelectPromptForReflection && (
                            <button
                              onClick={() => {
                                onSelectPromptForReflection(prompt, selectedGoal.title);
                                onClose();
                              }}
                              className="px-2.5 py-1 text-[11px] bg-[#3A352F] text-white rounded-md hover:bg-[#25221E] shrink-0 cursor-pointer"
                            >
                              Reflect Now
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[#7A7369] text-xs">
                Select a goal from the list or create a new one.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
