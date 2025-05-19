import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { db } from "../firebaseConfig";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Box,
  CircularProgress,
  Chip,
  Avatar,
  Stack,
  Divider,
  Card,
  CardContent,
  InputAdornment,
  TablePagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Badge,
  Alert,
  useMediaQuery,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Pagination,
} from "@mui/material";
import {
  Edit as EditIcon,
  Group as CustomersIcon,
  MonetizationOn as SalesIcon,
  DoneAll as CompletedIcon,
  Search as SearchIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  FiberManualRecord as StatusIcon,
  Payment as PaymentIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Notifications as NotificationsIcon,
  BarChart as BarChartIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { useAuth } from "../auth/AuthProvider";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface CustomerEntry {
  id: string;
  name: string;
  phoneNumber: string;
  service: string;
  carDetails?: string; // Added for make and model
  timestamp: { seconds: number; nanoseconds: number };
  cost?: number;
  workers?: string[];
  status?: "pending" | "in-progress" | "completed";
  payments?: Record<string, number>;
  noShow?: boolean;
}

interface Worker {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  currentStatus?: "available" | "working" | "on-break";
  assignedJobs?: string[];
}

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const [customerEntries, setCustomerEntries] = useState<CustomerEntry[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openWorkerModal, setOpenWorkerModal] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState<number | undefined>(undefined);
  const [editWorkers, setEditWorkers] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<string>("pending");
  const [editCarDetails, setEditCarDetails] = useState<string>(""); // New state for carDetails
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [newWorker, setNewWorker] = useState<Omit<Worker, "id">>({
    name: "",
    email: "",
    phone: "",
    currentStatus: "available",
  });
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [timeframe, setTimeframe] = useState<"week" | "month">("week");
  const [workerSearchTerm, setWorkerSearchTerm] = useState("");

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    const unsubscribeCustomers = onSnapshot(
      collection(db, "customerEntries"),
      (snapshot) => {
        const entries: CustomerEntry[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CustomerEntry[];
        setCustomerEntries(entries);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubscribeWorkers = onSnapshot(
      collection(db, "workers"),
      (snapshot) => {
        const workerData: Worker[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          assignedJobs: doc.data().assignedJobs || [],
          currentStatus: doc.data().currentStatus || "available",
        })) as Worker[];
        setWorkers(workerData);
        setAvailableWorkers(
          workerData.filter(
            (w) =>
              w.currentStatus === "available" || w.currentStatus === "working"
          )
        );
      }
    );

    return () => {
      unsubscribeCustomers();
      unsubscribeWorkers();
    };
  }, []);

  // Calculate metrics
  const totalCustomers = customerEntries.length;
  const totalSales = customerEntries.reduce(
    (sum, entry) => sum + (entry.cost || 0),
    0
  );
  const completedServices = customerEntries.filter(
    (entry) => entry.status === "completed"
  ).length;

  // Calculate worker metrics
  const totalWorkerPayments = customerEntries.reduce((sum, entry) => {
    if (entry.payments) {
      return sum + Object.values(entry.payments).reduce((a, b) => a + b, 0);
    }
    return sum;
  }, 0);

  // Customer retention analysis
  const inactiveCustomers = useMemo(() => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Group entries by phone number
    interface CustomerEntryWithDate extends CustomerEntry {
      jsDate: Date;
    }

    const customerMap = new Map<string, CustomerEntryWithDate[]>();

    customerEntries.forEach((entry) => {
      // Convert Firestore timestamp to JavaScript Date
      const entryDate = new Date(entry.timestamp.seconds * 1000);
      const entries = customerMap.get(entry.phoneNumber) || [];
      entries.push({ ...entry, jsDate: entryDate });
      customerMap.set(entry.phoneNumber, entries);
    });

    const inactive: {
      name: string;
      phone: string;
      lastVisit: Date;
      totalVisits: number;
    }[] = [];

    customerMap.forEach((entries, phone) => {
      // Sort entries by date (newest first)
      entries.sort((a, b) => b.jsDate.getTime() - a.jsDate.getTime());

      const lastVisit = entries[0].jsDate;
      const totalVisits = entries.length;

      // Consider inactive if last visit was more than 2 weeks ago
      if (lastVisit < twoWeeksAgo) {
        inactive.push({
          name: entries[0].name,
          phone,
          lastVisit,
          totalVisits,
        });
      }
    });

    // Sort inactive customers by how long ago they visited (oldest first)
    inactive.sort((a, b) => a.lastVisit.getTime() - b.lastVisit.getTime());

    return inactive;
  }, [customerEntries]);

  // Sales analytics
  const salesAnalytics = useMemo(() => {
    const analytics = {
      monthlySales: {} as Record<string, number>,
      servicePopularity: {} as Record<string, number>,
      dayOfWeekSales: {} as Record<string, number>,
      workerEarnings: {} as Record<string, number>,
    };

    if (customerEntries.length === 0) return analytics;

    customerEntries.forEach((entry) => {
      const date = new Date(entry.timestamp.seconds * 1000);
      const month = date.toLocaleString("default", { month: "long" });
      const dayOfWeek = date.toLocaleString("default", { weekday: "long" });
      const service = entry.service;
      const cost = entry.cost || 0;

      analytics.monthlySales[month] =
        (analytics.monthlySales[month] || 0) + cost;
      analytics.servicePopularity[service] =
        (analytics.servicePopularity[service] || 0) + 1;
      analytics.dayOfWeekSales[dayOfWeek] =
        (analytics.dayOfWeekSales[dayOfWeek] || 0) + cost;

      if (entry.payments) {
        Object.entries(entry.payments).forEach(([workerId, amount]) => {
          analytics.workerEarnings[workerId] =
            (analytics.workerEarnings[workerId] || 0) + amount;
        });
      }
    });

    return analytics;
  }, [customerEntries]);

  // Top performers
  const topPerformers = useMemo(() => {
    const now = new Date();
    const timeFilter =
      timeframe === "week"
        ? new Date(now.setDate(now.getDate() - 7))
        : new Date(now.setMonth(now.getMonth() - 1));

    const workerEarnings: Record<string, number> = {};

    customerEntries.forEach((entry) => {
      const entryDate = new Date(entry.timestamp.seconds * 1000);
      if (entryDate >= timeFilter && entry.payments) {
        Object.entries(entry.payments).forEach(([workerId, amount]) => {
          workerEarnings[workerId] = (workerEarnings[workerId] || 0) + amount;
        });
      }
    });

    const sortedWorkers = Object.entries(workerEarnings)
      .map(([workerId, amount]) => ({
        workerId,
        amount,
        name: workers.find((w) => w.id === workerId)?.name || "Unknown",
      }))
      .sort((a, b) => b.amount - a.amount);

    return sortedWorkers.slice(0, 3);
  }, [customerEntries, workers, timeframe]);

  // Filter workers
  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) =>
      worker.name.toLowerCase().includes(workerSearchTerm.toLowerCase())
    );
  }, [workers, workerSearchTerm]);

  // Prepare chart data
  // Filter inactive customers by search term for analytics tab
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return inactiveCustomers;
    return inactiveCustomers.filter((customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inactiveCustomers, searchTerm]);

  const monthlySalesData = {
    labels: Object.keys(salesAnalytics.monthlySales),
    datasets: [
      {
        label: "Sales by Month",
        data: Object.values(salesAnalytics.monthlySales),
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  const servicePopularityData = {
    labels: Object.keys(salesAnalytics.servicePopularity),
    datasets: [
      {
        label: "Service Popularity",
        data: Object.values(salesAnalytics.servicePopularity),
        backgroundColor: [
          "rgba(255, 99, 132, 0.5)",
          "rgba(54, 162, 235, 0.5)",
          "rgba(255, 206, 86, 0.5)",
          "rgba(75, 192, 192, 0.5)",
          "rgba(153, 102, 255, 0.5)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const dayOfWeekSalesData = {
    labels: Object.keys(salesAnalytics.dayOfWeekSales),
    datasets: [
      {
        label: "Sales by Day of Week",
        data: Object.values(salesAnalytics.dayOfWeekSales),
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const handleSaveEdit = async () => {
    if (!selectedEntryId) return;

    if (editCost === undefined || editCost <= 0) {
      setError("Please enter a valid cost");
      return;
    }

    if (editWorkers.length === 0) {
      setError("Please assign at least one worker");
      return;
    }

    try {
      const totalPayment = (editCost || 0) * 0.4;
      const workerCount = editWorkers.length;
      const paymentPerWorker = workerCount > 0 ? totalPayment / workerCount : 0;

      const payments: Record<string, number> = {};
      editWorkers.forEach((workerId) => {
        payments[workerId] = paymentPerWorker;
      });

      const updates = editWorkers.map(async (workerId) => {
        const worker = workers.find((w) => w.id === workerId);
        const currentAssignedJobs = worker?.assignedJobs || [];
        let newAssignedJobs = [...currentAssignedJobs];

        if (editStatus === "completed") {
          newAssignedJobs = currentAssignedJobs.filter(
            (id) => id !== selectedEntryId
          );
        } else if (!currentAssignedJobs.includes(selectedEntryId)) {
          newAssignedJobs = [...currentAssignedJobs, selectedEntryId];
        }

        const newStatus = newAssignedJobs.length > 0 ? "working" : "available";

        await updateDoc(doc(db, "workers", workerId), {
          assignedJobs: newAssignedJobs,
          currentStatus: newStatus,
        });
      });

      await Promise.all(updates);

      await updateDoc(doc(db, "customerEntries", selectedEntryId), {
        cost: editCost,
        workers: editWorkers,
        status: editStatus,
        payments,
        carDetails: editCarDetails, // Save carDetails
      });

      setOpenEditModal(false);
      setError(null);
    } catch (error) {
      console.error("Error updating document: ", error);
      setError("Failed to save changes");
    }
  };

  const handleAddWorker = async () => {
    try {
      if (!newWorker.name) {
        setError("Worker name is required");
        return;
      }

      await addDoc(collection(db, "workers"), {
        ...newWorker,
        currentStatus: "available",
        assignedJobs: [],
      });
      setOpenWorkerModal(false);
      setNewWorker({
        name: "",
        email: "",
        phone: "",
        currentStatus: "available",
      });
      setError(null);
    } catch (error) {
      console.error("Error adding worker: ", error);
      setError("Failed to add worker");
    }
  };

  const handleUpdateWorker = async () => {
    if (!editingWorker) return;

    try {
      if (!editingWorker.name) {
        setError("Worker name is required");
        return;
      }

      await updateDoc(doc(db, "workers", editingWorker.id), {
        name: editingWorker.name,
        email: editingWorker.email,
        phone: editingWorker.phone,
        currentStatus: editingWorker.currentStatus,
      });

      setEditingWorker(null);
      setError(null);
    } catch (error) {
      console.error("Error updating worker: ", error);
      setError("Failed to update worker");
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    try {
      // Check if worker has any assigned jobs
      const worker = workers.find((w) => w.id === workerId);
      if (worker?.assignedJobs && worker.assignedJobs.length > 0) {
        setError("Cannot delete worker with assigned jobs");
        return;
      }

      await deleteDoc(doc(db, "workers", workerId));
    } catch (error) {
      console.error("Error deleting worker: ", error);
      setError("Failed to delete worker");
    }
  };

  const filteredEntries = customerEntries.filter((entry) =>
    Object.values(entry).some(
      (value) =>
        typeof value === "string" &&
        value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "in-progress":
        return "warning";
      default:
        return "info";
    }
  };

  const getWorkerName = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId);
    return worker ? worker.name : "Unknown Worker";
  };

  if (loading)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress size={60} />
      </Box>
    );

  if (error)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Box>
    );

  const drawer = (
    <Box>
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="h6" component="div">
          Admin Panel
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItemButton
          selected={tabValue === 0}
          onClick={() => {
            setTabValue(0);
            setMobileOpen(false);
          }}
        >
          <ListItemIcon>
            <ScheduleIcon />
          </ListItemIcon>
          <ListItemText primary="Appointments" />
        </ListItemButton>
        <ListItemButton
          selected={tabValue === 1}
          onClick={() => {
            setTabValue(1);
            setMobileOpen(false);
          }}
        >
          <ListItemIcon>
            <WorkIcon />
          </ListItemIcon>
          <ListItemText primary="Worker Management" />
        </ListItemButton>
        <ListItemButton
          selected={tabValue === 2}
          onClick={() => {
            setTabValue(2);
            setMobileOpen(false);
          }}
        >
          <ListItemIcon>
            <BarChartIcon />
          </ListItemIcon>
          <ListItemText primary="Analytics" />
        </ListItemButton>
      </List>
      <Divider />
      <List>
        <ListItemButton onClick={logout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 240 },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: "100%",
          backgroundColor: theme.palette.background.default,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography
              variant={isMobile ? "h6" : "h4"}
              component="h1"
              fontWeight="bold"
            >
              Admin Dashboard
            </Typography>
          </Box>
          <Button
            onClick={logout}
            variant="contained"
            color="error"
            size={isMobile ? "small" : "medium"}
            startIcon={<LogoutIcon />}
          >
            Logout
          </Button>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tabValue}
          onChange={(_e, newValue) => setTabValue(newValue)}
          sx={{ mb: 2 }}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
        >
          <Tab label="Appointments" icon={<ScheduleIcon />} />
          <Tab label="Worker Management" icon={<WorkIcon />} />
          <Tab label="Analytics" icon={<BarChartIcon />} />
        </Tabs>
        <Divider />

        {/* Customer Retention Notification */}
        {inactiveCustomers.length > 0 && tabValue !== 2 && (
          <Alert
            severity="warning"
            icon={<NotificationsIcon />}
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setTabValue(2)}
              >
                View Analytics
              </Button>
            }
          >
            {inactiveCustomers.length} customers haven't visited in 2 weeks.
            Consider reaching out to them!
          </Alert>
        )}

        {tabValue === 0 && (
          <>
            {/* Metrics Cards */}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 3, // Increased gap for better spacing
                mb: 4, // Slightly more margin-bottom for breathing room
                "& > *": {
                  flex: "1 1 200px", // Increased min card width for better proportions
                  minWidth: "200px",
                },
              }}
            >
              {(
                [
                  {
                    title: "Total Customers",
                    value: totalCustomers,
                    icon: <CustomersIcon fontSize="small" />,
                    color: "primary",
                  },
                  {
                    title: "Total Sales",
                    value: `$${totalSales.toLocaleString()}`,
                    icon: <SalesIcon fontSize="small" />,
                    color: "success",
                  },
                  {
                    title: "Worker Payments",
                    value: `$${totalWorkerPayments.toFixed(2)}`,
                    icon: <PaymentIcon fontSize="small" />,
                    color: "warning",
                  },
                  {
                    title: "Completed",
                    value: completedServices,
                    icon: <CompletedIcon fontSize="small" />,
                    color: "info",
                  },
                ] as const
              ).map((item, index) => (
                <Card
                  key={index}
                  sx={{
                    borderRadius: 2, // Rounded corners for a softer look
                    borderLeft: `5px solid ${
                      theme.palette[
                        item.color as "primary" | "success" | "warning" | "info"
                      ].main
                    }`, // Slightly thicker border
                    boxShadow: theme.shadows[3], // More pronounced shadow for depth
                    transition:
                      "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out", // Smooth hover animation
                    "&:hover": {
                      transform: "translateY(-4px)", // Subtle lift effect on hover
                      boxShadow: theme.shadows[6], // Stronger shadow on hover
                    },
                    bgcolor: theme.palette.background.paper, // Ensure consistent background
                  }}
                >
                  <CardContent sx={{ padding: 2.5 }}>
                    {" "}
                    {/* Adjusted padding for compactness */}
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      {" "}
                      {/* Slightly more spacing */}
                      <Avatar
                        sx={{
                          bgcolor: theme.palette[item.color].light,
                          color: theme.palette[item.color].main,
                          width: 40, // Slightly larger avatar
                          height: 40,
                          boxShadow: `0 0 8px ${
                            theme.palette[item.color].light
                          }`, // Glow effect
                        }}
                      >
                        {item.icon}
                      </Avatar>
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: "0.85rem", fontWeight: 500 }} // Slightly larger and bolder caption
                        >
                          {item.title}
                        </Typography>
                        <Typography
                          variant="h5" // Larger text for emphasis
                          fontWeight="bold"
                          color={theme.palette[item.color].dark} // Darker shade for contrast
                        >
                          {item.value}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {/* Table Section */}
            <Paper
              elevation={2}
              sx={{ width: "100%", borderRadius: 2, overflow: "hidden" }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: "space-between",
                  alignItems: isMobile ? "flex-start" : "center",
                  p: 2,
                  gap: isMobile ? 2 : 0,
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  Customer Appointments
                </Typography>
                <TextField
                  size="small"
                  placeholder="Search..."
                  variant="outlined"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon fontSize="small" />,
                  }}
                  sx={{
                    width: isMobile ? "100%" : 300,
                    "& .MuiInputBase-root": {
                      height: 36,
                    },
                  }}
                />
              </Box>

              <TableContainer sx={{ maxHeight: "60vh" }}>
                <Table stickyHeader size={isMobile ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                      {[
                        "Customer",
                        "Service",
                        "Car Details",
                        "Contact",
                        "Date",
                        "Status",
                        "Cost",
                        !isMobile && "Workers",
                        !isMobile && "Payments",
                        "Actions",
                      ]
                        .filter(Boolean)
                        .map((header) => (
                          <TableCell
                            key={header as string}
                            sx={{
                              fontWeight: "bold",
                              bgcolor: "background.paper",
                              fontSize: isMobile ? "0.75rem" : "0.875rem",
                            }}
                          >
                            {header}
                          </TableCell>
                        ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEntries
                      .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds) // Sort by timestamp (newest first)
                      .slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage
                      )
                      .map((entry) => (
                        <TableRow key={entry.id} hover>
                          <TableCell
                            sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                            >
                              <Avatar
                                sx={{
                                  bgcolor: theme.palette.primary.main,
                                  width: 28,
                                  height: 28,
                                  fontSize: "0.75rem",
                                }}
                              >
                                {entry.name.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography
                                  variant={isMobile ? "body2" : "body1"}
                                  fontWeight="bold"
                                  sx={{
                                    fontSize: isMobile ? "0.75rem" : "0.875rem",
                                  }}
                                >
                                  {entry.name}
                                </Typography>
                                {!isMobile && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: "0.7rem" }}
                                  >
                                    #{entry.id.slice(0, 6)}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell
                            sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                          >
                            <Chip
                              label={entry.service}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{
                                fontSize: isMobile ? "0.7rem" : "0.8rem",
                                height: 24,
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                          >
                            {entry.carDetails || "Not Provided"}
                          </TableCell>
                          <TableCell
                            sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                          >
                            {isMobile ? (
                              <Typography
                                variant="body2"
                                sx={{ fontSize: "0.75rem" }}
                              >
                                {entry.phoneNumber.substring(0, 4)}...
                              </Typography>
                            ) : (
                              entry.phoneNumber
                            )}
                          </TableCell>
                          <TableCell
                            sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                          >
                            {isMobile
                              ? new Date(
                                  entry.timestamp.seconds * 1000
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : new Date(
                                  entry.timestamp.seconds * 1000
                                ).toLocaleDateString()}
                          </TableCell>
                          <TableCell
                            sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                          >
                            <Chip
                              label={
                                entry.status
                                  ? entry.status.replace("-", " ")
                                  : "pending"
                              }
                              size="small"
                              color={getStatusColor(entry.status)}
                              icon={<StatusIcon fontSize="inherit" />}
                              sx={{
                                fontSize: isMobile ? "0.7rem" : "0.8rem",
                                height: 24,
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                          >
                            {entry.cost ? `$${entry.cost.toFixed(2)}` : "-"}
                          </TableCell>
                          {!isMobile && (
                            <TableCell sx={{ fontSize: "0.875rem" }}>
                              {entry.workers
                                ? entry.workers.map((w) => (
                                    <Chip
                                      key={w}
                                      label={getWorkerName(w)}
                                      size="small"
                                      sx={{
                                        m: 0.5,
                                        fontSize: "0.7rem",
                                        height: 24,
                                      }}
                                      color={
                                        workers.find(
                                          (worker) => worker.id === w
                                        )?.currentStatus === "working"
                                          ? "primary"
                                          : "default"
                                      }
                                    />
                                  ))
                                : "-"}
                            </TableCell>
                          )}
                          {!isMobile && (
                            <TableCell sx={{ fontSize: "0.875rem" }}>
                              {entry.payments
                                ? Object.entries(entry.payments).map(
                                    ([workerId, amount]) => (
                                      <Box key={workerId} sx={{ mb: 0.5 }}>
                                        <Typography
                                          variant="body2"
                                          sx={{ fontSize: "0.75rem" }}
                                        >
                                          {getWorkerName(workerId)}: $
                                          {amount.toFixed(2)}
                                        </Typography>
                                      </Box>
                                    )
                                  )
                                : "-"}
                            </TableCell>
                          )}
                          <TableCell>
                            <IconButton
                              onClick={() => {
                                setSelectedEntryId(entry.id);
                                setEditCost(entry.cost);
                                setEditWorkers(entry.workers || []);
                                setEditStatus(entry.status || "pending");
                                setEditCarDetails(entry.carDetails || ""); // Initialize carDetails
                                setOpenEditModal(true);
                              }}
                              size="small"
                              sx={{ p: 0.5 }}
                            >
                              <EditIcon color="primary" fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredEntries.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                sx={{
                  borderTop: `1px solid ${theme.palette.divider}`,
                  pr: 2,
                  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                    {
                      fontSize: isMobile ? "0.75rem" : "0.875rem",
                    },
                }}
                labelRowsPerPage={isMobile ? "Rows:" : "Rows per page:"}
              />
            </Paper>
          </>
        )}

        {tabValue === 1 && (
          <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                alignItems: isMobile ? "flex-start" : "center",
                mb: 2,
                gap: isMobile ? 2 : 0,
              }}
            >
              <Typography variant="h6">Worker Management</Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                <TextField
                  size="small"
                  placeholder="Search workers..."
                  variant="outlined"
                  value={workerSearchTerm}
                  onChange={(e) => setWorkerSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon fontSize="small" />,
                  }}
                  sx={{
                    width: isMobile ? "100%" : 200,
                    "& .MuiInputBase-root": {
                      height: 36,
                    },
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenWorkerModal(true)}
                  size={isMobile ? "small" : "medium"}
                  sx={{ height: isMobile ? 36 : 40 }}
                >
                  Add Worker
                </Button>
              </Box>
            </Box>
            <TableContainer>
              <Table size={isMobile ? "small" : "medium"}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                    >
                      Worker
                    </TableCell>
                    {!isMobile && (
                      <TableCell sx={{ fontSize: "0.875rem" }}>
                        Contact
                      </TableCell>
                    )}
                    <TableCell
                      sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                    >
                      Status
                    </TableCell>
                    {!isMobile && (
                      <TableCell sx={{ fontSize: "0.875rem" }}>
                        Assigned Jobs
                      </TableCell>
                    )}
                    <TableCell
                      align="right"
                      sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                    >
                      Earnings
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredWorkers.map((worker) => {
                    const assignedJobs = worker.assignedJobs?.length || 0;
                    const totalEarnings = customerEntries.reduce(
                      (sum, entry) => {
                        return sum + (entry.payments?.[worker.id] || 0);
                      },
                      0
                    );

                    return (
                      <TableRow key={worker.id} hover>
                        <TableCell
                          sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: "0.75rem",
                              }}
                            >
                              {worker.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography
                                variant={isMobile ? "body2" : "body1"}
                                fontWeight="bold"
                                sx={{
                                  fontSize: isMobile ? "0.75rem" : "0.875rem",
                                }}
                              >
                                {worker.name}
                              </Typography>
                              {!isMobile && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontSize: "0.7rem" }}
                                >
                                  #{worker.id.slice(0, 6)}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        {!isMobile && (
                          <TableCell sx={{ fontSize: "0.875rem" }}>
                            <Typography sx={{ fontSize: "0.875rem" }}>
                              {worker.phone || "-"}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontSize: "0.75rem" }}
                            >
                              {worker.email || "-"}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell
                          sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                        >
                          <Chip
                            label={worker.currentStatus || "unknown"}
                            color={
                              worker.currentStatus === "available"
                                ? "success"
                                : worker.currentStatus === "working"
                                ? "warning"
                                : worker.currentStatus === "on-break"
                                ? "info"
                                : "default"
                            }
                            size="small"
                            sx={{
                              fontSize: isMobile ? "0.7rem" : "0.8rem",
                              height: 24,
                            }}
                          />
                        </TableCell>
                        {!isMobile && (
                          <TableCell sx={{ fontSize: "0.875rem" }}>
                            <Badge
                              badgeContent={assignedJobs}
                              color="primary"
                              sx={{ mr: 1 }}
                            >
                              <WorkIcon fontSize="small" />
                            </Badge>
                            {assignedJobs > 0 && (
                              <Typography
                                variant="caption"
                                sx={{ fontSize: "0.75rem" }}
                              >
                                {worker.assignedJobs
                                  ?.map((jobId) => {
                                    const job = customerEntries.find(
                                      (e) => e.id === jobId
                                    );
                                    return job
                                      ? `${job.service.substring(0, 10)}... (${
                                          job.status || "pending"
                                        })`
                                      : "";
                                  })
                                  .join(", ")}
                              </Typography>
                            )}
                          </TableCell>
                        )}
                        <TableCell
                          align="right"
                          sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                        >
                          <Typography>${totalEarnings.toFixed(2)}</Typography>
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}
                        >
                          <IconButton
                            onClick={() => setEditingWorker(worker)}
                            size="small"
                            sx={{ p: 0.5 }}
                          >
                            <EditIcon color="primary" fontSize="small" />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDeleteWorker(worker.id)}
                            size="small"
                            sx={{ p: 0.5, ml: 1 }}
                            disabled={assignedJobs > 0}
                          >
                            <DeleteIcon
                              color={assignedJobs > 0 ? "disabled" : "error"}
                              fontSize="small"
                            />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {tabValue === 2 && (
          <Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h5" gutterBottom>
                Business Analytics
              </Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={timeframe}
                  onChange={(e) =>
                    setTimeframe(e.target.value as "week" | "month")
                  }
                >
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Top Performers Section */}
            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                <StarIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                Top Performers (
                {timeframe === "week" ? "This Week" : "This Month"})
              </Typography>
              {topPerformers.length > 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 2,
                    "& > *": {
                      flex: "1 1 150px",
                      minWidth: "150px",
                    },
                  }}
                >
                  {topPerformers.map((worker, index) => (
                    <Card
                      key={worker.workerId}
                      sx={{ boxShadow: theme.shadows[1] }}
                    >
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar
                            sx={{
                              bgcolor:
                                index === 0
                                  ? theme.palette.warning.main
                                  : index === 1
                                  ? theme.palette.secondary.main
                                  : theme.palette.info.main,
                              width: 36,
                              height: 36,
                            }}
                          >
                            <PersonIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">
                              {worker.name}
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              ${worker.amount.toFixed(2)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {index === 0
                                ? "Top Earner"
                                : index === 1
                                ? "2nd Place"
                                : "3rd Place"}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">
                  No worker data available for the selected timeframe.
                </Typography>
              )}
            </Paper>

            {/* Customer Retention Section */}
            <Paper
              elevation={3}
              sx={{
                p: 3,
                mb: 4,
                borderRadius: 2,
                bgcolor: "background.paper",
                transition: "box-shadow 0.3s ease-in-out",
                "&:hover": {
                  boxShadow: (theme) => theme.shadows[6],
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <NotificationsIcon
                  sx={{ fontSize: 28, color: "primary.main", mr: 1.5 }}
                />
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 600, color: "text.primary" }}
                >
                  Customer Retention
                </Typography>
              </Box>

              {inactiveCustomers.length > 0 ? (
                <>
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        color: "text.secondary",
                        mb: 2,
                        fontStyle: "italic",
                      }}
                    >
                      {inactiveCustomers.length} customer
                      {inactiveCustomers.length > 1 ? "s" : ""} haven't visited
                      in 2 weeks or more.
                    </Typography>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Search customers by name..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(0);
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: "text.secondary" }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        maxWidth: 400,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 1.5,
                          bgcolor: "grey.50",
                        },
                      }}
                    />
                  </Box>
                  <TableContainer
                    sx={{
                      borderRadius: 1.5,
                      bgcolor: "grey.50",
                      transition: "transform 0.2s ease-in-out",
                      "&:hover": { transform: "translateY(-4px)" },
                    }}
                  >
                    <Table
                      size={isMobile ? "small" : "medium"}
                      sx={{ minWidth: isMobile ? "auto" : 650 }}
                    >
                      <TableHead>
                        <TableRow
                          sx={{
                            bgcolor: "primary.light",
                            "& th": { fontWeight: 600, color: "text.primary" },
                          }}
                        >
                          <TableCell>Customer Name</TableCell>
                          <TableCell>Phone Number</TableCell>
                          {!isMobile && <TableCell>Last Visit</TableCell>}
                          {!isMobile && <TableCell>Days Since Visit</TableCell>}
                          <TableCell>Total Visits</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredCustomers
                          .slice(
                            page * rowsPerPage,
                            page * rowsPerPage + rowsPerPage
                          )
                          .map((customer, index) => {
                            const daysSinceVisit = Math.floor(
                              (new Date().getTime() -
                                customer.lastVisit.getTime()) /
                                (1000 * 60 * 60 * 24)
                            );

                            return (
                              <TableRow
                                key={index}
                                sx={{
                                  "&:hover": { bgcolor: "action.hover" },
                                  transition:
                                    "background-color 0.2s ease-in-out",
                                }}
                              >
                                <TableCell sx={{ fontWeight: 500 }}>
                                  {customer.name}
                                </TableCell>
                                <TableCell>
                                  {isMobile
                                    ? `${customer.phone.substring(0, 4)}...`
                                    : customer.phone}
                                </TableCell>
                                {!isMobile && (
                                  <TableCell>
                                    {customer.lastVisit.toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      }
                                    )}
                                  </TableCell>
                                )}
                                {!isMobile && (
                                  <TableCell>
                                    <Box
                                      sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        color:
                                          daysSinceVisit > 30
                                            ? "error.main"
                                            : "warning.main",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {daysSinceVisit} days
                                      {daysSinceVisit > 30 && (
                                        <WarningIcon
                                          sx={{ ml: 1, fontSize: 16 }}
                                        />
                                      )}
                                    </Box>
                                  </TableCell>
                                )}
                                <TableCell>{customer.totalVisits}</TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box
                    sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}
                  >
                    {isMobile ? (
                      <Pagination
                        count={Math.ceil(
                          filteredCustomers.length / rowsPerPage
                        )}
                        page={page + 1}
                        onChange={(_e, value) => value && setPage(value - 1)}
                        color="primary"
                        size="small"
                        sx={{
                          "& .MuiPaginationItem-root": {
                            fontSize: isMobile ? "0.75rem" : "0.875rem",
                          },
                        }}
                      />
                    ) : (
                      <TablePagination
                        component="div"
                        count={filteredCustomers.length}
                        page={page}
                        onPageChange={(_e, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                          setRowsPerPage(parseInt(e.target.value, 10));
                          setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25]}
                        labelRowsPerPage={isMobile ? "Rows" : "Rows per page"}
                        sx={{
                          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                            { fontSize: isMobile ? "0.75rem" : "0.875rem" },
                        }}
                      />
                    )}
                  </Box>
                </>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 4,
                    gap: 1.5,
                  }}
                >
                  <CheckCircleIcon
                    sx={{ color: "success.main", fontSize: 24 }}
                  />
                  <Typography
                    variant="body1"
                    sx={{ color: "text.secondary", textAlign: "center" }}
                  >
                    All customers have visited recently. Great job!
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Sales Analytics Section */}
            <Paper
              elevation={3}
              sx={{
                p: 3,
                mb: 4,
                borderRadius: 2,
                bgcolor: "background.paper",
                transition: "box-shadow 0.3s ease-in-out",
                "&:hover": {
                  boxShadow: (theme) => theme.shadows[6],
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <BarChartIcon
                  sx={{ fontSize: 28, color: "primary.main", mr: 1.5 }}
                />
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 600, color: "text.primary" }}
                >
                  Sales Analytics
                </Typography>
              </Box>

              {customerEntries.length === 0 ? (
                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", textAlign: "center", py: 4 }}
                >
                  No data available to display analytics yet.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {/* Monthly Sales */}
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      bgcolor: "grey.50",
                      transition: "transform 0.2s ease-in-out",
                      "&:hover": { transform: "translateY(-4px)" },
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 500, mb: 2, color: "text.primary" }}
                    >
                      Monthly Sales
                    </Typography>
                    <Box sx={{ height: 280, position: "relative" }}>
                      <Bar
                        data={{
                          ...monthlySalesData,
                          datasets: monthlySalesData.datasets.map(
                            (dataset) => ({
                              ...dataset,
                              backgroundColor: "rgba(63, 81, 181, 0.7)",
                              borderColor: "rgba(63, 81, 181, 1)",
                              borderWidth: 1,
                              borderRadius: 4,
                            })
                          ),
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                            tooltip: {
                              backgroundColor: "rgba(0, 0, 0, 0.8)",
                              titleFont: { size: 14 },
                              bodyFont: { size: 12 },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              grid: { color: "rgba(0, 0, 0, 0.05)" },
                              ticks: { font: { size: isMobile ? 10 : 12 } },
                            },
                            x: {
                              grid: { display: false },
                              ticks: { font: { size: isMobile ? 10 : 12 } },
                            },
                          },
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Service Popularity */}
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      bgcolor: "grey.50",
                      transition: "transform 0.2s ease-in-out",
                      "&:hover": { transform: "translateY(-4px)" },
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 500, mb: 2, color: "text.primary" }}
                    >
                      Service Popularity
                    </Typography>
                    <Box
                      sx={{
                        height: 280,
                        display: "flex",
                        justifyContent: isMobile ? "center" : "flex-start",
                      }}
                    >
                      <Box
                        sx={{
                          width: isMobile ? "100%" : "60%",
                          position: "relative",
                        }}
                      >
                        <Pie
                          data={{
                            ...servicePopularityData,
                            datasets: servicePopularityData.datasets.map(
                              (dataset) => ({
                                ...dataset,
                                backgroundColor: [
                                  "#3F51B5",
                                  "#F44336",
                                  "#4CAF50",
                                  "#FF9800",
                                  "#9C27B0",
                                ],
                                borderColor: "#fff",
                                borderWidth: 2,
                              })
                            ),
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: isMobile ? "bottom" : "right",
                                labels: {
                                  font: { size: isMobile ? 10 : 12 },
                                  padding: 15,
                                  usePointStyle: true,
                                },
                              },
                              tooltip: {
                                backgroundColor: "rgba(0, 0, 0, 0.8)",
                                titleFont: { size: 14 },
                                bodyFont: { size: 12 },
                              },
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  {/* Sales by Day of Week */}
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      bgcolor: "grey.50",
                      transition: "transform 0.2s ease-in-out",
                      "&:hover": { transform: "translateY(-4px)" },
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 500, mb: 2, color: "text.primary" }}
                    >
                      Sales by Day of Week
                    </Typography>
                    <Box sx={{ height: 280, position: "relative" }}>
                      <Bar
                        data={{
                          ...dayOfWeekSalesData,
                          datasets: dayOfWeekSalesData.datasets.map(
                            (dataset) => ({
                              ...dataset,
                              backgroundColor: "rgba(76, 175, 80, 0.7)",
                              borderColor: "rgba(76, 175, 80, 1)",
                              borderWidth: 1,
                              borderRadius: 4,
                            })
                          ),
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                            tooltip: {
                              backgroundColor: "rgba(0, 0, 0, 0.8)",
                              titleFont: { size: 14 },
                              bodyFont: { size: 12 },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              grid: { color: "rgba(0, 0, 0, 0.05)" },
                              ticks: { font: { size: isMobile ? 10 : 12 } },
                            },
                            x: {
                              grid: { display: false },
                              ticks: { font: { size: isMobile ? 10 : 12 } },
                            },
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              )}
            </Paper>

            {/* Additional Analytics */}
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                <TrendingUpIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                Additional Metrics
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  "& > *": {
                    flex: "1 1 150px",
                    minWidth: "150px",
                    p: 2,
                    bgcolor: "background.paper",
                    borderRadius: 1,
                  },
                }}
              >
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Most Popular Service
                  </Typography>
                  {customerEntries.length > 0 ? (
                    <Typography variant="h6" fontWeight="bold">
                      {
                        Object.entries(salesAnalytics.servicePopularity).sort(
                          (a, b) => b[1] - a[1]
                        )[0][0]
                      }
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Not enough data
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Best Sales Month
                  </Typography>
                  {customerEntries.length > 0 ? (
                    <Typography variant="h6" fontWeight="bold">
                      {
                        Object.entries(salesAnalytics.monthlySales).sort(
                          (a, b) => b[1] - a[1]
                        )[0][0]
                      }
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Not enough data
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Busiest Day
                  </Typography>
                  {customerEntries.length > 0 ? (
                    <Typography variant="h6" fontWeight="bold">
                      {
                        Object.entries(salesAnalytics.dayOfWeekSales).sort(
                          (a, b) => b[1] - a[1]
                        )[0][0]
                      }
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Not enough data
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Avg. Service Cost
                  </Typography>
                  {customerEntries.length > 0 ? (
                    <Typography variant="h6" fontWeight="bold">
                      ${(totalSales / totalCustomers).toFixed(2)}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Not enough data
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Edit Appointment Modal */}
        <Dialog
          open={openEditModal}
          onClose={() => {
            setOpenEditModal(false);
            setError(null);
          }}
          fullWidth
          maxWidth="sm"
          fullScreen={isMobile}
        >
          <DialogTitle>Edit Appointment</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <TextField
                label="Car Make and Model"
                fullWidth
                value={editCarDetails}
                onChange={(e) => setEditCarDetails(e.target.value)}
                size="small"
                placeholder="e.g., Toyota Camry"
              />
              <TextField
                label="Cost"
                type="number"
                fullWidth
                value={editCost || ""}
                onChange={(e) => setEditCost(Number(e.target.value))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
                size="small"
                error={editCost !== undefined && editCost <= 0}
                helperText={
                  editCost !== undefined && editCost <= 0
                    ? "Cost must be greater than 0"
                    : ""
                }
              />
              <FormControl
                fullWidth
                size="small"
                error={editWorkers.length === 0}
              >
                <InputLabel>Workers</InputLabel>
                <Select
                  multiple
                  value={editWorkers}
                  onChange={(e) => setEditWorkers(e.target.value as string[])}
                  renderValue={(selected) =>
                    (selected as string[]).map(getWorkerName).join(", ")
                  }
                >
                  {availableWorkers.map((worker) => (
                    <MenuItem key={worker.id} value={worker.id}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Avatar
                          sx={{
                            width: 24,
                            height: 24,
                            mr: 1,
                            bgcolor:
                              worker.currentStatus === "available"
                                ? theme.palette.success.main
                                : theme.palette.warning.main,
                          }}
                        >
                          {worker.name.charAt(0)}
                        </Avatar>
                        <Typography>{worker.name}</Typography>
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          ({worker.assignedJobs?.length || 0} jobs)
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {editWorkers.length === 0 && (
                  <Typography variant="caption" color="error">
                    At least one worker must be assigned
                  </Typography>
                )}
              </FormControl>
              <TextField
                select
                label="Status"
                fullWidth
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <StatusIcon color={getStatusColor(editStatus)} />
                    </InputAdornment>
                  ),
                }}
                size="small"
              >
                {["pending", "in-progress", "completed"].map((status) => (
                  <MenuItem key={status} value={status}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <StatusIcon
                        sx={{
                          color: theme.palette[getStatusColor(status)].main,
                          fontSize: "small",
                        }}
                      />
                      <Typography textTransform="capitalize">
                        {status.replace("-", " ")}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>
              {editCost && editCost > 0 && editWorkers.length > 0 && (
                <Box
                  sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Payment Calculation (40% of cost split between workers)
                  </Typography>
                  {editWorkers.map((workerId) => (
                    <Box key={workerId} sx={{ display: "flex", mb: 1 }}>
                      <Typography sx={{ flex: 1 }}>
                        {getWorkerName(workerId)}:
                      </Typography>
                      <Typography fontWeight="bold">
                        ${((editCost * 0.4) / editWorkers.length).toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                  <Box sx={{ display: "flex", mt: 1, pt: 1, borderTop: 1 }}>
                    <Typography sx={{ flex: 1 }}>Total to Workers:</Typography>
                    <Typography fontWeight="bold">
                      ${(editCost * 0.4).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpenEditModal(false);
                setError(null);
              }}
              startIcon={<CloseIcon />}
              color="inherit"
              size="small"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              startIcon={<CheckIcon />}
              variant="contained"
              color="primary"
              size="small"
              disabled={
                editCost === undefined ||
                editCost <= 0 ||
                editWorkers.length === 0
              }
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Worker Modal */}
        <Dialog
          open={openWorkerModal}
          onClose={() => {
            setOpenWorkerModal(false);
            setError(null);
          }}
          fullWidth
          maxWidth="sm"
          fullScreen={isMobile}
        >
          <DialogTitle>Add New Worker</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <TextField
                label="Full Name"
                fullWidth
                value={newWorker.name}
                onChange={(e) =>
                  setNewWorker({ ...newWorker, name: e.target.value })
                }
                required
                size="small"
                error={!newWorker.name}
                helperText={!newWorker.name ? "Name is required" : ""}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={newWorker.email}
                onChange={(e) =>
                  setNewWorker({ ...newWorker, email: e.target.value })
                }
                size="small"
              />
              <TextField
                label="Phone Number"
                fullWidth
                value={newWorker.phone}
                onChange={(e) =>
                  setNewWorker({ ...newWorker, phone: e.target.value })
                }
                size="small"
              />
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={newWorker.currentStatus}
                  onChange={(e) =>
                    setNewWorker({
                      ...newWorker,
                      currentStatus: e.target.value as
                        | "available"
                        | "working"
                        | "on-break",
                    })
                  }
                  label="Status"
                >
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="working">Working</MenuItem>
                  <MenuItem value="on-break">On Break</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpenWorkerModal(false);
                setError(null);
              }}
              startIcon={<CloseIcon />}
              color="inherit"
              size="small"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddWorker}
              startIcon={<CheckIcon />}
              variant="contained"
              color="primary"
              size="small"
              disabled={!newWorker.name}
            >
              Add Worker
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Worker Modal */}
        <Dialog
          open={!!editingWorker}
          onClose={() => {
            setEditingWorker(null);
            setError(null);
          }}
          fullWidth
          maxWidth="sm"
          fullScreen={isMobile}
        >
          <DialogTitle>Edit Worker</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <TextField
                label="Full Name"
                fullWidth
                value={editingWorker?.name || ""}
                onChange={(e) =>
                  setEditingWorker({
                    ...(editingWorker as Worker),
                    name: e.target.value,
                  })
                }
                required
                size="small"
                error={!editingWorker?.name}
                helperText={!editingWorker?.name ? "Name is required" : ""}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={editingWorker?.email || ""}
                onChange={(e) =>
                  setEditingWorker({
                    ...(editingWorker as Worker),
                    email: e.target.value,
                  })
                }
                size="small"
              />
              <TextField
                label="Phone Number"
                fullWidth
                value={editingWorker?.phone || ""}
                onChange={(e) =>
                  setEditingWorker({
                    ...(editingWorker as Worker),
                    phone: e.target.value,
                  })
                }
                size="small"
              />
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={editingWorker?.currentStatus || "available"}
                  onChange={(e) =>
                    setEditingWorker({
                      ...(editingWorker as Worker),
                      currentStatus: e.target.value as
                        | "available"
                        | "working"
                        | "on-break",
                    })
                  }
                  label="Status"
                >
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="working">Working</MenuItem>
                  <MenuItem value="on-break">On Break</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setEditingWorker(null);
                setError(null);
              }}
              startIcon={<CloseIcon />}
              color="inherit"
              size="small"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateWorker}
              startIcon={<CheckIcon />}
              variant="contained"
              color="primary"
              size="small"
              disabled={!editingWorker?.name}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
