const Connections = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Exchange Connections</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Connected Exchanges</h2>
        <div className="text-gray-500">
          <p>No exchanges connected yet.</p>
          <p className="text-sm mt-2">Connect your exchange accounts to start tracking your portfolio.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">🟠</span>
            </div>
            <div>
              <h3 className="font-semibold">Binance</h3>
              <p className="text-sm text-gray-500">Not connected</p>
            </div>
          </div>
          <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors">
            Connect
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">🟡</span>
            </div>
            <div>
              <h3 className="font-semibold">Coinbase Pro</h3>
              <p className="text-sm text-gray-500">Not connected</p>
            </div>
          </div>
          <button className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors">
            Connect
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">🔵</span>
            </div>
            <div>
              <h3 className="font-semibold">Kraken</h3>
              <p className="text-sm text-gray-500">Not connected</p>
            </div>
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
            Connect
          </button>
        </div>
      </div>
    </div>
  )
}

export default Connections


