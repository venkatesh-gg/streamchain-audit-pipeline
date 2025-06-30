import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import Dashboard from './components/Dashboard';
import EventStream from './components/EventStream';
import AuditExplorer from './components/AuditExplorer';
import BlockchainView from './components/BlockchainView';
import Navigation from './components/Navigation';
import './index.css';

const queryClient = new QueryClient();

const apolloClient = new ApolloClient({
  uri: 'http://localhost:8000/graphql',
  cache: new InMemoryCache(),
});

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navigation />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/events" element={<EventStream />} />
                <Route path="/audit" element={<AuditExplorer />} />
                <Route path="/blockchain" element={<BlockchainView />} />
              </Routes>
            </main>
          </div>
        </Router>
      </QueryClientProvider>
    </ApolloProvider>
  );
}

export default App;