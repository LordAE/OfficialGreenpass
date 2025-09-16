import React, { useState } from 'react';
import { Agent } from '@/api/entities';
import { SendEmail } from '@/api/integrations';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Pause, Play, Mail, Save, Phone } from "lucide-react";

export default function AgentCommissionManager({ agent, user, onUpdate }) {
  const [commissionRate, setCommissionRate] = useState(agent.commission_rate * 100 || 10);
  const [payoutStatus, setPayoutStatus] = useState(agent.payout_status || 'none');
  const [holdReason, setHoldReason] = useState(agent.payout_hold_reason || '');
  const [saving, setSaving] = useState(false);

  const handleSaveCommission = async () => {
    setSaving(true);
    try {
      await Agent.update(agent.id, {
        commission_rate: commissionRate / 100,
        payout_status: payoutStatus,
        payout_hold_reason: holdReason
      });
      onUpdate();
    } catch (error) {
      console.error("Error updating commission:", error);
    }
    setSaving(false);
  };

  const handleApprovePayout = async () => {
    if (agent.pending_payout <= 0) return;
    
    try {
      await Agent.update(agent.id, {
        payout_status: 'approved',
        payout_hold_reason: ''
      });
      onUpdate();
    } catch (error) {
      console.error("Error approving payout:", error);
    }
  };

  const handleContactAgent = async () => {
    try {
      await SendEmail({
        to: user.email,
        subject: `GreenPass Admin: Commission Update for ${agent.company_name}`,
        body: `Hello ${agent.contact_person?.name || user.full_name},\n\nWe're reaching out regarding your commission status with GreenPass.\n\nIf you have any questions, please reply to this email.\n\nBest regards,\nGreenPass Admin Team`
      });
      alert('Email sent successfully!');
    } catch (error) {
      console.error("Error sending email:", error);
      alert('Failed to send email');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      none: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      paid: "bg-blue-100 text-blue-800",
      hold: "bg-red-100 text-red-800"
    };
    
    return (
      <Badge className={statusColors[status] || statusColors.none}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Commission & Payout Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Commission Overview */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Commission Rate</p>
            <p className="text-2xl font-bold text-blue-800">{(agent.commission_rate * 100 || 10).toFixed(1)}%</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-600 font-medium">Pending Payout</p>
            <p className="text-2xl font-bold text-yellow-800">${agent.pending_payout || 0}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Total Earned</p>
            <p className="text-2xl font-bold text-green-800">${agent.total_earned || 0}</p>
          </div>
        </div>

        {/* Commission Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Commission Settings</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Commission Rate (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
                placeholder="10.0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Payout Status</label>
              <Select value={payoutStatus} onValueChange={setPayoutStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Pending</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="hold">On Hold</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {payoutStatus === 'hold' && (
            <div>
              <label className="text-sm font-medium text-gray-700">Hold Reason</label>
              <Textarea
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="Explain why the payout is on hold..."
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleSaveCommission} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            
            {agent.pending_payout > 0 && payoutStatus !== 'approved' && (
              <Button onClick={handleApprovePayout} variant="outline">
                <Play className="w-4 h-4 mr-2" />
                Approve Payout (${agent.pending_payout})
              </Button>
            )}
          </div>
        </div>

        {/* Communication */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Communication</h3>
          <div className="flex gap-3">
            <Button onClick={handleContactAgent} variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
            {agent.contact_person?.phone && (
              <Button variant="outline">
                <Phone className="w-4 h-4 mr-2" />
                {agent.contact_person.phone}
              </Button>
            )}
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Current Payout Status:</span>
            {getStatusBadge(agent.payout_status || 'none')}
          </div>
          {agent.last_payout_date && (
            <p className="text-sm text-gray-600 mt-2">
              Last payout: {agent.last_payout_date}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}