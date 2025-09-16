
import React, { useState, useEffect } from 'react';
import { Service } from '@/api/entities';
import { User } from '@/api/entities';
import { Vendor } from '@/api/entities'; // Added Vendor import
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert"; // Added Alert import

const StatusBadge = ({ status }) => {
  const colors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-yellow-100 text-yellow-800",
    archived: "bg-gray-100 text-gray-800"
  };
  return <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
};

const ServiceForm = ({ service, onSave, onCancel }) => {
  const [formData, setFormData] = useState(service || {
    name: '',
    description: '',
    category: '',
    price_usd: 0,
    status: 'active'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const categories = ["Transport", "SIM Card", "Banking", "Accommodation", "Delivery", "Tours"];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Service Name</Label>
        <Input 
          id="name" 
          name="name" 
          value={formData.name} 
          onChange={handleChange} 
          required 
          placeholder="e.g., Airport Pickup Service"
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          name="description" 
          value={formData.description} 
          onChange={handleChange} 
          required
          placeholder="Detailed description of your service..."
        />
      </div>
      
      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="price_usd">Price (USD)</Label>
        <Input 
          id="price_usd" 
          name="price_usd" 
          type="number" 
          value={formData.price_usd} 
          onChange={handleChange} 
          required 
          min="0"
          step="0.01"
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Service</Button>
      </div>
    </form>
  );
};

export default function MyServices() { 
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [error, setError] = useState(null); // Added error state
  const [successMessage, setSuccessMessage] = useState(null); // Added successMessage state

  const loadData = async () => {
    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      const currentUser = await User.me();
      const [vendorProfile] = await Vendor.filter({ user_id: currentUser.id });
      if (vendorProfile) {
        const serviceData = await Service.filter({ vendor_id: vendorProfile.id }, '-created_date');
        setServices(serviceData);
      } else {
          // Handle case where vendor profile doesn't exist yet
          setServices([]);
          // Optionally, set an error or message if vendor profile is mandatory
          setError("Your vendor profile is not complete. Please complete it to list services.");
      }
    } catch (error) {
      console.error("Error loading services:", error);
      setError("Failed to load your services. Please refresh the page.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (serviceData) => {
    setError(null); // Clear previous errors
    setSuccessMessage(null); // Clear previous success messages
    try {
      const currentUser = await User.me();
      const [vendorProfile] = await Vendor.filter({ user_id: currentUser.id });

      if (!vendorProfile) {
        setError("Could not find your vendor profile. Please complete your profile first.");
        return;
      }
      
      const dataWithVendor = { ...serviceData, vendor_id: vendorProfile.id };
      
      if (selectedService) {
        await Service.update(selectedService.id, dataWithVendor);
        setSuccessMessage("Service updated successfully!");
      } else {
        await Service.create(dataWithVendor);
        setSuccessMessage("Service added successfully!");
      }
      
      setIsFormOpen(false);
      setSelectedService(null);
      await loadData(); // Reload services
      
      setTimeout(() => setSuccessMessage(null), 3000); // Clear success message after 3 seconds

    } catch (error) {
      console.error("Error saving service:", error);
      setError("An error occurred while saving the service.");
    }
  };

  const handleDelete = async (serviceId) => {
    if (window.confirm("Are you sure you want to delete this service?")) {
      setError(null); // Clear previous errors
      setSuccessMessage(null); // Clear previous success messages
      try {
        await Service.delete(serviceId);
        setSuccessMessage("Service deleted successfully!");
        await loadData(); // Reload services
        setTimeout(() => setSuccessMessage(null), 3000); // Clear success message after 3 seconds
      } catch (error) {
        console.error("Error deleting service:", error);
        setError("An error occurred while deleting the service.");
      }
    }
  };

  const openForm = (service = null) => {
    setSelectedService(service);
    setIsFormOpen(true);
    setError(null); // Clear error when opening form
    setSuccessMessage(null); // Clear success when opening form
  };

  const stats = {
    totalServices: services.length,
    activeServices: services.filter(s => s.status === 'active').length,
    averagePrice: services.length > 0 ? services.reduce((sum, s) => sum + s.price_usd, 0) / services.length : 0
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Store className="w-8 h-8 text-orange-700" />
            <h1 className="text-4xl font-bold text-gray-800">
              My Services
            </h1>
          </div>
          
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{selectedService ? "Edit Service" : "Add New Service"}</DialogTitle>
              </DialogHeader>
              <ServiceForm 
                service={selectedService}
                onSave={handleSave} 
                onCancel={() => { setIsFormOpen(false); setSelectedService(null); setError(null); setSuccessMessage(null); }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert className="mb-4 border-green-500 text-green-700">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">{stats.totalServices}</div>
                  <p className="text-gray-600">Total Services</p>
                </div>
                <Store className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.activeServices}</div>
                  <p className="text-gray-600">Active Services</p>
                </div>
                <Store className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">${stats.averagePrice.toFixed(0)}</div>
                  <p className="text-gray-600">Average Price</p>
                </div>
                <Store className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Service Listings</CardTitle>
          </CardHeader>
          <CardContent>
            {services.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map(service => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-sm text-gray-500">{service.description?.substring(0, 60)}...</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{service.category}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">${service.price_usd}</TableCell>
                      <TableCell><StatusBadge status={service.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openForm(service)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(service.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Services Listed</h3>
                <p className="text-gray-600">Create your first service listing to start receiving orders from students.</p>
                <Button className="mt-4" onClick={() => openForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Service
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
