import React, { useState } from 'react';
import { Plus, Search, Trash2, Edit2, Loader2 } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Toggle from '../components/ui/Toggle';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { useServices } from '../hooks/useServices';

const ServicesPage = () => {
  const { user } = useUser();
  const { services, loading, addService, toggleService, removeService } = useServices(user?.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newService, setNewService] = useState({ name: '', description: '', price: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newService.name || !newService.description) return;
    setIsSaving(true);
    try {
      await addService(newService);
      setIsModalOpen(false);
      setNewService({ name: '', description: '', price: '' });
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
          <h1 className="text-24 font-semibold">Services</h1>
          <p className="text-[14px] text-text-secondary mt-1">
            These are shown to the AI so it can answer questions about your offerings
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          Add Service
        </Button>
      </div>

      {/* List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-text-light">
            <Loader2 className="animate-spin mr-2" size={20} />
            Loading services...
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 text-text-light border-2 border-dashed border-border rounded-card m-6">
            No services added yet. Add your first service to train the AI.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px] text-[13px]">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="px-6 py-3.5 label-sm">Service Name</th>
                  <th className="px-6 py-3.5 label-sm">Description</th>
                  <th className="px-6 py-3.5 label-sm">Price</th>
                  <th className="px-6 py-3.5 label-sm text-center">Status</th>
                  <th className="px-6 py-3.5 label-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {services.map(service => (
                  <tr key={service.id} className="hover:bg-surface transition-default">
                    <td className="px-6 py-3.5 font-semibold text-primary">
                      {service.name}
                    </td>
                    <td className="px-6 py-3.5 max-w-[400px]">
                      <p className="truncate text-text-secondary" title={service.description}>
                        {service.description}
                      </p>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-text-primary">
                      {service.price ? `From ${service.price}` : 'Price on request'}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <div className="inline-flex justify-center">
                        <Toggle 
                          checked={service.isActive} 
                          onChange={(val) => toggleService(service.id, val)}
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
                            if (confirm('Delete this service?')) removeService(service.id);
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
        title="Add Service"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={isSaving}>Save Service</Button>
          </>
        }
      >
        <div className="space-y-6">
          <Input 
            label="Service Name" 
            placeholder="e.g. Haircut & Styling"
            value={newService.name}
            onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
          />
          <Input 
            label="Price / Starting From" 
            placeholder="e.g. $25"
            value={newService.price}
            onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
          />
          
          <div className="space-y-2">
            <label className="label-sm block px-0.5">Description</label>
            <textarea 
              className="w-full min-h-[100px] p-3 bg-background border border-border rounded-input text-[14px] placeholder:text-text-light focus:outline-none focus:border-accent transition-default"
              placeholder="What does this service include?"
              value={newService.description}
              onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ServicesPage;
