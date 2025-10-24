import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GripVertical, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/* =========================
   Required fields & helpers
========================= */
const REQUIRED_FIELDS = [
  {
    field_key: 'contact_name',
    label: 'Full Name',
    field_type: 'text',
    required: true,
    placeholder: 'John Appleseed',
    order: 0,
  },
  {
    field_key: 'contact_email',
    label: 'Email',
    field_type: 'email',
    required: true,
    placeholder: 'name@example.com',
    order: 1,
  },
];
const LOCKED_KEYS = new Set(REQUIRED_FIELDS.map(f => f.field_key));

const normalizeField = (f) => {
  const nf = {
    field_key: f.field_key,
    label: f.label ?? '',
    field_type: f.field_type ?? 'text',
    required: !!f.required,
    order: typeof f.order === 'number' ? f.order : 0,
  };
  if (f.placeholder) nf.placeholder = f.placeholder;
  if (Array.isArray(f.options) && f.options.length) nf.options = f.options.map(String);
  return nf;
};

const slugify = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

const uniqueKey = (base, existing) => {
  let k = slugify(base || 'field');
  if (!existing.has(k)) return k;
  let i = 2;
  while (existing.has(`${k}_${i}`)) i++;
  return `${k}_${i}`;
};

const ensureRequired = (fields = []) => {
  const keys = new Set(fields.map(f => f.field_key));
  const needed = REQUIRED_FIELDS.filter(r => !keys.has(r.field_key)).map(normalizeField);

  // If the required fields already exist, ensure they remain required, correct type, and ordered first.
  const merged = fields.map(f => {
    if (!LOCKED_KEYS.has(f.field_key)) return f;
    const lockedDef = REQUIRED_FIELDS.find(r => r.field_key === f.field_key);
    return normalizeField({
      ...f,
      required: true,
      field_type: lockedDef?.field_type || f.field_type,
      order: lockedDef?.order ?? 0,
    });
  });

  // Prepend missing required fields so they appear first
  return [...needed, ...merged];
};

/* =========================
   Field Edit Modal
========================= */
const FieldEditModal = ({ field, isOpen, onSave, onCancel, existingKeys }) => {
  const [formData, setFormData] = useState({
    field_key: '',
    label: '',
    field_type: 'text',
    required: false,
    placeholder: '',
    options: [],
    order: 0,
  });

  const isLocked = LOCKED_KEYS.has(field?.field_key);

  useEffect(() => {
    if (field) {
      // For locked system fields, force required + correct type/order
      const forced = isLocked
        ? {
            ...field,
            required: true,
            field_type: REQUIRED_FIELDS.find(r => r.field_key === field.field_key)?.field_type || field.field_type,
            order: REQUIRED_FIELDS.find(r => r.field_key === field.field_key)?.order ?? 0,
          }
        : field;
      setFormData(normalizeField(forced));
    } else {
      setFormData({
        field_key: '',
        label: '',
        field_type: 'text',
        required: false,
        placeholder: '',
        options: [],
        order: 0,
      });
    }
  }, [field, isOpen, isLocked]);

  const handleSave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    let key = formData.field_key;
    if (isLocked) {
      key = field.field_key; // preserve locked key
    } else {
      // generate a safe unique key if empty/duplicate
      const base = key || formData.label || 'field';
      key = slugify(base) || 'field';
      const others = new Set(
        [...existingKeys].filter(k => k !== field?.field_key) // allow replacing same key during edit
      );
      if (others.has(key)) key = uniqueKey(key, others);
    }

    const normalized = normalizeField({
      ...formData,
      field_key: key,
      // Clean options for select type
      options:
        formData.field_type === 'select'
          ? (formData.options || []).map(o => String(o).trim()).filter(Boolean)
          : undefined,
      required: isLocked ? true : !!formData.required,
      field_type: isLocked
        ? REQUIRED_FIELDS.find(r => r.field_key === key)?.field_type || formData.field_type
        : formData.field_type,
      order: isLocked
        ? (REQUIRED_FIELDS.find(r => r.field_key === key)?.order ?? 0)
        : (typeof formData.order === 'number' ? formData.order : 0),
    });

    onSave(normalized);
  };

  const addOption = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData({
      ...formData,
      options: [...(formData.options || []), ''],
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
    const newOptions = (formData.options || []).filter((_, i) => i !== index);
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
            <Label htmlFor="field_key">
              Field Key {isLocked ? '(Locked by system)' : '(Internal ID)'}
            </Label>
            <Input
              id="field_key"
              value={formData.field_key}
              onChange={(e) => setFormData({ ...formData, field_key: e.target.value })}
              placeholder="e.g., contact_name, phone_number"
              disabled={isLocked}
            />
          </div>

          <div>
            <Label htmlFor="field_type">Field Type</Label>
            <Select
              value={formData.field_type}
              onValueChange={(value) => setFormData({ ...formData, field_type: value })}
              disabled={isLocked}
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
              checked={!!formData.required || isLocked}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, required: !!checked })
              }
              disabled={isLocked}
            />
            <Label htmlFor="required">
              {isLocked ? 'Required Field (locked)' : 'Required Field'}
            </Label>
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
            <Button type="submit">Save Field</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* =========================
   Registration Form Builder
