import React from 'react';
import { Box, Container, Typography, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const EFFECTIVE_DATE = 'July 9, 2026';
const COMPANY = 'MultiPDFsToExcel';
const DOMAIN = 'multipdfstoexcel.com';
const EMAIL = 'nikhil1996shelke@multipdfstoexcel.com';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box mb={4}>
    <Typography variant="h6" fontWeight={700} mb={1.5} color="#0c0c0c">{title}</Typography>
    {children}
  </Box>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <Typography fontSize={15} color="#374151" lineHeight={1.8} mb={1.5}>{children}</Typography>
);

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa', py: { xs: 6, md: 10 } }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box mb={6}>
          <Box
            onClick={() => navigate('/')}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 4, cursor: 'pointer', color: '#6366f1', fontWeight: 700, fontSize: 14 }}
          >
            ← Back to {COMPANY}
          </Box>
          <Typography variant="h3" fontWeight={900} letterSpacing={-1} mb={1}>
            Privacy Policy
          </Typography>
          <Typography color="text.secondary" fontSize={14}>
            Effective date: {EFFECTIVE_DATE} · Last updated: {EFFECTIVE_DATE}
          </Typography>
        </Box>

        <Divider sx={{ mb: 5 }} />

        <P>
          At {COMPANY} ({DOMAIN}), we take your privacy seriously. This Privacy Policy explains what information we collect, how we use it, and what choices you have.
        </P>

        <Section title="1. Information We Collect">
          <P><strong>Account information:</strong> When you sign in with Google, we receive your name, email address, and profile picture from Google. We store your email and name to identify your account.</P>
          <P><strong>Uploaded files:</strong> PDF files you upload are processed in memory to extract data. Files are not permanently stored on our servers. Temporary copies are deleted immediately after processing is complete.</P>
          <P><strong>Usage data:</strong> We collect basic usage metrics such as number of extraction jobs run, job status, and timestamps. This helps us monitor service health and prevent abuse.</P>
          <P><strong>Donation data:</strong> If you donate via Ko-fi, Ko-fi shares your email address with us solely to identify your account for unlocking additional usage. We do not receive or store your payment card details.</P>
          <P><strong>Log data:</strong> Our servers automatically log request metadata (IP address, request path, response status, response time). Logs are retained for up to 30 days for security and debugging purposes.</P>
        </Section>

        <Section title="2. How We Use Your Information">
          <Box component="ul" sx={{ pl: 3, color: '#374151', fontSize: 15, lineHeight: 2 }}>
            <li>To authenticate you and maintain your account</li>
            <li>To process your PDF files and return extracted data</li>
            <li>To track usage limits and unlock access after donations</li>
            <li>To send important service notifications (account security, major changes)</li>
            <li>To detect and prevent fraud and abuse</li>
            <li>To monitor and improve the Service</li>
          </Box>
          <P>
            We do not sell, rent, or share your personal information with third parties for marketing purposes.
          </P>
        </Section>

        <Section title="3. AI Processing">
          <P>
            PDF content is sent to Anthropic's Claude AI API for intelligent data extraction. Anthropic processes your data solely to provide the extraction result. Anthropic's data handling is governed by their{' '}
            <Box component="a" href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" sx={{ color: '#6366f1', fontWeight: 600 }}>
              Privacy Policy
            </Box>.
          </P>
          <P>
            We recommend you do not upload files containing highly sensitive personal data (e.g. medical records, financial account numbers, government IDs) unless you are comfortable with AI processing of that content.
          </P>
        </Section>

        <Section title="4. Third-Party Services">
          <P>We use the following third-party services, each with their own privacy policies:</P>
          <Box component="ul" sx={{ pl: 3, color: '#374151', fontSize: 15, lineHeight: 2.2 }}>
            <li><strong>Google OAuth</strong> — authentication. <Box component="a" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" sx={{ color: '#6366f1' }}>Google Privacy Policy</Box></li>
            <li><strong>Anthropic Claude</strong> — AI extraction. <Box component="a" href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" sx={{ color: '#6366f1' }}>Anthropic Privacy Policy</Box></li>
            <li><strong>Ko-fi / PayPal</strong> — optional donations. <Box component="a" href="https://ko-fi.com/privacy" target="_blank" rel="noopener noreferrer" sx={{ color: '#6366f1' }}>Ko-fi Privacy Policy</Box></li>
            <li><strong>Vercel</strong> — frontend hosting. <Box component="a" href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" sx={{ color: '#6366f1' }}>Vercel Privacy Policy</Box></li>
            <li><strong>Railway</strong> — backend hosting. <Box component="a" href="https://railway.app/legal/privacy" target="_blank" rel="noopener noreferrer" sx={{ color: '#6366f1' }}>Railway Privacy Policy</Box></li>
          </Box>
        </Section>

        <Section title="5. Cookies and Local Storage">
          <P>
            We use browser local storage to store your authentication tokens (JWT) for session management. We do not use advertising cookies or third-party tracking cookies.
          </P>
          <P>
            Our hosting providers (Vercel, Railway) may set basic operational cookies. No personal data is shared with advertisers.
          </P>
        </Section>

        <Section title="6. Data Retention">
          <P>
            <strong>Account data</strong> (name, email, usage count): retained while your account is active. You may request deletion at any time.
          </P>
          <P>
            <strong>Uploaded PDF files</strong>: not stored. Processed in-memory and discarded immediately after extraction.
          </P>
          <P>
            <strong>Extracted results</strong>: stored temporarily and deleted after download or within 24 hours, whichever comes first.
          </P>
          <P>
            <strong>Server logs</strong>: retained for up to 30 days, then automatically deleted.
          </P>
        </Section>

        <Section title="7. Data Security">
          <P>
            All data is transmitted over HTTPS (TLS 1.3). Authentication uses short-lived JWT tokens. We apply industry-standard security practices including rate limiting, input validation, and server-side authorisation checks. However, no system is completely secure — we cannot guarantee absolute security of your data.
          </P>
        </Section>

        <Section title="8. Your Rights">
          <P>Depending on your location, you may have the right to:</P>
          <Box component="ul" sx={{ pl: 3, color: '#374151', fontSize: 15, lineHeight: 2 }}>
            <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
            <li><strong>Correction</strong> — request we correct inaccurate data</li>
            <li><strong>Deletion</strong> — request we delete your account and associated data</li>
            <li><strong>Portability</strong> — request your data in a portable format</li>
            <li><strong>Objection</strong> — object to certain processing of your data</li>
          </Box>
          <P>
            To exercise any of these rights, email us at{' '}
            <Box component="a" href={`mailto:${EMAIL}`} sx={{ color: '#6366f1', fontWeight: 600 }}>{EMAIL}</Box>.
            We will respond within 30 days.
          </P>
        </Section>

        <Section title="9. Children's Privacy">
          <P>
            The Service is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us and we will delete it promptly.
          </P>
        </Section>

        <Section title="10. Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page with an updated effective date. For significant changes, we may also notify you by email.
          </P>
        </Section>

        <Section title="11. Contact Us">
          <P>
            If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us at:{' '}
            <Box component="a" href={`mailto:${EMAIL}`} sx={{ color: '#6366f1', fontWeight: 600 }}>{EMAIL}</Box>
          </P>
        </Section>

        <Divider sx={{ my: 4 }} />
        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', pb: 4 }}>
          <Box component="span" onClick={() => navigate('/')} sx={{ color: '#6366f1', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Home</Box>
          <Box component="span" onClick={() => navigate('/terms')} sx={{ color: '#6366f1', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Terms of Service</Box>
          <Box component="a" href={`mailto:${EMAIL}`} sx={{ color: '#6366f1', fontSize: 14, fontWeight: 600 }}>Contact</Box>
        </Box>
      </Container>
    </Box>
  );
}
