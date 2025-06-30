import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Blocks, Hash, Clock, Zap, Database, Link } from 'lucide-react';
import { format } from 'date-fns';

interface Block {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: Date;
  transactions: number;
  gasUsed: number;
  gasLimit: number;
  miner: string;
  size: number;
}

const BlockchainView: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

  useEffect(() => {
    // Generate mock blockchain data
    const generateBlocks = () => {
      const newBlocks: Block[] = [];
      for (let i = 0; i < 10; i++) {
        newBlocks.push({
          number: 15234567 - i,
          hash: `0x${Math.random().toString(16).substr(2, 64)}`,
          parentHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          timestamp: new Date(Date.now() - i * 12000), // 12 seconds per block
          transactions: Math.floor(Math.random() * 200) + 50,
          gasUsed: Math.floor(Math.random() * 15000000) + 5000000,
          gasLimit: 15000000,
          miner: `0x${Math.random().toString(16).substr(2, 40)}`,
          size: Math.floor(Math.random() * 50000) + 20000,
        });
      }
      setBlocks(newBlocks);
    };

    generateBlocks();
    const interval = setInterval(() => {
      setBlocks(prev => {
        const newBlock: Block = {
          number: prev[0].number + 1,
          hash: `0x${Math.random().toString(16).substr(2, 64)}`,
          parentHash: prev[0].hash,
          timestamp: new Date(),
          transactions: Math.floor(Math.random() * 200) + 50,
          gasUsed: Math.floor(Math.random() * 15000000) + 5000000,
          gasLimit: 15000000,
          miner: `0x${Math.random().toString(16).substr(2, 40)}`,
          size: Math.floor(Math.random() * 50000) + 20000,
        };
        return [newBlock, ...prev.slice(0, 9)];
      });
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const getGasUtilization = (gasUsed: number, gasLimit: number) => {
    return Math.round((gasUsed / gasLimit) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Blockchain Explorer</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time view of the blockchain audit trail
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Stats */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Network Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Latest Block</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  #{blocks[0]?.number.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Block Time</span>
                <span className="text-gray-900 dark:text-white">~12s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Gas Limit</span>
                <span className="text-gray-900 dark:text-white">15M</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Network</span>
                <span className="text-green-600 dark:text-green-400 font-medium">Private Testnet</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Blocks */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Blocks
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {blocks.map((block, index) => (
                <motion.div
                  key={block.hash}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedBlock(block)}
                  className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <Blocks className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Block #{block.number.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {block.transactions} transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {format(block.timestamp, 'HH:mm:ss')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getGasUtilization(block.gasUsed, block.gasLimit)}% gas used
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Block Details Modal */}
      {selectedBlock && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedBlock(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Block #{selectedBlock.number.toLocaleString()}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Hash className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Block Hash</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">
                      {truncateHash(selectedBlock.hash)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Link className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Parent Hash</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">
                      {truncateHash(selectedBlock.parentHash)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Timestamp</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {format(selectedBlock.timestamp, 'MMM dd, yyyy HH:mm:ss')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Size</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {(selectedBlock.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gas Used</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedBlock.gasUsed.toLocaleString()} ({getGasUtilization(selectedBlock.gasUsed, selectedBlock.gasLimit)}%)
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Hash className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Miner</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">
                      {truncateHash(selectedBlock.miner)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Gas Utilization</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {getGasUtilization(selectedBlock.gasUsed, selectedBlock.gasLimit)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getGasUtilization(selectedBlock.gasUsed, selectedBlock.gasLimit)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedBlock(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default BlockchainView;