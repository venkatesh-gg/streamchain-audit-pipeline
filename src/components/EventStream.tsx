import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  id: string;
  type: 'transaction' | 'authentication' | 'api_call' | 'data_access' | 'system_event';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  message: string;
  source: string;
  metadata: Record<string, any>;
}

const EventStream: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isConnected, setIsConnected] = useState(true);

  // Simulate real-time events
  useEffect(() => {
    const eventTypes: Event['type'][] = ['transaction', 'authentication', 'api_call', 'data_access', 'system_event'];
    const severities: Event['severity'][] = ['low', 'medium', 'high', 'critical'];
    const sources = ['api-gateway', 'auth-service', 'db-cluster', 'payment-processor', 'blockchain-node'];

    const generateEvent = (): Event => ({
      id: Math.random().toString(36).substr(2, 9),
      type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      timestamp: new Date(),
      message: getRandomMessage(),
      source: sources[Math.floor(Math.random() * sources.length)],
      metadata: {
        userId: Math.floor(Math.random() * 10000),
        sessionId: Math.random().toString(36).substr(2, 9),
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      },
    });

    const interval = setInterval(() => {
      setEvents(prev => {
        const newEvent = generateEvent();
        return [newEvent, ...prev.slice(0, 49)]; // Keep last 50 events
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const getRandomMessage = () => {
    const messages = [
      'User authentication successful',
      'API rate limit exceeded',
      'Database connection established',
      'Payment transaction processed',
      'Blockchain transaction confirmed',
      'Anomalous access pattern detected',
      'System backup completed',
      'Cache invalidation triggered',
      'Security scan completed',
      'Load balancer health check',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getSeverityColor = (severity: Event['severity']) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getTypeIcon = (type: Event['type']) => {
    switch (type) {
      case 'transaction': return <Activity className="w-4 h-4" />;
      case 'authentication': return <CheckCircle className="w-4 h-4" />;
      case 'api_call': return <Activity className="w-4 h-4" />;
      case 'data_access': return <Activity className="w-4 h-4" />;
      case 'system_event': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const filteredEvents = events.filter(event => 
    filter === 'all' || event.severity === filter
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Event Stream</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time monitoring of system events
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Events</option>
            <option value="low">Low Severity</option>
            <option value="medium">Medium Severity</option>
            <option value="high">High Severity</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Live Events ({filteredEvents.length})
          </h3>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          <AnimatePresence>
            {filteredEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getTypeIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {event.message}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(event.severity)}`}>
                          {event.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(event.timestamp, 'HH:mm:ss')}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Source: {event.source}</span>
                      <span>Type: {event.type}</span>
                      <span>User: {event.metadata.userId}</span>
                      <span>IP: {event.metadata.ip}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default EventStream;