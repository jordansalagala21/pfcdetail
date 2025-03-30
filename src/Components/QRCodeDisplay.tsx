// src/components/QRCodeDisplay.tsx
import React from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Divider,
  Chip,
  useTheme,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const CustomerFormURL = `${window.location.origin}/customer-details`;

const QRCodeDisplay: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const copyToClipboard = () => {
    navigator.clipboard.writeText(CustomerFormURL);
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          p: isMobile ? 3 : 4,
          borderRadius: 4,
          width: "100%",
          maxWidth: "500px",
          textAlign: "center",
          position: "relative",
          overflow: "visible",
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Promo Badge */}
        <Chip
          icon={<LocalAtmIcon />}
          label="10% CASH DISCOUNT"
          color="success"
          sx={{
            position: "absolute",
            top: -16,
            right: 20,
            fontWeight: "bold",
            fontSize: isMobile ? "0.75rem" : "0.875rem",
            py: 1,
            boxShadow: theme.shadows[2],
          }}
        />

        <Box sx={{ mb: 3 }}>
          <QrCode2RoundedIcon
            color="primary"
            sx={{
              fontSize: 48,
              mb: 1,
              backgroundColor: theme.palette.primary.light,
              borderRadius: "50%",
              p: 1,
            }}
          />
          <Typography
            variant={isMobile ? "h5" : "h4"}
            component="h2"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: theme.palette.primary.main,
            }}
          >
            Perfect Choice Auto
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
            Scan QR code to book your service
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* QR Code Container */}
        <Box
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            display: "inline-flex",
          }}
        >
          <QRCodeSVG
            value={CustomerFormURL}
            size={isMobile ? 180 : 220}
            level="H"
            fgColor={theme.palette.primary.dark}
            bgColor="transparent"
          />
        </Box>

        {/* URL Section */}
        <Box
          sx={{
            backgroundColor: theme.palette.grey[100],
            p: 2,
            borderRadius: 1,
            mb: 3,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Or visit this URL:
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              mt: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: "monospace",
                wordBreak: "break-all",
                textAlign: "center",
              }}
            >
              {CustomerFormURL}
            </Typography>
            <Button
              size="small"
              onClick={copyToClipboard}
              startIcon={<ContentCopyIcon fontSize="small" />}
              sx={{ minWidth: 0 }}
            >
              {isMobile ? "" : "Copy"}
            </Button>
          </Box>
        </Box>

        {/* Discount Notice */}
        <Box
          sx={{
            backgroundColor: theme.palette.success.light,
            p: 2,
            borderRadius: 1,
            borderLeft: `4px solid ${theme.palette.success.main}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <LocalAtmIcon fontSize="small" color="success" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Enjoy{" "}
            <span style={{ color: theme.palette.success.dark }}>10% OFF</span>{" "}
            when you pay in cash!
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default QRCodeDisplay;
