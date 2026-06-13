import { Box, Button, Typography, Paper } from '@mui/material';
import { Google } from '@mui/icons-material';

export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'}/auth/google`;
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Paper elevation={8} sx={{ p: 5, width: 380, borderRadius: 3, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>DocuExtract</Typography>
        <Typography variant="body2" color="text.secondary" mb={4}>
          AI-Powered PDF Data Extraction
        </Typography>
        <Button
          variant="contained" startIcon={<Google />} fullWidth size="large"
          onClick={handleGoogleLogin}
          sx={{ borderRadius: 2, py: 1.5, fontSize: 16, bgcolor: '#4285F4', '&:hover': { bgcolor: '#3367D6' } }}
        >
          Continue with Google
        </Button>
        <Typography variant="caption" color="text.secondary" display="block" mt={3}>
          By signing in, you agree to our Terms of Service.
        </Typography>
      </Paper>
    </Box>
  );
}
