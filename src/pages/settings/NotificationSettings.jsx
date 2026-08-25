import { useState, useEffect } from 'react';
import { Bell, Save } from 'lucide-react';
import { Card, Button } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { updateUser } from '../../services/userService';

export default function NotificationSettings() {
  const { userProfile } = useAuth();
  const toast = useToast();
  
  const [preferences, setPreferences] = useState({
    mabolaLowStock: false,
    jaffnaLowStock: false,
    transfers: false,
    system: false
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile?.preferences) {
      setPreferences({
        mabolaLowStock: userProfile.preferences.mabolaLowStock ?? false,
        jaffnaLowStock: userProfile.preferences.jaffnaLowStock ?? false,
        transfers: userProfile.preferences.transfers ?? false,
        system: userProfile.preferences.system ?? false,
      });
    }
  }, [userProfile]);

  const handleToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateUser(userProfile.id, { preferences }, userProfile);
      toast.success('Notification preferences updated.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary-600" />
          Notification Settings
        </h1>
        <p className="text-sm text-surface-500 mt-1">
          Manage which alerts and push notifications you want to receive.
        </p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-bold text-surface-900 mb-4">Stock Alerts</h3>
        <div className="space-y-4">
          
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center pt-1">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                checked={preferences.mabolaLowStock}
                onChange={() => handleToggle('mabolaLowStock')}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-900 group-hover:text-primary-600 transition-colors">
                Mabola Low Stock & Out of Stock
              </p>
              <p className="text-xs text-surface-500">Receive alerts when items at the Mabola branch fall below their reorder level.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center pt-1">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                checked={preferences.jaffnaLowStock}
                onChange={() => handleToggle('jaffnaLowStock')}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-900 group-hover:text-primary-600 transition-colors">
                Jaffna Low Stock & Out of Stock
              </p>
              <p className="text-xs text-surface-500">Receive alerts when items at the Jaffna branch fall below their reorder level.</p>
            </div>
          </label>

        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold text-surface-900 mb-4">Operations</h3>
        <div className="space-y-4">
          
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center pt-1">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                checked={preferences.transfers}
                onChange={() => handleToggle('transfers')}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-900 group-hover:text-primary-600 transition-colors">
                Stock Transfers
              </p>
              <p className="text-xs text-surface-500">Get notified when stock transfers are created or their status changes.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center pt-1">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                checked={preferences.system}
                onChange={() => handleToggle('system')}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-900 group-hover:text-primary-600 transition-colors">
                System Notifications
              </p>
              <p className="text-xs text-surface-500">Receive important updates regarding system changes.</p>
            </div>
          </label>

        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button 
          icon={<Save className="w-4 h-4" />} 
          onClick={handleSave} 
          isLoading={saving}
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
