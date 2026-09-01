import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Upload,
  Camera,
  Check,
  Sparkles,
  Shield,
  FileDown,
  Clock,
  BookOpen,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { UserProfile, JournalEntry } from '../types';
import { saveUserProfile } from '../lib/firebase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  entries: JournalEntry[];
  onProfileUpdated: (updatedProfile: UserProfile) => void;
  onOpenExport: () => void;
}

const PRESET_AVATARS = [
  { id: 'zen-sage', label: 'Sage Branch', url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=150&auto=format&fit=crop&q=80' },
  { id: 'zen-mountain', label: 'Misty Peak', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=150&auto=format&fit=crop&q=80' },
  { id: 'zen-lotus', label: 'Water Lily', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=150&auto=format&fit=crop&q=80' },
  { id: 'zen-forest', label: 'Eucalyptus', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=150&auto=format&fit=crop&q=80' },
  { id: 'zen-stone', label: 'Balance Rock', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=150&auto=format&fit=crop&q=80' },
  { id: 'zen-ocean', label: 'Calm Wave', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&auto=format&fit=crop&q=80' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  entries,
  onProfileUpdated,
  onOpenExport,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [bio, setBio] = useState(user.bio || 'Reflecting mindfully with Gemini AI.');
  const [photoURL, setPhotoURL] = useState<string | null>(user.photoURL);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate statistics
  const totalTurns = entries.reduce((acc, entry) => acc + (entry.turns ? entry.turns.length : 0), 0);
  const totalWords = entries.reduce((acc, entry) => {
    return acc + (entry.turns ? entry.turns.reduce((wAcc, turn) => wAcc + turn.content.split(/\s+/).length, 0) : 0);
  }, 0);

  // Compress & resize image to light square data URL (< 60kb)
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image file size exceeds 5MB limit.');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 180;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw cropped center square
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoURL(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('Display name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const updated = await saveUserProfile(user.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoURL: photoURL || null,
      });

      onProfileUpdated(updated);
      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Error saving user profile:', err);
      setErrorMsg(err?.message || 'Failed to persist profile to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3A352F]/60 backdrop-blur-md font-sans animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="glass-card-3d rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#3A352F] animate-in zoom-in-95 duration-200 border border-white/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Glassmorphism */}
        <div className="px-6 py-4 border-b border-[#E0DBCF]/80 glass-panel-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#3A352F] text-[#FBF9F6] flex items-center justify-center shadow-md border border-white/20">
              <UserIcon className="w-4 h-4 text-[#8A9A8A]" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-base text-[#3A352F] leading-none">
                User Profile &amp; Settings
              </h3>
              <p className="text-[11px] text-[#7A7369] mt-1">
                Stored securely in your dedicated Firestore collection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7A7369] hover:text-[#3A352F] glass-pill hover:bg-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50/90 backdrop-blur-md border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50/90 backdrop-blur-md border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 shadow-xs">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Profile updated and synchronized successfully!</span>
            </div>
          )}

          {/* Profile Picture Upload & Presets */}
          <div>
            <label className="block text-xs font-semibold text-[#3A352F] mb-2 font-serif text-sm">
              Profile Picture
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Current Avatar Preview */}
              <div className="relative group">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-3xl object-cover border-2 border-[#8A9A8A] shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-3xl glass-panel text-[#7A7369] flex items-center justify-center shadow-md">
                    <UserIcon className="w-8 h-8" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 p-2 bg-[#3A352F] text-[#FBF9F6] rounded-xl shadow-md hover:bg-[#2C2823] cursor-pointer btn-3d"
                  title="Upload image"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 w-full border-2 border-dashed rounded-2xl p-3.5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#8A9A8A] bg-[#8A9A8A]/15'
                    : 'border-[#E0DBCF] hover:border-[#8A9A8A]/60 glass-panel hover:bg-white/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-4 h-4 mx-auto text-[#7A7369] mb-1" />
                <p className="font-medium text-[#3A352F] text-[11px]">
                  Click or drag photo to upload
                </p>
                <p className="text-[10px] text-[#A69E94]">
                  PNG, JPG, WEBP (auto-compressed for Firestore)
                </p>
              </div>
            </div>

            {/* Curated Presets */}
            <div className="mt-3.5">
              <span className="text-[10px] font-medium text-[#7A7369] block mb-1.5">
                Or select a natural aesthetic avatar:
              </span>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPhotoURL(preset.url)}
                    className={`relative rounded-2xl overflow-hidden border-2 aspect-square transition-all cursor-pointer transform-gpu hover:-translate-y-0.5 ${
                      photoURL === preset.url
                        ? 'border-[#8A9A8A] scale-105 shadow-md ring-2 ring-[#8A9A8A]/40'
                        : 'border-[#E0DBCF] hover:border-[#8A9A8A]/50 opacity-80 hover:opacity-100'
                    }`}
                    title={preset.label}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    {photoURL === preset.url && (
                      <div className="absolute inset-0 bg-[#8A9A8A]/40 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Display Name Input */}
          <div>
            <label htmlFor="profile-display-name" className="block text-xs font-semibold text-[#3A352F] mb-1.5 font-serif text-sm">
              Display Name
            </label>
            <input
              id="profile-display-name"
              type="text"
              maxLength={60}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Maya Lin"
              className="w-full px-3.5 py-2.5 glass-panel rounded-xl text-xs text-[#3A352F] placeholder-[#A69E94] focus:outline-none focus:ring-1 focus:ring-[#8A9A8A] shadow-2xs"
              required
            />
            <div className="flex justify-between text-[10px] text-[#A69E94] mt-1 px-1">
              <span>Used in journal conversations &amp; exports</span>
              <span>{displayName.length}/60</span>
            </div>
          </div>

          {/* Bio / Reflection Intent */}
          <div>
            <label htmlFor="profile-bio" className="block text-xs font-semibold text-[#3A352F] mb-1.5 font-serif text-sm">
              Personal Reflection Goal &amp; Intent
            </label>
            <textarea
              id="profile-bio"
              rows={2}
              maxLength={250}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are your goals or themes for journaling with Gemini?"
              className="w-full px-3.5 py-2.5 glass-panel rounded-xl text-xs text-[#3A352F] placeholder-[#A69E94] focus:outline-none focus:ring-1 focus:ring-[#8A9A8A] resize-none shadow-2xs"
            />
            <div className="flex justify-between text-[10px] text-[#A69E94] mt-0.5 px-1">
              <span>Guiding context for your reflections</span>
              <span>{bio.length}/250</span>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="p-4 glass-card-3d rounded-2xl">
            <h4 className="text-[11px] font-semibold text-[#3A352F] font-serif mb-2.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#8A9A8A]" />
              <span>Your Reflection Journal Activity</span>
            </h4>
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-2.5 glass-panel rounded-xl shadow-2xs">
                <span className="block text-lg font-serif font-bold text-[#3A352F]">{entries.length}</span>
                <span className="text-[10px] text-[#7A7369]">Total Entries</span>
              </div>
              <div className="p-2.5 glass-panel rounded-xl shadow-2xs">
                <span className="block text-lg font-serif font-bold text-[#3A352F]">{totalTurns}</span>
                <span className="text-[10px] text-[#7A7369]">AI Turns</span>
              </div>
              <div className="p-2.5 glass-panel rounded-xl shadow-2xs">
                <span className="block text-lg font-serif font-bold text-[#3A352F]">{totalWords}</span>
                <span className="text-[10px] text-[#7A7369]">Words Shared</span>
              </div>
            </div>
          </div>

          {/* Quick Export Trigger */}
          <div className="flex items-center justify-between p-3.5 glass-panel rounded-2xl shadow-xs">
            <div>
              <p className="font-semibold text-[#3A352F] text-[11px]">Vault Backup &amp; Export</p>
              <p className="text-[10px] text-[#7A7369]">Download your complete journal history in JSON or Plain Text</p>
            </div>
            <button
              type="button"
              id="profile-open-export-btn"
              onClick={() => {
                onClose();
                onOpenExport();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 glass-pill hover:bg-white text-[#3A352F] rounded-xl text-[11px] font-medium shadow-2xs transition-all cursor-pointer transform-gpu hover:-translate-y-0.5"
            >
              <FileDown className="w-3.5 h-3.5 text-[#8A9A8A]" />
              <span>Export All</span>
            </button>
          </div>

          {/* Account Security Info */}
          <div className="text-[10px] text-[#A69E94] flex items-center gap-1.5 justify-center">
            <Shield className="w-3.5 h-3.5 text-[#8A9A8A]" />
            <span>Authenticated with Firebase Google Sign-In &bull; Owner-bound Firestore Isolation</span>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#E0DBCF]/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#7A7369] hover:text-[#3A352F] glass-pill hover:bg-white rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-profile-btn"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#3A352F] hover:bg-[#2C2823] text-[#FBF9F6] rounded-xl text-xs font-medium btn-3d disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-[#8A9A8A]" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
