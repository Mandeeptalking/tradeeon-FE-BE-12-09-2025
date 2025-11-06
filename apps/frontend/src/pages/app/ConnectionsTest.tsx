// SUPER SIMPLE TEST PAGE - Just to verify routing works
const ConnectionsTest = () => {
  return (
    <div style={{ padding: '40px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '32px', color: '#000', marginBottom: '20px' }}>
        ✅ Connections Page Test
      </h1>
      <p style={{ fontSize: '18px', color: '#333', marginBottom: '20px' }}>
        If you can see this, the page is loading!
      </p>
      <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', maxWidth: '600px' }}>
        <h2 style={{ marginBottom: '10px' }}>Test Form</h2>
        <input
          type="text"
          placeholder="Exchange Name"
          style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <input
          type="text"
          placeholder="API Key"
          style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <input
          type="password"
          placeholder="API Secret"
          style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button
          onClick={() => alert('Connect button clicked!')}
          style={{ padding: '10px 20px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Connect
        </button>
      </div>
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#e8f4f8', borderRadius: '8px', maxWidth: '600px' }}>
        <p style={{ margin: 0, color: '#0066cc' }}>
          <strong>API URL:</strong> {import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'https://api.tradeeon.com'}
        </p>
        <p style={{ margin: '10px 0 0 0', color: '#666', fontSize: '14px' }}>
          If you see this, React is working and the page is rendering!
        </p>
      </div>
    </div>
  );
};

export default ConnectionsTest;

