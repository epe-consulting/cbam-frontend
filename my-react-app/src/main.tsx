import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import './index.css'
import App from './App.tsx'

const theme = createTheme({
  palette: {
    primary: {
      main: '#0B4F3E',
      light: '#3A7D6A',
      dark: '#0A3F32',
    },
    secondary: {
      main: '#1A2B25',
    },
    background: {
      default: '#FAFAF7',
      paper: '#FFFEF9',
    },
    text: {
      primary: '#1A2B25',
      secondary: '#6B8F82',
    },
    divider: '#D6E5DD',
    success: {
      main: '#0B4F3E',
      light: '#E8F5EF',
    },
    error: {
      main: '#C0392B',
      light: '#FDEDEC',
    },
  },
  typography: {
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
    h1: {
      fontFamily: "'Fraunces', Georgia, serif",
      fontSize: '3.75rem',
      fontWeight: 700,
      lineHeight: 1.12,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontFamily: "'Fraunces', Georgia, serif",
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontFamily: "'Fraunces', Georgia, serif",
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontFamily: "'Fraunces', Georgia, serif",
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: "'Fraunces', Georgia, serif",
      fontWeight: 600,
    },
    h6: {
      fontFamily: "'Fraunces', Georgia, serif",
      fontWeight: 600,
    },
    body1: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
    },
    body2: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
    },
    button: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '999px',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '20px',
          boxShadow: 'none',
          border: '1px solid #EAF0EC',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)