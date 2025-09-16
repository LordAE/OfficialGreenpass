import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Copy, Check, ExternalLink, Share } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function InviteUserModal({ isOpen, onOpenChange }) {
  const [inviteData, setInviteData] = useState({
    role: 'user',
    message: ''
  });
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const userRoles = [
    { value: 'user', label: 'Student', description: 'Can explore schools and apply for programs' },
    { value: 'agent', label: 'Education Agent', description: 'Can manage students and earn commissions' },
    { value: 'tutor', label: 'Tutor', description: 'Can offer tutoring services' },
    { value: 'vendor', label: 'Service Vendor', description: 'Can provide marketplace services' },
    { value: 'school', label: 'School Representative', description: 'Can manage school profile and programs' }
  ];

  const generateInviteLink = () => {
    const baseUrl = window.location.origin;
    const welcomePage = createPageUrl('Welcome');
    const params = new URLSearchParams();
    
    if (inviteData.role && inviteData.role !== 'user') {
      params.append('role', inviteData.role);
    }
    
    const fullLink = `${baseUrl}${welcomePage}${params.toString() ? '?' + params.toString() : ''}`;
    setInviteLink(fullLink);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateInviteMessage = () => {
    const selectedRole = userRoles.find(r => r.value === inviteData.role);
    return `🌟 You're invited to join GreenPass!

Hi there! I'd like to invite you to join GreenPass as a ${selectedRole?.label}.

${selectedRole?.description}

Click here to get started: ${inviteLink}

GreenPass is a comprehensive platform for studying abroad - connecting students, schools, agents, and service providers all in one place.

Looking forward to having you on board!`;
  };

  const shareViaEmail = () => {
    const subject = `You're invited to join GreenPass!`;
    const body = encodeURIComponent(generateInviteMessage());
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const resetForm = () => {
    setInviteData({ role: 'user', message: '' });
    setInviteLink('');
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Generate Invitation Link
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="role">Suggested Role (Optional)</Label>
            <Select value={inviteData.role} onValueChange={(value) => setInviteData(prev => ({...prev, role: value}))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {userRoles.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    <div>
                      <div className="font-medium">{role.label}</div>
                      <div className="text-xs text-gray-500">{role.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={generateInviteLink} className="flex-1">
              Generate Invite Link
            </Button>
          </div>

          {inviteLink && (
            <>
              <div>
                <Label htmlFor="invite-link">Invitation Link</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="invite-link"
                    value={inviteLink}
                    readOnly
                    className="bg-gray-50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    className="flex-shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                {copied && <p className="text-sm text-green-600 mt-1">Link copied to clipboard!</p>}
              </div>

              <div>
                <Label htmlFor="invite-message">Ready-to-Send Message</Label>
                <Textarea
                  id="invite-message"
                  value={generateInviteMessage()}
                  readOnly
                  className="bg-gray-50 h-32"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={shareViaEmail}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Share via Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const text = generateInviteMessage();
                    if (navigator.share) {
                      navigator.share({
                        title: 'GreenPass Invitation',
                        text: text,
                        url: inviteLink
                      });
                    } else {
                      copyToClipboard();
                    }
                  }}
                  className="flex-1"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}