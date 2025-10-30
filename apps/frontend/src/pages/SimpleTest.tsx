import React from 'react';

const SimpleTest: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: 'white', minHeight: '100vh' }}>
      <h1>Simple Test Page</h1>
      <p>If you can see this, React is working!</p>
      <p>Current time: {new Date().toLocaleString()}</p>
      <div style={{ 
        width: '100%', 
        height: '300px', 
        backgroundColor: '#f0f0f0', 
        border: '2px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '20px',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Chart Area</h2>
          <p>This would be where the chart goes</p>
          <button 
            onClick={() => alert('Button clicked!')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleTest;

