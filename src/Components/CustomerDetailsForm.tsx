// src/components/CustomerDetailsForm.tsx
import React, { useState } from "react";
import {
  TextField,
  Button,
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  MenuItem,
  Paper,
  Divider,
  Chip,
} from "@mui/material";
import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";

interface FormData {
  name: string;
  phoneNumber: string;
  service: string;
}

const serviceOptions = [
  { value: "basic", label: "Basic Exterior Wash" },
  { value: "premium", label: "Full Premium Detailing" },
  { value: "interior", label: "Interior Detailing" },
  { value: "exterior", label: "Exterior Polish" },
  { value: "maintenance", label: "Maintenance Detailing" },
];

const CustomerDetailsForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phoneNumber: "",
    service: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      setError("Phone number is required");
      return false;
    }
    if (!formData.service) {
      setError("Please select a service");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "customerEntries"), {
        ...formData,
        timestamp: serverTimestamp(),
      });
      setSuccess(true);
      setFormData({ name: "", phoneNumber: "", service: "" });
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error adding document: ", error);
      setError("Failed to submit details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          p: isMobile ? 3 : 4,
          borderRadius: 2,
          backgroundColor: "background.paper",
          position: "relative",
        }}
      >
        {/* Floating Discount Badge */}
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

        <Typography
          variant={isMobile ? "h5" : "h4"}
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            textAlign: "center",
            color: theme.palette.primary.main,
            mb: 3,
          }}
        >
          Car Detailing Service Request
        </Typography>

        {/* Special Offer Divider */}
        <Divider
          sx={{
            mb: 3,
            "&::before, &::after": {
              borderColor: theme.palette.success.main,
            },
          }}
        >
          <Chip
            label="SPECIAL OFFER"
            size="small"
            color="success"
            variant="outlined"
          />
        </Divider>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Details submitted successfully!
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            size="small"
            sx={{ mb: 2 }}
          />

          <TextField
            label="Phone Number"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            size="small"
            type="tel"
            sx={{ mb: 2 }}
          />

          <TextField
            select
            label="Service Required"
            name="service"
            value={formData.service}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            size="small"
            sx={{ mb: 3 }}
          >
            {serviceOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Discount Highlight Box */}
          <Box
            sx={{
              backgroundColor: theme.palette.success.light,
              p: 2,
              borderRadius: 1,
              mb: 3,
              borderLeft: `4px solid ${theme.palette.success.main}`,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <LocalAtmIcon fontSize="medium" color="success" />
            <Typography
              variant="body1"
              sx={{
                color: theme.palette.success.dark,
                fontWeight: "bold",
              }}
            >
              Get <span style={{ fontSize: "1.1em" }}>10% OFF</span> when you
              pay in cash!
            </Typography>
          </Box>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            sx={{
              py: 1.5,
              mt: 1,
              fontSize: "1rem",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: 1,
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Submit Request"
            )}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CustomerDetailsForm;
