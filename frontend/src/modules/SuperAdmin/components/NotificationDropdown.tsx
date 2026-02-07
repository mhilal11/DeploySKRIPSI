import {
  Mail,
  UserPlus,
  UserMinus,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/shared/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { api, apiUrl, isAxiosError } from '@/shared/lib/api';
import { Link } from '@/shared/lib/inertia';
import { cn } from '@/shared/lib/utils';

interface NotificationItem {
  id: string;
  type: 'letter' | 'application' | 'termination' | 'complaint';
  title: string;
  description: string;
  timestamp: string;
  url: string;
}

interface PaginatedResponse {
  data: NotificationItem[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

interface NotificationDropdownProps {
  children: React.ReactNode;
  totalCount: number;
}

const iconMap: Record<string, React.ElementType> = {
  letter: Mail,
  application: UserPlus,
  termination: UserMinus,
  complaint: MessageCircle,
};

const colorMap: Record<string, string> = {
  letter: 'bg-blue-100 text-blue-600',
  application: 'bg-purple-100 text-purple-600',
  termination: 'bg-orange-100 text-orange-600',
  complaint: 'bg-rose-100 text-rose-600',
};

export default function NotificationDropdown({
  children,
  totalCount,
}: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async (page: number) => {
    setLoading(true);

    try {
      const { data } = await api.get<PaginatedResponse>(
        apiUrl('/super-admin/notifications'),
        {
          params: { page },
        }
      );

      console.log('Notification response:', data);

      setNotifications(data.data);
      setCurrentPage(data.current_page ?? page);
      setLastPage(data.last_page);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      if (isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchNotifications(1);
    }
  }, [open]);

  const goToPage = (page: number) => {
    if (loading) return;
    if (page < 1 || page > lastPage) return;
    fetchNotifications(page);
  };

  const handlePrevious = () => {
    goToPage(currentPage - 1);
  };

  const handleNext = () => {
    goToPage(currentPage + 1);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end" sideOffset={5}>
        {/* Tinggi popover DIKUNCI, isinya flex column */}
        <div className="flex h-[380px] flex-col">
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-200 shrink-0">
            <h3 className="font-semibold text-xs text-slate-900">
              Notifikasi
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {totalCount} notifikasi perlu ditindaklanjuti
            </p>
          </div>

          {/* Notifications List */}
          {/* ScrollArea flex-1 + min-h-0 supaya benar-benar ikut flexbox */}
          <ScrollArea className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                  <Mail className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Tidak ada notifikasi
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Semua notifikasi sudah ditindaklanjuti
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => {
                  const Icon = iconMap[notification.type];
                  const colorClass = colorMap[notification.type];

                  return (
                    <Link
                      key={notification.id}
                      href={notification.url}
                      className="flex gap-2 px-3 py-2 hover:bg-slate-50 transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      <div
                        className={cn(
                          'flex items-center justify-center w-7 h-7 rounded-md shrink-0',
                          colorClass
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-slate-900 truncate">
                          {notification.title}
                        </p>
                        <p className="text-[10px] text-slate-600 line-clamp-2 mt-0.5">
                          {notification.description}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {notification.timestamp}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Pagination Footer - di dalam wrapper, shrink-0 */}
          {!loading && notifications.length > 0 && lastPage > 1 && (
            <div className="px-3 py-2 border-t border-slate-200 flex items-center justify-between shrink-0">
              <p className="text-[10px] text-slate-500">
                Halaman {currentPage} dari {lastPage}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentPage === 1 || loading}
                  className="h-6 px-1.5"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentPage === lastPage || loading}
                  className="h-6 px-1.5"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}



