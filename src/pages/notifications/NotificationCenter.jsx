import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Card, Button, Spinner } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { listenToNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../services/notificationService';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD

  useEffect(() => {
    if (!userProfile) return;

    setLoading(true);
    const unsubscribe = listenToNotifications(userProfile.id, (data) => {
      setNotifications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const handleMarkAsRead = async (id) => {
    await markNotificationAsRead(id);
  };

  const filteredNotifications = filter === 'UNREAD' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  const getIcon = (type) => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return <AlertTriangle className="w-6 h-6 text-danger-500" />;
      case 'LOW_STOCK':
        return <AlertTriangle className="w-6 h-6 text-warning-500" />;
      default:
        return <Info className="w-6 h-6 text-info-500" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            icon={<ArrowLeft className="w-5 h-5" />} 
            onClick={() => navigate('/')}
            className="p-2"
          />
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Notification Center</h1>
            <p className="text-sm text-surface-500 mt-1">Manage your alerts and messages</p>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex bg-surface-100 p-1 rounded-lg">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'ALL' ? 'bg-white shadow text-surface-900' : 'text-surface-500 hover:text-surface-700'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'UNREAD' ? 'bg-white shadow text-surface-900' : 'text-surface-500 hover:text-surface-700'}`}
            >
              Unread
            </button>
          </div>
          
          {notifications.some(n => !n.read) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => markAllNotificationsAsRead(userProfile?.id)}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <Card className="min-h-[500px]">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-surface-400">
            <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium text-surface-500">You're all caught up!</p>
            <p className="text-sm mt-1">No {filter === 'UNREAD' ? 'unread ' : ''}notifications found.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {filteredNotifications.map(notif => (
              <div 
                key={notif.id} 
                className={`p-6 flex flex-col sm:flex-row gap-4 sm:items-start transition-colors hover:bg-surface-50 ${!notif.read ? 'bg-primary-50/20' : ''}`}
              >
                <div className="flex-shrink-0 mt-1">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className={`text-base ${!notif.read ? 'font-bold text-surface-900' : 'font-medium text-surface-700'}`}>
                        {notif.title}
                      </h3>
                      <p className={`mt-1 text-sm ${!notif.read ? 'text-surface-700' : 'text-surface-500'}`}>
                        {notif.body}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-medium text-surface-400">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                        {notif.branch && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-100 text-surface-600">
                            {notif.branch}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="text-xs font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-full transition-colors flex-shrink-0"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
