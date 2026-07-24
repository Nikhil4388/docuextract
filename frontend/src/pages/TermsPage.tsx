import React from 'react';
import { Box, Container, Typography, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const EFFECTIVE_DATE = 'July 9, 2026';
const COMPANY = 'MultiPDFsToExcel';
const DOMAIN = 'multipdfstoexcel.com';
const EMAIL = 'support@multipdfstoexcel.com';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box mb={4}>
    <Typography variant="h6" fontWeight={700} mb={1.5} color="#0c0c0c">{title}</Typography>
    {children}
  </Box>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <Typography fontSize={15} color="#374151" lineHeight={1.8} mb={1.5}>{children}</Typography>
);

export default function TermsPage() {
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
            Terms of Service
          </Typography>
          <Typography color="text.secondary" fontSize={14}>
            Effective date: {EFFECTIVE_DATE} · Last updated: {EFFECTIVE_DATE}
          </Typography>
        </Box>

        <Divider sx={{ mb: 5 }} />

        <Section title="1. Acceptance of Terms">
          <P>
            By accessing or using {COMPANY} at {DOMAIN} ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.
          </P>
          <P>
            These Terms apply to all visitors, users, and anyone who accesses the Service. We reserve the right to update or modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the revised Terms.
          </P>
        </Section>

        <Section title="2. Description of Service">
          <P>
            {COMPANY} is an AI-powered tool that extracts structured data from PDF files and exports it to Excel/CSV format. The Service is provided free of charge. Optional donations via Ko-fi help cover server costs but are not required to use the Service.
          </P>
          <P>
            We use third-party AI providers (including Anthropic) to process PDF content. By using the Service, you consent to your uploaded documents being processed by these providers solely for the purpose of data extraction.
          </P>
        </Section>

        <Section title="3. User Accounts">
          <P>
            You must sign in using Google OAuth to use the Service. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </P>
          <P>
            You must be at least 13 years of age to use this Service. By using the Service, you represent that you meet this requirement.
          </P>
        </Section>

        <Section title="4. Acceptable Use">
          <P>You agree NOT to use the Service to:</P>
          <Box component="ul" sx={{ pl: 3, color: '#374151', fontSize: 15, lineHeight: 2 }}>
            <li>Upload files containing illegal, harmful, or malicious content</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on the intellectual property rights of others</li>
            <li>Attempt to reverse-engineer, decompile, or otherwise tamper with the Service</li>
            <li>Use automated bots or scrapers to access the Service at scale</li>
            <li>Misrepresent your identity or impersonate any person or entity</li>
            <li>Upload files containing personal data of others without their consent</li>
            <li>Transmit spam, malware, or any other harmful code</li>
          </Box>
          <P>
            We reserve the right to suspend or terminate your access at any time for violation of these Terms.
          </P>
        </Section>

        <Section title="5. Intellectual Property">
          <P>
            The Service, including its original content, features, and functionality, is owned by {COMPANY} and is protected by copyright and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our explicit written permission.
          </P>
          <P>
            You retain all rights to the files you upload. By uploading files, you grant us a limited, non-exclusive licence to process your files solely for the purpose of providing the extraction service. We do not claim ownership of your content.
          </P>
        </Section>

        <Section title="6. Data and Privacy">
          <P>
            Uploaded files are processed in memory and are not stored permanently on our servers. Extracted data is temporarily stored to deliver your results and is deleted after your session. For full details on how we handle your data, please see our{' '}
            <Box component="span" sx={{ color: '#6366f1', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/privacy')}>
              Privacy Policy
            </Box>.
          </P>
        </Section>

        <Section title="7. Payments and Donations">
          <P>
            The Service is free to use. Optional donations are processed via Ko-fi and are subject to Ko-fi's own terms of service. Donations of $10 or more may unlock additional usage. We do not store your payment details — all payments are handled directly by Ko-fi and PayPal.
          </P>
          <P>
            Donations are voluntary and non-refundable unless otherwise required by applicable law.
          </P>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <P>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </P>
          <P>
            We do not warrant that the Service will be error-free, uninterrupted, or free of viruses or other harmful components. AI-extracted data may contain inaccuracies and should be verified before use in critical applications.
          </P>
        </Section>

        <Section title="9. Limitation of Liability">
          <P>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {COMPANY.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, PROFITS, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
          </P>
          <P>
            Our total liability to you for any claim arising from these Terms or your use of the Service shall not exceed the total amount of donations you have made to us in the 12 months preceding the claim, or $10 (whichever is greater).
          </P>
        </Section>

        <Section title="10. Third-Party Services">
          <P>
            The Service integrates with third-party services including Google (authentication), Anthropic (AI processing), Ko-fi (donations), and Railway (hosting). Your use of these services is subject to their respective terms and privacy policies. We are not responsible for the practices of these third-party providers.
          </P>
        </Section>

        <Section title="11. Termination">
          <P>
            We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will cease immediately.
          </P>
        </Section>

        <Section title="12. Governing Law">
          <P>
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which we operate, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved through good-faith negotiation or, if necessary, binding arbitration.
          </P>
        </Section>

        <Section title="13. Contact Us">
          <P>
            If you have any questions about these Terms, please contact us at{' '}
            <Box component="a" href={`mailto:${EMAIL}`} sx={{ color: '#6366f1', fontWeight: 600 }}>
              {EMAIL}
            </Box>.
          </P>
        </Section>

        <Divider sx={{ my: 4 }} />
        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', pb: 4 }}>
          <Box component="span" onClick={() => navigate('/')} sx={{ color: '#6366f1', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Home</Box>
          <Box component="span" onClick={() => navigate('/privacy')} sx={{ color: '#6366f1', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Privacy Policy</Box>
          <Box component="a" href={`mailto:${EMAIL}`} sx={{ color: '#6366f1', fontSize: 14, fontWeight: 600 }}>Contact</Box>
        </Box>
      </Container>
    </Box>
  );
}
