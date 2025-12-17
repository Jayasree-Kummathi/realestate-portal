const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const path = require("path");

const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const agentRoutes = require('./routes/agents');
const enquiryRoutes = require('./routes/enquiries');
const serviceProviderRoutes = require('./routes/serviceProviders');
const serviceEnquiryRoutes = require("./routes/serviceEnquiry");  // ✅ FIX
const marketingExecutiveRoutes = require("./routes/marketingExecutive"); 
const companyBanners = require("./routes/companyBanners");

const app = express();

/* *****************************************
   CORS
***************************************** */
app.use(
  cors({
    origin: true,      // ✅ allow any origin (DEV ONLY)
    credentials: true,
  })
);


/* *****************************************
   STATIC UPLOADS
***************************************** */
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

/* *****************************************
   SECURITY & LOGGING
***************************************** */
app.use(helmet());
app.use(morgan('dev'));
app.use(rateLimiter);

/* *****************************************
   BODY PARSER
***************************************** */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* *****************************************
   ROUTES
***************************************** */
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/service-provider', serviceProviderRoutes);



// ✅ FIXED — Correct service enquiry API
app.use('/api/service-enquiries', serviceEnquiryRoutes);
app.use("/api/marketing-executive", marketingExecutiveRoutes);

app.use("/api/company-banners", companyBanners);
/* *****************************************
   ERROR HANDLER
***************************************** */
app.use(errorHandler);

module.exports = app;
