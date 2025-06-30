import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Shield, ExternalLink, Calendar, User, Hash } from 'lucide-react';
import { format } from 'date-fns';

interface AuditRecord {
  id: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: Date;
  eventType: string;
  userId: string;
  action: string;
  ipfsHash: string;
  verified: boolean;
  gasUsed: number;
}

const AuditExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records] = useState<AuditRecord[]>([
    {
      id: '1',
      transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
      blockNumber: 15234567,
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      eventType: 'USER_AUTHENTICATION',
      userId: 'user_12345',
      action: 'Login attempt recorded',
      ipfsHash: 'QmXoYpKmNaSkR3bXxvweCUJZvJ8H6yKmNaSkR3bXxvweC',
      verified: true,
      gasUsed: 21000,
    },
    {
      id: '2',
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef12',
      blockNumber: 15234566,
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      eventType: 'PAYMENT_TRANSACTION',
      userId: 'user_67890',
      action: 'Payment processed and recorded',
      ipfsHash: 'QmYpKmNaSkR3bXxvweCUJZvJ8H6yKmNaSkR3bXxvweCUJ',
      verified: true,
      gasUsed: 45000,
    },
    {
      id: '3',
      transactionHash: '0x567890abcdef1234567890abcdef1234567890ab',
      blockNumber: 15234565,
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      eventType: 'DATA_ACCESS',
      userId: 'user_54321',
      action: 'Sensitive data access logged',
      ipfsHash: 'QmSkR3bXxvweCUJZvJ8H6yKmNaSkR3bXxvweCUJZvJ8H6',
      verified: false,
      gasUsed: 32000,
    },
  ]);

  const filteredRecords = records.filter(record =>
    record.transactionHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.eventType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const truncateHash = (hash: string, length: number = 8) => {
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit Explorer</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Immutable audit trail powered by blockchain technology
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by transaction hash, user ID, or event type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Audit Records */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Audit Records ({filteredRecords.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredRecords.map((record) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${record.verified ? 'bg-green-100 dark:bg-green-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'}`}>
                      <Shield className={`w-5 h-5 ${record.verified ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {record.eventType.replace('_', ' ')}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">{record.action}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      record.verified 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {record.verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Transaction Hash</p>
                        <p className="font-mono text-gray-900 dark:text-white">
                          {truncateHash(record.transactionHash)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Timestamp</p>
                        <p className="text-gray-900 dark:text-white">
                          {format(record.timestamp, 'MMM dd, HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">User ID</p>
                        <p className="text-gray-900 dark:text-white">{record.userId}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Block Number</p>
                        <p className="text-gray-900 dark:text-white">#{record.blockNumber}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Gas Used: {record.gasUsed.toLocaleString()}</span>
                      <span>IPFS: {truncateHash(record.ipfsHash, 6)}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium">
                        View on Explorer
                      </button>
                      <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium">
                        View IPFS Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuditExplorer;