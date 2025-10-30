import { Link } from 'react-router-dom'

const GetStarted = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-12">
        <nav className="flex justify-between items-center mb-12">
          <Link to="/" className="text-2xl font-bold text-gray-900">Tradeeon</Link>
          <Link 
            to="/signin" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </nav>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Get Started with Tradeeon</h1>
          <p className="text-xl text-gray-600 mb-12">
            Follow these steps to set up your trading platform and start managing your investments.
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Create Account</h3>
              <p className="text-gray-600 mb-4">
                Sign up for a free account to access all trading features and tools.
              </p>
              <Link 
                to="/signin"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign up now →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Connect Exchanges</h3>
              <p className="text-gray-600 mb-4">
                Link your exchange accounts to start tracking your portfolio and trades.
              </p>
              <span className="text-gray-400 font-medium">Available after signup</span>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Set Up Portfolio</h3>
              <p className="text-gray-600 mb-4">
                Configure your portfolio settings and investment preferences.
              </p>
              <span className="text-gray-400 font-medium">Available after signup</span>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 text-xl">4</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Start Trading</h3>
              <p className="text-gray-600 mb-4">
                Begin using our advanced trading tools and automation features.
              </p>
              <span className="text-gray-400 font-medium">Available after signup</span>
            </div>
          </div>

          <div className="text-center">
            <Link 
              to="/signin"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors inline-block"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GetStarted


