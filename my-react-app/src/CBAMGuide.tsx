import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  Stack,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Public,
  Factory,
  Gavel,
  CalendarMonth,
  CheckCircle,
  ExpandMore,
  Info,
  AccountBalance,
  LocalShipping,
  BarChart,
  Warning,
  TipsAndUpdates,
  MenuBook,
} from '@mui/icons-material';

const CBAMGuide: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sectors = [
    { name: 'Iron & Steel', icon: <Factory />, cn: 'CN 72, 73' },
    { name: 'Aluminium', icon: <Factory />, cn: 'CN 76' },
    { name: 'Cement', icon: <Factory />, cn: 'CN 2523' },
    { name: 'Fertilisers', icon: <Factory />, cn: 'CN 2808, 2814, 3102–3105' },
    { name: 'Electricity', icon: <Factory />, cn: 'CN 2716' },
    { name: 'Hydrogen', icon: <Factory />, cn: 'CN 2804 10 00' },
  ];

  const timeline = [
    {
      date: 'October 2023',
      title: 'Transitional Phase Begins',
      description:
        'EU importers must start reporting embedded emissions of CBAM goods on a quarterly basis. No financial payments are required during this phase.',
    },
    {
      date: 'January 2025',
      title: 'Stricter Reporting Rules',
      description:
        'Default values can no longer be used for most products. Importers must report actual emissions data from installations.',
    },
    {
      date: 'January 2026',
      title: 'Definitive Phase Starts',
      description:
        'CBAM certificates must be purchased and surrendered. Financial obligations begin and the EU ETS free allocation phase-out starts.',
    },
    {
      date: '2026 – 2034',
      title: 'Gradual Phase-In',
      description:
        'CBAM financial obligations increase progressively as EU ETS free allowances are phased out, reaching full implementation by 2034.',
    },
  ];

  const faqs = [
    {
      question: 'Who is affected by CBAM?',
      answer:
        'CBAM primarily affects EU importers of goods in covered sectors (iron & steel, aluminium, cement, fertilisers, electricity, and hydrogen). However, non-EU producers and exporters are also indirectly affected, as they must provide emissions data to their EU clients.',
    },
    {
      question: 'What are embedded emissions?',
      answer:
        'Embedded emissions are the greenhouse gas emissions released during the production of a good. CBAM considers both direct emissions (from the production process itself) and, in some cases, indirect emissions (from electricity consumed during production).',
    },
    {
      question: 'How is the CBAM price calculated?',
      answer:
        'The CBAM certificate price mirrors the EU Emissions Trading System (EU ETS) carbon price, calculated as the weekly average auction price of EU ETS allowances. This ensures a level playing field between EU and non-EU producers.',
    },
    {
      question: 'What happens if a carbon price is already paid in the country of origin?',
      answer:
        'If an explicit carbon price has been paid in the country of origin, the CBAM obligation can be reduced accordingly. Importers can claim a reduction in CBAM certificates based on the carbon price effectively paid abroad.',
    },
    {
      question: 'What data do non-EU producers need to provide?',
      answer:
        'Non-EU producers need to provide data on direct emissions from production processes, electricity consumption and its emission factor, production quantities, and details about any carbon price paid in the country of origin.',
    },
    {
      question: 'What are the penalties for non-compliance?',
      answer:
        'During the transitional period, non-compliance with reporting obligations can result in penalties ranging from €10 to €50 per tonne of unreported emissions. In the definitive phase, penalties will be aligned with those under the EU ETS.',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Navigation */}
      <AppBar
        position="fixed"
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
        }}
      >
        <Toolbar>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{ color: 'text.secondary', mr: 2 }}
          >
            Back
          </Button>
          <Box display="flex" alignItems="center" gap={1} sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              PANONIA
            </Typography>
            <Chip label="CBAM Guide" size="small" color="primary" variant="outlined" />
          </Box>
          <Button variant="contained" color="primary" onClick={() => navigate('/login')}>
            Login
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          pt: 16,
          pb: 10,
          px: { xs: 2, sm: 4 },
          background: 'linear-gradient(135deg, #ecfdf5 0%, #dbeafe 50%, #ede9fe 100%)',
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" maxWidth="md" mx="auto">
            <Chip
              icon={<MenuBook />}
              label="Complete Guide"
              color="primary"
              variant="outlined"
              sx={{ mb: 3, bgcolor: 'white' }}
            />
            <Typography
              variant="h1"
              component="h1"
              gutterBottom
              sx={{
                fontSize: { xs: '2.25rem', md: '3.5rem' },
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              Understanding the EU{' '}
              <Typography
                component="span"
                color="primary"
                sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}
              >
                Carbon Border Adjustment Mechanism
              </Typography>
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
              Everything you need to know about CBAM — what it is, who it affects, key timelines,
              and how to achieve compliance.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* What is CBAM */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Chip
                icon={<Info />}
                label="Overview"
                color="primary"
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                What is CBAM?
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                The <strong>Carbon Border Adjustment Mechanism (CBAM)</strong> is a landmark EU
                regulation designed to put a fair price on carbon emissions embedded in imported
                goods. It ensures that the carbon price of imports is equivalent to the carbon price
                of domestic production, preventing &quot;carbon leakage&quot; — where companies move
                production to countries with less strict climate policies.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                CBAM is a key pillar of the EU&apos;s{' '}
                <strong>&quot;Fit for 55&quot;</strong> package, aiming to reduce greenhouse gas
                emissions by at least 55% by 2030 compared to 1990 levels. It works alongside the
                EU Emissions Trading System (EU ETS) by extending carbon pricing to imported goods.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  background: 'linear-gradient(135deg, #d1fae5, #dbeafe)',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Stack spacing={3}>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Avatar sx={{ bgcolor: '#059669' }}>
                      <Public />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Prevents Carbon Leakage
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Ensures companies can&apos;t avoid carbon costs by relocating production
                        outside the EU.
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Avatar sx={{ bgcolor: '#2563eb' }}>
                      <Gavel />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Level Playing Field
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        EU and non-EU producers face equivalent carbon pricing for fair competition.
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Avatar sx={{ bgcolor: '#7c3aed' }}>
                      <AccountBalance />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Encourages Decarbonisation
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Incentivises non-EU producers to adopt cleaner production technologies.
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Covered Sectors */}
      <Box sx={{ py: 10, bgcolor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Chip
              icon={<LocalShipping />}
              label="Scope"
              color="primary"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              Covered Sectors
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 'md', mx: 'auto' }}
            >
              CBAM applies to imports in six carbon-intensive sectors. These sectors were chosen
              because they carry the highest risk of carbon leakage.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {sectors.map((sector) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={sector.name}>
                <Card
                  sx={{
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>{sector.icon}</Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {sector.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {sector.cn}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How CBAM Works */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Chip
              icon={<BarChart />}
              label="Mechanism"
              color="primary"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              How CBAM Works
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 'md', mx: 'auto' }}
            >
              The mechanism operates through a system of reporting and certificates.
            </Typography>
          </Box>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 64,
                    height: 64,
                    mx: 'auto',
                    mb: 2,
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                  }}
                >
                  1
                </Avatar>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  Report Emissions
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  EU importers must report the embedded emissions of their imported goods. Non-EU
                  producers provide the necessary emissions data for each installation and product.
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 64,
                    height: 64,
                    mx: 'auto',
                    mb: 2,
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                  }}
                >
                  2
                </Avatar>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  Purchase Certificates
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  Starting in 2026, authorised CBAM declarants must purchase CBAM certificates at a
                  price linked to the EU ETS carbon price. Each certificate covers one tonne of
                  CO₂-equivalent emissions.
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 64,
                    height: 64,
                    mx: 'auto',
                    mb: 2,
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                  }}
                >
                  3
                </Avatar>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  Surrender Certificates
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  By May 31 each year, declarants must surrender CBAM certificates corresponding to
                  the embedded emissions of their imports from the previous year, after deducting any
                  carbon price already paid abroad.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Key Emissions Concepts */}
      <Box sx={{ py: 10, bgcolor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Chip
              icon={<TipsAndUpdates />}
              label="Key Concepts"
              color="primary"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              Understanding Emissions Under CBAM
            </Typography>
          </Box>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{ fontWeight: 600, color: 'primary.main' }}
                >
                  Direct Emissions
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                  Emissions that are released directly from the production process of the good,
                  including:
                </Typography>
                <List dense>
                  {[
                    'Combustion of fuels for heat and energy',
                    'Process emissions from chemical reactions',
                    'Emissions from raw material decomposition',
                  ].map((item) => (
                    <ListItem key={item} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircle color="primary" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{ fontWeight: 600, color: '#2563eb' }}
                >
                  Indirect Emissions
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                  Emissions from the generation of electricity consumed during the production
                  process. Relevant for:
                </Typography>
                <List dense>
                  {[
                    'Electricity used in production facilities',
                    'Applicable to all CBAM sectors',
                    'Calculated using grid emission factors or supplier-specific data',
                  ].map((item) => (
                    <ListItem key={item} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircle sx={{ color: '#2563eb' }} fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Timeline */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="md">
          <Box textAlign="center" mb={6}>
            <Chip
              icon={<CalendarMonth />}
              label="Timeline"
              color="primary"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              Key Dates & Milestones
            </Typography>
            <Typography variant="h6" color="text.secondary">
              CBAM is being implemented in phases to allow businesses time to adapt.
            </Typography>
          </Box>
          <Stack spacing={0}>
            {timeline.map((item, index) => (
              <Box key={item.date} display="flex" gap={3}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 40,
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: index <= 1 ? 'grey.400' : 'primary.main',
                      width: 40,
                      height: 40,
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {index + 1}
                  </Avatar>
                  {index < timeline.length - 1 && (
                    <Box
                      sx={{
                        width: 2,
                        flexGrow: 1,
                        bgcolor: index < 1 ? 'grey.300' : 'primary.light',
                        my: 0.5,
                      }}
                    />
                  )}
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    mb: 3,
                    flexGrow: 1,
                    border: '1px solid',
                    borderColor: index <= 1 ? 'divider' : 'primary.light',
                    borderRadius: 2,
                    bgcolor: index <= 1 ? 'background.paper' : 'primary.50',
                  }}
                >
                  <Chip
                    label={item.date}
                    size="small"
                    color={index <= 1 ? 'default' : 'primary'}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {item.description}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* Obligations for Non-EU Producers */}
      <Box sx={{ py: 10, bgcolor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Chip
                icon={<Warning />}
                label="Your Obligations"
                color="warning"
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                What Non-EU Producers Must Do
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                While the legal CBAM obligations fall on EU importers, non-EU producers play a
                critical role by providing the emissions data their EU clients need.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
                {[
                  {
                    title: 'Calculate Embedded Emissions',
                    desc: 'Determine direct and indirect emissions for each product at each installation.',
                  },
                  {
                    title: 'Provide Verified Data',
                    desc: 'Supply accurate emissions data using approved CBAM methodologies and templates.',
                  },
                  {
                    title: 'Report Carbon Prices Paid',
                    desc: 'Document any carbon tax or ETS costs paid in the country of origin.',
                  },
                  {
                    title: 'Share Data with EU Clients',
                    desc: 'Transmit emissions reports to your EU importing partners in a timely manner.',
                  },
                ].map((item) => (
                  <Paper
                    key={item.title}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                    }}
                  >
                    <CheckCircle color="primary" sx={{ mt: 0.3, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.desc}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="md">
          <Box textAlign="center" mb={6}>
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              Frequently Asked Questions
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Common questions about CBAM and compliance.
            </Typography>
          </Box>
          <Stack spacing={2}>
            {faqs.map((faq) => (
              <Accordion
                key={faq.question}
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '12px !important',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0 },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>
                    {faq.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* CTA */}
      <Box sx={{ py: 10, bgcolor: 'primary.main', color: 'white' }}>
        <Container maxWidth="md">
          <Box textAlign="center">
            <Typography variant="h3" component="h2" gutterBottom sx={{ color: 'white', fontWeight: 700 }}>
              Ready to Get Started?
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, color: 'primary.light' }}>
              Panonia makes CBAM compliance simple. Calculate your emissions, generate compliant
              reports, and share them with your EU clients — all in one platform.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/login')}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': { bgcolor: 'grey.100' },
                }}
              >
                Start Calculating
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/')}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                Back to Home
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: 'grey.900', color: 'grey.300', py: 4 }}>
        <Container maxWidth="lg">
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                PANONIA
              </Typography>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'grey.700', mx: 1 }} />
              <Typography variant="body2">CBAM Guide</Typography>
            </Box>
            <Typography variant="body2">
              &copy; {new Date().getFullYear()} Panonia. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default CBAMGuide;
