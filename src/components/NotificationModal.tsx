import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Send,
  Check,
  AlertCircle,
  X,
  Sparkles,
  ShieldCheck,
  Globe,
  Sliders
} from 'lucide-react';
import { NotificationSettings, UserProfile } from '../types';
import { saveUserProfile } from '../lib/firebase';

interface NotificationModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  user,
  isOpen,
  onClose
}) => {
  const [emailEnabled, setEmailEnabled] = useState(user.notifications?.emailEnabled || false);
  const [frequency, setFrequency] = useState<NotificationSettings['frequency']>(
    user.notifications?.frequency || 'weekly'
  );
  const [deliveryEmail, setDeliveryEmail] = useState(
    user.notifications?.deliveryEmail || user.email || ''
  );
  const [notifyOnInsight, setNotifyOnInsight] = useState(
    user.notifications?.notifyOnInsight ?? true
  );
  const [webhookUrl, setWebhookUrl] = useState(user.notifications?.webhookUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestStatus, setWebhookTestStatus] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user.notifications) {
      setEmailEnabled(user.notifications.emailEnabled);
      setFrequency(user.notifications.frequency);
      setDeliveryEmail(user.notifications.deliveryEmail || user.email || '');
      setNotifyOnInsight(user.notifications.notifyOnInsight);
      setWebhookUrl(user.notifications.webhookUrl || '');
    }

    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, isOpen, onClose]);

  if (!isOpen) return null;

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) return;
    setIsTestingWebhook(true);
    setWebhookTestStatus(null);
    try {
      const res = await fetch('/api/notifications/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim(),
          event: 'test_ping',
          title: 'Test Notification',
          summary: 'Webhook endpoint verified successfully from Gemini AI Journal.',
          timestamp: new Date().toISOString()
        })
      });
      const data = await res.json();
      if (data.delivered) {
        setWebhookTestStatus('Webhook delivered successfully!');
      } else if (data.skipped) {
        setWebhookTestStatus('Webhook skipped (empty URL).');
      } else {
        setWebhookTestStatus('Webhook dispatched.');
      }
    } catch (err: any) {
      setWebhookTestStatus('Webhook test encountered network issue.');
    } finally {
      setIsTestingWebhook(false);
      setTimeout(() => setWebhookTestStatus(null), 3500);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);

    const updatedProfile: UserProfile = {
      ...user,
      notifications: {
        emailEnabled,
        frequency,
        deliveryEmail: deliveryEmail.trim(),
        notifyOnInsight,
        webhookUrl: webhookUrl.trim() || undefined
      },
      updatedAt: new Date().toISOString()
    };

    try {
      await saveUserProfile(user.uid, updatedProfile);
      setSuccessMsg('Notification preferences safely stored.');

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Save notification settings error:', err);
    } finally {
      setIsSaving(false);
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
        className="bg-[#FBF9F6] border border-[#E0DBCF] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E0DBCF] flex items-center justify-between bg-white/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8A9A8A]/15 border border-[#8A9A8A]/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#8A9A8A]" />
            </div>
            <div>
              <h2 className="text-base font-serif font-semibold text-[#3A352F]">Smart Notifications & Digest</h2>
              <p className="text-xs text-[#7A7369]">Configure private reflection reminders and safe summary digests</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7A7369] hover:text-[#3A352F] hover:bg-[#EAE4D9] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Leakage Guarantee:</strong> Raw journal contents are never transmitted. Only high-level prompts like <em>"Your weekly reflection digest is ready"</em> are delivered.
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E0DBCF]">
              <div>
                <p className="text-xs font-medium text-[#3A352F]">Email Reflection Digest</p>
                <p className="text-[11px] text-[#7A7369]">Receive periodic gentle reflection prompts</p>
              </div>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-[#8A9A8A] focus:ring-[#8A9A8A] cursor-pointer"
              />
            </div>

            {emailEnabled && (
              <div className="space-y-3 pl-2 pt-1 border-l-2 border-[#8A9A8A]/40">
                <div>
                  <label className="block text-xs font-medium text-[#7A7369] mb-1">Delivery Email</label>
                  <input
                    type="email"
                    value={deliveryEmail}
                    onChange={(e) => setDeliveryEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E0DBCF] bg-white text-[#3A352F] focus:outline-none focus:ring-1 focus:ring-[#8A9A8A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#7A7369] mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e: any) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E0DBCF] bg-white text-[#3A352F] focus:outline-none focus:ring-1 focus:ring-[#8A9A8A]"
                  >
                    <option value="daily">Daily Gentle Reflection Prompt</option>
                    <option value="weekly">Weekly Breakthrough Digest</option>
                    <option value="off">Muted (Off)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E0DBCF]">
              <div>
                <p className="text-xs font-medium text-[#3A352F]">Insight Nudge Alerts</p>
                <p className="text-[11px] text-[#7A7369]">Alert when recurring theme patterns are discovered</p>
              </div>
              <input
                type="checkbox"
                checked={notifyOnInsight}
                onChange={(e) => setNotifyOnInsight(e.target.checked)}
                className="w-4 h-4 rounded text-[#8A9A8A] focus:ring-[#8A9A8A] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[#7A7369]">Optional Webhook URL (Slack/Discord alert)</label>
                {webhookUrl.trim() && (
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={isTestingWebhook}
                    className="text-[10px] font-medium text-[#8A9A8A] hover:text-[#3A352F] cursor-pointer hover:underline"
                  >
                    {isTestingWebhook ? 'Testing...' : 'Test Webhook'}
                  </button>
                )}
              </div>
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E0DBCF] bg-white text-[#3A352F] focus:outline-none focus:ring-1 focus:ring-[#8A9A8A]"
              />
              <span className="text-[10px] text-[#7A7369] mt-0.5 block">Only sends generic ping event without sensitive context.</span>
              
              {webhookTestStatus && (
                <div className="mt-1.5 p-2 rounded-lg bg-white border border-[#E0DBCF] text-[11px] text-[#3A352F]">
                  {webhookTestStatus}
                </div>
              )}
            </div>
          </div>

          {successMsg && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E0DBCF]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#E0DBCF] text-[#7A7369] text-xs font-medium rounded-xl hover:bg-[#EAE4D9] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#3A352F] hover:bg-[#25221E] disabled:opacity-50 text-white text-xs font-medium rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
