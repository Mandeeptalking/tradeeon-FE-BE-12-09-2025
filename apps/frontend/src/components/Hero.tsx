import { useEffect, useRef } from 'react';
import { TrendingUp, Zap, Shield, ArrowRight, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const Hero = () => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        
        cardRefs.current.forEach((card, index) => {
          if (card) {
            const intensity = (index + 1) * 5;
            card.style.transform = `
              perspective(1000px) 
              rotateY(${x * intensity}deg) 
              rotateX(${-y * intensity}deg)
              translateZ(20px)
            `;
          }
        });
      }
    };

    const hero = heroRef.current;
    if (hero) {
      hero.addEventListener('mousemove', handleMouseMove);
      return () => hero.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  const stats = [
    { icon: TrendingUp, value: '2.5M+', label: 'Trades Executed' },
    { icon: Zap, value: '0.03s', label: 'Avg Response Time' },
    { icon: Shield, value: '99.9%', label: 'Uptime Guarantee' }
  ];

  return (
    <div ref={heroRef} className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden flex items-center">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 animate-pulse"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl animate-float-slow"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-400/30 rounded-full px-4 py-2">
                <Zap className="h-4 w-4 text-blue-400" />
                <span className="text-blue-300 text-sm font-medium">Advanced AI Trading</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  Trade Smarter
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                  Not Harder
                </span>
              </h1>
              
              <p className="text-xl text-gray-300 leading-relaxed max-w-2xl">
                Unleash the power of AI-driven trading bots that never sleep, never panic, and always execute your strategy with precision.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/get-started">
                <button className="group relative bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 overflow-hidden">
                  <span className="relative z-10 flex items-center justify-center space-x-2">
                    <span>Start Trading Now</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </Link>
              
              <Link to="/app">
                <button className="group flex items-center justify-center space-x-2 border-2 border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 hover:bg-gray-700/30">
                  <TrendingUp className="h-5 w-5" />
                  <span>Live Charts</span>
                </button>
              </Link>
              
              <Link to="/signin">
                <button className="group flex items-center justify-center space-x-2 border-2 border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 hover:bg-gray-700/30">
                  <User className="h-5 w-5" />
                  <span>Sign In</span>
                </button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full mb-2 group-hover:scale-110 transition-transform duration-300">
                    <stat.icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - 3D Trading Cards */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-6">
              {/* Card 1 */}
              <div
                ref={(el) => cardRefs.current[0] = el}
                className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 transform transition-transform duration-300 hover:scale-105"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="text-emerald-400 text-2xl font-bold">+24.5%</div>
                <div className="text-gray-300 text-sm mt-1">Monthly Return</div>
                <div className="mt-4 h-16 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-lg flex items-end justify-center space-x-1">
                  {[40, 60, 30, 80, 50, 90, 70].map((height, i) => (
                    <div key={i} className={`bg-emerald-400 w-2 rounded-sm animate-pulse`} style={{ height: `${height}%`, animationDelay: `${i * 0.1}s` }}></div>
                  ))}
                </div>
              </div>

              {/* Card 2 */}
              <div
                ref={(el) => cardRefs.current[1] = el}
                className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 transform transition-transform duration-300 hover:scale-105 mt-8"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="text-blue-400 text-2xl font-bold">847</div>
                <div className="text-gray-300 text-sm mt-1">Active Bots</div>
                <div className="mt-4 space-y-2">
                  {[85, 72, 96].map((percentage, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className={`bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-1000 animate-grow-bar`} style={{ width: `${percentage}%`, animationDelay: `${i * 0.3}s` }}></div>
                      </div>
                      <span className="text-xs text-gray-400 w-8">{percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3 */}
              <div
                ref={(el) => cardRefs.current[2] = el}
                className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 transform transition-transform duration-300 hover:scale-105 -mt-4"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="text-purple-400 text-2xl font-bold">0.03s</div>
                <div className="text-gray-300 text-sm mt-1">Execution Speed</div>
                <div className="mt-4 relative">
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse-width"></div>
                  </div>
                </div>
              </div>

              {/* Card 4 */}
              <div
                ref={(el) => cardRefs.current[3] = el}
                className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 transform transition-transform duration-300 hover:scale-105"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="text-emerald-400 text-2xl font-bold">99.9%</div>
                <div className="text-gray-300 text-sm mt-1">Success Rate</div>
                <div className="mt-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin-slow"></div>
                    <div className="absolute inset-2 rounded-full bg-emerald-400/20 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-8 -left-8 w-16 h-16 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full blur-sm animate-float"></div>
            <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-full blur-sm animate-float-delayed"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
