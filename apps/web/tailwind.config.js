/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tappo: {
          red: '#EA1D2C', // Vermelho iFood forte padronizado
          'red-hover': '#D91826',
          'red-dark': '#B81420',
          yellow: '#FFC700', // Amarelo clássico de destaque (Mais pedido, Pede a conta)
          'yellow-hover': '#E6B400',
          dark: '#141212', // Fundo preto fosco quente profissional
          surface: '#1E1B1B', // Superfície elevada fosca
          card: '#242020',
          border: '#332D2D',
          muted: '#8A8484',
          subtle: '#B8B2B2',
          canvas: '#141212',
          pure: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'solid-red': '0 4px 14px rgba(234, 29, 44, 0.35)',
        'solid-yellow': '0 4px 14px rgba(255, 199, 0, 0.35)',
      },
    },
  },
  plugins: [],
};
