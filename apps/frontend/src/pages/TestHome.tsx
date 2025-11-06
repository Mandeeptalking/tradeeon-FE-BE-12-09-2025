// Minimal test page to verify React is working
const TestHome = () => {
  console.log('TestHome rendering');
  
  return (
    <div style={{ 
      padding: '40px', 
      backgroundColor: '#1F2937', 
      color: 'white',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>
        ✅ React is Working!
      </h1>
      <p style={{ fontSize: '18px', marginBottom: '20px' }}>
        If you can see this, React is rendering correctly.
      </p>
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#374151', 
        borderRadius: '8px',
        maxWidth: '600px'
      }}>
        <h2 style={{ marginBottom: '10px' }}>Debug Info:</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>✅ React: Working</li>
          <li>✅ Routing: Working</li>
          <li>✅ Styling: Working</li>
        </ul>
      </div>
      <div style={{ marginTop: '20px' }}>
        <a 
          href="/" 
          style={{ 
            color: '#60A5FA', 
            textDecoration: 'underline' 
          }}
        >
          Go back to Home
        </a>
      </div>
    </div>
  );
};

export default TestHome;

