import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listenToNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { requestNotificationPermission, onMessageListener } from '../../firebase/messaging';
import { saveUserFCMToken } from '../../services/notificationService';
import { useToast } from '../../contexts/ToastContext';

export default function NotificationBell() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!userProfile) return;

    // Ask for push permission and save token on load (if not already granted)
    const initPush = async () => {
      // In a real app, you might wait for a user action to request this.
      // But for internal operational apps, it's often done on login.
      if (Notification.permission === 'default') {
        const token = await requestNotificationPermission();
        if (token) {
          await saveUserFCMToken(userProfile.id, token);
        }
      }
    };
    initPush();

    // Listen to firestore notifications
    const unsubscribe = listenToNotifications(userProfile.id, (data) => {
      setNotifications(data);
    });

    // Listen to foreground FCM (show toast)
    const unsubscribeFCM = onMessageListener((payload) => {
      toast.info(
        <div>
          <p className="font-bold">{payload.notification?.title}</p>
          <p className="text-sm">{payload.notification?.body}</p>
        </div>
      );
    });

    return () => {
      unsubscribe();
      unsubscribeFCM();
    };
  }, [userProfile]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const recentNotifications = notifications.slice(0, 5); // Show only top 5 in dropdown

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }
    setIsOpen(false);
    
    // Navigate based on type
    if (notif.type === 'LOW_STOCK' || notif.type === 'OUT_OF_STOCK') {
      navigate('/stock-overview');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-surface-100 relative transition-colors"
      >
        <Bell className="w-6 h-6 text-surface-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-danger-500 border-2 border-white rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-surface-200 z-50 overflow-hidden">
          <div className="p-4 border-b border-surface-100 flex justify-between items-center bg-surface-50">
            <h3 className="font-bold text-surface-900">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllNotificationsAsRead(userProfile?.id)}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-surface-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-100">
                {recentNotifications.map(notif => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 cursor-pointer hover:bg-surface-50 transition-colors ${!notif.read ? 'bg-primary-50/30' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${!notif.read ? 'bg-primary-500' : 'bg-transparent'}`} />
                      <div>
                        <p className={`text-sm ${!notif.read ? 'font-bold text-surface-900' : 'font-medium text-surface-700'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-surface-500 mt-1 line-clamp-2">
                          {notif.body}
                        </p>
                        <p className="text-[10px] text-surface-400 mt-2 font-medium">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-surface-100 text-center bg-surface-50">
            <button 
              onClick={() => { setIsOpen(false); navigate('/notifications'); }}
              className="text-sm font-semibold text-primary-600 hover:text-primary-800"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
