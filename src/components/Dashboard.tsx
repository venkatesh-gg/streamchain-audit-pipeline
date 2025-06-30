import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Activity, Database, Shield, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import MetricCard from './MetricCard';
import RealTimeChart from './RealTimeChart';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardMetrics {
  totalEvents: number;
  eventRate: number;
  anomalies: number;
  blockchainTxs: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalEvents: 12547,
    eventRate: 156,
    anomalies: 3,
    blockchainTxs: 892,
    systemHealth: 'healthy',
  });

  const [realTimeData, setRealTimeData] = useState<number[]>([]);

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      setRealTimeData(prev => {
        const newData = [...prev, Math.floor(Math.random() * 200) + 50];
        return newData.length > 20 ? newData.slice(-20) : newData;
      });

      setMetrics(prev => ({
        ...prev,
        totalEvents: prev.totalEvents + Math.floor(Math.random() * 10),
        eventRate: Math.floor(Math.random() * 200) + 100,
        anomalies: Math.floor(Math.random() * 8),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const eventTypeData = {
    labels: ['Transaction', 'Authentication', 'API Call', 'Data Access', 'System Event'],
    datasets: [
      {
        data: [35, 25, 20, 12, 8],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
        ],
        borderWidth: 0,
      },
    ],
  };

  const threatLevelData = {
    labels: ['Low', 'Medium', 'High', 'Critical'],
    datasets: [
      {
        label: 'Threat Level Distribution',
        data: [65, 25, 8, 2],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#991B1B'],
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time monitoring and blockchain audit pipeline
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-green-600">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">System Healthy</span>
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Events"
          value={metrics.totalEvents.toLocaleString()}
          icon={<Activity className="w-6 h-6" />}
          trend={+12.5}
          color="blue"
        />
        <MetricCard
          title="Event Rate"
          value={`${metrics.eventRate}/min`}
          icon={<TrendingUp className="w-6 h-6" />}
          trend={+5.2}
          color="green"
        />
        <MetricCard
          title="Anomalies"
          value={metrics.anomalies.toString()}
          icon={<AlertTriangle className="w-6 h-6" />}
          trend={-8.1}
          color="red"
        />
        <MetricCard
          title="Blockchain Txs"
          value={metrics.blockchainTxs.toLocaleString()}
          icon={<Shield className="w-6 h-6" />}
          trend={+15.3}
          color="purple"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Real-Time Event Stream
          </h3>
          <RealTimeChart data={realTimeData} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Event Type Distribution
          </h3>
          <div className="h-64">
            <Doughnut
              data={eventTypeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Threat Level Analysis
          </h3>
          <div className="h-64">
            <Bar
              data={threatLevelData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Performance
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>CPU Usage</span>
                <span>68%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>Memory Usage</span>
                <span>84%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '84%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>Network I/O</span>
                <span>45%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;