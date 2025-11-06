import { useEffect } from 'react';

const DebugConsole = () => {
  useEffect(() => {
    console.log('🚀 DebugConsole mounted');
    console.log('📍 Current URL:', window.location.href);
    console.log('🔧 User Agent:', navigator.userAgent);
    console.log('📱 Screen:', `${window.screen.width}x${window.screen.height}`);
    
    // Test if we can access localStorage
    try {
      localStorage.setItem('test', 'value');
      localStorage.removeItem('test');
      console.log('✅ localStorage: Working');
    } catch (error) {
      console.error('❌ localStorage:', error);
    }
    
    // Test if we can make a fetch request
    fetch('/api/test')
      .then(response => {
        console.log('✅ Fetch API: Working (response:', response.status, ')');
      })
      .catch(error => {
        console.log('⚠️ Fetch API: Error (expected):', error.message);
      });
      
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-xs max-w-xs">
      <div className="font-bold mb-2">🐛 Debug Console</div>
      <div>Check browser console (F12) for logs</div>
      <div>URL: {window.location.href}</div>
      <div>Time: {new Date().toLocaleTimeString()}</div>
    </div>
  );
};

export default DebugConsole;


