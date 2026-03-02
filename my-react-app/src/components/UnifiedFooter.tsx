import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import { Shield } from '@mui/icons-material';

type FooterLabels = {
  tagline: string;
  productTitle: string;
  productFeatures: string;
  productPricing: string;
  resourcesTitle: string;
  resourcesGuide: string;
  resourcesSupport: string;
  companyTitle: string;
  companyAbout: string;
  companyContact: string;
  companyPrivacy: string;
  copyright: string;
};

const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  color: {
    forest: '#0B4F3E',
    ink: '#1A2B25',
  },
};

interface UnifiedFooterProps {
  labels: FooterLabels;
}

const UnifiedFooter: React.FC<UnifiedFooterProps> = ({ labels }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const navigateTop = (path: string) => {
    if (pathname === path) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }
    navigate(path);
  };

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: T.color.ink,
        color: 'rgba(255,255,255,0.55)',
        pt: { xs: 6, md: 8 },
        pb: 4,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} sx={{ mb: 6 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Box display="flex" alignItems="center" gap={1.2} mb={2}>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  bgcolor: T.color.forest,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield sx={{ color: '#fff', fontSize: 16 }} />
              </Box>
              <Typography
                sx={{
                  fontFamily: T.font.display,
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: '#fff',
                }}
              >
                Panonia
              </Typography>
            </Box>
            <Typography
              sx={{
                fontFamily: T.font.body,
                fontSize: '0.9rem',
                lineHeight: 1.65,
                maxWidth: 240,
              }}
            >
              {labels.tagline}
            </Typography>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Typography
              sx={{
                fontFamily: T.font.body,
                fontWeight: 600,
                fontSize: '0.8rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)',
                mb: 2.5,
              }}
            >
              {labels.productTitle}
            </Typography>
            <Stack spacing={1.5}>
              <Typography
                component="a"
                onClick={() => navigateTop('/features')}
                sx={{
                  fontFamily: T.font.body,
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.55)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  '&:hover': { color: '#fff' },
                }}
              >
                {labels.productFeatures}
              </Typography>
              {[labels.productPricing].map((item) => (
                <Typography
                  key={item}
                  component="a"
                  href="#"
                  sx={{
                    fontFamily: T.font.body,
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.55)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                    '&:hover': { color: '#fff' },
                  }}
                >
                  {item}
                </Typography>
              ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Typography
              sx={{
                fontFamily: T.font.body,
                fontWeight: 600,
                fontSize: '0.8rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)',
                mb: 2.5,
              }}
            >
              {labels.resourcesTitle}
            </Typography>
            <Stack spacing={1.5}>
              <Typography
                component="a"
                onClick={() => navigateTop('/cbam-guide')}
                sx={{
                  fontFamily: T.font.body,
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.55)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  '&:hover': { color: '#fff' },
                }}
              >
                {labels.resourcesGuide}
              </Typography>
              <Typography
                component="a"
                onClick={() => navigateTop('/support')}
                sx={{
                  fontFamily: T.font.body,
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.55)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  '&:hover': { color: '#fff' },
                }}
              >
                {labels.resourcesSupport}
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Typography
              sx={{
                fontFamily: T.font.body,
                fontWeight: 600,
                fontSize: '0.8rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)',
                mb: 2.5,
              }}
            >
              {labels.companyTitle}
            </Typography>
            <Stack spacing={1.5}>
              <Typography
                component="a"
                onClick={() => navigateTop('/about')}
                sx={{
                  fontFamily: T.font.body,
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.55)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  '&:hover': { color: '#fff' },
                }}
              >
                {labels.companyAbout}
              </Typography>
              <Typography
                component="a"
                onClick={() => navigateTop('/contact')}
                sx={{
                  fontFamily: T.font.body,
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.55)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  '&:hover': { color: '#fff' },
                }}
              >
                {labels.companyContact}
              </Typography>
              <Typography
                component="a"
                onClick={() => navigateTop('/privacy')}
                sx={{
                  fontFamily: T.font.body,
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.55)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  '&:hover': { color: '#fff' },
                }}
              >
                {labels.companyPrivacy}
              </Typography>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 3 }} />

        <Typography
          sx={{
            fontFamily: T.font.body,
            fontSize: '0.82rem',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          {labels.copyright}
        </Typography>
      </Container>
    </Box>
  );
};

export default UnifiedFooter;
