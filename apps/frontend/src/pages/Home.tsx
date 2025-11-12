import { useEffect } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import { logger } from '../utils/logger'

const Home = () => {
  useEffect(() => {
    logger.debug('Home component mounted');
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <Hero />
      
      {/* Features Section */}
      <div className="bg-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose Tradeeon?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Advanced trading tools and AI-powered automation to maximize your profits
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300">
              <div className="text-4xl mb-6">🔗</div>
              <h3 className="text-xl font-semibold text-white mb-4">Exchange Connections</h3>
              <p className="text-gray-300">Connect to major exchanges and manage all your accounts in one place with secure API integrations.</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300">
              <div className="text-4xl mb-6">📊</div>
              <h3 className="text-xl font-semibold text-white mb-4">Portfolio Management</h3>
              <p className="text-gray-300">Track your investments and analyze performance across all your holdings with real-time data.</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 hover:border-emerald-500/50 transition-all duration-300">
              <div className="text-4xl mb-6">🤖</div>
              <h3 className="text-xl font-semibold text-white mb-4">AI Trading Bots</h3>
              <p className="text-gray-300">Automate your trading strategies with our advanced AI-powered bot system that learns and adapts.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home