========================= */
const RegistrationFormBuilder = ({ fields = [], onChange }) => {
  const normalizedFields = useMemo(
    () => (Array.isArray(fields) ? fields.map(normalizeField) : []),
    [fields]
  );

  // Auto-insert/lock required fields when fields change
  useEffect(() => {
    const withRequired = ensureRequired(normalizedFields);
    // shallow compare by keys/length to avoid loops
    const keysA = new Set(normalizedFields.map(f => f.field_key));
    const keysB = new Set(withRequired.map(f => f.field_key));
    const same =
      normalizedFields.length === withRequired.length &&
      [...keysA].every(k => keysB.has(k));

    if (!same) {
      onChange?.(withRequired);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedFields.length]);

  const existingKeys = useMemo(
    () => new Set(normalizedFields.map(f => f.field_key)),
    [normalizedFields]
  );

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
    if (LOCKED_KEYS.has(fieldToDelete.field_key)) return; // protect required fields
    const updatedFields = normalizedFields
      .filter(f => f.field_key !== fieldToDelete.field_key)
      .map(normalizeField);
    onChange(updatedFields);
  };

  const handleSaveField = (fieldData) => {
    const replacingKey = editingField?.field_key;
    let updatedFields;

    if (editingField) {
      // Editing existing field
      updatedFields = normalizedFields.map(f =>
        f.field_key === replacingKey ? fieldData : f
      );
    } else {
      // Adding new field; assign order to the end
      const maxOrder =
        normalizedFields.length > 0
          ? Math.max(...normalizedFields.map(f => typeof f.order === 'number' ? f.order : 0))
          : 1;
      const order = typeof fieldData.order === 'number' ? fieldData.order : (maxOrder + 1);
      updatedFields = [...normalizedFields, { ...fieldData, order }];
    }

    // Ensure required fields remain intact even after edits
    onChange(ensureRequired(updatedFields.map(normalizeField)));
    setShowModal(false);
    setEditingField(null);
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setEditingField(null);
  };

  // Optional: sort by order when rendering for consistent UI
  const sortedFields = useMemo(
    () => [...normalizedFields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [normalizedFields]
  );

  // kept for potential future up/down controls
  const moveField = (fieldIndex, direction) => {
    const updated = [...sortedFields];
    const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    if (newIndex >= 0 && newIndex < updated.length) {
      [updated[fieldIndex], updated[newIndex]] = [updated[newIndex], updated[fieldIndex]];
      // reassign orders to reflect new positions
      const reindexed = updated.map((f, idx) => ({ ...f, order: idx }));
      onChange(reindexed);
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
        {sortedFields.map((field, idx) => {
          const isLocked = LOCKED_KEYS.has(field.field_key);
          return (
            <Card key={field.field_key} className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="font-medium">
                        {field.label}{' '}
                        {isLocked && (
                          <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-gray-200">
                            Locked
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {field.field_type} {field.required && '(Required)'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Optional move buttons (hidden in UI but function is ready) */}
                    {/* <Button type="button" variant="outline" size="icon" onClick={() => moveField(idx, 'up')} disabled={idx===0}><ChevronUp className="h-4 w-4" /></Button>
                    <Button type="button" variant="outline" size="icon" onClick={() => moveField(idx, 'down')} disabled={idx===sortedFields.length-1}><ChevronDown className="h-4 w-4" /></Button> */}
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
                      disabled={isLocked}
                      title={isLocked ? 'This field is required by the system' : 'Delete'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {sortedFields.length === 0 && (
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
        existingKeys={existingKeys}
      />
    </div>
  );
};

export default RegistrationFormBuilder;
