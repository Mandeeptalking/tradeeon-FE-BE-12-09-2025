const Bots = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Trading Bots</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          Create Bot
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Active Bots</h2>
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-gray-400">🤖</span>
          </div>
          <p className="text-gray-500 mb-2">No active bots</p>
          <p className="text-sm text-gray-400">Create your first trading bot to get started</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">📈</span>
            </div>
            <div>
              <h3 className="font-semibold">DCA Bot</h3>
              <p className="text-sm text-gray-500">Dollar Cost Averaging</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Automatically buy assets at regular intervals to average out price volatility.
          </p>
          <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
            Create
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <h3 className="font-semibold">Grid Bot</h3>
              <p className="text-sm text-gray-500">Grid Trading</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Place buy and sell orders in a grid pattern to profit from price volatility.
          </p>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
            Create
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h3 className="font-semibold">Custom Bot</h3>
              <p className="text-sm text-gray-500">Custom Strategy</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Create a custom trading bot with your own strategy and parameters.
          </p>
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors">
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

export default Bots


