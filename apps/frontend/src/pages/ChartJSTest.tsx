import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ChartJSTest: React.FC = () => {
  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Trading Volume',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 205, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(153, 102, 255, 0.2)',
          'rgba(255, 159, 64, 0.2)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Chart.js Test - Trading Data',
      },
    },
  };

  return (
    <div className="h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Chart.js Test</h1>
      <p className="mb-4 text-gray-400">This should show a working chart with bars</p>
      
      <div className="w-full h-96 bg-gray-800 p-4 rounded">
        <Bar data={data} options={options} />
      </div>
      
      <div className="mt-4 text-sm text-gray-400">
        <p>✅ If you see colored bars above, Chart.js is working!</p>
        <p>❌ If you see blank space, there's still an issue</p>
      </div>
    </div>
  );
};

export default ChartJSTest;

