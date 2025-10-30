const Activity = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Activity Feed</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-gray-400">📈</span>
          </div>
          <p className="text-gray-500 mb-2">No recent activity</p>
          <p className="text-sm text-gray-400">Your trading activity will appear here once you start using the platform</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Trades</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Win Rate</span>
              <span className="font-semibold">-</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total P&L</span>
              <span className="font-semibold">$0.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Best Trade</span>
              <span className="font-semibold">-</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Bots</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Connected Exchanges</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Portfolio Value</span>
              <span className="font-semibold">$0.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Last Update</span>
              <span className="font-semibold">Never</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Activity


