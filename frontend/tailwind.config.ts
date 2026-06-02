import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0A0B0F',
        panel: '#10131D',
        mutedPanel: '#171B27',
        indigoGlow: '#6366F1',
        cyanGlow: '#06B6D4',
        emeraldGlow: '#22C55E',
        roseGlow: '#F43F5E',
        amberGlow: '#F59E0B'
      },
      boxShadow: {
        glass: '0 24px 80px rgba(0,0,0,0.35)'
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        pulseBorder: 'pulseBorder 2s ease-in-out infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(0,-18px,0)' }
        },
        pulseBorder: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(99,102,241,0)' },
          '50%': { boxShadow: '0 0 28px rgba(99,102,241,0.38)' }
        }
      }
    }
  },
  plugins: []
};

export default config;
