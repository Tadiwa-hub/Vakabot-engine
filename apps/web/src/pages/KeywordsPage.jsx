import React, { useState } from 'react';
import { Plus, Search, Trash2, Edit2, Loader2 } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Toggle from '../components/ui/Toggle';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { useKeywords } from '../hooks/useKeywords';

const KeywordsPage = () => {
  const { user } = useUser();
  const { keywords, loading, addKeyword, toggleKeyword, removeKeyword } = useKeywords(user?.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const [newKeyword, setNewKeyword] = useState({ triggers: '', response: '', matchType: 'contains' });
  const [isSaving, setIsSaving] = useState(false);

  const filteredKeywords = keywords.filter(kw => 
    kw.triggers.toLowerCase().includes(search.toLowerCase()) ||
    kw.response.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!newKeyword.triggers || !newKeyword.response) return;
    setIsSaving(true);
    try {
      await addKeyword(newKeyword);
      setIsModalOpen(false);
      setNewKeyword({ triggers: '', response: '', matchType: 'contains' });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-24 font-semibold">Keywords</h1>
          <p className="text-[14px] text-text-secondary mt-1">
            Automatic replies for common questions
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          Add Keyword
        </Button>
      </div>

      {/* Filter/Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" size={18} />
        <input 
          type="text"
          placeholder="Search keywords..."
          className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-input text-[14px] focus:outline-none focus:border-accent transition-default"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-text-light">
            <Loader2 className="animate-spin mr-2" size={20} />
            Loading keywords...
          </div>
        ) : filteredKeywords.length === 0 ? (
          <div className="text-center py-12 text-text-light border-2 border-dashed border-border rounded-card m-6">
            No keywords found. Add one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px] text-[13px]">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="px-6 py-3.5 label-sm">Triggers</th>
                  <th className="px-6 py-3.5 label-sm">Match Type</th>
                  <th className="px-6 py-3.5 label-sm">Response Preview</th>
                  <th className="px-6 py-3.5 label-sm text-center">Trigger Count</th>
                  <th className="px-6 py-3.5 label-sm text-center">Status</th>
                  <th className="px-6 py-3.5 label-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredKeywords.map(kw => (
                  <tr key={kw.id} className="hover:bg-surface transition-default">
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {kw.triggers.split(',').map((t, i) => (
                          <span key={i} className="bg-surface-2 px-1.5 py-0.5 rounded text-[12px] font-semibold text-primary truncate max-w-[150px]">
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${kw.matchType === 'exact' ? 'bg-primary text-white' : 'bg-surface-2 text-text-secondary border border-border'}`}>
                        {kw.matchType}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 max-w-[300px]">
                      <p className="truncate text-text-secondary italic" title={kw.response}>
                        {kw.response}
                      </p>
                    </td>
                    <td className="px-6 py-3.5 text-center font-mono font-medium text-text-secondary">
                      {kw.usageCount || 0}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <div className="inline-flex justify-center">
                        <Toggle 
                          checked={kw.isActive} 
                          onChange={(val) => toggleKeyword(kw.id, val)} 
                        />
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 text-text-light hover:text-primary transition-default rounded hover:bg-surface-2">
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('Delete this keyword?')) removeKeyword(kw.id);
                          }}
                          className="p-1.5 text-text-light hover:text-danger transition-default rounded hover:bg-danger/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Add Keyword"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={isSaving}>Save Keyword</Button>
          </>
        }
      >
        <div className="space-y-6">
          <Input 
            label="Keywords" 
            placeholder="e.g. price, cost, how much"
            helper="Separate with commas"
            value={newKeyword.triggers}
            onChange={(e) => setNewKeyword(prev => ({ ...prev, triggers: e.target.value }))}
          />
          
          <div className="space-y-2">
            <label className="label-sm block px-0.5">Match Type</label>
            <div className="flex p-1 bg-surface-2 rounded-lg gap-1">
              <button 
                onClick={() => setNewKeyword(prev => ({ ...prev, matchType: 'contains' }))}
                className={`flex-1 py-1.5 text-[12px] font-semibold rounded-md transition-default ${newKeyword.matchType === 'contains' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-primary'}`}
              >
                Contains Word
              </button>
              <button 
                onClick={() => setNewKeyword(prev => ({ ...prev, matchType: 'exact' }))}
                className={`flex-1 py-1.5 text-[12px] font-semibold rounded-md transition-default ${newKeyword.matchType === 'exact' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-primary'}`}
              >
                Exact Match
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="label-sm block px-0.5">Response</label>
            <textarea 
              className="w-full min-h-[100px] p-3 bg-background border border-border rounded-input text-[14px] placeholder:text-text-light focus:outline-none focus:border-accent transition-default"
              placeholder="What should the bot say?"
              value={newKeyword.response}
              onChange={(e) => setNewKeyword(prev => ({ ...prev, response: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default KeywordsPage;
