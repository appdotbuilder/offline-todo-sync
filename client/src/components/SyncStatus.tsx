import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface SyncStatusProps {
  lastSyncTime?: Date | null;
  onManualSync?: () => Promise<void>;
}

export function SyncStatus({ lastSyncTime, onManualSync }: SyncStatusProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>('synced');

  const handleManualSync = async () => {
    if (!onManualSync) return;
    
    setIsSyncing(true);
    try {
      await onManualSync();
      setSyncStatus('synced');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = () => {
    if (isSyncing) {
      return (
        <Badge variant="outline" className="status-syncing">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Syncing...
        </Badge>
      );
    }

    switch (syncStatus) {
      case 'synced':
        return (
          <Badge variant="outline" className="status-online">
            <CheckCircle className="h-3 w-3 mr-1" />
            Synced
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-3 w-3 mr-1" />
            Sync Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700">
            <RefreshCw className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getLastSyncText = () => {
    if (!lastSyncTime) return 'Never synced';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSyncTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return lastSyncTime.toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-2">
      {getStatusBadge()}
      
      {onManualSync && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="text-xs h-6 px-2"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      )}
      
      <span className="text-xs text-gray-500 hidden sm:inline">
        {getLastSyncText()}
      </span>
    </div>
  );
}