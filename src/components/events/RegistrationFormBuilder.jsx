import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GripVertical, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const FieldEditModal = ({ field, isOpen, onSave, onCancel }) => {
  const [formData, setFormData] = useState(field || {
    field_key: '',
    label: '',
    field_type: 'text',
    required: false,
    placeholder: '',
    options: [],
    order: 0
  });

  React.useEffect(() => {
    if (field) {
      setFormData(field);
    } else {
      setFormData({
        field_key: '',
        label: '',
        field_type: 'text',
        required: false,
        placeholder: '',
        options: [],
        order: 0
      });
    }
  }, [field, isOpen]);

  const handleSave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!formData.field_key) {
      formData.field_key = `field_${Date.now()}`;
    }
    onSave(formData);
  };

  const addOption = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData({
      ...formData,
      options: [...(formData.options || []), '']
    });
  };

  const updateOption = (index, value) => {
    const newOptions = [...(formData.options || [])];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const removeOption = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{field ? 'Edit Field' : 'Add New Field'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="label">Field Label</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="Enter field label"
              required
            />
          </div>

          <div>
            <Label htmlFor="field_key">Field Key (Internal ID)</Label>
            <Input
              id="field_key"
              value={formData.field_key}
              onChange={(e) => setFormData({ ...formData, field_key: e.target.value })}
              placeholder="e.g., contact_name, phone_number"
            />
          </div>

          <div>
            <Label htmlFor="field_type">Field Type</Label>
            <Select 
              value={formData.field_type} 
              onValueChange={(value) => setFormData({ ...formData, field_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Input</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone Number</SelectItem>
                <SelectItem value="textarea">Text Area</SelectItem>
                <SelectItem value="select">Select Dropdown</SelectItem>
                <SelectItem value="country">Country Selector</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="placeholder">Placeholder Text</Label>
            <Input
              id="placeholder"
              value={formData.placeholder}
              onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
              placeholder="Enter placeholder text"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="required"
              checked={formData.required}
              onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
            />
            <Label htmlFor="required">Required Field</Label>
          </div>

          {formData.field_type === 'select' && (
            <div>
              <Label>Options</Label>
              <div className="space-y-2">
                {(formData.options || []).map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={(e) => removeOption(index, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addOption}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Save Field
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const RegistrationFormBuilder = ({ fields = [], onChange }) => {
  const [editingField, setEditingField] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleAddField = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingField(null);
    setShowModal(true);
  };

  const handleEditField = (field, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingField(field);
    setShowModal(true);
  };

  const handleDeleteField = (fieldToDelete, e) => {
    e.preventDefault();
    e.stopPropagation();
    const updatedFields = fields.filter(f => f.field_key !== fieldToDelete.field_key);
    onChange(updatedFields);
  };

  const handleSaveField = (fieldData) => {
    let updatedFields;
    if (editingField) {
      // Editing existing field
      updatedFields = fields.map(f => 
        f.field_key === editingField.field_key ? fieldData : f
      );
    } else {
      // Adding new field
      updatedFields = [...fields, { ...fieldData, order: fields.length }];
    }
    onChange(updatedFields);
    setShowModal(false);
    setEditingField(null);
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setEditingField(null);
  };

  const moveField = (fieldIndex, direction) => {
    const updatedFields = [...fields];
    const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    
    if (newIndex >= 0 && newIndex < updatedFields.length) {
      [updatedFields[fieldIndex], updatedFields[newIndex]] = [updatedFields[newIndex], updatedFields[fieldIndex]];
      onChange(updatedFields);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium">Registration Form Fields</h4>
        <Button type="button" variant="outline" onClick={handleAddField}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Field
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <Card key={field.field_key} className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{field.label}</div>
                    <div className="text-sm text-gray-500">
                      {field.field_type} {field.required && '(Required)'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={(e) => handleEditField(field, e)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={(e) => handleDeleteField(field, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {fields.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No registration fields configured yet.</p>
            <p className="text-sm">Click "Add Field" to create custom registration form fields.</p>
          </div>
        )}
      </div>

      <FieldEditModal
        field={editingField}
        isOpen={showModal}
        onSave={handleSaveField}
        onCancel={handleModalCancel}
      />
    </div>
  );
};

export default RegistrationFormBuilder;