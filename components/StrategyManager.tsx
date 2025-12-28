
import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Save, Zap } from 'lucide-react';
import { Strategy, StrategyStep, TaskAction } from '../types';
import { ACTION_ICONS } from '../constants';
import { getPlatformColor } from '../utils/styles';

interface StrategyManagerProps {
  strategies: Strategy[];
  onUpdate: (strategies: Strategy[]) => void;
}

const StrategyManager: React.FC<StrategyManagerProps> = ({ strategies, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Strategy | null>(null);

  const startEdit = (s: Strategy) => {
    setEditingId(s.id);
    setEditForm(JSON.parse(JSON.stringify(s)));
  };

  const addNew = () => {
    const newS: Strategy = {
      id: crypto.randomUUID(),
      name: 'New Strategy',
      description: 'Enter a short description...',
      steps: [{ dayOffset: 0, action: 'send_dm', template: 'Hello {companyName}, ...' }]
    };
    const updated = [newS, ...strategies];
    onUpdate(updated);
    startEdit(newS);
  };

  const save = () => {
    if (!editForm) return;
    const updated = strategies.map(s => s.id === editForm.id ? editForm : s);
    onUpdate(updated);
    setEditingId(null);
    setEditForm(null);
  };

  const remove = (id: string) => {
    if (confirm('Are you sure you want to delete this strategy?')) {
      onUpdate(strategies.filter(s => s.id !== id));
    }
  };

  const updateStep = (idx: number, field: keyof StrategyStep, value: any) => {
    if (!editForm) return;
    const steps = [...editForm.steps];
    steps[idx] = { ...steps[idx], [field]: value };
    setEditForm({ ...editForm, steps });
  };

  const addStep = () => {
    if (!editForm) return;
    const lastStep = editForm.steps[editForm.steps.length - 1];
    setEditForm({
      ...editForm,
      steps: [...editForm.steps, { dayOffset: (lastStep?.dayOffset || 0) + 2, action: 'send_dm', template: '' }]
    });
  };

  const removeStep = (idx: number) => {
    if (!editForm) return;
    setEditForm({ ...editForm, steps: editForm.steps.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Zap className="text-indigo-600" /> Outreach Strategies
        </h2>
        <button onClick={addNew} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-sm hover:bg-indigo-700 transition-all">
          <Plus size={18} /> Add New Strategy
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {strategies.map(s => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden transition-all shadow-sm">
            {editingId === s.id && editForm ? (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Name</label>
                    <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
                    <input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    Sequence Steps
                    <button onClick={addStep} className="text-indigo-600 hover:underline">Add Step</button>
                  </h4>
                  <div className="space-y-3">
                    {editForm.steps.map((step, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border transition-all ${getPlatformColor(step.action)}`}>
                            {ACTION_ICONS[step.action] ? React.cloneElement(ACTION_ICONS[step.action] as React.ReactElement, { size: 16 }) : idx + 1}
                          </div>
                          <select value={step.action} onChange={e => updateStep(idx, 'action', e.target.value as TaskAction)} className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold outline-none">
                            <option value="send_dm">Instagram DM</option>
                            <option value="linkedin_dm">LinkedIn Message</option>
                            <option value="send_email">Email</option>
                            <option value="call">Phone Call</option>
                            <option value="fb_message">FB Message</option>
                            <option value="manual">Manual Task</option>
                          </select>
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Day Offset</span>
                            <input type="number" value={step.dayOffset} onChange={e => updateStep(idx, 'dayOffset', parseInt(e.target.value))} className="w-12 p-1 bg-white border border-slate-200 rounded-lg text-center text-xs font-bold" />
                            <button onClick={() => removeStep(idx)} className="text-rose-500 p-1 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </div>
                        <textarea value={step.template} onChange={e => updateStep(idx, 'template', e.target.value)} placeholder="Message template..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs min-h-[80px] focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => { setEditingId(null); setEditForm(null); }} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                  <button onClick={save} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <Save size={18} /> Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{s.name}</h3>
                    <p className="text-xs text-slate-500">{s.description}</p>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(s)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                  <button onClick={() => remove(s.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StrategyManager;
